/**
 * App — main shell for godseye-v2.
 *
 * Layout:
 *   ┌─────────────────────────────────────────────────┐
 *   │ Topbar (brand + status badges)                    │
 *   ├──────────────────────────────────┬──────────────┤
 *   │                                     │              │
 *   │  Cesium globe (3D Knowledge Globe) │  Inspector   │
 *   │  with all cosmic-metaphor layers    │  (right rail)│
 *   │                                     │              │
 *   └──────────────────────────────────┴──────────────┘
 */
import { useEffect, useRef } from 'react';
import { Viewer, Scene, Globe, Camera } from 'resium';
import {
  Color, Cartesian3, Ion, UrlTemplateImageryProvider,
  IonImageryProvider, createWorldTerrainAsync, Math as CesiumMath,
} from 'cesium';
import { startSSE, stopSSE } from './services/sseSubscriber';
import { AgentsLayer } from './layers/agents';
import { TaskPacketsLayer } from './layers/taskPackets';
import { CargoTransfersLayer } from './layers/cargoTransfers';
import { InterplanetaryLayer } from './layers/interplanetary';
import { SatellitesLayer } from './layers/satellites';
import { FactCheckLayer } from './layers/factCheck';
import { MemoryStrataLayer } from './layers/memoryStrata';
import { TerritoriesLayer } from './layers/territories';
import { GovernanceLayer } from './layers/governance';
import { Inspector } from './components/Inspector';
import { useAgentsStore } from './store/agentsStore';

// Honor CESIUM_ION_TOKEN env if set; otherwise Cesium will fall back to the
// default Bing imagery (may show a "no token" overlay until set).
if (typeof window !== 'undefined' && window.CESIUM_ION_TOKEN) {
  Ion.defaultAccessToken = window.CESIUM_ION_TOKEN;
}

function StatusBadge({ kind, children }) {
  const color = {
    idle: '#4a5475',
    live: '#00ffd5',
    warn: '#ff6f3d',
    ok:   '#72c69a',
  }[kind] || '#4a5475';
  return (
    <span
      className="px-2 py-0.5 rounded-full text-[11px] font-mono"
      style={{ color, border: `1px solid ${color}`, background: 'transparent' }}
    >
      {children}
    </span>
  );
}

export default function App() {
  const viewerRef = useRef(null);
  const agentCount = useAgentsStore((s) => s.agents.length);
  const activeCount = useAgentsStore((s) => s.agents.filter(a => a.state === 'active').length);

  useEffect(() => {
    startSSE();
    return () => stopSSE();
  }, []);

  return (
    <div className="h-screen flex flex-col">
      <header className="flex items-center justify-between px-5 py-3 border-b border-border bg-panel">
        <div className="flex items-baseline gap-3">
          <span className="text-2xl text-infra" style={{ textShadow: '0 0 8px #00ffd5' }}>◉</span>
          <span className="text-lg font-bold tracking-wide">Godseye v2</span>
          <span className="text-xs text-text-dim uppercase tracking-widest">
            Phase 2 · 3D Knowledge Globe
          </span>
        </div>
        <div className="flex gap-2 items-center">
          <StatusBadge kind="ok">agents: {agentCount}</StatusBadge>
          <StatusBadge kind="live">active: {activeCount}</StatusBadge>
          <StatusBadge kind="idle">SSE: /api/gods-eye/events</StatusBadge>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        <main className="flex-1 relative bg-space">
          <Viewer
            ref={(v) => { viewerRef.current = v; }}
            full
            sceneMode={3}
            timeline={false}
            animation={false}
            infoBox={false}
            selectionIndicator={false}
            navigationHelpButton={false}
            homeButton={false}
            sceneModePicker={false}
            baseLayerPicker={false}
            geocoder={false}
            fullscreenButton={false}
            imageryProvider={new UrlTemplateImageryProvider({
              url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
              maximumLevel: 19,
            })}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          >
            <Globe
              enableLighting
              showGroundAtmosphere
              baseColor={Color.fromCssColorString('#0a0e1a')}
              atmosphereLightIntensity={2.0}
            />
            <Camera
              position={Cartesian3.fromDegrees(-75, 35, 25_000_000)}
              heading={CesiumMath.toRadians(0)}
              pitch={CesiumMath.toRadians(-90)}
              roll={0}
            />

            {/* All cosmic-metaphor layers */}
            <GovernanceLayer />
            <TerritoriesLayer />
            <MemoryStrataLayer />
            <SatellitesLayer />
            <CargoTransfersLayer />
            <InterplanetaryLayer />
            <FactCheckLayer />
            <TaskPacketsLayer />
            <AgentsLayer viewerRef={viewerRef} />
          </Viewer>

          {/* Layer legend overlay */}
          <div className="absolute top-3 left-3 bg-panel/80 backdrop-blur p-2 rounded border border-border text-[11px] font-mono z-10">
            <div className="text-text-faint uppercase tracking-wider mb-1">Cosmic Metaphor</div>
            <div className="flex flex-col gap-0.5">
              <span><span style={{ color: '#72c69a' }}>●</span> verified/active agent</span>
              <span><span style={{ color: '#e9edf4' }}>●</span> idle agent</span>
              <span><span style={{ color: '#ff3333' }}>●</span> error / correction</span>
              <span><span style={{ color: '#00b4ff' }}>●</span> tool call (plane)</span>
              <span><span style={{ color: '#ff69b4' }}>●</span> message delta</span>
              <span><span style={{ color: '#e2b45d' }}>━</span> subagent dispatch</span>
              <span><span style={{ color: '#00ffd5' }}>●</span> MCP / infra satellite</span>
              <span><span style={{ color: '#a78bfa' }}>●</span> memory / cron</span>
            </div>
          </div>
        </main>

        <Inspector />
      </div>
    </div>
  );
}
