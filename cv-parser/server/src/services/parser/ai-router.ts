import { Candidate } from "../../types";
import { extractText } from "./textExtractor";
import { parseWithGemini } from "./ai-parser";
import { parseWithOpenRouter } from "../ai-parser";

export async function parseWithAIFallback(
  filePath: string,
  fileName: string,
  openRouterApiKey?: string
): Promise<Candidate | null> {
  let text: string;
  try {
    text = await extractText(filePath, fileName);
  } catch (err) {
    console.error("Text extraction failed:", (err as Error).message);
    return null;
  }

  const key = (openRouterApiKey || "").trim();

  if (key.length > 0) {
    console.log("Selected provider: OpenRouter");
    console.log("OpenRouter key supplied: yes");
    try {
      const result = await parseWithOpenRouter(text, fileName, key);
      console.log("OpenRouter parsing succeeded");
      return result;
    } catch (err) {
      console.log("OpenRouter error:", (err as Error).message);
      console.log("OpenRouter failed — falling back to Gemini");
    }
  } else {
    console.log("Selected provider: Gemini");
    console.log("OpenRouter key supplied: no");
  }

  console.log("Backend Gemini key loaded:", process.env.GEMINI_API_KEY ? "yes" : "no");

  try {
    const result = await parseWithGemini(text, fileName);
    console.log("Gemini parsing succeeded");
    return result;
  } catch (err) {
    console.log("Gemini error:", (err as Error).message);
    console.log("Gemini failed — falling back to regex parser");
    return null;
  }
}
