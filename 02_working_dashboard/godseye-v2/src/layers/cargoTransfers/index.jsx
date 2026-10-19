/**
 * CargoTransfers layer — ships (heavy file/deliverable transfers).
 * Per Phase 2 Cockpit Plan §4.3 Table 2: MaritimeLayer.
 *
 * For each in-flight tool call that's not yet completed, draw a ship at the
 * agent's base position. Color: purple=memory, blue=tool.
 */
import { Entity } from 'resium';
import { Cartesian3, Color, HeightReference } from 'cesium';
import { useAgentsStore } from '../../store/agentsStore';
import { useToolsStore } from '../../store/toolsStore';

export function CargoTransfersLayer() {
  const agents = useAgentsStore((s) => s.agents);
  const tools = useToolsStore((s) => s.tools);

  // Only show tools that are currently in-flight (no completed_at)
  const inFlight = tools.filter(t => t.completed_at === null).slice(0, 30);

  return inFlight.map((t) => {
    const a = agents.find(x => x.id === t.agent_id);
    if (!a) return null;
    // ship hovers just above the surface near the agent's location
    const position = Cartesian3.fromDegrees(a.longitude, a.latitude - 0.5, 1000);
    const color = Color.fromCssColorString('#a78bfa');
    return (
      <Entity
        key={t.id}
        position={position}
        point={{
          pixelSize: 10,
          color,
          outlineColor: Color.WHITE,
          outlineWidth: 2,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        }}
        label={{
          text: t.tool,
          font: '10px JetBrains Mono, monospace',
          fillColor: Color.WHITE,
          outlineColor: Color.fromCssColorString('#0a0e1a'),
          outlineWidth: 2,
          style: 2, // FILL_AND_OUTLINE
          pixelOffset: { x: 0, y: -14 },
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          showBackground: true,
          backgroundColor: Color.fromCssColorString('#161e36').withAlpha(0.85),
        }}
      />
    );
  });
}
