/**
 * SSE subscriber service — connects to the gods-eye bridge and pushes
 * normalized events into the Zustand stores.
 *
 * Per Phase 2 Cockpit Plan §4.2 / §5.4:
 *   EventSource('/api/gods-eye/events') → store actions.
 */
import { useAgentsStore } from '../store/agentsStore';
import { useRunsStore } from '../store/runsStore';
import { useToolsStore } from '../store/toolsStore';
import { usePacketsStore } from '../store/packetsStore';
import { useMemoriesStore } from '../store/memoriesStore';

let es = null;
let reconnectTimer = null;

const HANDLERS = {
  'agent.started':              (e) => useAgentsStore.getState().agentStarted(e),
  'agent.stopped':              (e) => useAgentsStore.getState().agentStopped(e),
  'agent.message.delta':        (e) => {
    useAgentsStore.getState().messageDelta(e);
    usePacketsStore.getState().plane(e);
  },
  'agent.tool.started':          (e) => {
    useAgentsStore.getState().toolStarted(e);
    useToolsStore.getState().start(e);
    usePacketsStore.getState().toolPulse(e);
  },
  'agent.tool.completed':        (e) => {
    useAgentsStore.getState().toolCompleted(e);
    useToolsStore.getState().complete(e);
  },
  'agent.subagent.start':        (e) => {
    useAgentsStore.getState().subagentStart(e);
    usePacketsStore.getState().spaceship(e, 'start');
  },
  'agent.subagent.complete':    (e) => {
    useAgentsStore.getState().subagentComplete(e);
    usePacketsStore.getState().spaceship(e, 'complete');
  },
  'agent.approval.request':      (e) => useAgentsStore.getState().approvalRequest(e),
  'agent.approval.responded':   (e) => useAgentsStore.getState().approvalResponded(e),
  'agent.skill.lifecycle':       (e) => useAgentsStore.getState().skillLifecycle(e),
  'agent.room.activity':         (e) => useAgentsStore.getState().roomActivity(e),
  'system.gateway_health':       (e) => useAgentsStore.getState().gatewayHealth(e),
  'system.cron_execution':       (e) => useAgentsStore.getState().cronExecution(e),
  'system.gateway_diagnostic':   (e) => useAgentsStore.getState().gatewayDiagnostic(e),
  'memory.mutation':             (e) => useMemoriesStore.getState().mutation(e),
};

export function startSSE() {
  if (es) return;
  try {
    es = new EventSource('/api/gods-eye/events');
    es.onopen = () => {
      console.log('[sse] connected to /api/gods-eye/events');
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };
    es.onerror = () => {
      console.warn('[sse] error; will reconnect in 3s');
      es = null;
      if (!reconnectTimer) {
        reconnectTimer = setTimeout(startSSE, 3000);
      }
    };
    es.onmessage = (msg) => {
      try {
        const evt = JSON.parse(msg.data);
        const h = HANDLERS[evt.event_type];
        if (h) h(evt);
      } catch (err) {
        console.warn('[sse] bad frame', err);
      }
    };
  } catch (e) {
    console.error('[sse] EventSource unsupported', e);
  }
}

export function stopSSE() {
  if (es) { es.close(); es = null; }
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
}
