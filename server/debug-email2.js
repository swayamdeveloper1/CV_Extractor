const path = require('path');
const pdfParse = require('pdf-parse');
const fs = require('fs');

// Copy the exact extractEmail from compiled code
const STRICT_RE = /[\w.+-]+@[\w-]+(?:\.[a-zA-Z]{2,6}?(?!\w))+/;
const BROAD_RE = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
const KNOWN_TLD_RE = /\.(com|in|org|net|edu|gov|co\.in|ac\.in|info|biz|me|io|ai|dev|app|online|site|tech|store|blog|pro|name|xyz|live|work|today|email|world|group|media|photo|guru|zone|link|mobi|asia|tv|fm|am|jobs|tools|life|care|health|news|club|team|city|company|systems|solutions|consulting|international|education|services|agency|management|exchange|foundation|org\.in|net\.in|firm\.in|gen\.in|ind\.in)\b/i;

function cleanEmail(s) {
  const strict = s.match(STRICT_RE);
  if (strict && strict[0].length === s.length) return s;
  for (let end = s.length; end >= 0; end--) {
    const sub = s.slice(0, end);
    if (KNOWN_TLD_RE.test(sub)) {
      const m = sub.match(KNOWN_TLD_RE);
      if (m && sub.endsWith(m[0])) return sub;
    }
  }
  const tldPos = s.search(/\.([a-zA-Z]{2,6})(?:[^a-zA-Z]|$)/);
  if (tldPos >= 0) {
    const tldLen = s.slice(tldPos).match(/[a-zA-Z]{2,6}/)[0].length;
    return s.slice(0, tldPos + tldLen);
  }
  return null;
}

(async () => {
  const fp = path.join(__dirname, 'uploads/1782211704066-g4xirj.pdf');
  const buf = fs.readFileSync(fp);
  const d = await pdfParse(buf);
  const text = d.text;
  const normalized = text.replace(/@\s*/g, '@').replace(/\.\s+/g, '.').replace(/\s+\./g, '.');
  
  console.log('=== Testing extractEmail steps ===');
  
  // Step 1: strict regex
  console.log('Step 1 STRICT_RE:', JSON.stringify(normalized.match(STRICT_RE)));
  
  // Step 2: broad regex
  const broad = normalized.match(BROAD_RE);
  console.log('Step 2 BROAD_RE:', JSON.stringify(broad));
  if (broad) {
    for (const m of broad) {
      console.log('  Candidate:', JSON.stringify(m));
      console.log('  cleanEmail:', JSON.stringify(cleanEmail(m)));
    }
  }
  
  // Step 3: line split
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  console.log('\nStep 3 line-split handler');
  for (let i = 0; i < lines.length; i++) {
    const partial = lines[i].match(/([\w.+-]+@[\w-]+(?:\.[\w-]+)*)\.(\w{0,2})$/i);
    if (partial && i + 1 < lines.length) {
      const nextWord = lines[i + 1].split(/\s+/)[0].replace(/[^a-zA-Z0-9]/g, '');
      const combined = partial[1] + '.' + partial[2] + nextWord;
      console.log(`  Line ${i}: ${JSON.stringify(lines[i])} + ${JSON.stringify(lines[i+1])} = ${JSON.stringify(combined)}`);
      console.log('  cleanEmail:', JSON.stringify(cleanEmail(combined)));
    }
  }
  
  // Step 4: dot truncated
  const dotTruncated = text.match(/([\w.+-]+@[\w-]+\.)(?:\s|[^a-zA-Z]|$)/gi);
  console.log('\nStep 4 dot truncated:', JSON.stringify(dotTruncated));
  
  // Step 5: lenient
  const lenient = normalized.match(new RegExp(STRICT_RE.source, 'gi'));
  console.log('Step 5 lenient:', JSON.stringify(lenient));
  
  // Now test the actual compiled extractEmail
  const { parseResume } = require(path.join(__dirname, 'dist/services/parser'));
  const r = await parseResume(fp, 'test.pdf');
  console.log('\nActual parseResume result:');
  console.log('  email:', JSON.stringify(r.email));
  console.log('  name:', JSON.stringify(r.name));
  console.log('  phone:', JSON.stringify(r.phone));
})().catch(e => console.error(e));
