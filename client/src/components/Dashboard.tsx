import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, FileText, Sun, Moon } from "lucide-react";
import { Candidate, ProgressState } from "../types";
import { startUpload, generateSessionId, getCandidates, downloadCsv, clearCandidates, pollProgress } from "../services/api";
import { UploadSection } from "./UploadSection";
import { CandidatesTable } from "./CandidatesTable";
import { useTheme } from "../contexts/ThemeContext";

interface Props {
  user: { name: string };
  onLogout: () => void;
}

export const Dashboard: React.FC<Props> = ({ user, onLogout }) => {
  const { theme, toggleTheme } = useTheme();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [aiMode, setAiMode] = useState(false);
  const [openRouterApiKey, setOpenRouterApiKey] = useState("");
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchCandidates = useCallback(async () => {
    try {
      const res = await getCandidates();
      setCandidates(res.candidates);
    } catch {}
  }, []);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const handleUpload = async (files: File[]) => {
    setLoading(true);
    setMessage(null);

    const sessionId = generateSessionId();

    const uploadPromise = startUpload(files, sessionId, aiMode, openRouterApiKey);

    pollRef.current = setInterval(async () => {
      try {
        const state = await pollProgress(sessionId);
        if (state.status !== "pending") {
          setProgress(state);
          if (state.status === "done" || state.status === "error" || state.completed >= state.total) {
            if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
          }
        }
      } catch {}
    }, 200);

    try {
      const { data: response } = await uploadPromise;
      await fetchCandidates();
      if (response.failCount > 0) {
        setMessage({
          type: "error",
          text: `Parsed ${response.successCount}/${response.total} files. ${response.failCount} failed.`,
        });
      } else {
        setMessage({
          type: "success",
          text: `Successfully parsed ${response.successCount} file(s).`,
        });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.response?.data?.error || "Upload failed" });
    } finally {
      setLoading(false);
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      setProgress(null);
    }
  };

  const handleDownloadCsv = async () => {
    setLoading(true);
    setMessage(null);
    try {
      await downloadCsv();
      setMessage({ type: "success", text: "CSV downloaded successfully." });
    } catch {
      setMessage({ type: "error", text: "CSV download failed." });
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    setLoading(true);
    setMessage(null);
    try {
      await clearCandidates();
      setCandidates([]);
      setMessage({ type: "success", text: "All candidates cleared." });
    } catch {
      setMessage({ type: "error", text: "Failed to clear candidates." });
    } finally {
      setLoading(false);
    }
  };

  const hasData = candidates.length > 0;

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {/* Navbar */}
      <nav className="h-[70px] bg-[var(--color-navbar)] flex items-center justify-between px-8 sticky top-0 z-50 border-b border-[var(--color-white-006-border)]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[var(--color-primary)] rounded-[10px] flex items-center justify-center shadow-[var(--shadow-primary-lg)]">
            <FileText size={18} className="text-white" />
          </div>
          <span className="text-white text-[22px] font-semibold tracking-tight">CV Parser</span>
        </div>

        <div className="flex items-center gap-4">
          {/* Theme Toggle */}
          <motion.button
            onClick={toggleTheme}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="w-9 h-9 flex items-center justify-center bg-[var(--color-white-006)] hover:bg-[var(--color-white-01)] text-[var(--color-navbar-text)] rounded-[10px] transition-all duration-150 cursor-pointer border-none"
            title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          >
            {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
          </motion.button>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-[var(--color-primary)] rounded-[10px] flex items-center justify-center text-white font-bold text-sm">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <span className="text-[var(--color-navbar-text)] text-sm font-medium hidden sm:block">{user.name}</span>
          </div>
          <motion.button
            onClick={onLogout}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-1.5 px-4 py-2 bg-[var(--color-white-006)] hover:bg-[var(--color-white-01)] text-[var(--color-navbar-text)] text-sm font-medium rounded-[10px] transition-all duration-150 cursor-pointer border-none"
          >
            <LogOut size={15} />
            Logout
          </motion.button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-[1280px] mx-auto px-8 py-8 space-y-6">
        <AnimatePresence mode="wait">
          {message && (
            <motion.div
              key="msg"
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className={`px-5 py-3.5 rounded-[10px] text-sm font-medium flex items-center gap-2.5 ${
                message.type === "success"
                  ? "bg-[var(--color-success-light)] border border-[var(--color-border)] text-[var(--color-success)]"
                  : "bg-[var(--color-danger-light)] border border-[var(--color-danger-border)] text-[var(--color-danger)]"
              }`}
            >
              {message.text}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <UploadSection
            onUpload={handleUpload}
            onDownloadCsv={handleDownloadCsv}
            onClear={handleClear}
            loading={loading}
            hasData={hasData}
            aiMode={aiMode}
            onToggleAiMode={() => setAiMode(!aiMode)}
            apiKey={openRouterApiKey}
            onApiKeyChange={setOpenRouterApiKey}
            progress={progress}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          <CandidatesTable candidates={candidates} loading={loading} />
        </motion.div>
      </div>
    </div>
  );
};
