// Empty index — the agents layer's index re-exports the component.
// Per Phase 2 Cockpit Plan §4.3: each layer folder has index.js, source.js,
// ingestion.js, records.js, state.js, lifecycle.js, rendering.js, policy.js,
// queries.js. For Phase 2 scaffold, the single index.jsx is sufficient —
// the full folder pattern can be backfilled in Phase 2 Sprint 3 sub-task.
export { AgentsLayer } from './index.jsx';
