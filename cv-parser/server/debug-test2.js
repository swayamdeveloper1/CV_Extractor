const fs = require('fs');
const path = require('path');
const parser = require('./dist/services/parser');
const dir = 'C:\\Users\\admin\\Desktop\\cv-parser\\server\\uploads';
const markers = ['g4xirj','setpe6','pi616d','fmhi62','nwa851','ejd0ga'];
async function main() {
  const files = fs.readdirSync(dir).filter(f => markers.some(m => f.includes(m)));
  for (const f of files) {
    const fp = path.join(dir, f);
    try {
      const r = await parser.parseResume(fp, f);
      console.log('=== ' + f.substring(0,35) + ' ===');
      console.log('  name: "' + (r.name || '') + '"');
      console.log('  email: "' + (r.email || '') + '"');
      console.log('  phone: "' + (r.phone || '') + '"');
      console.log('  designation: "' + (r.designation || '') + '"');
      console.log('  employer: "' + (r.employer || '') + '"');
      console.log('  address: "' + (r.address || '') + '"');
      console.log('  location: "' + (r.location || '') + '"');
      console.log('  qualification: "' + (r.qualification || '') + '"');
    } catch(e) {
      console.log('=== ' + f.substring(0,35) + ' === ERROR: ' + e.message);
    }
  }
  console.log('DONE');
}
main().catch(e => console.error('FATAL:', e));
