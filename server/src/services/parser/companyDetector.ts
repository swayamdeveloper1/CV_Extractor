import {
  KNOWN_COMPANIES,
  COMPANY_REJECT_WORDS,
  COMPANY_SUFFIX_LOOKUP,
  COMPANY_PREFIX_LOOKUP,
  COMPANY_PATTERN_LOOKUP,
} from "../../data/company-data";

const COMPANY_REGEX = /\b([A-Z][A-Za-z&.,' -]{1,80})\s*(Ltd|Limited|Pvt|Private|LLP|Inc|Corporation|Corp|Company|Co\.?|Group|Solutions|Technologies|Engineering|Infra|Construction|Consultants|Consulting|Industries|Enterprises|Services|Systems|Infrastructure)\.?\b/i;

const COMPANY_INDICATORS_RE = /\b(ltd|limited|llp|pvt\s*ltd|private\s*limited|inc|corporation|corp|technologies|solutions|services|engineering|construction|infrastructure|group|consultants|builders|industries|enterprises|associates|ventures|holdings|developers|infra|contractors|consulting|consultancy|systems|software|tech|co\b|&)\b/i;

const ACTION_VERBS_RE = /\b(project|summary|responsible|manage|oversee|lead|develop|implement|create|design|prepare|review|coordinate|supervise|monitor|control|ensure|maintain|support|provide|assist|participate|report|conduct|perform|achieve|complete|deliver|execute|establish|improve|optimize|reduce|increase|handle|processing|handling|budget|evaluate|analyze|plan|organize|direct|administer|process|responsible for|key responsibilities|duties include|role includes)\b/i;

const EDUCATIONAL_RE = /\b(Diploma|Bachelor|BTech|B\.Tech|BE|B\.E|ME|M\.E|MTech|M\.Tech|Degree|BSc|MSc|MCA|BCA|PhD|BCom|MCom|BA|MA|BBA|MBA|PG\s*Diploma)\b/i;

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function lineHasCompanySignal(line: string): boolean {
  const hasEduc = EDUCATIONAL_RE.test(line);
  for (const s of COMPANY_SUFFIX_LOOKUP) {
    if (new RegExp("\\b" + escapeRe(s) + "\\b", "i").test(line)) {
      if (hasEduc && (s === "Engineering" || s === "Engineers")) continue;
      return true;
    }
  }
  for (const pat of COMPANY_PATTERN_LOOKUP) {
    if (line.toLowerCase().includes(pat.toLowerCase())) return true;
  }
  return false;
}

export function scoreCompany(line: string): number {
  if (!line) return -100;

  const text = line.replace(/^[•▪■◆►➤*-]+\s*/, "").trim();

  if (text.length < 2) return -100;
  if (text.length > 150) return -100;

  const lower = text.toLowerCase();
  let score = 0;

  if (/[.?!]$/.test(text)) score -= 40;
  if (text.includes("@")) score -= 50;
  if (/\d{6,}/.test(text)) score -= 50;

  if (COMPANY_REJECT_WORDS.some(w => lower.includes(w))) score -= 80;
  if (EDUCATIONAL_RE.test(text) && /\b(University|College|Institute|School|Polytechnic|Board|Academy)\b/i.test(text)) score -= 60;

  if (/^[•▪■◆►➤*-]/.test(line)) score -= 25;

  if (COMPANY_SUFFIX_LOOKUP.some(s =>
    new RegExp("\\b" + s + "\\b", "i").test(text)
  )) {
    score += 70;
  }

  if (KNOWN_COMPANIES.some(c => c.toLowerCase() === lower)) {
    score += 100;
  }

  const words = text.split(/\s+/);
  const titleWords = words.filter(w => /^[A-Z][A-Za-z&.'-]*$/.test(w)).length;
  score += titleWords * 5;

  const lowerWords = words.filter(w => /^[a-z]/.test(w)).length;
  score -= lowerWords * 8;

  if (words.length > 6) score -= 20;
  if (/[,;:]$/.test(text)) score -= 10;
  if (/\b(is|are|was|were|have|has|had|will|can|should)\b/i.test(text)) score -= 30;

  return score;
}

export function looksLikeCompany(line: string): boolean {
  return scoreCompany(line) >= 40;
}

export function cleanEmployerValue(employer: string): string {
  let e = employer;
  e = e.replace(/^[^a-zA-Z0-9]+/, "").trim();
  e = e.replace(/\d{2,4}[-/]\d{1,2}[-/]\d{1,2}\s*(?:TO\s*)?\d{2,4}[-/]\d{1,2}[-/]\d{1,2}/gi, "").trim();
  e = e.replace(/\s+\d{4}\s*[-–to]+\s*(?:present|current|till now|\d{4}).*?$/i, "").trim();
  e = e.replace(/\s*\([^)]*\d{4}[^)]*\)\s*$/, "").trim();
  e = e.replace(/[,\s][-–]\s*[A-Z][a-zA-Z\s]+$/, "").trim();
  e = e.replace(/,\s*[A-Z][a-zA-Z\s]+$/, "").trim();
  e = e.replace(/\([^)]*\)\s*$/, "").trim();
  e = e.replace(/\s+(?:recruit|through|via|for|from|under|based|located|outsourcing|contract)\s+[a-z].*$/i, "").trim();
  e = e.replace(/\s{2,}/g, " ").trim();
  return e || employer;
}

const ROLE_PATTERN_RE = /\b(engineer|developer|manager|analyst|intern|associate|consultant|lead|architect|director|specialist|officer|trainee|supervisor|executive|head|chief|president|vp|designer|programmer|scientist|researcher|lecturer|professor|instructor|trainer|accountant|technician|advisor|auditor|planner|operator|coordinator|administrator|hr|devops|scrum\s*master|owner|analytics|support|foreman|surveyor|estimator|draughtsman|modeller|scheduler|foreman|superintendent)\b/i;

export function cleanEmployerLine(line: string): string {
  const seps = [" at ", " @ ", " - ", " – ", " — ", " | ", " At ", " AT "];
  for (const sep of seps) {
    const idx = line.indexOf(sep);
    if (idx > 0) {
      const before = line.substring(0, idx).trim();
      const after = line.substring(idx + sep.length).trim();
      if (after && ROLE_PATTERN_RE.test(before) && !ROLE_PATTERN_RE.test(after)) return after;
      if (before && ROLE_PATTERN_RE.test(after) && !ROLE_PATTERN_RE.test(before)) return before;
    }
  }
  return line;
}

export function parseRoleAndCompany(text: string): { role: string; company: string } {
  const parts = text.split(/\s*[-–|,]\s*/).map(s => s.trim()).filter(Boolean);
  let role = "";
  let company = "";

  for (const part of parts) {
    if (/\b(engineer|developer|manager|analyst|intern|associate|consultant|lead|architect|director|specialist|officer|trainee|supervisor|executive|head|chief|president|vp|designer|programmer|scientist|researcher|lecturer|professor|instructor|trainer|accountant|technician|advisor|auditor|planner|operator|coordinator|administrator|hr|devops|scrum\s*master|owner|analytics|support|foreman|surveyor|estimator|draughtsman|modeller|scheduler|foreman|superintendent)\b/i.test(part)) {
      role = part;
    } else if (!company && looksLikeCompany(part)) {
      company = part;
    } else if (!role && !company) {
      if (part.length > 2 && /^[A-Z]/.test(part)) {
        role = part;
      }
    }
  }

  const atMatch = text.match(/^(.*?)\s+at\s+(\S[\w\s&.]+)$/i);
  if (atMatch && /\b(engineer|developer|manager|analyst|intern|associate|consultant|lead|architect|director|specialist|officer|trainee|supervisor|executive|head|chief|president|vp|designer|programmer|scientist|researcher|lecturer|professor|instructor|trainer|accountant|technician|advisor|auditor|planner|operator|coordinator|administrator|hr|devops|scrum\s*master|owner|analytics|support|foreman|surveyor|estimator|draughtsman|modeller|scheduler|foreman|superintendent)\b/i.test(atMatch[1]) && atMatch[2].length < 60) {
    role = atMatch[1];
    company = atMatch[2];
  }

  return { role, company };
}
