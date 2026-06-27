const path = require('path');
const pdfParse = require('pdf-parse');
const fs = require('fs');
(async () => {
  const files = [
    '1782211704282-nwa851.pdf',
    '1782211704371-ejd0ga.pdf',
    '1782211704208-fmhi62.pdf',
    '1782211704602-setpe6.pdf',
  ];
  for (const f of files) {
    const fp = path.join(__dirname, 'uploads', f);
    const buf = fs.readFileSync(fp);
    const d = await pdfParse(buf);
    console.log(`\n=== ${f} ===`);
    const lines = d.text.split('\n').map(l => l.trim()).filter(Boolean);
    // Find EXPERIENCE section
    let inExp = false;
    for (let i = 0; i < lines.length; i++) {
      if (/^experience/i.test(lines[i])) inExp = true;
      if (/^education|^skills|^projects|^certifications/i.test(lines[i])) inExp = false;
      if (inExp) {
        console.log(`  L${i}: ${JSON.stringify(lines[i].substring(0, 120))}`);
      }
    }
  }
})().catch(e => console.error(e));
