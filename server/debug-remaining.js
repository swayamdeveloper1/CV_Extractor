const fs = require('fs');
const pdfParse = require('pdf-parse');
const parser = require('./dist/services/parser');

async function main() {
  const cases = [
    '1782211704192-pi616d.pdf',   // has text but no name
    '1782211704208-fmhi62.pdf',   // no name
    '1782211704213-yhk4je.pdf',   // no name
    '1782211704282-nwa851.pdf',   // no name
    '1782211704066-g4xirj.pdf',   // no name
    '1782211704371-ejd0ga.pdf',   // no name
    '1782211704361-pwxpdg.pdf',   // false positive "Description Unit"
  ];
  
  for (const file of cases) {
    const fp = `C:\\Users\\admin\\Desktop\\cv-parser\\server\\uploads\\${file}`;
    try {
      const buf = fs.readFileSync(fp);
      const d = await pdfParse(buf);
      const lines = d.text.split('\n').map(l => l.trim()).filter(Boolean);
      console.log(`\n=== ${file} (${lines.length} lines) ===`);
      for (let i = 0; i < 12 && i < lines.length; i++) {
        console.log(`  ${i}: ${JSON.stringify(lines[i].substring(0, 100))}`);
      }
      const r = await parser.parseResume(fp, file);
      console.log(`  RESULT: name=${r.name}, email=${r.email}, phone=${r.phone}`);
    } catch(e) {
      console.log(`\n=== ${file} === ERROR: ${e.message}`);
    }
  }
}

main().catch(e => console.error('FATAL:', e));
