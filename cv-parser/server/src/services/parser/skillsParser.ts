import { SectionBoundary } from "./sectionDetector";
import { getSectionLines } from "./sectionDetector";

const KNOWN_SKILLS = [
  "javascript", "typescript", "python", "java", "c#", "c++", "c", "ruby", "php", "go", "rust", "swift", "kotlin",
  "react", "angular", "vue", "svelte", "next.js", "nuxt.js", "node.js", "express", "django", "flask", "spring",
  "spring boot", "asp.net", ".net", "jquery", "bootstrap", "tailwind", "sass", "less",
  "html", "css", "html5", "css3", "redux", "graphql", "rest", "rest api", "soap",
  "mysql", "postgresql", "mongodb", "oracle", "sql server", "sql", "redis", "elasticsearch", "firebase",
  "aws", "azure", "gcp", "google cloud", "docker", "kubernetes", "jenkins", "terraform", "ansible",
  "git", "github", "gitlab", "bitbucket", "svn", "jira", "confluence",
  "agile", "scrum", "kanban", "waterfall",
  "machine learning", "deep learning", "ai", "nlp", "computer vision", "tensorflow", "pytorch", "keras",
  "data science", "data analysis", "data engineering", "big data", "hadoop", "spark", "kafka",
  "testing", "unit testing", "jest", "mocha", "chai", "cypress", "selenium", "junit",
  "photoshop", "illustrator", "figma", "sketch", "adobe xd", "ui design", "ux design",
  "linux", "unix", "windows", "bash", "powershell", "shell",
  "salesforce", "sap", "oracle erp", "peoplesoft", "servicenow",
  "j2ee", "spring boot", "microservices",
  "autocad", "revit", "navisworks", "primavea", "ms project", "civil 3d", "staad pro", "etabs",
  "sap2000", "sketchup", "3ds max", "lumion", "v-ray", "bim 360", "procore",
  "primavera p6", "primavera",
  "quality control", "quality assurance", "safety management", "hse",
  "project planning", "scheduling", "cost control", "estimation", "billing",
  "quantity surveying", "contracts management", "procurement",
  "site supervision", "construction management", "structural analysis",
  "cad", "solidworks", "catia", "ansys", "matlab",
  "communication", "teamwork", "problem solving", "leadership", "analytical",
  "project management", "time management", "negotiation", "presentation",
  "ms office", "word", "excel", "powerpoint", "outlook",
  "english", "hindi", "gujarati", "marathi",
];

const SKILL_KEYWORDS_RE = /\b(?:java|c\+\+|c#|python|javascript|typescript|react|angular|vue|node|express|aws|azure|gcp|docker|kubernetes|sql|nosql|mongodb|redis|git|jenkins|agile|scrum|autocad|revit|primavea|civil 3d|staad|etabs|sap2000|sketchup|bim|procore|primavera|ms\s*project|project\s*management|quality\s*control|safety|hse|planning|scheduling|estimation|billing|quantity\s*surveying|cad|solidworks|catia|ansys|matlab|photoshop|illustrator|figma|sketch|linux|windows|bash|powershell|salesforce|sap|oracle|excel|word|powerpoint|outlook|english|hindi|communication|leadership|teamwork)\b/i;

export function extractSkills(text: string, boundaries: Map<string, SectionBoundary>): string[] {
  const skillLines = getSectionLines(text, boundaries, [
    "skills", "technical skills", "core competencies", "key skills",
    "technologies", "tech stack", "tool stack", "expertise",
    "competencies", "proficiencies",
  ]);
  const source = skillLines.length > 0 ? skillLines.join(" ") : text;

  const tokens = source
    .split(/[,;\n|•\-–()]/)
    .map(s => s.trim().toLowerCase().replace(/[^a-z0-9.#+\s]/g, "").trim())
    .filter(s => s.length > 1 && s.length < 50);

  const found: string[] = [];
  for (const skill of KNOWN_SKILLS) {
    if (tokens.some(t => t === skill || t.startsWith(skill + " ") || t.endsWith(" " + skill))) {
      found.push(skill);
    }
  }

  if (found.length < 5) {
    for (const token of tokens) {
      if (found.length >= 20) break;
      if (SKILL_KEYWORDS_RE.test(token) && !found.includes(token)) {
        found.push(token);
      }
    }
  }

  return [...new Set(found)].slice(0, 20);
}
