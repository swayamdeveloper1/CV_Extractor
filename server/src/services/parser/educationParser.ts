import { Education } from "../../types";
import { SectionBoundary } from "./sectionDetector";
import { getSectionLines } from "./sectionDetector";
import { getLines } from "./validators";
import { DEGREE_LOOKUP } from "../../data/role-data";

const DEGREE_KEYWORDS_RE = /(bachelor|master|phd|doctorate|b\.?[ae]|m\.?[ae]|b\.?sc|m\.?sc|b\.?tech|m\.?tech|bba|mba|bca|mca|b\.?com|m\.?com|b\.?a|m\.?a|b\.?ed|m\.?ed|b\.?pharm|m\.?pharm|diploma|high\s*school|secondary|higher\s*secondary|s\.?s\.?c|h\.?s\.?c|intermediate|matriculation|10th|12th|graduate|post\s*graduate|ph\.?d|bachelor's|master's|bachelor\s*of|master\s*of|b\.?e|bachelor\s*of\s*engineering|master\s*of\s*engineering|m\.?e)/i;
const COLLEGE_KEYWORDS_RE = /(university|college|institute|school|academy|engineering\s*college|science\s*college|arts\s*college|polytechnic|iit|nit|iiit|nit\s*surat|bits|bits\s*pilani|anna\s*university|mumbai\s*university|pune\s*university|delhi\s*university|gujarat\s*university|amrita|vit|srm|manipal|bharati\s*vidyapeeth|symbiosis)/i;

export function extractEducation(text: string, boundaries: Map<string, SectionBoundary>): Education[] {
  const eduLines = getSectionLines(text, boundaries, [
    "education", "academic background", "qualifications", "academic qualifications",
    "educational qualifications", "education qualifications",
  ]);

  if (eduLines.length === 0) {
    const allLines = text.split("\n").map(l => l.trim()).filter(Boolean);
    return extractEducationFromLines(allLines);
  }

  return extractEducationFromLines(eduLines);
}

function extractEducationFromLines(lines: string[]): Education[] {
  const results: Education[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.length > 100) continue;
    if (DEGREE_KEYWORDS_RE.test(line)) {
      let degreeLine = line;
      let institution = "";
      let year = "";

      const yearMatch = line.match(/(\d{4})\s*[-–to]+\s*(\d{4})/);
      const singleYear = line.match(/(\d{4})/);
      if (yearMatch) {
        year = yearMatch[1] + "-" + yearMatch[2];
      } else if (singleYear) {
        year = singleYear[1];
      }

      if (i + 1 < lines.length && lines[i + 1].length < 100) {
        const nextLine = lines[i + 1];
        if (COLLEGE_KEYWORDS_RE.test(nextLine) || /^[A-Z][a-zA-Z\s]+$/.test(nextLine)) {
          institution = nextLine;
        }
      }

      if (institution) {
        institution = institution.replace(/\s*\d{4}.*$/, "").trim();
      }

      if (!institution) {
        const dashMatch = line.match(/\s*[-–]\s*/);
        if (dashMatch) {
          const parts = line.split(/\s*[-–]\s*/);
          if (parts.length >= 2) {
            const first = parts[0].trim();
            const rest = parts.slice(1).join(" ").trim();
            if (COLLEGE_KEYWORDS_RE.test(rest) || (!DEGREE_KEYWORDS_RE.test(rest) && rest.length > 3)) {
              degreeLine = first;
              institution = rest;
            }
          }
        }
      }

      results.push({ degree: degreeLine, institution: institution || "", year });
    }
  }
  return results;
}

export function extractQualification(text: string, eduLines?: string[]): string {
  if (eduLines) {
    for (const line of eduLines) {
      for (const degree of DEGREE_LOOKUP) {
        const re = new RegExp("\\b" + degree.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "i");
        if (re.test(line)) return degree;
      }
    }
  }
  for (const degree of DEGREE_LOOKUP) {
    const re = new RegExp("\\b" + degree.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "i");
    if (re.test(text)) return degree;
  }
  return "";
}
