const fs = require('fs');
const path = require('path');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.mjs');
const { preprocess } = require('./dist/services/parser/preprocess');
const { detectSections, getContactHeader } = require('./dist/services/parser/sectionDetector');
const { extractAddress } = require('./dist/services/parser/headerParser');

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
  
  console.log('Contact lines:');
  contactLines.forEach((l, i) => console.log(i + ': [' + l + ']'));
  
  // Check isLikelyAddress for each
  const v = require('./dist/services/parser/validators');
  contactLines.forEach((l, i) => {
    const result = v.isLikelyAddress(l);
    if (result) console.log('  Line ' + i + ' isLikelyAddress=true: [' + l + ']');
  });
  
  const allLines = pt.split('\n').filter(Boolean);
  console.log('\nFirst 30 lines that pass isLikelyAddress:');
  for (let i = 0; i < Math.min(30, allLines.length); i++) {
    if (v.isLikelyAddress(allLines[i])) {
      console.log(i + ': [' + allLines[i] + ']');
    }
  }
  
  console.log('\nExtracted address:', JSON.stringify(extractAddress(pt, contactLines, boundaries)));
}

run().catch(e => console.error(e));
