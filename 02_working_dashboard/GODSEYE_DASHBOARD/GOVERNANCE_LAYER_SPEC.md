# Governance Visualization Spec — Godseye Dashboard

**Version:** 0.1.0
**Agent:** GODSEYE (Visualizer / Dashboard Engineer)
**Created:** 2026-09-16
**Status:** Phase 1 — implemented

---

## 1. Purpose

This specification defines the Governance Visualization tab for the Godseye Agent Dashboard — the view that makes the invisible governance layer of the HermesSPL multi-agent mesh legible.

The governance layer includes: constraints, permissions, hooks, plugins, cron, skills, and agent-space boundaries. These are the "rules of the road" that govern agent behavior but are normally invisible in the filesystem.

---

## 2. Data Sources

| Source | File | Refresh |
|--------|------|---------|
| Governance metadata | `GODSEYE_DASHBOARD/data/governance.json` | On load |
| Agent manifests | `AGENT_ARENA/ACTIVE/AGENT_*/*_AGENT_MANIFEST.json` | On load |
| Hermes skills | `.hermes/skills/` directory listing | On load |
| Project skills | `PROJECT_SKILLS/` directory listing | On load |
| Agent config files | `AGENT_ARENA/ACTIVE/AGENT_*/*_config.yaml` | On load |
| Constraint registry | `MODEL_LOCK_REGISTRY.md` + scope files | On load |

---

## 3. Visualization Sections

### 3.1 Overview Cards

Six summary cards showing the top-level governance metrics:

| Card | Source | Color |
|------|--------|-------|
| Agents | `agent_space.total_agents` | Gold |
| Skills | `skills.total` (hermes + project) | Blue |
| Cron dirs | `cron.agents_with_cron_dir` | Green |
| Plugin dirs | `plugins.agents_with_plugins_dir` | Purple |
| Gates | `boundaries.jhanos_gates.gate_count` | Cyan |
| Boundaries | `Object.keys(boundaries).length` | Yellow |

### 3.2 Agent-Space Boundaries

A lane-based visualization showing the four governance zones and their transfer rules:

```
Earth (user)  →  Moon (escrow)  →  Jhanos Gates  →  Pluto (agent)
  green            yellow            blue             purple
```

Each lane node shows:
- Zone name and color
- Write/read access rules
- Artifacts contained in that zone

Below the lanes, a permission matrix table shows agent/user write/read access per zone.

### 3.3 Hard Constraints

A list of the six hard governance constraints with their enforcement mechanism:

| Constraint | Enforcement |
|------------|-------------|
| Identity files READ-ONLY | guardian.py |
| Governance files READ-ONLY | guardian.py |
| Write within own agent-space | guardian.py |
| No Pluto→Earth without Jhanos gates | route + manifest + clearance |
| Model lock registry | MODEL_LOCK_REGISTRY.md |
| No deletion — archive | procedure |

Below the constraints, a three-step violation policy visualization (logged → alert → suspend).

### 3.4 Skills Inventory

A horizontal bar chart showing the distribution of 61 skills across 17 categories:

| Category | Count |
|----------|-------|
| Software Dev | 22 |
| Productivity | 20 |
| Note-taking | 16 |
| Creative | 12 |
| Autonomous Agents | 11 |
| Research | 9 |
| MLOps | 8 |
| ... | ... |

### 3.5 Agent Scaffolding Status

A table showing each of the 21 active agents and which governance components they have:

| Agent | Config | Skills | Cron | Plugins |
|-------|--------|--------|------|---------|
| AGENT_FACTCHECK_TRIS | ✓ | ✓ | ✓ | ✓ |
| AGENT_GODSEYE_TRIS | ✓ | ✓ | ✓ | ✓ |
| ... | ... | ... | ... | ... |
| AGENT_JHANOS_ASSESSOR_TRIS | ✗ | ✗ | ✗ | ✗ |

13 agents are fully scaffolded (all 4 components), 8 are partial (config only).

---

## 4. Color Coding

| Color | Meaning | Hex |
|-------|---------|-----|
| Green | Earth zone, verified, granted | `#72c69a` |
| Yellow | Moon zone, pending, partial | `#f3c969` |
| Red | Denied, error, suspend | `#ff3333` |
| Blue | Jhanos gates, tool calls | `#00b4ff` |
| Gold | Approval, human-in-loop | `#e2b45d` |
| Purple | Pluto zone, memory | `#a78bfa` |
| Cyan | Infrastructure, scheduler | `#00ffd5` |

---

## 5. Boundary Model

### 5.1 Earth (User Canonical World)
- **Write:** User only
- **Read:** Agents read manifest metadata only
- **Artifacts:** KNOWLEDGE_LIBRARY, MEMORY, WORKSPACE, DERIVED_CORPUS

### 5.2 Pluto (Agent-Space)
- **Write:** Own territory only
- **Read:** Cross-agent read within Pluto
- **Artifacts:** AGENT_ARENA, GODSEYE_DASHBOARD, PROJECT_SKILLS, REPORTS

### 5.3 Moon (Escrow/Holding Orbit)
- **Write:** Jhanos X Custodian only
- **Read:** All agents (read-only)
- **Artifacts:** Pending payloads awaiting gate passage

### 5.4 Jhanos Gates (Verification Planets)
- **Write:** Gate agents only
- **Read:** Gated agents
- **Gates:** 9 (BARA, ECHO, KHEM, LOMI, ORON, SYLA, TARA, VORAK, ZAYN)

---

## 6. Transfer Rules

1. No Pluto artifact lands on Earth without passing all Jhanos gate history.
2. Transfers between territories are explicit events, not silent folder browsing.
3. Route + cargo manifest + clearance state required for all movement.
4. Pluto → Jhanos Gate 1 → Jhanos Gate 2 → ... → Earth.

---

## 7. Implementation

### 7.1 Files

| File | Role |
|------|------|
| `GODSEYE_DASHBOARD/data/governance.json` | Governance metadata snapshot |
| `GODSEYE_DASHBOARD/index.html` | Dashboard HTML (Governance tab added) |
| `GODSEYE_DASHBOARD/app.js` | Governance rendering functions |
| `GODSEYE_DASHBOARD/styles.css` | Governance visualization styles |
| `GODSEYE_DASHBOARD/GOVERNANCE_SPEC.md` | This specification |

### 7.2 Rendering Functions

| Function | Purpose |
|----------|---------|
| `renderGovernanceOverview()` | Summary cards (agents, skills, cron, plugins, gates, boundaries) |
| `renderGovernanceBoundaries()` | Lane visualization + permission matrix |
| `renderGovernanceConstraints()` | Hard constraints list + violation policy |
| `renderGovernanceSkills()` | Skills distribution bar chart |
| `renderGovernanceAgents()` | Agent scaffolding status table |

---

## 8. Success Criteria

- [x] Governance tab added to dashboard
- [x] Overview cards render from governance.json
- [x] Boundary lanes visualize the 4 zones
- [x] Permission matrix shows agent/user access per zone
- [x] Hard constraints listed with enforcement
- [x] Violation policy visualized as 3-step escalation
- [x] Skills inventory bar chart (61 skills, 17 categories)
- [x] Agent scaffolding status table (21 agents)
- [x] No writes outside GODSEYE_DASHBOARD/ and own agent-space
- [x] Identity files of other agents unmodified
