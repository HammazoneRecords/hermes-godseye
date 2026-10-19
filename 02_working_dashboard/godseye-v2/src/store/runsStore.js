/**
 * Runs store — tracks active Hermes runs (sessions).
 */
import { create } from 'zustand';

export const useRunsStore = create((set) => ({
  runs: [],          // [{ run_id, session_id, agent_id, started_at, state }]
  maxRuns: 100,

  // Populated by agent.started/agent.stopped events coming through agentsStore
  upsert: (run) => set((s) => {
    const existing = s.runs.find(r => r.run_id === run.run_id);
    const next = existing ? { ...existing, ...run } : run;
    const list = existing
      ? s.runs.map(r => r.run_id === run.run_id ? next : r)
      : [next, ...s.runs].slice(0, s.maxRuns);
    return { runs: list };
  }),

  clear: () => set({ runs: [] }),
}));
