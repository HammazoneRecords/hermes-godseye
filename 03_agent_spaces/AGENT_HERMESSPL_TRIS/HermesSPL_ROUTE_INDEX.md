# HermesSPL Route Index

Agent root: `/root/MW_CENTRAL/agent_space/agent-HermesSPL_Plato`
Reports to: TRISMIGISTUS
Role: dedicated fork/baseline world for HermesSPL merger work.

## Core paths

- Soul: `HermesSPL_SOUL.md`
- Scope: `HermesSPL_SCOPE.md`
- Supervisor contract: `HermesSPL_REPORTS_TO_Plato.md`
- Intention lane: `HermesSPL_T1_Intention/`
- Execution lane: `HermesSPL_T2_Execution/`
- Fork baseline repo: `HermesSPL_T2_Execution/hermes-agent-spl-fork/`
- Sessions: `HermesSPL_sessions/`
- Logs: `HermesSPL_logs/`
- Cache: `HermesSPL_cache/`

## Baseline

The fork baseline was cloned from upstream Hermes, not copied from the live running install.

```text
repo: https://github.com/NousResearch/hermes-agent.git
branch: main
baseline_head: 593aa74c61
baseline_commit: test(state): pin that a v28 install still runs the trigram cron-exclusion migration
```

## Boundary

Live Hermes at `C:/Users/Owner/AppData/Local/hermes/hermes-agent` is the cockpit/runtime and must not be used for SPL experiments.

This agent-world fork is the body for HermesSPL investigation and merger design.
