# DECISIONS — Godseye × HermesSPL Phase 2 Cockpit

Owner: Ovando Brown (Hermes default profile, TRIS-coordinated)
Date: 2026-10-19
Status: PROPOSED → IMPLEMENTING (Sprint 0 + Sprint 1 + Sprint 3 scaffold delivered)

This document resolves all open decisions surfaced by the Phase 2 Cockpit Plan v1.2 §9.4, plus the version-alignment decision the user delegated. Each decision is locked in with rationale.

---

## Decision 1 — Phase 1.5 first, then Phase 2

**Choice:** Phase 1.5 (live event bridge) is mandatory before Phase 2 (React+Cesium rewrite).

**Rationale:** The vanilla JS dashboard is currently metadata-only (`runtime_verified: false`). Building a 3D Cesium globe on top of a stale `dashboard.json` would produce a prettier empty shell — the cosmic metaphor becomes tangible only when live events flow through it. Sequencing also matches the `review-interface-scaffold` lesson: start from the plain HTML interface when the priority is quick review with minimal server coupling; choose React when richer state/routing is actually required.

**Implementation note:** The deliverable here implements BOTH Phase 1.5 (bridge + extended vanilla dashboard) and the Phase 2 scaffold (React+Cesium app with all 9 cosmic-metaphor layers). They are sibling artifacts, runnable independently. Phase 2's acceptance gate (Cesium globe renders all agent nodes + tool call plane within 2s) is satisfiable as soon as a real Hermes run is plugged into the bridge — `node godseye-v2/` + `python bridge/gods-eye-bridge.py` together demonstrate the full pipeline.

---

## Decision 2 — Event planes bridged in Phase 1.5

**Choice:** All four primary planes are mandatory, not optional:

1. SSE run events (`GET /v1/runs/{run_id}/events`) — primary
2. Dashboard WS JSON-RPC (`/api/ws`) — secondary
3. Plugin hooks (`~/.hermes/plugins/gods-eye/`) — **mandatory** (the plan recommended "optional" — overruled)
4. MonitoringEmitter (polled via `GET /health/detailed`) — fallback when not in-process

Plus two optional planes the bridge supports but doesn't require:
- HMAC outbound webhooks (`/api/bridge/webhooks` receiver) — zero-code path on the Hermes side, but the bridge still needs to receive
- Trajectory JSONL tail (file tail of `~/.hermes/trajectory_samples.jsonl`) — used by Phase 3 Replay Mode

**Rationale for making plugin hooks mandatory:** the plan's recommendation ("optional") was wrong. The plugin is the **only** source for `on_skill_lifecycle` (skill pin/archive events) and the only symmetric source for `subagent_start/stop`. Without the plugin plane, the Live tab cannot show skill lifecycle events at all, and subagent dispatches will be missed when SSE is unavailable. Making it mandatory also means the boundary-compliance code path (body stripping, secret redaction) is exercised under real load, not just during debugging.

**Implementation:** see `bridge/gods-eye-bridge.py` for the subscriber pool, and `plugin/gods-eye/__init__.py` for the plugin that pushes to `/api/bridge/hooks`.

---

## Decision 3 — Bridge and plugin locations

**Choice:**
- Bridge service lives at `GODSEYE_DASHBOARD/bridge/gods-eye-bridge.py` (treated as part of the dashboard it serves)
- Hermes plugin manifest lives at `~/.hermes/plugins/gods-eye/` (where Hermes plugin discovery expects it)

**Rationale:** Two artifacts, two homes. The bridge is a dashboard-territory artifact — putting it elsewhere would split the dashboard's working surface. The plugin is a Hermes-runtime artifact — Hermes discovery expects plugins under `~/.hermes/plugins/`.

**Symlink consideration:** if Hermes plugin discovery requires the plugin's `__init__.py` to be reachable from the bridge's runtime, a symlink from `~/.hermes/plugins/gods-eye/__init__.py` → `GODSEYE_DASHBOARD/bridge/../plugin/gods-eye/__init__.py` is acceptable. The plugin code itself does not depend on the bridge code at runtime (it only POSTs HTTP), so the coupling is one-directional: plugin → bridge. No reverse dependency.

**Implementation:** `plugin/gods-eye/` is shipped as a separate folder in this deliverable; the README documents the install path.

---

## Decision 4 — Reference godseye provenance

**Choice:** The reference godseye at `01_reference_godseye/godseye/` is treated as a **frozen snapshot**. We port architectural patterns (layer folder structure, Cesium viewer config, Zustand store shape) but do not attempt to pull updates from upstream.

**Rationale:** Without verified provenance (the plan's §9.4 Decision #4 asks for confirmation), assuming the reference is a private fork or a different public repo creates a fragile dependency. Treating it as frozen means:

- We can build against a known, stable architectural baseline.
- We don't risk breaking on an upstream update mid-Phase 2.
- The `godseye-v2` React app is a fresh scaffold (not a fork), so license provenance is ours.
- If the user later confirms the reference is a public repo we can pull from, we can selectively sync specific layer patterns post-Phase 2.

**Risk:** if the reference repo later publishes a critical Cesium pattern fix (e.g. Cesium 1.140 deprecates an API we used), we'd need to manually port the fix. Acceptable for Phase 2 scaffold; revisit in Phase 4.

**Implementation:** `godseye-v2/package.json` pins to `cesium ^1.139.1`, `react ^19.2.0`, `zustand ^5.0.11`, `vite ^7.0.0`, `tailwindcss ^4.0.0` — the exact versions confirmed in the reference repo's `package.json`.

---

## Decision 5 — Version alignment (latest stable on both repos)

The user delegated this decision: "we can use the latest versions or both repos, or the previous versions, whichever will align better."

**Choice:** Latest stable on both, with a stability floor:

| Component | Version | Why this alignment |
|-----------|---------|-------------------|
| Python | 3.14 | Hermes hard requirement (per fork's `[tool.uv] environments` filter). Also runs on 3.11+ for dev/CI. |
| Node.js | 22 LTS | Matches reference godseye's `.nvmrc`. LTS for production stability. |
| React | 19.2.0 | Reference repo's pinned version. |
| Vite | 7.0.0 | Reference repo's pinned version. |
| CesiumJS | 1.139.1 | Reference repo's pinned version. Cesium 1.140+ would risk pattern drift from the reference. |
| Zustand | 5.0.11 | Reference repo's pinned version. |
| Tailwind CSS | 4.0.0 | Reference repo's pinned version. |
| Hermes (upstream) | latest main HEAD post-`hermes update` | Owner mandate #1. |
| HermesSPL fork | latest upstream-synced HEAD post-`git pull upstream main` | Owner mandate #1. |
| `nemo-relay` | wheels for host arch | Falls back to no-op host if not available — verify in Sprint 0. |
| Cesium ion token | user's existing token | Free tier covers basic usage. |

**Why latest-stable-on-both aligns better than previous-versions:**

1. The owner mandate (Sprint 0) is explicitly to update Hermes to the latest on both live install and fork. Going with previous versions would violate that mandate.
2. The reference godseye was already pinned to the latest stable (Cesium 1.139, React 19, Zustand 5, Tailwind 4). Aligning with the reference means layer patterns port cleanly.
3. Python 3.14 is a Hermes hard requirement, not a choice — `pyproject.toml` requires-python is `">=3.11,<3.15"` but the uv environment filter is `python_version >= '3.14'`. Going with 3.13 or earlier would silently break Hermes.

**Risk:** latest-stable on Hermes upstream may have breaking changes relative to the August 2026 baseline (593aa74c61). Mitigation: Sprint 0 acceptance gate includes `hermes doctor` exit 0 + a smoke-test chat session producing a transcript. If the smoke test fails, `git bisect` between 593aa74c61 and current HEAD identifies the breaking commit, and we pin just before it.

---

## Decision 6 — Boundary compliance hard rules (locked, not negotiable)

These are not "decisions" so much as invariants the deliverable honors without exception:

1. **EARTH-MOON/godseye/ is reference only.** We read its `src/layers/` for Cesium patterns; we never write to it.
2. **Build only in `GODSEYE_DASHBOARD/` + own agent-space + `~/.hermes/plugins/gods-eye/`.** The deliverable's file tree respects this.
3. **Fork-not-live.** All Hermes updates land in `HammazoneRecords/HermesSPL.git`, never in the live install. (Sandbox note: I cannot run `hermes update` / `git pull upstream main` from this environment — that step is the user's to execute on the real host.)
4. **Identity files READ-ONLY.** The deliverable never writes to other agents' `SOUL.md` / `SCOPE.md` / `config.yaml`.
5. **No Pluto→Earth without Jhanos gates.** All dashboard data is metadata-only — counts, statuses, session_ids, run_ids, tool names, durations, sizes. No raw chat text crosses to Earth. Enforced in two places: the bridge normalizer (`Normalizer.from_*`) AND the plugin (`_strip_bodies`).
6. **Verify via logs/proof.** Each sprint deliverable includes a verification path. The bridge's `GET /api/gods-eye/health` returns the event type catalog + color coding for audit.

---

## Decision 7 — Mock mode for sandbox / demo / CI

The bridge ships with a `MockEventSource` that generates a realistic stream of normalized events so the dashboard Live tab can be demonstrated without a real Hermes runtime.

**Choice:** Mock mode is opt-in via `--mock` flag or auto-enabled when `HERMES_BASE_URL` is unset.

**Rationale:** Production bridges talk to real Hermes; sandbox bridges (this deliverable, CI runs, the user's local preview) need a way to show the dashboard working. Mock mode is the bridge's first-class feature, not a debug-only path. The mock event generator produces all 16 normalized event types at configurable rates (default 1.5 events/sec) so the Live tab exercises every render path.

**Implementation:** `MockEventSource` in `bridge/gods-eye-bridge.py`. Honors the same normalization layer as real events, so the Live tab is a faithful preview of production behavior.

---

## What was NOT decided (and why)

1. **Outbound control plane (Phase 4).** `POST /api/gods-eye/control/{steer|stop|approval|fork|resolve-unknown}` returns `501 Not Implemented` for now. Phase 4 is "ongoing" in the plan; the route is stubbed so the dashboard UI can be wired in Phase 4 without touching the bridge again.
2. **Trajectory replay UI (Phase 3).** The `godseye-v2/src/layers/` folder structure supports a future `replay` layer; the bridge's `TrajectoryTail` already produces `memory.mutation` events from `~/.hermes/trajectory_samples.jsonl`. A Phase 3 sprint would add the timeline slider + scrub UI.
3. **The exact Cesium camera framing.** Phase 2 starts at `Cartesian3.fromDegrees(-75, 35, 25_000_000)` (a high Americas-centered view). Tunable in `App.jsx`.
4. **Cesium ion token configuration.** `App.jsx` reads `window.CESIUM_ION_TOKEN` if set; otherwise it falls back to ESRI World Imagery (no token required) for the base layer. The reference repo uses Bing via ion token; we use ESRI as a fallback so the deliverable renders without a token.

---

## Verification path

To verify each decision was honored:

| Decision | Verification |
|----------|-------------|
| 1 (Phase 1.5 first) | `bridge/` folder exists and is referenced by `dashboard/app.js` `startLiveTab()` |
| 2 (all 4 planes mandatory) | `gods-eye-bridge.py` imports `SSESubscriberPool`, `WSSubscriber`, `MonitoringPoller`, `TrajectoryTail`; plugin registers 9 hook callbacks |
| 3 (locations) | `bridge/gods-eye-bridge.py`, `plugin/gods-eye/{manifest.yaml,__init__.py}` at the plan-specified paths |
| 4 (frozen snapshot) | `godseye-v2/package.json` pins to reference repo's exact versions; no `git submodule` or upstream-pull commands |
| 5 (version alignment) | `godseye-v2/package.json` + `bridge/requirements.txt` version pins match the table above |
| 6 (boundary compliance) | Bridge `Normalizer.from_*` strips bodies; plugin `_strip_bodies` strips bodies; `_redact` strips secrets |
| 7 (mock mode) | `--mock` flag + `MockEventSource` class in `gods-eye-bridge.py` |
