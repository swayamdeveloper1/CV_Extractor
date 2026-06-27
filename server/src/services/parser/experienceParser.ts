import { Experience } from "../../types";
import { SectionBoundary } from "./sectionDetector";
import { getSectionLines } from "./sectionDetector";
import { looksLikeCompany, scoreCompany, parseRoleAndCompany, cleanEmployerValue } from "./companyDetector";
import { parseDateRange, extractEndYear } from "./dateParser";
import { lineContainsDateOnly, hasRoleKeyword, isNoise } from "./validators";
import { WORD_ROLE_KEYWORDS_RE } from "./validators";

const COMPANY_INDICATORS_RE = /\b(ltd|limited|llp|pvt\s*ltd|private\s*limited|inc|corporation|corp|technologies|solutions|services|engineering|construction|infrastructure|group|consultants|builders|industries|enterprises|associates|ventures|holdings|developers|infra|contractors|consulting|consultancy|systems|software|tech|co\b|&)\b/i;

const ROLE_KEYWORDS_RE = /(engineer|developer|manager|analyst|intern|associate|consultant|lead|architect|director|specialist|officer|trainee|supervisor|executive|head|chief|president|vp|designer|programmer|scientist|researcher|lecturer|professor|instructor|trainer|accountant|technician|advisor|auditor|planner|operator|coordinator|administrator|hr|devops|scrum\s*master|owner|analytics|support|foreman|surveyor|estimator|draughtsman|modeller|scheduler|foreman|superintendent)/i;

interface JobBlock {
  role: string;
  company: string;
  duration: string;
  startDate: string;
  description: string[];
}

export function extractExperience(text: string, boundaries: Map<string, SectionBoundary>): Experience[] {
  const expLines = getSectionLines(text, boundaries, [
    "experience", "work experience", "employment", "work history",
    "professional experience", "employment history", "career history",
    "project experience",
  ]);
  if (expLines.length === 0) return [];

  const blocks = splitJobBlocks(expLines);

  const results: Experience[] = [];
  for (const block of blocks) {
    const parsed = parseJobBlock(block);
    if (parsed.role || parsed.company) {
      let company = parsed.company;
      if (company) {
        company = company.replace(/\s*[-–].*$/, "").trim();
        company = company.replace(/[,;].*$/, "").trim();
      }
      results.push({
        company: company || "",
        role: parsed.role || "",
        duration: parsed.duration,
        startDate: parsed.startDate,
      });
    }
  }

  return results;
}

function splitJobBlocks(lines: string[]): string[][] {
  if (lines.length === 0) return [];

  const blocks: string[][] = [];
  let currentBlock: string[] = [];
  let lastScore = -1000;

  for (const line of lines) {
    const sc = scoreJobStart(line);
    if (sc >= 30 && currentBlock.length > 0) {
      blocks.push(currentBlock);
      currentBlock = [line];
      lastScore = sc;
    } else {
      currentBlock.push(line);
    }
  }

  if (currentBlock.length > 0) {
    blocks.push(currentBlock);
  }

  return blocks;
}

function scoreJobStart(line: string): number {
  if (!line) return -100;
  if (line.length > 100) return -100;

  let score = 0;

  if (lineContainsDateOnly(line) && !ROLE_KEYWORDS_RE.test(line)) return -50;
  if (/^(experience|employment|work\s*history|career|professional\s*experience)/i.test(line)) return -50;

  const hasDR = parseDateRange(line);
  if (hasDR) score += 35;

  if (ROLE_KEYWORDS_RE.test(line)) score += 30;

  if (/^[•\-–*\d]/.test(line)) score -= 20;

  if (/\b(responsibilities|duties|key\s*responsibilities|roles?\s*:)/i.test(line)) score -= 30;

  if (line.length > 3 && line.length < 60) score += 10;

  const compScore = scoreCompany(line);
  if (compScore >= 40) score += 25;

  const words = line.split(/\s+/).length;
  if (words >= 2 && words <= 6) score += 10;

  if (line[0] === line[0]?.toUpperCase() && /^[A-Z]/.test(line)) score += 10;

  return score;
}

function parseJobBlock(lines: string[]): {
  role: string;
  company: string;
  duration: string;
  startDate: string;
} {
  let role = "";
  let company = "";
  let duration = "";
  let startDate = "";

  const candidates: {
    role: string;
    company: string;
    duration: string;
    startDate: string;
    score: number;
  }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.length > 100) continue;
    if (lineContainsDateOnly(line) && !ROLE_KEYWORDS_RE.test(line)) continue;

    const dr = parseDateRange(line);

    if (dr) {
      duration = dr.duration;
      startDate = dr.startYear;

      const remainder = line.replace(dr.duration, "").replace(/^[,\s]+|[,\s]+$/g, "");
      if (remainder) {
        const parts = parseRoleAndCompany(remainder);
        if (parts.role && !role) role = parts.role;
        if (parts.company && !company) company = parts.company;
      }
    }

    if (ROLE_KEYWORDS_RE.test(line) && !COMPANY_INDICATORS_RE.test(line)) {
      if (!role) role = line;
      for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
        const nextLine = lines[j];
        if (nextLine.length > 100) continue;

        const nextDR = parseDateRange(nextLine);
        if (nextDR && !duration) {
          duration = nextDR.duration;
          startDate = nextDR.startYear;
          const afterDate = nextLine.replace(nextDR.duration, "").trim().replace(/^[,\s]+|[,\s]+$/g, "");
          if (afterDate && !company && looksLikeCompany(afterDate)) {
            company = afterDate;
          }
        }

        if (looksLikeCompany(nextLine)) {
          if (!company) {
            company = nextLine;
          } else if (scoreCompany(nextLine) > scoreCompany(company)) {
            company = nextLine;
          }
        }
      }
    }

    if (looksLikeCompany(line) && !WORD_ROLE_KEYWORDS_RE.test(line) && !company) {
      company = line;
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        if (ROLE_KEYWORDS_RE.test(nextLine) && !role) {
          role = nextLine;
          if (i + 2 < lines.length && !duration) {
            const nextDR = parseDateRange(lines[i + 2]);
            if (nextDR) {
              duration = nextDR.duration;
              startDate = nextDR.startYear;
            }
          }
        }
      }
    }

    if (ROLE_KEYWORDS_RE.test(line) && COMPANY_INDICATORS_RE.test(line) && !role && !company) {
      const parts = parseRoleAndCompany(line);
      if (parts.role) role = parts.role;
      if (parts.company) company = parts.company;
    }

    if (!duration) {
      for (let j = Math.max(0, i - 1); j < Math.min(i + 6, lines.length); j++) {
        const lineDR = parseDateRange(lines[j]);
        if (lineDR && !duration) {
          duration = lineDR.duration;
          if (!startDate) startDate = lineDR.startYear;
        }
      }
    }
  }

  return { role, company, duration, startDate };
}

export function extractWorkingSince(experience: Experience[]): string {
  if (experience.length > 0 && experience[0].startDate) {
    const d = new Date(experience[0].startDate);
    if (!isNaN(d.getTime()) && d.getFullYear() > 1980 && d.getFullYear() <= new Date().getFullYear()) {
      return experience[0].startDate;
    }
  }
  for (const exp of experience) {
    if (exp.duration) {
      const y = exp.duration.match(/(\d{4})/);
      if (y) {
        const year = parseInt(y[1]);
        if (year > 1900 && year <= new Date().getFullYear()) return y[1];
      }
    }
  }
  return "";
}

export function extractTotalExperience(experience: Experience[], text: string, contactLines: string[]): string {
  const labeled = (() => {
    const re = new RegExp("^\\s*(?:total experience|total exp|overall experience|years of experience|work experience)\\s*[:\\-]\\s*[-:]?\\s*(.+)", "i");
    for (const line of contactLines) {
      const m = line.match(re);
      if (m) return m[1].trim();
    }
    return "";
  })();
  if (labeled) {
    const p = labeled.match(/(\d+)\s*(?:years?|yrs?)(?:\s+(?:and\s+)?(\d+)\s*(?:months?|mons?))?/i);
    if (p) return p[2] ? p[1] + "y " + p[2] + "m" : p[1] + "y";
  }

  for (const line of contactLines) {
    const p = line.match(/(\d+)\s*(?:years?|yrs?)(?:\s+(?:and\s+)?(\d+)\s*(?:months?|mons?))?/i);
    if (p) return p[2] ? p[1] + "y " + p[2] + "m" : p[1] + "y";
  }

  if (experience.length > 0) {
    let totalMonths = 0;
    for (const exp of experience) {
      if (exp.startDate) {
        const start = new Date(exp.startDate);
        if (isNaN(start.getTime())) continue;
        let end = new Date();
        if (exp.duration) {
          const endMatch = exp.duration.match(/(\d{4})/g);
          if (endMatch && endMatch.length >= 2) {
            const ey = parseInt(endMatch[endMatch.length - 1]);
            if (!isNaN(ey) && ey > 1900 && ey <= new Date().getFullYear()) {
              end = new Date(ey, 0, 1);
            }
          } else if (exp.duration.match(/present|current|till now/i)) {
            end = new Date();
          }
        }
        if (end <= start) continue;
        const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
        if (months > 0) totalMonths += months;
      }
    }

    if (totalMonths === 0) {
      for (const exp of experience) {
        const years = exp.duration.match(/(\d{4})/g);
        if (years && years.length >= 2) {
          const sy = parseInt(years[0]);
          const eyStr = years[years.length - 1];
          const ey = eyStr.toLowerCase() === "present" ? new Date().getFullYear() : parseInt(eyStr);
          if (!isNaN(sy) && !isNaN(ey) && sy > 1900 && ey > 1900 && ey >= sy) totalMonths += (ey - sy) * 12;
        }
      }
    }

    if (totalMonths > 0 && totalMonths < 600) {
      const y = Math.floor(totalMonths / 12);
      const m = totalMonths % 12;
      if (y > 0 && m > 0) return y + "y " + m + "m";
      if (y > 0) return y + "y";
      if (m > 0) return m + "m";
    }
  }

  return "";
}

export function extractEmployer(text: string, experience?: Experience[], boundaries?: Map<string, SectionBoundary>): string {
  if (experience && experience.length > 0) {
    const sorted = [...experience].sort((a, b) => {
      const aEnd = extractEndYear(a.duration);
      const bEnd = extractEndYear(b.duration);
      return bEnd - aEnd;
    });
    for (const exp of sorted) {
      if (exp.company) {
        const stripped = exp.company.replace(/[,;].*$/, "").trim();
        if (stripped && stripped.length > 1 && looksLikeCompany(stripped)) {
          const cv = cleanEmployerValue(stripped);
          if (cv.length >= 2) return cv;
        }
      }
    }
  }

  const expLines = getSectionLines(text, boundaries || new Map(), [
    "experience", "work experience", "employment", "work history",
    "professional experience", "employment history", "career history",
  ]);

  for (const line of expLines) {
    if (line.length < 3 || line.length > 200) continue;
    if (isNoise(line)) continue;
    if (lineContainsDateOnly(line)) continue;
    if (/^[•\-–*\d]/.test(line)) continue;
    if (/\b(project|summary|responsible|manage|oversee|lead|develop|implement|create|design|prepare|review|coordinate|supervise|monitor|control|ensure|maintain|support|provide|assist|participate|report|conduct|perform|achieve|complete|deliver|execute|establish|improve|optimize|reduce|increase|handle|processing|handling|budget|evaluate|analyze|plan|organize|direct|administer|process|responsible for|key responsibilities|duties include|role includes)\b/i.test(line)) continue;

    if (looksLikeCompany(line)) {
      const cv = cleanEmployerValue(line);
      if (cv.length >= 2) return cv;
    }

    if (WORD_ROLE_KEYWORDS_RE.test(line)) continue;
  }

  const contactLines = text.split("\n").slice(0, 20).map(l => l.trim()).filter(Boolean);
  for (const line of contactLines) {
    if (line.length < 3 || line.length > 80) continue;
    if (isNoise(line)) continue;
    if (lineContainsDateOnly(line)) continue;
    if (WORD_ROLE_KEYWORDS_RE.test(line)) continue;

    if (looksLikeCompany(line)) {
      const cv = cleanEmployerValue(line);
      if (cv.length >= 2) return cv;
    }
  }

  const labeled = (() => {
    const re = new RegExp("^\\s*(?:current employer|employer|working at|company|organization)\\s*[:\\-]\\s*[-:]?\\s*(.+)", "im");
    const m = text.match(re);
    return m ? m[1].trim() : "";
  })();
  if (labeled) {
    return cleanEmployerValue(labeled);
  }

  return "";
}
