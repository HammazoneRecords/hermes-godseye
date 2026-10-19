# HermesSPL Model Lock

Status: active
Agent: HermesSPL
Reports to: TRISMIGISTUS

## Assigned model

Task type: code architecture / design, hard reasoning, merger mapping
Provider/model: `nemotron-3-ultra-free` (provider `opencode-free`)
Fallback: `poolside/laguna-s-2.1:free`
Reason: model matrix recommends `nemotron-3-ultra` for code architecture/design and hard planning. The free route is `nemotron-3-ultra-free` on `opencode-free` — there is no bare `nemotron-3-ultra`.

## Concurrency rule

Only one active instance of `nemotron-3-ultra-free` may run at a time across scoped agents unless Plato explicitly approves an exception.

## Release condition

When HermesSPL finishes a work session, write a release receipt under `HermesSPL_logs/` before another agent uses `nemotron-3-ultra-free`.
