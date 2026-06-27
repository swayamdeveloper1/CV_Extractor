import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import { config } from "./config";
import authRouter from "./routes/auth";
import resumesRouter from "./routes/resumes";

const app = express();

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRouter);
app.use("/api/resumes", resumesRouter);

app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Server error:", err.message);
  res.status(500).json({ error: err.message || "Internal server error" });
});

app.listen(config.port, () => {
  console.log(`Server running on http://localhost:${config.port}`);
  // console.log(`GEMINI_API_KEY configured: ${process.env.GEMINI_API_KEY ? "yes" : "no"}`);
  // console.log(`OPENROUTER_API_KEY configured: ${process.env.OPENROUTER_API_KEY ? "yes" : "no"}`);
});
