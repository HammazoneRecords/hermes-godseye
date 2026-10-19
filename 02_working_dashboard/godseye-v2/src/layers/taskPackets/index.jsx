/**
 * TaskPackets layer — planes representing fast messages and tool pulses.
 * Per Phase 2 Cockpit Plan §4.3 Table 2: AircraftLayer (flight variant).
 *
 * Each packet appears briefly as a small pulse at the agent's position, then
 * fades. Color: pink=traffic (message), blue=tool call (per cosmic metaphor).
 */
import { Entity } from 'resium';
import { Cartesian3, Color, HeightReference } from 'cesium';
import { useAgentsStore } from '../../store/agentsStore';
import { usePacketsStore } from '../../store/packetsStore';

export function TaskPacketsLayer() {
  const agents = useAgentsStore((s) => s.agents);
  const planes = usePacketsStore((s) => s.planes);

  // only render the most recent 20 active planes (within 5s)
  const now = Date.now() / 1000;
  const visible = planes.filter(p => now - p.ts < 5).slice(0, 20);

  return visible.map((p) => {
    const a = agents.find(x => x.id === p.agent_id);
    if (!a) return null;
    const age = now - p.ts;
    const position = Cartesian3.fromDegrees(
      a.longitude + age * 0.5, // drift east, like a plane taking off
      a.latitude,
      a.altitude_km * 1000 + 500,
    );
    const color = p.kind === 'tool'
      ? Color.fromCssColorString('#00b4ff')
      : Color.fromCssColorString('#ff69b4');
    const opacity = Math.max(0, 1 - age / 5);
    return (
      <Entity
        key={p.id}
        position={position}
        point={{
          pixelSize: 5,
          color: color.withAlpha(opacity),
          outlineColor: color,
          outlineWidth: 1,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        }}
      />
    );
  });
}
