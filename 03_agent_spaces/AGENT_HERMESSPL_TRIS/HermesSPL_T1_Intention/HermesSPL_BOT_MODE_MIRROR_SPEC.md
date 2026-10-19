# HermesSPL Bot-Mode Mirror Protocol — SPEC v1.0

**Status:** draft / ratified-by-decisions
**Owner:** HermesSPL (reports to Plato)
**Date:** 2026-09-02
**Root canonical:** `D:\MW_CENTRAL\agent_space`
**Root render:** `C:\Users\Owner\AppData\Local\hermes` (HERMES_HOME — NOT `~/.hermes`)

---

## 1. Purpose

Bot Mode (Hermes profiles) is a disposable **render target**. Agent Space is the
**canonical source of truth**. This protocol defines how the two stay in sync
so that:

1. A Hermes update that changes Bot Mode schema/locations never destroys our state.
2. Every runtime artifact (chat history, tool output, memory) is captured to a
   versionable, append-only archive in Agent Space.
3. We edit ONLY Agent Space files; Bot Mode is regenerated from them.

## 2. Verified live-system facts (evidence-backed, 2026-09-02)

```text
HERMES_HOME = C:\Users\Owner\AppData\Local\hermes
default profile lives at HERMES_HOME root (not under profiles/)
named bots live at HERMES_HOME\profiles\<name>\

state.db  = canonical store (SQLite)
  messages:        10,951 rows  (assistant 4,222 / tool 5,913 / user 821)
  sessions:            89 rows
  system_prompts:      table exists
  tool output is stored as JSON in messages.content (~24M chars total)

sessions\*.json  = request_dump files (raw provider request snapshots)
  keys: timestamp, session_id, reason, request, error
  NOT full transcripts — 24 dumps for 89 sessions. DO NOT treat as backup.
```

## 3. Direction rules (single adaptation point)

| Source | Render | Direction |
|---|---|---|
| `agent-{A}_{G}\{A}_SOUL.md` | `profiles\<a>\SOUL.md` | **push** (agent space wins) |
| `agent-{A}_{G}\{A}_USER.md` | `profiles\<a>\memories\USER.md` | **push** |
| `agent-{A}_{G}\{A}_SCOPE.md` | `profiles\<a>\skills\scope\SKILL.md` | **push** |
| `agent-{A}_{G}\{A}_config.yaml` | `profiles\<a>\config.yaml` | **push** |
| `agent-{A}_{G}\{A}_skills\` | `profiles\<a>\skills\` | **push** |
| `agent-{A}_{G}\{A}_MEMORY.md` | `profiles\<a>\memories\MEMORY.md` | **NO MIRROR — weekly snapshot** |
| `agent-{A}_{G}\{A}_archive\state_export\` | `state.db` (messages/sessions/system_prompts) | **pull via export** |
| `agent-{A}_{G}\{A}_archive\sessions\` | `profiles\<a>\sessions\*.json` | **pull append (secondary)** |

### Invariants

1. **Edit only Agent Space files.** Bot Mode is never hand-edited.
2. **Runtime output is append-only archive.** Nothing Bot Mode "improves" or
   deletes is ever lost — we can reconstruct older state.
3. **The sync script is the single adaptation point.** If Hermes moves the Bot
   Mode schema, fix one mapping table, not the architecture.
4. **MEMORY.md is never pushed back.** Weekly snapshot only. Rationale: a bot
   writes its own `memories/MEMORY.md` at runtime (self-improvement). A live
   bidirectional mirror risks clobbering canonical content. Snapshots capture
   the bot's runtime lessons without a merge conflict.

## 4. State export — the backup core

The complete, versionable backup is the export of `state.db`, NOT the
`request_dump` files.

```text
state.db
  ├── messages         → data/messages.jsonl      (one JSON object per row)
  ├── sessions         → data/sessions.jsonl
  ├── system_prompts   → data/system_prompts.jsonl
  └── schema.sql       → full DDL (real tables + FTS virtual tables)
  └── manifest.json    → counts + timestamp + source hash
```

- JSONL versions cleanly (line-based diff, no binary churn).
- Tool output is preserved (it lives in `messages.content`).
- Rebuild = apply `schema.sql` + re-import JSONL + rebuild FTS index.

### Skip from data export (derived/rebuildable)

- `messages_fts*` (FTS shadow tables) — rebuilt from `messages`
- `sqlite_sequence` — auto-maintained

### Proven / unproven (honest status, UPDATED 2026-09-02)

- **Proven (export side):** every table readable, counts verified via
  `export_state_db.py`.
- **Proven (rebuild side):** Hermes ships a NATIVE round-trip —
  `hermes sessions export backup.jsonl` (default `jsonl` format) + `hermes
  sessions import`. Verified in fork source (`hermes_state_portability.py`):
  - `export_session()` / `export_all()` return full session metadata + all
    messages (`get_messages()` → `SELECT * FROM messages`), INCLUDING
    `content` (raw tool output) and `tool_calls`.
  - `import_sessions()` → `_insert_message_rows()` inserts `content` in full
    via `_encode_content(...)`. Full fidelity on conversation history.
  - What import INTENTIONALLY resets: live runtime state only
    (`last_activity_*`, gateway routing, handoff, rewind, channel ownership).
    Correct behavior — you restore conversation, not fake "working…" activity.

## 5. Rebuild path — RESOLVED

**Primary (use this): native round-trip.**

```bash
hermes sessions export backup.jsonl            # versionable, full fidelity
hermes sessions import backup.jsonl            # restore conversation history
```

The native export/import is the clean, supported, versionable rebuild path.
Do NOT write a custom importer — Hermes already does it correctly.

**Secondary (retired, kept for archival use): `export_state_db.py`**

The native export covers `sessions` + `messages` (conversation). It does NOT
cover the other live/runtime tables (`hosted_room_*`, `gateway_routing`,
`async_delegations`, `cron`, etc.) — which are exactly the state you should
NOT blindly rebuild (it's live machine ownership, not durable history).

`export_state_db.py` is **RETIRED from the active backup path** (2026-09-02):
the native round-trip replaces it for backups. The script file is KEPT in
`HermesSPL_T2_Execution/scripts/` for one-off forensic/audit exports of the
full 28-table db when needed, but it is not maintained and not the rebuild
path.

### The "Claude/Codex import" caveat is a DIFFERENT feature

Docs note "the import is a clean transcript, not a byte-for-byte replay" —
that text applies to `hermes sessions import --from claude/codex` (importing
FOREIGN tools' logs), NOT the native `backup.jsonl` round-trip. Confirmed by
reading `_insert_message_rows`: native import preserves `content` fully.

## 6. Model / instance lock (inherited from spinup-agent)

One active instance of any model at a time across scoped agents. A Bot's model
is pinned in its profile (`config.yaml` / profile model pin). See
`spinup-agent` skill and `MODEL_TASK_MATRIX.md`.

## 7. Open questions

- [x] Confirm rebuild path (A vs B) — **RESOLVED: native round-trip (B).**
- [ ] Decide snapshot cadence + retention for `MEMORY.md` weekly snapshots.
- [ ] Decide whether `request_dump` files are worth archiving at all (secondary).
