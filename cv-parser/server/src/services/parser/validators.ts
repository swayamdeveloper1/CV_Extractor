import { LOCATION_LOOKUP } from "../../data/location-data";
import { looksLikeCompany } from "./companyDetector";
export const NOISE_PATTERNS = /(email|phone|mobile|http|www\.|linkedin|github|skype|@|\.com|resume|cv|curriculum\s*vitae)/i;
export const SECTION_WORDS = /^(summary|experience|education|skills|projects|objective|profile|qualifications|certifications|achievements|references|declaration|interests|languages|training|internship|volunteer|page\s*\d+)$/i;
export const RESUME_BOILERPLATE = /^(resume|cv|curriculum\s*vitae|profile|professional\s*summary|career\s*summary|objective|career\s*objective|page\s*\d+|updated|confidential)$/i;

export const WORD_ROLE_KEYWORDS_RE = /\b(engineer|developer|manager|analyst|intern|associate|consultant|lead|architect|director|specialist|officer|trainee|supervisor|executive|head|chief|president|vp|designer|programmer|scientist|researcher|lecturer|professor|instructor|trainer|accountant|technician|advisor|auditor|planner|operator|coordinator|administrator|hr|devops|scrum\s*master|owner|analytics|support|foreman|surveyor|estimator|draughtsman|modeller|scheduler|foreman|superintendent)\b/i;

export const ALL_SECTION_HEADINGS = [
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

export function isNoise(s: string): boolean {
  return NOISE_PATTERNS.test(s) || s.length > 120 || s.length < 2;
}

export function isSectionHeadingLike(s: string): boolean {
  const cleaned = s.toLowerCase().replace(/[^a-z0-9\s\/]/g, "").trim();
  return ALL_SECTION_HEADINGS.some(h =>
    cleaned === h || cleaned === h + ":" ||
    cleaned.startsWith(h + " ") || cleaned.startsWith(h + ":")
  );
}

export function isSectionWord(s: string): boolean {
  return SECTION_WORDS.test(s.trim());
}

export function isResumeBoilerplate(s: string): boolean {
  return RESUME_BOILERPLATE.test(s.trim());
}

export function hasRoleKeyword(s: string): boolean {
  return WORD_ROLE_KEYWORDS_RE.test(s);
}

export function lineContainsDateOnly(line: string): boolean {
  if (/^\d{4}\s*[-–]/.test(line) && !WORD_ROLE_KEYWORDS_RE.test(line)) return true;
  if (/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(line) && !WORD_ROLE_KEYWORDS_RE.test(line)) return true;
  return false;
}

// const NAME_REGEX_STRICT = /^(Mr\.?|Mrs\.?|Ms\.?|Er\.?|Dr\.?|Prof\.?)?\s?[A-Z][a-zA-Z.'-]+(?:\s+[A-Z](?:[a-zA-Z.'-]+)?){1,4}$/;
// const NAME_REGEX_LENIENT = /^(Mr\.?|Mrs\.?|Ms\.?|Er\.?|Dr\.?|Prof\.?)?\s?[A-Z][a-zA-Z.'-]+(?:\s+[A-Za-z](?:[a-zA-Z.'-]+)?){1,4}$/;


const NAME_REGEX_STRICT =
  /^(Mr\.?|Mrs\.?|Ms\.?|Dr\.?|Er\.?|Prof\.?)?\s*([A-Za-z]+\.?)(\s+[A-Za-z]+\.?){1,4}$/;

const NAME_REGEX_LENIENT =
  /^(Mr\.?|Mrs\.?|Ms\.?|Dr\.?|Er\.?|Prof\.?)?\s*([A-Za-z]+\.?)(\s+[A-Za-z]+\.?){1,5}$/;
const NAME_EXCLUDE = /\b(engineer|developer|manager|analyst|experience|resume|curriculum|address|mobile|phone|email|date|dob|page|summary|objective|profile|skills|education|qualifications|projects|certifications|references|declaration|salary|expected|notice|total|years|months|intern|trainee|associate|supervisor|consultant|Sl\.?\s*No|good\s*communication|team\s*leader|description|objectives|qualification|certificate|knowledge|diploma|permanent|father|mother|contact|nationality|gender|marital|hobbies|languages|job\s*profile|role\s*responsibility|key\s*responsibilities|work\s*experience|unit\s*price|qty|amount|total|price|discount|invoice|order|excel|powerpoint|word|outlook|photoshop|autocad)\b/i;

function trySplitCamel(s: string): string[] {
  const results: string[] = [];
  if (s.length < 6 || s.length > 50) return results;
  const words = s.split(/\s+/);
  const splitWords = words.map(w => w.replace(/([a-z])([A-Z])/g, "$1 $2"));
  const joined = splitWords.join(" ");
  if (joined !== s && joined.split(/\s+/).length >= 2) results.push(joined);
  return results;
}

function trySplitCaps(s: string): string[] {
  const results: string[] = [];
  if (!/^[A-Z]{8,30}$/.test(s)) return results;
  for (let i = 3; i <= s.length - 3; i++) {
    const first = s.substring(0, i);
    const second = s.substring(i);
    if (first.length >= 3 && second.length >= 3) {
      const candidate = first + " " + second;
      if (NAME_REGEX_STRICT.test(candidate)) results.push(candidate);
    }
  }
  return results;
}

// export function cleanPersonName(s: string, strict?: boolean): string {
//   if (s.length < 3 || s.length > 50) return "";
//   const regex = strict ? NAME_REGEX_STRICT : NAME_REGEX_LENIENT;
//   if (/^[A-Z]{6,20}$/.test(s)) {
//     if (!NAME_EXCLUDE.test(s) && !/^\d/.test(s)) {
//       return s;
//     }
//   }
//   const candidates = [s, ...trySplitCamel(s), ...trySplitCaps(s)];
//   let best = "";
//   let bestSpaces = -1;
//   for (const c of candidates) {
//     if (!regex.test(c)) continue;
//     if (NAME_EXCLUDE.test(c)) continue;
//     if (/^\d/.test(c.replace(/^(Mr\.?|Mrs\.?|Ms\.?|Er\.?|Dr\.?|Prof\.?)\s*/i, ""))) continue;
//     const spaces = (c.match(/\s/g) || []).length;
//     if (spaces > bestSpaces) { best = c; bestSpaces = spaces; }
//   }
//   return best;
// }

export function cleanPersonName(s: string, strict?: boolean): string {
  s = s.trim();

  if (s.length < 3 || s.length > 50) return "";

  // Remove bullets and punctuation
  s = s.replace(/^[•►▪■◆★➤\-–]+\s*/, "").trim();

  // Remove common labels
  s = s.replace(
    /^(name|candidate name|applicant name|full name)\s*[:\-]?\s*/i,
    ""
  ).trim();

  const upper = s.toUpperCase();

  // Reject section headings
  const BAD_WORDS = [
    "OBJECTIVE",
    "OBJECTIVES",
    "PROFILE",
    "SUMMARY",
    "CAREER OBJECTIVE",
    "EXPERIENCE",
    "WORK EXPERIENCE",
    "EMPLOYMENT",
    "EDUCATION",
    "ACADEMIC",
    "ACADEMIC QUALIFICATION",
    "PROFESSIONAL QUALIFICATION",
    "QUALIFICATION",
    "SKILLS",
    "TECHNICAL SKILLS",
    "PROJECTS",
    "CERTIFICATION",
    "CERTIFICATIONS",
    "PERSONAL DETAILS",
    "DECLARATION",
    "HOBBIES",
    "LANGUAGES",
    "STRENGTH",
    "STRENGTHS",
    "RESPONSIBILITIES"
  ];

  if (BAD_WORDS.some(w => upper.includes(w)))
    return "";

  // Reject section-like text
  if (isSectionHeadingLike(s))
    return "";

  if (isSectionWord(s))
    return "";

  // if (looksLikeCompany(s))
  //   return "";

  // // Reject addresses
  // if (isLikelyAddress(s))
  //   return "";

  // // Reject job titles
  // if (WORD_ROLE_KEYWORDS_RE.test(s))
  //   return "";

  const regex = strict
    ? NAME_REGEX_STRICT
    : NAME_REGEX_LENIENT;

  const candidates = [
    s,
    ...trySplitCamel(s),
    ...trySplitCaps(s)
  ];

  let best = "";
  let bestSpaces = -1;

  for (const c of candidates) {

    if (!regex.test(c))
      continue;

    if (NAME_EXCLUDE.test(c))
      continue;

    if (/^\d/.test(c.replace(/^(Mr\.?|Mrs\.?|Ms\.?|Er\.?|Dr\.?|Prof\.?)\s*/i, "")))
      continue;

    const spaces = (c.match(/\s/g) || []).length;

    if (spaces > bestSpaces) {
      best = c;
      bestSpaces = spaces;
    }
  }

  return best.trim();
}

export function isValidPersonName(s: string): boolean {
  return cleanPersonName(s) !== "";
}

export function isStrictPersonName(s: string): boolean {
  return cleanPersonName(s, true) !== "";
}

export function isPersonName(name: string): boolean {
  if (!name) return false;
  const original = name;
  name = name.replace(/\s+/g, " ").replace(/[^A-Za-z.' -]/g, "").trim();
  if (name.length < 3) return false;
  if (/\b(email|phone|mobile|resume|cv|address|linkedin|github)\b/i.test(name)) return false;
  if (/\d{2,}/.test(original)) return false;
  if (/,\s*[A-Z]/.test(original)) return false;
  if (/\([A-Z]+\)/.test(original)) return false;
  const words = name.split(" ").filter(Boolean);
  if (words.length < 2 || words.length > 5) return false;
  const addrKeywords = /\b(road|rd|street|st|nagar|colony|society|layout|sector|phase|block|village|post|district|pincode|pin|flat|apt|apartment|house|plot|near|behind|zone|city|state|country|university|college|school|institute|ltd|limited|pvt|private|corporation|corp|engineering|construction|infrastructure|group|developers|builders|projects|enterprises|technologies|solutions|services)\b/i;
  if (addrKeywords.test(original)) return false;
  if (/[-–]/.test(original)) return false;
  if (/&\s*[A-Z]/.test(original)) return false;
  return words.every(w => /^[A-Z][a-zA-Z.'-]+$/.test(w));
}

const ADDRESS_KEYWORDS = /\b(road|rd|street|st|nagar|colony|society|layout|sector|phase|block|building|complex|plaza|tower|avenue|area|township|village|post|district|taluka|tehsil|pincode|pin\s*cod|zip|metro|mall|market|chowk|square|circle|extension|industrial|estate|floor|office|shop|house|flat|door|plot|landmark|lane|cross|gate|apartment|residency|bungalow|villa|residence|near|opposite|behind|beside|adjacent|phase|wing)\b/i;

const ADDRESS_STRONG_KEYWORDS = /\b(road|street|nagar|colony|society|layout|sector|phase|block|building|village|post|district|taluka|tehsil|pincode|flat|apartment|house|plot|near|opposite|behind|beside|villa|zone|city|state|pin|country)\b/i;

const ADDRESS_COUNTRY_RE = /\b(India|USA|UK|UAE|Australia|Canada|Germany|France|Japan|Singapore|Malaysia|Dubai|Qatar|Oman|Saudi\s*Arabia|United\s*Arab\s*Emirates|United\s*States|United\s*Kingdom|South\s*Africa|New\s*Zealand|Sri\s*Lanka|Bangladesh|Nepal|Pakistan)\b/i;

const CITY_STATE_RE = /\b[A-Z][a-zA-Z]+\s*(?:,\s*)?[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*\s+(?:India|Maharashtra|Gujarat|Tamil\s*Nadu|Karnataka|Kerala|Andhra\s*Pradesh|Telangana|Uttar\s*Pradesh|Rajasthan|Madhya\s*Pradesh|West\s*Bengal|Bihar|Odisha|Punjab|Haryana|Delhi|Goa)\b/i;

const ADDRESS_REJECT = /\b(responsibilities|project\s*description|work\s*location|office\s*address|company\s*address|project\s*location|job\s*description|key\s*responsibilities|roles\s*and\s*responsibilities|objective|profile|summary|career\s*objective|professional\s*summary|certifications|achievements|technical\s*skills|core\s*competencies|country\s*of\s*citizenship|place\s*of\s*issue|date\s*of\s*issue|passport|communication\s*address|residence\s*address)\b/i;

export function isAddressLine(s: string): boolean {
  if (/\d{3,}/.test(s) && /[A-Za-z]/.test(s) && (/,/.test(s) || /\b(road|street|nagar|colony|society|layout|sector|phase|block|apartment|flat|house|near|opposite)\b/i.test(s))) return true;
  if (/^\d+[/-]/.test(s) && /[A-Za-z]/.test(s)) return true;
  return false;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function isLikelyAddress(s: string): boolean {
  if (s.length < 8) return false;
  if (NOISE_PATTERNS.test(s)) return false;
  if (WORD_ROLE_KEYWORDS_RE.test(s)) return false;
  if (isPersonName(s)) return false;
  if (SECTION_WORDS.test(s)) return false;

  const lineContainsDateOnly = (line: string): boolean => {
    if (/^\d{4}\s*[-–]/.test(line) && !WORD_ROLE_KEYWORDS_RE.test(line)) return true;
    if (/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(line) && !WORD_ROLE_KEYWORDS_RE.test(line)) return true;
    return false;
  };

  if (lineContainsDateOnly(s)) return false;
  if (ADDRESS_REJECT.test(s)) return false;
  if (/^[•▪■◆►➤*\-✓✔☑✗✘→▪●○]/.test(s)) return false;

  const digits = s.match(/\d+/g);
  if (digits && digits.some(d => d.length >= 7)) return false;

  const hasPincode = /\b\d{6}\b/.test(s);
  const hasNumber = /\d/.test(s);
  const hasLetter = /[A-Za-z]/.test(s);
  const hasComma = /,/.test(s);
  const hasYear = /\b\d{4}\b/.test(s);
  const hasStrongKeyword = ADDRESS_STRONG_KEYWORDS.test(s);
  const hasCountry = ADDRESS_COUNTRY_RE.test(s);
  const hasKnownPlaceFlag = (() => {
    for (const place of LOCATION_LOOKUP) {
      if (new RegExp("\\b" + escapeRe(place) + "\\b", "i").test(s)) return true;
    }
    return false;
  })();

  if (hasPincode) return true;
  if (hasYear && !hasComma && !hasPincode) return false;

  let signalCount = 0;
  if (hasStrongKeyword) signalCount++;
  if (hasPincode) signalCount++;
  if (hasCountry || hasKnownPlaceFlag) signalCount++;
  if (hasNumber && hasLetter) signalCount++;
  if (hasComma && /\b[A-Z]/.test(s)) signalCount++;

  if (signalCount >= 2) return true;
  if (CITY_STATE_RE.test(s)) return true;
  return false;
}

export function extractLabel(lines: string[], labelPattern: string): string {
  const re = new RegExp("^\\s*(?:" + labelPattern + ")\\s*[:\\-]\\s*[-:]?\\s*(.+)", "i");
  for (const line of lines) {
    const m = line.match(re);
    if (m) return m[1].trim();
  }
  return "";
}

// export function extractLabelValue(text: string, labelPattern: string): string {
//   const re = new RegExp("^\\s*(?:" + labelPattern + ")\\s*[:\\-]\\s*[-:]?\\s*(.+)", "im");
//   const m = text.match(re);
//   return m ? m[1].trim() : "";
// }

export function extractLabelValue(text: string, labelPattern: string): string {
  const re = new RegExp(
    "\\b(?:" + labelPattern + ")\\b\\s*[:\\-]?\\s*(.{2,60})",
    "i"
  );

  const m = text.match(re);

  if (!m) return "";

  return m[1]
    .split(/\r?\n/)[0]
    .replace(/\b(email|phone|mobile|contact)\b.*$/i, "")
    .trim();
}
export function getLines(text: string): string[] {
  return text.split("\n").map(l => l.trim()).filter(Boolean);
}
