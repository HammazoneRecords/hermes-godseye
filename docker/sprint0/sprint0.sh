#!/usr/bin/env bash
# Sprint 0 — isolated baseline verification (runs INSIDE the container).
# Never touches a real ~/.hermes; HERMES_HOME=/opt/hermes-home.
set -x
exec > /work/sprint0.log 2>&1

echo "=== Isolation ==="
hostname; cat /etc/os-release | head -2; echo "HERMES_HOME=$HERMES_HOME"
test "$HERMES_HOME" = "/opt/hermes-home" || { echo "FAIL: wrong HERMES_HOME"; exit 1; }
ls /root/.hermes 2>/dev/null && { echo "FAIL: production .hermes visible"; exit 1; } || echo "OK: no production .hermes in container"

mkdir -p "$HERMES_HOME" /work/out

echo "=== 1. Fresh clone of upstream Hermes Agent (latest) ==="
git clone --quiet https://github.com/NousResearch/hermes-agent.git /work/hermes-agent
cd /work/hermes-agent
UPSTREAM_HEAD=$(git rev-parse HEAD)
UPSTREAM_DATE=$(git log -1 --format=%ad --date=iso)
UPSTREAM_VER=$(git describe --tags --always 2>/dev/null || echo "$UPSTREAM_HEAD")
echo "upstream HEAD: $UPSTREAM_HEAD ($UPSTREAM_DATE) ver: $UPSTREAM_VER"

echo "=== 2. Fork copy + upstream merge ==="
# /work/fork-bundle is a mounted read-only git bundle of the HermesSPL fork
git clone --quiet /work/fork-bundle /work/HermesSPL
cd /work/HermesSPL
FORK_BEFORE=$(git rev-parse HEAD)
echo "fork before: $FORK_BEFORE"
git remote add upstream https://github.com/NousResearch/hermes-agent.git
git fetch --quiet upstream
git merge --no-edit upstream/main > /work/out/merge.log 2>&1
MERGE_RC=$?
FORK_AFTER=$(git rev-parse HEAD)
echo "merge rc=$MERGE_RC fork after: $FORK_AFTER"
if [ $MERGE_RC -ne 0 ]; then
  echo "CONFLICTS:"
  git diff --name-only --diff-filter=U | tee /work/out/conflicts.txt
  git merge --abort
else
  echo "merge clean"
fi

echo "=== 3. Test suite on merged tree ==="
python3 -m venv /opt/venv
/opt/venv/bin/pip install -q --upgrade pip
if [ -f pyproject.toml ]; then
  /opt/venv/bin/pip install -q -e ".[dev]" || /opt/venv/bin/pip install -q -e . || echo "pip install -e failed"
fi
/opt/venv/bin/python -m pytest -x -q --timeout=300 2>&1 | tail -30 > /work/out/pytest.log || true
tail -5 /work/out/pytest.log

echo "=== 4. hermes doctor (isolated home) ==="
/opt/venv/bin/hermes --version >> /work/out/doctor.log 2>&1 || echo "hermes CLI not runnable" >> /work/out/doctor.log
echo done
