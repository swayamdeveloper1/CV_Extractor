import { SectionBoundary } from "./sectionDetector";
import { getContactHeader } from "./sectionDetector";
import {
  cleanPersonName, isValidPersonName, isStrictPersonName,
  isSectionHeadingLike, isAddressLine, isLikelyAddress,
  isNoise, isResumeBoilerplate, isSectionWord,
  extractLabel, extractLabelValue, getLines,
  ALL_SECTION_HEADINGS,
} from "./validators";
import { looksLikeCompany } from "./companyDetector";
import { isPersonName } from "./validators";
import { LOCATION_LOOKUP } from "../../data/location-data";

const NOISE_PATTERNS = /(email|phone|mobile|http|www\.|linkedin|github|skype|@|\.com|resume|cv|curriculum\s*vitae)/i;

const ADDRESS_STRONG_KEYWORDS = /\b(road|street|nagar|colony|society|layout|sector|phase|block|building|village|post|district|taluka|tehsil|pincode|flat|apartment|house|plot|near|opposite|behind|beside)\b/i;
const ADDRESS_COUNTRY_RE = /\b(India|USA|UK|UAE|Australia|Canada|Germany|France|Japan|Singapore|Malaysia|Dubai|Qatar|Oman|Saudi\s*Arabia)\b/i;
const ADDRESS_KEYWORDS = /\b(road|rd|street|st|nagar|colony|society|layout|sector|phase|block|building|complex|plaza|tower|avenue|area|township|village|post|district|taluka|tehsil|pincode|pin\s*cod|zip|metro|mall|market|chowk|square|circle|extension|industrial|estate|floor|office|shop|house|flat|door|plot|landmark|lane|cross|gate|apartment|residency|bungalow|villa|residence|near|opposite|behind|beside|adjacent|phase|wing)\b/i;
const CITY_STATE_RE = /\b[A-Z][a-zA-Z]+\s*(?:,\s*)?[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*\s+(?:India|Maharashtra|Gujarat|Tamil\s*Nadu|Karnataka|Kerala|Andhra\s*Pradesh|Telangana|Uttar\s*Pradesh|Rajasthan|Madhya\s*Pradesh|West\s*Bengal|Bihar|Odisha|Punjab|Haryana|Delhi|Goa)\b/i;
const ADDRESS_REJECT = /\b(responsibilities|project\s*description|work\s*location|office\s*address|company\s*address|project\s*location|job\s*description|key\s*responsibilities|roles\s*and\s*responsibilities|objective|profile|summary|career\s*objective|professional\s*summary|certifications|achievements|technical\s*skills|core\s*competencies|country\s*of\s*citizenship|place\s*of\s*issue|date\s*of\s*issue|passport|communication\s*address|residence\s*address)\b/i;

const WORD_ROLE_KEYWORDS_RE = /\b(engineer|developer|manager|analyst|intern|associate|consultant|lead|architect|director|specialist|officer|trainee|supervisor|executive|head|chief|president|vp|designer|programmer|scientist|researcher|lecturer|professor|instructor|trainer|accountant|technician|advisor|auditor|planner|operator|coordinator|administrator|hr|devops|scrum\s*master|owner|analytics|support|foreman|surveyor|estimator|draughtsman|modeller|scheduler|foreman|superintendent)\b/i;

export interface HeaderInfo {
  name: string;
  email: string;
  phone: string;
  address: string;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasKnownPlace(text: string): boolean {
  for (const place of LOCATION_LOOKUP) {
    const re = new RegExp("\\b" + escapeRe(place) + "\\b", "i");
    if (re.test(text)) return true;
  }
  const COUNTRY_NAMES = ["India", "USA", "UK", "United Arab Emirates", "UAE", "Australia", "Canada", "Germany", "France", "Japan", "Singapore", "Malaysia", "Dubai", "Qatar", "Oman", "Saudi Arabia", "Bangladesh", "Nepal", "Sri Lanka", "Pakistan", "United States", "United Kingdom", "South Africa", "New Zealand"];
  for (const country of COUNTRY_NAMES) {
    if (new RegExp("\\b" + escapeRe(country) + "\\b", "i").test(text)) return true;
  }
  return false;
}
// export function parseHeader(contactLines: string[]) {
//   return {
//     name: "",
//     email: "",
//     phone: "",
//     designation: ""
//   };
// }

export function parseHeader(contactLines: string[]) {
  return {
    name: extractName(contactLines, contactLines.join("\n")),
    email: extractEmail(contactLines.join("\n")),
    phone: extractPhone(contactLines.join("\n")),
    // designation: extractDesignation(contactLines.join("\n"), contactLines),
  };
}
function getLeftoverHeaderLines(contactLines: string[], usedName: string): string[] {
  return contactLines.filter(line => {
    if (NOISE_PATTERNS.test(line)) return false;
    if (isSectionWord(line)) return false;
    if (isPersonName(line) && line === usedName) return false;
    // if (extractPhone(line)) return false;
    // if (extractEmail(line)) return false;
    const labelCheck = extractLabel([line], "designation|position|role|title|job title|location|city|place|current location|total experience|years of experience|name|full name|candidate name|applicant name|address|current address|permanent address|residence|residential address|correspondence address|present address|local address|mailing address|communication address|nationality|marital status|gender|date of birth|dob|father|mother|spouse|passport|language|hobbies|interests");
    if (labelCheck) return false;
    if (WORD_ROLE_KEYWORDS_RE.test(line)) return false;
    if (looksLikeCompany(line)) return false;
    if (/objective|profile|summary|education|skills|experience|projects|certifications/i.test(line)) return false;
    if (/about|nationality|gender|marital/i.test(line)) return false;
    return true;
  });
}


export function extractName(contactLines: string[], fullText: string): string {
  // console.log("======== NEW RESUME ========");
  // console.log("CONTACT LINES:");
  // console.log(contactLines);

  console.log("FIRST 25 LINES:");
  // console.log(allLines.slice(0, 25));
  const allLines = typeof fullText === "string"
    ? fullText.split("\n").map(l => l.trim()).filter(Boolean)
    : getLines(fullText);

  const labelPattern = "name|candidate name|applicant name|full name";
  const labeledFull = extractLabelValue(fullText, labelPattern);
  if (labeledFull) {
    const cleaned = cleanPersonName(labeledFull, false);
    if (cleaned) return cleaned;
  }
  const labeledContact = extractLabel(contactLines, labelPattern);
  if (labeledContact) {
    const cleaned = cleanPersonName(labeledContact, false);
    if (cleaned) return cleaned;
  }

  const scanLines: string[] = [];

  interface NameCandidate {
    name: string;
    score: number;
  }

  const candidates: NameCandidate[] = [];

  // const headerLines =
  // contactLines.length > 0 ? contactLines : allLines.slice(0, 60);

  // const headerLines = [
  //   ...contactLines,
  //   ...allLines.slice(0, 20)
  // ].filter(Boolean);

  const headerLines = [
    ...contactLines,
    ...allLines.slice(0, 40)
  ]
    .map(l => l.trim())
    .filter(Boolean);

  // const uniqueHeaderLines = [...new Set(headerLines)];

  // Remove duplicates
  const uniqueHeaderLines = [...new Set(headerLines)];

  for (const raw of uniqueHeaderLines) {

    const hasEmail = extractEmail(raw) !== "";
    const hasPhone = extractPhone(raw) !== "";
    const hasDateRange = /\b\d{4}\b/.test(raw) && /[-–]/.test(raw);
    const isNoisy = NOISE_PATTERNS.test(raw);
    const shouldFilter = hasEmail || hasPhone || hasDateRange || isNoisy;

    if (shouldFilter) {
      const cleaned = raw
        .replace(/[\w.+-]+@[\w.-]+\.\w+/g, "")
        .replace(/\+?\d[\d\s().-]{7,}/g, "")
        .replace(/\b(?:Email|E-mail|Email ID|Email Address|Phone|Mobile|Contact|Tel|Ph)\b[:.\-]?/gi, "")
        .replace(/\s{2,}/g, " ")
        .trim(); if (cleaned && cleaned.length < raw.length && cleaned.length >= 3 && cleaned.length <= 50) {
          scanLines.push(cleaned);
        }
    }
    if (shouldFilter) continue;
    scanLines.push(raw);

  }

  for (const [index, line] of scanLines.entries()) {
    let score = 0;

    if (index < 3) score += 50;
    else if (index < 8) score += 35;
    else if (index < 15) score += 20;
    else if (index < 30) score += 10;
    // let score = 0;
    if (line.length > 60) continue;
    if (isResumeBoilerplate(line)) continue;
    if (isSectionWord(line)) continue;
    if (isSectionHeadingLike(line)) continue;
    if (isAddressLine(line)) continue;

    // const strippedLabel = line.replace(/^\s*(name|candidate name|applicant name|full name)\s+/i, "").trim();
    const strippedLabel = line.replace(
      /.*?\b(name|candidate name|applicant name|full name)\b\s*[:\-]?\s*/i,
      ""
    ).trim();
    const effectiveLine = strippedLabel !== line && strippedLabel ? strippedLabel : line;

    if (
      /^resume$/i.test(effectiveLine) ||
      /^curriculum vitae$/i.test(effectiveLine)
    ) continue;
    if (!effectiveLine) continue;

    const cleaned = cleanPersonName(effectiveLine, true);

    if (!cleaned)
      continue;

    const upper = cleaned.toUpperCase();
    const BAD = [
      "OBJECTIVE",
      "OBJECTIVES",
      "PROFILE",
      "SUMMARY",
      "CAREER OBJECTIVE",
      "EXPERIENCE",
      "EDUCATION",
      "SKILLS",
      "PROJECTS",
      "DECLARATION",
      "PERSONAL DETAILS",
      "ACADEMIC QUALIFICATION",
      "PROFESSIONAL QUALIFICATION"
    ];

    if (BAD.includes(upper))
      continue;

    if (!cleaned)
      continue;

    if (!effectiveLine) continue;

    if (
      effectiveLine.length > 40 ||
      effectiveLine.includes("@") ||
      /\d{4}/.test(effectiveLine)
    ) continue;

    if (
      /(objective|summary|profile|experience|education|qualification|skill|project|declaration|responsibility)/i.test(effectiveLine)
    ) continue;
    const originalIndex = allLines.findIndex(
      l => l.trim().toLowerCase() === line.trim().toLowerCase()
    );

    if (originalIndex !== -1) {
      const nearby = allLines
        .slice(
          Math.max(0, originalIndex - 2),
          Math.min(allLines.length, originalIndex + 3)
        )
        .join(" ");

      if (extractEmail(nearby)) score += 25;
      if (extractPhone(nearby)) score += 25;

      if (extractEmail(nearby) && extractPhone(nearby))
        score += 15;
    }
    if (looksLikeCompany(effectiveLine))
      score -= 40;

    if (WORD_ROLE_KEYWORDS_RE.test(effectiveLine))
      score -= 35;

    if (hasKnownPlace(effectiveLine))
      score -= 25;

    if (/@/.test(effectiveLine)) score -= 50;
    if (/\d/.test(effectiveLine)) score -= 20;

    if (/^[A-Z\s.'-]{3,50}$/.test(effectiveLine) && effectiveLine.split(/\s+/).length >= 2) {
      score += 30;
    }

    if (/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,4}$/.test(effectiveLine)) {
      score += 25;
    }

    const words = effectiveLine.split(/\s+/).filter(Boolean);
    if (words.length >= 2 && words.length <= 4) score += 15;
    if (words.length > 4) score -= 10;

    score -= (words.filter(w => /^[a-z]/.test(w)).length) * 5;

    const cleanedStrict = cleanPersonName(effectiveLine, true);
    if (cleanedStrict) score += 20;

    // const truncated = effectiveLine.replace(/[\(,].*$/, "").trim();
    // if (truncated !== effectiveLine && truncated.length >= 3) {
    //   const tCleaned = cleanPersonName(truncated, true);
    //   if (tCleaned) {
    //     const tCandidates = candidates.filter(c => c.name === tCleaned);
    //     if (tCandidates.length === 0) candidates.push({ name: tCleaned, score: score + 15 });
    //   }
    // }
    // const cleaned = cleanPersonName(effectiveLine, true);

    // if (
    //   cleaned &&
    //   isValidPersonName(cleaned) &&
    //   !looksLikeCompany(cleaned) &&
    //   !isSectionHeadingLike(cleaned)
    // ) {
    //   candidates.push({ name: cleaned, score });
    // }
    if (
      isValidPersonName(cleaned) &&
      !looksLikeCompany(cleaned)
    ) {
      candidates.push({
        name: cleaned,
        score
      });
    }

    if (effectiveLine.length >= 3 && effectiveLine.length <= 20) {
      const idx = scanLines.indexOf(line);

      if (idx >= 0 && idx + 1 < scanLines.length) {
        const combined = line + " " + scanLines[idx + 1];

        if (!isResumeBoilerplate(combined) && !isSectionWord(combined)) {
          const combinedCleaned = cleanPersonName(combined, true);

          if (combinedCleaned) {
            candidates.push({
              name: combinedCleaned,
              score: score + 10,
            });
          }
        }
      }
    }
  }
  const bestMap = new Map<string, number>();

  for (const c of candidates) {
    const old = bestMap.get(c.name);
    if (old === undefined || c.score > old) {
      bestMap.set(c.name, c.score);
    }
  }

  const finalCandidates = [...bestMap.entries()].map(([name, score]) => ({
    name,
    score
  }));

  finalCandidates.sort((a, b) => b.score - a.score);

  if (finalCandidates.length && finalCandidates[0].score >= 30) {
    return finalCandidates[0].name;
  }
  candidates.sort((a, b) => b.score - a.score);

  if (candidates.length && candidates[0].score >= 20) {
    return candidates[0].name;
  }

  const nameLines = allLines.filter(l => /^(name|candidate name|applicant name|full name)\s*[:]/i.test(l));
  for (const nl of nameLines) {
    const val = nl.replace(/^[^:]*[:]\s*/, "").trim();
    if (val) {
      const cleaned = cleanPersonName(val, false);
      if (cleaned) return cleaned;
    }
  }

  for (const line of allLines) {
    if (line.length > 60) continue;
    if (/@/.test(line)) continue;
    if (/\b(email|phone|mobile|http|www\.|linkedin|github|skype)\b/i.test(line)) continue;
    if (hasKnownPlace(line)) continue;
    if (looksLikeCompany(line)) continue;
    if (WORD_ROLE_KEYWORDS_RE.test(line)) continue;
    if (isSectionWord(line)) continue;
    if (isSectionHeadingLike(line)) continue;
    const cleaned = cleanPersonName(line, false);
    if (cleaned && isValidPersonName(cleaned)) return cleaned;
  }

  return "";
}

export function extractEmail(text: string): string {

  const normalized = text.split("\n").map(line =>
    line
      .replace(/\s*@\s*/g, "@")
      .replace(/\s*\.\s*/g, ".")
      .replace(/\s+/g, " ")
      .replace(/@\s*/g, "@")
      .replace(/\.\s+/g, ".")
      .replace(/\s+\./g, ".")
      .replace(/\s+(?=\S+@)/g, "")
  ).join("\n");

  const STRICT_RE = /[\w.+-]+@[\w-]+(?:\.[a-zA-Z]{2,6}?(?!\w))+/;
  const BROAD_RE = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
  const KNOWN_TLD_RE = /\.(com|in|org|net|edu|gov|co\.in|ac\.in|info|biz|me|io|ai|dev|app|online|site|tech|store|blog|pro|name|xyz|live|work|today|email|world|group|media|photo|guru|zone|link|mobi|asia|tv|fm|am|jobs|tools|life|care|health|news|club|team|city|company|systems|solutions|consulting|international|education|services|agency|management|exchange|foundation|org\.in|net\.in|firm\.in|gen\.in|ind\.in)\b/i;

  function cleanEmail(s: string): string | null {
    const cleaned = s.replace(/^[^a-zA-Z0-9]+/, "");
    if (!cleaned.includes("@")) return null;
    const strict = cleaned.match(STRICT_RE);
    if (strict && strict[0].length === cleaned.length) return cleaned;
    const atIdx = cleaned.indexOf("@");
    const afterAt = cleaned.slice(atIdx);
    for (let end = cleaned.length; end > atIdx; end--) {
      const sub = cleaned.slice(0, end);
      if (KNOWN_TLD_RE.test(sub)) {
        const m = sub.match(KNOWN_TLD_RE);
        if (m && sub.endsWith(m[0])) return sub;
      }
    }
    const tldPos = afterAt.search(/\.([a-zA-Z]{2,6})(?:[^a-zA-Z]|$)/);
    if (tldPos >= 0) {
      const tldLen = afterAt.slice(tldPos).match(/[a-zA-Z]{2,6}/)![0].length;
      return cleaned.slice(0, atIdx + tldPos + tldLen);
    }
    return null;
  }

  function stripLeadingJunk(s: string): string {
    return s.replace(/^[^a-zA-Z0-9]+/, "");
  }

  const strictMatch = normalized.match(STRICT_RE);
  if (strictMatch) {
    const e = stripLeadingJunk(strictMatch[0].toLowerCase());
    if (!/\.(png|jpg|jpeg|gif|svg)$/i.test(e)) return e;
  }

  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  for (let i = 0; i < lines.length; i++) {
    const partial = lines[i].match(/([\w.+-]+@[\w-]+(?:\.[\w-]+)*)\.(\w{0,2})$/i);
    if (partial && i + 1 < lines.length) {
      const partialDomain = partial[2];
      const nextWord = lines[i + 1].split(/\s+/)[0].replace(/[^a-zA-Z0-9]/g, "");
      const combined = partial[1] + "." + partialDomain + nextWord;
      const cleaned = cleanEmail(combined);
      if (cleaned) return cleaned.toLowerCase();
    }
  }

  const broadMatches = normalized.match(BROAD_RE);
  if (broadMatches) {
    for (const match of broadMatches) {
      const cleaned = cleanEmail(match);
      if (cleaned) {
        const e = cleaned.toLowerCase();
        if (!/\.(png|jpg|jpeg|gif|svg)$/i.test(e)) return e;
      }
    }
  }

  const dotTruncated = text.match(/([\w.+-]+@[\w-]+\.)(?:\s|[^a-zA-Z]|$)/gi);
  if (dotTruncated && dotTruncated.length > 0) {
    const e = dotTruncated[0].replace(/[^a-zA-Z0-9.@_-]/g, "").toLowerCase();
    if (/[\w.+-]+@[\w-]+\.$/i.test(e) && !/\.(png|jpg|jpeg|gif|svg)$/i.test(e)) {
      return e;
    }
  }

  const lenientMatch = normalized.match(new RegExp(STRICT_RE.source, "gi"));
  if (lenientMatch) {
    const e = lenientMatch[0].toLowerCase();
    if (!/\.(png|jpg|jpeg|gif|svg)$/i.test(e)) return e;
  }

  return "";
}

function trimPhone(s: string): string {
  s = s.trim();
  const digits = s.replace(/[^\d+]/g, "");
  for (let i = digits.length; i >= 7; i--) {
    const sub = digits.slice(0, i);
    const idx = s.indexOf(sub);
    if (idx >= 0) return s.slice(0, idx + sub.length).trim();
  }
  return s.replace(/\s+\d{1,2}(?:\s|$)/, "").trim();
}

// export function extractPhone(text: string): string {
//   const noEmails = text.replace(/[\w.+-]+@[\w.-]+\.\w{2,}/gi, "");
//   const normalized = noEmails.replace(/\s+/g, " ").replace(/\|/g, " ");
//   const patterns = [
//     /(?<![-\d])(\+\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{2,4}[-.\s]?\d{3,4}[-.\s]?\d{0,4}(?![-\d])/g,
//     /(?<![-\d])(\+\d{1,3}[-.\s]?)?\b\d{5}[-.\s]?\d{5}\b(?![-\d])/g,
//   ];
//   for (const p of patterns) {
//     const matches = normalized.match(p);
//     if (matches && matches.length > 0) {
//       for (const m of matches) {
//         const cleaned = m.replace(/[()\s.-]/g, "");
//         const digits = cleaned.replace(/[^\d+]/g, "");
//         const rawDigits = digits.replace(/[^0-9]/g, "");
//         const digitCount = rawDigits.length;
//         const trimmedVal = m.trim();
//         if (/^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}/.test(trimmedVal)) continue;
//         const digitOnly = trimmedVal.replace(/[^\d]/g, "");
//         if (digitOnly.length === 8 && /^\d{8}$/.test(digitOnly)) continue;
//         if (digitCount >= 7 && digitCount <= 15) {
//           if (/^(\d)\1{6,}$/.test(rawDigits)) continue;
//           return trimPhone(m);
//         }
//       }
//     }
//   }
//   const labelMatch = normalized.match(/\b(?:MO|Mobile|Phone|Contact|Tel|Ph)\s*[:.\-]+\s*\-?\s*(\+?\d[\d\s().-]{6,15}\d)\b/i);
//   if (labelMatch) {
//     const m = labelMatch[1].trim();
//     const digits = m.replace(/[^\d+]/g, "");
//     const rawDigits = digits.replace(/[^0-9]/g, "");
//     if (rawDigits.length >= 7 && rawDigits.length <= 15) return trimPhone(m);
//   }
//   return "";
// }

export function extractPhone(text: string): string {
  // Remove emails
  const cleanedText = text.replace(/[\w.+-]+@[\w.-]+\.\w{2,}/gi, "");

  // Reject scientific notation
  if (/e\+\d+/i.test(cleanedText)) {
    return "";
  }

  const matches = cleanedText.match(/(?:\+?\d[\d\s().-]{8,20}\d)/g);

  if (!matches) return "";

  for (let phone of matches) {
    // Ignore dates
    if (/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(phone.trim()))
      continue;

    // Ignore scientific notation
    if (/e\+\d+/i.test(phone))
      continue;

    // Remove minus sign at beginning
    phone = phone.replace(/^-/, "");

    // Keep only digits and +
    let normalized = phone.replace(/[^\d+]/g, "");

    // Remove duplicate +
    normalized = normalized.replace(/\++/g, "+");

    // Convert 0091XXXXXXXXXX → +91XXXXXXXXXX
    if (normalized.startsWith("0091")) {
      normalized = "+91" + normalized.substring(4);
    }

    const digits = normalized.replace(/\D/g, "");

    // Reject impossible numbers
    if (digits.length < 10)
      continue;

    if (digits.length > 15)
      continue;

    // Reject repeated digits
    if (/^(\d)\1+$/.test(digits))
      continue;

    // Indian mobile
    if (/^[6-9]\d{9}$/.test(digits)) {
      return digits;
    }

    // +91 mobile
    if (/^91[6-9]\d{9}$/.test(digits)) {
      return "+" + digits;
    }

    // Other international numbers
    if (/^\+\d{11,13}$/.test(normalized)) {
      return normalized;
    }
  }

  return "";
}

function extractCityState(address: string): string {
  if (!address) return "";

  const parts = address
    .split(",")
    .map(p => p.trim())
    .filter(Boolean);

  // Search from end because city/state are usually last
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i];

    if (LOCATION_LOOKUP.some(loc => loc.toLowerCase() === part.toLowerCase())) {
      // If previous part is also a location, return "City, State"
      if (
        i > 0 &&
        LOCATION_LOOKUP.some(loc => loc.toLowerCase() === parts[i - 1].toLowerCase())
      ) {
        return `${parts[i - 1]}, ${part}`;
      }

      return part;
    }
  }

  // Fallback: search anywhere in the string
  for (const loc of LOCATION_LOOKUP) {
    const re = new RegExp(`\\b${escapeRe(loc)}\\b`, "i");
    if (re.test(address)) {
      return loc;
    }
  }

  return "";
}

export function extractAddress(text: string, contactLines?: string[], boundaries?: Map<string, SectionBoundary>): string {
  const allLines = text.split("\n").map(l => l.trim()).filter(Boolean);

  const labeled = (() => {
    const r = new RegExp("^\\s*(?:address|current address|permanent address|residence|residential address|correspondence address|present address|local address|mailing address|communication address|address for communication)\\s*[:\\-]?\\s*(.+)", "i");
    for (const line of allLines) {
      const m = line.match(r);
      if (m) return m[1].trim();
    }
    return "";
  })();
  if (labeled && labeled.length > 3 && !NOISE_PATTERNS.test(labeled) && !isPersonName(labeled) && hasKnownPlace(labeled)) return extractCityState(labeled);
  if ((!labeled || labeled.length <= 3) && !(labeled && labeled.length > 3)) {
    for (const prefix of ["address", "present address", "correspondence address", "address for communication", "residence"]) {
      const prefixRe = new RegExp("^\\s*" + prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*[:\\-]?", "i");
      const labelIdx = allLines.findIndex(l => l.toLowerCase().includes(prefix));
      if (labelIdx < 0 || !prefixRe.test(allLines[labelIdx])) continue;
      const addrLines = allLines.slice(labelIdx, labelIdx + 4).filter(l => l.length > 3 && !NOISE_PATTERNS.test(l) && !/(?:email|phone|mobile|contact|mobile\s*no|objective|summary|certifications|achievements|skills|date of birth|dob|marital|nationality|hobbies|interests)/i.test(l) && !/^[•\-–*\d]/.test(l) && !WORD_ROLE_KEYWORDS_RE.test(l));
      if (addrLines.length > 0) {
        const joined = addrLines.map(l => l.replace(prefixRe, "").trim()).filter(Boolean).join(", ");
        if (joined.length > 8 && hasKnownPlace(joined)) return extractCityState(joined);
      }
    }
  }

  const src = contactLines || (boundaries ? (() => {
    const { getContactHeader } = require("./sectionDetector");
    return getContactHeader(text, boundaries);
  })() : text.split("\n").slice(0, 20).map(l => l.trim()).filter(Boolean));

  function isAddress(s: string): boolean {
    return isLikelyAddress(s);
  }

  function canExtendAddress(line: string): boolean {
    if (isAddress(line)) return true;
    if (NOISE_PATTERNS.test(line)) return false;
    if (WORD_ROLE_KEYWORDS_RE.test(line)) return false;
    const phoneMatch = line.match(/\d+/g);
    if (phoneMatch && phoneMatch.some(d => d.length >= 7)) return false;
    if (line.length > 5 && /\d/.test(line) && /[A-Za-z]/.test(line)) return true;
    return false;
  }

  let bestMultiLine = "";
  for (let i = 0; i < src.length; i++) {
    if (!isAddress(src[i])) continue;
    let combined = src[i];
    for (let j = i + 1; j < Math.min(i + 4, src.length); j++) {
      if (!canExtendAddress(src[j])) break;
      combined += ", " + src[j];
    }
    if (combined.length > bestMultiLine.length && hasKnownPlace(combined)) bestMultiLine = combined;
  }
  if (bestMultiLine) return extractCityState(bestMultiLine);

  for (const line of src) {
    if (isAddress(line) && hasKnownPlace(line) && !NOISE_PATTERNS.test(line) && !WORD_ROLE_KEYWORDS_RE.test(line)) return extractCityState(line);
  }

  const firstSectionEnd = Math.min(30, allLines.length);
  const firstLines = allLines.slice(0, firstSectionEnd);
  for (let i = 0; i < firstLines.length; i++) {
    if (!isAddress(firstLines[i]) || !hasKnownPlace(firstLines[i])) continue;
    let combined = firstLines[i];
    for (let j = i + 1; j < Math.min(i + 3, firstLines.length); j++) {
      if (!canExtendAddress(firstLines[j])) break;
      combined += ", " + firstLines[j];
    }
    if (hasKnownPlace(combined)) return extractCityState(combined);
  }

  const leftovers = getLeftoverHeaderLines(src, "");
  const addrLeftovers = leftovers.filter(l => isLikelyAddress(l));
  if (addrLeftovers.length > 0) {
    const combined = addrLeftovers.join(", ");
    if (combined.length > 8 && hasKnownPlace(combined)) return combined;
  }

  if (leftovers.length > 0) {
    const withPlace = leftovers.filter(l => hasKnownPlace(l) && !isPersonName(l) && l.length > 5 && !isSectionWord(l) && !ADDRESS_REJECT.test(l));
    if (withPlace.length > 0) return extractCityState(withPlace.join(", "));
  }

  return "";
}
