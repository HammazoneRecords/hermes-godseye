# MAP_SCOPE_SPEC — Godseye Agent Dashboard

## Location

`/root/MW_CENTRAL/PLUTO/GODSEYE_DASHBOARD/MAP_SCOPE_SPEC.md`

## What It Is

The full scope specification for the Godseye agent dashboard — the visualization layer that makes the HermesSPL multi-agent mesh legible. Created by the GODSEYE agent (AGENT_GODSEYE_TRIS) during Phase 1 implementation.

## Structure

The spec covers:

1. **Cosmic Architecture** — Earth/Pluto/Moon/Jhanos Gates/Caves model
2. **Metaphor Mapping** — Visualization entities (planes, ships, spaceships, satellites, territories, ports, borders, caves)
3. **Color Coding** — 9-color system (green=verified, yellow=pending, red=correction, blue=tool, gold=human, orange=warning, cyan=infrastructure, purple=memory, white=idle, pink=traffic)
4. **Altitude = Confidence** — High (>50km) = core, Mid (20-50km) = active, Low (<20km) = workers
5. **Traffic Controllers** — ATC (messages), STC (cargo), SPTC (interplanetary)
6. **Implementation Phases** — 5 phases from metadata monitor to full 3D globe
7. **Tech Stack** — Phase 1: Vanilla JS. Phase 2+: React + CesiumJS
8. **Reference Architecture Mapping** — Maps Godseye View repo layers to agent concepts
9. **Agent Card Spec** — Agent inspector panel layout
10. **Queue/Memory/Feedback Panel Specs** — Data display specifications
11. **Boundary/Permission Model** — Earth=canonical, Pluto=agent-space, Moon=escrow

## Implementation Status

- **Phase 1** — Completed: Vanilla JS dashboard with 5 tabs (Agents, Task Flow, Memory, Fact-Check, Feedback)
- **Phase 2** — Next: CesiumJS 3D globe with Earth-Pluto-Moon layout
- **Phase 3** — Future: Agent-to-agent message arcs, real-time SSE feeds
- **Phase 4** — Future: ATC/STC/SPTC traffic controller queues
- **Phase 5** — Future: Full NVP cockpit with replay mode

## Key Files

| File | Purpose |
|------|---------|
| `GODSEYE_DASHBOARD/index.html` | Phase 1 dashboard |
| `GODSEYE_DASHBOARD/app.js` | Vanilla JS logic |
| `GODSEYE_DASHBOARD/styles.css` | Dark theme styling |
| `GODSEYE_DASHBOARD/data/agents.json` | 21 agents with roles/models |
| `GODSEYE_DASHBOARD/data/dashboard.json` | Live metadata snapshot |
| `AGENT_GODSEYE_TRIS/MAP_SCOPE_SPEC.md` | Full scope spec |
