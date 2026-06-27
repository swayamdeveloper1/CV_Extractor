const fs = require('fs');
const path = require('path');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.mjs');
const { preprocess } = require('./dist/services/parser/preprocess');
const { detectSections, getContactHeader } = require('./dist/services/parser/sectionDetector');
const { isLikelyAddress, isPersonName, NOISE_PATTERNS, WORD_ROLE_KEYWORDS_RE, isSectionWord } = require('./dist/services/parser/validators');
const hp = require('./dist/services/parser/headerParser');

async function run() {
  const dir = 'C:\\Users\\admin\\Downloads\\wetransfer_sample_cvs-1-zip_2026-06-23_0903\\Sample_CVs 1';
  const file = 'CV Chinmay_Sharma.pdf';
  const fp = path.join(dir, file);
  const buffer = new Uint8Array(fs.readFileSync(fp));
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  let rawText = '';
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const rows = {};
    for (const item of content.items) {
      if (!('str' in item)) continue;
      const y = Math.round(item.transform[5]);
      if (!rows[y]) rows[y] = [];
      rows[y].push(item.str);
    }
    const ordered = Object.keys(rows).map(Number).sort((a, b) => b - a);
    for (const y of ordered) {
      rawText += rows[y].join(' ');
      rawText += '\n';
    }
  }
  
  const pt = preprocess(rawText);
  const boundaries = detectSections(pt);
  const contactLines = getContactHeader(pt, boundaries);
  
  // Now duplicate extractAddress with tracing
  const allLines = pt.split("\n").map(l => l.trim()).filter(Boolean);
  const src = contactLines;
  const text = pt;

  function isAddress(s) { return isLikelyAddress(s); }

  // Path 1: Labeled address
  const labeled = (() => {
    const r = /^\s*(?:address|current address|permanent address|residence|residential address|correspondence address|present address|local address|mailing address|communication address|address for communication)\s*[:\\-]?\s*(.+)/i;
    for (const line of allLines) {
      const m = line.match(r);
      if (m) return m[1].trim();
    }
    return "";
  })();
  if (labeled && labeled.length > 3 && !NOISE_PATTERNS.test(labeled) && !isPersonName(labeled)) {
    console.log('Path 1 would return:', JSON.stringify(labeled));
  }

  // Path 2: Prefix-based
  if ((!labeled || labeled.length <= 3) && !(labeled && labeled.length > 3)) {
    for (const prefix of ["address", "present address", "correspondence address", "address for communication", "residence"]) {
      const labelIdx = allLines.findIndex(l => l.toLowerCase().includes(prefix));
      if (labelIdx >= 0) {
        const prefixRe = new RegExp("^\\s*" + prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*[:\\-]?", "i");
        const addrLines = allLines.slice(labelIdx, labelIdx + 4).filter(l => l.length > 3 && !NOISE_PATTERNS.test(l) && !/(?:email|phone|mobile|contact|mobile\s*no|objective|summary|certifications|achievements|skills|date of birth|dob|marital|nationality|hobbies|interests)/i.test(l) && !/^[•\-–*\d]/.test(l) && !WORD_ROLE_KEYWORDS_RE.test(l));
        if (addrLines.length > 0) {
          const joined = addrLines.map(l => l.replace(prefixRe, "").trim()).filter(Boolean).join(", ");
          console.log('Path 2 prefix=' + prefix + ' labelIdx=' + labelIdx + ' joined=' + JSON.stringify(joined));
        } else {
          console.log('Path 2 prefix=' + prefix + ' labelIdx=' + labelIdx + ' but no addrLines (filtered)');
        }
      }
    }
  }

  // Check hasKnownPlace for all lines
  function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
  function hasKnownPlace(text) {
    const LOCATION_LOOKUP = require('./dist/data/location-data').LOCATION_LOOKUP;
    for (const place of LOCATION_LOOKUP) {
      const re = new RegExp("\\b" + escapeRe(place) + "\\b", "i");
      if (re.test(text)) return true;
    }
    const COUNTRY_NAMES = ["India", "USA", "UK", "United Arab Emirates", "UAE", "Australia", "Canada", "Germany", "France", "Japan", "Singapore", "Malaysia", "Dubai", "Qatar", "Oman", "Saudi Arabia", "Bangladesh", "Nepal", "Sri Lanka", "Pakistan", "United States", "United Kingdom", "South Africa", "New Zealand"];
    for (const country of COUNTRY_NAMES) {
      if (new RegExp("\\b" + escapeRe(country) + "\\b", "i").test(text)) return true;
    }
    return false;
  }

  // Path 3: Multi-line from src
  function canExtendAddress(line) {
    if (isAddress(line)) return true;
    if (NOISE_PATTERNS.test(line)) return false;
    if (WORD_ROLE_KEYWORDS_RE.test(line)) return false;
    const phoneMatch = line.match(/\d+/g);
    if (phoneMatch && phoneMatch.some(d => d.length >= 7)) return false;
    if (line.length > 5 && /\d/.test(line) && /[A-Za-z]/.test(line)) return true;
    return false;
  }

  let bestMultiLine = "";
  for (let i = 0; i < src.length; i++) {
    if (!isAddress(src[i])) continue;
    let combined = src[i];
    for (let j = i + 1; j < Math.min(i + 4, src.length); j++) {
      if (!canExtendAddress(src[j])) break;
      combined += ", " + src[j];
    }
    if (combined.length > bestMultiLine.length && hasKnownPlace(combined)) {
      console.log('Path 3 would return:', JSON.stringify(combined));
      bestMultiLine = combined;
    }
  }
  
  // Path 4: Single-line
  for (const line of src) {
    if (isAddress(line) && hasKnownPlace(line)) {
      console.log('Path 4 would return:', JSON.stringify(line));
    }
  }

  // Path 5: First 30 lines
  const firstSectionEnd = Math.min(30, allLines.length);
  const firstLines = allLines.slice(0, firstSectionEnd);
  for (let i = 0; i < firstLines.length; i++) {
    if (!isAddress(firstLines[i]) || !hasKnownPlace(firstLines[i])) {
      if (hasKnownPlace(firstLines[i]) && !isAddress(firstLines[i])) {
        console.log('Line ' + i + ' hasKnownPlace but !isAddress:', JSON.stringify(firstLines[i]));
      }
      continue;
    }
    let combined = firstLines[i];
    for (let j = i + 1; j < Math.min(i + 3, firstLines.length); j++) {
      if (!canExtendAddress(firstLines[j])) break;
      combined += ", " + firstLines[j];
    }
    console.log('Path 5 line ' + i + ' combined:', JSON.stringify(combined), 'hasKnownPlace:', hasKnownPlace(combined));
    if (hasKnownPlace(combined)) {
      console.log('Path 5 WOULD RETURN:', JSON.stringify(combined));
    }
  }
  
  // Also check firstLines lines individually for isAddress + hasKnownPlace
  console.log('\nLines 4-11 in detail:');
  for (let i = 4; i <= 11 && i < allLines.length; i++) {
    console.log(i + ': ' + JSON.stringify(allLines[i]));
    console.log('  isLikelyAddress:', isLikelyAddress(allLines[i]));
    console.log('  hasKnownPlace:', hasKnownPlace(allLines[i]));
    console.log('  NOISE_PATTERNS:', NOISE_PATTERNS.test(allLines[i]));
    console.log('  WORD_ROLE:', WORD_ROLE_KEYWORDS_RE.test(allLines[i]));
  }
}

run().catch(e => console.error(e));
