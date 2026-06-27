const fs = require('fs');
const path = require('path');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.mjs');
const { preprocess } = require('./dist/services/parser/preprocess');

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
  const allLines = pt.split('\n').filter(Boolean);
  console.log('First 40 lines of preprocessed text:');
  for (let i = 0; i < Math.min(40, allLines.length); i++) {
    console.log(i + ': [' + allLines[i] + ']');
  }
}
run().catch(e => console.error(e));
