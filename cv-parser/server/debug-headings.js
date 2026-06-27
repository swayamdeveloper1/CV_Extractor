const path = require('path');
const pdfParse = require('pdf-parse');
const fs = require('fs');

(async () => {
  const files = ['1782211704371-ejd0ga.pdf'];
  for (const f of files) {
    const fp = path.join(__dirname, 'uploads', f);
    const buf = fs.readFileSync(fp);
    const d = await pdfParse(buf);
    const lines = d.text.split('\n').map(l => l.trim()).filter(Boolean);
    
    console.log(`\n=== ${f} ===`);
    console.log('Lines:');
    for (let i = 0; i < Math.min(lines.length, 80); i++) {
      console.log(`  L${i}: "${lines[i].substring(0,120)}"`);
    }
    
    // Check section headings
    const ALL_SECTION_HEADINGS = [
      "summary", "professional summary", "career summary", "profile", "about me",
      "objective", "career objective",
      "experience", "work experience", "work history", "employment",
      "professional experience", "employment history",
      "education", "academic background", "qualifications",
      "educational qualifications", "academic qualifications",
      "skills", "technical skills", "core competencies", "key skills",
      "technologies", "tech stack", "expertise", "competencies",
      "projects", "academic projects", "professional projects",
      "certifications", "certificates", "courses", "training",
      "languages", "interests", "hobbies", "activities",
      "references", "publications", "achievements", "awards",
      "internship", "internships", "volunteer", "volunteering",
      "extracurricular", "extracurricular activities",
      "personal details", "personal information", "declaration",
      "additional information", "strengths", "hobbies & interests",
    ];
    
    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i].trim();
      if (raw.length > 60) continue;
      const cleaned = raw.toLowerCase().replace(/[^a-z0-9\s\/]/g, "").trim();
      const lineWords = cleaned.split(/\s+/).filter(w => w.length > 0).length;
      for (const h of ALL_SECTION_HEADINGS) {
        const headingWords = h.split(/\s+/).length;
        if (lineWords > headingWords + 2) continue;
        const headingRe = new RegExp("^" + h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ":?$", "i");
        if (headingRe.test(cleaned)) {
          console.log(`  ** SECTION HEADING at L${i}: "${raw}" → "${h}"`);
          break;
        }
      }
    }
  }
})().catch(e => console.error(e));
