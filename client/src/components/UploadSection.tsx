import React, { useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  FileText,
  Download,
  Trash2,
  Sparkles,
  X,
} from "lucide-react";
import { ProgressState } from "../types";

interface Props {
  onUpload: (files: File[]) => Promise<void>;
  onDownloadCsv: () => Promise<void>;
  onClear: () => Promise<void>;
  loading: boolean;
  hasData: boolean;
  aiMode: boolean;
  onToggleAiMode: () => void;
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  progress: ProgressState | null;
}

export const UploadSection: React.FC<Props> = ({
  onUpload,
  onDownloadCsv,
  onClear,
  loading,
  hasData,
  aiMode,
  onToggleAiMode,
  apiKey,
  onApiKeyChange,
  progress,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [dragover, setDragover] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback((files: FileList | File[]) => {
    const valid = Array.from(files).filter(
      (f) => f.size <= 200 * 1024 * 1024 && /\.(pdf|docx|txt)$/i.test(f.name)
    );
    if (valid.length > 0) setSelectedFiles((prev) => [...prev, ...valid]);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragover(false);
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragover(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragover(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFiles(e.target.files);
    e.target.value = "";
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    await onUpload(selectedFiles);
    setSelectedFiles([]);
    if (fileRef.current) fileRef.current.value = "";
  };

  const progressPct =
    progress && progress.total > 0
      ? Math.round((progress.completed / progress.total) * 100)
      : 0;
  const isInitializing = loading && !progress;

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[18px] shadow-[var(--shadow-card)] p-6">
      {/* Header */}
      <div className="mb-5">
        <h2 className="text-[20px] font-semibold text-[var(--color-text)]">Upload Resumes</h2>
        <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
          PDF, DOCX, TXT &mdash; up to 10 MB each
        </p>
      </div>

      {/* Dropzone */}
      <motion.div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        animate={
          dragover
            ? { borderColor: "var(--color-primary)", backgroundColor: "var(--color-primary-light)" }
            : { borderColor: "#E5E7EB", backgroundColor: "rgba(0,0,0,0.015)" }
        }
        transition={{ duration: 0.15 }}
        className="relative border-2 border-dashed rounded-[16px] py-10 px-6 text-center cursor-pointer transition-colors min-h-[180px] flex items-center justify-center"
      >
        <input
          ref={fileRef}
          type="file"
          multiple
          accept=".pdf,.docx,.txt"
          onChange={handleChange}
          className="hidden"
        />

        <motion.div
          animate={dragover ? { y: -4, scale: 1.05 } : { y: 0, scale: 1 }}
          transition={{ duration: 0.2 }}
          onClick={() => fileRef.current?.click()}
        >
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--color-primary-light)] mb-4">
            <Upload size={24} className="text-[var(--color-primary)]" />
          </div>

          <p className="text-base font-semibold text-[var(--color-text)] mb-1">
            {selectedFiles.length > 0
              ? `${selectedFiles.length} file(s) selected`
              : "Drop files here or click to browse"}
          </p>
          <p className="text-xs text-[var(--color-muted)]">
            Supported: <span className="font-medium text-[var(--color-text-secondary)]">.pdf</span>{" "}
            <span className="font-medium text-[var(--color-text-secondary)]">.docx</span>{" "}
            <span className="font-medium text-[var(--color-text-secondary)]">.txt</span> (max 10 MB)
          </p>
        </motion.div>

        {/* Selected Files */}
        <AnimatePresence>
          {selectedFiles.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 flex flex-wrap gap-2 justify-center"
            >
              {selectedFiles.slice(0, 15).map((f, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-primary-light)] text-[var(--color-primary)] text-xs font-medium rounded-full border border-[var(--color-primary-border)]"
                >
                  <FileText size={12} />
                  {f.name.length > 25 ? f.name.substring(0, 22) + "..." : f.name}
                  <button
                    onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                    className="ml-0.5 hover:text-[var(--color-danger)] transition-colors cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </motion.span>
              ))}
              {selectedFiles.length > 15 && (
                <span className="inline-flex items-center px-3 py-1.5 bg-[var(--color-black-003)] text-[var(--color-muted)] text-xs font-medium rounded-full">
                  +{selectedFiles.length - 15} more
                </span>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Action Buttons Row */}
      <div className="flex items-center justify-between mt-5 flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <motion.button
            onClick={handleUpload}
            disabled={loading || selectedFiles.length === 0}
            whileHover={loading || selectedFiles.length === 0 ? {} : { y: -2 }}
            whileTap={loading || selectedFiles.length === 0 ? {} : { scale: 0.98 }}
            className="btn-base bg-[var(--color-primary)] text-white shadow-[var(--shadow-primary)] hover:shadow-[var(--shadow-primary-hover)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:transform-none"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Parsing...
              </>
            ) : (
              <>
                <Upload size={16} />
                Upload &amp; Parse
              </>
            )}
          </motion.button>

          <motion.button
            onClick={onDownloadCsv}
            disabled={loading || !hasData}
            whileHover={loading || !hasData ? {} : { y: -2 }}
            whileTap={loading || !hasData ? {} : { scale: 0.98 }}
            className="btn-base bg-[var(--color-success)] text-white shadow-[var(--shadow-success)] hover:shadow-[var(--shadow-primary-hover)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:transform-none"
          >
            <Download size={16} />
            Download CSV
          </motion.button>

          {hasData && (
            <motion.button
              onClick={onClear}
              disabled={loading}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="btn-base bg-[var(--color-danger)] text-white shadow-[var(--shadow-danger)] hover:shadow-[var(--shadow-primary-hover)] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Trash2 size={16} />
              Clear All
            </motion.button>
          )}
        </div>

        {/* AI Toggle — commented out */}
        {/*
        <div className="flex items-center gap-3 ml-auto">
          <motion.div
            onClick={onToggleAiMode}
            className={`w-[48px] h-[26px] rounded-full relative cursor-pointer transition-all duration-300 ${
              aiMode ? "bg-[var(--color-primary)]" : "bg-[var(--color-muted)]"
            }`}
          >
            <motion.div
              animate={aiMode ? { x: 22 } : { x: 3 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="absolute top-[3px] w-5 h-5 bg-white rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
            />
          </motion.div>
          <span
            className={`text-sm font-semibold transition-colors duration-300 ${
              aiMode ? "text-[var(--color-primary)]" : "text-[var(--color-text-secondary)]"
            }`}
          >
            <Sparkles size={14} className="inline mr-1" />
            AI Mode
          </span>
        </div>
        */}
      </div>

      {/* AI API Key — commented out */}
      {/*
      <AnimatePresence>
        {aiMode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
              <label className="flex items-center gap-3 text-sm text-[var(--color-text-secondary)] flex-wrap">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                OpenRouter API Key
                <input
                  type="password"
                  placeholder="sk-or-v1-..."
                  value={apiKey}
                  onChange={(e) => onApiKeyChange(e.target.value)}
                  className="flex-1 min-w-[200px] px-4 py-2.5 border border-[var(--color-border)] rounded-[10px] text-sm outline-none bg-[var(--color-surface)] text-[var(--color-text)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary)] focus:shadow-[var(--focus-ring-primary)] transition-all duration-150"
                />
              </label>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      */}

      {/* Progress */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="mt-4 p-4 bg-[var(--color-black-003)] rounded-[10px] border border-[var(--color-primary-border)]"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-[var(--color-text)]">
                {isInitializing
                  ? "Uploading files..."
                  : progress && progress.total > 0
                  ? `Parsing ${progress.completed} / ${progress.total} files...`
                  : `Preparing ${progress ? progress.completed : 0} files...`}
              </span>
              {progress && progress.total > 0 && (
                <span className="text-lg font-bold text-[var(--color-primary)] tabular-nums">
                  {progressPct}%
                </span>
              )}
            </div>
            <div className="w-full h-2 bg-[var(--color-black-005)] rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPct || 5}%` }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="h-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-hover)] rounded-full"
              />
            </div>
            {progress && progress.total > 0 && (
              <div className="flex items-center gap-4 mt-2 text-xs text-[var(--color-muted)]">
                <span className="font-medium text-[var(--color-text-secondary)]">
                  {progress.completed} / {progress.total} files
                </span>
                {progress.failed > 0 && (
                  <span className="text-[var(--color-danger)]">{progress.failed} failed</span>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
