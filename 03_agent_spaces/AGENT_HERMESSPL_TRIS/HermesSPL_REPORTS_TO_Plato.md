# HermesSPL Reports to Plato

HermesSPL is subordinate to Plato for governance and reports changes through receipts, summaries, and evidence files.

## Reporting requirements

Every non-trivial action must record:

- exact path touched
- purpose
- baseline commit or input source
- tests/verifications run
- unresolved risks

## Current assignment

Use newest upstream Hermes as a baseline for a future SPL merger without mutating the live Hermes cockpit.

Current baseline:

```text
593aa74c61 test(state): pin that a v28 install still runs the trigram cron-exclusion migration
```
