import { Candidate } from "../types";
import { DEGREE_LOOKUP } from "../data/role-data";

function cleanQualification(q: string): string {
  for (const degree of DEGREE_LOOKUP) {
    const re = new RegExp("\\b" + degree.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "i");
    if (re.test(q)) return degree;
  }
  return "";
}

const SYSTEM_PROMPT = `You are an expert ATS resume parser.

Extract every possible field from the resume.

Return ONLY valid JSON.

Never explain anything.

Return empty string if information is unavailable.

JSON schema:
{
"name":"",
"email":"",
"phone":"",
"designation":"",
"employer":"",
"address":"",
"workingSince":"",
"totalExperience":"",
"location":"",
"qualification":"",
"dateOfBirth":""
}`;

function buildCandidate(fileName: string, parsed: any): Candidate {
  return {
    fileName,
    name: typeof parsed.name === "string" ? parsed.name.trim() : "",
    email: typeof parsed.email === "string" ? parsed.email.trim() : "",
    phone: typeof parsed.phone === "string" ? parsed.phone.trim() : "",
    designation: typeof parsed.designation === "string" ? parsed.designation.trim() : "",
    employer: typeof parsed.employer === "string" ? parsed.employer.trim() : "",
    address: typeof parsed.address === "string" ? parsed.address.trim() : "",
    workingSince: typeof parsed.workingSince === "string" ? parsed.workingSince.trim() : "",
    totalExperience: typeof parsed.totalExperience === "string" ? parsed.totalExperience.trim() : "",
    location: typeof parsed.location === "string" ? parsed.location.trim() : "",
    qualification: typeof parsed.qualification === "string" ? cleanQualification(parsed.qualification.trim()) : "",
    dateOfBirth: typeof parsed.dateOfBirth === "string" ? parsed.dateOfBirth.trim() : "Not Found",
  };
}

export async function parseWithOpenRouter(text: string, fileName: string, apiKey: string): Promise<Candidate> {
  if (!apiKey || !apiKey.trim()) {
    throw new Error("OpenRouter authentication failed: no API key provided");
  }

  if (!text || text.length < 20) {
    throw new Error("OpenRouter: extracted text is too short or empty");
  }

  const body = {
    model: "openrouter/auto",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: text.substring(0, 30000) },
    ],
    temperature: 0.1,
    max_tokens: 500,
  };

  let responseText: string;
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + apiKey.trim(),
        "HTTP-Referer": "http://localhost:5000",
        "X-Title": "CV Parser",
      },
      body: JSON.stringify(body),
    });

    console.log("OpenRouter HTTP status:", res.status);
    responseText = await res.text();

    if (!res.ok) {
      console.error("OpenRouter API error:", responseText);
      if (res.status === 401) {
        throw new Error("OpenRouter authentication failed: invalid API key");
      }
      throw new Error("OpenRouter API failed with status " + res.status);
    }
  } catch (err) {
    if (err instanceof Error && (err.message.startsWith("OpenRouter authentication") || err.message.startsWith("OpenRouter API failed"))) throw err;
    console.error("OpenRouter fetch failed:", err);
    throw new Error("OpenRouter API request failed: " + (err instanceof Error ? err.message : err));
  }

  console.log("OpenRouter raw response:", responseText);

  let data: any;
  try {
    data = JSON.parse(responseText);
  } catch (err) {
    console.error("OpenRouter JSON parse failed:", responseText);
    throw new Error("Invalid JSON returned by OpenRouter model");
  }

  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    console.error("OpenRouter unexpected structure:", JSON.stringify(data, null, 2));
    throw new Error("OpenRouter: unexpected response structure from model");
  }

  const cleaned = content.replace(/```(?:json)?\s*([\s\S]*?)```/g, "$1").trim();
  console.log("OpenRouter content before JSON.parse:", cleaned);

  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    console.error("OpenRouter content JSON parse failed:", cleaned);
    throw new Error("Invalid JSON returned by OpenRouter model");
  }

  return buildCandidate(fileName, parsed);
}
