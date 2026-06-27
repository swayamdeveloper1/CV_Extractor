const path = require('path');
const pdfParse = require('pdf-parse');
const fs = require('fs');
(async () => {
  const fp = path.join(__dirname, 'uploads/1782211704602-setpe6.pdf');
  const buf = fs.readFileSync(fp);
  const d = await pdfParse(buf);
  const text = d.text;
  const normalized = text.replace(/@\s*/g, '@').replace(/\.\s+/g, '.').replace(/\s+\./g, '.');
  
  // Import compiled parser
  const { parseResume } = require(path.join(__dirname, 'dist/services/parser'));
  
  // Manually test cleanEmail via extractEmail
  const STRICT_RE = /[\w.+-]+@[\w-]+(?:\.[a-zA-Z]{2,6}?(?!\w))+/;
  const BROAD_RE = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
  const KNOWN_TLD_RE = /\.(com|in|org|net|edu|gov|co\.in|ac\.in|info|biz|me|io|ai|dev|app|online|site|tech|store|blog|pro|name|xyz|live|work|today|email|world|group|media|photo|guru|zone|link|mobi|asia|tv|fm|am|jobs|tools|life|care|health|news|club|team|city|company|systems|solutions|consulting|international|education|services|agency|management|exchange|foundation|org\.in|net\.in|firm\.in|gen\.in|ind\.in)\b/i;

  function cleanEmail(s) {
    const strict = s.match(STRICT_RE);
    if (strict && strict[0].length === s.length) { console.log('  strict match'); return s; }
    for (let end = s.length; end >= 0; end--) {
      const sub = s.slice(0, end);
      if (KNOWN_TLD_RE.test(sub)) {
        const m = sub.match(KNOWN_TLD_RE);
        if (m && sub.endsWith(m[0])) { console.log('  tld fallback at end='+end); return sub; }
      }
    }
    console.log('  no tld found');
    return null;
  }

  const broadMatches = normalized.match(BROAD_RE);
  if (broadMatches) {
    for (const match of broadMatches) {
      console.log('Testing:', match);
      const cleaned = cleanEmail(match);
      console.log('Result:', cleaned);
    }
  }
  
  // Now test full parseResume
  console.log('\n--- Full parse ---');
  const r = await parseResume(fp, 'test.pdf');
  console.log('name='+r.name, 'email='+r.email, 'phone='+r.phone);
})();
