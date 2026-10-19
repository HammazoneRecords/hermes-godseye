# Hermes plugin: gods-eye

Pushes runtime hook events to the Godseye dashboard bridge. Lives at `~/.hermes/plugins/gods-eye/`.

## Install

```bash
# Copy the plugin folder to ~/.hermes/plugins/
mkdir -p ~/.hermes/plugins/gods-eye
cp manifest.yaml __init__.py ~/.hermes/plugins/gods-eye/

# Install Python deps in the Hermes env
pip install httpx pyyaml

# (Optional) Point to a non-default bridge
export GODS_EYE_BRIDGE_URL=http://127.0.0.1:8765/api/bridge/hooks
```

Hermes plugin discovery will pick this up on next `hermes` startup. Verify with `hermes plugins list`.

## Hooks registered

| Hook | When it fires |
|------|---------------|
| `on_session_start`    | Hermes session begins |
| `on_session_end`      | Hermes session ends (normal) |
| `on_session_finalize` | Hermes session finalizes (cleanup) |
| `subagent_start`      | Subagent dispatched |
| `subagent_stop`       | Subagent returns |
| `pre_tool_call`       | About to run a tool |
| `post_tool_call`      | Tool finished |
| `on_skill_lifecycle`  | Skill pinned / archived / evicted |
| `on_room_member_activity` | Hosted room member activity |

## Boundary compliance

- **No message bodies** — only delta counts and tool names are pushed (per the no-Pluto-to-Earth-without-Jhanos-gates rule).
- **Secrets redacted** — keys matching `api_key`, `authorization`, `cookie`, `password`, `token`, `*_api_key`, `*_token`, `*_secret` are replaced with `[redacted]` before push.
- **Size capped** — payload size capped at `GODS_EYE_PAYLOAD_MAX_CHARS` (default 50000).
- **Silent failure** — if the bridge is down or returns an error, the plugin logs and continues. It never blocks Hermes runtime.
- **No execution of tool_input** — the plugin only forwards metadata, never executes forwarded content. This is the prompt-injection mitigation per Phase 2 Cockpit Plan §7.3.

## Config

| Env var | Default | Purpose |
|---------|---------|---------|
| `GODS_EYE_BRIDGE_URL`            | `http://127.0.0.1:8765/api/bridge/hooks` | Where to push events |
| `GODS_EYE_PAYLOAD_MAX_CHARS`    | `50000`                                  | Hard cap on payload size |
| `GODS_EYE_STRIP_BODIES`         | `1`                                      | Strip message bodies (set to `0` for debugging only) |
