/* Godseye Agent Dashboard — Phase 1 App JS */
(function() {
  'use strict';

  // ── State ──────────────────────────────────────────────────
  const state = {
    dashboard: null,
    agents: null,
    selectedAgent: null,
    filters: { core: true, active: true, memory: true, gates: true, writers: true },
    layerVisibility: { agents: true, flow: true }
  };

  // ── Color map ──────────────────────────────────────────────
  const COLORS = {
    active: '#72c69a', pending: '#f3c969', error: '#ff3333',
    tool: '#00b4ff', approval: '#e2b45d', memory: '#a78bfa',
    infra: '#00ffd5', traffic: '#ff69b4', idle: '#9aa6b7', warn: '#ff6f3d'
  };

  // Zone colors for boundary visualization
  const zoneColors = {
    earth: '#72c69a', pluto: '#a78bfa', moon: '#f3c969', jhanos_gates: '#00b4ff'
  };

  const QUEUE_TYPE = {
    factcheck: { symbol: 'fact-check', cls: 'queue-factcheck' },
    memory: { symbol: 'memory', cls: 'queue-memory' },
    patent: { symbol: 'patent', cls: 'queue-patent' },
    chat: { symbol: 'chat', cls: 'queue-chat' }
  };

  // ── Utility ────────────────────────────────────────────────
  function $(id) { return document.getElementById(id); }

  function esc(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function classifyAgent(a) {
    const name = a.name.toUpperCase();
    const role = (a.role || '').toLowerCase();
    if (name.startsWith('JHANOS')) return 'gates';
    if (name === 'GODSEYE' || name === 'FACTCHECK' || name === 'TCP' || name === 'ONU') return 'core';
    if (role.includes('memory') || role.includes('curator')) return 'memory';
    if (role.includes('writer') || role.includes('scribe')) return 'writers';
    return 'active';
  }

  function determineStatus(a) {
    const t = (a.task_status_excerpt || '').toLowerCase();
    const s = (a.scope_excerpt || '').toLowerCase();
    if (t.includes('error') || s.includes('error')) return 'error';
    if (t.includes('pending') || t.includes('awaiting')) return 'pending';
    if (t.includes('not started') || t.includes('none') || t.includes('idle')) return 'idle';
    if (classifyAgent(a) === 'memory') return 'memory';
    return 'active';
  }

  function altitudeCategory(a) {
    const c = classifyAgent(a);
    if (c === 'core') return 'high';
    if (c === 'gates') return 'mid';
    return 'low';
  }

  // ── Data loading ───────────────────────────────────────────
  async function loadJSON(path) {
    const r = await fetch(path);
    if (!r.ok) throw new Error('Failed: ' + path);
    return r.json();
  }

  async function init() {
    try {
      state.dashboard = await loadJSON('data/dashboard.json');
    } catch (e) {
      state.dashboard = {};
    }
    try {
      state.agents = await loadJSON('data/agents.json');
    } catch (e) {
      state.agents = { agent_count: 0, agents: [] };
    }
    try {
      state.governance = await loadJSON('data/governance.json');
    } catch (e) {
      state.governance = {};
    }
    renderDashboardBar();
    renderAgentGrid();
    renderAgentList();
    renderQueuePanel();
    renderMemoryPanel();
    renderFlowView();
    renderFeedbackPanel();
    renderGovernanceOverview();
    renderGovernanceBoundaries();
    renderGovernanceConstraints();
    renderGovernanceSkills();
    renderGovernanceAgents();
    $('status-left').textContent = 'Loaded ' +
      (state.agents.agent_count || 0) + ' agents · ' +
      new Date().toLocaleTimeString();
  }

  // ── Metadata bar ───────────────────────────────────────────
  function renderDashboardBar() {
    const d = state.dashboard;
    if (!d) return;
    $('ge-concepts').textContent = d.knowledge ? d.knowledge.formal_concepts : '-';
    $('ge-agents').textContent = d.agents ? d.agents.component_agents : '-';
    $('ge-queues').textContent = (d.queues || []).reduce((s, q) => s + (q.count || 0), 0);
    $('ge-memory').textContent = d.memory ? d.memory.layers : '-';
    $('ge-sources').textContent = d.knowledge ? d.knowledge.chat_sources_manifested : '-';
    $('ge-verified').textContent = d.agents ? d.agents.runtime_verified : false;
  }

  // ── Agent list (left panel) ────────────────────────────────
  function renderAgentList() {
    const el = $('agent-list');
    if (!state.agents || !state.agents.agents) {
      el.innerHTML = '<div style="padding:12px;color:#666;">No agents found.</div>';
      return;
    }
    el.innerHTML = state.agents.agents.map(a => {
      const cat = classifyAgent(a);
      if (!state.filters[cat]) return '';
      const status = determineStatus(a);
      return '<div class="agent-list-item" data-agent="' + esc(a.name) +
             '" onclick="selectAgent(\'' + esc(a.name) + '\')">' +
             '<span class="agent-status status-' + status + '"></span>' +
             '<span class="agent-list-name">' + esc(a.name) + '</span>' +
             '<span class="agent-list-role">' + esc(a.role || 'unknown') + '</span>' +
             '</div>';
    }).join('');
  }

  // ── Agent grid (center panel) ──────────────────────────────
  function renderAgentGrid() {
    const el = $('agent-grid');
    if (!state.agents || !state.agents.agents) {
      el.innerHTML = '<div class="empty-state">No agents loaded.</div>';
      return;
    }
    const agents = state.agents.agents.filter(a => state.filters[classifyAgent(a)]);
    if (agents.length === 0) {
      el.innerHTML = '<div class="empty-state">No agents match filters.</div>';
      return;
    }
    el.innerHTML = agents.map(a => agentCardHTML(a)).join('');
  }

  function agentCardHTML(a) {
    const status = determineStatus(a);
    const cat = classifyAgent(a);
    const alt = altitudeCategory(a);
    const altLabel = alt === 'high' ? 'HIGH' : alt === 'mid' ? 'MID' : 'LOW';
    const isSel = state.selectedAgent === a.name ? ' selected' : '';
    const task = a.current_task || 'No active task';
    const lastAct = a.last_activity ? new Date(a.last_activity).toLocaleString() : 'Unknown';
    const queues = (state.dashboard.queues || []).filter(q => q.count > 0);
    const model = a.model || 'Unknown model';
    const role = a.role || 'unknown';

    return '<article class="agent-card' + isSel + '" data-agent="' + esc(a.name) +
           '" onclick="selectAgent(\'' + esc(a.name) + '\')">' +
           '<span class="agent-altitude">' + altLabel + '</span>' +
           '<div class="agent-card-header">' +
           '<span class="agent-name">' + esc(a.name) + '</span>' +
           '<span class="agent-status status-' + status + '"></span>' +
           '</div>' +
           '<div class="agent-role">' + esc(role) + ' · ' + esc(cat) + '</div>' +
           '<div class="agent-field"><strong>Model:</strong> ' + esc(model) + '</div>' +
           '<div class="agent-task" title="' + esc(task) + '">' + esc(task) + '</div>' +
           '<div class="agent-field" style="margin-top:6px;"><strong>Last:</strong> ' + esc(lastAct) + '</div>' +
           (queues.length ? '<div class="agent-queues">' +
             queues.map(q => { const t = QUEUE_TYPE[q.name.toLowerCase().split(' ')[0]] || {}; return '<span class="queue-chip ' + (t.cls || '') + '">' + esc(q.name) + ': ' + q.count + '</span>'; }).join('') +
             '</div>' : '') +
           '</article>';
  }

  // ── Inspector (right panel) ────────────────────────────────
  function selectAgent(name) {
    state.selectedAgent = name;
    const a = (state.agents.agents || []).find(x => x.name === name);
    if (!a) { clearInspector(); return; }
    document.querySelectorAll('.agent-card').forEach(c => c.classList.toggle('selected', c.dataset.agent === name));
    document.querySelectorAll('.agent-list-item').forEach(c => c.classList.toggle('active', c.dataset.agent === name));

    const status = determineStatus(a);
    const cat = classifyAgent(a);
    const alt = altitudeCategory(a);
    const tp = (a.task_status_excerpt || '').split('\n').slice(0, 20).join('<br>');
    const d = state.dashboard;
    const facts = d.knowledge ? d.knowledge.fact_check_packets : 0;

    $('inspector-body').innerHTML =
      '<div class="detail-section"><h4>Identity</h4>' +
      '<div class="detail-grid">' +
      '<div class="detail-field"><span class="key">Name</span><span class="val">' + esc(a.name) + '</span></div>' +
      '<div class="detail-field"><span class="key">Role</span><span class="val">' + esc(a.role || 'Unknown') + '</span></div>' +
      '<div class="detail-field"><span class="key">Model</span><span class="val">' + esc(a.model || 'Unknown') + '</span></div>' +
      '<div class="detail-field"><span class="key">Status</span><span class="val">' + esc(status) + '</span></div>' +
      '<div class="detail-field"><span class="key">Category</span><span class="val">' + esc(cat) + '</span></div>' +
      '<div class="detail-field"><span class="key">Altitude</span><span class="val">' + esc(alt) + '</span></div>' +
      '<div class="detail-field"><span class="key">Last activity</span><span class="val">' + esc(a.last_activity || 'Unknown') + '</span></div>' +
      '</div></div>' +
      '<div class="detail-section"><h4>Task Status</h4>' +
      '<div style="font-size:9pt;color:#ccc;background:#0a0a14;padding:8px;border-radius:4px;border-left:2px solid var(--accent);">' + esc(tp) + '</div>' +
      '</div>' +
      '<div class="detail-section"><h4>Scope Excerpt</h4>' +
      '<div style="font-size:8pt;color:#888;background:#0a0a14;padding:8px;border-radius:4px;max-height:120px;overflow-y:auto;border-left:2px solid var(--blue);">' +
      esc(a.scope_excerpt || 'No scope available') + '</div>' +
      '</div>' +
      (a.manifest ? '<div class="detail-section"><h4>Manifest</h4>' +
      '<pre style="font-size:7pt;color:#666;background:#0a0a14;padding:6px;border-radius:4px;max-height:100px;overflow:auto;">' +
      esc(JSON.stringify(a.manifest, null, 2)) + '</pre></div>' : '') +
      '<div class="detail-section"><h4>Workspace</h4>' +
      '<div style="font-size:8pt;color:#666;word-break:break-all;">' + esc(a.path) + '</div></div>';
  }

  function clearInspector() {
    state.selectedAgent = null;
    $('inspector-body').innerHTML = '<div class="empty-state">Select an agent to inspect</div>';
    document.querySelectorAll('.agent-card').forEach(c => c.classList.remove('selected'));
    document.querySelectorAll('.agent-list-item').forEach(c => c.classList.remove('active'));
  }

  // ── Fact-check queue ───────────────────────────────────────
  function renderQueuePanel() {
    const el = $('queue-panel');
    const d = state.dashboard;
    if (!d || !d.queues || d.queues.length === 0) {
      el.innerHTML = '<div class="empty-state">No queue data available.</div>';
      return;
    }
    let html = '';
    d.queues.forEach(q => {
      html += '<div class="queue-item"><div class="queue-name"><span>' + esc(q.name) +
              '</span><span class="queue-count">' + q.count + '</span></div>' +
              '<div class="queue-state">' + esc(q.state) + '</div></div>';
    });
    if (d.knowledge && d.knowledge.fact_check_packets > 0) {
      html += '<div style="margin-top:14px;padding:10px;background:#1a1a2e;border-radius:6px;font-size:9pt;">' +
              '<strong style="color:var(--accent);">Total claims:</strong> ' + d.knowledge.fact_check_packets +
              '<br><strong style="color:var(--good);">Verified:</strong> ' + (d.knowledge.verified_claims || 0) +
              '<br><strong style="color:var(--warn);">Pending review:</strong> ' + (d.knowledge.pending_claims || 0) +
              '<br><strong style="color:var(--bad);">Rejected:</strong> ' + (d.knowledge.rejected_claims || 0) +
              '</div>';
    }
    el.innerHTML = html;
  }

  // ── Memory layers ──────────────────────────────────────────
  function renderMemoryPanel() {
    const el = $('memory-panel');
    const d = state.dashboard;
    if (!d || !d.memory) {
      el.innerHTML = '<div class="empty-state">No memory data.</div>';
      return;
    }
    const colors = ['#72c69a', '#00b4ff', '#e2b45d', '#a78bfa', '#00ffd5', '#ff69b4', '#ff6f3d'];
    let html = '<div style="margin-bottom:14px;">' +
               '<div style="font-size:11pt;color:var(--accent);margin-bottom:4px;">' + d.memory.layers + ' layers</div>' +
               '<div style="font-size:9pt;color:#666;">Curator: ' + esc(d.memory.curator_status) + '</div>' +
               '<div style="font-size:8pt;color:#444;margin-top:2px;">Root: ' + esc(d.memory.root) + '</div>' +
               '</div>';
    for (let i = 0; i < d.memory.layers; i++) {
      const name = ['Tier 1 — Auto-execute', 'Tier 2 — Logged', 'Tier 3 — Human-confirm',
                    'Tier 4 — Archive', 'Tier 5 — Compressed', 'Tier 6 — Deep archive', 'Tier 7 — Cold storage'][i] ||
                    ('Layer ' + (i + 1));
      html += '<div class="memory-layer"><span class="layer-indicator" style="background:' + colors[i % colors.length] + '"></span>' +
              '<span class="layer-name">' + esc(name) + '</span>' +
              '<span class="layer-status">active</span></div>';
    }
    el.innerHTML = html;
  }

  // ── Feedback panel ─────────────────────────────────────────
  function renderFeedbackPanel() {
    const el = $('feedback-panel');
    let feedback = [];
    try { feedback = JSON.parse(localStorage.getItem('sse_feedback') || '[]'); } catch (e) {}
    if (feedback.length === 0) {
      el.innerHTML = '<div class="empty-state">No feedback recorded.</div>';
      return;
    }
    el.innerHTML = feedback.slice(-10).reverse().map(f =>
      '<div class="feedback-item"><div class="stars">' +
      '★'.repeat(f.rating || 0) + '☆'.repeat(5 - (f.rating || 0)) + '</div>' +
      '<div class="text">' + esc(f.comments || '') + '</div>' +
      (f.action_items ? '<div style="font-size:8pt;color:var(--warn);margin-top:3px;">Actions: ' + esc(f.action_items) + '</div>' : '') +
      '<div class="meta">' + esc((f.created_at || '').split('T')[0]) + ' · ' + esc(f.file_name || '') + '</div></div>'
    ).join('');
  }

  // ── Flow view (simplified) ─────────────────────────────────
  function renderFlowView() {
    const el = $('flow-grid');
    if (!state.agents || !state.agents.agents) {
      el.innerHTML = '<div class="empty-state">No agent data for flow visualization.</div>';
      return;
    }
    const agents = state.agents.agents.filter(a => state.filters[classifyAgent(a)]);
    const high = agents.filter(a => altitudeCategory(a) === 'high');
    const mid = agents.filter(a => altitudeCategory(a) === 'mid');
    const low = agents.filter(a => altitudeCategory(a) === 'low');
    let html = '';
    const renderRow = (label, list, color) => {
      if (!list.length) return;
      html += '<div style="margin-bottom:14px;">' +
              '<div style="font-size:9pt;color:' + color + ';margin-bottom:6px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;">' +
              esc(label) + ' (' + list.length + ')</div>' +
              '<div style="display:flex;flex-wrap:wrap;gap:6px;">' +
              list.map(a => '<span style="background:' + color + '18;border:1px solid ' + color + '40;color:' + color +
                ';padding:4px 10px;border-radius:4px;font-size:9pt;font-weight:600;">' + esc(a.name) + '</span>').join('') +
              '</div></div>';
    };
    renderRow('High altitude — core infrastructure', high, COLORS.active);
    renderRow('Mid altitude — gates & complex agents', mid, COLORS.pending);
    renderRow('Low altitude — workers & sandbox', low, COLORS.infra);
    el.innerHTML = html || '<div class="empty-state">No agents match filters.</div>';
  }

  // ── Filter handlers ────────────────────────────────────────
  function filterAgents() {
    const q = $('agent-search').value.toLowerCase();
    document.querySelectorAll('.agent-card').forEach(c => {
      const match = !q || c.dataset.agent.toLowerCase().includes(q);
      c.style.display = match ? '' : 'none';
    });
    document.querySelectorAll('.agent-list-item').forEach(c => {
      const match = !q || c.dataset.agent.toLowerCase().includes(q);
      c.style.display = match ? '' : 'none';
    });
  }

  function toggleLayer(cat, checked) {
    state.filters[cat] = checked;
    renderAgentGrid();
    renderAgentList();
    renderFlowView();
  }

  // ── Tab switching ──────────────────────────────────────────
  function switchTab(name, tabEl) {
    document.querySelectorAll('.tabs .tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    tabEl.classList.add('active');
    $('tab-' + name).classList.add('active');
  }

  // ══════════════════════════════════════════════════════════
  // GOVERNANCE VISUALIZATION — invisible layer made visible
  // ══════════════════════════════════════════════════════════

  // ── Governance overview cards ────────────────────────────
  function renderGovernanceOverview() {
    const el = $('governance-overview');
    const g = state.governance;
    if (!g || !g.agent_space) {
      el.innerHTML = '<div class="empty-state">No governance data.</div>';
      return;
    }
    const cards = [
      { label: 'Agents', value: g.agent_space.total_agents, sub: 'active scaffolds', color: 'var(--accent)' },
      { label: 'Skills', value: g.skills.total, sub: 'hermes + project', color: 'var(--blue)' },
      { label: 'Cron dirs', value: g.cron.agents_with_cron_dir, sub: 'scaffolded', color: 'var(--good)' },
      { label: 'Plugin dirs', value: g.plugins.agents_with_plugins_dir, sub: 'scaffolded', color: 'var(--purple)' },
      { label: 'Gates', value: g.boundaries.jhanos_gates.gate_count, sub: 'Jhanos gates', color: 'var(--cyan)' },
      { label: 'Boundaries', value: Object.keys(g.boundaries).length, sub: 'zones', color: 'var(--warn)' }
    ];
    el.innerHTML =
      '<div class="gov-section"><div class="gov-cards">' +
      cards.map(c =>
        '<div class="gov-card"><div class="gov-card-value" style="color:' + c.color + ';">' + c.value + '</div>' +
        '<div class="gov-card-label">' + esc(c.label) + '</div>' +
        '<div class="gov-card-sub">' + esc(c.sub) + '</div></div>'
      ).join('') +
      '</div></div>';
  }

  // ── Boundary / zone visualization ──────────────────────────
  function renderGovernanceBoundaries() {
    const el = $('governance-boundaries');
    const g = state.governance;
    if (!g || !g.boundaries) {
      el.innerHTML = '';
      return;
    }
    const zones = g.boundaries;
    const order = ['earth', 'pluto', 'moon', 'jhanos_gates'];
    let html = '<div class="gov-section"><div class="gov-section-title">Agent-Space Boundaries</div>' +
               '<div class="boundary-lanes">';
    // Lane visualization: Earth → Moon → Jhanos → Pluto
    const laneColors = ['#72c69a', '#f3c969', '#00b4ff', '#a78bfa'];
    const laneLabels = ['Earth (user)', 'Moon (escrow)', 'Jhanos Gates', 'Pluto (agent)'];
    const laneDescs = [
      'User canonical world · user write · agent read-manifest',
      'Holding orbit · custodian write · all agents read-only',
      'Verification planets · gate agents only · 9 gates',
      'Agent territories · own-territory write · cross-agent read'
    ];
    const artifactsByKey = {
      earth: zones.earth.artifacts,
      pluto: zones.pluto.artifacts,
      moon: zones.moon.artifacts,
      jhanos_gates: zones.jhanos_gates.gates
    };
    html += '<div class="boundary-lane-visual">';
    order.forEach((z, i) => {
      const color = laneColors[i];
      const label = laneLabels[i];
      const desc = laneDescs[i];
      const arts = artifactsByKey[z];
      const artifactNote = Array.isArray(arts)
        ? '<span class="lane-artifacts">' + arts.map(a => esc(a)).join(' · ') + '</span>'
        : '<span class="lane-artifacts">' + (zones.jhanos_gates.gate_count) + ' gates</span>';
      if (i > 0) {
        html += '<div class="lane-connector" style="border-color:' + color + '40;">' +
                '<span class="connector-arrow" style="color:' + color + ';">→</span></div>';
      }
      html += '<div class="lane-node" style="border-color:' + color + ';">' +
              '<span class="lane-dot" style="background:' + color + ';"></span>' +
              '<span class="lane-label" style="color:' + color + ';">' + esc(label) + '</span>' +
              '<span class="lane-desc">' + esc(desc) + '</span>' +
              artifactNote +
              '</div>';
    });
    html += '</div>';
    // Permission matrix table
    html += '<div class="gov-section-title" style="margin-top:14px;">Permission Matrix</div>' +
            '<table class="gov-table"><thead><tr>' +
            '<th>Zone</th><th>Agent write</th><th>Agent read</th><th>User write</th><th>User read</th>' +
            '</tr></thead><tbody>';
    const zoneNames = { earth: 'Earth', pluto: 'Pluto', moon: 'Moon', jhanos_gates: 'Jhanos Gates' };
    for (const z of order) {
      const pm = g.permission_matrix[z] || {};
      const aw = pm.agent_write;
      const ar = pm.agent_read;
      const awClass = aw === 'NO' || aw === false ? 'perm-deny' : aw === 'YES' || aw === true ? 'perm-grant' : 'perm-partial';
      const arClass = ar === 'manifest only' ? 'perm-partial' : ar === true ? 'perm-grant' : 'perm-deny';
      html += '<tr><td class="zone-name" style="color:' + zoneColors[z] + ';">' + esc(zoneNames[z]) + '</td>' +
              '<td class="' + awClass + '">' + esc(typeof aw === 'boolean' ? (aw ? 'YES' : 'NO') : aw) + '</td>' +
              '<td class="' + arClass + '">' + esc(ar) + '</td>' +
              '<td class="perm-grant">YES</td><td class="perm-grant">YES</td></tr>';
    }
    html += '</tbody></table>';
    html += '</div>';
    el.innerHTML = html;
  }

  // ── Constraint registry ────────────────────────────────────
  function renderGovernanceConstraints() {
    const el = $('governance-constraints');
    const g = state.governance;
    if (!g || !g.constraint_model) {
      el.innerHTML = '';
      return;
    }
    let html = '<div class="gov-section"><div class="gov-section-title">Hard Constraints</div>' +
               '<div class="constraint-list">';
    g.constraint_model.hard_constraints.forEach(c => {
      html += '<div class="constraint-item">' +
              '<span class="constraint-rule">' + esc(c.rule) + '</span>' +
              '<span class="constraint-enforcement">' + esc(c.enforcement) + '</span>' +
              '</div>';
    });
    html += '</div>';
    // Violation policy
    html += '<div class="gov-section-title" style="margin-top:10px;">Violation Policy</div>' +
            '<div class="violation-policy">' +
            g.constraint_model.violation_policy.map((v, i) =>
              '<div class="violation-step" style="border-color:' + ['var(--accent)', 'var(--warn)', 'var(--bad)'][i] + ';">' +
              '<span class="violation-num" style="color:' + ['var(--accent)', 'var(--warn)', 'var(--bad)'][i] + ';">' + (i + 1) + '</span>' +
              '<span class="violation-text">' + esc(v) + '</span></div>'
            ).join('') +
            '</div></div>';
    el.innerHTML = html;
  }

  // ── Skills distribution ────────────────────────────────────
  function renderGovernanceSkills() {
    const el = $('governance-skills');
    const g = state.governance;
    if (!g || !g.skills) {
      el.innerHTML = '';
      return;
    }
    const cats = g.skills.categories;
    const max = Math.max(...Object.values(cats));
    let html = '<div class="gov-section"><div class="gov-section-title">Skills Inventory (' + g.skills.total + ')</div>' +
               '<div class="skills-bars">';
    const catNames = {
      autonomous_agents: 'Autonomous Agents', creative: 'Creative', devops: 'DevOps',
      email: 'Email', features: 'Features', media: 'Media', mlops: 'MLOps',
      monitor_analytics: 'Monitor & Analytics', note_taking: 'Note-taking',
      productivity: 'Productivity', research: 'Research', security: 'Security',
      smart_home: 'Smart Home', social_media: 'Social Media',
      software_development: 'Software Dev', web: 'Web', workspace_orientation: 'Workspace'
    };
    for (const [key, count] of Object.entries(cats)) {
      const pct = Math.round(count / max * 100);
      html += '<div class="skill-bar-row">' +
              '<span class="skill-bar-label">' + esc(catNames[key] || key) + '</span>' +
              '<div class="skill-bar-track"><div class="skill-bar-fill" style="width:' + pct + '%;background:var(--blue);"></div></div>' +
              '<span class="skill-bar-count">' + count + '</span>' +
              '</div>';
    }
    html += '</div></div>';
    el.innerHTML = html;
  }

  // ── Agent scaffolding status ───────────────────────────────
  function renderGovernanceAgents() {
    const el = $('governance-agents');
    const g = state.governance;
    if (!g || !g.agent_governance_status) {
      el.innerHTML = '';
      return;
    }
    let html = '<div class="gov-section"><div class="gov-section-title">Agent Scaffolding Status</div>' +
               '<table class="gov-table"><thead><tr>' +
               '<th>Agent</th><th>Config</th><th>Skills</th><th>Cron</th><th>Plugins</th>' +
               '</tr></thead><tbody>';
    g.agent_governance_status.forEach(a => {
      const cls = a.scaffolded ? 'agent-scaffolded' : 'agent-scaffold-partial';
      html += '<tr class="' + cls + '">' +
              '<td class="agent-name">' + esc(a.name) + '</td>' +
              permCell(a.config) + permCell(a.skills) + permCell(a.cron) + permCell(a.plugins) +
              '</tr>';
    });
    html += '</tbody></table></div>';
    el.innerHTML = html;
  }

  function permCell(val) {
    if (val) return '<td class="perm-grant">✓</td>';
    return '<td class="perm-deny">✗</td>';
  }

  // ── Public API ─────────────────────────────────────────────
  window.selectAgent = selectAgent;
  window.clearInspector = clearInspector;
  window.filterAgents = filterAgents;
  window.toggleLayer = toggleLayer;
  window.switchTab = switchTab;

  // ── Boot ───────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', init);
})();
