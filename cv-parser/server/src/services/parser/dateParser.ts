const MONTH_NAMES = "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";
const MONTH_MAP: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

const DATE_RANGE_RE = new RegExp(
  "(?:" + MONTH_NAMES + ")\\.?\\s*\\d{4}\\s*[-–to]+\\s*(?:" +
  "(?:" + MONTH_NAMES + ")\\.?\\s*)?(?:\\d{4}|present|current|till now)",
  "i"
);
const YEAR_RANGE_RE = /(\d{4})\s*[-–to]+\s*(present|current|till now|\d{4})/i;
const SINGLE_DATE_RE = new RegExp("(?:" + MONTH_NAMES + ")\\.?\\s*(\\d{4})", "i");
const YEAR_ONLY_RE = /\b(19\d{2}|20[01]\d|202[0-6])\b/;

export function getMonthIndex(month: string): number {
  const m = month.toLowerCase().substring(0, 3);
  return MONTH_MAP[m] ?? 0;
}

export function formatDate(d: Date): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return months[d.getMonth()] + " " + d.getFullYear();
}

export function extractEndYear(duration: string): number {
  if (!duration) return 0;
  const lower = duration.toLowerCase();
  if (/\b(present|current|till now|ongoing)\b/.test(lower)) return 9999;
  const m = duration.match(/(\d{4})\s*$/);
  return m ? parseInt(m[1], 10) : 0;
}

export function parseDateRange(text: string): { duration: string; startYear: string } | null {
  const drMatch = text.match(YEAR_RANGE_RE);
  const dateRangeMatch = drMatch ? null : text.match(DATE_RANGE_RE);
  const matched = (drMatch || dateRangeMatch);
  if (matched) {
    const duration = matched[0];
    const sy = duration.match(/(\d{4})/);
    const startYear = sy ? sy[1] : "";
    return { duration, startYear };
  }
  return null;
}

export function findYearInText(text: string): string {
  const m = text.match(YEAR_ONLY_RE);
  return m ? m[1] : "";
}

export function parseSingleDate(text: string): string {
  const m = text.match(SINGLE_DATE_RE);
  if (m) return m[0];
  const y = findYearInText(text);
  if (y) return y;
  return "";
}

export function formatYearRange(text: string): string {
  const m = text.match(/(\d{4})\s*[-–]+\s*(\d{4}|present|current|till now)/i);
  if (m) return m[1] + " - " + m[2];
  return text;
}
