# HermesSPL First Scope Audit Task

**Agent:** HermesSPL
**Assigned by:** Plato
**Created:** 2026-09-02
**Output target:** `HermesSPL_T2_Execution/HermesSPL_first_scope_audit.md`

---

## Task

Inventory only the `D:\MW_CENTRAL\agent_space\agent-HermesSPL_Plato` folder
(excluding the fork repo's internal upstream content) and report:

1. Which HermesSPL-owned core files exist.
2. Which HermesSPL-owned workspace folders exist.
3. Whether any forbidden context files exist.
4. Whether any secret-bearing files exist.
5. Whether all top-level files use the `HermesSPL_` prefix.
6. Fork baseline HEAD.
7. Any naming, scope, or route inconsistencies.

---

## Forbidden Context Files to Check

- `.hermes.md`
- `AGENTS.md`
- `CLAUDE.md`
- `SOUL.md`
- `USER.md`
- `MEMORY.md`
- `.env`
- `auth.json`

---

## Report Format

Use the reporting lanes from `HermesSPL_REPORTS_TO_Plato.md`:

1. **SOURCE / VERIFIED**
2. **GENERATED / RECOMMENDATION**
3. **UNCERTAINTY / BLOCKERS**

---

## Guardrail

Do not read outside `agent-HermesSPL_Plato` for this audit (the fork repo's
own internal files are in-scope as read-only). Do not edit anything except the
assigned output report and the two scaffold gaps this audit identifies
(`HermesSPL_cron/` folder + this task file).
