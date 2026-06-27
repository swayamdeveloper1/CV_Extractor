import fs from "fs";
import path from "path";

export async function extractText(filePath: string, fileName: string): Promise<string> {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === ".txt") return fs.readFileSync(filePath, "utf-8");
  if (ext === ".pdf") {
    try {
      const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.mjs");
      const buffer = new Uint8Array(fs.readFileSync(filePath));
      const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
      let finalText = "";
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const content = await page.getTextContent();
        const rows: Record<number, string[]> = {};
        for (const item of content.items as any[]) {
          if (!("str" in item)) continue;
          const y = Math.round(item.transform[5]);
          if (!rows[y]) rows[y] = [];
          rows[y].push(item.str);
        }
        const ordered = Object.keys(rows).map(Number).sort((a, b) => b - a);
        for (const y of ordered) {
          finalText += rows[y].join(" ");
          finalText += "\n";
        }
        finalText += "\n";
      }
      return finalText;
    } catch (err) {
      throw new Error("PDF extraction failed: " + (err instanceof Error ? err.message : err));
    }
  }
  if (ext === ".docx") {
    try {
      const mammoth = require("mammoth");
      const data = await mammoth.extractRawText({ buffer: fs.readFileSync(filePath) });
      return data.value || "";
    } catch (err) {
      throw new Error("DOCX extraction failed: " + (err instanceof Error ? err.message : err));
    }
  }
  throw new Error("Unsupported file type: " + ext);
}
