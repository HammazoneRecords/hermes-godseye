/**
 * Tools store — tracks individual tool calls (with durations) for the
 * cargoTransfers layer (ships carrying heavy cargo).
 */
import { create } from 'zustand';

export const useToolsStore = create((set) => ({
  tools: [],     // [{ id, agent_id, tool, started_at, completed_at, ok, duration_ms }]
  maxTools: 200,

  start: (e) => set((s) => ({
    tools: [{
      id: `${e.run_id}-${e.timestamp}`,
      agent_id: e.agent_id,
      tool: e.payload?.tool || '?',
      started_at: e.timestamp,
      completed_at: null,
      ok: null,
      duration_ms: null,
    }, ...s.tools].slice(0, s.maxTools),
  })),

  complete: (e) => set((s) => ({
    // find the most recent matching in-flight tool for this agent
    tools: s.tools.map((t, i) => {
      if (i === 0 && t.agent_id === e.agent_id && t.tool === e.payload?.tool && t.completed_at === null) {
        return {
          ...t,
          completed_at: e.timestamp,
          ok: e.payload?.ok ?? true,
          duration_ms: e.payload?.duration_ms || Math.round((e.timestamp - t.started_at) * 1000),
        };
      }
      return t;
    }),
  })),
}));
