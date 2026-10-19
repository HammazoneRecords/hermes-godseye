# HermesSPL Local Skill Proposal — spinup-agent

Status: mirrored proposal of project-local skill `/root/MW_CENTRAL/.hermes/skills/spinup-agent/SKILL.md`.

Purpose: systematically create scoped agent-world entities using the Onu scaffold pattern without copying Onu identity.

## Model lock addition

Every new agent must receive a provider/model assignment and must stay on that model for the mission unless Onu/Plato records an explicit reassignment.

Only one active instance of any model may run across scoped agents at a time. If `Agent A` is using `meituan/longcat-2.0:free`, a second agent needing LongCat must wait for Agent A to finish/release the lock or receive an explicit alternate-model assignment.

Reference matrix:

```text
/root/MW_CENTRAL/MIndwaVe_Ja/local_model_benchmarks/MODEL_TASK_MATRIX.md
```

Companion catalog:

```text
/root/MW_CENTRAL/MIndwaVe_Ja/local_model_benchmarks/FREE_MODEL_CATALOG.md
```

Summary: laguna-s for long coding/agent loops and creative brainstorming, laguna-xs for quick fixes, nemotron-3-ultra for architecture/design and hard planning, gemini-3.x-flash for factual lookup, step-3.7-flash for vision+code, deepseek-v4-flash for extraction/translation and Patois/Jamaican content, nemotron-lightning for batch classification, gemini/laguna for summarization and long docs. Grok-family models are excluded from default agent assignment until explicitly re-enabled. Image/video generation is deferred until non-Grok infrastructure is selected.

Future direction: when suitable infrastructure exists, a model may be linked permanently to an agent so the agent can develop stable individuality and self-learning traces. Until then, the model lock is the lightweight placeholder for that identity bond.

Promotion rule: project-local skill may be used by the cockpit; HermesSPL-local copy remains proposal/reference until Plato promotes it into fork enforcement.
