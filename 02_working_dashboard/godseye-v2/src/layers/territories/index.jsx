/**
 * Territories layer — per-session, per-agent regions on the globe.
 * Per Phase 2 Cockpit Plan §4.3 Table 2: MilitaryBasesLayer pattern.
 *
 * Draws a colored ground region around each agent's home longitude.
 * Color: purple=Pluto (agent space), green=Earth (user canonical world).
 */
import { Entity } from 'resium';
import { Cartesian3, Color, HeightReference } from 'cesium';
import { useAgentsStore } from '../../store/agentsStore';

const TERRITORY_RADIUS = 250_000; // meters

export function TerritoriesLayer() {
  const agents = useAgentsStore((s) => s.agents);

  return agents.map((a) => {
    const color = Color.fromCssColorString(a.color || '#a78bfa').withAlpha(0.08);
    const outline = Color.fromCssColorString(a.color || '#a78bfa').withAlpha(0.4);
    return (
      <Entity
        key={`terr-${a.id}`}
        position={Cartesian3.fromDegrees(a.longitude, a.latitude, 0)}
        ellipse={{
          semiMajorAxis: TERRITORY_RADIUS,
          semiMinorAxis: TERRITORY_RADIUS,
          material: color,
          outline: true,
          outlineColor: outline,
          heightReference: HeightReference.CLAMP_TO_GROUND,
        }}
      />
    );
  });
}
