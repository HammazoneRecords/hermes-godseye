---
name: godseye-replay-mode
description: "Godseye replay mode: agent decision timeline."
version: 0.1.0
author: Ovando Brown, Hermes Agent
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [pluto, godseye, replay, timeline, verification]
    related_skills: [godseye-agent-dashboard, godseye-monitor]
---

# Godseye Replay Mode

## When to Use

Use when reviewing how a conclusion, claim, or decision evolved over time. Shows the full chain of agent actions, feedback, corrections, and gate assessments that led to the final state.

## Procedure

1. Identify the conclusion/claim to replay
2. Gather all related agent actions from logs and receipts
3. Build a timeline of events:
   - Original claim/agent action
   - Feedback received
   - Corrections made
   - Gate assessments (Jhanos gates)
   - Final state
4. Render as an interactive timeline
5. Allow scrubbing through events
6. Show what changed at each step and why

## Data Sources

- `PLUTO/AGENT_ARENA/ACTIVE/AGENT_*/logs/` — Agent execution logs
- `PLUTO/AGENT_ARENA/EXCHANGE/` — Task packet receipts
- `PLUTO/GODSEYE_DASHBOARD/data/dashboard.json` — Metadata snapshot
- `PLUTO/AGENT_ARENA/ACTIVE/AGENT_GODSEYE_TRIS/GODSEYE_MEMORY.md` — Agent memory

## Output

A timeline visualization showing:
- Event timestamp
- Agent involved
- Action type (claim, feedback, correction, gate assessment)
- What changed
- Link to evidence/receipt

## Verification

- Timeline renders correctly for a known conclusion
- Each event shows agent, action, and evidence
- Scrubbing works smoothly
- Gate assessments are preserved in order

## Pitfalls

- Do NOT invent events that didn't happen — only show verified actions
- Do NOT skip failed attempts — they are part of the timeline
- Distinguish between claims and verified facts at each step
