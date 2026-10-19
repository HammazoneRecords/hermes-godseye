# Godseye × HermesSPL Merger — Developer Handoff
**Repo:** git@github.com:HammazoneRecords/hermes-godseye.git
**Packaged:** 2026-10-18 · pushed 2026-10-19 · From: Hermes Agent (default profile, TRIS-coordinated)

## ⚠️ Two mandatory notes from the owner

1. **UPDATE HERMES TO THE LATEST VERSION BEFORE STARTING THE GODSEYE MERGER.**
   The live Hermes install and the `HermesSPL` fork baseline must both be moved to
   the latest Hermes Agent release first — the merger is to be built against current
   upstream, not the Sep 2026 checkout referenced in the older plans.
   (`hermes update` on the live instance; pull/merge upstream in the fork below.)

2. **USE TERRA (ChatGPT model) as the model/fallback** for this work.
   ChatGPT via the `openai-codex` OAuth login is the intended provider; "Terra" is
   the owner's name for the ChatGPT model to run/build with as fallback provider.
   (Known issue at packaging time: plain `gpt-5.2`/`gpt-5.x-codex` names returned
   "not entitled via ChatGPT account" — verify the entitled model id on the account
   with `hermes model` before relying on it.)

## What is in this package

| Folder | Contents |
|---|---|
| `01_reference_godseye/` | **Godseye View** reference repo (CesiumJS 3D globe, HUD, 20+ layers). READ-ONLY reference — do not build here. Includes `.git` history (43M). |
| `02_working_dashboard/` | **Godseye Dashboard** Phase 1 working build (vanilla JS, 5 tabs): `index.html`, `app.js`, `styles.css`, `data/`, plus `DASHBOARD_ARCHITECTURE_SPEC.md` and `GOVERNANCE_LAYER_SPEC.md`. This is the build surface for dashboard work. |
| `03_agent_spaces/` | `AGENT_GODSEYE_TRIS/` (SOUL.md, SCOPE.md, MAP_SCOPE_SPEC.md) and `AGENT_HERMESSPL_TRIS/` (T1 intention, logs, skills, sessions, cron). NOTE: the 1.2G `HermesSPL_T2_Execution/` tree was excluded from this package — it lives at `/root/MW_CENTRAL/PLUTO/AGENT_ARENA/ACTIVE/AGENT_HERMESSPL_TRIS/` on the source machine. |
| `04_specs_and_architecture/` | `HERMESSPL-UNIFIED-ARCHITECTURE.md` (key merger architecture), `QUICKREF.md`, `MAP_SCOPE_SPEC.md`, and three skill references: godseye-replay-mode, cosmic-architecture-metaphor (incl. phase1-implementation + governance-visualization refs), review-interface-scaffold (Godseye NVP scaffold). |
| `05_plans/01-godseye-hermes-merger-prep.md` | **Start here** — phased execution plan generated via GLM (z.ai task bridge) from the specs in this package. | `2026-09-02_hermes-spl-baseline-and-chat2cash-walkthrough.md` (says: do NOT use the live Hermes instance as the SPL merger dev surface; use the fork as clean baseline) and `PLAN_EVOLUTION_LEDGER.md`. |

## Source-machine absolute paths (ground truth)

- Godseye View reference: `/root/MW_CENTRAL/EARTH-MOON/godseye/`
- Godseye Dashboard (working): `/root/MW_CENTRAL/PLUTO/GODSEYE_DASHBOARD/`
- HermesSPL fork: `/root/MW_CENTRAL/EARTH-MOON/hermes-spl-fork/`
  - Remote: `https://github.com/HammazoneRecords/HermesSPL.git`
  - HEAD at packaging: `a74655c` "Fix triangulum-install.py and update URLs" (2026-09-21)
  - ~2.5G with node_modules/profiles — clone fresh from the remote rather than copying.
- Agent arena: `/root/MW_CENTRAL/PLUTO/AGENT_ARENA/ACTIVE/`
- Plans ledger: `/root/MW_CENTRAL/PLUTO/.hermes/plans/`
- Live Hermes config: `/root/.hermes/config.yaml` · Godseye profile: `/root/.hermes/profiles/godseye/`

## Rules carried over from the source workspace

- Do **not** modify `EARTH-MOON/godseye/` (reference only). Build in `GODSEYE_DASHBOARD/` or agent-space.
- Agents write only inside their assigned agent-space unless explicitly routed.
- Projects in motion are never "abandoned" — treat every referenced project as active WIP.
- Verify via logs/proof artifacts, not claims: proof JSONs live in `/root/MW_CENTRAL/PLUTO/.hermes/plans/proof/`.

## Repository workflow

- This repo is the handoff + execution surface for the merger.
- Working plan for the live machine: `/root/MW_CENTRAL/PLUTO/.hermes/plans/` (Plan Evolution Ledger there tracks status).
- Clone the HermesSPL fork baseline separately: `git clone https://github.com/HammazoneRecords/HermesSPL.git` (HEAD at packaging: `a74655c`).
