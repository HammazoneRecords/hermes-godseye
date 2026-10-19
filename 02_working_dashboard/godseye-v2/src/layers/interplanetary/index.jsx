/**
 * Interplanetary layer — spaceships (subagent dispatches via Jhanos gates).
 * Per Phase 2 Cockpit Plan §4.3 Table 2: custom (no reference equivalent).
 *
 * For each recent subagent dispatch, draw a brief arc from parent agent to
 * child agent (gold when dispatching, cyan when returning).
 */
import { Entity, PolylineGraphics } from 'resium';
import { Cartesian3, Color, PolylineGlowMaterialProperty } from 'cesium';
import { useAgentsStore } from '../../store/agentsStore';
import { usePacketsStore } from '../../store/packetsStore';

export function InterplanetaryLayer() {
  const agents = useAgentsStore((s) => s.agents);
  const spaceships = usePacketsStore((s) => s.spaceships);

  // show last 10 subagent dispatches within 10s
  const now = Date.now() / 1000;
  const visible = spaceships.filter(s => now - s.ts < 10).slice(0, 10);

  return visible.map((s) => {
    const parent = agents.find(a => a.id === s.agent_id);
    const child = agents.find(a => a.id === s.child);
    if (!parent || !child) return null;
    const positions = [
      Cartesian3.fromDegrees(parent.longitude, parent.latitude, parent.altitude_km * 1000),
      Cartesian3.fromDegrees(child.longitude, child.latitude, child.altitude_km * 1000),
    ];
    const color = s.kind === 'start'
      ? Color.fromCssColorString('#e2b45d')  // gold for outbound
      : Color.fromCssColorString('#00ffd5'); // cyan for return
    const age = now - s.ts;
    const opacity = Math.max(0, 1 - age / 10);
    return (
      <Entity
        key={s.id}
        polyline={{
          positions,
          width: 3,
          material: new PolylineGlowMaterialProperty({
            color: color.withAlpha(opacity),
            glowPower: 0.25,
          }),
          arcType: 1, // NONE — straight line through space
        }}
      />
    );
  });
}
