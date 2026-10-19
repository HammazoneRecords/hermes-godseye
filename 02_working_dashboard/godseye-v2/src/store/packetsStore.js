/**
 * Packets store — represents fast messages (planes) and subagent dispatches
 * (spaceships). Per Phase 2 Cockpit Plan §4.3 Table 2:
 *   - taskPackets = AircraftLayer (flight variant) — planes
 *   - interplanetary = custom — spaceships via Jhanos gates
 */
import { create } from 'zustand';

export const usePacketsStore = create((set) => ({
  planes: [],       // [{ id, agent_id, ts, kind: 'msg' | 'tool' }]
  spaceships: [],   // [{ id, agent_id, child, ts, kind: 'start' | 'complete' }]
  maxItems: 300,

  plane: (e) => set((s) => ({
    planes: [{ id: `${e.run_id}-${e.timestamp}`, agent_id: e.agent_id, ts: e.timestamp, kind: 'msg' }, ...s.planes].slice(0, s.maxItems),
  })),

  toolPulse: (e) => set((s) => ({
    planes: [{ id: `${e.run_id}-${e.timestamp}-tool`, agent_id: e.agent_id, ts: e.timestamp, kind: 'tool' }, ...s.planes].slice(0, s.maxItems),
  })),

  spaceship: (e, kind) => set((s) => ({
    spaceships: [{
      id: `${e.run_id}-${e.timestamp}-${kind}`,
      agent_id: e.agent_id,
      child: e.payload?.child || '?',
      ts: e.timestamp,
      kind,
    }, ...s.spaceships].slice(0, s.maxItems),
  })),
}));
