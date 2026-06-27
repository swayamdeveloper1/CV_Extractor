const fs = require('fs');
const pdfParse = require('pdf-parse');

async function main() {
  const cases = [
    '1782211704282-nwa851.pdf',
    '1782211704371-ejd0ga.pdf',
    '1782211704387-7hp9sh.pdf',
  ];
  for (const file of cases) {
    const fp = `C:\\Users\\admin\\Desktop\\cv-parser\\server\\uploads\\${file}`;
    const buf = fs.readFileSync(fp);
    const d = await pdfParse(buf);
    const lines = d.text.split('\n').map(l => l.trim()).filter(Boolean);
    console.log(`\n=== ${file} ===`);
    // Check ALL lines for "name:" pattern
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (/^name/i.test(l) || /name\s*[:]/i.test(l) || l === l.toUpperCase()) {
        console.log(`  Line ${i}: ${JSON.stringify(l.substring(0,100))}`);
      }
    }
  }
}
main().catch(e => console.error(e));
