import { ALL_SECTION_HEADINGS } from "./validators";

export interface SectionBoundary {
  start: number;
  end: number;
}

export type SectionType =
  | "header"
  | "summary"
  | "experience"
  | "education"
  | "projects"
  | "skills"
  | "certifications"
  | "languages";

export const SECTION_VARIANTS: Record<string, string[]> = {
  experience: [
    "experience", "work experience", "employment", "work history",
    "professional experience", "employment history", "career history",
    "employment details", "employment record", "name of present firm",
  ],
  education: [
    "education", "academic background", "qualifications",
    "educational qualifications", "academic qualifications",
    "education qualifications", "academic qualification",
  ],
  skills: [
    "skills", "technical skills", "core competencies", "key skills",
    "technologies", "tech stack", "tool stack", "expertise",
    "competencies", "proficiencies",
  ],
  projects: [
    "projects", "academic projects", "professional projects",
  ],
  certifications: [
    "certifications", "certificates", "courses", "training",
  ],
  summary: [
    "summary", "professional summary", "career summary", "profile", "about me",
    "objective", "career objective",
  ],
  languages: [
    "languages",
  ],
};

export interface SectionMatch {
  type: string;
  heading: string;
  lineIdx: number;
  score: number;
}

export function detectSections(text: string): Map<string, SectionBoundary> {
  const lines = text.split("\n");
  const boundaries = new Map<string, SectionBoundary>();
  const matches: SectionMatch[] = [];

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i].trim();
    if (raw.length > 60) continue;

    const score = scoreHeading(raw);
    if (score > 0) {
      let bestType = "";
      let bestHeading = "";
      for (const [type, variants] of Object.entries(SECTION_VARIANTS)) {
        for (const v of variants) {
          if (normalizeHeading(raw) === normalizeHeading(v) ||
              normalizeHeading(raw) === normalizeHeading(v) + ":" ||
              normalizeHeading(raw).startsWith(normalizeHeading(v) + " ")) {
            if (v.length > bestHeading.length) {
              bestType = type;
              bestHeading = v;
            }
          }
        }
      }

      if (!bestType) {
        for (const h of ALL_SECTION_HEADINGS) {
          const nRaw = normalizeHeading(raw);
          const nH = normalizeHeading(h);
          if (nRaw === nH || nRaw === nH + ":" ||
              nRaw.startsWith(nH + " ") || nRaw.startsWith(nH + ":")) {
            bestType = h;
            bestHeading = h;
            break;
          }
        }
      }

      if (bestType) {
        matches.push({ type: bestType, heading: bestHeading, lineIdx: i, score });
      }
    }
  }

  for (let i = 0; i < matches.length; i++) {
    const end = i + 1 < matches.length ? matches[i + 1].lineIdx : lines.length;
    if (!boundaries.has(matches[i].type)) {
      boundaries.set(matches[i].type, { start: matches[i].lineIdx + 1, end });
    }
  }

  return boundaries;
}

function normalizeHeading(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s\/]/g, "").trim();
}

function scoreHeading(line: string): number {
  const cleaned = line.toLowerCase().replace(/[^a-z0-9\s\/]/g, "").trim();
  if (!cleaned) return 0;

  let score = 0;

  for (const [, variants] of Object.entries(SECTION_VARIANTS)) {
    for (const v of variants) {
      const n = normalizeHeading(v);
      if (cleaned === n || cleaned === n + ":") {
        score += 50;
      }
    }
  }

  const lineWords = cleaned.split(/\s+/).filter(w => w.length > 0);
  if (lineWords.length <= 5) score += 10;

  const isAllCaps = line === line.toUpperCase() && line.length > 2;
  if (isAllCaps) score += 20;

  const isTitleCase = /^[A-Z][a-z]/.test(line);
  if (isTitleCase) score += 15;

  if (/[.:]$/.test(line.trim())) score += 5;

  if (/\b(page|resume|cv|curriculum|vitae)\b/i.test(line)) score -= 30;

  if (/\b(engineer|developer|manager|analyst|intern|trainee)\b/i.test(line)) score -= 20;

  return score;
}

export function getContactHeader(
  text: string,
  boundaries: Map<string, SectionBoundary>
): string[] {
  const lines = text
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean);

  let firstSectionLine = lines.length;

  for (const [, b] of boundaries) {
    if (b.start - 1 < firstSectionLine) {
      firstSectionLine = b.start - 1;
    }
  }

  // Capture everything before the first detected section,
  // but allow a much larger header region.
  const end = Math.min(firstSectionLine, 60);

  return lines.slice(0, end);
}

export function getSectionLines(text: string, boundaries: Map<string, SectionBoundary>, headings: string[]): string[] {
  for (const h of headings) {
    const b = boundaries.get(h);
    if (b) return text.split("\n").slice(b.start, b.end).map(l => l.trim()).filter(Boolean);
  }
  for (const [type, b] of boundaries) {
    if (headings.some(h => type === h || type.startsWith(h))) {
      return text.split("\n").slice(b.start, b.end).map(l => l.trim()).filter(Boolean);
    }
  }
  return [];
}

export function getSectionText(text: string, boundaries: Map<string, SectionBoundary>, headings: string[]): string {
  return getSectionLines(text, boundaries, headings).join("\n");
}
