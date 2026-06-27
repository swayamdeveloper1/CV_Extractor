import { config } from "../config";

const EXA_API_URL = "https://api.exa.ai/search";

interface ExaResult {
  title: string;
  url: string;
  text?: string;
}

interface ExaResponse {
  results: ExaResult[];
}

/**
 * Uses Exa search API to look up employer/company info for a candidate.
 * Only activates when EXA_API_KEY is configured in env.
 * Returns a partial { employer, location } or null.
 */
export async function exaLookup(name: string, designation: string): Promise<{ employer?: string; location?: string } | null> {
  const apiKey = config.exaApiKey;
  if (!apiKey) return null;

  const query = `${name} ${designation} resume LinkedIn`.trim();
  if (!name) return null;

  try {
    const res = await fetch(EXA_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        query,
        type: "keyword",
        numResults: 3,
        contents: { text: { maxLength: 500 } },
      }),
    });

    if (!res.ok) return null;

    const data = await res.json() as ExaResponse;
    if (!data.results || data.results.length === 0) return null;

    const combined = data.results.map(r => `${r.title} ${r.text || ""}`).join(" ");
    const lower = combined.toLowerCase();

    let employer: string | undefined;
    let location: string | undefined;

    // Try to extract company from search results
    const companyIndicators = [
      /(?:at|@|currently\s+(?:working\s+)?(?:at|with|for))\s+(.+?)(?:\.|,|\||$)/i,
      /(?:^|[\s,])([A-Z][A-Za-z0-9\s&.]+?(?:Ltd|LLP|Inc|Corp|Technologies|Services|Solutions|Construction|Infra|Engineering|Group))\b/i,
    ];

    for (const line of data.results) {
      const full = `${line.title} ${line.text || ""}`;
      for (const indicator of companyIndicators) {
        const m = full.match(indicator);
        if (m && m[1].trim().length > 2) {
          const candidate = m[1].trim();
          if (!/engineer|developer|manager|analyst/i.test(candidate) && candidate.length < 60) {
            employer = candidate;
            break;
          }
        }
      }
      if (employer) break;
    }

    // Try to extract location
    const locationPattern = /(?:based\s+in|located\s+in|from)\s+([A-Z][a-zA-Z\s]+?)(?:\.|,|\||$)/i;
    for (const line of data.results) {
      const m = line.text?.match(locationPattern);
      if (m && m[1].trim().length > 2 && m[1].trim().length < 30) {
        location = m[1].trim();
        break;
      }
    }

    if (employer || location) return { employer, location };
    return null;
  } catch {
    return null;
  }
}
