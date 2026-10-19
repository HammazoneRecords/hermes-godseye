#!/usr/bin/env bash
# Sprint 0 round 2 — graft-merge the re-imported HermesSPL fork onto upstream.
set -x
exec > /work/out/sprint0b.log 2>&1
mkdir -p /work/out

git clone --quiet /work/fork-bundle /work/fork2
cd /work/fork2
git remote add upstream https://github.com/NousResearch/hermes-agent.git
git fetch --quiet upstream --tags
UP=$(git rev-parse upstream/main)
V0214=$(git rev-parse a9a0ba7506c725137a204780458e022187035bbf)  # v0.21.4+canary.20260925T065930Z
FIRST=$(git rev-list --max-parents=0 HEAD)
echo "upstream/main=$UP base-tag v0.21.4=$V0214 fork-initial=$FIRST"

git replace --graft "$FIRST" "$V0214"
git merge-base HEAD upstream/main && echo "GRAFT OK: common ancestor established"

git checkout -b v2-upstream-baseline
git merge --no-edit -X ours upstream/main
RC=$?
echo "merge rc=$RC"
if [ $RC -ne 0 ]; then
  git diff --name-only --diff-filter=U > /work/out/v2-conflicts.txt || true
  echo "conflicts: $(wc -l < /work/out/v2-conflicts.txt)"
  # resolve every conflict favoring the fork side (its tree = v0.21.2+custom),
  # then commit — the test suite is the arbiter
  for f in $(cat /work/out/v2-conflicts.txt); do git checkout --ours -- "$f" && git add "$f" || git rm -f "$f"; done
  git commit --no-edit -q
fi
echo "v2 HEAD after merge: $(git rev-parse HEAD)"

echo "=== test suite ==="
python3 -m venv /opt/venv2
/opt/venv2/bin/pip install -q --upgrade pip
/opt/venv2/bin/pip install -q -e ".[dev]" || /opt/venv2/bin/pip install -q -e . || echo "pip install -e failed"
/opt/venv2/bin/python -m pytest -q -p no:cacheprovider 2>&1 | tail -25 > /work/out/v2-pytest.log || true
tail -6 /work/out/v2-pytest.log

echo "=== export branch bundle + diff ==="
git bundle create /work/out/v2-upstream-baseline.bundle v2-upstream-baseline
git diff --stat upstream/main..v2-upstream-baseline > /work/out/v2-diffstat-vs-upstream.txt
git log --oneline -5 > /work/out/v2-log.txt
echo done
