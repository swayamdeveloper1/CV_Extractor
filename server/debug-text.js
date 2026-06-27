const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const dir = 'C:\\Users\\admin\\Desktop\\cv-parser\\server\\uploads';
async function main() {
  const pdfs = [
    'pi616d', 'setpe6', 'nwa851', 'ejd0ga',
    'g4xirj', 'fmhi62'
  ];
  for (const p of pdfs) {
    const file = fs.readdirSync(dir).find(f => f.includes(p));
    if (!file) { console.log('=== ' + p + ' === (not found)'); continue; }
    const fp = path.join(dir, file);
    const buf = fs.readFileSync(fp);
    const data = await pdfParse(buf);
    console.log('=== ' + p + ' (' + data.text.length + ' chars) ===');
    console.log(data.text);
    console.log('');
  }
}
main().catch(e => console.error('FATAL:', e));
