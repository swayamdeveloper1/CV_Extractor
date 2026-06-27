import fs from "fs";
import os from "os";
import { Router, Request, Response } from "express";
import path from "path";
import AdmZip from "adm-zip";
import { authMiddleware } from "../middleware/auth";
import { uploadMiddleware } from "../middleware/upload";
import { parseResume } from "../services/parser";
import { storage } from "../services/storage";
import { generateCSV } from "../utils/csv";
import { UploadResult } from "../types";
import { config } from "../config";
import { progressTracker } from "../services/progress";

const router = Router();
const ALLOWED_EXTS = new Set([".pdf", ".docx", ".txt"]);

router.use(authMiddleware);

function extractZip(zipPath: string, destDir: string): { filePath: string; origName: string }[] {
  const zip = new AdmZip(zipPath);
  const entries = zip.getEntries();
  const extracted: { filePath: string; origName: string }[] = [];
  for (const entry of entries) {
    if (entry.isDirectory) continue;
    const ext = path.extname(entry.entryName).toLowerCase();
    if (!ALLOWED_EXTS.has(ext)) continue;
    const safeName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}-${entry.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const outPath = path.join(destDir, safeName);
    const buff = entry.getData();
    fs.writeFileSync(outPath, buff);
    extracted.push({ filePath: outPath, origName: entry.name });
  }
  return extracted;
}

async function parseAllTargets(
  targets: { filePath: string; displayName: string }[],
  llmMode: boolean,
  openRouterApiKey: string,
  results: UploadResult[],
  successful: UploadResult[],
  sessionId?: string
): Promise<void> {
  const CONCURRENCY = Math.max(20, Math.min(100, os.cpus().length * 10));
  const parseOne = async (fp: string, name: string) => {
    try {
      const candidate = await parseResume(fp, name, llmMode, openRouterApiKey);
      if (!candidate) throw new Error("Failed to parse resume");
      const result: UploadResult = { success: true, data: candidate, fileName: name };
      results.push(result);
      successful.push(result);
    } catch (err: any) {
      console.error(`[Parse Failed] ${name}: ${err.message}`);
      results.push({ success: false, error: err.message, fileName: name });
    }
    if (sessionId) {
      progressTracker.update(sessionId, results.length, results.length - successful.length);
    }
  };
  for (let i = 0; i < targets.length; i += CONCURRENCY) {
    await Promise.all(targets.slice(i, i + CONCURRENCY).map((t) => parseOne(t.filePath, t.displayName)));
  }
}

router.post("/upload",
  // Init progress immediately when the request arrives (before multer)
  (req, _res, next) => {
    const sid = req.headers["x-session-id"] as string;
    if (sid) progressTracker.init(sid, 0);
    next();
  },
  uploadMiddleware.array("files", config.maxFileCount), async (req, res) => {
  const cleanupPaths: string[] = [];
  try {
    const files = req.files as Express.Multer.File[];
    // const llmMode = req.body?.llmMode === "true" || req.body?.llmMode === true;
    // const openRouterApiKey = (req.body?.openRouterApiKey as string) || "";
    const llmMode = false;
    const openRouterApiKey = "";
    const sessionId = req.headers["x-session-id"] as string;

    // console.log(`[Upload] llmMode=${llmMode}, openRouterKeyProvided=${openRouterApiKey.length > 0}, files=${files?.length}`);
    console.log(`[Upload] files=${files?.length}`);

    if (!files || files.length === 0) {
      res.status(400).json({ error: "No files uploaded" });
      return;
    }

    const results: UploadResult[] = [];
    const successful: UploadResult[] = [];
    const targets: { filePath: string; displayName: string }[] = [];

    for (const file of files) {
      const ext = path.extname(file.originalname).toLowerCase();
      cleanupPaths.push(file.path);

      if (ext === ".zip") {
        const zipDir = fs.mkdtempSync(path.join(os.tmpdir(), "cv-zip-"));
        cleanupPaths.push(zipDir);
        const extracted = extractZip(file.path, zipDir);

        for (const e of extracted) {
          targets.push({
            filePath: e.filePath,
            displayName: `${file.originalname} => ${e.origName}`,
          });
        }
      } else if (ALLOWED_EXTS.has(ext)) {
        targets.push({ filePath: file.path, displayName: file.originalname });
      }
    }

    // Update the total now that we know the real target count
    if (sessionId) progressTracker.updateTotal(sessionId, targets.length);
    await parseAllTargets(targets, llmMode, openRouterApiKey, results, successful, sessionId);

    for (const p of cleanupPaths) {
      try {
        if (fs.statSync(p).isDirectory()) { fs.rmSync(p, { recursive: true, force: true }); }
        else { fs.unlinkSync(p); }
      } catch { /* ignore */ }
    }

    storage.addMany(successful.map((r) => r.data!));

    if (sessionId) progressTracker.finish(sessionId);

    console.log(`[Upload] ${files.length} uploaded files → ${targets.length} parse targets → ${successful.length} ok, ${results.length - successful.length} failed`);

    res.json({
      results,
      total: results.length,
      successCount: successful.length,
      failCount: results.length - successful.length,
    });

  } catch (err: any) {
    console.error("UPLOAD ROUTE CRASH:", err);
    for (const p of cleanupPaths) {
      try {
        if (fs.statSync(p).isDirectory()) { fs.rmSync(p, { recursive: true, force: true }); }
        else { fs.unlinkSync(p); }
      } catch { /* ignore */ }
    }
    res.status(500).json({
      error: err.message || "Upload failed",
    });
  }
});
router.get("/", (_req: Request, res: Response): void => {
  const candidates = storage.getAll().map((c) => ({
    ...c,
    phone: sanitizePhone(c.phone),
  }));
  res.json({ candidates, total: candidates.length });
});

function sanitizePhone(phone: string): string {
  if (!phone) return "";
  let cleaned = phone.replace(/^[^\d+]+/, "");
  cleaned = cleaned.replace(/[^\d+\s.\-()]+$/, "");
  const digits = cleaned.replace(/[^\d]/g, "");
  if (digits.length < 10) return "";
  return cleaned;
}

router.get("/progress/:sessionId", (req: Request, res: Response): void => {
  const state = progressTracker.get(req.params.sessionId);
  if (!state) {
    res.json({ total: 0, completed: 0, failed: 0, status: "pending" });
    return;
  }
  res.json(state);
});

router.get("/export", (_req: Request, res: Response): void => {
  const candidates = storage.getAll();
  const csv = generateCSV(candidates);

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename=parsed-candidates-${Date.now()}.csv`);
  res.send(csv);
});

router.delete("/clear", (_req: Request, res: Response): void => {
  storage.clear();
  res.json({ message: "All candidates cleared" });
});

export default router;
