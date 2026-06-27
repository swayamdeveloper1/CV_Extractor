const path = require('path');
const pdfParse = require('pdf-parse');
const fs = require('fs');
(async () => {
  const fp = path.join(__dirname, 'uploads/1782211704602-setpe6.pdf');
  const buf = fs.readFileSync(fp);
  const d = await pdfParse(buf);
  const lines = d.text.split('\n').map(l => l.trim()).filter(Boolean);
  for (let i = 0; i < 30; i++) {
    console.log('Line ' + i + ': ' + JSON.stringify(lines[i] ? lines[i].substring(0, 150) : ''));
  }
  // Test email regex
  const text = d.text;
  const r1 = text.match(/[\w.+-]+@[\w-]+(?:\.[\w-]{2,8})+(?![\w-])/g);
  console.log('\nFull match:', JSON.stringify(r1));
  
  const normalized = text.replace(/@\s*/g, '@').replace(/\.\s+/g, '.').replace(/\s+\./g, '.');
  const r2 = normalized.match(/[\w.+-]+@[\w-]+(?:\.[\w-]{2,8})+(?![\w-])/g);
  console.log('Normalized match:', JSON.stringify(r2));
})();
