const DOB_LABELS = [
  "date of birth",
  "dob",
  "birth date",
  "born",
];

const DATE_PATTERNS = [
  // 12/03/1998, 12-03-1998, 12.03.1998
  /\b(0?[1-9]|[12][0-9]|3[01])[\/.-](0?[1-9]|1[0-2])[\/.-](19\d{2}|20\d{2})\b/,

  // 1998-03-12
  /\b(19\d{2}|20\d{2})-(0?[1-9]|1[0-2])-(0?[1-9]|[12][0-9]|3[01])\b/,

  // 12 March 1998
  /\b(0?[1-9]|[12][0-9]|3[01])\s+(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec),?\s+(19\d{2}|20\d{2})\b/i,

  // March 12, 1998
  /\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(0?[1-9]|[12][0-9]|3[01]),?\s+(19\d{2}|20\d{2})\b/i,
];

export function extractDOB(text: string): string {

    const lower = text.toLowerCase();

    for (const label of DOB_LABELS) {

        const index = lower.indexOf(label);

        if (index !== -1) {

            const next = text.substring(index, index + 80);

            for (const pattern of DATE_PATTERNS) {

                const m = next.match(pattern);

                if (m) return m[0];
            }
        }
    }

    return "Not Found";
}