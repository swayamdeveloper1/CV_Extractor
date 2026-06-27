import { extractText } from "./server/src/services/parser/textExtractor";
import { parseWithAIFallback } from "./server/src/services/parser/ai-router";
import { parseResume } from "./server/src/services/parser";

async function main() {
  const testFile = "./server/uploads/good-resume.txt";

  // Test 1: Text extraction
  console.log("=== Test 1: Text extraction ===");
  try {
    const text = await extractText(testFile, "good-resume.txt");
    console.log("Text extracted successfully, length:", text.length);
    console.log("First 500 chars:", text.substring(0, 500));
  } catch (e) {
    console.error("Text extraction FAILED:", (e as Error).message);
  }

  // Test 2: AI mode with no OpenRouter key -> Gemini -> fallback to regex
  console.log("\n=== Test 2: AI mode, no OpenRouter key ===");
  try {
    const result1 = await parseWithAIFallback(testFile, "good-resume.txt", "");
    console.log("Result:", result1 ? JSON.stringify(result1, null, 2) : "null (falls back to regex)");
  } catch (e) {
    console.error("FAILED:", (e as Error).message);
  }

  // Test 3: AI mode with fake OpenRouter key -> OpenRouter fails -> Gemini -> fallback to regex
  console.log("\n=== Test 3: AI mode with fake OpenRouter key ===");
  try {
    const result2 = await parseWithAIFallback(testFile, "good-resume.txt", "sk-fake-key");
    console.log("Result:", result2 ? JSON.stringify(result2, null, 2) : "null (falls back to regex)");
  } catch (e) {
    console.error("FAILED:", (e as Error).message);
  }

  // Test 4: Regex mode directly
  console.log("\n=== Test 4: Regex parser ===");
  try {
    const candidate = await parseResume(testFile, "good-resume.txt", false);
    console.log("Candidate:", JSON.stringify(candidate, null, 2));
  } catch (e) {
    console.error("FAILED:", (e as Error).message);
  }
}

main().catch((e) => console.error("Error:", e));
