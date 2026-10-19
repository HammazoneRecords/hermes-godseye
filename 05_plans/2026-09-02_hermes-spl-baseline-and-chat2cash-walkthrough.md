# HermesSPL Baseline + Chat2Cash Walkthrough Capture

Date: 2026-09-02

## User signal

The live Hermes instance was being modified/updated while being used as the working cockpit. User realized this blurs boundaries: some scripts thought to be newly created were actually changes inside the active Hermes instance.

## Boundary decision

Do **not** use the current live Hermes instance as the SPL merger development surface.

Instead:

1. Keep the live Hermes Desktop/session as the supervised cockpit.
2. Create a dedicated agent-world fork of the newest Hermes.
3. Use that fork as the clean baseline for HermesSPL merger work.
4. Keep the fork inside the agent/SPL world, not mixed into the live running install.
5. Preserve enough of Hermes to serve as a foundation, but avoid inheriting too much of Hermes's default way of doing things where it conflicts with the user's SPL/Plato architecture.

## Current baseline evidence

After update, live Hermes reports:

```text
Hermes Agent v0.21.0 (2026.8.31)
HEAD: 593aa74c61
Status: up to date
```

Prior scroll/jump issue appeared around:

```text
09fa753366
```

The update to `593aa74c61` appeared to fix the UI/terminal top-to-bottom replay scroll/jump symptom.

## Open backend caution

Latest logs still showed context-engine SQLite thread warnings after the UI issue looked fixed:

```text
Context engine select_context hook failed
sqlite3.ProgrammingError: SQLite objects created in a thread can only be used in that same thread
```

Treat this as a separate Hermes runtime issue to investigate later; do not confuse it with the UI scroll fix.

## Geometry/research thread

User wants research/formalization around:

- farbelos / arbelos
- spiral
- torus
- shadow/reflection projection
- 90° upright-body-to-ground-shadow relation
- T1/T2 meeting at right angle
- 3D/4D projection onto flat surface
- reflection/shadow as constrained by the higher-dimensional body's motion

Field observation:

- Walking with son.
- Son jumped; user jumped too.
- Shadow moved forward on ground when body jumped/leaned.
- Leaning forward brings head lower, making the projected shadow look shorter/different.
- User noticed standing upright + ground shadow forms a 90° relation: vertical body and horizontal projected image.
- Shadow seems to begin/emerge under the feet: standing on/over the origin of the projection.
- This linked back to farbelos/arbelos T1/T2 and the 90° angle marker as the visible sign of separation.

Interpretive note:

This remotivated the user: survival as first skill; entropy/friction creates contrast that can be used to appreciate and continue the larger work for his son.

## Chat2Cash immediate priority

User needs to launch Chat2Cash ASAP and has downloaded OBS Studio.

First video goal:

- simple walkthrough
- likely screen-recorded introduction / demo
- do not overbuild before launch

Suggested near-term sequence:

1. Stabilize Hermes cockpit enough for work.
2. Prepare OBS for first Chat2Cash walkthrough.
3. Script a short walkthrough outline.
4. Record a simple first video.
5. In parallel/later, scaffold the dedicated HermesSPL fork baseline agent.

## Proposed next actions

- Create a scoped SPL baseline agent/fork root under `D:/MW_CENTRAL/agent_space/`.
- Do not patch `C:/Users/Owner/AppData/Local/hermes/hermes-agent` for SPL experiments.
- Capture user book notes as additions backlog when provided.
- Keep Chat2Cash launch path lightweight and immediate.
