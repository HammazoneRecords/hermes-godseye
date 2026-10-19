"""Phase 3 Replay Mode verification.

Verifies the trajectory endpoint against the running bridge in mock mode.
Exercises:
  1. /health shows trajectory endpoint + version 1.6.0
  2. /trajectory?summary=1 returns 6 mock sessions with no event detail
  3. /trajectory?session_id=X returns full event list for that session
  4. Boundary compliance: zero message body text in any event payload
  5. Time-bounded query (?since=&until=) returns events within bounds
  6. Agent filter (?agent_id=) returns only events from that agent
  7. Limit (?limit=) is respected
  8. 404 for unknown session_id
  9. Phase 1.5 regression: /events SSE still streams; /snapshot still flips runtime_verified
  10. godseye-v2 build is clean (invoked separately; documented here)

Run with: python 02_working_dashboard/GODSEYE_DASHBOARD/bridge/tests/phase3_verification.py
"""
from __future__ import annotations
import json, os, subprocess, sys, time, urllib.request, urllib.error

HOST = "127.0.0.1"; PORT = 8765; BASE = f"http://{HOST}:{PORT}"

def get(path):
    with urllib.request.urlopen(f"{BASE}{path}", timeout=5) as r:
        return r.read().decode()

def stream_sse(path, duration=3.0):
    events = []
    req = urllib.request.Request(f"{BASE}{path}")
    start = time.time()
    with urllib.request.urlopen(req, timeout=duration + 2) as r:
        buf = b""
        while time.time() - start < duration:
            chunk = r.read(1024)
            if not chunk: break
            buf += chunk
            while b"\n\n" in buf:
                frame, buf = buf.split(b"\n\n", 1)
                for line in frame.split(b"\n"):
                    if line.startswith(b"data:"):
                        try: events.append(json.loads(line[5:].strip()))
                        except: pass
    return events

def main() -> int:
    bridge_path = os.path.abspath(os.path.join(
        os.path.dirname(__file__), "..", "gods-eye-bridge.py"))
    proc = subprocess.Popen(
        [sys.executable, bridge_path, "--mock", "--mock-rate", "3.0",
         "--mock-trajectories", "6", "--host", HOST, "--port", str(PORT)],
        stdout=open("/tmp/bridge-p3.log", "w"), stderr=subprocess.STDOUT)
    try:
        for _ in range(30):
            try:
                urllib.request.urlopen(f"{BASE}/api/gods-eye/health", timeout=1); break
            except Exception: time.sleep(0.5)
        else:
            print("[FAIL] bridge didn't come up"); return 1
        print("[ok] bridge up")

        # 1. Health shows trajectory endpoint + version 1.6.0
        h = json.loads(get("/api/gods-eye/health"))
        assert h["version"] in ("1.6.0", "1.7.0"), f"expected v1.6.0 or v1.7.0, got {h['version']}"
        assert "trajectory" in h["endpoints"], "endpoints map missing trajectory"
        assert h["trajectory_sessions"] == 6, f"expected 6 sessions, got {h['trajectory_sessions']}"
        print(f"[ok] 1. /health v{h['version']} + {h['trajectory_sessions']} sessions + trajectory endpoint")

        # 2. Summary endpoint
        sessions = json.loads(get("/api/gods-eye/trajectory?summary=1"))
        assert len(sessions["sessions"]) == 6
        s0 = sessions["sessions"][0]
        assert "events" not in s0, "summary must strip events"
        assert all(k in s0 for k in ("id","agent_id","started_at","ended_at","turn_count","tags"))
        print(f"[ok] 2. summary endpoint: 6 sessions, sample {s0['id']} agent={s0['agent_id']} turns={s0['turn_count']}")

        # 3. Session detail
        sid = sessions["sessions"][0]["id"]
        detail = json.loads(get(f"/api/gods-eye/trajectory?session_id={sid}"))
        assert len(detail["events"]) == s0["turn_count"]
        e0 = detail["events"][0]
        assert all(k in e0 for k in ("ts","turn","role","body_chars","trajectory_id","agent_id","session_id","run_id"))
        print(f"[ok] 3. session detail: {len(detail['events'])} events for {sid}")

        # 4. Boundary compliance — zero message body text
        all_events = []
        for s in sessions["sessions"]:
            d = json.loads(get(f"/api/gods-eye/trajectory?session_id={s['id']}"))
            all_events.extend(d["events"])
        leaked = [(e["role"], k) for e in all_events for k in ("text","body","content","value") if k in e]
        assert not leaked, f"BOUNDARY VIOLATION: {len(leaked)} body leaks: {leaked[:3]}"
        # verify each event has body_chars (a count, not a body)
        for e in all_events:
            assert "body_chars" in e and isinstance(e["body_chars"], int)
        print(f"[ok] 4. boundary compliance: 0 body leaks across {len(all_events)} events (all have body_chars int only)")

        # 5. Time-bounded query
        first_ts = detail["events"][0]["ts"]
        last_ts = detail["events"][-1]["ts"]
        mid_ts = (first_ts + last_ts) / 2
        half = json.loads(get(f"/api/gods-eye/trajectory?since={first_ts}&until={mid_ts}"))
        assert half["count"] > 0
        for e in half["events"]:
            assert first_ts <= e["ts"] <= mid_ts, f"event ts {e['ts']} outside [{first_ts},{mid_ts}]"
        print(f"[ok] 5. time-bounded query: {half['count']} events in window [{first_ts:.1f}, {mid_ts:.1f}]")

        # 6. Agent filter
        agent_id = s0["agent_id"]
        agent_events = json.loads(get(f"/api/gods-eye/trajectory?agent_id={agent_id}&limit=1000"))
        assert all(e["agent_id"] == agent_id for e in agent_events["events"])
        print(f"[ok] 6. agent filter: {agent_events['count']} events all from {agent_id}")

        # 7. Limit
        limited = json.loads(get("/api/gods-eye/trajectory?limit=3"))
        assert limited["count"] <= 3
        print(f"[ok] 7. limit: returned {limited['count']} events (≤3)")

        # 8. 404 for unknown session
        try:
            urllib.request.urlopen(f"{BASE}/api/gods-eye/trajectory?session_id=nonexistent", timeout=2)
            print("[FAIL] 8. expected 404"); return 1
        except urllib.error.HTTPError as e:
            assert e.code == 404
        print("[ok] 8. 404 for unknown session_id")

        # 9. Phase 1.5 regression
        snap = json.loads(get("/api/gods-eye/snapshot"))
        assert snap["runtime_verified"] is True
        assert snap["counts"]["agents"] == 21  # real repo agents.json
        events = stream_sse("/api/gods-eye/events", duration=3.0)
        assert len(events) > 5, f"expected >5 SSE events in 3s, got {len(events)}"
        # boundary compliance for live SSE
        sse_leaks = [(e["event_type"], k) for e in events for k in ("text","body","content","value") if k in e.get("payload",{})]
        assert not sse_leaks, f"SSE BOUNDARY VIOLATION: {sse_leaks}"
        print(f"[ok] 9. Phase 1.5 regression: snapshot runtime_verified=true agents=21; SSE streamed {len(events)} events with 0 body leaks")

        print()
        print("=" * 72)
        print(f"  ALL PHASE 3 VERIFICATION TESTS PASSED")
        print(f"  (sessions={len(sessions['sessions'])}, total_events={len(all_events)}, sse_events={len(events)})")
        print("=" * 72)
        return 0
    finally:
        proc.terminate()
        try: proc.wait(timeout=5)
        except subprocess.TimeoutExpired: proc.kill()

if __name__ == "__main__":
    sys.exit(main())
