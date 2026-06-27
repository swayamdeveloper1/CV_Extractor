const path = require('path');
const { parseResume } = require(path.join(__dirname, 'dist/services/parser'));
(async () => {
  const fp = path.join(__dirname, 'uploads/1782211704602-setpe6.pdf');
  const r = await parseResume(fp, '1782211704602-setpe6.pdf');
  console.log('name=' + r.name + ' | email=' + r.email + ' | phone=' + r.phone);
})();
