# HermesSPL Baseline Verification

Date: 2026-09-02

## Created root

```text
/root/MW_CENTRAL/agent_space/agent-HermesSPL_Plato
```

## Created fork repo

```text
/root/MW_CENTRAL/agent_space/agent-HermesSPL_Plato/HermesSPL_T2_Execution/hermes-agent-spl-fork
```

## Clone command result

```text
Cloning into '/root/MW_CENTRAL/agent_space/agent-HermesSPL_Plato/HermesSPL_T2_Execution/hermes-agent-spl-fork'...
Your branch is up to date with 'origin/main'.
Already on 'main'
HEAD is now at 593aa74c61 test(state): pin that a v28 install still runs the trigram cron-exclusion migration
Fork baseline:
593aa74c61 test(state): pin that a v28 install still runs the trigram cron-exclusion migration
Remote:
origin https://github.com/NousResearch/hermes-agent.git (fetch)
origin https://github.com/NousResearch/hermes-agent.git (push)
Status: clean
```

## Pluto manifest verification before fork work

Initial verifier failed because hook audit log changed after it was manifested:

```text
VERIFY_STATUS=FAIL
ERROR|hash mismatch for D:\MW_CENTRAL\PLUTO\Y-MINDWAVE\H3_SYSTEM\07_HOOKS\02_LOGS\post_tool_audit.jsonl
unmanifested_folders=0
unmanifested_files=0
```

Refreshed manifests and verified again:

```text
updated folder_manifests=301
updated total_registered_manifests=303
VERIFY_STATUS=PASS
folders_verified=301
folder_manifests_verified=301
registry_entries=303
external_hash_entries=303
unmanifested_folders=0
unmanifested_files=0
folder_purity_violations=0
```

## Boundary status

- Live Hermes install was not modified for SPL work.
- New fork was created from upstream GitHub directly.
- Write scope for HermesSPL is limited to its agent root.
- Pluto itself now verifies clean after manifest refresh.
