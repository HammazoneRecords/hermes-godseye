# MAP_SCOPE_SPEC — Godseye Agent Dashboard

**Version:** 0.1.0
**Agent:** GODSEYE (Visualizer / Dashboard Engineer)
**Created:** 2026-09-15
**Status:** Phase 1 — implementation started

---

## 1. Purpose

This specification defines the map, scope, and metaphor system for the Godseye Agent Dashboard — the visualization layer that makes the HermesSPL multi-agent mesh legible.

The dashboard uses the Godseye View reference repo (`/root/MW_CENTRAL/EARTH-MOON/godseye/`) as the architectural baseline for the 3D globe, HUD overlay, and data layer patterns. The reference is a production CesiumJS + React + Zustand + Vite + Tailwind stack.

---

## 2. Cosmic Architecture

### 2.1 Planets & Orbs

| Body | Role | Authority |
|------|------|-----------|
| **Earth** | User's canonical world (personal/project map) | User-controlled; agents cannot freely write |
| **Pluto** | Agent-space (duplicate of Earth, reshaped for agent territories) | Agents write only inside assigned Pluto territories |
| **Moon** | Escrow/holding orbit (Jhanos X Custodian) | Unresolved payloads wait here until logically manifestable |
| **Jhanos Gates** | Transmutation/verification planets between Pluto and Earth | Each gate appends an assessment report |
| **Caves** | Evidence chambers on Earth | Original payload, gate reports, transmuted versions, final accepted version, refused payloads |

### 2.2 Transfer Rules

- No Pluto artifact lands on Earth without passing all Jhanos gate history.
- Transfers between territories are explicit events, not silent folder browsing.
- Route + cargo manifest + clearance state required for all movement.
- Pluto → Jhanos Gate 1 → Jhanos Gate 2 → Jhanos Gate 3 → ... → Earth.

---

## 3. Metaphor Mapping

### 3.1 Visualization Entities

| Entity | Meaning | View | Reference Layer |
|--------|---------|------|-----------------|
| **Planes** | Fast messages, task assignments, status updates, alerts | Aviation view | `AircraftLayer` |
| **Ships** | Heavy cargo: files, deliverables, reports, datasets, archives | Cargo view | `MaritimeLayer` |
| **Spaceships** | Interplanetary transfers from Pluto to Earth through Jhanos gates | Space view | Custom (Phase 2+) |
| **Satellites** | MCP servers, skills, cron jobs, connectors, external services | Orbital view | `SatelliteLayer` |
| **Territories** | Scoped agent authority (folders, projects, deliverables) | Map regions | `MilitaryBasesLayer` / custom |
| **Ports/Airports** | Transfer points, handoff gates | Map markers | `AirportsLayer` / `MaritimeLayer` |
| **Borders** | Access control boundaries | Map boundaries | `AirspaceLayer` / `ForbiddenZonesLayer` |
| **Caves** | Evidence chambers on Earth | Earth map | Custom (Phase 3+) |

### 3.2 Color Coding System

| Color | Meaning | Hex | Usage |
|-------|---------|-----|-------|
| **Green** | Verified facts, confirmed claims, accepted deliverables | `#72c69a` | F act-check passed, verified agents |
| **Yellow** | Hypotheses, pending claims, unresolved items | `#f3c969` | Pending review, in-flight tasks |
| **Red** | Corrections, errors, refused payloads, security violations | `#ff333` | Fact-check failed, gated rejections |
| **Blue** | Tool calls, MCP connectors, skill invocations | `#00b4FF` | Active tool usage, connectors |
| **Gold** | Human approvals, manual overrides, user confirmations | `#e2b45d` | Human-in-the-loop approval |
| **Orange** | Warnings, degraded health, stale data | `#ff6f3d` | Agent warnings, feed degradation |
| **Cyan** | System infrastructure, scheduler, health checks | `#00ffd5` | Infrastructure status |
| **Purple** | Memory operations, knowledge curation, compression | `#a78bfa` | Memory curator actions |
| **White** | Neutral status, idle, no activity | `#e9edf4` | Default agent state |
| **Pink** | Traffic, vehicle movement, flow | `#ff69b4` | Task packet flow |

### 3.3 Altitude = Confidence Model

Agent nodes are positioned at varying altitudes above the globe based on confidence/priority/uncertainty:

| Altitude Range | Meaning | Agents |
|---------------|---------|---------|
| **High (>50km)** | Core infrastructure, verified, trusted | TRISMIGISTUS, GODSEYE, FACTCHECK |
| **Mid (20-50km)** | Active agents, moderate confidence | LIBRARIAN, CURATOR, MAIL, CANARY |
| **Low (<20km)** | Workers, speculative, uncertain | SPINUP agents, delegated tasks, sandbox |

---

## 4. Traffic Controllers

| Controller | Role | Controls |
|-----------|------|----------|
| **ATC (Air Traffic Controller)** | Controls plane routes between agent territories | Message routing, task assignment, prevents unauthorized landings |
| **STC (Sea Traffic Controller)** | Controls ship routes for heavy deliverables | File transfers, deliverable routing, requires manifests |
| **SPTC (Space Traffic Controller)** | Controls interplanetary transfer from Pluto to Earth through Jhanos gates | Gate assessment, payload verification, transmutation approval |

---

## 5. Dashboard Panels

### 5.1 Layout (Reference: Godseye View HUD)

```
┌──────────────────────────────────────────────────────────────────┐
│ TOP BAR: Branding · Clock · REC · Feeds · Entities · Cache       │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  LEFT PANEL:                                                     │
│  ─ Layer toggles                                                 │
│  ─ Agent territory filters                                        │
│  ─ Color legend                                                  │
│                                                                  │
│  CENTER: 3D Globe (Phase 2) / Agent Cards (Phase 1)              │
│  ─ Agent nodes as cards with status, model, current task         │
│  ─ Task packet flight paths between agents                        │
│  ─ Memory layers visualization                                   │
│  ─ Concept graph                                                 │
│  ─ Fact-check queue                                              │
│                                                                  │
│  RIGHT PANEL:                                                    │
│  ─ Selected agent cockpit view                                   │
│  ─ Inspector for hovered entities                                │
│  ─ Flight/task filters                                           │
│  ─ Feedback history                                              │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│ BOTTOM: Mission HUD · Sys Terminal · Shader toolbar · Radio      │
└──────────────────────────────────────────────────────────────────┘
```

### 5.2 Data Sources (Phase 1)

| Source | File/Location | Refresh |
|--------|---------------|---------|
| `dashboard.json` | `GODSEYE_DASHBOARD/data/dashboard.json` | On load + manual refresh |
| Agent manifests | `AGENT_ARENA/ACTIVE/AGENT_*/AGENT_MANIFEST.json` | On load |
| Agent scope files | `AGENT_ARENA/ACTIVE/AGENT_*/AGENT_SCOPE.md` | On selection |
| Agent task status | `AGENT_ARENA/ACTIVE/AGENT_*/AGENT_TASK_STATUS.md` | On selection |
| Agent soul/identity | `AGENT_ARENA/ACTIVE/AGENT_*/AGENT_SOUL.md` | On selection (read-only) |
| Fact-check queue | Parsed from dashboard.json queues | On load |
| Feedback history | localStorage + `/api/feedback` | On submit |
| Memory layers | dashboard.json memory section | On load |

### 5.3 Polling Intervals (Reference from dataSources.js)

| Source | Interval |
|--------|----------|
| Agent status | 5s (file mtime check) |
| Memory health | 30s |
| Fact-check queue | 60s |
| Feedback | 15s |

---

## 6. Implementation Phases

### Phase 1 — Agent Activity Dashboard (CURRENT)

- [x] Create MAP_SCOPE_SPEC.md
- [ ] Build agent activity view in the center panel
- [ ] Show active agents as cards with status, model, current task
- [ ] Show task packets moving between agents
- [ ] Show memory layers and concept graph
- [ ] Show fact-check queue and feedback history
- [ ] Retain existing metadata-only panel as a footer/summary

### Phase 2 — 3D Knowledge Globe

- [ ] Add CesiumJS globe to the center panel (React + Vite + Zustand stack)
- [ ] Agents orbiting as nodes (altitude = confidence)
- [ ] Task packets as animated flight paths
- [ ] Color coding applied per Section 3.2
- [ ] Click agent node → cockpit view (context, model, tools, pending claims)
- [ ] Integrate with reference repo patterns (layer system, HUD overlay, inspector)

### Phase 3 — Replay Mode

- [ ] Timeline slider to replay how a conclusion changed
- [ ] Show agent decisions, feedback, and corrections over time
- [ ] Compare different agent paths to the same conclusion
- [ ] Integrate with godseye-replay-mode skill

### Phase 4 — Full NVP Cockpit

- [ ] Real-time agent monitoring with live task packets
- [ ] Memory curator autonomy (tiered: auto-execute, logged, human-confirm)
- [ ] Fact-check queue processing with claim verification
- [ ] Integration with AgentMail and Canary delivery
- [ ] SSE Outreach feedback panel integration

---

## 7. Reference Architecture Mapping

### 7.1 Godseye View Patterns → Agent Dashboard

| Reference Concept | Agent Dashboard Equivalent |
|-------------------|---------------------------|
| `AircraftLayer` | Message/task packet flow between agents |
| `SatelliteLayer` | Agent orbits (MCPs, skills, cron jobs) |
| `SeismicLayer` | Fact-check events (verified/corrections) |
| `WeatherLayer` | Agent warnings and system health |
| `MaritimeLayer` | Heavy deliverable transfers (ships) |
| `CCTVLayer` | Agent monitoring feeds |
| `TrafficLayer` | Task/claim flow within agent-space |
| `RadioLayer` | External communication channels |
| `PowerGridLayer` | Agent resource/health status |
| `Shader modes` | Dashboard display modes (default, audit, focus) |
| Zustand store | Global state: agents, tasks, claims, memory |
| `LayerPanel` | Agent/filter toggles |
| `Inspector` | Agent cockpit view |
| `MissionHud` | Agent activity summary |
| `TopBar` | Branding, clock, feed counters |
| `Globe.jsx` | CesiumJS viewer (Phase 2) |

### 7.2 Tech Stack (Phase 2+)

| Component | Reference | Agent Dashboard |
|-----------|-----------|-----------------|
| Framework | React 19 | React 19 |
| Build | Vite 7 | Vite 7 |
| 3D Engine | CesiumJS 1.139 | CesiumJS 1.139 |
| State | Zustand 5 | Zustand 5 |
| Styling | Tailwind 4 | Tailwind 4 |
| Charts | Custom | D3/Three.js for concept graph |

### 7.3 Phase 1 Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Framework | Vanilla JS (HTML/CSS/JS) | Matches existing SSE interface; no build step needed |
| Data | dashboard.json + agent manifest files | Available, structured, metadata-only |
| Styling | CSS custom properties | Existing pattern in current dashboard |
| Server | Static file serving | No backend required for Phase 1 |

---

## 8. Agent Cards Specification

Each agent card displays:

```
┌─────────────────────────────────────┐
│ AGENT_NAME                    [STATUS]│
│ Model: claude-opus-4.1             │
│ Task: Building fact-check queue...  │
│ Memory: 7 layers · 18 concepts      │
│ Queues: 13 fact-check · 0 patents   │
│ ─────────────────────────          │
│ Claims: 5 verified · 2 pending       │
│ Last activity: 2m ago              │
└─────────────────────────────────────┘
```

**Status colors:**
- Green dot: Active, verified, all queues clear
- Yellow dot: Active, has pending items
- Red dot: Error, blocked, or security concern
- Gray dot: Idle, no current task
- Purple dot: Memory operation in progress

**Altitude (vertical position):**
- Core agents at top (verified, trusted)
- Workers at bottom (speculative, sandbox)
- Altitude animates on status change

---

## 9. Task Packet Visualization

Task packets flow between agents as animated dots/packets:

```
Agent A ──────► Agent B ──────► Agent C
    [plane]       [plane]       [ship]
```

- **Planes** (small, fast): Status updates, small claims, tool results
- **Ships** (large, slow): Files, deliverables, datasets
- **Altitude**: Higher confidence = higher altitude
- **Color**: Coded by packet type (claim, correction, approval, tool call, data)

---

## 10. Concept Graph

A force-directed graph showing:

- **Nodes**: Concepts, agents, memory layers
- **Edges**: Relationships (agent→concept, concept→memory, agent→agent)
- **Size**: Importance/usage frequency
- **Color**: Category (fact, hypothesis, claim, memory, agent)

---

## 11. Fact-Check Queue Panel

```
┌─────────────────────────────────┐
│ FACT-CHECK QUEUE (13)            │
│ ─────────────────────────────── │
│ #1 | Claim: "Agent X verified   │
│     Model: claude-opus-4.1      │
│     Confidence: High            │
│     Claims: "Y is true"         │
│     [Approve] [Reject] [Review] │
│ ─────────────────────────────── │
│ #2 | Claim: "Z discovered..."    │
│     ...                          │
└─────────────────────────────────┘
```

---

## 12. Feedback History Panel

```
┌─────────────────────────────────┐
│ FEEDBACK HISTORY                 │
│ ─────────────────────────────── │
│ 2026-09-14 · FACTCHECK          │
│ Rating: ★★★★☆                    │
│ "Claim verified, source exists" │
│ Action: "Promote to verified"   │
│ ─────────────────────────────── │
│ 2026-09-13 · MEMORY             │
│ Rating: ★★★☆☆                    │
│ "Compression was lossy"         │
│ Action: "Review tier 2 data"   │
└─────────────────────────────────┘
```

---

## 13. Integration Points

### 13.1 Existing Dashboard (Current)

- `GODSEYE_DASHBOARD/index.html` — Metadata monitor (extend, don't replace)
- `GODSEYE_DASHBOARD/data/dashboard.json` — Data source
- `REPORTS/outreach-2026/feedback/index.html` — Working feedback pattern

### 13.2 Agent Files (Read-Only)

- `AGENT_ARENA/ACTIVE/AGENT_*/AGENT_MANIFEST.json` — Agent metadata
- `AGENT_ARENA/ACTIVE/AGENT_*/AGENT_SCOPE.md` — Agent scope
- `AGENT_ARENA/ACTIVE/AGENT_*/AGENT_TASK_STATUS.md` — Current tasks
- `AGENT_ARENA/ACTIVE/AGENT_*/AGENT_SOUL.md` — Agent identity (read-only)

### 13.3 Reference Repository (Read-Only)

- `EARTH-MOON/godseye/` — Reference for CesiumJS globe, HUD, layers, state management

---

## 14. Boundary & Permission Model

| Zone | Write Access | Read Access |
|------|-------------|-------------|
| Earth (user workspace) | User only | Agents read manifest metadata |
| Pluto (agent workspace) | Own territory only | Cross-agent read |
| Moon (escrow) | Jhanos X Custodian | All agents (read-only) |
| Jhanos Gates | Gate agents only | Gated agents |

---

## 15. Out of Scope

- Modifying agent behavior or permissions
- Canon promotion (Phase 1)
- Building the full 3D globe (Phase 2)
- Realtime WebSocket feeds (Phase 4)
- Agent-to-agent messaging (existing Hermes infrastructure handles this)

---

## 16. Success Criteria (Phase 1)

- [ ] MAP_SCOPE_SPEC.md created and machine-readable
- [ ] Agent activity cards render from dashboard.json + agent manifests
- [ ] Task packet flow visualization between agents
- [ ] Memory layers and concept graph panel
- [ ] Fact-check queue panel with approve/reject actions
- [ ] Feedback history panel with rating display
- [ ] Existing metadata panel preserved (footer or toggle)
- [ ] No writes outside GODSEYE_DASHBOARD/ and own agent-space
- [ ] Identity files of other agents unmodified

---

## Appendix A: File Paths

| Path | Role |
|------|------|
| `GODSEYE_DASHBOARD/index.html` | Main dashboard (extended) |
| `GODSEYE_DASHBOARD/data/dashboard.json` | Metadata snapshot |
| `GODSEYE_DASHBOARD/MAP_SCOPE_SPEC.md` | This specification |
| `AGENT_ARENA/ACTIVE/AGENT_*/AGENT_MANIFEST.json` | Agent manifests |
| `AGENT_ARENA/ACTIVE/AGENT_*/AGENT_SOUL.md` | Agent identities |
| `AGENT_ARENA/ACTIVE/AGENT_*/AGENT_SCOPE.md` | Agent scopes |
| `AGENT_ARENA/ACTIVE/AGENT_*/AGENT_TASK_STATUS.md` | Agent task status |
| `EARTH-MOON/godseye/` | Reference repository |
