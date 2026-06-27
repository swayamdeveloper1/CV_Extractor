const fs = require('fs');
const path = require('path');

async function main() {
  const files = fs.readdirSync(path.join(__dirname, 'uploads'))
    .filter(f => f.endsWith('.pdf') || f.endsWith('.docx') || f.endsWith('.txt'));

  let tested = 0;
  for (const f of files) {
    if (tested >= 5) break;
    const ext = path.extname(f).toLowerCase();
    const fp = path.join(__dirname, 'uploads', f);
    let text = '';
    try {
      if (ext === '.txt') {
        text = fs.readFileSync(fp, 'utf-8');
      } else if (ext === '.pdf') {
        const pdfParse = require('pdf-parse');
        const buf = fs.readFileSync(fp);
        const data = await pdfParse(buf);
        text = data.text || '';
      } else if (ext === '.docx') {
        const mammoth = require('mammoth');
        const data = await mammoth.extractRawText({ buffer: fs.readFileSync(fp) });
        text = data.value || '';
      }
    } catch(e) {
      console.log(`[SKIP ${f}] ${e.message}`);
      continue;
    }
    if (text.trim().length > 20) {
      const first200 = text.substring(0, 200).replace(/\n/g, ' | ');
      console.log(`[${f}] ${text.length} chars => ${first200}`);
      tested++;
    }
  }
  console.log('DONE');
}

main().catch(e => console.error('FATAL:', e));
