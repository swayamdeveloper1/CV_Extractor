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
  const files = ['CV Chinmay_Sharma.pdf', 'CV nizam .pdf', 'KHASIM CIVIL ENGINEER (CV)-1.pdf', 'rk resume (1) (1).pdf'];
  
  for (const file of files) {
    const rawText = await extractPdfText(path.join(dir, file));
    const { preprocess } = require('./dist/services/parser/preprocess');
    const { detectSections, getContactHeader } = require('./dist/services/parser/sectionDetector');
    const cleanText = preprocess(rawText);
    const boundaries = detectSections(cleanText);
    const contactLines = getContactHeader(cleanText, boundaries);
    
    console.log('=== ' + file + ' ===');
    console.log('First 15 contact lines:');
    contactLines.slice(0, 15).forEach((l, i) => console.log('  ' + i + ': ' + JSON.stringify(l)));
    console.log('');
  }
}
run().catch(e => console.error(e));
