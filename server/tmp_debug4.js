const fs = require('fs');
const path = require('path');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.mjs');
const { preprocess } = require('./dist/services/parser/preprocess');
const { detectSections, getContactHeader } = require('./dist/services/parser/sectionDetector');

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
  
  const hp = require('./dist/services/parser/headerParser');
  const v = require('./dist/services/parser/validators');

  // Check the exact line
  const line4 = contactLines[4];
  console.log('Line 4:', JSON.stringify(line4));
  console.log('isLikelyAddress:', v.isLikelyAddress(line4));
  console.log('hasKnownPlace (local):', hp.extractAddress.name); // just checking exports

  // Check each path manually
  const allLines = pt.split('\n').filter(Boolean);
  
  // Path 7: leftovers fallback
  const leftovers = contactLines.filter(line => {
    const l = line;
    if (/(email|phone|mobile|http|www\.|linkedin|github|skype|@|\.com|resume|cv|curriculum\s*vitae)/i.test(l)) return false;
    if (/^(summary|experience|education|skills|projects|objective|profile|qualifications|certifications|achievements|references|declaration|interests|languages|training|internship|volunteer|page\s*\d+)$/i.test(l.trim())) return false;
    if (v.isPersonName(l) && l === "") return false;
    if (hp.extractPhone(l)) return false;
    if (hp.extractEmail(l)) return false;
    const labelCheck = (() => {
      const re = new RegExp("^\\s*(?:designation|position|role|title|job title|location|city|place|current location|total experience|years of experience|name|full name|candidate name|applicant name|address|current address|permanent address|residence|residential address|correspondence address|present address|local address|mailing address|communication address|nationality|marital status|gender|date of birth|dob|father|mother|spouse|passport|language|hobbies|interests)\\s*[:\\-]\\s*[-:]?\\s*(.+)", "i");
      const m = l.match(re);
      return m ? m[1].trim() : "";
    })();
    if (labelCheck) return false;
    if (/\b(engineer|developer|manager|analyst|intern|associate|consultant|lead|architect|director|specialist|officer|trainee|supervisor|executive|head|chief|president|vp|designer|programmer|scientist|researcher|lecturer|professor|instructor|trainer|accountant|technician|advisor|auditor|planner|operator|coordinator|administrator|hr|devops|scrum\s*master|owner|analytics|support|foreman|surveyor|estimator|draughtsman|modeller|scheduler|foreman|superintendent)\b/i.test(l)) return false;
    if (/objective|profile|summary|education|skills|experience|projects|certifications/i.test(l)) return false;
    if (/about|nationality|gender|marital/i.test(l)) return false;
    return true;
  });
  
  console.log('\nLeftovers:', leftovers);
  
  // ADDRESS_REJECT check
  const ADDRESS_REJECT = /\b(responsibilities|project\s*description|work\s*location|office\s*address|company\s*address|project\s*location|job\s*description|key\s*responsibilities|roles\s*and\s*responsibilities|objective|profile|summary|career\s*objective|professional\s*summary|certifications|achievements|technical\s*skills|core\s*competencies|country\s*of\s*citizenship|place\s*of\s*issue|date\s*of\s*issue|passport|communication\s*address|residence\s*address)\b/i;
  for (const l of leftovers) {
    console.log('  ADDRESS_REJECT.test(' + JSON.stringify(l) + '):', ADDRESS_REJECT.test(l));
  }
  
  // Check if the original import path is wrong
  console.log('\nFull extractAddress result:', JSON.stringify(hp.extractAddress(pt, contactLines, boundaries)));
  
  // Now test without contactLines (use default)
  console.log('\nWithout contactLines:', JSON.stringify(hp.extractAddress(pt, undefined, boundaries)));
}

run().catch(e => console.error(e));
