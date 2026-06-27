const path = require('path');
const pdfParse = require('pdf-parse');
const fs = require('fs');

// Load the dist functions directly
const parser = require(path.join(__dirname, 'dist/services/parser'));

(async () => {
  const fp = path.join(__dirname, 'uploads/1782211704282-nwa851.pdf');
  const buf = fs.readFileSync(fp);
  const d = await pdfParse(buf);
  const text = d.text;
  
  // Inspect the internal functions
  // Call getSectionLines for experience
  const expLines = parser._test_getSectionLines ? 
    parser._test_getSectionLines(text, ["experience", "work experience", "employment", "work history"]) :
    "not exported";
  
  console.log("expLines type:", typeof expLines);
  console.log("expLines length:", expLines.length);
  if (expLines.length > 0) {
    for (let i = 0; i < Math.min(20, expLines.length); i++) {
      console.log(`  ${i}: "${expLines[i].substring(0,100)}"`);
    }
  }
  
  // Check what extractCompanyFromExpLines would return
  const extractCompanyFromExpLines = parser._test_extractCompanyFromExpLines;
  if (extractCompanyFromExpLines) {
    const result = extractCompanyFromExpLines(expLines);
    console.log("\nextractCompanyFromExpLines result:", JSON.stringify(result));
  }
  
  // Call extractEmployer directly
  if (typeof parser.extractEmployer === 'function') {
    // Can't call directly since it's not exported
    // But we can inspect what parseResume returns
  }
  
  console.log("\nDebug: Checking if getSectionLines works...");
  // Since these are internal, let me just parse the source
  const src = fs.readFileSync(path.join(__dirname, 'dist/services/parser.js'), 'utf-8');
  
  // Find the getSectionLines function
  const gsMatch = src.match(/function getSectionLines\([^)]+\)\s*\{[^}]+\}/);
  if (gsMatch) {
    console.log("getSectionLines found in source");
  } else {
    console.log("Could not find getSectionLines");
  }
})().catch(e => console.error(e));
