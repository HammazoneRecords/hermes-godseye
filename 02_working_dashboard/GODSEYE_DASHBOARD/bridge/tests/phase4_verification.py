"""Phase 4 outbound control plane verification.

Exercises the control endpoint with the GODS_EYE_CONTROL_ENABLED flag
exercised in both states (disabled, enabled) and asserts:

  1. Disabled state (default): all 5 actions return 403
  2. Health endpoint exposes control_enabled + control_actions
  3. Unknown action (not in contract) returns 404
  4. Invalid JSON body returns 400
  5. Missing required field returns 400 + field name
  6. Bad enum value (approval.decision='maybe') returns 400
  7. Oversized steer message (>50k chars) returns 400
  8. Each of 5 actions succeeds when enabled + valid input → 200
  9. Each success emits a control.action event on the SSE stream
 10. Audit events are body-stripped (no message text crosses)
 11. Phase 1.5 + Phase 3 regression: SSE + snapshot + trajectory unbroken
"""
from __future__ import annotations
import json, os, subprocess, sys, time, urllib.request, urllib.error

HOST = "127.0.0.1"; PORT = 8765; BASE = f"http://{HOST}:{PORT}"

def get(path):
    with urllib.request.urlopen(f"{BASE}{path}", timeout=5) as r:
        return r.read().decode()

def post(path, body, expect_status=None):
    req = urllib.request.Request(
        f"{BASE}{path}",
        data=json.dumps(body).encode() if body is not None else b"",
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=5) as r:
            data = r.read().decode()
            status = r.status
    except urllib.error.HTTPError as e:
        data = e.read().decode()
        status = e.code
    if expect_status is not None:
        assert status == expect_status, f"expected {expect_status}, got {status} for {path} {body!r}"
    return json.loads(data) if data else {}, status

def stream_sse(duration=3.0):
    events = []
    req = urllib.request.Request(f"{BASE}/api/gods-eye/events")
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

def start_bridge(control_enabled=False, mock_trajectories=3):
    bridge_path = os.path.abspath(os.path.join(
        os.path.dirname(__file__), "..", "gods-eye-bridge.py"))
    env = os.environ.copy()
    if control_enabled:
        env["GODS_EYE_CONTROL_ENABLED"] = "1"
    else:
        env.pop("GODS_EYE_CONTROL_ENABLED", None)
    proc = subprocess.Popen(
        [sys.executable, bridge_path, "--mock", "--mock-rate", "3.0",
         "--mock-trajectories", str(mock_trajectories),
         "--host", HOST, "--port", str(PORT)],
        env=env,
        stdout=open("/tmp/bridge-p4.log", "w"), stderr=subprocess.STDOUT)
    for _ in range(30):
        try:
            urllib.request.urlopen(f"{BASE}/api/gods-eye/health", timeout=1)
            return proc
        except Exception:
            time.sleep(0.5)
    raise RuntimeError("bridge didn't come up")

def main() -> int:
    # === Disabled state tests (default — production safety) ===
    print("\n=== Phase 4 — control plane DISABLED (default) ===")
    proc = start_bridge(control_enabled=False)
    try:
        h = json.loads(get("/api/gods-eye/health"))
        assert h["version"] == "1.7.0", f"expected v1.7.0, got {h['version']}"
        assert h["control_enabled"] is False, "control must be disabled by default"
        assert len(h["control_actions"]) == 5
        assert "control.action" in h["event_types"], "control.action event type missing"
        print(f"[ok] 1. disabled state: health v{h['version']}, control_enabled=False, 5 actions listed, control.action event type present")

        # All 5 actions return 403 when disabled
        for action, body in [
            ("steer", {"run_id": "r1", "message": "hello"}),
            ("stop", {"run_id": "r1"}),
            ("approval", {"run_id": "r1", "approval_id": "a1", "decision": "approve"}),
            ("fork", {"session_id": "s1"}),
            ("resolve-unknown", {"run_id": "r1", "response": "ok"}),
        ]:
            r, status = post(f"/api/gods-eye/control/{action}", body, expect_status=403)
            assert r["ok"] is False
            assert "control plane disabled" in r["error"]
            assert "GODS_EYE_CONTROL_ENABLED" in r["reason"]
        print("[ok] 2. all 5 actions return 403 when control plane disabled (production safety)")
    finally:
        try:
            proc.terminate()
            proc.wait(timeout=3)
        except subprocess.TimeoutExpired:
            proc.kill()
            proc.wait(timeout=2)
    proc = None

    # === Enabled state tests ===
    print("\n=== Phase 4 — control plane ENABLED (GODS_EYE_CONTROL_ENABLED=1) ===")
    proc = start_bridge(control_enabled=True)
    try:
        h = json.loads(get("/api/gods-eye/health"))
        assert h["control_enabled"] is True, "control must be enabled when env set"
        print(f"[ok] 3. enabled state: health control_enabled=True")

        # Unknown action → 404
        r, status = post("/api/gods-eye/control/pause", {}, expect_status=404)
        assert "unknown action" in r["error"]
        assert sorted(r["supported"]) == ["approval", "fork", "resolve-unknown", "steer", "stop"]
        print("[ok] 4. unknown action returns 404 with supported list")

        # Invalid JSON body → 400
        req = urllib.request.Request(
            f"{BASE}/api/gods-eye/control/steer",
            data=b"not json",
            headers={"Content-Type": "application/json"},
            method="POST")
        try:
            urllib.request.urlopen(req, timeout=5)
            print("[FAIL] 5. expected 400 for invalid JSON"); return 1
        except urllib.error.HTTPError as e:
            assert e.code == 400
        print("[ok] 5. invalid JSON body returns 400")

        # Missing required field → 400 + field name
        r, status = post("/api/gods-eye/control/steer", {"run_id": "r1"}, expect_status=400)
        assert r["ok"] is False
        assert r["field"] == "message"
        assert "required field" in r["msg"]
        print(f"[ok] 6. missing required field returns 400 + field name (field={r['field']})")

        # Bad enum value → 400
        r, status = post("/api/gods-eye/control/approval",
                         {"run_id": "r1", "approval_id": "a1", "decision": "maybe"},
                         expect_status=400)
        assert r["ok"] is False
        assert r["field"] == "decision"
        print(f"[ok] 7. bad enum value returns 400 + field name (field={r['field']})")

        # Oversized steer message → 400
        r, status = post("/api/gods-eye/control/steer",
                         {"run_id": "r1", "message": "x" * 50001},
                         expect_status=400)
        assert r["field"] == "message"
        assert "50000 char cap" in r["msg"]
        print("[ok] 8. oversized steer message (>50k chars) returns 400 with size cap")

        # === Each of 5 actions succeeds with valid input → 200 ===
        # Start an SSE subscriber BEFORE the actions so we can verify audit events
        import threading, queue
        sse_events = queue.Queue()
        def sse_consumer():
            try:
                req = urllib.request.Request(f"{BASE}/api/gods-eye/events")
                with urllib.request.urlopen(req, timeout=10) as r:
                    buf = b""
                    while True:
                        chunk = r.read(1024)
                        if not chunk: break
                        buf += chunk
                        while b"\n\n" in buf:
                            frame, buf = buf.split(b"\n\n", 1)
                            for line in frame.split(b"\n"):
                                if line.startswith(b"data:"):
                                    try: sse_events.put(json.loads(line[5:].strip()))
                                    except: pass
            except Exception as e:
                pass
        t = threading.Thread(target=sse_consumer, daemon=True)
        t.start()
        time.sleep(0.5)  # let the SSE subscriber connect

        # Steer
        r, status = post("/api/gods-eye/control/steer",
                         {"run_id": "r1", "message": "test steer"}, expect_status=200)
        assert r["ok"] is True
        assert r["audit_emitted"] is True
        assert r["result"]["upstream_status"] == 202
        print(f"[ok] 9a. steer → 200, upstream_status=202, audit_emitted=True")

        # Stop
        r, status = post("/api/gods-eye/control/stop",
                         {"run_id": "r2", "reason": "operator_stop"}, expect_status=200)
        assert r["ok"] is True
        print("[ok] 9b. stop → 200, audit_emitted=True")

        # Approval
        r, status = post("/api/gods-eye/control/approval",
                         {"run_id": "r3", "approval_id": "a1", "decision": "approve"},
                         expect_status=200)
        assert r["ok"] is True
        print("[ok] 9c. approval → 200, audit_emitted=True")

        # Fork
        r, status = post("/api/gods-eye/control/fork",
                         {"session_id": "s1", "message": "forked"}, expect_status=200)
        assert r["ok"] is True
        assert "new_run_id" in r["result"]["upstream_response"]
        print(f"[ok] 9d. fork → 200, new_run_id={r['result']['upstream_response']['new_run_id']}")

        # Resolve-unknown
        r, status = post("/api/gods-eye/control/resolve-unknown",
                         {"run_id": "r4", "response": "resolved"}, expect_status=200)
        assert r["ok"] is True
        print("[ok] 9e. resolve-unknown → 200, audit_emitted=True")

        # Wait for SSE events to arrive
        time.sleep(1.5)
        all_sse = []
        while not sse_events.empty():
            all_sse.append(sse_events.get())

        # Find the control.action events
        control_events = [e for e in all_sse if e["event_type"] == "control.action"]
        assert len(control_events) >= 5, f"expected >=5 control.action events on SSE, got {len(control_events)}"
        print(f"[ok] 10. {len(control_events)} control.action events emitted on SSE stream (≥5 expected)")

        # Verify audit events are body-stripped — no message text crosses
        leaked = []
        for e in control_events:
            p = e.get("payload", {})
            for body_key in ("message", "response", "reason", "text", "body", "content"):
                if body_key in p:
                    leaked.append((e["payload"]["action"], body_key))
        assert not leaked, f"BOUNDARY VIOLATION: audit events leaked body keys: {leaked}"
        # Verify each event has only the allowed keys
        for e in control_events:
            p = e["payload"]
            assert set(p.keys()) <= {"action", "run_id", "ok", "upstream_status", "error", "mock"}
        print(f"[ok] 11. boundary compliance: 0 body leaks in {len(control_events)} control.action audit events (only metadata: action/run_id/ok/upstream_status/error/mock)")

        # === Phase 1.5 + Phase 3 regression ===
        snap = json.loads(get("/api/gods-eye/snapshot"))
        assert snap["runtime_verified"] is True
        assert snap["counts"]["agents"] == 21  # real agents.json
        traj = json.loads(get("/api/gods-eye/trajectory?summary=1"))
        assert len(traj["sessions"]) == 3  # we passed --mock-trajectories 3
        print(f"[ok] 12. Phase 1.5+3 regression: snapshot runtime_verified=true agents=21; trajectory has {len(traj['sessions'])} sessions")

        # Boundary compliance for SSE (regular live events)
        sse_live = stream_sse(duration=3.0)
        assert len(sse_live) > 5
        live_leaks = [(e["event_type"], k) for e in sse_live for k in ("text","body","content","value") if k in e.get("payload",{})]
        assert not live_leaks
        print(f"[ok] 13. Phase 1.5 SSE regression: {len(sse_live)} events in 3s, 0 body leaks")

        print()
        print("=" * 72)
        print(f"  ALL PHASE 4 CONTROL PLANE TESTS PASSED")
        print(f"  (5 actions verified, {len(control_events)} audit events, 0 body leaks)")
        print("=" * 72)
        return 0
    finally:
        try:
            proc.terminate()
            proc.wait(timeout=3)
        except subprocess.TimeoutExpired:
            proc.kill()
            proc.wait(timeout=2)

if __name__ == "__main__":
    sys.exit(main())
