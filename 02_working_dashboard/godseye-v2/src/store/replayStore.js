/**
 * Replay store — Phase 3 Replay Mode.
 *
 * Tracks:
 *   - sessions[]            list of available trajectory sessions (from /trajectory?summary=1)
 *   - selected_session_id   current session being replayed
 *   - events[]              events for the selected session (from /trajectory?session_id=)
 *   - current_time          scrub position (epoch seconds)
 *   - is_playing             play/pause state
 *   - speed                 playback speed (0.5, 1, 2, 4)
 *   - mode                   'live' | 'replay'
 *
 * Boundary compliance:
 *   - The bridge already strips message bodies server-side (in _strip_sharegpt_bodies).
 *   - This store holds only the metadata returned by the endpoint.
 *   - No body text ever enters the React app.
 */
import { create } from 'zustand';

const DEFAULT_STATE = {
  sessions: [],
  selected_session_id: null,
  events: [],
  current_time: 0,
  is_playing: false,
  speed: 1.0,
  mode: 'live',         // 'live' = normal SSE consumption, 'replay' = scrubbing past session
  loading: false,
  error: null,
};

export const useReplayStore = create((set, get) => ({
  ...DEFAULT_STATE,

  setSessions: (sessions) => set({ sessions }),

  selectSession: (session_id) => set({
    selected_session_id: session_id,
    mode: session_id ? 'replay' : 'live',
  }),

  setEvents: (events) => set({
    events,
    current_time: events.length > 0 ? events[0].ts : 0,
  }),

  setCurrentTime: (ts) => set({ current_time: ts }),

  play: () => set({ is_playing: true }),
  pause: () => set({ is_playing: false }),

  setSpeed: (speed) => set({ speed }),

  exitReplay: () => set({
    ...DEFAULT_STATE,
    mode: 'live',
  }),

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  /** Fetch session list from bridge. */
  fetchSessions: async () => {
    set({ loading: true, error: null });
    try {
      const r = await fetch('/api/gods-eye/trajectory?summary=1');
      if (!r.ok) throw new Error(`health ${r.status}`);
      const data = await r.json();
      set({ sessions: data.sessions || [], loading: false });
      return data.sessions || [];
    } catch (e) {
      set({ loading: false, error: String(e) });
      return [];
    }
  },

  /** Fetch events for a specific session. */
  fetchSessionEvents: async (session_id) => {
    if (!session_id) return [];
    set({ loading: true, error: null });
    try {
      const r = await fetch(`/api/gods-eye/trajectory?session_id=${encodeURIComponent(session_id)}`);
      if (!r.ok) throw new Error(`session fetch ${r.status}`);
      const data = await r.json();
      const events = data.events || [];
      set({
        events,
        current_time: events.length > 0 ? events[0].ts : 0,
        loading: false,
      });
      return events;
    } catch (e) {
      set({ loading: false, error: String(e) });
      return [];
    }
  },

  /** Events at or before current_time — used by the layers to render state
   *  as of the scrub position. */
  eventsAtCurrentTime: () => {
    const { events, current_time } = get();
    return events.filter(e => e.ts <= current_time);
  },

  /** The event exactly at current_time (or the most recent one before it). */
  currentEvent: () => {
    const { events, current_time } = get();
    if (events.length === 0) return null;
    let cur = events[0];
    for (const e of events) {
      if (e.ts <= current_time) cur = e; else break;
    }
    return cur;
  },
}));
