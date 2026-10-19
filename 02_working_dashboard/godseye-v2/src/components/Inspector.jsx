/**
 * Inspector — right-rail cockpit panel.
 * Per Phase 2 Cockpit Plan §5.4: click agent node → right-rail shows agent
 * context (model, current task, pending claims). Mirrors the reference
 * godseye's Inspector pattern.
 */
import { useAgentsStore } from '../store/agentsStore';
import { useToolsStore } from '../store/toolsStore';
import { usePacketsStore } from '../store/packetsStore';

const ALTITUDE_BAND_DESCRIPTION = {
  high: 'High orbit (>50km) — TRISMIGISTUS/GODSEYE/FACTCHECK tier',
  mid:  'Mid orbit (20-50km) — LIBRARIAN/CURATOR/MAIL/CANARY tier',
  low:  'Low orbit (<20km) — SPINUP/sandbox tier',
};

function Row({ label, value, accent }) {
  return (
    <div className="flex justify-between py-1.5 text-xs">
      <span className="text-text-dim">{label}</span>
      <span style={{ color: accent || '#e9edf4' }} className="font-mono">{value}</span>
    </div>
  );
}

export function Inspector() {
  const selectedId = useAgentsStore((s) => s.selectedAgentId);
  const agents = useAgentsStore((s) => s.agents);
  const tools = useToolsStore((s) => s.tools);
  const planes = usePacketsStore((s) => s.planes);
  const select = useAgentsStore((s) => s.select);

  if (!selectedId) {
    return (
      <aside className="w-[340px] border-l border-border bg-panel-2 p-4 overflow-y-auto">
        <h3 className="text-sm font-semibold text-text mb-2">Inspector</h3>
        <p className="text-xs text-text-dim">Click an agent node on the globe to inspect its runtime state.</p>
        <div className="mt-4 text-[11px] text-text-faint font-mono leading-relaxed">
          <p>Layers loaded:</p>
          <ul className="mt-1 space-y-0.5">
            <li>• agents (orbiting nodes)</li>
            <li>• taskPackets (planes)</li>
            <li>• cargoTransfers (ships)</li>
            <li>• interplanetary (spaceships)</li>
            <li>• satellites (MCP/skill/cron)</li>
            <li>• factCheck (seismic)</li>
            <li>• memoryStrata</li>
            <li>• territories</li>
            <li>• governance (Jhanos gate)</li>
          </ul>
        </div>
      </aside>
    );
  }

  const agent = agents.find(a => a.id === selectedId);
  if (!agent) return null;

  const agentTools = tools.filter(t => t.agent_id === selectedId).slice(0, 8);
  const agentEvents = planes.filter(p => p.agent_id === selectedId).slice(0, 8);

  return (
    <aside className="w-[340px] border-l border-border bg-panel-2 p-4 overflow-y-auto">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="inline-block w-3 h-3 rounded-full"
              style={{ background: agent.color }}
            />
            <h3 className="text-base font-semibold text-text">{agent.id}</h3>
          </div>
          <p className="text-xs text-text-dim mt-0.5">{agent.name} · {agent.role}</p>
        </div>
        <button
          onClick={() => select(null)}
          className="text-text-faint hover:text-text text-xs"
        >close ✕</button>
      </div>

      <div className="space-y-1 mb-4 border-b border-border pb-3">
        <Row label="state" value={agent.state} accent={agent.state === 'active' ? '#72c69a' : '#8a93ad'} />
        <Row label="altitude band" value={agent.altitude_band} />
        <Row label="altitude (km)" value={agent.altitude_km.toFixed(1)} />
        <Row label="position" value={`${agent.latitude.toFixed(1)}°, ${agent.longitude.toFixed(1)}°`} />
        <Row label="model" value={agent.model || '—'} />
        <Row label="current tool" value={agent.current_tool || '—'} accent={agent.current_tool ? '#00b4ff' : undefined} />
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-panel-3 rounded p-2">
          <div className="text-[10px] text-text-faint uppercase tracking-wider">messages</div>
          <div className="text-xl text-traffic font-mono">{agent.messages}</div>
        </div>
        <div className="bg-panel-3 rounded p-2">
          <div className="text-[10px] text-text-faint uppercase tracking-wider">tools</div>
          <div className="text-xl text-tool font-mono">{agent.tools}</div>
        </div>
        <div className="bg-panel-3 rounded p-2">
          <div className="text-[10px] text-text-faint uppercase tracking-wider">subagents</div>
          <div className="text-xl text-approval font-mono">{agent.subagents}</div>
        </div>
        <div className="bg-panel-3 rounded p-2">
          <div className="text-[10px] text-text-faint uppercase tracking-wider">approvals</div>
          <div className="text-xl text-correction font-mono">{agent.approvals}</div>
        </div>
      </div>

      <div className="mb-3">
        <div className="text-[10px] text-text-faint uppercase tracking-wider mb-1">
          Altitude band
        </div>
        <p className="text-[11px] text-text-dim leading-relaxed">
          {ALTITUDE_BAND_DESCRIPTION[agent.altitude_band]}
        </p>
      </div>

      <div className="mb-3">
        <div className="text-[10px] text-text-faint uppercase tracking-wider mb-1">
          Recent tool calls
        </div>
        {agentTools.length === 0 ? (
          <p className="text-[11px] text-text-faint">— none yet —</p>
        ) : (
          <ul className="space-y-1 text-[11px] font-mono">
            {agentTools.map((t) => (
              <li key={t.id} className="flex justify-between">
                <span className="text-tool">{t.tool}</span>
                <span className={t.ok === false ? 'text-correction' : 'text-text-dim'}>
                  {t.completed_at ? (t.ok ? '✓' : '✗') : '…'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <div className="text-[10px] text-text-faint uppercase tracking-wider mb-1">
          Recent events
        </div>
        {agentEvents.length === 0 ? (
          <p className="text-[11px] text-text-faint">— no events —</p>
        ) : (
          <ul className="space-y-0.5 text-[11px] font-mono">
            {agentEvents.map((p) => (
              <li key={p.id} className="flex justify-between">
                <span style={{ color: p.kind === 'tool' ? '#00b4ff' : '#ff69b4' }}>{p.kind}</span>
                <span className="text-text-faint">{new Date(p.ts * 1000).toLocaleTimeString()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
