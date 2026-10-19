# NEXT SPRINT — Direction Decision (2026-10-19)

**Decision (owner):** All three paths, **sequenced — Sprint 0 first.**

1. **Sprint 0 (NOW) — Real-host baseline update.** The handoff README already
   mandates: update Hermes to latest before any further merger work. Host side
   (this machine) runs `hermes update`, `hermes doctor`, and the fork
   `git fetch upstream && git merge upstream/main` baseline pull, then writes
   `HermesSPL_baseline_verification_2026-10-19.md` (template below) as the
   evidence log. Do not start Phase 3/4 until Sprint 0 log is committed.
2. **Phase 3 — Replay Mode.** Timeline slider + trajectory JSONL scrub UI as a
   `replay` layer in `godseye-v2/src/layers/`; consume the bridge's existing
   trajectory tail (`~/.hermes/trajectory_samples.jsonl` → `memory.mutation`
   events). Deliverable: working scrub UI against mock mode first, real
   trajectory file second.
3. **Phase 4 — Full NVP Cockpit.** Implement the outbound control plane
   (`POST /api/gods-eye/control/{steer|stop|approval|fork|resolve-unknown}`).
   Note: stub currently returns 400, not 501 as documented — align doc and
   behavior as part of this phase.

## Working agreements (from owner, carried from workspace rules)

- Test integration against the REAL repo data (the three bugs in `6a0f9cc`
  all came from testing against synthesized data).
- No writes to `/root/MW_CENTRAL/EARTH-MOON/` (reference only).
- Evidence over claims: every phase gets a verification artifact committed.
- Fallback/model for agent work: Terra (ChatGPT) per owner; GLM-5.3 via
  api.z.ai is the working fallback on the host (see /root/zai-task-bridge).

---

## Sprint 0 log template — `HermesSPL_baseline_verification_2026-10-19.md`

```markdown
# HermesSPL Baseline Verification — 2026-10-19

## Hermes Agent update (live host)
- Before: version ____ (hermes --version)
- Command: hermes update
- After: version ____
- hermes doctor: [paste summary]
- Gateway restarted: [yes/no, PID, profiles served]

## Fork baseline update
- Repo: /root/MW_CENTRAL/EARTH-MOON/hermes-spl-fork (remote HammazoneRecords/HermesSPL)
- Before HEAD: a74655c (2026-09-21)
- Upstream merge: upstream URL ____, merged to ____
- After HEAD: ____
- Conflicts: [none / list + resolution]
- Test suite: [results]

## Post-update regression
- RUN_DEMO.sh (mock): [pass/fail + endpoint counts]
- godseye-v2 build: [pass/fail + sizes]
- Bridge production mode vs live gateway: [status]

## Verdict
[GO / NO-GO for Phase 3]
```
