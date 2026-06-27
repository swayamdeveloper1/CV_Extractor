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
  const file = 'Bhaskar.resume3.pdf';
  const rawText = await extractPdfText(path.join(dir, file));
  
  const { preprocess } = require('./dist/services/parser/preprocess');
  const cleanText = preprocess(rawText);
  const { detectSections, getContactHeader } = require('./dist/services/parser/sectionDetector');
  const boundaries = detectSections(cleanText);
  const contactLines = getContactHeader(cleanText, boundaries);
  
  console.log('=== Contact Lines ===');
  contactLines.forEach((l, i) => console.log(i + ': ' + JSON.stringify(l)));
  
  console.log('\n=== Leftover Header Lines ===');
  const { getLeftoverHeaderLines } = require('./dist/services/parser/headerParser');
  const leftovers = getLeftoverHeaderLines(contactLines, 'BHASKAR HAZARI');
  leftovers.forEach((l, i) => console.log(i + ': ' + JSON.stringify(l)));
  
  console.log('\n=== isLikelyAddress results ===');
  const { isLikelyAddress } = require('./dist/services/parser/validators');
  contactLines.forEach((l, i) => console.log(i + ': ' + isLikelyAddress(l) + ' ← ' + JSON.stringify(l)));
  
  console.log('\n=== hasKnownPlace results ===');
  const { extractAddress } = require('./dist/services/parser/headerParser');
  console.log('extractAddress:', JSON.stringify(extractAddress(cleanText, contactLines)));
}
run().catch(e => console.error(e));
