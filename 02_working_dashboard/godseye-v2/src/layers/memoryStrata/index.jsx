/**
 * MemoryStrata layer — represents the four memory layers as colored strata
 * rings around the globe. Per Phase 2 Cockpit Plan §4.3 Table 2:
 * derived from reference's weather strata pattern.
 *
 * Working (surface), Episodic (5km), Semantic (15km), Procedural (25km).
 */
import { Entity } from 'resium';
import { Cartesian3, Color } from 'cesium';
import { useMemoriesStore } from '../../store/memoriesStore';

const STRATUM = [
  { id: 'working',    alt: 1_000,    color: '#a78bfa' },
  { id: 'episodic',   alt: 5_000,    color: '#7c6fff' },
  { id: 'semantic',    alt: 15_000,   color: '#5b4bd6' },
  { id: 'procedural', alt: 25_000,   color: '#3f3299' },
];

export function MemoryStrataLayer() {
  const layers = useMemoriesStore((s) => s.layers);
  // ring the equator with 4 thin bands at the 4 altitudes
  return STRATUM.map((stratum) => {
    const layer = layers.find(l => l.id === stratum.id);
    const items = layer?.items || 0;
    const color = Color.fromCssColorString(stratum.color).withAlpha(0.15 + Math.min(0.4, items / 1000));
    // a circle at altitude stratum.alt around (0, 0)
    // represented as a single point stretched via outline
    return (
      <Entity
        key={stratum.id}
        position={Cartesian3.fromDegrees(0, 0, stratum.alt)}
        point={{
          pixelSize: 4,
          color,
          outlineColor: Color.fromCssColorString(stratum.color),
          outlineWidth: 1,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        }}
        label={{
          text: `${stratum.id} (${items})`,
          font: '11px JetBrains Mono, monospace',
          fillColor: Color.fromCssColorString(stratum.color),
          outlineColor: Color.fromCssColorString('#0a0e1a'),
          outlineWidth: 2,
          style: 2,
          pixelOffset: { x: 8, y: 0 },
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          showBackground: true,
          backgroundColor: Color.fromCssColorString('#11172a').withAlpha(0.7),
        }}
      />
    );
  });
}
