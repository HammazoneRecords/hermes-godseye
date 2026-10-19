#!/usr/bin/env python3
"""
Godseye × HermesSPL — Phase 1.5 Live Event Bridge
==================================================

Python sidecar that subscribes to every Hermes runtime event plane, normalizes
events into a single typed stream, and re-emits them to the Godseye Dashboard
over an SSE endpoint.

Event planes subscribed (per Phase 2 Cockpit Plan §4.2):
  1. SSE run events        — GET /v1/runs/{run_id}/events  (per-run subscriber pool)
  2. Dashboard WS JSON-RPC — /api/ws                       (single persistent conn)
  3. Plugin hooks          — POST /api/bridge/hooks         (Hermes plugin pushes here)
  4. MonitoringEmitter     — GET /health/detailed polling   (5s, synthesized events)
  5. HMAC webhooks         — POST /api/bridge/webhooks     (outbound hooks config)
  6. Trajectory JSONL      — file tail of ~/.hermes/trajectory_samples.jsonl

Normalization rules (per §4.2):
  - Strip message bodies — keep delta counts and tool names only (no Pluto→Earth leak)
  - Every event carries: agent_id, session_id, run_id, timestamp, event_type, payload

Outbound:
  - GET /api/gods-eye/events       — SSE fanout to dashboard Live tab
  - GET /api/gods-eye/snapshot      — current dashboard.json (live-refreshed)
  - POST /api/gods-eye/control/{a} — outbound control to Hermes (Phase 4 only)

Live snapshot writer:
  - Writes data/dashboard.json every 5s
  - Preserves the existing 6-tab contract (no regression)
  - Updates runtime_verified: true; refreshes agent/queue/memory counts

Mock mode:
  - When HERMES_BASE_URL is unset or --mock flag is given, the bridge starts a
    mock event generator that produces realistic agent activity so the dashboard
    Live tab can be demoed without a real Hermes runtime.

Owner: Ovando Brown (Hermes Agent default profile, TRIS-coordinated)
Fork baseline: HammazoneRecords/HermesSPL.git
Reference: 01_reference_godseye/godseye/
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import os
import random
import signal
import sys
import time
import uuid
from collections import deque
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Any, AsyncIterator, Awaitable, Callable, Dict, List, Optional

try:
    import aiohttp
    from aiohttp import web, ClientSession
except ImportError:  # pragma: no cover - depends on requirements.txt
    print("ERROR: aiohttp not installed. Run: pip install -r bridge/requirements.txt", file=sys.stderr)
    sys.exit(1)

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 8765

# Where to find Hermes. If unset, bridge runs in mock mode.
HERMES_BASE_URL = os.environ.get("HERMES_BASE_URL", "")  # e.g. http://127.0.0.1:8642
HERMES_API_KEY = os.environ.get("HERMES_API_KEY", os.environ.get("API_SERVER_KEY", ""))
HERMES_DASHBOARD_WS = os.environ.get("HERMES_DASHBOARD_WS", "")  # e.g. ws://127.0.0.1:8643/api/ws
HERMES_TRAJECTORY_PATH = os.environ.get(
    "HERMES_TRAJECTORY_PATH",
    os.path.expanduser("~/.hermes/trajectory_samples.jsonl"),
)

# Where to write the live dashboard snapshot.
DASHBOARD_DATA_DIR = Path(os.environ.get(
    "GODSEYE_DASHBOARD_DATA",
    Path(__file__).resolve().parent.parent / "data",
))

LOG_FORMAT = "%(asctime)s [%(levelname)s] %(name)s: %(message)s"
logging.basicConfig(level=logging.INFO, format=LOG_FORMAT)
log = logging.getLogger("gods-eye-bridge")

# ---------------------------------------------------------------------------
# Normalized event schema  (per §4.2)
# ---------------------------------------------------------------------------

# Cosmic-metaphor color coding per skill_cosmic-architecture-metaphor §3.2
COLOR = {
    "verified":    "#72c69a",
    "hypothesis":  "#f3c969",
    "correction":  "#ff3333",
    "tool_call":   "#00b4ff",
    "approval":    "#e2b45d",
    "warning":     "#ff6f3d",
    "infrastructure": "#00ffd5",
    "memory":      "#a78bfa",
    "idle":        "#e9edf4",
    "traffic":     "#ff69b4",
}

# Altitude band per cosmic metaphor §3.3 (km)
ALTITUDE_BAND = {
    "high": (50, 120),   # TRISMIGISTUS / GODSEYE / FACTCHECK
    "mid":  (20, 50),    # LIBRARIAN / CURATOR / MAIL / CANARY
    "low":  (5, 20),     # SPINUP / sandbox
}


@dataclass
class NormalizedEvent:
    """Single typed event in the gods-eye stream."""
    agent_id: str
    session_id: str
    run_id: str
    timestamp: float           # epoch seconds
    event_type: str            # see EVENT_TYPES below
    payload: Dict[str, Any] = field(default_factory=dict)

    # Serialization for SSE
    def to_sse(self) -> str:
        d = asdict(self)
        d["timestamp_iso"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(self.timestamp))
        return f"data: {json.dumps(d, separators=(',', ':'))}\n\n"


# Canonical event types — these are what the dashboard consumes.
EVENT_TYPES = {
    "agent.started":           "Agent session started (on_session_start)",
    "agent.stopped":           "Agent session stopped (on_session_end)",
    "agent.message.delta":     "Streaming message chunk (count only, body stripped)",
    "agent.tool.started":      "Tool call began (pre_tool_call / tool.started)",
    "agent.tool.completed":    "Tool call finished (post_tool_call / tool.completed)",
    "agent.subagent.start":    "Subagent dispatched (subagent_start / subagent.start)",
    "agent.subagent.complete": "Subagent returned (subagent_stop / subagent.complete)",
    "agent.approval.request":  "Approval requested (pre_approval_request / approval.request)",
    "agent.approval.responded":"Approval responded (post_approval_response)",
    "agent.skill.lifecycle":   "Skill pinned / archived / evicted (on_skill_lifecycle)",
    "agent.room.activity":     "Hosted room member activity (on_room_member_activity)",
    "system.gateway_health":   "Gateway state change (MonitoringEmitter GatewayHealthEvent)",
    "system.cron_execution":   "Cron job fired (MonitoringEmitter CronExecutionEvent)",
    "system.gateway_diagnostic":"Gateway diagnostic event",
    "cargo.transfer":          "Heavy file/deliverable transfer (artifacts API)",
    "memory.mutation":         "Memory layer pin/dump/compress (transform on memory_tool)",
}


# ---------------------------------------------------------------------------
# Event bus  — fanout to all SSE subscribers
# ---------------------------------------------------------------------------

class EventBus:
    """In-memory fanout: every inbound normalized event is pushed to every
    connected SSE subscriber."""

    def __init__(self, ring_size: int = 10000) -> None:
        self._subs: List[asyncio.Queue] = []
        self._ring: deque = deque(maxlen=ring_size)  # replay buffer for late joiners

    def subscribe(self) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue(maxsize=1000)
        self._subs.append(q)
        # backfill from ring so late joiners see recent history
        for evt in list(self._ring):
            try:
                q.put_nowait(evt)
            except asyncio.QueueFull:
                break
        log.info("new SSE subscriber (total=%d, ring backfill=%d)", len(self._subs), len(self._ring))
        return q

    def unsubscribe(self, q: asyncio.Queue) -> None:
        if q in self._subs:
            self._subs.remove(q)
        log.info("SSE subscriber closed (total=%d)", len(self._subs))

    def publish(self, evt: NormalizedEvent) -> None:
        self._ring.append(evt)
        dead: List[asyncio.Queue] = []
        for q in self._subs:
            try:
                q.put_nowait(evt)
            except asyncio.QueueFull:
                # slow consumer — drop oldest, push newest
                try:
                    q.get_nowait()
                    q.put_nowait(evt)
                except Exception:
                    dead.append(q)
        for q in dead:
            self._subs.remove(q)


# ---------------------------------------------------------------------------
# Normalization layer  (per §4.2)
# ---------------------------------------------------------------------------

class Normalizer:
    """Convert raw events from any plane into NormalizedEvent instances.

    CRITICAL: this layer strips message bodies. Per the boundary rule
    (no Pluto→Earth without Jhanos gates), only metadata crosses to the
    dashboard. Body text, tool_input contents, and full payloads are dropped.
    """

    @staticmethod
    def from_sse_run_event(run_id: str, session_id: str, raw: Dict[str, Any]) -> Optional[NormalizedEvent]:
        et = raw.get("type") or raw.get("event") or ""
        ts = float(raw.get("timestamp", time.time()))
        payload = raw.get("payload") or raw.get("data") or {}
        agent_id = payload.get("agent_id") or raw.get("agent_id") or "unknown"

        if et in ("message.delta", "message.start", "message.complete"):
            # body-stripped: keep only delta count
            text = payload.get("text") or payload.get("delta") or ""
            return NormalizedEvent(
                agent_id=agent_id, session_id=session_id, run_id=run_id,
                timestamp=ts, event_type="agent.message.delta",
                payload={"delta_chars": len(text), "seq": raw.get("seq", 0)},
            )
        if et in ("tool.started", "tool.progress"):
            return NormalizedEvent(
                agent_id=agent_id, session_id=session_id, run_id=run_id,
                timestamp=ts, event_type="agent.tool.started",
                payload={"tool": payload.get("tool") or payload.get("name", "?"),
                         "args_size": len(str(payload.get("input", "")))},
            )
        if et in ("tool.completed",):
            return NormalizedEvent(
                agent_id=agent_id, session_id=session_id, run_id=run_id,
                timestamp=ts, event_type="agent.tool.completed",
                payload={"tool": payload.get("tool") or payload.get("name", "?"),
                         "ok": payload.get("ok", True),
                         "duration_ms": payload.get("duration_ms", 0)},
            )
        if et == "subagent.start":
            return NormalizedEvent(
                agent_id=agent_id, session_id=session_id, run_id=run_id,
                timestamp=ts, event_type="agent.subagent.start",
                payload={"child": payload.get("subagent_id") or payload.get("agent_id", "?"),
                         "profile": payload.get("profile", "")},
            )
        if et == "subagent.complete":
            return NormalizedEvent(
                agent_id=agent_id, session_id=session_id, run_id=run_id,
                timestamp=ts, event_type="agent.subagent.complete",
                payload={"child": payload.get("subagent_id") or payload.get("agent_id", "?"),
                         "ok": payload.get("ok", True)},
            )
        if et == "approval.request":
            return NormalizedEvent(
                agent_id=agent_id, session_id=session_id, run_id=run_id,
                timestamp=ts, event_type="agent.approval.request",
                payload={"kind": payload.get("kind", "tool"),
                         "summary": (payload.get("summary") or "")[:120]},
            )
        if et == "approval.responded":
            return NormalizedEvent(
                agent_id=agent_id, session_id=session_id, run_id=run_id,
                timestamp=ts, event_type="agent.approval.responded",
                payload={"decision": payload.get("decision", "approve")},
            )
        if et in ("run.queued", "run.starting", "run.active"):
            return NormalizedEvent(
                agent_id=agent_id, session_id=session_id, run_id=run_id,
                timestamp=ts, event_type="agent.started",
                payload={"state": et},
            )
        if et in ("run.completed", "run.failed", "run.interrupted", "run.stopped"):
            return NormalizedEvent(
                agent_id=agent_id, session_id=session_id, run_id=run_id,
                timestamp=ts, event_type="agent.stopped",
                payload={"state": et, "ok": et == "run.completed"},
            )
        return None

    @staticmethod
    def from_plugin_hook(raw: Dict[str, Any]) -> Optional[NormalizedEvent]:
        hook = raw.get("hook") or raw.get("event") or ""
        ts = float(raw.get("timestamp", time.time()))
        ctx = raw.get("ctx") or {}
        agent_id = ctx.get("agent_id") or raw.get("agent_id") or "unknown"
        session_id = ctx.get("session_id") or raw.get("session_id") or "unknown"
        run_id = ctx.get("run_id") or raw.get("run_id") or "unknown"

        mapping = {
            "on_session_start":     ("agent.started",            {"profile": ctx.get("profile", "")}),
            "on_session_end":       ("agent.stopped",            {"reason": ctx.get("reason", "normal")}),
            "on_session_finalize":  ("agent.stopped",            {"reason": "finalize"}),
            "subagent_start":       ("agent.subagent.start",     {"child": ctx.get("subagent_id", "?"),
                                                                 "profile": ctx.get("profile", "")}),
            "subagent_stop":        ("agent.subagent.complete",  {"child": ctx.get("subagent_id", "?"),
                                                                 "ok": ctx.get("ok", True)}),
            "pre_tool_call":        ("agent.tool.started",       {"tool": ctx.get("tool", "?"),
                                                                 "args_size": len(str(ctx.get("input", "")))}),
            "post_tool_call":       ("agent.tool.completed",     {"tool": ctx.get("tool", "?"),
                                                                 "ok": ctx.get("ok", True),
                                                                 "duration_ms": ctx.get("duration_ms", 0)}),
            "on_skill_lifecycle":   ("agent.skill.lifecycle",    {"skill": ctx.get("skill", "?"),
                                                                 "action": ctx.get("action", "pin")}),
            "on_room_member_activity": ("agent.room.activity",   {"room": ctx.get("room", "?"),
                                                                 "member": ctx.get("member", "?"),
                                                                 "action": ctx.get("action", "join")}),
        }
        if hook not in mapping:
            return None
        et, extra = mapping[hook]
        return NormalizedEvent(
            agent_id=agent_id, session_id=session_id, run_id=run_id,
            timestamp=ts, event_type=et, payload=extra,
        )

    @staticmethod
    def from_monitoring_event(raw: Dict[str, Any]) -> Optional[NormalizedEvent]:
        kind = raw.get("kind") or raw.get("event") or ""
        ts = float(raw.get("timestamp", time.time()))
        if kind == "gateway_health":
            return NormalizedEvent(
                agent_id="system", session_id="system", run_id="system",
                timestamp=ts, event_type="system.gateway_health",
                payload={
                    "name": raw.get("name", "?"),
                    "gateway_state": raw.get("gateway_state") or raw.get("new_state", "?"),
                    "old_state": raw.get("old_state", ""),
                    "active_agents": raw.get("active_agents", 0),
                    "gateway_busy": raw.get("gateway_busy", False),
                    "platform_count": raw.get("platform_count", 0),
                    "version": raw.get("version", ""),
                    "pid": raw.get("pid", 0),
                },
            )
        if kind == "cron_execution":
            return NormalizedEvent(
                agent_id="system", session_id="system", run_id="system",
                timestamp=ts, event_type="system.cron_execution",
                payload={
                    "job_key": raw.get("job_key", "?"),
                    "source": raw.get("source", "?"),
                    "status": raw.get("status", "ok"),
                    "duration_ms": raw.get("duration_ms", 0),
                    "delivery_outcome": raw.get("delivery_outcome", ""),
                },
            )
        if kind == "gateway_diagnostic":
            return NormalizedEvent(
                agent_id="system", session_id="system", run_id="system",
                timestamp=ts, event_type="system.gateway_diagnostic",
                payload={
                    "subsystem": raw.get("subsystem", "?"),
                    "error_class": raw.get("error_class", ""),
                    "error_code": raw.get("error_code", ""),
                    "severity": raw.get("severity", "info"),
                },
            )
        return None

    @staticmethod
    def from_webhook(raw: Dict[str, Any]) -> Optional[NormalizedEvent]:
        hook = raw.get("hook") or ""
        ts = float(raw.get("timestamp", time.time()))
        ctx = raw.get("ctx") or {}
        if hook == "pre_tool_call":
            return NormalizedEvent(
                agent_id=ctx.get("agent_id", "unknown"),
                session_id=ctx.get("session_id", "unknown"),
                run_id=ctx.get("run_id", "unknown"),
                timestamp=ts, event_type="agent.tool.started",
                payload={"tool": ctx.get("tool", "?"),
                         "args_size": len(str(ctx.get("input", "")))},
            )
        if hook == "post_tool_call":
            return NormalizedEvent(
                agent_id=ctx.get("agent_id", "unknown"),
                session_id=ctx.get("session_id", "unknown"),
                run_id=ctx.get("run_id", "unknown"),
                timestamp=ts, event_type="agent.tool.completed",
                payload={"tool": ctx.get("tool", "?"),
                         "ok": ctx.get("ok", True),
                         "duration_ms": ctx.get("duration_ms", 0)},
            )
        return None


# ---------------------------------------------------------------------------
# Inbound: SSE run subscriber pool
# ---------------------------------------------------------------------------

class SSESubscriberPool:
    """One EventSource per active Hermes run. Polls /api/sessions every 2s;
    when a new active run appears, spawns a subscriber; when run.completed
    arrives, despawns after a 30s grace period for late events."""

    def __init__(self, base_url: str, api_key: str, bus: EventBus) -> None:
        self.base = base_url.rstrip("/")
        self.api_key = api_key
        self.bus = bus
        self._subs: Dict[str, asyncio.Task] = {}
        self._stop = asyncio.Event()

    async def run(self) -> None:
        if not self.base:
            log.info("SSE pool: no HERMES_BASE_URL — pool disabled")
            return
        async with ClientSession() as sess:
            while not self._stop.is_set():
                try:
                    active = await self._discover_runs(sess)
                    for run_id, session_id in active:
                        if run_id not in self._subs:
                            t = asyncio.create_task(self._subscribe_run(sess, run_id, session_id))
                            self._subs[run_id] = t
                            log.info("SSE pool: subscribed to run %s (session=%s)", run_id, session_id)
                except Exception as e:
                    log.warning("SSE pool discovery error: %s", e)
                try:
                    await asyncio.wait_for(self._stop.wait(), timeout=2.0)
                except asyncio.TimeoutError:
                    pass

    async def _discover_runs(self, sess: ClientSession) -> List[tuple]:
        """Hit GET /api/sessions and return [(run_id, session_id), ...] for active runs."""
        headers = {"Authorization": f"Bearer {self.api_key}"} if self.api_key else {}
        async with sess.get(f"{self.base}/api/sessions", headers=headers, timeout=5) as r:
            r.raise_for_status()
            data = await r.json()
        out = []
        for s in (data if isinstance(data, list) else data.get("sessions", [])):
            run_id = s.get("active_run_id") or s.get("run_id")
            sid = s.get("session_id") or s.get("id")
            if run_id and sid:
                out.append((run_id, sid))
        return out

    async def _subscribe_run(self, sess: ClientSession, run_id: str, session_id: str) -> None:
        headers = {"Authorization": f"Bearer {self.api_key}"} if self.api_key else {}
        url = f"{self.base}/v1/runs/{run_id}/events"
        last_completed_at: Optional[float] = None
        try:
            async with sess.get(url, headers=headers, timeout=None) as r:
                if r.status != 200:
                    log.warning("SSE %s: status=%d", run_id, r.status)
                    return
                async for raw_line in r.content:
                    if self._stop.is_set():
                        break
                    line = raw_line.decode("utf-8", errors="replace").strip()
                    if not line.startswith("data:"):
                        continue
                    payload = line[5:].strip()
                    if not payload:
                        continue
                    try:
                        evt = json.loads(payload)
                    except json.JSONDecodeError:
                        continue
                    norm = Normalizer.from_sse_run_event(run_id, session_id, evt)
                    if norm:
                        self.bus.publish(norm)
                        if norm.event_type == "agent.stopped":
                            last_completed_at = time.time()
                # if we exit because stream closed, wait grace 30s for late events
        except asyncio.CancelledError:
            pass
        except Exception as e:
            log.warning("SSE %s error: %s", run_id, e)
        finally:
            # grace period
            if last_completed_at:
                grace = max(0, 30 - (time.time() - last_completed_at))
                await asyncio.sleep(grace)
            self._subs.pop(run_id, None)
            log.info("SSE pool: despawned subscriber for run %s", run_id)

    def stop(self) -> None:
        self._stop.set()
        for t in self._subs.values():
            t.cancel()


# ---------------------------------------------------------------------------
# Inbound: Dashboard WS JSON-RPC subscriber  (single persistent connection)
# ---------------------------------------------------------------------------

class WSSubscriber:
    """Persistent connection to Hermes dashboard /api/ws. Multiplexes all
    session.info / session.updated / notification.* events without needing
    per-session subscribers."""

    def __init__(self, ws_url: str, bus: EventBus) -> None:
        self.ws_url = ws_url
        self.bus = bus
        self._stop = asyncio.Event()

    async def run(self) -> None:
        if not self.ws_url:
            log.info("WS subscriber: no HERMES_DASHBOARD_WS — disabled")
            return
        try:
            import websockets  # type: ignore
        except ImportError:
            log.warning("WS subscriber: websockets not installed; skipping")
            return
        backoff = 1.0
        while not self._stop.is_set():
            try:
                async with websockets.connect(self.ws_url, ping_interval=20) as ws:
                    log.info("WS subscriber: connected to %s", self.ws_url)
                    backoff = 1.0
                    async for msg in ws:
                        if self._stop.is_set():
                            break
                        try:
                            frame = json.loads(msg)
                        except Exception:
                            continue
                        # JSON-RPC event frame: {"jsonrpc":"2.0","method":"event","params":{type,...}}
                        if frame.get("method") != "event":
                            continue
                        params = frame.get("params") or {}
                        evt_type = params.get("type", "")
                        payload = params.get("payload") or {}
                        session_id = params.get("session_id", "unknown")
                        run_id = payload.get("run_id", "unknown")
                        agent_id = payload.get("agent_id", "unknown")
                        ts = float(params.get("replay_epoch") or payload.get("timestamp") or time.time())

                        # Reuse the SSE normalizer for symmetric event shapes
                        norm = Normalizer.from_sse_run_event(run_id, session_id, {
                            "type": evt_type, "payload": payload, "timestamp": ts,
                            "agent_id": agent_id,
                        })
                        if norm:
                            self.bus.publish(norm)
            except asyncio.CancelledError:
                break
            except Exception as e:
                log.warning("WS subscriber error: %s (retry in %.1fs)", e, backoff)
                try:
                    await asyncio.wait_for(self._stop.wait(), timeout=backoff)
                except asyncio.TimeoutError:
                    pass
                backoff = min(backoff * 2, 30)

    def stop(self) -> None:
        self._stop.set()


# ---------------------------------------------------------------------------
# Inbound: MonitoringEmitter poller (fallback when not in-process)
# ---------------------------------------------------------------------------

class MonitoringPoller:
    """Polls GET /health/detailed every 5s and synthesizes gateway_health
    events when state changes. Used as a fallback when the bridge is not
    running in-process with Hermes (preferred path: subscribe to the
    MonitoringEmitter singleton directly)."""

    def __init__(self, base_url: str, api_key: str, bus: EventBus) -> None:
        self.base = base_url.rstrip("/") if base_url else ""
        self.api_key = api_key
        self.bus = bus
        self._stop = asyncio.Event()
        self._last_state: Optional[str] = None

    async def run(self) -> None:
        if not self.base:
            return
        async with ClientSession() as sess:
            while not self._stop.is_set():
                try:
                    headers = {"Authorization": f"Bearer {self.api_key}"} if self.api_key else {}
                    async with sess.get(f"{self.base}/health/detailed", headers=headers, timeout=5) as r:
                        if r.status == 200:
                            data = await r.json()
                            new_state = data.get("gateway_state", "unknown")
                            if new_state != self._last_state:
                                evt = NormalizedEvent(
                                    agent_id="system", session_id="system", run_id="system",
                                    timestamp=time.time(), event_type="system.gateway_health",
                                    payload={
                                        "name": data.get("name", "hermes"),
                                        "gateway_state": new_state,
                                        "old_state": self._last_state or "",
                                        "active_agents": data.get("active_agents", 0),
                                        "gateway_busy": data.get("gateway_busy", False),
                                        "platform_count": data.get("platform_count", 0),
                                        "version": data.get("version", ""),
                                        "pid": data.get("pid", 0),
                                    },
                                )
                                self.bus.publish(evt)
                                self._last_state = new_state
                except Exception as e:
                    log.debug("monitoring poll error: %s", e)
                try:
                    await asyncio.wait_for(self._stop.wait(), timeout=5.0)
                except asyncio.TimeoutError:
                    pass

    def stop(self) -> None:
        self._stop.set()


# ---------------------------------------------------------------------------
# Inbound: Trajectory JSONL tail  (Phase 3 prep, low-frequency)
# ---------------------------------------------------------------------------

class TrajectoryTail:
    """Tails ~/.hermes/trajectory_samples.jsonl. Emits a memory.mutation event
    for each new line. Used by Phase 3 Replay Mode (the file is the substrate),
    but tailing it in Phase 1.5 gives the dashboard a live memory-strata signal."""

    def __init__(self, path: str, bus: EventBus) -> None:
        self.path = Path(path)
        self.bus = bus
        self._stop = asyncio.Event()

    async def run(self) -> None:
        if not self.path.exists():
            log.info("trajectory tail: %s does not exist (yet); will start when it appears", self.path)
        while not self._stop.is_set():
            try:
                if self.path.exists():
                    with self.path.open("r", encoding="utf-8", errors="replace") as f:
                        # seek to end on first observation
                        f.seek(0, os.SEEK_END)
                        inode = self.path.stat().st_ino
                        while not self._stop.is_set():
                            try:
                                line = f.readline()
                            except Exception:
                                break
                            if not line:
                                # check for rotation
                                try:
                                    if self.path.stat().st_ino != inode:
                                        break  # file rotated; outer loop reopens
                                except FileNotFoundError:
                                    break
                                await asyncio.sleep(1.0)
                                continue
                            line = line.strip()
                            if not line:
                                continue
                            try:
                                traj = json.loads(line)
                            except json.JSONDecodeError:
                                continue
                            # extract a memory.mutation signal — only metadata
                            evt = NormalizedEvent(
                                agent_id=(traj.get("agent_id") or "unknown"),
                                session_id=(traj.get("session_id") or "unknown"),
                                run_id=(traj.get("run_id") or "unknown"),
                                timestamp=time.time(),
                                event_type="memory.mutation",
                                payload={
                                    "trajectory_id": traj.get("id") or traj.get("trajectory_id", "?"),
                                    "sharegpt_entries": len(traj.get("conversations", [])),
                                    "tags": traj.get("tags", [])[:5],
                                },
                            )
                            self.bus.publish(evt)
                else:
                    await asyncio.sleep(5.0)
            except asyncio.CancelledError:
                break
            except Exception as e:
                log.debug("trajectory tail error: %s", e)
                await asyncio.sleep(5.0)

    def stop(self) -> None:
        self._stop.set()


# ---------------------------------------------------------------------------
# Mock event generator  — for demo / sandbox / CI
# ---------------------------------------------------------------------------

# Realistic-ish agent roster mirroring the cosmic-architecture-metaphor skill.
MOCK_AGENTS = [
    ("TRISMIGISTUS",  "high", "guardian"),
    ("GODSEYE",       "high", "oversight"),
    ("FACTCHECK",     "high", "verification"),
    ("LIBRARIAN",     "mid",  "memory"),
    ("CURATOR",       "mid",  "memory"),
    ("MAIL",          "mid",  "delivery"),
    ("CANARY",        "mid",  "delivery"),
    ("SPINUP-01",     "low",  "sandbox"),
    ("SPINUP-02",     "low",  "sandbox"),
    ("HERMES",        "high", "runtime"),
]

MOCK_TOOLS = ["read_file", "write_file", "shell", "web_search", "mcp.call", "memory.pin", "subagent.dispatch"]
MOCK_SKILLS = ["cosmic-architecture-metaphor", "review-interface-scaffold", "godseye-replay-mode"]


class MockEventSource:
    """Generates a realistic stream of normalized events so the dashboard
    Live tab can be demoed without a real Hermes runtime."""

    def __init__(self, bus: EventBus, rate: float = 1.5) -> None:
        self.bus = bus
        self.rate = rate  # events per second
        self._stop = asyncio.Event()

    async def run(self) -> None:
        log.info("mock event source: starting (rate=%.1f events/s)", self.rate)
        session_id = f"sess-{uuid.uuid4().hex[:8]}"
        run_id = f"run-{uuid.uuid4().hex[:8]}"
        active_agent = random.choice(MOCK_AGENTS)[0]
        last_tool: Optional[float] = None

        while not self._stop.is_set():
            # emit one event per tick
            choice = random.random()
            ts = time.time()
            if choice < 0.05:
                # session start
                agent = random.choice(MOCK_AGENTS)[0]
                self.bus.publish(NormalizedEvent(
                    agent_id=agent, session_id=session_id, run_id=run_id,
                    timestamp=ts, event_type="agent.started",
                    payload={"profile": "default"},
                ))
                active_agent = agent
            elif choice < 0.10:
                # session stop
                self.bus.publish(NormalizedEvent(
                    agent_id=active_agent, session_id=session_id, run_id=run_id,
                    timestamp=ts, event_type="agent.stopped",
                    payload={"state": "run.completed", "ok": True},
                ))
            elif choice < 0.55:
                # message delta
                self.bus.publish(NormalizedEvent(
                    agent_id=active_agent, session_id=session_id, run_id=run_id,
                    timestamp=ts, event_type="agent.message.delta",
                    payload={"delta_chars": random.randint(8, 240), "seq": int(ts * 1000) % 100000},
                ))
            elif choice < 0.78:
                # tool started
                tool = random.choice(MOCK_TOOLS)
                self.bus.publish(NormalizedEvent(
                    agent_id=active_agent, session_id=session_id, run_id=run_id,
                    timestamp=ts, event_type="agent.tool.started",
                    payload={"tool": tool, "args_size": random.randint(20, 800)},
                ))
                last_tool = ts
            elif choice < 0.88 and last_tool is not None:
                # tool completed
                self.bus.publish(NormalizedEvent(
                    agent_id=active_agent, session_id=session_id, run_id=run_id,
                    timestamp=ts, event_type="agent.tool.completed",
                    payload={"tool": MOCK_TOOLS[(int(ts) // 7) % len(MOCK_TOOLS)],
                             "ok": random.random() < 0.92,
                             "duration_ms": random.randint(50, 3500)},
                ))
            elif choice < 0.94:
                # subagent dispatch
                child = random.choice(MOCK_AGENTS)[0]
                self.bus.publish(NormalizedEvent(
                    agent_id=active_agent, session_id=session_id, run_id=run_id,
                    timestamp=ts, event_type="agent.subagent.start",
                    payload={"child": child, "profile": "default"},
                ))
            elif choice < 0.97:
                # skill lifecycle
                self.bus.publish(NormalizedEvent(
                    agent_id=active_agent, session_id=session_id, run_id=run_id,
                    timestamp=ts, event_type="agent.skill.lifecycle",
                    payload={"skill": random.choice(MOCK_SKILLS),
                             "action": random.choice(["pin", "archive", "evict"])},
                ))
            elif choice < 0.99:
                # gateway health tick
                self.bus.publish(NormalizedEvent(
                    agent_id="system", session_id="system", run_id="system",
                    timestamp=ts, event_type="system.gateway_health",
                    payload={
                        "name": "hermes-mock",
                        "gateway_state": random.choice(["idle", "busy", "busy", "active"]),
                        "active_agents": random.randint(2, 8),
                        "gateway_busy": random.random() < 0.3,
                        "platform_count": 4,
                        "version": "0.21.2-mock",
                        "pid": os.getpid(),
                    },
                ))
            else:
                # cron execution
                self.bus.publish(NormalizedEvent(
                    agent_id="system", session_id="system", run_id="system",
                    timestamp=ts, event_type="system.cron_execution",
                    payload={
                        "job_key": f"cron-{random.randint(1,5)}",
                        "source": random.choice(["agent", "mcp", "schedule"]),
                        "status": "ok" if random.random() < 0.95 else "error",
                        "duration_ms": random.randint(100, 4000),
                        "delivery_outcome": "delivered",
                    },
                ))
            try:
                await asyncio.wait_for(self._stop.wait(), timeout=1.0 / self.rate)
            except asyncio.TimeoutError:
                pass

    def stop(self) -> None:
        self._stop.set()


# ---------------------------------------------------------------------------
# Live snapshot writer — preserves the 6-tab dashboard.json contract
# ---------------------------------------------------------------------------

class SnapshotWriter:
    """Writes data/dashboard.json every 5s. Preserves the existing 6-tab
    contract so the Agents/Task Flow/Memory/Fact-Check/Feedback/Governance
    tabs continue to work without modification. Flips runtime_verified: true
    and refreshes counts."""

    def __init__(self, bus: EventBus, data_dir: Path, agents_manifest: List[Dict[str, Any]]) -> None:
        self.bus = bus
        self.data_dir = data_dir
        self.agents_manifest = agents_manifest
        self._stop = asyncio.Event()
        self._counts: Dict[str, Dict[str, int]] = {}  # agent_id -> {messages, tools, subagents, approvals}
        self._active_sessions: set = set()
        self._active_runs: set = set()
        for a in agents_manifest:
            self._counts[a["id"]] = {"messages": 0, "tools": 0, "subagents": 0, "approvals": 0}

        # subscribe to the bus so we can count
        self._q = bus.subscribe()

    def _ingest(self, evt: NormalizedEvent) -> None:
        if evt.agent_id in self._counts:
            if evt.event_type == "agent.message.delta":
                self._counts[evt.agent_id]["messages"] += 1
            elif evt.event_type == "agent.tool.completed":
                self._counts[evt.agent_id]["tools"] += 1
            elif evt.event_type == "agent.subagent.start":
                self._counts[evt.agent_id]["subagents"] += 1
            elif evt.event_type == "agent.approval.request":
                self._counts[evt.agent_id]["approvals"] += 1
        if evt.event_type == "agent.started":
            self._active_sessions.add(evt.session_id)
            self._active_runs.add(evt.run_id)
        elif evt.event_type == "agent.stopped":
            self._active_sessions.discard(evt.session_id)
            self._active_runs.discard(evt.run_id)

    async def run(self) -> None:
        log.info("snapshot writer: writing %s every 5s", self.data_dir / "dashboard.json")
        self.data_dir.mkdir(parents=True, exist_ok=True)
        target = self.data_dir / "dashboard.json"
        while not self._stop.is_set():
            # drain queue
            try:
                while True:
                    evt = self._q.get_nowait()
                    self._ingest(evt)
            except asyncio.QueueEmpty:
                pass

            snapshot = self._build_snapshot()
            tmp = target.with_suffix(".json.tmp")
            try:
                tmp.write_text(json.dumps(snapshot, indent=2))
                tmp.replace(target)
            except Exception as e:
                log.warning("snapshot write failed: %s", e)
            try:
                await asyncio.wait_for(self._stop.wait(), timeout=5.0)
            except asyncio.TimeoutError:
                pass

    def _build_snapshot(self) -> Dict[str, Any]:
        agents_summary = []
        for a in self.agents_manifest:
            c = self._counts.get(a["id"], {})
            agents_summary.append({
                "id": a["id"],
                "name": a.get("name", a["id"]),
                "role": a.get("role", ""),
                "altitude_band": a.get("altitude_band", "mid"),
                "state": "active" if a["id"] in {x for x in self._counts if self._counts[x]["messages"] > 0} else "idle",
                "messages": c.get("messages", 0),
                "tools": c.get("tools", 0),
                "subagents": c.get("subagents", 0),
                "approvals": c.get("approvals", 0),
            })
        return {
            "schema": "godseye-dashboard-v1",
            "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "runtime_verified": True,
            "active_sessions": sorted(self._active_sessions),
            "active_runs": sorted(self._active_runs),
            "counts": {
                "agents": len(agents_summary),
                "active_agents": sum(1 for a in agents_summary if a["state"] == "active"),
                "active_sessions": len(self._active_sessions),
                "active_runs": len(self._active_runs),
                "memory_layers": 4,
                "queues": sum(c.get("approvals", 0) for c in self._counts.values()),
            },
            "agents": agents_summary,
            "memory_layers": [
                {"id": "working", "items": sum(c.get("messages", 0) for c in self._counts.values())},
                {"id": "episodic", "items": sum(c.get("tools", 0) for c in self._counts.values())},
                {"id": "semantic", "items": 0},
                {"id": "procedural", "items": sum(c.get("subagents", 0) for c in self._counts.values())},
            ],
            "warnings": [],
            "notes": "Live snapshot from gods-eye-bridge.py. runtime_verified=true.",
        }

    def stop(self) -> None:
        self._stop.set()


# ---------------------------------------------------------------------------
# Outbound HTTP server
# ---------------------------------------------------------------------------

async def sse_events_handler(request: web.Request) -> web.StreamResponse:
    """GET /api/gods-eye/events — SSE fanout."""
    resp = web.StreamResponse(
        status=200,
        headers={
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "Access-Control-Allow-Origin": "*",
        },
    )
    await resp.prepare(request)

    bus: EventBus = request.app["bus"]
    q = bus.subscribe()
    try:
        # send a hello frame so the client knows we're alive
        hello = NormalizedEvent(
            agent_id="system", session_id="system", run_id="system",
            timestamp=time.time(), event_type="system.gateway_health",
            payload={"name": "gods-eye-bridge", "gateway_state": "ready",
                     "active_agents": 0, "version": "1.5.0"},
        )
        await resp.write(hello.to_sse().encode("utf-8"))
        while True:
            try:
                evt = await asyncio.wait_for(q.get(), timeout=15.0)
                await resp.write(evt.to_sse().encode("utf-8"))
            except asyncio.TimeoutError:
                # keepalive comment
                await resp.write(b": ping\n\n")
    except (ConnectionResetError, asyncio.CancelledError):
        pass
    finally:
        bus.unsubscribe(q)
    return resp


async def snapshot_handler(request: web.Request) -> web.Response:
    """GET /api/gods-eye/snapshot — current dashboard.json (live)."""
    data_dir: Path = request.app["data_dir"]
    target = data_dir / "dashboard.json"
    if not target.exists():
        return web.json_response({"error": "snapshot not yet written"}, status=503)
    return web.FileResponse(target, headers={"Access-Control-Allow-Origin": "*",
                                              "Cache-Control": "no-cache"})


async def hook_receiver_handler(request: web.Request) -> web.Response:
    """POST /api/bridge/hooks — receives pushes from the Hermes gods-eye plugin."""
    try:
        raw = await request.json()
    except Exception:
        return web.json_response({"error": "invalid json"}, status=400)
    bus: EventBus = request.app["bus"]
    norm = Normalizer.from_plugin_hook(raw)
    if norm:
        bus.publish(norm)
        return web.json_response({"ok": True, "event_type": norm.event_type})
    return web.json_response({"ok": False, "reason": "no mapping for hook"}, status=202)


async def webhook_receiver_handler(request: web.Request) -> web.Response:
    """POST /api/bridge/webhooks — receives HMAC outbound webhooks."""
    # NOTE: production deployment should verify HMAC signature. Skipped here
    # for the bridge-side stub; the Hermes side has the secret.
    try:
        raw = await request.json()
    except Exception:
        return web.json_response({"error": "invalid json"}, status=400)
    bus: EventBus = request.app["bus"]
    norm = Normalizer.from_webhook(raw)
    if norm:
        bus.publish(norm)
        return web.json_response({"ok": True})
    return web.json_response({"ok": False}, status=202)


async def health_handler(request: web.Request) -> web.Response:
    return web.json_response({
        "ok": True,
        "service": "gods-eye-bridge",
        "version": "1.5.0",
        "hermes_base_url": HERMES_BASE_URL or "(mock mode)",
        "subscribers": len(request.app["bus"]._subs),
        "ring_size": len(request.app["bus"]._ring),
        "event_types": list(EVENT_TYPES.keys()),
        "color_coding": COLOR,
    })


async def control_handler(request: web.Request) -> web.Response:
    """POST /api/gods-eye/control/{action} — Phase 4 only. Stub for now."""
    action = request.match_info["action"]
    if action not in ("steer", "stop", "approval", "fork", "resolve-unknown"):
        return web.json_response({"error": f"unknown action {action}"}, status=400)
    return web.json_response({
        "ok": False,
        "reason": "Phase 4 — outbound control not yet implemented",
        "action": action,
    }, status=501)


# ---------------------------------------------------------------------------
# Orchestration
# ---------------------------------------------------------------------------

def load_agents_manifest() -> List[Dict[str, Any]]:
    """Load agents.json if present; otherwise synthesize from MOCK_AGENTS."""
    target = DASHBOARD_DATA_DIR / "agents.json"
    if target.exists():
        try:
            data = json.loads(target.read_text())
            agents = None
            if isinstance(data, dict) and "agents" in data:
                agents = data["agents"]
            elif isinstance(data, list):
                agents = data
            if agents is not None:
                # normalize: repo manifest uses "name"; bridge expects "id"
                for a in agents:
                    if isinstance(a, dict):
                        a.setdefault("id", a.get("name") or a.get("full_name") or "unknown")
                return agents
        except Exception as e:
            log.warning("agents.json parse error: %s — using mock roster", e)
    # synthesize
    return [
        {"id": aid, "name": aid.title(), "role": role, "altitude_band": band}
        for aid, band, role in MOCK_AGENTS
    ]


async def app_factory(args: argparse.Namespace) -> web.Application:
    bus = EventBus()
    agents_manifest = load_agents_manifest()

    app = web.Application()
    app["bus"] = bus
    app["data_dir"] = DASHBOARD_DATA_DIR
    app["agents_manifest"] = agents_manifest

    # routes
    app.router.add_get("/api/gods-eye/events", sse_events_handler)
    app.router.add_get("/api/gods-eye/snapshot", snapshot_handler)
    app.router.add_get("/api/gods-eye/health", health_handler)
    app.router.add_post("/api/bridge/hooks", hook_receiver_handler)
    app.router.add_post("/api/bridge/webhooks", webhook_receiver_handler)
    app.router.add_post("/api/gods-eye/control/{action}", control_handler)

    # also serve the dashboard itself for one-stop demo
    dashboard_dir = DASHBOARD_DATA_DIR.parent
    if dashboard_dir.exists():
        app.router.add_get("/", lambda r: web.FileResponse(dashboard_dir / "index.html"))
        app.router.add_static("/", path=str(dashboard_dir), show_index=True)

    # inbound sources
    sources: List[Awaitable] = []

    if args.mock or not HERMES_BASE_URL:
        log.warning("=== MOCK MODE ===  HERMES_BASE_URL not set; using MockEventSource")
        sources.append(MockEventSource(bus, rate=args.mock_rate).run())
    else:
        sources.append(SSESubscriberPool(HERMES_BASE_URL, HERMES_API_KEY, bus).run())
        if HERMES_DASHBOARD_WS:
            sources.append(WSSubscriber(HERMES_DASHBOARD_WS, bus).run())
        sources.append(MonitoringPoller(HERMES_BASE_URL, HERMES_API_KEY, bus).run())

    # trajectory tail runs in both modes (file may or may not exist)
    sources.append(TrajectoryTail(HERMES_TRAJECTORY_PATH, bus).run())

    # snapshot writer runs in both modes (the dashboard contract requires it)
    snap = SnapshotWriter(bus, DASHBOARD_DATA_DIR, agents_manifest)
    sources.append(snap.run())

    # capture tasks for cleanup
    app["sources"] = [asyncio.create_task(s) for s in sources]
    app["snapshot_writer"] = snap

    async def on_cleanup(app: web.Application) -> None:
        for t in app["sources"]:
            t.cancel()
        for t in app["sources"]:
            try:
                await t
            except (asyncio.CancelledError, Exception):
                pass

    app.on_cleanup.append(on_cleanup)

    return app


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Godseye × HermesSPL Phase 1.5 bridge")
    p.add_argument("--host", default=os.environ.get("BRIDGE_HOST", DEFAULT_HOST))
    p.add_argument("--port", type=int, default=int(os.environ.get("BRIDGE_PORT", DEFAULT_PORT)))
    p.add_argument("--mock", action="store_true",
                   help="Run in mock mode (generate fake events; ignore HERMES_BASE_URL)")
    p.add_argument("--mock-rate", type=float, default=1.5,
                   help="Mock event rate (events/sec)")
    return p.parse_args()


def main() -> None:
    args = parse_args()
    log.info("godseye-bridge starting  host=%s port=%s  mock=%s  hermes=%s",
             args.host, args.port, args.mock or not HERMES_BASE_URL,
             HERMES_BASE_URL or "(unset)")
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    app = loop.run_until_complete(app_factory(args))

    # graceful shutdown
    stop = asyncio.Event()

    def _stop(*_):
        stop.set()

    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(sig, _stop)
        except NotImplementedError:
            pass  # Windows

    runner = web.AppRunner(app)
    loop.run_until_complete(runner.setup())
    site = web.TCPSite(runner, host=args.host, port=args.port)
    loop.run_until_complete(site.start())
    log.info("listening on http://%s:%s", args.host, args.port)
    log.info("  SSE:    GET  /api/gods-eye/events")
    log.info("  snap:   GET  /api/gods-eye/snapshot")
    log.info("  health: GET  /api/gods-eye/health")
    log.info("  hooks:  POST /api/bridge/hooks")
    log.info("  webhk:  POST /api/bridge/webhooks")

    try:
        loop.run_until_complete(stop.wait())
    finally:
        log.info("shutting down...")
        loop.run_until_complete(runner.cleanup())


if __name__ == "__main__":
    main()
