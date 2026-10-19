"""Hermes plugin: gods-eye
========================

Pushes runtime hook events to the Godseye dashboard bridge. Lives at
~/.hermes/plugins/gods-eye/. Per Phase 2 Cockpit Plan §5.3.

Registered hooks (per manifest.yaml):
  on_session_start, on_session_end, on_session_finalize,
  subagent_start, subagent_stop,
  pre_tool_call, post_tool_call,
  on_skill_lifecycle, on_room_member_activity

Each callback POSTs a normalized event payload to the bridge's hook
receiver endpoint at http://127.0.0.1:8765/api/bridge/hooks. The bridge
normalizes further and emits the event on its SSE endpoint to the dashboard.

Boundary compliance:
  - Plugin never executes tool_input content (no prompt injection surface).
  - Plugin strips message bodies — only metadata is forwarded.
  - Secrets (api_key, authorization, cookie, *_api_key, password, token) are
    redacted from every payload before pushing.
  - Payload size is capped at max_payload_chars (default 50000).
"""
from __future__ import annotations

import fnmatch
import json
import os
import re
import time
from typing import Any, Dict, Optional

try:
    import httpx
except ImportError:  # pragma: no cover
    httpx = None  # type: ignore

try:
    import yaml
except ImportError:  # pragma: no cover
    yaml = None  # type: ignore

# Resolve manifest-derived config. Fall back to env vars.
DEFAULT_BRIDGE_URL = os.environ.get(
    "GODS_EYE_BRIDGE_URL",
    "http://127.0.0.1:8765/api/bridge/hooks",
)
MAX_PAYLOAD_CHARS = int(os.environ.get("GODS_EYE_PAYLOAD_MAX_CHARS", "50000"))
REDACT_KEYS = (
    "api_key", "authorization", "cookie", "password", "token",
)
REDACT_GLOBS = (
    "*_api_key", "*_token", "*_secret",
)
STRIP_MESSAGE_BODIES = os.environ.get("GODS_EYE_STRIP_BODIES", "1") == "1"

# Lazy singleton for the httpx client (so we don't pay init cost when not used).
_client = None


def _get_client():
    global _client
    if _client is None:
        if httpx is None:
            raise RuntimeError("httpx not installed in Hermes env; install with: pip install httpx")
        _client = httpx.Client(timeout=5.0)
    return _client


def _redact(payload: Any) -> Any:
    """Recursively redact secret keys from a payload."""
    if isinstance(payload, dict):
        out: Dict[str, Any] = {}
        for k, v in payload.items():
            if k in REDACT_KEYS or any(fnmatch.fnmatch(k, g) for g in REDACT_GLOBS):
                out[k] = "[redacted]"
            else:
                out[k] = _redact(v)
        return out
    if isinstance(payload, list):
        return [_redact(v) for v in payload]
    return payload


def _truncate(s: str, limit: int = MAX_PAYLOAD_CHARS) -> str:
    if len(s) <= limit:
        return s
    return s[:limit] + f"...[+{len(s) - limit} chars truncated]"


def _strip_bodies(ctx: Dict[str, Any]) -> Dict[str, Any]:
    """Per the no-Pluto-to-Earth boundary rule: strip message bodies, keep
    only delta counts and tool names. This is the single most important
    boundary-compliance step in the plugin."""
    if not STRIP_MESSAGE_BODIES:
        return ctx
    body_keys = ("text", "body", "content", "output", "result", "response", "delta")
    out = dict(ctx)
    for k in body_keys:
        if k in out:
            v = out[k]
            if isinstance(v, str):
                out[k] = f"[stripped: {len(v)} chars]"
            elif isinstance(v, (list, dict)):
                s = json.dumps(v, default=str)
                out[k] = f"[stripped: {len(s)} chars]"
    return out


def _push(hook: str, ctx: Dict[str, Any]) -> None:
    """Normalize the hook context and POST it to the bridge."""
    # Build the envelope the bridge's Normalizer.from_plugin_hook expects.
    payload = {
        "hook": hook,
        "timestamp": time.time(),
        "ctx": _redact(_strip_bodies(ctx)),
    }
    try:
        s = json.dumps(payload, default=str)
    except (TypeError, ValueError):
        s = str(payload)
    s = _truncate(s)
    try:
        r = _get_client().post(DEFAULT_BRIDGE_URL, content=s,
                               headers={"Content-Type": "application/json"})
        if r.status_code >= 400:
            # Plugin should never break Hermes — log and continue.
            pass
    except Exception:
        # Silently fail: plugin must not block Hermes runtime.
        pass


# ---------------------------------------------------------------------------
# Hook callbacks  — each takes a Hermes ctx dict
# ---------------------------------------------------------------------------

def on_session_start(ctx: Dict[str, Any]) -> None:
    _push("on_session_start", ctx)


def on_session_end(ctx: Dict[str, Any]) -> None:
    _push("on_session_end", ctx)


def on_session_finalize(ctx: Dict[str, Any]) -> None:
    _push("on_session_finalize", ctx)


def subagent_start(ctx: Dict[str, Any]) -> None:
    _push("subagent_start", ctx)


def subagent_stop(ctx: Dict[str, Any]) -> None:
    _push("subagent_stop", ctx)


def pre_tool_call(ctx: Dict[str, Any]) -> None:
    _push("pre_tool_call", ctx)


def post_tool_call(ctx: Dict[str, Any]) -> None:
    _push("post_tool_call", ctx)


def on_skill_lifecycle(ctx: Dict[str, Any]) -> None:
    _push("on_skill_lifecycle", ctx)


def on_room_member_activity(ctx: Dict[str, Any]) -> None:
    _push("on_room_member_activity", ctx)


# ---------------------------------------------------------------------------
# register(ctx)  — called by Hermes plugin loader
# ---------------------------------------------------------------------------

def register(ctx: Any) -> Dict[str, Any]:
    """Hermes plugin registration. `ctx` is the Hermes PluginContext.

    Returns a manifest dict Hermes uses to discover hook callbacks.
    """
    hooks = {
        "on_session_start":     on_session_start,
        "on_session_end":       on_session_end,
        "on_session_finalize":  on_session_finalize,
        "subagent_start":       subagent_start,
        "subagent_stop":        subagent_stop,
        "pre_tool_call":         pre_tool_call,
        "post_tool_call":        post_tool_call,
        "on_skill_lifecycle":  on_skill_lifecycle,
        "on_room_member_activity": on_room_member_activity,
    }
    return {
        "name": "gods-eye",
        "version": "1.0.0",
        "description": "Pushes runtime hook events to the Godseye dashboard bridge.",
        "hooks": hooks,
        "config": {
            "bridge_url": DEFAULT_BRIDGE_URL,
            "max_payload_chars": MAX_PAYLOAD_CHARS,
            "strip_message_bodies": STRIP_MESSAGE_BODIES,
            "redact_keys": list(REDACT_KEYS),
            "redact_globs": list(REDACT_GLOBS),
        },
    }
