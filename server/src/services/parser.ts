import { Candidate } from "../types";
import { DESIGNATION_LOOKUP } from "../data/role-data";
import { LOCATION_LOOKUP } from "../data/location-data";
import { preprocess } from "./parser/preprocess";
import { detectSections, getContactHeader, getSectionText, getSectionLines, SectionBoundary } from "./parser/sectionDetector";
import { extractName, extractEmail, extractPhone, extractAddress, parseHeader } from "./parser/headerParser";
import { extractExperience, extractWorkingSince, extractTotalExperience, extractEmployer } from "./parser/experienceParser";
import { extractQualification, extractEducation } from "./parser/educationParser";
import { extractLabel, getLines } from "./parser/validators";
import { extractDOB } from "./parser/dobParser";
import { applySmartFallbacks } from "./parser/smartFallback";
import { extractText } from "./parser/textExtractor";
// import { parseWithAIFallback } from "./parser/ai-router";

function extractDesignation(text: string, contactLines: string[]): string {
  const allLines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const labeled = (() => {
    const re = new RegExp("^\\s*(?:designation|current designation|position|current position|role|title|job title|job role)\\s*[:\\-]\\s*[-:]?\\s*(.+)", "i");
    for (const line of allLines) {
      const m = line.match(re);
      if (m) {
        for (const title of DESIGNATION_LOOKUP) {
          const r = new RegExp("\\b" + title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "i");
          if (r.test(m[1])) return title;
        }
      }
    }
    return "";
  })();
  if (labeled) return labeled;

  for (const line of contactLines) {
    for (const title of DESIGNATION_LOOKUP) {
      const r = new RegExp("\\b" + title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "i");
      if (r.test(line)) return title;
    }
  }

  for (let i = 0; i < Math.min(80, allLines.length); i++) {
    const line = allLines[i];
    if (line.length > 200) continue;
    for (const title of DESIGNATION_LOOKUP) {
      const r = new RegExp("\\b" + title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "i");
      if (r.test(line)) return title;
    }
  }

  return "";
}

function findLocationInText(text: string): string {
  for (const place of LOCATION_LOOKUP) {
    const re = new RegExp("\\b" + place.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "i");
    if (re.test(text)) return place;
  }
  return "";
}

function extractLocation(text: string, contactLines: string[], boundaries: Map<string, SectionBoundary>): string {
  const headerText = contactLines.join(" ");
  const contactPlace = findLocationInText(headerText);
  if (contactPlace) return contactPlace;

  const addr = extractAddress(text, contactLines);
  if (addr) {
    const addrPlace = findLocationInText(addr);
    if (addrPlace) return addrPlace;
  }

  const labeled = extractLabel(contactLines, "location|city|place|current location|current city|current address");
  if (labeled) {
    const labeledPlace = findLocationInText(labeled);
    if (labeledPlace) return labeledPlace;
  }

  const expText = getSectionText(text, boundaries, ["experience", "work experience", "employment", "work history"]);
  if (expText) {
    const first500 = expText.substring(0, 500);
    const expPlace = findLocationInText(first500);
    if (expPlace) return expPlace;
  }

  return findLocationInText(text);
}

export async function parseResume(filePath: string, fileName: string, llmMode: boolean = false, openRouterApiKey?: string): Promise<Candidate> {

  // LLM mode — commented out
  // if (!llmMode) {
  //   return parseWithRegex(filePath, fileName);
  // }
  // const result = await parseWithAIFallback(filePath, fileName, openRouterApiKey);
  // if (result) return result;
  // console.log("AI parsers failed — falling back to regex parser");

  return parseWithRegex(filePath, fileName);
}

async function parseWithRegex(filePath: string, fileName: string): Promise<Candidate> {

  const rawText = await extractText(filePath, fileName);
  const cleanText = preprocess(rawText);

  // console.log("\n====================================");
  // console.log("FILE:", fileName);
  // console.log("RAW TEXT LENGTH:", rawText.length);
  // console.log("CLEAN TEXT LENGTH:", cleanText.length);
  // console.log(cleanText.substring(0, 1500));

  // const rawText = await extractText(filePath, fileName);
  // const cleanText = preprocess(rawText);
  const boundaries = detectSections(cleanText);
  const contactLines = getContactHeader(cleanText, boundaries);
  const experience = extractExperience(cleanText, boundaries);

  // Parse header FIRST
  // const header = parseHeader(contactLines);

  const candidate: Candidate = {
    fileName,

    name: extractName(contactLines, cleanText),

    email: extractEmail(cleanText),

    phone: extractPhone(cleanText),

    designation: extractDesignation(cleanText, contactLines),

    employer: extractEmployer(cleanText, experience, boundaries),
    address: extractAddress(cleanText, contactLines),
    workingSince: extractWorkingSince(experience),
    totalExperience: extractTotalExperience(
      experience,
      cleanText,
      contactLines
    ),
    location: extractLocation(cleanText, contactLines, boundaries),
    qualification: extractQualification(cleanText, getSectionLines(cleanText, boundaries, ["education", "academic background", "qualifications", "educational qualifications", "academic qualifications", "education qualifications"])),
    dateOfBirth: extractDOB(cleanText),
  };

  applySmartFallbacks(candidate, cleanText, contactLines, experience);

  if ((!candidate.employer || !candidate.location) && candidate.name) {
    try {
      const { exaLookup } = await import("./exa-fallback");
      const exaData = await exaLookup(candidate.name, candidate.designation);
      if (exaData) {
        if (!candidate.employer && exaData.employer) candidate.employer = exaData.employer;
        if (!candidate.location && exaData.location) candidate.location = exaData.location;
      }
    } catch { /* exa not available */ }
  }

  return candidate;
}
