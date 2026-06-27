const path = require('path');
const { parseResume } = require(path.join(__dirname, 'dist/services/parser'));

(async () => {
  const fp = path.join(__dirname, 'uploads/1782211704282-nwa851.pdf');
  const r = await parseResume(fp, 'test.pdf');
  console.log('employer:', JSON.stringify(r.employer));
  console.log('\nexperiences:');
  if (r.experiences) {
    r.experiences.forEach((e, i) => {
      console.log(`  ${i}: company="${e.company}", role="${e.role}", duration="${e.duration}", startDate="${e.startDate}"`);
    });
  } else {
    console.log('  undefined');
  }
  console.log('\naddress:', JSON.stringify(r.address));
})().catch(e => console.error(e));
