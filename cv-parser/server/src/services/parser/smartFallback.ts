import { Experience } from "../../types";
import { WORD_ROLE_KEYWORDS_RE, isPersonName, isLikelyAddress, isSectionHeadingLike, isSectionWord, NOISE_PATTERNS, cleanPersonName, isValidPersonName } from "./validators";
import { looksLikeCompany, cleanEmployerValue, scoreCompany } from "./companyDetector";

const DOB_DATE_PATTERNS = [
  /\b(0?[1-9]|[12][0-9]|3[01])[\/.-](0?[1-9]|1[0-2])[\/.-](19\d{2}|20\d{2})\b/,
  /\b(19\d{2}|20\d{2})-(0?[1-9]|1[0-2])-(0?[1-9]|[12][0-9]|3[01])\b/,
  /\b(0?[1-9]|[12][0-9]|3[01])\s+(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec),?\s+(19\d{2}|20\d{2})\b/i,
  /\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(0?[1-9]|[12][0-9]|3[01]),?\s+(19\d{2}|20\d{2})\b/i,
];

const EXP_YEARS_PATTERN = /(\d+)\s*(?:years?|yrs?)(?:\s+(?:and\s+)?(\d+)\s*(?:months?|mons?))?/i;

const PERSONAL_SECTION_KEYWORDS = /\b(personal details|personal information|personal|declaration|hobbies|interests|languages|strengths|about me)\b/i;

function extractYearFromDate(dateStr: string): number | null {
  const m = dateStr.match(/\b(19\d{2}|20\d{2})\b/);
  return m ? parseInt(m[1]) : null;
}

function fallbackDOB(text: string): string {
  const allLines = text.split("\n").map(l => l.trim()).filter(Boolean);

  for (const pattern of DOB_DATE_PATTERNS) {
    const matches = text.match(pattern);
    if (!matches) continue;

    for (const match of (text.match(new RegExp(pattern.source, "gi")) || [])) {
      const year = extractYearFromDate(match);
      if (!year) continue;
      if (year < 1950 || year > 2005) continue;

      const lineIdx = allLines.findIndex(l => l.includes(match));
      if (lineIdx >= 0) {
        const line = allLines[lineIdx];
        if (/\b(experience|project|work|employment|duration|from|to|present|current|job|role)\b/i.test(line) &&
            !PERSONAL_SECTION_KEYWORDS.test(line)) continue;
        const contextBefore = allLines.slice(Math.max(0, lineIdx - 3), lineIdx).join(" ");
        const contextAfter = allLines.slice(lineIdx + 1, lineIdx + 3).join(" ");
        const context = (contextBefore + " " + line + " " + contextAfter).toLowerCase();
        const hasAgeKeyword = /\b(age|born|dob|birth|year\s*old)\b/i.test(context);
        const hasDateLabel = /\b(date\s*of\s*birth|dob|birth\s*date|born)\b/i.test(context);
        if (hasDateLabel || hasAgeKeyword) return match;
      }

      if (year >= 1965 && year <= 2000) {
        const lineIdx = allLines.findIndex(l => l.includes(match));
        if (lineIdx < 0) continue;
        const line = allLines[lineIdx];
        if (line.length > 80) continue;
        if (/\b(experience|project|employment|duration|from|to|present|current|job|role|engineer|developer|manager|designation|employer|company|salary|worked|work|responsibilities|summary|objective|profile)\b/i.test(line)) continue;
        if (allLines.length > lineIdx + 1) {
          const nextLine = allLines[lineIdx + 1];
          if (/\b(experience|project|employment|present|current)\b/i.test(nextLine)) continue;
        }
        return match;
      }
    }
  }

  return "";
}

function fallbackTotalExperience(text: string): string {
  const allLines = text.split("\n").map(l => l.trim()).filter(Boolean);

  for (const line of allLines) {
    const m = line.match(EXP_YEARS_PATTERN);
    if (m) {
      const yearVal = parseInt(m[1]);
      if (yearVal >= 1 && yearVal <= 50) {
        const result = m[2] ? m[1] + "y " + m[2] + "m" : m[1] + "y";
        if (/\b(total experience|total exp|overall experience|years of experience|work experience|total|overall)\b/i.test(line)) {
          return result;
        }
      }
    }
  }

  for (const line of allLines) {
    const m = line.match(EXP_YEARS_PATTERN);
    if (m) {
      const yearVal = parseInt(m[1]);
      if (yearVal >= 1 && yearVal <= 50) {
        if (line.length < 60 && !/^[•\-–*\d]/.test(line) && !NOISE_PATTERNS.test(line)) {
          const result = m[2] ? m[1] + "y " + m[2] + "m" : m[1] + "y";
          return result;
        }
      }
    }
  }

  const totalMonths = computeTotalMonthsFromText(text);
  if (totalMonths > 0 && totalMonths < 600) {
    const y = Math.floor(totalMonths / 12);
    const m = totalMonths % 12;
    if (y > 0 && m > 0) return y + "y " + m + "m";
    if (y > 0) return y + "y";
    if (m > 0) return m + "m";
  }

  return "";
}

function computeTotalMonthsFromText(text: string): number {
  const dateRangeRe = /\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})\s*[-–to]+\s*((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}|Present|Current|Till Now)\b/gi;
  let total = 0;
  let match: RegExpExecArray | null;

  while ((match = dateRangeRe.exec(text)) !== null) {
    const startStr = match[1];
    const endStr = match[2];
    const start = new Date(startStr);
    if (isNaN(start.getTime())) continue;
    const end = /present|current|till now/i.test(endStr) ? new Date() : new Date(endStr);
    if (isNaN(end.getTime())) continue;
    if (end <= start) continue;
    const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    if (months > 0 && months < 240) total += months;
  }

  return total;
}

function fallbackDesignation(contactLines: string[], text: string): string {
  const allLines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const headerArea = [
    ...contactLines,
    ...allLines.slice(0, 30)
  ].filter((v, i, a) => a.indexOf(v) === i);

  for (const line of headerArea) {
    if (line.length > 120 || line.length < 5) continue;
    if (isPersonName(line)) continue;
    if (isLikelyAddress(line)) continue;
    if (isSectionHeadingLike(line)) continue;
    if (isSectionWord(line)) continue;
    if (looksLikeCompany(line)) continue;
    if (NOISE_PATTERNS.test(line)) continue;
    if (/\b(responsibilities|duties|summary|objective|profile|education|skills|projects|certifications|references|declaration|hobbies|interests|languages|personal|knowledge|proficient|experience\s*:)\b/i.test(line)) continue;

    if (WORD_ROLE_KEYWORDS_RE.test(line)) {
      return line;
    }
  }

  for (const line of headerArea) {
    if (line.length > 120 || line.length < 5) continue;
    if (isPersonName(line)) continue;
    if (isLikelyAddress(line)) continue;
    if (isSectionHeadingLike(line)) continue;
    if (NOISE_PATTERNS.test(line)) continue;
    if (/\b(responsibilities|duties|summary|objective|profile|education|skills|projects|certifications|references|declaration|hobbies|interests|languages|personal|knowledge|proficient)\b/i.test(line)) continue;

    const roleWords = ["engineer", "developer", "manager", "analyst", "consultant", "specialist", "supervisor", "coordinator", "administrator", "assistant", "executive", "officer", "associate", "lead", "head", "chief", "director", "architect", "designer", "programmer", "scientist", "researcher", "lecturer", "professor", "instructor", "trainer", "technician", "advisor", "auditor", "planner", "operator", "trainee", "intern", "foreman", "surveyor", "estimator", "draughtsman", "modeller", "scheduler", "superintendent"];

    for (const rw of roleWords) {
      if (new RegExp("\\b" + rw + "\\b", "i").test(line)) {
        return line;
      }
    }
  }

  return "";
}

function fallbackEmployer(text: string, contactLines: string[]): string {
  const allLines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const seen = new Set<string>();

  const contactArea = [
    ...contactLines,
    ...allLines.slice(0, 20)
  ].filter((v, i, a) => a.indexOf(v) === i);

  for (const line of contactArea) {
    if (line.length < 3 || line.length > 120) continue;
    if (NOISE_PATTERNS.test(line)) continue;
    if (WORD_ROLE_KEYWORDS_RE.test(line) && line.length < 40) continue;
    if (isPersonName(line)) continue;
    if (isLikelyAddress(line)) continue;

    if (looksLikeCompany(line)) {
      const cv = cleanEmployerValue(line);
      if (cv.length >= 2 && !seen.has(cv)) {
        seen.add(cv);
        if (scoreCompany(cv) >= 40) return cv;
      }
    }
  }

  for (const line of allLines.slice(0, 60)) {
    if (line.length < 3 || line.length > 120) continue;
    if (NOISE_PATTERNS.test(line)) continue;
    if (WORD_ROLE_KEYWORDS_RE.test(line)) continue;
    if (isPersonName(line)) continue;
    if (isLikelyAddress(line)) continue;
    if (/\b(responsibilities|duties|project|summary|objective|profile|education|skills|personal|declaration|hobbies|interests|languages|reference)\b/i.test(line)) continue;

    if (looksLikeCompany(line) && !line.includes("@")) {
      const cv = cleanEmployerValue(line);
      if (cv.length >= 2 && !seen.has(cv)) {
        seen.add(cv);
        if (scoreCompany(cv) >= 40) return cv;
      }
    }
  }

  return "";
}

const FALLBACK_EMAIL_RE = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/i;
const LABELED_EMAIL_RE = /\b(?:email|e-mail|email id|email address)\s*[:.\-]?\s*([\w.+-]+@[\w-]+(?:\.[\w-]+)+)/i;
const LABELED_PHONE_RE = /\b(?:phone|mobile|contact|tel|cell|telephone|phone no|mobile no|contact no|telephone no)\s*[:.\-]?\s*([+]?\d[\d\s().-]{6,15})/i;
const PHONE_DIGITS_RE = /(?:^|\s)([+]?\d[\d\s().-]{7,15})(?:\s|$)/g;
const EMAIL_LABEL_LINE = /\b(email|e-mail)\b\s*[:.\-]/i;
const PHONE_LABEL_LINE = /\b(phone|mobile|contact|tel)\b\s*[:.\-]/i;
const NAME_EXCLUDE_FB = /\b(engineer|developer|manager|analyst|experience|resume|curriculum|address|mobile|phone|email|date|dob|page|summary|objective|profile|skills|education|qualifications|projects|certifications|references|declaration|salary|expected|notice|total|years|months|intern|trainee|associate|supervisor|consultant|description|qualification|certificate|knowledge|diploma|permanent|father|mother|contact|nationality|gender|marital|hobbies|languages|job\s*profile|role\s*responsibility|key\s*responsibilities|work\s*experience)\b/i;
const NAME_SEPARATOR_RE = /\s*[,;:|•▪►➤‣⁃–—¦/\\]\s*/;

function extractCleanSegments(line: string): string[] {
  return line.split(NAME_SEPARATOR_RE).map(s => s.trim()).filter(s => s.length >= 2);
}

function extractFirstSegment(line: string): string {
  return line.split(/[,;:|•▪►➤‣⁃–—¦/\\]/)[0].replace(/[^a-zA-Z.'\s-]/g, "").trim();
}

function isSimpleName(s: string): boolean {
  if (s.length < 3 || s.length > 50) return false;
  if (/\d/.test(s)) return false;
  if (/@/.test(s)) return false;
  if (NAME_EXCLUDE_FB.test(s)) return false;
  if (isSectionHeadingLike(s)) return false;
  if (isSectionWord(s)) return false;
  if (looksLikeCompany(s)) return false;
  if (isLikelyAddress(s)) return false;
  if (WORD_ROLE_KEYWORDS_RE.test(s)) return false;
  const words = s.split(/\s+/).filter(Boolean);
  if (words.length < 2 || words.length > 5) return false;
  if (words.some(w => w.length > 30)) return false;
  const everyWordValid = words.every(w => /^[A-Za-z][a-zA-Z.'-]{0,29}$/.test(w));
  if (!everyWordValid) return false;
  return true;
}

function fallbackName(contactLines: string[], text: string): string {
  const allLines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const headerLines = [
    ...contactLines,
    ...allLines.slice(0, 30)
  ].filter((v, i, a) => a.indexOf(v) === i);

  for (const line of headerLines) {
    const cleaned = cleanPersonName(line, false);
    if (cleaned && !looksLikeCompany(cleaned) && !WORD_ROLE_KEYWORDS_RE.test(cleaned)) {
      return cleaned;
    }
  }

  for (const line of headerLines) {
    for (const seg of extractCleanSegments(line)) {
      const cleaned = cleanPersonName(seg, false);
      if (cleaned) return cleaned;
    }
  }

  for (const line of headerLines) {
    const cleaned = line.replace(/\b(?:email|e-mail|phone|mobile|contact|tel|phone no|mobile no|designation|position|role|title|address|location|city|employer|company|skills|education|qualification|experience)\s*[:.\-]?\s*[\w.+-@\d\s().,-]+/gi, "").replace(/\s{2,}/g, " ").trim();
    if (cleaned && cleaned !== line && cleaned.length >= 3 && cleaned.length <= 60) {
      for (const seg of extractCleanSegments(cleaned)) {
        const nameCleaned = cleanPersonName(seg, false);
        if (nameCleaned) return nameCleaned;
      }
    }
  }

  for (const line of headerLines) {
    const nameMatch = line.match(/^(?:name|candidate name|applicant name|full name)\s*[:.\-]?\s*(.+)/i);
    if (nameMatch) {
      const val = nameMatch[1].trim();
      for (const seg of extractCleanSegments(val)) {
        const cleaned = cleanPersonName(seg, false);
        if (cleaned) return cleaned;
      }
    }
  }

  for (const line of headerLines) {
    const first = extractFirstSegment(line);
    if (first && first.length >= 3) {
      const cleaned = cleanPersonName(first, false);
      if (cleaned) return cleaned;
    }
  }

  for (const line of allLines.slice(0, 30)) {
    for (const seg of extractCleanSegments(line)) {
      if (seg.length >= 3 && isSimpleName(seg) && !looksLikeCompany(seg)) return seg;
    }
  }

  for (const line of allLines.slice(0, 30)) {
    const first = extractFirstSegment(line);
    if (first && first.length >= 3 && isSimpleName(first) && !looksLikeCompany(first)) return first;
  }

  return "";
}

function fallbackEmail(text: string): string {
  const allLines = text.split("\n").map(l => l.trim()).filter(Boolean);

  for (const line of allLines) {
    const m = line.match(LABELED_EMAIL_RE);
    if (m) return m[1].toLowerCase();
  }

  for (let i = 0; i < allLines.length; i++) {
    if (EMAIL_LABEL_LINE.test(allLines[i]) && i + 1 < allLines.length) {
      const nextLine = allLines[i + 1];
      const m = nextLine.match(FALLBACK_EMAIL_RE);
      if (m) return m[0].toLowerCase();
    }
  }

  for (const line of allLines) {
    const segments = line.split(/[\s,;:|•▪►➤]+/);
    for (const seg of segments) {
      const cleaned = seg.replace(/^[^a-zA-Z0-9]+/, "").replace(/[^a-zA-Z0-9.@_-]+$/, "");
      const m = cleaned.match(FALLBACK_EMAIL_RE);
      if (m && m[0].length === cleaned.length) return cleaned.toLowerCase();
    }
  }

  for (const line of allLines) {
    const m = line.match(FALLBACK_EMAIL_RE);
    if (m) {
      const cleaned = m[0].replace(/^[^a-zA-Z0-9]+/, "").toLowerCase();
      return cleaned;
    }
  }

  const normalized = text.replace(/\s+/g, " ").replace(/\s*@\s*/g, "@").replace(/\s*\.\s*/g, ".");
  const m = normalized.match(FALLBACK_EMAIL_RE);
  if (m) return m[0].toLowerCase();

  const atPos = normalized.indexOf("@");
  if (atPos > 0 && atPos < normalized.length - 4) {
    const start = Math.max(0, normalized.lastIndexOf(" ", atPos - 1));
    const end = normalized.indexOf(" ", atPos + 4);
    const cand = normalized.slice(start, end > 0 ? end : undefined).trim();
    const cm = cand.match(FALLBACK_EMAIL_RE);
    if (cm) return cm[0].toLowerCase();
  }

  return "";
}

function fallbackPhone(text: string): string {
  const allLines = text.split("\n").map(l => l.trim()).filter(Boolean);

  for (const line of allLines) {
    const m = line.match(LABELED_PHONE_RE);
    if (m) return normalizePhone(m[1]);
  }

  for (let i = 0; i < allLines.length; i++) {
    if (PHONE_LABEL_LINE.test(allLines[i]) && i + 1 < allLines.length) {
      const result = normalizePhone(allLines[i + 1]);
      if (result) return result;
    }
  }

  const noEmails = text.replace(/[\w.+-]+@[\w.-]+\.\w{2,}/gi, "");
  let match: RegExpExecArray | null;
  const candidates: Array<{ digits: string; raw: string }> = [];
  while ((match = PHONE_DIGITS_RE.exec(noEmails)) !== null) {
    const phone = match[1].trim();
    if (/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(phone)) continue;
    const digits = phone.replace(/[^\d+]/g, "");
    const rawDigits = digits.replace(/\D/g, "");
    if (rawDigits.length >= 10 && rawDigits.length <= 15 && !/^(\d)\1{7,}$/.test(rawDigits)) {
      candidates.push({ digits, raw: rawDigits });
    }
  }

  candidates.sort((a, b) => {
    const aIsIndian = /^[6-9]\d{9}$/.test(a.raw) ? 1 : 0;
    const bIsIndian = /^[6-9]\d{9}$/.test(b.raw) ? 1 : 0;
    if (aIsIndian !== bIsIndian) return bIsIndian - aIsIndian;
    return b.raw.length - a.raw.length;
  });

  for (const c of candidates) {
    const result = normalizePhone(c.digits);
    if (result) return result;
  }

  const allDigits = noEmails.replace(/[^\d]/g, "");
  if (allDigits.length >= 10) {
    for (let i = 0; i <= allDigits.length - 10; i++) {
      const seq = allDigits.slice(i, i + 10);
      if (/^[6-9]/.test(seq) && !/^(\d)\1{9}$/.test(seq)) return seq;
    }
    for (let i = 0; i <= allDigits.length - 10; i++) {
      const seq = allDigits.slice(i, i + 10);
      if (!/^(\d)\1{9}$/.test(seq)) return seq;
    }
  }

  return "";
}

function normalizePhone(s: string): string {
  s = s.trim();
  const digits = s.replace(/[^\d+]/g, "");
  const rawDigits = digits.replace(/\D/g, "");
  if (rawDigits.length < 10 || rawDigits.length > 15) return "";
  if (/^(\d)\1{7,}$/.test(rawDigits)) return "";
  if (/^[6-9]\d{9}$/.test(rawDigits)) return rawDigits;
  if (/^91[6-9]\d{9}$/.test(digits)) return "+" + digits;
  if (/^\+\d{11,13}$/.test(digits)) return digits;
  if (rawDigits.length === 10) return rawDigits;
  return "";
}

const EXTRA_ROLE_WORDS = /\b(engineer|developer|manager|analyst|intern|associate|consultant|lead|architect|director|specialist|officer|trainee|supervisor|executive|head|chief|president|vp|designer|programmer|scientist|researcher|lecturer|professor|instructor|trainer|accountant|technician|advisor|auditor|planner|operator|coordinator|administrator|hr|devops|scrum\s*master|owner|analytics|support|foreman|surveyor|estimator|draughtsman|modeller|scheduler|foreman|superintendent|developer\s*i|project\s*engineer|site\s*engineer|civil\s*engineer|mechanical\s*engineer|electrical\s*engineer|software\s*engineer|senior\s*engineer|junior\s*engineer|assistant\s*engineer|executive\s*engineer|maintenance\s*engineer|production\s*engineer|planning\s*engineer|structural\s*engineer|design\s*engineer|quality\s*engineer|field\s*engineer|safety\s*engineer|project\s*manager|construction\s*manager|plant\s*manager|site\s*manager|general\s*manager|senior\s*manager|area\s*manager|operation\s*manager|branch\s*manager|shift\s*engineer|section\s*engineer|graduate\s*engineer|trainee\s*engineer|apprentice\s*engineer|service\s*engineer|system\s*engineer|network\s*engineer)\b/i;
const BROADER_ROLE_WORDS = /\b(engineer|developer|manager|analyst|consultant|specialist|supervisor|coordinator|administrator|assistant|executive|officer|associate|lead|head|chief|director|architect|designer|programmer|scientist|researcher|lecturer|professor|instructor|trainer|technician|advisor|auditor|planner|operator|foreman|surveyor|estimator|scheduler|trainee|intern|superintendent)\b/i;
const ROLE_REJECT_WORDS = /\b(responsibilities|duties|summary|objective|profile|education|skills|projects|certifications|references|declaration|hobbies|interests|languages|personal|knowledge|proficient|experience\s*:)\b/i;
const ROLE_SECTION_WORDS = /\b(summary|objective|profile|education|skills|projects|certifications|references|declaration|hobbies|languages|personal)\b/i;

function cleanDesignation(s: string): string {
  let result = s;
  result = result.replace(/\s+at\s+.*$/i, "").trim();
  result = result.replace(/\s*@\s*.*$/i, "").trim();
  result = result.replace(/[,;|•▪►➤–—].*$/, "").trim();
  result = result.replace(/\s+(ltd|limited|pvt|private|inc|corp|corporation|technologies|solutions|services|engineering|construction|infrastructure|group|industries|enterprises|consultants|associates)\b.*$/i, "").trim();
  result = result.replace(/\s+\(\s*\d{4}\s*[-–].*$/i, "").trim();
  result = result.replace(/\b(responsibilities|duties|summary|objective|profile|education|skills|projects|declaration|languages|interests|hobbies)\b.*$/i, "").trim();
  result = result.replace(/\s{2,}/g, " ").trim();
  return result;
}

function extractRolePart(s: string): string {
  const { DESIGNATION_LOOKUP } = require("../../data/role-data");
  for (const title of DESIGNATION_LOOKUP) {
    const re = new RegExp("\\b" + escapeRe(title) + "\\b", "i");
    if (re.test(s)) return title;
  }

  const roleMatch = s.match(/((?:(?:Senior|Junior|Lead|Principal|Chief|Head|Executive|Assistant|Associate|Junior|Senior|Executive|Trainee|Graduate|Shift|Section|Project|Site|Civil|Mechanical|Electrical|Software|Network|System|Safety|Quality|Design|Planning|Production|Maintenance|Construction|Operation|Branch|Area|General|Plant|Field|Service|Apprentice|Graduate)\s+)?(?:Engineer|Developer|Manager|Analyst|Consultant|Specialist|Supervisor|Coordinator|Administrator|Executive|Officer|Associate|Lead|Head|Chief|Director|Architect|Designer|Programmer|Scientist|Researcher|Lecturer|Professor|Instructor|Trainer|Technician|Advisor|Auditor|Planner|Operator|Foreman|Surveyor|Estimator|Scheduler|Superintendent|Trainee|Intern|DevOps|Support|Accountant))/i);
  if (roleMatch) return roleMatch[1];
  return cleanDesignation(s);
}

function improvedFallbackDesignation(contactLines: string[], text: string): string {
  const allLines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const headerArea = [
    ...contactLines,
    ...allLines.slice(0, 50)
  ].filter((v, i, a) => a.indexOf(v) === i);

  const allSegments: string[] = [];
  for (const line of headerArea) {
    allSegments.push(...extractCleanSegments(line));
  }
  const uniqueSegments = [...new Set(allSegments)];

  function isDesignationLine(s: string): boolean {
    if (s.length > 150 || s.length < 4) return false;
    if (isLikelyAddress(s)) return false;
    if (isSectionHeadingLike(s)) return false;
    if (isSectionWord(s)) return false;
    if (NOISE_PATTERNS.test(s)) return false;
    if (s.includes("@")) return false;
    return true;
  }

  for (const item of [...headerArea, ...uniqueSegments]) {
    if (!isDesignationLine(item)) continue;
    if (ROLE_REJECT_WORDS.test(item)) continue;
    if (EXTRA_ROLE_WORDS.test(item)) {
      const cleaned = cleanDesignation(item);
      if (cleaned) return extractRolePart(cleaned);
    }
  }

  for (const item of [...headerArea, ...uniqueSegments]) {
    if (!isDesignationLine(item)) continue;
    if (ROLE_SECTION_WORDS.test(item)) continue;
    if (BROADER_ROLE_WORDS.test(item) && !looksLikeCompany(item)) {
      const cleaned = cleanDesignation(item);
      if (cleaned) return extractRolePart(cleaned);
    }
  }

  for (const item of [...headerArea, ...uniqueSegments]) {
    if (!isDesignationLine(item)) continue;
    if (ROLE_REJECT_WORDS.test(item)) continue;
    const cleanedLabel = item.replace(/^(?:designation|current designation|position|current position|role|title|job title|job role)\s*[:.\-]?\s*/i, "").trim();
    if (cleanedLabel !== item && EXTRA_ROLE_WORDS.test(cleanedLabel)) {
      const cleaned = cleanDesignation(cleanedLabel);
      if (cleaned) return extractRolePart(cleaned);
    }
  }

  for (const item of [...headerArea, ...uniqueSegments]) {
    if (!isDesignationLine(item)) continue;
    if (BROADER_ROLE_WORDS.test(item)) {
      const cleaned = cleanDesignation(item);
      if (cleaned) return extractRolePart(cleaned);
    }
  }

  return "";
}

const WORKING_SINCE_DATE_RE = /\b(\d{4})\s*[-–to]+\s*(?:\d{4}|present|current|till now)\b/i;
const WORKING_SINCE_MONTH_RE = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})\s*[-–to]+\s*(?:\d{4}|present|current|till now)\b/i;
const QUALIFICATION_BROAD_RE = /\b(bachelor|master|phd|doctorate|b\.?\s*[ae]|m\.?\s*[ae]|b\.?\s*sc|m\.?\s*sc|b\.?\s*tech|m\.?\s*tech|bba|mba|bca|mca|b\.?\s*com|m\.?\s*com|b\.?\s*a|m\.?\s*a|diploma|ph\.?\s*d|it\s*i|10th|12th|s\.?\s*s\.?\s*c|h\.?\s*s\.?\s*c|graduate|post\s*graduate|bachelor's|master's)\b/i;
const ADDRESS_LABEL_RE = /\b(address|current address|permanent address|residence|residential address|communication address|present address|local address|mailing address)\s*[:.\-]?\s*([a-z0-9].*)/i;

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasKnownPlace(text: string): boolean {
  const { LOCATION_LOOKUP } = require("../../data/location-data");
  for (const place of LOCATION_LOOKUP) {
    if (new RegExp("\\b" + escapeRe(place) + "\\b", "i").test(text)) return true;
  }
  const COUNTRIES = ["India","USA","UK","United Arab Emirates","UAE","Australia","Canada","Germany","France","Japan","Singapore","Malaysia","Dubai","Qatar","Oman","Saudi Arabia","Bangladesh","Nepal","Sri Lanka","Pakistan","United States","United Kingdom","South Africa","New Zealand"];
  for (const country of COUNTRIES) {
    if (new RegExp("\\b" + escapeRe(country) + "\\b", "i").test(text)) return true;
  }
  return false;
}

function findLocationInText(text: string): string {
  const { LOCATION_LOOKUP } = require("../../data/location-data");
  for (const place of LOCATION_LOOKUP) {
    const re = new RegExp("\\b" + escapeRe(place) + "\\b", "i");
    if (re.test(text)) return place;
  }
  return "";
}

function fallbackWorkingSince(text: string): string {
  const allLines = text.split("\n").map(l => l.trim()).filter(Boolean);

  for (const line of allLines) {
    if (/\b(education|skills|projects|certifications|objective|summary|declaration|personal)\b/i.test(line)) continue;
    const m = line.match(WORKING_SINCE_MONTH_RE);
    if (m) {
      const year = parseInt(m[2]);
      if (year > 1980 && year <= new Date().getFullYear()) return m[1] + " " + m[2];
    }
  }

  for (const line of allLines) {
    if (/\b(education|skills|projects|certifications|objective|summary|declaration|personal)\b/i.test(line)) continue;
    const m = line.match(WORKING_SINCE_DATE_RE);
    if (m) {
      const year = parseInt(m[1]);
      if (year > 1980 && year <= new Date().getFullYear()) return m[1];
    }
  }

  const dateRanges = text.match(/\b(\d{4})\s*[-–to]+\s*(present|current|till now|\d{4})\b/gi);
  if (dateRanges && dateRanges.length > 0) {
    let earliestYear = Infinity;
    let earliestStr = "";
    for (const dr of dateRanges) {
      const y = dr.match(/(\d{4})/);
      if (y) {
        const year = parseInt(y[1]);
        if (year > 1980 && year < earliestYear) {
          earliestYear = year;
          earliestStr = y[1];
        }
      }
    }
    if (earliestStr) return earliestStr;
  }

  const allYears = text.match(/\b(19[89]\d|20[0-2]\d)\b/g);
  if (allYears && allYears.length > 0) {
    const uniqueYears = [...new Set(allYears.map(y => parseInt(y)))].sort((a, b) => a - b);
    if (uniqueYears.length >= 2) {
      const earliest = uniqueYears[0];
      if (earliest > 1980 && earliest <= new Date().getFullYear()) return String(earliest);
    }
  }

  return "";
}

function fallbackAddress(text: string, contactLines: string[]): string {
  const allLines = text.split("\n").map(l => l.trim()).filter(Boolean);

  for (const line of allLines) {
    const m = line.match(ADDRESS_LABEL_RE);
    if (m) {
      const addr = m[2].trim();
      if (addr.length > 5 && hasKnownPlace(addr)) {
        const cityMatch = findLocationInText(addr);
        if (cityMatch) return cityMatch;
        return addr;
      }
    }
  }

  const src = contactLines.length > 0 ? contactLines : allLines.slice(0, 30);
  for (const line of src) {
    if (line.length < 8) continue;
    if (/\b(email|phone|mobile|http|www\.|linkedin|github|@|\.com)/i.test(line)) continue;
    if (hasKnownPlace(line) && isLikelyAddress(line)) {
      const cityMatch = findLocationInText(line);
      if (cityMatch) return cityMatch;
      return line;
    }
  }

  for (const line of src) {
    if (line.length < 8) continue;
    if (hasKnownPlace(line) && /\d/.test(line) && /[A-Za-z]/.test(line) && !/\b(responsibilities|duties|summary|objective|profile|education|skills|projects|certifications|references|declaration|hobbies|interests|languages|personal|knowledge|proficient)\b/i.test(line)) {
      const cityMatch = findLocationInText(line);
      if (cityMatch) return cityMatch;
    }
  }

  for (const line of allLines.slice(0, 40)) {
    if (line.length < 8) continue;
    if (hasKnownPlace(line) && isLikelyAddress(line)) {
      const cityMatch = findLocationInText(line);
      if (cityMatch) return cityMatch;
    }
  }

  return "";
}

function fallbackLocation(text: string): string {
  const located = findLocationInText(text);
  if (located) return located;

  const CITY_STATE_PATTERN = /\b[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*\s*,\s*[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*\b/;
  const m = text.match(CITY_STATE_PATTERN);
  if (m) {
    const parts = m[0].split(",").map(s => s.trim());
    if (parts.length >= 1) {
      const cityCheck = findLocationInText(parts[0]);
      if (cityCheck) return cityCheck;
      return parts[0];
    }
  }

  const simpleCityRe = /\b(Mumbai|Delhi|Bengaluru|Bangalore|Hyderabad|Chennai|Madras|Kolkata|Calcutta|Pune|Ahmedabad|Jaipur|Lucknow|Kanpur|Nagpur|Indore|Bhopal|Surat|Patna|Vadodara|Ghaziabad|Ludhiana|Agra|Nashik|Faridabad|Meerut|Rajkot|Varanasi|Srinagar|Aurangabad|Dhanbad|Amritsar|Ranchi|Coimbatore|Jabalpur|Gwalior|Vijayawada|Jodhpur|Madurai|Raipur|Kota|Guwahati|Chandigarh|Mysuru|Gurugram|Noida|Dehradun|Kochi|Mangalore|Belgaum|Thiruvananthapuram|Trivandrum|Visakhapatnam|Vizag|Bhubaneswar|Bhavnagar|Jamnagar|Udaipur|Kolhapur|Amravati|Nanded|Sangli|Solapur|Nashik|Thane|Navi Mumbai|Vasai|Virar|Panvel|Kalyan|Dombivli|Ulhasnagar|Bhiwandi|Malegaon|Jalgaon|Akola|Dhule|Ahmednagar|Chandrapur|Parbhani|Latur|Osmanabad|Beed|Nandurbar|Hingoli|Washim|Buldhana|Gondia|Bhandara|Gadchiroli|Wardha|Yavatmal|Ratnagiri|Sindhudurg|Satara|Sangli|Kolhapur|Pimpri|Chinchwad)\b/i;
  const cityMatch = text.match(simpleCityRe);
  if (cityMatch) return cityMatch[1];

  return "";
}

function cleanDegree(s: string): string {
  let result = s;
  result = result.replace(/\[?\d{4}[-–]\d{4}\]?/g, "").trim();
  result = result.replace(/\d{4}\s*[-–]\s*\d{4}/g, "").trim();
  result = result.replace(/\b\d{4}\b/g, "").trim();
  result = result.replace(/\d{1,2}\s*[\/\-]\s*\d{1,2}\s*[\/\-]\s*\d{2,4}/g, "").trim();
  result = result.replace(/\d{1,3}%\s*[-–]?\s*(\d{1,3}%)?/g, "").trim();
  result = result.replace(/CGPA[\s:]?\d+\.?\d*/gi, "").trim();
  result = result.replace(/[/,;|•▪►➤–—]/g, " ").trim();
  result = result.replace(/\s+(from|at|of|in|university|college|institute|school|academy|polytechnic|board)\s+.*$/i, " ").trim();
  result = result.replace(/\s{2,}/g, " ").trim();
  return result;
}

function extractDegreePart(s: string): string {
  const { DEGREE_LOOKUP } = require("../../data/role-data");
  const sortedDegrees = [...DEGREE_LOOKUP].sort((a, b) => b.length - a.length);
  for (const degree of sortedDegrees) {
    const re = new RegExp("\\b" + escapeRe(degree) + "\\b", "i");
    if (re.test(s)) return degree;
  }

  const broadMatch = s.match(QUALIFICATION_BROAD_RE);
  if (broadMatch && broadMatch[0].length > 2) return broadMatch[0].replace(/\s+/g, " ").trim();

  const degreeWords = /\b(Bachelor|Master|Diploma|Graduate|Post Graduate|Ph\.?D|Doctorate|ITI|B\.?[AE]|M\.?[AE]|B\.?[Ss][Cc]|M\.?[Ss][Cc]|B\.?[Tt]ech|M\.?[Tt]ech|BBA|MBA|BCA|MCA|B\.?[Cc]om|M\.?[Cc]om|B\.?A|M\.?A|10th|12th|S\.?S\.?C|H\.?S\.?C)\b/i;
  const match = s.match(degreeWords);
  if (match) return match[1];

  return "";
}

function fallbackQualification(text: string): string {
  const { DEGREE_LOOKUP } = require("../../data/role-data");
  for (const degree of DEGREE_LOOKUP) {
    const re = new RegExp("\\b" + escapeRe(degree) + "\\b", "i");
    if (re.test(text)) return degree;
  }

  const allLines = text.split("\n").map(l => l.trim()).filter(Boolean);
  for (const line of allLines) {
    if (QUALIFICATION_BROAD_RE.test(line) && line.length < 120) {
      const cleaned = cleanDegree(line);
      const extracted = extractDegreePart(cleaned);
      if (extracted && extracted.length >= 2) return extracted;
    }
  }

  for (const line of allLines.slice(0, 60)) {
    if (line.length > 120 || line.length < 3) continue;
    if (/\b(engineer|developer|manager|analyst|experience|responsibilities|duties|summary|objective|profile|skills|projects|certifications|references|declaration|hobbies|interests|languages|personal|knowledge|proficient)\b/i.test(line)) continue;
    const cleaned = cleanDegree(line);
    const extracted = extractDegreePart(cleaned);
    if (extracted && extracted.length >= 2) return extracted;
  }

  return "";
}

export function applySmartFallbacks(
  candidate: { [key: string]: any },
  cleanText: string,
  contactLines: string[],
  experience: Experience[]
): void {
  if (!candidate.name) {
    const name = fallbackName(contactLines, cleanText);
    if (name) candidate.name = name;
  }

  if (!candidate.email) {
    const email = fallbackEmail(cleanText);
    if (email) candidate.email = email;
  }

  if (!candidate.phone) {
    const phone = fallbackPhone(cleanText);
    if (phone) candidate.phone = phone;
  }

  if (!candidate.dateOfBirth || candidate.dateOfBirth === "Not Found") {
    const dob = fallbackDOB(cleanText);
    if (dob) candidate.dateOfBirth = dob;
  }

  if (!candidate.totalExperience) {
    const exp = fallbackTotalExperience(cleanText);
    if (exp) candidate.totalExperience = exp;
  }

  if (!candidate.designation) {
    const des = improvedFallbackDesignation(contactLines, cleanText);
    if (des) candidate.designation = des;
  }

  if (!candidate.employer) {
    const emp = fallbackEmployer(cleanText, contactLines);
    if (emp) candidate.employer = emp;
  }

  if (!candidate.workingSince) {
    const ws = fallbackWorkingSince(cleanText);
    if (ws) candidate.workingSince = ws;
  }

  if (!candidate.address) {
    const addr = fallbackAddress(cleanText, contactLines);
    if (addr) candidate.address = addr;
  }

  if (!candidate.location) {
    const loc = fallbackLocation(cleanText);
    if (loc) candidate.location = loc;
  }

  if (!candidate.qualification) {
    const qual = fallbackQualification(cleanText);
    if (qual) candidate.qualification = qual;
  }
}
