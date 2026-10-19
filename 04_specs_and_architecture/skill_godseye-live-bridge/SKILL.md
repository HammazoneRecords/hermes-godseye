---
skill_id: godseye-live-bridge
name: Godseye Live Bridge
description: Bridge Hermes runtime events to the Godseye dashboard via SSE
version: 1.0.0
owner: AGENT_GODSEYE_TRIS
status: draft
phase: 1.5
---

# Godseye Live Bridge

Bridge Hermes runtime events to the Godseye dashboard via SSE.

## What this skill does

Provides the architectural mapping between Hermes's six runtime event planes (plugin hooks, TUI Gateway JSON-RPC, OpenAI-compatible HTTP/SSE API, dashboard WebSocket endpoints, MonitoringEmitter singleton, trajectory JSONL) and the Godseye dashboard's visualization entities (planes, ships, spaceships, satellites, territories, Jhanos gates).

The bridge is a Python sidecar at `02_working_dashboard/GODSEYE_DASHBOARD/bridge/gods-eye-bridge.py` that:

1. Subscribes to every Hermes event plane.
2. Normalizes events into a single typed stream (stripping message bodies per the no-Pluto→Earth boundary rule).
3. Re-emits them to the dashboard over an SSE endpoint at `GET /api/gods-eye/events`.
4. Writes a live snapshot to `data/dashboard.json` every 5 seconds (preserving the 6-tab contract).

## Architecture

```
Hermes runtime
├── SSE run events           ─┐
├── Dashboard WS JSON-RPC     │
├── Plugin hooks             ├──> gods-eye-bridge.py ──> SSE /api/gods-eye/events ──> Dashboard Live tab
├── MonitoringEmitter        │     (normalization)         (outbound fanout)
├── HMAC outbound webhooks   │
└── Trajectory JSONL         ─┘
```

## Normalized event schema

Every event carries:

```json
{
  "agent_id":   "GODSEYE",
  "session_id": "sess-abc123",
  "run_id":     "run-def456",
  "timestamp": 1697600000.0,
  "timestamp_iso": "2026-10-18T10:00:00Z",
  "event_type": "agent.tool.started",
  "payload":   {"tool": "read_file", "args_size": 142}
}
```

## Event types

- `agent.started` / `agent.stopped`
- `agent.message.delta` (body stripped — only delta_chars count)
- `agent.tool.started` / `agent.tool.completed`
- `agent.subagent.start` / `agent.subagent.complete`
- `agent.approval.request` / `agent.approval.responded`
- `agent.skill.lifecycle`
- `agent.room.activity`
- `system.gateway_health` / `system.cron_execution` / `system.gateway_diagnostic`
- `cargo.transfer` / `memory.mutation`

## Boundary compliance

- **No message bodies cross to Earth.** Only metadata: counts, statuses, session_ids, run_ids, tool names, durations, sizes.
- **Snapshot writer preserves the 6-tab `dashboard.json` contract.** Flips `runtime_verified: true`; refreshes counts every 5s; never breaks the other tabs.
- **Bridge writes only to `02_working_dashboard/GODSEYE_DASHBOARD/bridge/` and `02_working_dashboard/GODSEYE_DASHBOARD/data/`.** The Hermes plugin (separate artifact) writes to `~/.hermes/plugins/gods-eye/`.

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET  | `/api/gods-eye/events`         | SSE fanout (Live tab subscribes here) |
| GET  | `/api/gods-eye/snapshot`        | Current live `dashboard.json` |
| GET  | `/api/gods-eye/health`           | Service health + event types |
| POST | `/api/bridge/hooks`              | Hermes plugin pushes normalized hook events |
| POST | `/api/bridge/webhooks`           | Hermes HMAC outbound webhooks |
| POST | `/api/gods-eye/control/{action}` | Phase 4 outbound control (stub) |

## Pitfalls (do not repeat)

1. **Don't make plugin hooks optional.** `on_skill_lifecycle` and `subagent_start/stop` have no other event source — they must come from the plugin plane.
2. **Don't forward message bodies.** Strip them in the plugin's `_strip_bodies` AND in the bridge's normalizer. Defense in depth.
3. **Don't let the plugin block Hermes.** All `_push` calls are best-effort; failures are silently logged.
4. **Don't forget the 30s grace period on SSE run subscribers.** Late-arriving events for a completed run will be missed otherwise.
5. **Don't conflate the fork baseline (HammazoneRecords/HermesSPL.git HEAD) with the upstream baseline (NousResearch/hermes-agent HEAD).** They are different SHAs and serve different purposes.

## Related

- Phase 2 Cockpit Plan v1.2 §4.2 (bridge architecture) and §5.2–5.3 (Sprint 1–2)
- `02_working_dashboard/GODSEYE_DASHBOARD/app.js` Live tab logic (consumer of this SSE stream)
- `02_working_dashboard/godseye-v2/src/services/sseSubscriber.js` (Phase 2 React consumer)
- `03_agent_spaces/AGENT_GODSEYE_TRIS/plugin_artifacts/gods-eye/__init__.py` (Hermes plugin that pushes to `/api/bridge/hooks`)
