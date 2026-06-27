const fs = require('fs');
const pdfParse = require('pdf-parse');

async function main() {
  const fp = 'C:\\Users\\admin\\Desktop\\cv-parser\\server\\uploads\\1782197852718-iyzws7.pdf';
  const buf = fs.readFileSync(fp);
  const d = await pdfParse(buf);
  const lines = d.text.split('\n').map(l => l.trim()).filter(Boolean);
  console.log('=== FIRST 15 LINES ===');
  for (let i = 0; i < 15 && i < lines.length; i++) {
    console.log(i + ': ' + JSON.stringify(lines[i]));
  }
  console.log('\n=== RUNNING PARSER ===');
  const parser = require('./dist/services/parser');
  const result = await parser.parseResume(fp, 'test.pdf');
  console.log(JSON.stringify(result, null, 2));
}

main().catch(e => console.error('ERROR:', e));
