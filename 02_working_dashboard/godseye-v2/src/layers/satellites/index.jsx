/**
 * Satellites layer — orbiting MCPs, skills, and cron jobs.
 * Per Phase 2 Cockpit Plan §4.3 Table 2: SatelliteLayer.
 *
 * Static orbital satellites at high altitude representing the active skills,
 * MCP servers, and cron jobs. Drawn from the governance data.
 */
import { Entity } from 'resium';
import { Cartesian3, Color } from 'cesium';

// Static inventory of MCPs/skills/cron (from dashboard/data/governance.json)
const SATELLITES = [
  { id: 'skill-cosmic',     label: 'skill:cosmic-arch',    lon: -75, lat: 30,  alt: 1500_000, color: '#00b4ff' },
  { id: 'skill-review',     label: 'skill:review-iface',   lon: 100, lat: 45,  alt: 1500_000, color: '#00b4ff' },
  { id: 'skill-bridge',    label: 'skill:live-bridge',    lon: 30,  lat: 0,   alt: 1500_000, color: '#00b4ff' },
  { id: 'skill-replay',     label: 'skill:replay-mode',    lon: -120,lat: -15, alt: 1500_000, color: '#00b4ff' },
  { id: 'mcp-filesystem',   label: 'mcp:filesystem',       lon: 60,  lat: 20,  alt: 1800_000, color: '#00ffd5' },
  { id: 'mcp-shell',        label: 'mcp:shell',            lon: -40, lat: 50,  alt: 1800_000, color: '#00ffd5' },
  { id: 'cron-guardian',    label: 'cron:guardian-scan',   lon: 130, lat: -30, alt: 1700_000, color: '#a78bfa' },
  { id: 'cron-memory',     label: 'cron:memory-compress', lon: -100,lat: 10,  alt: 1700_000, color: '#a78bfa' },
  { id: 'cron-canary',      label: 'cron:canary-deploy',   lon: 0,   lat: -50, alt: 1700_000, color: '#a78bfa' },
];

export function SatellitesLayer() {
  return SATELLITES.map((s) => {
    const position = Cartesian3.fromDegrees(s.lon, s.lat, s.alt);
    const color = Color.fromCssColorString(s.color);
    return (
      <Entity
        key={s.id}
        position={position}
        point={{
          pixelSize: 6,
          color,
          outlineColor: Color.WHITE,
          outlineWidth: 1,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        }}
        label={{
          text: s.label,
          font: '10px JetBrains Mono, monospace',
          fillColor: Color.WHITE,
          outlineColor: Color.fromCssColorString('#0a0e1a'),
          outlineWidth: 2,
          style: 2,
          pixelOffset: { x: 0, y: -12 },
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          showBackground: true,
          backgroundColor: Color.fromCssColorString('#161e36').withAlpha(0.85),
        }}
      />
    );
  });
}
