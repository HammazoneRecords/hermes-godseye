# GODSEYE Scope

In scope:
- Dashboard design and specification
- Agent/data-flow visualization
- Metaphor mapping (flight/orbit/globe)
- Visual system architecture
- **Building the actual dashboard frontend** (React + CesiumJS, referencing EARTH-MOON/godseye/)
- **Agent activity monitoring layer** (live task packets, agent nodes, flight paths)
- **Data dump visualization** (memory bank compression, pins, compression events)
- **Replay mode** (conclusion change timeline)
- **Integration with existing Godseye dashboard** (extend metadata-only monitor to live agent view)

Out of scope:
- Modifying agent behavior
- Canon promotion
- Building the full CesiumJS globe from scratch (use Godseye View repo as reference)

Read root: `/root/MW_CENTRAL/PLUTO/GODSEYE_DASHBOARD/`
Reference repo: `/root/MW_CENTRAL/EARTH-MOON/godseye/`
Write root: own agent-space + GODSEYE_DASHBOARD/

---

## Implementation Phases

### Phase 1 — Agent Activity Dashboard (Current)
- Build the agent activity view in the center panel
- Show active agents as cards with status, model, current task
- Show task packets moving between agents
- Show memory layers and concept graph
- Show fact-check queue and feedback history

### Phase 2 — 3D Knowledge Globe
- Add CesiumJS globe to the center panel
- Agents orbiting as nodes (altitude = confidence)
- Task packets as animated flight paths
- Color coding: facts (green), hypotheses (yellow), corrections (red), approvals (blue)
- Click agent node → cockpit view (context, model, tools, pending claims)

### Phase 3 — Replay Mode
- Timeline slider to replay how a conclusion changed
- Show agent decisions, feedback, and corrections over time
- Compare different agent paths to the same conclusion

### Phase 4 — Full NVP Cockpit
- Real-time agent monitoring with live task packets
- Memory curator autonomy (tiered: auto-execute, logged, human-confirm)
- Fact-check queue processing with claim verification
- Integration with AgentMail and Canary delivery

---

## Scope Enforcement (auto-generated 2026-09-15)

**Hard boundaries active:**
- Write target must be within this agent-space directory
- Identity files of other agents are READ-ONLY
- Governance files (AGENTS.md, .hermes.md) are READ-ONLY
- Guardian script enforces: `python3 PLUTO/TRISMIGISTUS/COMPONENTS/controller/scripts/guardian.py check-write <canonical> <target>`

**Violation policy:**
1st = logged, 2nd = alert operator, 3rd = suspend agent
