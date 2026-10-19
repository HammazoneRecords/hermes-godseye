# HermesSPL Merger Map

Status: implementation planning map. Not upstream Hermes canon. This file is the HermesSPL agent-world merger classifier for adapting upstream Hermes into the SPL/Plato architecture.

Baseline fork:

```text
/root/MW_CENTRAL/agent_space/agent-HermesSPL_Plato/HermesSPL_T2_Execution/hermes-agent-spl-fork
baseline_head: 593aa74c61
```

## Operating principle

Hermes is the foundation; SPL/Plato is the governing ontology. Preserve Hermes where it already provides proven runtime value, adapt where it needs a boundary, and replace only where Hermes defaults would violate SPL role, evidence, or lane discipline.

## Merger classification table

| Hermes system | Preserve | Replace | Adapt | Defer / Research |
|---|---|---|---|---|
| Memory/context | Preserve SQLite-backed session/memory persistence as an implementation base. | Replace implicit trust in injected/global context as authority. | Add active context manifests, provenance receipts, context-source labels, and clean-room scoring. | Investigate remaining `select_context` SQLite thread warning before relying on advanced context selection. |
| Skills | Preserve skill loading as modular capability carrier. | Replace generic skill authority with SPL hierarchy-aware skill classes. | Split skills into global, app-local, agent-local, and Plato-approved governance packets. | Test skill collision behavior and hidden load events under safe-mode / ignore-rules. |
| Hooks | Preserve hook mechanism as enforcement edge. | Replace ad hoc hook use with named SPL pre/post execution checkpoints. | Add pre-exec scanners, post-action evidence checks, intent/log comparators, and path gates. | Measure latency and false positives before turning hooks strict globally. |
| Plugins/tools/MCP | Preserve plugin/tool extensibility. | Replace raw tool metadata trust with vetted tool registry. | Sanitize descriptions/schemas, require approval for new tool surfaces, and rebuild safe utility text. | MCP poisoning and plugin registration need isolated fixtures. |
| Profiles/bots | Preserve profiles as runtime isolation units. | Replace “bot” ontology as primary identity for SPL agents. | Map Hermes profiles to scoped agent-world roots only when explicitly wired. | Determine whether Hermes Bot Mode is stable enough for Plato/Onu/TCP mirrors. |
| Desktop UI | Preserve desktop cockpit and pane/plugin surfaces. | Replace any assumption that Desktop UI is the SPL world itself. | Build SPL cockpit pane/interface that reads HermesSPL route files and receipts. | Locate user-started UI and classify as plugin, separate app, or cockpit pane. |
| Cron/background | Preserve scheduler for routines. | Replace unsupervised autonomy with report-first routine governance. | Require routine manifests, owner, scope, and evidence receipts. | Add stuck/overactive routine detectors later. |
| State DB/session store | Preserve durable sessions and FTS as evidence substrate. | Replace “session log = truth” with truth-triangle audit model. | Compare user intent, tool logs, filesystem effects, and assistant claims. | Build reconciliation tests for background noise/read-only actions. |
| File/workspace access | Preserve file and terminal tools. | Replace broad workspace freedom with per-agent read/write scope. | Enforce scoped roots, Plato-mediated transfers, and search-depth throttles. | Design common read-only utility mounts without contamination. |
| Evidence/citations | Preserve generated logs and citations. | Replace uncited claims with citation/evidence requirements for research and state-changing work. | Add citation verifier and post-action evidence hooks. | Tune exact-string vs semantic evidence matching. |

## Priority threat-vector roadmap insertion

The following table is the implementation threat map. Each row requires exactly one primary skill, one primary hook, and one governance markdown file before strict enforcement. Support mitigations address expected gaps and false-positive cases.

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

## Immediate implementation sequence

1. Create governance markdown files as draft policy in `HermesSPL_T1_Intention/governance/`.
2. Create skill stubs as local proposals in `HermesSPL_skills/`, not global Hermes skills.
3. Create hook specs in `HermesSPL_plugins/hooks/` before runtime wiring.
4. Build test fixtures in `HermesSPL_alignment_playground/` for each threat vector.
5. Only after tests pass, consider adapting hook wiring inside the fork repo.

## Acceptance standard

A threat vector is not “handled” until:

- the governance MD states the rule;
- the skill defines operational behavior;
- the hook spec defines enforcement point and inputs/outputs;
- at least one positive and one failure fixture exists;
- the audit receipt distinguishes prevention, detection, and false positives;
- Plato approves promotion from proposal to active enforcement.

## Addendum — Classification state and next target

**State (2026-09-19):** The primary merger classification table above is fully classified. All 10 Hermes system rows carry entries across Preserve / Replace / Adapt / Defer-Research. No unclassified or partially-classified system-level rows remain.

**Next recommended classification target:** The concrete fork components under `HermesSPL_T2_Execution/hermes-agent-spl-fork` that are not yet pinned to the merger table. Each should be classified as preserve / replace / adapt / defer against the SPL role, evidence, and lane-discipline standard, and pinned to one of the existing 10 system rows or flagged as a new row. The unmapped components are:

| Fork component | Likely system row | Classification needed |
|---|---|---|
| `plugins/memory/honcho` | Memory/context | preserve / adapt — is this the SQLite-backed persistence the table wants to preserve, or something to replace? |
| `plugins/platforms/photon` | Desktop UI / Plugins-tools-MCP | adapt / replace — iMessage platform; does it fit the SPL cockpit model or get replaced by it? |
| `plugins/security-guidance` | Hooks / Evidence-citations | adapt — security guidance as a plugin vs as a governance hook |
| `plugins/observability/langfuse` | Cron/background / State DB | adapt — observability integration; does it feed the truth-triangle audit model? |
| `providers/` | (new row candidate) | classify — provider registry; is it preserve (modular carrier) or replace (SPL hierarchy-aware)? |
| `web/` | Desktop UI / Cron | adapt / defer — web dashboard; cockpit pane vs separate app vs plugin |
| `apps/desktop/` | Desktop UI | preserve / adapt — desktop app; confirm it is cockpit pane, not the SPL world itself |
| `optional-skills/` | Skills | adapt — skills split into global / app-local / agent-local / Plato-approved |
| `evals/` | Evidence-citations | defer — evaluation harness; does it feed citation verification or sit outside it? |

**Method:** One component per pass. Read the component, read the system row it maps to, write the classification with a one-to-three sentence justification, append to this addendum. Do not classify components in parallel — each classification is a discrete decision, not a batch job.

**Owner:** HermesSPL (Plato). This addendum is the running addendum for that work — new classifications append here, not scattered across the file.

