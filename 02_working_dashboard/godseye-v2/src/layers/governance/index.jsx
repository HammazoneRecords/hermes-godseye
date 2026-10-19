/**
 * Governance layer — Jhanos gate boundaries (airspace representation).
 * Per Phase 2 Cockpit Plan §4.3 Table 2: AirspaceLayer.
 *
 * Draws a faint perimeter ring around the globe to represent the Jhanos
 * gate boundary (the regulatory boundary through which Pluto→Earth
 * transfers must pass).
 */
import { Entity } from 'resium';
import { Cartesian3, Color, HeightReference } from 'cesium';

// A large faint perimeter ring around (0, 0)
export function GovernanceLayer() {
  return (
    <Entity
      position={Cartesian3.fromDegrees(0, 0, 0)}
      ellipse={{
        semiMajorAxis: 5_000_000,
        semiMinorAxis: 5_000_000,
        material: Color.fromCssColorString('#00ffd5').withAlpha(0.04),
        outline: true,
        outlineColor: Color.fromCssColorString('#00ffd5').withAlpha(0.4),
        heightReference: HeightReference.CLAMP_TO_GROUND,
      }}
      label={{
        text: 'JHANOS GATE — no Pluto→Earth transfer without gate history',
        font: '11px JetBrains Mono, monospace',
        fillColor: Color.fromCssColorString('#00ffd5').withAlpha(0.7),
        outlineColor: Color.fromCssColorString('#0a0e1a'),
        outlineWidth: 2,
        style: 2,
        pixelOffset: { x: 0, y: -14 },
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        showBackground: true,
        backgroundColor: Color.fromCssColorString('#11172a').withAlpha(0.7),
      }}
    />
  );
}
