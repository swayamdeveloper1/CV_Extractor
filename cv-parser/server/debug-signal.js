const { COMPANY_SUFFIX_LOOKUP, COMPANY_PATTERN_LOOKUP } = require('./dist/data/company-data');
const line = "Grand water pipe drinking supply scame Hubble (Karnataka)";
for (const s of COMPANY_SUFFIX_LOOKUP) {
  const re = new RegExp("\\b" + s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "i");
  if (re.test(line)) {
    console.log("MATCH suffix:", s);
  }
}
for (const pat of COMPANY_PATTERN_LOOKUP) {
  if (line.toLowerCase().includes(pat.toLowerCase())) {
    console.log("MATCH pattern:", pat);
  }
}
console.log("No matches found");
