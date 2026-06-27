const v = require('./dist/services/parser/validators');
console.log('Country line:', v.isLikelyAddress('Country of Citizenship/Residence : India'));
console.log('Place line:', v.isLikelyAddress('Place of issue- Ahmedabad'));
console.log('Kudasan line:', v.isLikelyAddress('Kudasan, Gandhinagar, (GUJARAT)'));
console.log('bullet job line:', v.isLikelyAddress('\u2022 Prepare the income and expenditure account'));
