# gods-eye-bridge

Python sidecar that subscribes to every Hermes runtime event plane, normalizes events into a single typed stream, and re-emits them to the Godseye Dashboard over an SSE endpoint.

## Quick start (mock mode)

```bash
pip install -r bridge/requirements.txt
python bridge/gods-eye-bridge.py --mock
```

Then open http://127.0.0.1:8765/ in a browser — the dashboard Live tab will start showing activity within a few seconds.

## Production (real Hermes)

```bash
export HERMES_BASE_URL=http://127.0.0.1:8642
export HERMES_API_KEY=...            # your API_SERVER_KEY
export HERMES_DASHBOARD_WS=ws://127.0.0.1:8643/api/ws
export HERMES_TRAJECTORY_PATH=~/.hermes/trajectory_samples.jsonl
python bridge/gods-eye-bridge.py
```

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET  | `/api/gods-eye/events`   | SSE fanout (Live tab subscribes here) |
| GET  | `/api/gods-eye/snapshot` | Current live `dashboard.json` |
| GET  | `/api/gods-eye/health`   | Service health + event types + color coding |
| POST | `/api/bridge/hooks`      | Hermes plugin pushes normalized hook events |
| POST | `/api/bridge/webhooks`   | Hermes HMAC outbound webhooks (pre/post_tool_call) |
| POST | `/api/gods-eye/control/{action}` | Phase 4 outbound control (stub — 501) |

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

Message bodies are **stripped** — only delta counts and tool names cross to the dashboard, per the no-Pluto→Earth-without-Jhanos-gates boundary rule.

## Event types

See `EVENT_TYPES` dict in `gods-eye-bridge.py` for the canonical list. The dashboard's Live tab is the consumer of record.

## Boundary compliance

- No message body text crosses to Earth (dashboard). Only metadata: counts, statuses, session_ids, run_ids, tool names, durations, sizes.
- Snapshot writer preserves the existing 6-tab `dashboard.json` contract — flips `runtime_verified: true`, refreshes counts every 5s, never breaks the other tabs.
- The bridge writes only to `GODSEYE_DASHBOARD/bridge/` and `GODSEYE_DASHBOARD/data/`. The Hermes plugin (separate artifact) writes to `~/.hermes/plugins/gods-eye/`.

---

# Phase 4 — Outbound Control Plane

The bridge implements an outbound control plane at `POST /api/gods-eye/control/{action}` for the 5 documented actions: `steer`, `stop`, `approval`, `fork`, `resolve-unknown`.

## Enable flag (DEFAULT OFF — production safety)

The control plane is **disabled by default**. To enable:

```bash
export GODS_EYE_CONTROL_ENABLED=1
python bridge/gods-eye-bridge.py
```

When disabled, all 5 known actions return **403** with the body:

```json
{
  "ok": false,
  "error": "control plane disabled",
  "reason": "Set GODS_EYE_CONTROL_ENABLED=1 to enable. See bridge/README.md.",
  "action": "steer"
}
```

When enabled:
- **Mock mode** (no `HERMES_BASE_URL`) uses `MockControlExecutor` — simulates actions, returns 200/202/201 with synthetic responses.
- **Live mode** (with `HERMES_BASE_URL`) uses `ControlExecutor` — forwards to Hermes OpenAI-compatible API at `${HERMES_BASE_URL}/v1/runs/{run_id}/{action}` with `HERMES_API_KEY` bearer auth.

## Status code contract

| Status | When | Example |
|--------|------|---------|
| 200 | Action executed successfully (or simulated) | `{ok: true, action: "steer", result: {...}, audit_emitted: true}` |
| 400 | Invalid input — missing required field, bad enum, oversized body | `{ok: false, error: "validation failed", field: "message", msg: "required field 'message' missing or empty"}` |
| 403 | Control plane disabled (default) | `{ok: false, error: "control plane disabled", reason: "..."}` |
| 404 | Unknown action (not in the 5 supported) | `{ok: false, error: "unknown action 'pause'", supported: [...]}` |
| 500 | Control executor not initialized (server bug) | `{ok: false, error: "control executor not initialized"}` |
| 502 | Upstream Hermes API error (live mode only) | `{ok: false, action: "steer", upstream_error: {...}}` |

> **Note on the "400 vs 501" alignment** (per NEXT_SPRINT.md): the Phase 1.5 stub returned 501 for known unimplemented actions. Phase 4 replaces that with a proper contract: 403 when disabled (default), 200/400/502 when enabled. The 400 status is used **only** for invalid input (validation failures), never for "not yet implemented". This aligns the documented behavior with the actual implementation.

## Action contracts

### `steer` — inject a message into a running agent
```bash
curl -X POST http://127.0.0.1:8765/api/gods-eye/control/steer \
  -H "Content-Type: application/json" \
  -d '{"run_id": "run-abc123", "message": "switch to plan B"}'
```
Required: `run_id`, `message` (≤50000 chars).

### `stop` — stop a running run
```bash
curl -X POST http://127.0.0.1:8765/api/gods-eye/control/stop \
  -H "Content-Type: application/json" \
  -d '{"run_id": "run-abc123", "reason": "operator_stop"}'
```
Required: `run_id`. Optional: `reason`.

### `approval` — respond to an approval request
```bash
curl -X POST http://127.0.0.1:8765/api/gods-eye/control/approval \
  -H "Content-Type: application/json" \
  -d '{"run_id": "run-abc123", "approval_id": "appr-001", "decision": "approve"}'
```
Required: `run_id`, `approval_id`, `decision`. `decision` must be one of `approve`, `deny`, `defer`.

### `fork` — fork a session into a new run
```bash
curl -X POST http://127.0.0.1:8765/api/gods-eye/control/fork \
  -H "Content-Type: application/json" \
  -d '{"session_id": "sess-abc123", "message": "try the alternative"}'
```
Required: `session_id`. Optional: `message`. Returns `new_run_id` in the upstream response.

### `resolve-unknown` — resolve an unknown response
```bash
curl -X POST http://127.0.0.1:8765/api/gods-eye/control/resolve-unknown \
  -H "Content-Type: application/json" \
  -d '{"run_id": "run-abc123", "response": "use option A"}'
```
Required: `run_id`, `response` (≤50000 chars).

## Audit trail (SSE)

Every successful control action emits a `control.action` event on the `/api/gods-eye/events` SSE stream. The event payload contains only metadata — no message body text crosses (per the no-Pluto-to-Earth boundary rule):

```json
{
  "agent_id": "system",
  "session_id": "system",
  "run_id": "run-abc123",
  "timestamp": 1792446199.5,
  "event_type": "control.action",
  "payload": {
    "action": "steer",
    "run_id": "run-abc123",
    "ok": true,
    "upstream_status": 202,
    "mock": true
  }
}
```

The `message`/`response`/`reason` text from the original POST is **never** included in the audit event — only `action`, `run_id`, `ok`, `upstream_status`, `error`, and `mock` flag cross to the SSE stream. This is enforced in both `ControlExecutor.emit_audit_event` and `MockControlExecutor.emit_audit_event`.

## Verification

```bash
python 02_working_dashboard/GODSEYE_DASHBOARD/bridge/tests/phase4_verification.py
```

Exercises all 5 actions in both disabled and enabled states, asserts every status code in the contract, verifies 0 body leaks across control.action audit events, and checks Phase 1.5 + Phase 3 regression. 13/13 tests pass.
