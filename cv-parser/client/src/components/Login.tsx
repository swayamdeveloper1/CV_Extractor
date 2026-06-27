import React, { useState } from "react";
import { motion } from "framer-motion";
import { LogIn, Eye, EyeOff } from "lucide-react";

interface Props {
  onLogin: (username: string, password: string) => Promise<void>;
}

export const Login: React.FC<Props> = ({ onLogin }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!username.trim() || !password.trim()) {
      setError("Please enter username and password");
      return;
    }
    setLoading(true);
    try {
      await onLogin(username, password);
    } catch (err: any) {
      setError(err.response?.data?.error || "Login failed. Check credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[400px] bg-[var(--color-surface)] rounded-[18px] shadow-[var(--shadow-card)] p-10 border border-[var(--color-border)]"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.4, ease: "easeOut" }}
          className="w-14 h-14 bg-[var(--color-primary)] rounded-[14px] flex items-center justify-center mx-auto mb-5 shadow-[var(--shadow-primary-lg)]"
        >
          <span className="text-white text-2xl font-extrabold tracking-tight">CV</span>
        </motion.div>

        <h1 className="text-center text-[22px] font-semibold text-[var(--color-text)] mb-1">
          CV Parser
        </h1>
        <p className="text-center text-sm text-[var(--color-text-secondary)] mb-8">
          Sign in to manage resumes
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="username" className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5 uppercase tracking-wide">
              Username
            </label>
            <input
              id="username"
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              className="w-full px-4 py-3 border border-[var(--color-border)] rounded-[10px] text-sm outline-none transition-all duration-150 bg-[var(--color-surface)] text-[var(--color-text)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary)] focus:shadow-[var(--focus-ring-primary)]"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5 uppercase tracking-wide">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPw ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 pr-10 border border-[var(--color-border)] rounded-[10px] text-sm outline-none transition-all duration-150 bg-[var(--color-surface)] text-[var(--color-text)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary)] focus:shadow-[var(--focus-ring-primary)]"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)] hover:text-[var(--color-text-secondary)] transition-colors cursor-pointer"
                tabIndex={-1}
              >
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-[var(--color-danger-light)] border border-[var(--color-danger-border)] rounded-[10px] text-sm text-[var(--color-danger)]"
            >
              {error}
            </motion.div>
          )}

          <motion.button
            type="submit"
            disabled={loading}
            whileHover={loading ? {} : { scale: 1.02 }}
            whileTap={loading ? {} : { scale: 0.98 }}
            className="w-full py-3 bg-[var(--color-primary)] text-white font-semibold rounded-[10px] text-sm shadow-[var(--shadow-primary-btn)] hover:shadow-[var(--shadow-primary-hover)] transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Signing in...
              </>
            ) : (
              <>
                <LogIn size={16} />
                Sign In
              </>
            )}
          </motion.button>
        </form>

        <p className="text-center text-xs text-[var(--color-muted)] mt-6">
          Demo: admin / admin123
        </p>
      </motion.div>
    </div>
  );
};
