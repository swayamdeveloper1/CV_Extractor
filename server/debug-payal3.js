const path = require('path');
const pdfParse = require('pdf-parse');
const fs = require('fs');
(async () => {
  const fp = path.join(__dirname, 'uploads/1782211704602-setpe6.pdf');
  const buf = fs.readFileSync(fp);
  const d = await pdfParse(buf);
  const text = d.text;
  
  // Normalize
  const normalized = text.replace(/@\s*/g, '@').replace(/\.\s+/g, '.').replace(/\s+\./g, '.');
  console.log('Normalized text first 200:', JSON.stringify(normalized.substring(0, 200)));
  
  // Test regexes
  const STRICT_RE = /[\w.+-]+@[\w-]+(?:\.[a-zA-Z]{2,6}?(?!\w))+/;
  const BROAD_RE = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
  
  console.log('STRICT match:', JSON.stringify(normalized.match(STRICT_RE)));
  console.log('BROAD match:', JSON.stringify(normalized.match(BROAD_RE)));
  
  const broadMatches = normalized.match(BROAD_RE);
  if (broadMatches) {
    for (const m of broadMatches) {
      console.log('Broad candidate:', JSON.stringify(m));
      const strict = m.match(STRICT_RE);
      console.log('  Strict on candidate:', JSON.stringify(strict && strict[0]));
      
      // Known TLD test
      const KNOWN_TLD_RE = /\.(com|in|org|net|edu|gov|co\.in|ac\.in)\b/i;
      for (let end = m.length; end >= 0; end--) {
        const sub = m.slice(0, end);
        const tld = sub.match(KNOWN_TLD_RE);
        if (tld && tld.index + tld[0].length === sub.length) {
          console.log('  Known TLD fallback:', JSON.stringify(sub));
          break;
        }
      }
    }
  }
})();
