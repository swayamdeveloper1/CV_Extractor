const path = require('path');
const pdfParse = require('pdf-parse');
const fs = require('fs');
(async () => {
  const fp = path.join(__dirname, 'uploads/1782211704066-g4xirj.pdf');
  const buf = fs.readFileSync(fp);
  const d = await pdfParse(buf);
  const lines = d.text.split('\n').map(l => l.trim()).filter(Boolean);
  for (let i = 0; i < 15; i++) {
    console.log('L' + i + ': ' + JSON.stringify(lines[i]));
  }
  console.log('---');
  const text = d.text;
  // Find anything like an email
  const emailRx = /[\w.+-]+@[\w.-]+/g;
  const matches = text.match(emailRx);
  console.log('Email-like:', JSON.stringify(matches));
})();
