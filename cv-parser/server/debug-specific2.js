const path = require('path');
const { parseResume } = require(path.join(__dirname, 'dist/services/parser'));
(async () => {
  const files = [
    '1782211704066-g4xirj.pdf',
    '1782211704602-setpe6.pdf',
    '1782211704192-pi616d.pdf',
    '1782211704208-fmhi62.pdf',
    '1782211704282-nwa851.pdf',
    '1782211704371-ejd0ga.pdf',
  ];
  for (const f of files) {
    const fp = path.join(__dirname, 'uploads', f);
    const r = await parseResume(fp, f);
    console.log(`${f}: name=${r.name} | email=${r.email} | phone=${r.phone} | employer=${r.employer} | address=${r.address} | designation=${r.designation}`);
  }
})().catch(e => console.error(e));
