export interface ProgressState {
  total: number;
  completed: number;
  failed: number;
  status: "parsing" | "done" | "error";
}

const progressMap = new Map<string, ProgressState>();

export const progressTracker = {
  init(sessionId: string, total: number): void {
    progressMap.set(sessionId, { total, completed: 0, failed: 0, status: "parsing" });
  },

  update(sessionId: string, completed: number, failed: number): void {
    const state = progressMap.get(sessionId);
    if (state) {
      state.completed = completed;
      state.failed = failed;
    }
  },

  updateTotal(sessionId: string, total: number): void {
    const state = progressMap.get(sessionId);
    if (state) state.total = total;
  },

  finish(sessionId: string): void {
    const state = progressMap.get(sessionId);
    if (state) state.status = "done";
  },

  fail(sessionId: string): void {
    const state = progressMap.get(sessionId);
    if (state) state.status = "error";
  },

  get(sessionId: string): ProgressState | null {
    const state = progressMap.get(sessionId);
    return state ? { ...state } : null;
  },

  cleanup(sessionId: string): void {
    progressMap.delete(sessionId);
  },
};
