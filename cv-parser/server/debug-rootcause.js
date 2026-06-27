const fs = require('fs');
const pdfParse = require('pdf-parse');

async function main() {
  const cases = [
    '1782210797091-eoax0a.pdf',   // name="" (BHASKARHAZARI)
    '1782211703950-fshfvn.pdf',   // all empty
    '1782211703956-jb35ls.pdf',   // name="", email works, phone=""
    '1782211704080-wexkyj.pdf',   // all empty
    '1782211704112-a8pi5i.pdf',   // all empty
    '1782211704192-pi616d.pdf',   // all empty
    '1782211704303-iig7qe.pdf',   // all empty
    '1782211704066-g4xirj.pdf',   // name="", email="", phone works
  ];
  
  for (const file of cases) {
    const fp = `C:\\Users\\admin\\Desktop\\cv-parser\\server\\uploads\\${file}`;
    try {
      const buf = fs.readFileSync(fp);
      const d = await pdfParse(buf);
      const lines = d.text.split('\n').map(l => l.trim()).filter(Boolean);
      console.log(`\n=== ${file} ===`);
      console.log(`Lines: ${lines.length}`);
      for (let i = 0; i < 25 && i < lines.length; i++) {
        console.log(`  ${i}: ${JSON.stringify(lines[i].substring(0, 120))}`);
      }
    } catch(e) {
      console.log(`\n=== ${file} === ERROR: ${e.message}`);
    }
  }
}

main().catch(e => console.error('FATAL:', e));
