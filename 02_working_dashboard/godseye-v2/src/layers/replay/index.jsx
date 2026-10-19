/**
 * Replay layer — Phase 3.
 *
 * Renders the past session's events as visible markers on the globe when
 * in replay mode. Each event becomes a marker at the agent's home position,
 * colored by role:
 *   - system = infra cyan
 *   - human  = approval gold
 *   - gpt    = verified green
 *   - tool   = tool blue
 *
 * The "current event" (at scrub position) gets a larger pulsing marker.
 * Past events in the current session fade out by age.
 */
import { Entity } from 'resium';
import { Cartesian3, Color } from 'cesium';
import { useAgentsStore } from '../../store/agentsStore';
import { useReplayStore } from '../../store/replayStore';

const ROLE_COLOR = {
  system: '#00ffd5',
  human:  '#e2b45d',
  gpt:    '#72c69a',
  tool:   '#00b4ff',
};

function eventToMarker(e, agents, isCurrent) {
  const a = agents.find(x => x.id === e.agent_id);
  if (!a) return null;
  const color = Color.fromCssColorString(ROLE_COLOR[e.role] || '#e9edf4');
  const size = isCurrent ? 18 : 8;
  const opacity = isCurrent ? 1.0 : 0.4;
  const position = Cartesian3.fromDegrees(a.longitude, a.latitude, a.altitude_km * 1000);
  return { e, position, color, size, opacity };
}

export function ReplayLayer() {
  const agents = useAgentsStore((s) => s.agents);
  const replayMode = useReplayStore((s) => s.mode === 'replay');
  const events = useReplayStore((s) => s.events);
  const currentTime = useReplayStore((s) => s.current_time);

  if (!replayMode || events.length === 0) return null;

  // All events at or before current_time are visible during replay
  const visible = events.filter(e => e.ts <= currentTime);
  const currentEvent = visible[visible.length - 1];

  return visible.slice(-30).map((e) => {
    const m = eventToMarker(e, agents, e === currentEvent);
    if (!m) return null;
    return (
      <Entity
        key={`${e.trajectory_id}-${e.turn}`}
        position={m.position}
        point={{
          pixelSize: m.size,
          color: m.color.withAlpha(m.opacity),
          outlineColor: m.color,
          outlineWidth: 1,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        }}
        label={e === currentEvent ? {
          text: `T${e.turn} · ${e.role}${e.tool ? ' · ' + e.tool : ''}`,
          font: '11px JetBrains Mono, monospace',
          fillColor: Color.WHITE,
          outlineColor: Color.fromCssColorString('#0a0e1a'),
          outlineWidth: 2,
          style: 2,
          pixelOffset: { x: 0, y: -16 },
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          showBackground: true,
          backgroundColor: Color.fromCssColorString('#11172a').withAlpha(0.9),
        } : undefined}
      />
    );
  });
}
