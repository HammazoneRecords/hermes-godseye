# Godseye Data Model

## Dashboard JSON Structure

```json
{
  "generated_utc": "ISO timestamp",
  "privacy": "metadata_only_no_raw_chat_text",
  "status": "workspace_ready_for_day_one",
  "knowledge": {
    "chat_sources_manifested": 111,
    "telegram_sessions": 1,
    "digests": 9,
    "formal_concepts": 18,
    "fact_check_packets": 13,
    "patent_candidates": 0,
    "unresolved_items": 0
  },
  "agents": {
    "active_scaffolds": 10,
    "component_agents": 11,
    "runtime_verified": false,
    "controller": "TRISMIGISTUS"
  },
  "memory": {
    "layers": 7,
    "curator_status": "staged_not_runtime_verified",
    "root": "/path/to/MEMORY"
  },
  "paths": {
    "workspace_start": "/path/to/START_HERE.md",
    "knowledge_library": "/path/to/KNOWLEDGE_LIBRARY",
    "agent_arena": "/path/to/AGENT_ARENA",
    "components": "/path/to/COMPONENTS",
    "security_readiness": "/path/to/SECURITY_READINESS.md"
  },
  "queues": [
    { "name": "Fact check", "count": 13, "state": "awaiting FACTCHECK review" },
    { "name": "Memory review", "count": 0, "state": "no candidates queued" },
    { "name": "Patent candidates", "count": 0, "state": "not started" },
    { "name": "Chat extraction", "count": 111, "state": "batch progress recorded" }
  ],
  "warnings": [
    "Agent profiles/scaffolds are not proof of live Hermes runtime.",
    "AgentMail and Canary delivery are not runtime-verified.",
    "VPS hardening is staged for review to prevent lockout."
  ]
}
```

## Key Principles

1. **Metadata only** — Never show raw chat text, only counts and paths
2. **Honest labeling** — `runtime_verified: false` means the scaffolding exists but the agent is not live
3. **Queue-driven** — Work flows through named queues with states
4. **Path-traceable** — Every metric can be traced to a filesystem path

## Refresh Procedure

1. Run `python3 scripts/refresh_godseye.py`
2. The script regenerates `GODSEYE_DASHBOARD/data/dashboard.json`
3. The dashboard HTML embeds the JSON as a JavaScript literal
4. No server needed — open `index.html` directly in browser
