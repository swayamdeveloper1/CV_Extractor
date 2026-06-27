const fs = require('fs');
const path = require('path');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.mjs');

async function extractPdfText(filePath) {
  const buffer = new Uint8Array(fs.readFileSync(filePath));
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  let finalText = '';
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
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
      finalText += rows[y].join(' ');
      finalText += '\n';
    }
    finalText += '\n';
  }
  return finalText;
}

async function run() {
  const dir = 'C:\\Users\\admin\\Downloads\\wetransfer_sample_cvs-1-zip_2026-06-23_0903\\Sample_CVs 1';
  
  // Test multiple files for address
  const files = ['Bhaskar.resume3.pdf', 'Asif Niyaz Resume-MEP.pdf', 'CV Chinmay_Sharma.pdf', 'CV nizam .pdf', 'harsh thakar updated cv.pdf', 'KHASIM CIVIL ENGINEER (CV)-1.pdf', 'rk resume (1) (1).pdf', 'Sagar Resume .pdf', 'VIKASH KUMAR SINGH-1.pdf', 'Naveen Sharma (MQS).docx', 'VEERESH PROFILE.docx', 'VINOD KUMAR SINGH(1).docx', 'Pradeep Kumar CV (1) (1).pdf'];
  
  const { preprocess } = require('./dist/services/parser/preprocess');
  const { detectSections, getContactHeader } = require('./dist/services/parser/sectionDetector');
  
  for (const file of files) {
    let rawText;
    if (file.endsWith('.docx')) {
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ buffer: fs.readFileSync(path.join(dir, file)) });
      rawText = result.value || '';
    } else {
      rawText = await extractPdfText(path.join(dir, file));
    }
    
    const cleanText = preprocess(rawText);
    const boundaries = detectSections(cleanText);
    const contactLines = getContactHeader(cleanText, boundaries);
    
    // Get leftover header lines (internal, simulate it)
    const { isSectionWord, isPersonName, isLikelyAddress } = require('./dist/services/parser/validators');
    const { extractPhone, extractEmail } = require('./dist/services/parser/headerParser');
    const { looksLikeCompany } = require('./dist/services/parser/companyDetector');
    
    const NOISE_PATTERNS = /(email|phone|mobile|http|www\.|linkedin|github|skype|@|\.com|resume|cv|curriculum\s*vitae)/i;
    const WORD_ROLE_KEYWORDS_RE = /\b(engineer|developer|manager|analyst|intern|associate|consultant|lead|architect|director|specialist|officer|trainee|supervisor|executive|head|chief|president|vp|designer|programmer|scientist|researcher|lecturer|professor|instructor|trainer|accountant|technician|advisor|auditor|planner|operator|coordinator|administrator|hr|devops|scrum\s*master|owner|analytics|support|foreman|surveyor|estimator|draughtsman|modeller|scheduler|foreman|superintendent)\b/i;

    function extractLabel(lines, pattern) {
      const re = new RegExp("^\\s*(?:" + pattern + ")\\s*[:\\-]\\s*[-:]?\\s*(.+)", "i");
      for (const l of lines) {
        const m = l.match(re);
        if (m) return m[1].trim();
      }
      return "";
    }

    const leftovers = contactLines.filter(line => {
      if (NOISE_PATTERNS.test(line)) return false;
      if (isSectionWord(line)) return false;
      if (isPersonName(line)) return false;
      if (extractPhone(line)) return false;
      if (extractEmail(line)) return false;
      const labelCheck = extractLabel([line], "designation|position|role|title|job title|location|city|place|current location|total experience|years of experience|name|full name|candidate name|applicant name|address|current address|permanent address|residence|residential address|correspondence address|present address|local address|mailing address|communication address|nationality|marital status|gender|date of birth|dob|father|mother|spouse|passport|language|hobbies|interests");
      if (labelCheck) return false;
      if (WORD_ROLE_KEYWORDS_RE.test(line)) return false;
      if (looksLikeCompany(line)) return false;
      if (/objective|profile|summary|education|skills|experience|projects|certifications/i.test(line)) return false;
      if (/about|nationality|gender|marital/i.test(line)) return false;
      return true;
    });
    
    const addrFallback = leftovers.filter(l => /[A-Za-z]/.test(l) && l.length > 5 && !isPersonName(l) && !isSectionWord(l) && !WORD_ROLE_KEYWORDS_RE.test(l));
    
    console.log(file.padEnd(35) + ': leftover count=' + leftovers.length + ' fallback=' + addrFallback.length);
    if (addrFallback.length > 0) {
      console.log('  First leftover: ' + JSON.stringify(leftovers[0]));
      console.log('  First fallback: ' + JSON.stringify(addrFallback[0]));
    } else {
      console.log('  NO FALLBACK');
      console.log('  Contact lines:');
      contactLines.slice(0, 15).forEach((l, i) => console.log('    ' + i + ': ' + JSON.stringify(l)));
    }
  }
}
run().catch(e => console.error(e));
