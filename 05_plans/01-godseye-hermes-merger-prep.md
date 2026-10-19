# Result: 01-godseye-hermes-merger-prep
_Generated 2026-10-19 01:10 via glm-5.3 (z.ai task bridge)_

# Execution Plan — Hermes Agent Update + Godseye Dashboard Merge into HermesSPL

**Operator handoff · Version 1.0 · Scope: live Hermes install, HermesSPL fork (baseline `a74655c`, 2026-09-21), Godseye dashboard at `/root/MW_CENTRAL/PLUTO/GODSEYE_DASHBOARD/`**

---

## 0. Ground Rules, Assumptions & Missing Input

### Hard constraints (enforced throughout)

1. **Never write to** `/root/MW_CENTRAL/EARTH-MOON/` — this includes the `godseye` reference repo *and* `HERMESSPL-UNIFIED-ARCHITECTURE.md` (Earth is the user's canonical world; agents read manifest metadata only, per the governance spec).
2. **Agent-scope writes only.** All GODSEYE-agent writes stay inside `/root/MW_CENTRAL/PLUTO/GODSEYE_DASHBOARD/`. The fork clone, vendored dashboard, and evidence all live inside this tree. Updates to the live install and systemd units are **operator actions**, logged as such.
3. **Proof over claims.** Every phase writes timestamped artifacts to an evidence directory. A phase is "done" when its checklist artifacts exist and pass — not when someone says it's done.

### ⚠️ Missing input (flagged)

The attached walkthrough plan `/root/MW_CENTRAL/PLUTO/.hermes/plans/2026-09-02_hermes-spl-baseline-and-chat2cash-walkthrough.md` is **unreadable (file not found)**. Before Phase 2, attempt recovery; if unrecoverable, proceed on this plan's reconstructed scope (architecture doc v1.4.0 + the two dashboard specs) and record the gap in the final report.

### Known facts baked in

- Fork base: `hermes-agent v0.21.2` (Nous Research); fork isolation lives under `TRIANGULUM/ANDROMALIUS`.
- Dashboard: vanilla JS, **5 tabs** (Governance confirmed; full tab list verified in Phase 3), files `index.html`, `app.js`, `styles.css`, `data/dashboard.json`, `data/governance.json`.
- Dashboard data contract: `AGENT_ARENA/ACTIVE/AGENT_*` manifests, `.hermes/skills/`, `PROJECT_SKILLS/`, `/api/feedback` (localStorage fallback); polling 5s/15s/30s/60s.

---

## Phase 0 — Preflight, Baselines & Evidence Scaffolding

**Objective:** Freeze the "before" state so every later change is provable, and confirm the reference repo is untouched at the end via checksums.

### Steps

```bash
TS=$(date -u +%Y%m%dT%H%M%SZ)
DASH=/root/MW_CENTRAL/PLUTO/GODSEYE_DASHBOARD
EVID="$DASH/evidence/${TS}-hermes-update-godseye-merge"
REF=/root/MW_CENTRAL/EARTH-MOON/godseye
mkdir -p "$EVID"
touch "$EVID/.start-marker"          # write-audit marker, used in Phase 5

# 0.1 Live install baseline (method-agnostic discovery)
which -a hermes 2>&1 | tee "$EVID/00-hermes-which.txt"
hermes --version 2>&1 | tee "$EVID/00-hermes-version-before.txt"
{ pip show hermes-agent 2>/dev/null; pipx list 2>/dev/null | grep -i hermes; \
  uv tool list 2>/dev/null | grep -i hermes; } | tee "$EVID/00-install-method.txt"
systemctl --user list-units 2>/dev/null | grep -i hermes | tee "$EVID/00-services.txt"

# 0.2 Reference repo integrity snapshot (READ-ONLY — no writes, including perms)
git -C "$REF" rev-parse HEAD 2>&1 | tee "$EVID/00-ref-sha.txt"
git -C "$REF" status --porcelain 2>&1 | tee "$EVID/00-ref-status.txt"   # must be empty
( cd "$REF" && find . -type f -print0 | sort -z | xargs -0 sha256sum ) \
  > "$EVID/00-ref-manifest.sha256"

# 0.3 Dashboard inventory (folder listing in context was truncated — get the full truth)
find "$DASH" -maxdepth 2 -not -path "*/evidence/*" -type f | sort | tee "$EVID/00-dash-inventory.txt"
grep -nE 'data-tab|class="tab|id="tab' "$DASH/index.html" | tee "$EVID/00-dash-tabs-raw.txt"

# 0.4 Attempt recovery of missing walkthrough plan
ls -la /root/MW_CENTRAL/PLUTO/.hermes/plans/ 2>&1 | tee "$EVID/00-plans-dir.txt"
git -C /root/MW_CENTRAL/PLUTO log --all --oneline -- \
  .hermes/plans/2026-09-02_hermes-spl-baseline-and-chat2cash-walkthrough.md 2>&1 \
  | tee "$EVID/00-plan-recovery.txt"

# 0.5 Back up live config/state (operator action)
tar czf "$EVID/00-hermes-home-backup.tgz" -C /root .hermes 2>>"$EVID/00-backup.log"
```

### Risks

| Risk | Mitigation |
|---|---|
| Live install method unknown/mixed (pip + pipx + git clone) | Discovery outputs in `00-install-method.txt` decide the Phase 1 branch; never guess |
| `.hermes` too large to tar | Exclude caches: add `--exclude='.hermes/cache*'`; the backup only needs config/identity, not logs |
| Checksum manifest of reference repo is slow | Acceptable one-time cost; it is the tamper-proof baseline |

### Verification checklist

- [ ] `$EVID/.start-marker` exists (needed for Phase 5 write-audit)
- [ ] `00-ref-status.txt` is empty (repo clean before we start)
- [ ] `00-hermes-version-before.txt` captured (rollback pin)
- [ ] `00-dash-inventory.txt` shows `index.html`, `app.js`, `styles.css`, `data/*.json` present
- [ ] `00-plan-recovery.txt` records whether the walkthrough plan was found or declared missing

---

## Phase 1 — Update Live Hermes Agent Install

**Objective:** Live install moves from current version (fork base was v0.21.2) to latest upstream release, with a tested rollback.

### Steps

```bash
# 1.1 Discover latest version + upstream coordinates (authoritative, not assumed)
curl -s https://api.github.com/repos/HammazoneRecords/HermesSPL \
  | jq -r '.parent.clone_url // "NO-PARENT"' | tee "$EVID/01-upstream-url.txt"
UPSTREAM=$(cat "$EVID/01-upstream-url.txt")   # expect Nous Research hermes-agent; if
                                              # NO-PARENT, read homepage from package metadata
curl -s "https://api.github.com/repos/${UPSTREAM#https://github.com/}/releases/latest" \
  | jq -r '.tag_name + "  " + .published_at' | tee "$EVID/01-latest-release.txt"
LATEST=$(jq -r '.tag_name' <<<"$(curl -s "https://api.github.com/repos/${UPSTREAM#https://github.com/}/releases/latest")")

# 1.2 Read the changelog between our version and latest (breaking-change scan)
#     Open in pager or dump: RELEASES/CHANGELOG between v0.21.2 and $LATEST — record summary
curl -s "https://api.github.com/repos/${UPSTREAM#https://github.com/}/releases?per_page=30" \
  | jq -r '.[] | "## " + .tag_name + "\n" + .body' > "$EVID/01-release-notes.txt"

# 1.3 Update per detected method (run ONLY the branch matching 00-install-method.txt)
pip install -U "hermes-agent==$LATEST"        # branch A: pip/venv
pipx upgrade hermes-agent                     # branch B: pipx
uv tool upgrade hermes-agent                  # branch C: uv
# branch D (git checkout): cd <install-dir> && git fetch --tags && git checkout "$LATEST" \
#   && pip install -e . && git rev-parse HEAD | tee -a "$EVID/01-install-log.txt"

# 1.4 Post-update verification + smoke test
hermes --version 2>&1 | tee "$EVID/01-hermes-version-after.txt"
hermes --help > "$EVID/01-hermes-help.txt" 2>&1
hermes skills list > "$EVID/01-hermes-skills.txt" 2>&1 || true
journalctl --user -u 'hermes*' -n 80 --no-pager | tee "$EVID/01-service-log.txt"
# Smoke: run one trivial session and capture its log
timeout 120 hermes run "reply with the single word: ok" 2>&1 | tee "$EVID/01-smoke-run.txt"
```

**File moves:** none — package-level update only. Live config untouched (backup exists from 0.5).

### Risks

| Risk | Mitigation |
|---|---|
| Breaking changes (config schema, skill format, CLI flags) between v0.21.2 and latest | Review `01-release-notes.txt` *before* updating; smoke test is the gate; rollback pin recorded |
| Live agents interrupted | Update during idle window; stop user services first if smoke test fails to start |
| Multiple `hermes` binaries on PATH shadow each other | `which -a` output decides which one to upgrade; remove stale shims if `01-hermes-which.txt` shows >1 |

### Verification checklist

- [ ] `01-hermes-version-after.txt` shows `$LATEST` (or newer than before — diff the two version files)
- [ ] `01-smoke-run.txt` contains a successful completion, no traceback
- [ ] `01-service-log.txt` has zero `ERROR`/`CRITICAL` lines: `grep -cE 'ERROR|CRITICAL' "$EVID/01-service-log.txt"` → `0`
- [ ] `01-hermes-skills.txt` lists skills (skills system survived the upgrade)
- [ ] Rollback tested or rollback recipe written: reinstall `hermes-agent==<version-from-00-hermes-version-before.txt>` + restore `00-hermes-home-backup.tgz`

---

## Phase 2 — Update HermesSPL Fork Baseline (`a74655c` → upstream latest)

**Objective:** Merge latest upstream into the fork on an integration branch, preserving fork-owned isolation (`TRIANGULUM/ANDROMALIUS`, 450-concept governance layer), and push a new recorded baseline SHA.

### Steps

```bash
# 2.1 Clone the fork INTO agent-space (write-scope rule)
FORK="$DASH/hermes-spl"
git clone git@github.com:HammazoneRecords/HermesSPL.git "$FORK" 2>&1 | tee "$EVID/02-clone.txt"
cd "$FORK"

# 2.2 Confirm the stated baseline
git log -1 --format='%H %cI %s' a74655c | tee "$EVID/02-baseline-confirm.txt"   # must show 2026-09-21
git cat-file -t a74655c >/dev/null || echo "BASELINE COMMIT MISSING — STOP" | tee -a "$EVID/02-baseline-confirm.txt"

# 2.3 Wire upstream and fetch
git remote add upstream "$(cat "$EVID/01-upstream-url.txt")"
git fetch upstream --tags --prune 2>&1 | tee "$EVID/02-upstream-fetch.txt"

# 2.4 Integration branch + merge of latest release tag
LATEST=$(git tag --sort=-v:refname | grep -E '^v?[0-9]+\.[0-9]+\.[0-9]+$' | head -1)
echo "Merging upstream $LATEST onto a74655c lineage" | tee "$EVID/02-merge-target.txt"
git switch -c "integrate/upstream-${LATEST}" a74655c
git merge --no-ff "$LATEST" 2>&1 | tee "$EVID/02-merge-log.txt"
# On conflicts:
#   - fork-owned paths (TRIANGULUM/, ANDROMALIUS/, concepts/, governance/, guardian config): keep OURS
#   - core runtime (server, CLI, skills engine): take THEIRS, re-apply fork hooks after
#   - log every resolution: echo "<path>: ours|theirs|manual <reason>" >> "$EVID/02-conflict-resolutions.txt"

# 2.5 Prove fork isolation survived
git diff --diff-filter=D --name-only a74655c HEAD -- TRIANGULUM ANDROMALIUS \
  | tee "$EVID/02-isolation-deletions.txt"        # must be EMPTY (no fork content deleted)
git diff --stat a74655c HEAD -- TRIANGULUM ANDROMALIUS | tail -5 | tee "$EVID/02-isolation-stat.txt"

# 2.6 Test suite (detect runner from repo layout)
ls Makefile pyproject.toml package.json 2>/dev/null | tee "$EVID/02-test-runner-detect.txt"
pytest -q 2>&1 | tee "$EVID/02-test-log.txt"       # or: make test / npm test per detection

# 2.7 Record new baseline and push
git tag "spl-${LATEST}-from-a74655c"
git push origin "integrate/upstream-${LATEST}" --follow-tags 2>&1 | tee "$EVID/02-push-log.txt"
git rev-parse HEAD | tee "$EVID/02-new-baseline-sha.txt"
```

**File moves:** fork clone created at `$DASH/hermes-spl/` (inside GODSEYE agent-space). After review/PR, fast-forward `main` to the integration branch and record that SHA too.

### Risks

| Risk | Mitigation |
|---|---|
| Upstream moved/renamed runtime internals the fork hooks into (server, guardian, skills) | Conflict matrix in 2.4; full test suite in 2.6 is the gate; do not push if red |
| Merge silently drops fork governance files | 2.5 deletion check (`--diff-filter=D`) — any output blocks the push |
| Force-push/history divergence on origin | Use `--no-ff` merge only; never rebase shared branches; PR review if repo policy requires |
| Earth-side architecture doc (v1.4.0) becomes stale re: fork base | Do **not** edit the Earth doc. Record the new fork-base version in the fork's own `CHANGELOG`/README inside the clone (agent-space write) |

### Verification checklist

- [ ] `02-baseline-confirm.txt` shows `a74655c` dated 2026-09-21
- [ ] `02-merge-log.txt` shows merge commit created (or conflict log fully resolved with `02-conflict-resolutions.txt`)
- [ ] `02-isolation-deletions.txt` is empty
- [ ] `02-test-log.txt` shows 0 failures (or pre-existing failures unchanged from baseline — diff test logs against a run at `a74655c` if suite was already red)
- [ ] `02-push-log.txt` shows successful push; `02-new-baseline-sha.txt` recorded for the report

---

## Phase 3 — Godseye Dashboard Audit & Adaptation (agent-space only)

**Objective:** Confirm the real tab/file structure, and adapt the vanilla-JS dashboard for subpath serving and runtime data — **source of truth stays in `$DASH`**; nothing is written to `EARTH-MOON`.

### Steps

```bash
cd "$DASH"

# 3.1 Tab census — establish the authoritative 5-tab list
grep -oE 'data-tab="[^"]+"|<button[^>]*class="[^"]*tab[^"]*"[^>]*>[^<]+' index.html \
  | tee "$EVID/03-tab-census.txt"
# Expected shape: 5 entries. If ≠5, STOP and reconcile against DASHBOARD_ARCHITECTURE_SPEC.md
# and GOVERNANCE_LAYER_SPEC.md before proceeding.

# 3.2 Path audit — find absolute-path assumptions that break under /godseye/ subpath mount
grep -nE "fetch\(|XMLHttpRequest|src=\"/|href=\"/|'/api/" app.js index.html \
  | tee "$EVID/03-path-audit.txt"

# 3.3 Introduce a single config shim (ONLY new file in this phase — keeps app.js vanilla)
cat > config.js <<'EOF'
// Godseye surface config — path shim for subpath mounting
window.GODSEYE_BASE = (document.currentScript?.src || "").replace(/[^/]*$/, "") || "./";
window.GODSEYE_API  = { feedback: GODSEYE_BASE + "api/feedback" };
EOF
# Then, guided by 03-path-audit.txt, rewrite each hardcoded path in app.js/index.html
# to use GODSEYE_BASE (e.g., fetch("/api/feedback") → fetch(GODSEYE_API.feedback)).
# Keep changes minimal & logged:
git -C "$DASH" diff 2>/dev/null | tee "$EVID/03-adaptation-diff.txt" || \
  cp -a app.js "$EVID/03-app.js.pre-adaptation"   # if $DASH isn't a git repo, snapshot instead

# 3.4 Syntax gate (no browser needed)
node --check app.js && node --check config.js | tee "$EVID/03-syntax-check.txt"

# 3.5 Data contract freeze — schema snapshot so the Phase 4 adapter is testable
jq -S 'keys' data/dashboard.json | tee "$EVID/03-dashboard-json-keys.txt"
jq -S 'keys' data/governance.json | tee "$EVID/03-governance-json-keys.txt"
jq -S '.agent_space.total_agents, .boundaries.jhanos_gates.gate_count' data/governance.json \
  | tee "$EVID/03-governance-counts.txt"          # expect 23 agents (registry) / 21 active / 9 gates
```

### Risks

| Risk | Mitigation |
|---|---|
| Actual tab count ≠ 5 (specs only prove 2 tabs) | 3.1 census is a stop-gate; reconcile with specs before any vendoring |
| Subpath breakage (`/api/feedback`, absolute asset paths) | 3.2 audit + config shim; re-verified live in Phase 5 |
| `file://`-era assumptions (fetch of local JSON) | Serving over HTTP in Phase 4 fixes this; note any CORS assumptions found in audit |
| Two-way drift once vendored | One-way sync policy (Phase 4): edits happen in `$DASH`, sync script copies into fork — never reverse |

### Verification checklist

- [ ] `03-tab-census.txt` lists exactly 5 tabs; names recorded in final report
- [ ] `03-path-audit.txt` reviewed; every flagged path either already relative or rewritten via `GODSEYE_BASE`
- [ ] `03-syntax-check.txt` clean for `app.js` + `config.js`
- [ ] `03-adaptation-diff.txt` (or pre-adaptation snapshot) captured — original recoverable

---

## Phase 4 — Vendor as First-Class Surface & Stand Up Updated HermesSPL Runtime

**Objective:** The dashboard becomes a runtime-owned surface: vendored in the fork, served by the updated HermesSPL runtime at a stable route, launched by a service unit, fed by a live data adapter.

### Steps

```bash
cd "$FORK"   # = $DASH/hermes-spl, on integrate branch
git switch -c feature/godseye-surface

# 4.1 One-way sync script (source of truth = agent-space; EXCLUDE evidence + the fork itself)
mkdir -p scripts surfaces/godseye
cat > scripts/sync_godseye.sh <<'EOF'
#!/usr/bin/env bash
# One-way sync: GODSEYE_DASHBOARD -> fork vendored surface. Never run in reverse.
set -euo pipefail
SRC=/root/MW_CENTRAL/PLUTO/GODSEYE_DASHBOARD
DST="$(cd "$(dirname "$0")/.." && pwd)/surfaces/godseye"
rsync -a --delete \
  --exclude 'evidence/' --exclude 'hermes-spl/' --exclude 'reports/' \
  "$SRC"/ "$DST"/
echo "synced $(date -u +%FT%TZ): $(find "$DST" -type f | wc -l) files"
EOF
chmod +x scripts/sync_godseye.sh
./scripts/sync_godseye.sh | tee "$EVID/04-sync-log.txt"

# 4.2 Mount the surface in the runtime server (adapt to the fork's actual server stack —
#     locate it via the Phase 1 help output / repo layout; FastAPI example shown)
#     In <server entrypoint>.py:
#       from starlette.staticfiles import StaticFiles
#       app.mount("/godseye", StaticFiles(directory="surfaces/godseye", html=True), name="godseye")
#     plus a health route:
#       @app.get("/godseye/api/health")  -> {"ok": true, "version": <fork version>, "surface": "godseye"}
#     plus POST /godseye/api/feedback appending JSON lines to
#       /root/MW_CENTRAL/PLUTO/GODSEYE_DASHBOARD/data/feedback.jsonl  (agent-space write target)

# 4.3 Live data adapter — regenerate dashboard.json/governance.json from RUNTIME state
cat > scripts/generate_godseye_data.py <<'EOF'
#!/usr/bin/env python3
"""Bridge: updated HermesSPL runtime state -> Godseye data contract.
Reads runtime agent registry, skills dirs, cron/plugin presence; emits
surfaces/godseye/data/{dashboard,governance}.json matching the frozen
schema keys in evidence/03-*-keys.txt. Exits non-zero on schema drift."""
# Implementation: reuse the fork's registry/manifest loaders discovered in Phase 2;
# validate output keys against 03-dashboard-json-keys.txt / 03-governance-json-keys.txt.
EOF
# Run on a 30s timer (matches spec's memory-health cadence) via the runtime scheduler
# or systemd timer; first manual run is the Phase 5 verification input.

# 4.4 Install & run the updated fork runtime on a dedicated port (do NOT clobber the live install)
python3 -m venv .venv && . .venv/bin/activate && pip install -e . 2>&1 | tee "$EVID/04-install.txt"
.venv/bin/hermes --version | tee "$EVID/04-spl-runtime-version.txt"

# 4.5 Service unit (operator action; user-level, loopback-only)
mkdir -p ~/.config/systemd/user
cat > ~/.config/systemd/user/hermes-spl-godseye.service <<EOF
[Unit]
Description=HermesSPL runtime (updated) + Godseye surface
After=network.target
[Service]
WorkingDirectory=$FORK
ExecStart=$FORK/.venv/bin/hermes serve --host 127.0.0.1 --port 8520
Restart=on-failure
[Install]
WantedBy=default.target
EOF
systemctl --user daemon-reload
systemctl --user enable --now hermes-spl-godseye
```

**File moves summary:** `rsync` copy `$DASH/* → $FORK/surfaces/godseye/` (one-way); originals untouched; feedback writes flow back only to `$DASH/data/feedback.jsonl`.

### Risks

| Risk | Mitigation |
|---|---|
| Fork server stack differs from FastAPI example | Locate actual entrypoint via `04-spl-runtime-version.txt` + repo tree before editing; the mount concept (static dir + health + feedback POST) is stack-agnostic |
| Exposing agent manifests/souls over HTTP | Bind `127.0.0.1` only; no `0.0.0.0`; if remote access is later needed, gate behind the runtime's auth — decision recorded, not defaulted |
| Feedback endpoint becomes a write primitive outside agent-space | Endpoint writes **only** to `$DASH/data/feedback.jsonl`; input length-capped; never touches identity/governance files (guardian.py read-only set) |
| Recursion: fork lives inside the dashboard folder | Sync excludes `hermes-spl/` and `evidence/` (baked into 4.1) |
| Adapter schema drift breaks tabs silently | Adapter validates keys against Phase 3 frozen schema and exits non-zero; service log shows it |

### Verification checklist

- [ ] `04-sync-log.txt` file count matches `00-dash-inventory.txt` (minus evidence/fork/reports)
- [ ] `04-spl-runtime-version.txt` ≥ Phase 1 version lineage (fork = updated baseline)
- [ ] `systemctl --user is-active hermes-spl-godseye` → `active` (capture in `04-service-status.txt`)
- [ ] First adapter run emits both JSONs; `jq 'keys'` matches `03-*-keys.txt`

---

## Phase 5 — End-to-End Verification, Governance Proofs & Handoff

**Objective:** Prove the surface works, prove the rules were obeyed, bundle evidence.

### Steps

```bash
# 5.1 HTTP liveness + surface proof
systemctl --user status hermes-spl-godseye --no-pager | tee "$EVID/05-service-status.txt"
curl -fsS http://127.0.0.1:8520/godseye/ | tee "$EVID/05-http-index.html"
curl -fsS http://127.0.0.1:8520/godseye/api/health | tee "$EVID/05-health.json"
curl -fsS http://127.0.0.1:8520/godseye/data/dashboard.json | jq -e . | tee "$EVID/05-dashboard-live.json"
curl -fsS http://127.0.0.1:8520/godseye/data/governance.json | jq -e . > "$EVID/05-governance-live.json"

# 5.2 Tab-level render proof (headless, console errors are the gate)
cat > /tmp/godseye_render_check.js <<'EOF'
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const errors = [];
  p.on('console', m => m.type() === 'error' && errors.push(m.text()));
  p.on('pageerror', e => errors.push(String(e)));
  await p.goto('http://127.0.0.1:8520/godseye/', { waitUntil: 'networkidle' });
  const tabs = await p.$$eval('[data-tab], .tab', els => els.map(e =>
    (e.getAttribute('data-tab') || e.textContent.trim()).slice(0, 30)));
  for (let i = 0; i < tabs.length; i++) {          // click every tab, catch render errors
    await p.$$eval('[data-tab], .tab', (els, j) => els[j].click(), i);
    await p.waitForTimeout(400);
  }
  console.log(JSON.stringify({ tabCount: tabs.length, tabs, consoleErrors: errors }, null, 2));
  await b.close(); process.exit(errors.length || tabs.length !== 5 ? 1 : 0);
})();
EOF
node /tmp/godseye_render_check.js | tee "$EVID/05-render-check.json"   # exit 0 required

# 5.3 Feedback round-trip (write lands ONLY in agent-space)
curl -fsS -X POST http://127.0.0.1:8520/godseye/api/feedback \
  -H 'Content-Type: application/json' -d '{"agent":"GODSEYE","note":"merge-verification"}' \
  | tee "$EVID/05-feedback-post.txt"
tail -n 1 "$DASH/data/feedback.jsonl" | tee "$EVID/05-feedback-persisted.txt"

# 5.4 Polling/data-refresh proof (mtime change under runtime cadence)
stat -c '%y %n' "$FORK/surfaces/godseye/data/governance.json" | tee "$EVID/05-refresh-before.txt"
sleep 65
stat -c '%y %n' "$FORK/surfaces/godseye/data/governance.json" | tee "$EVID/05-refresh-after.txt"

# 5.5 Reference-repo tamper proof (the Phase 0 manifest is the judge)
( cd "$REF" && sha256sum -c "$EVID/00-ref-manifest.sha256" --quiet ) \
  && echo "REFERENCE REPO UNTOUCHED" | tee "$EVID/05-ref-tamper-check.txt"

# 5.6 Write-scope audit — nothing under MW_CENTRAL changed outside allowed roots
find /root/MW_CENTRAL -newer "$EVID/.start-marker" -not -path "*/GODSEYE_DASHBOARD/*" \
  | tee "$EVID/05-write-scope-audit.txt"          # expected: EMPTY (or operator-justified only)

# 5.7 Evidence bundle + final report (agent-space)
git -C "$FORK" add -A && git -C "$FORK" commit -m "feat: Godseye dashboard as first-class surface (post-upstream-merge)" \
  && git -C "$FORK" push origin feature/godseye-surface 2>&1 | tee "$EVID/05-surface-push.txt"
git -C "$FORK" rev-parse HEAD | tee "$EVID/05-surface-branch-sha.txt"
( cd "$EVID" && find . -type f -not -name MANIFEST.sha256 -exec sha256sum {} \; > MANIFEST.sha256 )
cat > "$DASH/reports/${TS}-hermes-update-godseye-merge-REPORT.md" <<'EOF'
# Execution Report
- Live hermes: <from 01-hermes-version-after.txt> (was <00-hermes-version-before.txt>)
- Fork baseline: a74655c (2026-09-21) -> <02-new-baseline-sha.txt> (upstream <LATEST>)
- Surface branch: <05-surface-branch-sha.txt> ; service: hermes-spl-godseye @127.0.0.1:8520/godseye/
- Tabs verified: <from 05-render-check.json>
- Governance: ref-repo clean (05-ref-tamper-check.txt); write-scope audit (05-write-scope-audit.txt)
- Missing input: walkthrough plan unrecovered/recovered (00-plan-recovery.txt)
EOF
```

### Risks

| Risk | Mitigation |
|---|---|
| Headless browser unavailable on host | Fallback: `curl` each tab's pane anchor + `node --check` + manual browser screenshot attached to evidence; note method used |
| Playwright not installed | `npm i -g playwright && npx playwright install chromium` — or use the fallback above |
| Cutover to production | Explicitly **out of scope** here: updated HermesSPL runtime runs on :8520 beside the live install; cutover is a separate operator decision recorded in the report |

### Verification checklist (final gate)

- [ ] `05-health.json` → `{"ok": true, ...}`
- [ ] `05-render-check.json`: `tabCount: 5`, `consoleErrors: []`, exit code 0
- [ ] `05-feedback-persisted.txt` shows the posted line in `$DASH/data/feedback.jsonl`
- [ ] `05-refresh-after.txt` mtime > `05-refresh-before.txt` (live adapter, not stale files)
- [ ] `05-ref-tamper-check.txt` says REFERENCE REPO UNTOUCHED
- [ ] `05-write-scope-audit.txt` empty of unexpected paths
- [ ] `05-surface-branch-sha.txt` pushed; evidence `MANIFEST.sha256` sealed
- [ ] Final report written to `$DASH/reports/`; rollbacks documented: Phase 1 version pin + config tarball; Phase 2 branch `a74655c` intact; Phase 4 `systemctl --user disable --now hermes-spl-godseye` restores pre-merge state

---

## Rollback Summary

| Phase | Rollback |
|---|---|
| 1 (live install) | Reinstall pinned version from `00-hermes-version-before.txt`; restore `00-hermes-home-backup.tgz` |
| 2 (fork) | `git switch main` — `a74655c` untouched by design; delete integration branch/tag |
| 4 (surface) | `systemctl --user disable --now hermes-spl-godseye`; delete `feature/godseye-surface`; `$DASH` originals were never moved |
| Dashboard itself | `$DASH` was only ever *edited in place with snapshots* (`03-app.js.pre-adaptation` / diff) — restore from snapshot |

**Do-not-do list (restated):** no writes anywhere under `EARTH-MOON/` (including the architecture doc and the godseye reference repo); no reverse sync from fork → dashboard source; no `0.0.0.0` binding; no cutover of the production live install to the fork without a separate operator decision.
