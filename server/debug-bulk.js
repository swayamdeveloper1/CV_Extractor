const fs = require('fs');
const path = require('path');
const parser = require('./dist/services/parser');

async function main() {
  const dir = 'C:\\Users\\admin\\Desktop\\cv-parser\\server\\uploads';
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.pdf') || f.endsWith('.docx') || f.endsWith('.txt'));
  let tested = 0;
  for (const f of files) {
    if (tested >= 20) break;
    const fp = path.join(dir, f);
    try {
      const r = await parser.parseResume(fp, f);
      const status = (r.name ? 'Y' : 'n') + (r.email ? 'Y' : 'n') + (r.phone ? 'Y' : 'n');
      if (status !== 'YYY') {
        console.log(f.substring(0,30) + ' N/E/P=' + status + ' | name=' + (r.name || '""') + ' | email=' + (r.email || '""') + ' | phone=' + (r.phone || '""'));
        tested++;
      }
    } catch(e) {
      console.log(f.substring(0,30) + ' ERROR: ' + e.message);
    }
  }
  console.log('DONE');
}

main().catch(e => console.error('FATAL:', e));
