/**
 * Agents layer — orbiting agent nodes on a Cesium globe.
 *
 * Per Phase 2 Cockpit Plan §4.3 Table 2 + §5.4:
 *   - Altitude = confidence per cosmic metaphor §3.3 (high/mid/low bands)
 *   - Color coding per cosmic metaphor §3.2
 *   - Click agent node → right-rail Inspector panel
 *
 * This layer mirrors the reference godseye's AircraftLayer (orbit variant)
 * pattern: each entity is an agent marker that orbits at its altitude band.
 */
import { useEffect } from 'react';
import { Entity, PointGraphics, LabelGraphics, BillboardGraphics, Viewer } from 'resium';
import {
  Cartesian3, Color, VerticalOrigin, HeightReference, LabelStyle,
  DistanceDisplayCondition, Cartesian2,
} from 'cesium';
import { useAgentsStore } from '../../store/agentsStore';
import { usePacketsStore } from '../../store/packetsStore';

const STATE_COLOR = {
  idle:     Color.fromCssColorString('#e9edf4'),
  active:   Color.fromCssColorString('#72c69a'),
  pending:  Color.fromCssColorString('#f3c969'),
  error:    Color.fromCssColorString('#ff3333'),
};

function AgentNode({ agent, onSelect }) {
  // position from lat/lon/altitude
  const position = Cartesian3.fromDegrees(
    agent.longitude,
    agent.latitude,
    agent.altitude_km * 1000, // convert km → m
  );
  const color = STATE_COLOR[agent.state] || STATE_COLOR.idle;
  const pulse = agent.last_event_ts > (Date.now() / 1000 - 3) && agent.state === 'active';

  return (
    <>
      <Entity
        position={position}
        onClick={(e) => { e.preventDefault(); onSelect(agent.id); }}
        point={{
          pixelSize: pulse ? 16 : 11,
          color,
          outlineColor: Color.WHITE,
          outlineWidth: 1.5,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          scaleByDistance: new DistanceDisplayCondition(0, 1e8),
        }}
      />
      <Entity
        position={position}
        label={{
          text: agent.id,
          font: '12px Inter, sans-serif',
          fillColor: Color.WHITE,
          outlineColor: Color.fromCssColorString('#0a0e1a'),
          outlineWidth: 3,
          style: LabelStyle.FILL_AND_OUTLINE,
          verticalOrigin: VerticalOrigin.TOP,
          pixelOffset: new Cartesian2(0, -14),
          heightReference: HeightReference.NONE,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          showBackground: true,
          backgroundColor: Color.fromCssColorString('#11172a').withAlpha(0.85),
          backgroundPadding: new Cartesian2(6, 4),
        }}
      />
    </>
  );
}

export function AgentsLayer({ viewerRef }) {
  const agents = useAgentsStore((s) => s.agents);
  const select = useAgentsStore((s) => s.select);
  const planes = usePacketsStore((s) => s.planes);

  // Focus camera on the selected agent on click (rough)
  const handleSelect = (id) => {
    select(id);
    const a = agents.find(x => x.id === id);
    if (a && viewerRef.current) {
      viewerRef.current.camera.flyTo({
        destination: Cartesian3.fromDegrees(a.longitude, a.latitude, 800000),
        duration: 1.5,
      });
    }
  };

  return (
    <>
      {agents.map((a) => (
        <AgentNode key={a.id} agent={a} onSelect={handleSelect} />
      ))}
      {/* Pulse markers for recent planes (tool calls / message deltas) */}
      {planes.slice(0, 20).map((p) => {
        const a = agents.find(x => x.id === p.agent_id);
        if (!a) return null;
        const age = Date.now() / 1000 - p.ts;
        if (age > 5) return null;
        const position = Cartesian3.fromDegrees(a.longitude, a.latitude, a.altitude_km * 1000 + 200);
        const color = p.kind === 'tool' ? Color.fromCssColorString('#00b4ff') : Color.fromCssColorString('#ff69b4');
        const opacity = Math.max(0, 1 - age / 5);
        return (
          <Entity
            key={p.id}
            position={position}
            point={{
              pixelSize: 6 + (1 - age / 5) * 8,
              color: color.withAlpha(opacity),
              outlineColor: color,
              outlineWidth: 1,
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
            }}
          />
        );
      })}
    </>
  );
}
