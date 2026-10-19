#!/usr/bin/env bash
# RUN_DEMO.sh — one-command mock demo of the Godseye × HermesSPL Phase 1.5 cockpit.
#
# Starts the bridge in mock mode and serves the vanilla JS dashboard so the
# Live tab works end-to-end without a real Hermes runtime.
#
# Usage:
#   bash RUN_DEMO.sh
#
# Then open http://127.0.0.1:8765/ in a browser → click the ● Live tab.

set -euo pipefail

cd "$(dirname "$0")"

PORT="${BRIDGE_PORT:-8765}"
HOST="${BRIDGE_HOST:-127.0.0.1}"

# 1. Create venv + install Python deps
if [ ! -d ".venv" ]; then
  echo "[setup] creating local venv…"
  python3 -m venv .venv
fi
# shellcheck disable=SC1091
source .venv/bin/activate

echo "[setup] installing deps (aiohttp, websockets)…"
pip install --quiet --upgrade pip
pip install --quiet -r bridge/requirements.txt

# 2. Start the bridge in mock mode (background)
echo "[run] starting bridge on http://${HOST}:${PORT} (mock mode)…"
python bridge/gods-eye-bridge.py --host "$HOST" --port "$PORT" --mock &
BRIDGE_PID=$!

cleanup() {
  echo ""
  echo "[shutdown] stopping bridge (pid ${BRIDGE_PID})…"
  kill "$BRIDGE_PID" 2>/dev/null || true
  wait "$BRIDGE_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# 3. Wait for the bridge to come up
echo "[wait] polling /api/gods-eye/health …"
for i in $(seq 1 30); do
  if curl -sf "http://${HOST}:${PORT}/api/gods-eye/health" >/dev/null 2>&1; then
    echo "[ready] bridge is up after ${i} attempts"
    break
  fi
  sleep 0.5
done

# 4. Print the entry URL
echo ""
echo "═══════════════════════════════════════════════════════════════════════════"
echo "  Godseye × HermesSPL — Phase 1.5 Live Cockpit (MOCK MODE)"
echo "═══════════════════════════════════════════════════════════════════════════"
echo ""
echo "  Dashboard URL:    http://${HOST}:${PORT}/"
echo "  Live tab:         http://${HOST}:${PORT}/  → click '● Live'"
echo "  SSE stream:       http://${HOST}:${PORT}/api/gods-eye/events"
echo "  Health:           http://${HOST}:${PORT}/api/gods-eye/health"
echo "  Snapshot:         http://${HOST}:${PORT}/api/gods-eye/snapshot"
echo ""
echo "  Press Ctrl+C to stop."
echo ""
echo "═══════════════════════════════════════════════════════════════════════════"

# 5. Tail the bridge logs (so the user can see events being generated)
wait "$BRIDGE_PID"
