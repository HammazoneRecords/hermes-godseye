/**
 * Timeline component — Phase 3 Replay Mode.
 *
 * Bottom-rail scrub UI. When a session is selected, this becomes a slider
 * with play/pause/step controls. When in live mode (no session selected),
 * it shows the session picker dropdown + an "enter replay" affordance.
 *
 * Per Phase 3 acceptance: user can scrub a timeline and see agent/tool/
 * memory events populate the globe layers.
 */
import { useEffect, useRef, useState } from 'react';
import { useReplayStore } from '../store/replayStore';
import { useAgentsStore } from '../store/agentsStore';

function fmtTime(ts) {
  if (!ts) return '--:--:--';
  const d = new Date(ts * 1000);
  return d.toTimeString().slice(0, 8);
}

export function Timeline() {
  const sessions = useReplayStore((s) => s.sessions);
  const selected = useReplayStore((s) => s.selected_session_id);
  const events = useReplayStore((s) => s.events);
  const currentTime = useReplayStore((s) => s.current_time);
  const isPlaying = useReplayStore((s) => s.is_playing);
  const speed = useReplayStore((s) => s.speed);
  const mode = useReplayStore((s) => s.mode);
  const loading = useReplayStore((s) => s.loading);

  const fetchSessions = useReplayStore((s) => s.fetchSessions);
  const selectSession = useReplayStore((s) => s.selectSession);
  const fetchSessionEvents = useReplayStore((s) => s.fetchSessionEvents);
  const setCurrentTime = useReplayStore((s) => s.setCurrentTime);
  const play = useReplayStore((s) => s.play);
  const pause = useReplayStore((s) => s.pause);
  const setSpeed = useReplayStore((s) => s.setSpeed);
  const exitReplay = useReplayStore((s) => s.exitReplay);

  const [pickerOpen, setPickerOpen] = useState(false);
  const playTimer = useRef(null);

  // Load session list on mount
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // When session is selected, fetch its events
  useEffect(() => {
    if (selected) fetchSessionEvents(selected);
  }, [selected, fetchSessionEvents]);

  // Playback timer — advance current_time at the chosen speed
  useEffect(() => {
    if (!isPlaying || events.length === 0) {
      if (playTimer.current) clearInterval(playTimer.current);
      return;
    }
    const first = events[0].ts;
    const last = events[events.length - 1].ts;
    const span = Math.max(1, last - first);
    // Advance 5% of total span per second (so a 10-turn session ~20s long completes in ~20s at 1x)
    const step = span * 0.05 * speed;
    playTimer.current = setInterval(() => {
      const next = currentTime + step;
      if (next >= last) {
        pause();
        setCurrentTime(last);
      } else {
        setCurrentTime(next);
      }
    }, 200);
    return () => playTimer.current && clearInterval(playTimer.current);
  }, [isPlaying, events, currentTime, speed, pause, setCurrentTime]);

  const handleScrub = (e) => {
    pause();
    setCurrentTime(parseFloat(e.target.value));
  };

  const handleSelect = (sid) => {
    selectSession(sid);
    setPickerOpen(false);
  };

  // Live mode — show session picker
  if (mode === 'live') {
    return (
      <div className="absolute bottom-3 left-3 right-3 bg-panel-2/95 backdrop-blur border border-border rounded p-3 z-10 font-mono text-xs">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-text-faint uppercase tracking-wider">Live Mode</span>
            <button
              onClick={() => setPickerOpen(!pickerOpen)}
              className="px-2 py-1 bg-panel-3 border border-border rounded hover:bg-panel text-text"
            >
              {pickerOpen ? '◀ Hide sessions' : '▶ Show sessions'} ({sessions.length})
            </button>
          </div>
          <span className="text-text-faint">No session selected — globe shows live SSE events</span>
        </div>
        {pickerOpen && (
          <div className="mt-2 max-h-48 overflow-y-auto">
            {sessions.length === 0 ? (
              <div className="text-text-faint py-2">{loading ? 'Loading…' : 'No trajectory sessions found.'}</div>
            ) : (
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="text-text-faint uppercase">
                    <th className="text-left py-1 px-1">id</th>
                    <th className="text-left py-1 px-1">agent</th>
                    <th className="text-right py-1 px-1">turns</th>
                    <th className="text-right py-1 px-1">started</th>
                    <th className="text-left py-1 px-1">tags</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s) => (
                    <tr
                      key={s.id}
                      onClick={() => handleSelect(s.id)}
                      className="cursor-pointer hover:bg-panel-3 border-t border-border"
                    >
                      <td className="py-1 px-1 text-infra">{s.id}</td>
                      <td className="py-1 px-1">{s.agent_id}</td>
                      <td className="py-1 px-1 text-right">{s.turn_count}</td>
                      <td className="py-1 px-1 text-right text-text-faint">{fmtTime(s.started_at)}</td>
                      <td className="py-1 px-1 text-text-faint">{(s.tags || []).slice(0, 3).join(', ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    );
  }

  // Replay mode — show scrub UI
  if (events.length === 0) {
    return (
      <div className="absolute bottom-3 left-3 right-3 bg-panel-2/95 backdrop-blur border border-border rounded p-3 z-10 font-mono text-xs">
        <div className="flex items-center justify-between">
          <span className="text-text-faint">Loading session {selected}…</span>
          <button onClick={exitReplay} className="px-2 py-1 bg-panel-3 border border-border rounded">✕ exit replay</button>
        </div>
      </div>
    );
  }

  const first = events[0].ts;
  const last = events[events.length - 1].ts;
  const currentEvent = [...events].reverse().find(e => e.ts <= currentTime) || events[0];
  const turnIdx = currentEvent ? currentEvent.turn : 0;
  const totalTurns = events.length;

  return (
    <div className="absolute bottom-3 left-3 right-3 bg-panel-2/95 backdrop-blur border border-border rounded p-3 z-10 font-mono text-xs">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-3">
          <button onClick={exitReplay} className="px-2 py-1 bg-panel-3 border border-border rounded hover:bg-panel">◀ Live</button>
          <span className="text-infra">REPLAY</span>
          <span className="text-text">{selected}</span>
          <span className="text-text-faint">·</span>
          <span className="text-text-faint">{totalTurns} turns</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentTime(Math.max(first, currentTime - 2))}
            className="px-2 py-1 bg-panel-3 border border-border rounded hover:bg-panel"
          >◀ step</button>
          {isPlaying ? (
            <button onClick={pause} className="px-3 py-1 bg-warning text-space border border-warning rounded font-bold">⏸ pause</button>
          ) : (
            <button onClick={play} className="px-3 py-1 bg-infra text-space border border-infra rounded font-bold">▶ play</button>
          )}
          <button
            onClick={() => setCurrentTime(Math.min(last, currentTime + 2))}
            className="px-2 py-1 bg-panel-3 border border-border rounded hover:bg-panel"
          >step ▶</button>
          <select
            value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
            className="bg-panel-3 border border-border rounded px-2 py-1 text-text"
          >
            <option value={0.5}>0.5x</option>
            <option value={1}>1x</option>
            <option value={2}>2x</option>
            <option value={4}>4x</option>
          </select>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-text-faint w-16">{fmtTime(first)}</span>
        <input
          type="range"
          min={first}
          max={last}
          step={(last - first) / 1000}
          value={currentTime}
          onChange={handleScrub}
          className="flex-1"
          style={{ accentColor: '#00ffd5' }}
        />
        <span className="text-text-faint w-16 text-right">{fmtTime(last)}</span>
      </div>
      <div className="flex items-center justify-between mt-2 text-[10px] text-text-faint">
        <span>current: T{turnIdx}/{totalTurns - 1} · {fmtTime(currentTime)}</span>
        <span>
          {currentEvent ? `${currentEvent.role}${currentEvent.tool ? ' · ' + currentEvent.tool : ''}${currentEvent.decision ? ' · ' + currentEvent.decision : ''}` : '—'}
        </span>
      </div>
    </div>
  );
}
