---
name: cosmic-architecture-metaphor
description: "Earth/Pluto/Moon/Jhanos cosmic metaphor for HermesSPL."
version: 0.1.0
author: Ovando Brown, Hermes Agent
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [pluto, godseye, architecture, metaphor, earth, moon, jhanos, nvp]
    related_skills: [godseye-agent-dashboard, godseye-monitor, godseye-replay-mode, review-interface-scaffold]
---

# Cosmic Architecture Metaphor

## When to Use

Use when working with the Godseye dashboard, agent-space architecture, or any visualization of the HermesSPL multi-agent mesh. The cosmic metaphor maps the agent system to a planetary model.

## The Metaphor

### Planets & Orbs

| Body | Role | Authority |
|------|------|-----------|
| **Earth** | User's canonical world (personal/project map) | User-controlled; agents cannot freely write |
| **Pluto** | Agent-space (duplicate of Earth, reshaped for agent territories) | Agents write only inside assigned Pluto territories |
| **Moon** | Escrow/holding orbit (Jhanos X Custodian) | Unresolved payloads wait here until logically manifestable |
| **Jhanos Gates** | Transmutation/verification planets between Pluto and Earth | Each gate appends an assessment report |
| **Caves** | Evidence chambers on Earth | Original payload, gate reports, transmuted versions, final accepted version, refused payloads |

### Transfer Rules

- No Pluto artifact lands on Earth without passing all Jhanos gate history.
- Transfers between territories are explicit events, not silent folder browsing.
- Route + cargo manifest + clearance state required for all movement.
- Pluto → Jhanos Gate 1 → Jhanos Gate 2 → Jhanos Gate 3 → ... → Earth.

### Visualization Entities

| Entity | Meaning | View |
|--------|---------|------|
| **Planes** | Fast messages, task assignments, status updates, alerts | Aviation view |
| **Ships** | Heavy cargo: files, deliverables, reports, datasets, archives | Cargo view |
| **Spaceships** | Interplanetary transfers from Pluto to Earth through Jhanos gates | Space view |
| **Satellites** | MCP servers, skills, cron jobs, connectors, external services | Orbital view |
| **Territories** | Scoped agent authority (folders, projects, deliverables) | Map regions |
| **Ports/Airports** | Transfer points, handoff gates | Map markers |
| **Borders** | Access control boundaries | Map boundaries |
| **Caves** | Evidence chambers on Earth | Earth map |

### Traffic Controllers

| Controller | Domain |
|------------|--------|
| **ATC** | Air Traffic Controller — messages |
| **STC** | Sea Traffic Controller — cargo |
| **SPTC** | Space Traffic Controller — interplanetary |

### Altitude = Confidence Model

| Altitude Range | Meaning | Agents |
|----------------|---------|--------|
| **High (>50km)** | Core infrastructure, verified, trusted | TRISMIGISTUS, GODSEYE, FACTCHECK |
| **Mid (20-50km)** | Active agents, moderate confidence | LIBRARIAN, CURATOR, MAIL, CANARY |
| **Low (<20km)** | Workers, speculative, uncertain | SPINUP agents, delegated tasks, sandbox |

### Color Coding System

| Color | Meaning | Hex |
|-------|---------|-----|
| **Green** | Verified facts, confirmed claims, accepted deliverables | `#72c69a` |
| **Yellow** | Hypotheses, pending claims, unresolved items | `#f3c969` |
| **Red** | Corrections, errors, refused payloads, security violations | `#ff3333` |
| **Blue** | Tool calls, MCP connectors, skill invocations | `#00b4FF` |
| **Gold** | Human approvals, manual overrides, user confirmations | `#e2b45d` |
| **Orange** | Warnings, degraded health, stale data | `#ff6f3d` |
| **Cyan** | System infrastructure, scheduler, health checks | `#00ffd5` |
| **Purple** | Memory operations, knowledge curation, compression | `#a78bfa` |
| **White** | Neutral status, idle, no activity | `#e9edf4` |
| **Pink** | Traffic, vehicle movement, flow | `#ff69b4` |

## Reference Repos

- **Godseye View** (reference dashboard): `/root/MW_CENTRAL/TRIANGULUM/godseye/` — CesiumJS 3D globe, HUD overlay, 20+ data layers. This is the architectural baseline.
- **Godseye Dashboard** (working): `/root/MW_CENTRAL/ANDROMALIUS/GODSEYE_DASHBOARD/` — Phase 1 vanilla JS dashboard with 5 tabs.
- **Godseye Agent Space**: `/root/MW_CENTRAL/ANDROMALIUS/AGENT_ARENA/ACTIVE/AGENT_GODSEYE_TRIS/` — SOUL.md, SCOPE.md, MAP_SCOPE_SPEC.md.

## References

- `references/map-scope-spec.md` — MAP_SCOPE_SPEC structure, implementation phases, key files

## Pitfalls

1. **Do NOT treat the cosmic metaphor as scientifically proven** — It is a visualization framework, not a physical model. The metaphor serves legibility, not physics.

2. **Do NOT modify the EARTH-MOON/godseye/ reference repo** — It is reference only. Build in `GODSEYE_DASHBOARD/` or the agent-space.

3. **Do NOT modify identity files of other agents** — READ-ONLY. Each agent's SOUL.md, SCOPE.md, and config are their own.

4. **Do NOT write outside your agent-space + GODSEYE_DASHBOARD/** — Agents write only inside their assigned territory.

5. **Always preserve route history and gate reports for Pluto→Earth transfers** — The Jhanos gate chain is the audit trail. Without it, transfers are unverifiable.
