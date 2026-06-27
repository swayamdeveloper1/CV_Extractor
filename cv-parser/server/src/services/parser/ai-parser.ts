import { Candidate } from "../../types";
import { DEGREE_LOOKUP } from "../../data/role-data";

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

function cleanQualification(q: string): string {
  for (const degree of DEGREE_LOOKUP) {
    const re = new RegExp("\\b" + degree.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "i");
    if (re.test(q)) return degree;
  }
  return "";
}

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

export async function parseWithGemini(text: string, fileName: string): Promise<Candidate> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API key not configured. Set GEMINI_API_KEY in .env");
  }

  if (!text || text.length < 20) {
    throw new Error("Gemini: extracted text is too short or empty");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const body = {
    contents: [
      { parts: [{ text: SYSTEM_PROMPT + "\n\n---\n\n" + text.substring(0, 30000) }] },
    ],
    generationConfig: { temperature: 0.1, maxOutputTokens: 500 },
  };

  let responseText: string;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    console.log("Gemini HTTP status:", res.status);
    responseText = await res.text();

    if (!res.ok) {
      console.error("Gemini API error:", responseText);
      throw new Error("Gemini API failed with status " + res.status);
    }
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("Gemini API failed")) throw err;
    console.error("Gemini fetch failed:", err);
    throw new Error("Gemini API request failed: " + (err instanceof Error ? err.message : err));
  }

  console.log("Gemini raw response:", responseText);

  let data: any;
  try {
    data = JSON.parse(responseText);
  } catch (err) {
    console.error("Gemini JSON parse failed:", responseText);
    throw new Error("Invalid JSON returned by Gemini model");
  }

  const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) {
    console.error("Gemini unexpected structure:", JSON.stringify(data, null, 2));
    throw new Error("Gemini: unexpected response structure from model");
  }

  const cleaned = content.replace(/```(?:json)?\s*([\s\S]*?)```/g, "$1").trim();
  console.log("Gemini content before JSON.parse:", cleaned);

  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    console.error("Gemini content JSON parse failed:", cleaned);
    throw new Error("Invalid JSON returned by Gemini model");
  }

  return buildCandidate(fileName, parsed);
}
