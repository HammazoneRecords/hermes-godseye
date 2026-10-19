/**
 * Memories store — represents the memory strata (working / episodic /
 * semantic / procedural). Driven by memory.mutation events.
 */
import { create } from 'zustand';

const INITIAL_LAYERS = [
  { id: 'working',    items: 0, color: '#a78bfa' },
  { id: 'episodic',   items: 0, color: '#7c6fff' },
  { id: 'semantic',   items: 0, color: '#5b4bd6' },
  { id: 'procedural', items: 0, color: '#3f3299' },
];

export const useMemoriesStore = create((set) => ({
  layers: INITIAL_LAYERS,
  mutations: [],   // recent memory mutation events
  maxMutations: 100,

  mutation: (e) => set((s) => {
    // increment working layer count (memory.mutation comes from trajectory tail)
    const layers = s.layers.map(l => l.id === 'working' ? { ...l, items: l.items + 1 } : l);
    const mut = {
      id: `${e.agent_id}-${e.timestamp}`,
      agent_id: e.agent_id,
      trajectory_id: e.payload?.trajectory_id,
      entries: e.payload?.sharegpt_entries || 0,
      tags: e.payload?.tags || [],
      ts: e.timestamp,
    };
    return {
      layers,
      mutations: [mut, ...s.mutations].slice(0, s.maxMutations),
    };
  }),
}));
