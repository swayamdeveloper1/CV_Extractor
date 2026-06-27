export function preprocess(text: string): string {
  let s = text;

  s = removeUnicodeGarbage(s);
  s = normalizeWhitespace(s);
  s = normalizeBullets(s);
  s = normalizeOcrText(s);
  s = fixBrokenPdfLineWrapping(s);
  s = joinSplitAllCapsNames(s);
  s = normalizeDates(s);

  return s;
}

function removeUnicodeGarbage(s: string): string {
  return s
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/[\u2000-\u200f]/g, " ")
    .replace(/[\u2028-\u202f]/g, " ")
    .replace(/[\u205f\u3000\ufeff]/g, " ")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\u2013/g, "-")
    .replace(/\u2014/g, "-")
    .replace(/\u2022/g, "*")
    .replace(/\u2026/g, "...")
    .replace(/\u00b0/g, " degrees ")
    .replace(/\u00e9/g, "e")
    .replace(/\u00e8/g, "e")
    .replace(/\u00ea/g, "e")
    .replace(/\u00e0/g, "a")
    .replace(/\u00e2/g, "a")
    .replace(/\u00f4/g, "o")
    .replace(/\u00ee/g, "i")
    .replace(/\u00fb/g, "u")
    .replace(/\u00e7/g, "c")
    .replace(/\u00f1/g, "n")
    .replace(/\u00df/g, "ss");
}

function normalizeWhitespace(s: string): string {
  return s
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\t/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/ +\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map(l => l.trim())
    .join("\n");
}

function normalizeBullets(s: string): string {
  return s.replace(/[•▪■◆►➤◉○◎●‣⁃→⇒➔⋮⋯﹒∙⋅❖➢]/g, "*");
}

function normalizeOcrText(s: string): string {
  return s
    .replace(/\b0\b/g, "O")
    .replace(/l\/m/g, "lm")
    .replace(/rn\b/g, "m")
    .replace(/\bci\b/g, "d")
    .replace(/\brn\b/g, "m");
}

function fixBrokenPdfLineWrapping(s: string): string {
  const lines = s.split("\n");
  const result: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (
      i + 1 < lines.length &&
      line.length > 0 &&
      /[a-z0-9,;:]$/.test(line) &&
      /^[a-z]/.test(lines[i + 1]) &&
      lines[i + 1].length < 80 &&
      !/@/.test(lines[i + 1])
    ) {
      line += " " + lines[i + 1];
      i++;
    }
    result.push(line);
  }
  return result.join("\n");
}

const RESUME_LABELS = /\b(resume|cv|curriculum\s*vitae|curriculum|vitae|profile|objective|summary|about|contact|page|name|email|phone|mobile|address)\b/i;

const ROLE_LINE_RE = /\b(engineer|developer|manager|analyst|intern|associate|consultant|lead|architect|director|specialist|officer|trainee|supervisor|executive|head|chief|president|vp|designer|programmer|scientist|researcher|lecturer|professor|instructor|trainer|accountant|technician|foreman|surveyor|estimator|draughtsman|modeller|scheduler|superintendent|coordinator|administrator)\b/i;

function joinSplitAllCapsNames(s: string): string {
  const lines = s.split("\n");
  const result: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : "";
    if (
      nextLine &&
      /^[A-Z]{2,}(?:\s+[A-Z]{2,}){0,2}$/.test(trimmed) &&
      /^[A-Z]{2,}/.test(nextLine) &&
      trimmed.length + nextLine.length < 60 &&
      !RESUME_LABELS.test(trimmed) &&
      !ROLE_LINE_RE.test(nextLine)
    ) {
      result.push(trimmed + " " + nextLine);
      i++;
    } else {
      result.push(line);
    }
  }
  return result.join("\n");
}

function normalizeDates(s: string): string {
  return s
    .replace(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g, (_, m, d, y) => {
      return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    })
    .replace(/\b(\d{1,2})-(\d{1,2})-(\d{4})\b/g, (_, m, d, y) => {
      return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    })
    .replace(/\b(\d{1,2})\.(\d{1,2})\.(\d{4})\b/g, (_, m, d, y) => {
      return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    });
}
