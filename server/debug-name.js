const fs = require('fs');
const pdfParse = require('pdf-parse');

async function main() {
  // Test specific files where name fails
  const cases = [
    '1782210797091-eoax0a.pdf',
    '1782211703950-fshfvn.pdf',
    '1782211704085-00x0xw.pdf'
  ];
  for (const file of cases) {
    const fp = `C:\\Users\\admin\\Desktop\\cv-parser\\server\\uploads\\${file}`;
    const buf = fs.readFileSync(fp);
    const d = await pdfParse(buf);
    const lines = d.text.split('\n').map(l => l.trim()).filter(Boolean);
    console.log(`\n=== ${file} ===`);
    console.log(`Total lines: ${lines.length}`);
    console.log('Line 0:', JSON.stringify(lines[0]));
    console.log('Line 1:', JSON.stringify(lines[1]));
    console.log('Line 2:', JSON.stringify(lines[2]));
    console.log('Line 3:', JSON.stringify(lines[3]));
    console.log('Line 4:', JSON.stringify(lines[4]));
    
    // Check each line against name regex
    const nameRegex = /^(Mr\.?|Mrs\.?|Ms\.?|Er\.?|Dr\.?|Prof\.?)?\s?[A-Z][a-zA-Z.'-]+(?:\s+[A-Z][a-zA-Z.'-]+){1,4}$/;
    for (let i = 0; i < 20 && i < lines.length; i++) {
      const l = lines[i];
      if (l.length < 3 || l.length > 50) continue;
      if (noisePatterns(l)) continue;
      const match = nameRegex.test(l);
      if (match) console.log(`  Line ${i} MATCHES:`, JSON.stringify(l));
    }
  }
}

const np = /(email|phone|mobile|http|www\.|linkedin|github|skype|@|\.com|resume|cv|curriculum\s*vitae)/i;
function noisePatterns(s) { return np.test(s); }

main().catch(e => console.error('ERROR:', e));
