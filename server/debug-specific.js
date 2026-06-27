const fs = require('fs');
const pdfParse = require('pdf-parse');
const parser = require('./dist/services/parser');

async function main() {
  const cases = [
    '1782211703956-jb35ls.pdf',   // AJAYKUMAR - name fails
    '1782210797098-ytsa55.pdf',   // chinmaysharma - name fails
    '1782211704160-vahd45.pdf',   // abdulvahid - name fails
    '1782211704063-5kzp4l.pdf',   // ANKUR SINGH - email fails
  ];
  
  for (const file of cases) {
    const fp = `C:\\Users\\admin\\Desktop\\cv-parser\\server\\uploads\\${file}`;
    const buf = fs.readFileSync(fp);
    const d = await pdfParse(buf);
    const lines = d.text.split('\n').map(l => l.trim()).filter(Boolean);
    console.log(`\n=== ${file} ===`);
    for (let i = 0; i < 20 && i < lines.length; i++) {
      console.log(`  ${i}: ${JSON.stringify(lines[i].substring(0, 120))}`);
    }
    // Run parser
    const r = await parser.parseResume(fp, file);
    console.log(`  RESULT: name=${r.name}, email=${r.email}, phone=${r.phone}`);
  }
}

main().catch(e => console.error('FATAL:', e));
