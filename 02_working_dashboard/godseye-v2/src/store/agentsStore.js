/**
 * Agents store — the canonical agent roster + per-agent live state.
 * Driven by SSE events from the bridge.
 *
 * Cosmic-architecture-metaphor altitude bands (per skill §3.3):
 *   high (>50km): TRISMIGISTUS, GODSEYE, FACTCHECK, HERMES
 *   mid  (20-50): LIBRARIAN, CURATOR, MAIL, CANARY
 *   low  (<20):  SPINUP-01, SPINUP-02 (sandbox)
 *
 * Color coding (per skill §3.2):
 *   white idle / green verified / yellow pending / red error
 */
import { create } from 'zustand';

// Initial roster — mirror of dashboard/data/agents.json
const INITIAL_AGENTS = [
  { id: 'TRISMIGISTUS', name: 'Trismigistus',  role: 'guardian',      altitude_band: 'high', state: 'idle', color: '#e2b45d' },
  { id: 'GODSEYE',      name: 'Godseye',       role: 'oversight',     altitude_band: 'high', state: 'idle', color: '#72c69a' },
  { id: 'FACTCHECK',    name: 'FactCheck',     role: 'verification',  altitude_band: 'high', state: 'idle', color: '#ff3333' },
  { id: 'LIBRARIAN',    name: 'Librarian',     role: 'memory',        altitude_band: 'mid',  state: 'idle', color: '#a78bfa' },
  { id: 'CURATOR',      name: 'Curator',       role: 'memory',        altitude_band: 'mid',  state: 'idle', color: '#a78bfa' },
  { id: 'MAIL',         name: 'Mail',          role: 'delivery',      altitude_band: 'mid',  state: 'idle', color: '#00b4ff' },
  { id: 'CANARY',       name: 'Canary',        role: 'delivery',      altitude_band: 'mid',  state: 'idle', color: '#ff6f3d' },
  { id: 'SPINUP-01',    name: 'Spinup 01',    role: 'sandbox',       altitude_band: 'low',  state: 'idle', color: '#e9edf4' },
  { id: 'SPINUP-02',    name: 'Spinup 02',    role: 'sandbox',       altitude_band: 'low',  state: 'idle', color: '#e9edf4' },
  { id: 'HERMES',       name: 'Hermes',        role: 'runtime',       altitude_band: 'high', state: 'idle', color: '#00ffd5' },
];

// Compute altitude in km from band per cosmic metaphor §3.3
function altitudeForBand(band, agentId) {
  // Stable per-agent offset so agents don't overlap orbits
  const hash = agentId.split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 0);
  const jitter = (hash % 1000) / 1000;
  if (band === 'high') return 60 + jitter * 60;  // 60-120km
  if (band === 'mid')  return 25 + jitter * 20;  // 25-45km
  return 8 + jitter * 12;                        // 8-20km
}

// Stable longitude for each agent (so each agent has a "home" position)
function longitudeForAgent(agentId) {
  const hash = agentId.split('').reduce((a, c) => (a * 17 + c.charCodeAt(0)) >>> 0, 0);
  return (hash % 360) - 180;
}

// Latitudes spread by altitude band so high/mid/low don't collide
function latitudeForAgent(band, agentId) {
  const hash = agentId.split('').reduce((a, c) => (a * 13 + c.charCodeAt(0)) >>> 0, 0);
  if (band === 'high') return 30 + ((hash % 60) - 30);    // -30..+30
  if (band === 'mid')  return 60 + ((hash % 30) - 15);     // 45..75
  return -45 - (hash % 30);                                // -45..-75
}

const ENRICHED = INITIAL_AGENTS.map(a => ({
  ...a,
  altitude_km: altitudeForBand(a.altitude_band, a.id),
  longitude:   longitudeForAgent(a.id),
  latitude:    latitudeForAgent(a.altitude_band, a.id),
  messages: 0, tools: 0, subagents: 0, approvals: 0,
  last_event: null,
  last_event_ts: 0,
  current_tool: null,
}));

export const useAgentsStore = create((set, get) => ({
  agents: ENRICHED,
  selectedAgentId: null,

  select: (id) => set({ selectedAgentId: id }),

  _patch: (agentId, fn) => set((s) => ({
    agents: s.agents.map(a => a.id === agentId ? fn(a) : a),
  })),

  agentStarted: (e) => get()._patch(e.agent_id, (a) => ({
    ...a, state: 'active', last_event: 'agent.started', last_event_ts: e.timestamp,
  })),

  agentStopped: (e) => get()._patch(e.agent_id, (a) => ({
    ...a, state: 'idle', last_event: 'agent.stopped', last_event_ts: e.timestamp,
    current_tool: null,
  })),

  messageDelta: (e) => get()._patch(e.agent_id, (a) => ({
    ...a, messages: a.messages + 1,
    last_event: 'agent.message.delta', last_event_ts: e.timestamp,
    state: a.state === 'idle' ? 'active' : a.state,
  })),

  toolStarted: (e) => get()._patch(e.agent_id, (a) => ({
    ...a, tools: a.tools + 1,
    current_tool: e.payload?.tool || null,
    last_event: 'agent.tool.started', last_event_ts: e.timestamp,
    state: 'active',
  })),

  toolCompleted: (e) => get()._patch(e.agent_id, (a) => ({
    ...a, current_tool: null,
    last_event: 'agent.tool.completed', last_event_ts: e.timestamp,
    state: e.payload?.ok ? 'active' : 'error',
  })),

  subagentStart:    (e) => get()._patch(e.agent_id, (a) => ({ ...a, subagents: a.subagents + 1, last_event: 'agent.subagent.start', last_event_ts: e.timestamp })),
  subagentComplete: (e) => get()._patch(e.agent_id, (a) => ({ ...a, last_event: 'agent.subagent.complete', last_event_ts: e.timestamp })),
  approvalRequest:  (e) => get()._patch(e.agent_id, (a) => ({ ...a, approvals: a.approvals + 1, last_event: 'agent.approval.request', last_event_ts: e.timestamp })),
  approvalResponded:(e) => get()._patch(e.agent_id, (a) => ({ ...a, last_event: 'agent.approval.responded', last_event_ts: e.timestamp })),
  skillLifecycle:   (e) => get()._patch(e.agent_id, (a) => ({ ...a, last_event: 'agent.skill.lifecycle', last_event_ts: e.timestamp })),
  roomActivity:     (e) => get()._patch(e.agent_id, (a) => ({ ...a, last_event: 'agent.room.activity', last_event_ts: e.timestamp })),
  gatewayHealth:    () => {},
  gatewayDiagnostic:() => {},
  cronExecution:    () => {},
}));
