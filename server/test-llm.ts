require("dotenv").config();

const { extractEmail } = require("./src/services/parser/headerParser");
const { parseResume } = require("./src/services/parser");

async function main() {
  const testFile = "./uploads/good-resume.txt";

  console.log("=== Test: Email extraction fix ===");

  // Simulate the scenario where "Ahmedabad" is on one line and email on next
  const testText = "Site Engineer | Ahmedabad\nrajesh.patel@gmail.com\n+919876543210";
  const email = extractEmail(testText);
  console.log("Test input:\n" + testText);
  console.log("Extracted email:", email);
  console.log("Expected: rajesh.patel@gmail.com");
  console.log("Pass:", email === "rajesh.patel@gmail.com" ? "YES" : "NO");

  // Test with the real resume
  console.log("\n=== Test: Full regex parse ===");
  try {
    const candidate = await parseResume(testFile, "good-resume.txt", false);
    console.log("Name:", candidate.name);
    console.log("Email:", candidate.email);
    console.log("Phone:", candidate.phone);
    console.log("Designation:", candidate.designation);
    console.log("Employer:", candidate.employer);
    console.log("Location:", candidate.location);
    console.log("Qualification:", candidate.qualification);
  } catch (e) {
    console.error("FAILED:", (e as Error).message);
  }
}

main().catch((e) => console.error("Error:", e));
