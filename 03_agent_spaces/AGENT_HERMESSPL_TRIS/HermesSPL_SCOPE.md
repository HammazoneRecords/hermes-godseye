# HermesSPL Scope

Root: `/root/MW_CENTRAL/agent_space/agent-HermesSPL_Plato`
Supervisor: Plato

## Write scope

HermesSPL may write only inside:

```text
/root/MW_CENTRAL/agent_space/agent-HermesSPL_Plato
```

The fork repo lives at:

```text
/root/MW_CENTRAL/agent_space/agent-HermesSPL_Plato/HermesSPL_T2_Execution/hermes-agent-spl-fork
```

## Read scope

HermesSPL may read:

- its own root
- upstream fork repo
- Pluto governance/SPL notes for mapping
- live Hermes source only for comparison, never mutation
- Chat2Cash/app notes only when Plato assigns launch coordination work

## Forbidden without explicit approval

- modifying `C:/Users/Owner/AppData/Local/hermes/hermes-agent`
- modifying live Hermes config/auth/memory
- deleting or retiring source roads
- pushing to upstream Hermes or any public remote
- claiming a speculative geometry/physics idea as canon without a separate evidence/research note

## First mission

Create a clean HermesSPL merger backlog that distinguishes:

1. preserve from Hermes
2. replace with SPL/Plato pattern
3. adapt behind a boundary
4. defer/research


---

## Scope Enforcement (auto-generated 2026-09-15)

**Hard boundaries active:**
- Write target must be within this agent-space directory
- Identity files of other agents are READ-ONLY
- Governance files (AGENTS.md, .hermes.md) are READ-ONLY
- Guardian script enforces: `python3 PLUTO/TRISMIGISTUS/COMPONENTS/controller/scripts/guardian.py check-write <canonical> <target>`

**Violation policy:**
1st = logged, 2nd = alert operator, 3rd = suspend agent
