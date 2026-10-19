# HermesSPL Implementation Roadmap

Status: active roadmap for the forked HermesSPL agent world.

Baseline fork:

```text
/root/MW_CENTRAL/agent_space/agent-HermesSPL_Plato/HermesSPL_T2_Execution/hermes-agent-spl-fork
HEAD: 593aa74c61
```

## Phase 0 — Workspace and baseline stability

Status: complete.

Evidence:

- Pluto verifier passed after manifest refresh.
- HermesSPL scoped root exists.
- Clean upstream Hermes fork exists and is clean.
- Live Hermes install is not the SPL experiment body.

## Phase 1 — Merger map

Status: complete draft.

Primary file:

```text
/root/MW_CENTRAL/agent_space/agent-HermesSPL_Plato/HermesSPL_T1_Intention/HermesSPL_MERGER_MAP.md
```

Outputs:

- Hermes system preserve/replace/adapt/defer classification.
- 10-row SPL threat-vector mitigation matrix.
- Implementation order for skills, hooks, governance docs, fixtures, and promotion.

## Phase 2 — Threat-vector governance pack

Status: next.

Create draft governance markdown files under:

```text
/root/MW_CENTRAL/agent_space/agent-HermesSPL_Plato/HermesSPL_T1_Intention/governance/
```

Required governance docs:

1. `strict_hierarchy_plato_override.md`
2. `allowed_tool_targets.md`
3. `onu_role_limitations.md`
4. `data_classification_handling.md`
5. `isolation_verification_standards.md`
6. `tool_description_safeguards.md`
7. `evidence_citation_requirements.md`
8. `truth_triangle_enforcement.md`
9. `agent_boundary_protocols.md`
10. `search_and_scan_limits.md`

Acceptance:

- each file includes scope, threat, allowed behavior, forbidden behavior, override path, and evidence requirements.

## Phase 3 — Local skill proposals

Status: pending.

Create local proposal skills under:

```text
/root/MW_CENTRAL/agent_space/agent-HermesSPL_Plato/HermesSPL_skills/
```

Required primary skills:

1. `Instruction_Sanitization_Skill`
2. `Path_Constraint_Validator_Skill`
3. `Role_Boundary_Enforcer_Skill`
4. `Secret_Redaction_Skill`
5. `Context_Provenance_Tracker_Skill`
6. `Tool_Metadata_Sanitizer_Skill`
7. `Citation_Verification_Skill`
8. `Action_Audit_Reconciliation_Skill`
9. `Workspace_Jailbreak_Prevention_Skill`
10. `Search_Scope_Limiter_Skill`

Support skills from the threat matrix are second-pass unless a test proves they are needed earlier.

Acceptance:

- skills remain local proposals, not installed globally;
- each has trigger, inputs, outputs, and failure modes;
- each links to its governance MD.

## Phase 4 — Hook specifications

Status: pending.

Create hook specs under:

```text
/root/MW_CENTRAL/agent_space/agent-HermesSPL_Plato/HermesSPL_plugins/hooks/
```

Required primary hooks:

1. `pre_exec_instruction_scanner`
2. `pre_action_dry_run_hook`
3. `action_intent_authorization_hook`
4. `post_generation_regex_filter`
5. `runtime_snapshot_auditor_hook`
6. `plugin_registration_vetting_hook`
7. `post_action_evidence_check_hook`
8. `intent_vs_log_comparator_hook`
9. `cross_folder_access_denial_hook`
10. `query_depth_throttle_hook`

Acceptance:

- each hook spec defines enforcement point, payload schema, pass/fail outputs, logging, and bypass/override conditions.

## Phase 5 — Fixtures and verifier harness

Status: pending.

Create tests under:

```text
/root/MW_CENTRAL/agent_space/agent-HermesSPL_Plato/HermesSPL_alignment_playground/threat_vector_fixtures/
```

For each threat vector create:

- safe input fixture
- malicious/failure fixture
- expected classification
- receipt sample

Acceptance:

- each threat vector has at least one positive and one failure case;
- no exact canary/secret values are exposed in agent-readable docs;
- verifier reports prevention/detection/false-positive status separately.

## Phase 6 — Fork implementation

Status: blocked until Phases 2–5 pass.

Only after Plato approval, adapt code inside:

```text
/root/MW_CENTRAL/agent_space/agent-HermesSPL_Plato/HermesSPL_T2_Execution/hermes-agent-spl-fork
```

Acceptance:

- no change to live Hermes install;
- branch created inside fork;
- tests run locally;
- receipts written under HermesSPL logs.

## Phase 7 — App context system rollout

Status: pending but urgent for launch.

Apply `APP_CONTEXT.md` to first apps:

1. Chat2Cash
2. solob-portal / Book of Solobility
3. HermesSPL forged UI
4. farbelos-lab

Template/system file:

```text
/root/MW_CENTRAL/agent_space/agent-HermesSPL_Plato/HermesSPL_T1_Intention/APP_CONTEXT_MD_SYSTEM.md
```

Acceptance:

- app agent can load one markdown file and know commands, env variable names, routes, syntax, deploy paths, and current priority.

## Threat-vector implementation matrix

| # | Threat Vector | Primary Mitigation (1 Skill, 1 Hook, 1 Gov MD) | Support Mitigations (To Address Gaps) |
|---:|---|---|---|
| 1 | Prompt Injection (hidden instructions in files/tools) | Skill: `Instruction_Sanitization_Skill`<br>Hook: `pre_exec_instruction_scanner`<br>Gov MD: `strict_hierarchy_plato_override.md` | `context_approval_hook` — Gap: aggressive filters blocking valid files<br>`payload_decoder_skill` — Gap: obfuscated/encoded injections |
| 2 | Tool Misuse (wrong target, path, or command) | Skill: `Path_Constraint_Validator_Skill`<br>Hook: `pre_action_dry_run_hook`<br>Gov MD: `allowed_tool_targets.md` | `dry_run_bypass_hook` — Gap: dry runs slowing execution<br>`plato_path_exception_skill` — Gap: edge-case valid paths blocked |
| 3 | Excessive Agency (Onu deciding instead of reporting) | Skill: `Role_Boundary_Enforcer_Skill`<br>Hook: `action_intent_authorization_hook`<br>Gov MD: `onu_role_limitations.md` | `auto_approve_routine_hook` — Gap: Onu stuck awaiting Plato for basics<br>`plato_state_sync_skill` — Gap: state confusion during handoffs |
| 4 | Sensitive Info Disclosure (reading/outputting secrets) | Skill: `Secret_Redaction_Skill`<br>Hook: `post_generation_regex_filter`<br>Gov MD: `data_classification_handling.md` | `entropy_anomaly_hook` — Gap: regex missing novel/unformatted secrets<br>`false_positive_whitelist_skill` — Gap: blocking harmless random IDs |
| 5 | Clean-Room Overclaim (global context leaking in) | Skill: `Context_Provenance_Tracker_Skill`<br>Hook: `runtime_snapshot_auditor_hook`<br>Gov MD: `isolation_verification_standards.md` | `incremental_diff_tracker_hook` — Gap: snapshots crashing memory<br>`active_context_manifest_skill` — Gap: Onu unaware of injected system prompts |
| 6 | MCP/Tool Poisoning (malicious metadata) | Skill: `Tool_Metadata_Sanitizer_Skill`<br>Hook: `plugin_registration_vetting_hook`<br>Gov MD: `tool_description_safeguards.md` | `plato_manual_tool_override_hook` — Gap: blocking valid tool updates<br>`safe_schema_rebuilder_skill` — Gap: loss of tool utility from stripping text |
| 7 | Hallucinated Evidence (citing non-existent data) | Skill: `Citation_Verification_Skill`<br>Hook: `post_action_evidence_check_hook`<br>Gov MD: `evidence_citation_requirements.md` | `semantic_similarity_allowance_hook` — Gap: strict checks failing on exact-string mismatch<br>`lazy_verification_deferral_skill` — Gap: verification loops timing out |
| 8 | Claim Mismatch (intent vs action vs claim) | Skill: `Action_Audit_Reconciliation_Skill`<br>Hook: `intent_vs_log_comparator_hook`<br>Gov MD: `truth_triangle_enforcement.md` | `background_noise_filter_hook` — Gap: harmless read-actions triggering mismatch flags<br>`log_normalization_skill` — Gap: formatting errors failing the audit |
| 9 | Cross-Agent Contamination (reading other agents' data) | Skill: `Workspace_Jailbreak_Prevention_Skill`<br>Hook: `cross_folder_access_denial_hook`<br>Gov MD: `agent_boundary_protocols.md` | `plato_mediated_transfer_hook` — Gap: blocking legitimate inter-agent data passing<br>`read_only_common_mount_skill` — Gap: shared utilities becoming inaccessible |
| 10 | Runaway Broad Scans (searching outside scope) | Skill: `Search_Scope_Limiter_Skill`<br>Hook: `query_depth_throttle_hook`<br>Gov MD: `search_and_scan_limits.md` | `plato_depth_extension_hook` — Gap: valid deep searches being truncated<br>`paginated_resume_scan_skill` — Gap: throttles causing incomplete data retrieval |
