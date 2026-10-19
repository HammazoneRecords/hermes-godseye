/**
 * FactCheck layer — seismic pulses representing verification events.
 * Per Phase 2 Cockpit Plan §4.3 Table 2: SeismicLayer.
 *
 * When an agent's approval is requested, emit a brief expanding ring on the
 * ground at the agent's location. Color: green=verified, red=correction.
 */
import { Entity, EllipseGraphics } from 'resium';
import { Cartesian3, Color, EllipseOutlineGeometry, HeightReference } from 'cesium';
import { useAgentsStore } from '../../store/agentsStore';
import { usePacketsStore } from '../../store/packetsStore';

export function FactCheckLayer() {
  const agents = useAgentsStore((s) => s.agents);
  // re-use packets store for approval pulses (lightweight)
  // Approval pulses are short-lived seismic rings
  const now = Date.now() / 1000;

  // Construct synthetic pulses from agents that have high approval counts
  // (in real deployment, an explicit approval pulse store would be used)
  return agents
    .filter(a => a.approvals > 0 && now - a.last_event_ts < 8)
    .map((a) => {
      const age = now - a.last_event_ts;
      const semi = 50000 + age * 50000;
      const color = Color.fromCssColorString('#ff3333');
      return (
        <Entity
          key={`fc-${a.id}-${a.last_event_ts}`}
          position={Cartesian3.fromDegrees(a.longitude, a.latitude, 0)}
          ellipse={{
            semiMajorAxis: semi,
            semiMinorAxis: semi,
            material: color.withAlpha(Math.max(0, 0.6 - age / 8)),
            outline: true,
            outlineColor: color,
            heightReference: HeightReference.CLAMP_TO_GROUND,
          }}
        />
      );
    });
}
