# HermesSPL Baseline Verification — 2026-10-19

## Isolation
- Environment: Docker container `godseye-sprint0` (Ubuntu 24.04 image `c7e64dd62af8`) on the production host — filesystem fully isolated; production `/root/.hermes` verified NOT visible inside
- Hermes home used: `/opt/hermes-home` (container-local)

## Hermes Agent upstream (latest)
- upstream/main HEAD: `f4ac0bea` — "v0.22.2+canary.20261019T071120Z-336-gf4ac0bea" (2026-10-19)
- Fresh clone succeeded inside container.

## Fork baseline — VERDICT: NO-GO via merge; GO via plugin route
- Fork: HammazoneRecords/HermesSPL @ `a74655c` (2026-09-21), pyproject version 0.21.2, re-imported history (initial commit "HermesSPL Triangulum v2.0.0 (Nyx)") — **no common ancestor with upstream**.
- Attempt 1 — plain `git merge upstream/main`: `fatal: refusing to merge unrelated histories`.
- Attempt 2 — graft-merge (graft fork's initial commit onto upstream `v0.21.4+canary` `a9a0ba75`, then merge `-X ours`): merge SUCCEEDED mechanically, commit `7cc5962b`, but with **1513 conflicts** auto-resolved favor-fork, and the resulting tree FAILS: `tests/conftest.py` ImportError (`version_info` missing from `hermes_cli`) — the mixed old-fork/new-upstream resolution is inconsistent.
- Conclusion: bringing the fork onto latest upstream requires a manual rebase of the fork's custom surface (days of work, high regression risk) OR re-importing the fork's custom files onto a fresh upstream clone.
- **Decision (owner):** proceed via the **plugin route** — Godseye ships as dashboard + bridge sidecar + `gods-eye` plugin (already verified working end-to-end in Phase 1.5), independent of the fork's git history. The HermesSPL fork is archived as historical baseline. Bundle of the attempted v2 branch kept at `docker/sprint0/out/v2-upstream-baseline.bundle` for future reference.

## Godseye integration regression (mock mode) — PASS
- RUN_DEMO.sh from repo root: bridge up, GET / 200, app.js 200, health 200
- 66 SSE events in 4s; no message bodies in stream (leak check clean)
- snapshot 200, `runtime_verified: true`, 21 agents (real agents.json)
- godseye-v2 React build: 51 modules, 307.86 kB JS / 12.20 kB CSS

## Verdict
- **GO for Phase 3 (Replay Mode)** and Phase 4 (NVP control plane) on the plugin route.
- Production host update remains a separate gated step (backup + quiet-time drain) after Phase 3/4 stabilize.
