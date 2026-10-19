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
