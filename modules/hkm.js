// modules/hkm.js – HKM Hund-Katze-Maus Sales Gamification Module
// Loaded as regular script after app.js and views/matkon.js
// Firebase data lives at /hkm/ (global root, not per-org)

// ─── Constants ───────────────────────────────────────────────────────────────

const RANG_STUFEN = [
  { key: 'dackel',   label: 'Dackel',  icon: '🐶', min: 0,  max: 9,    provision: 3, bonus: 0     },
  { key: 'boxer',    label: 'Boxer',   icon: '🥊', min: 10, max: 29,   provision: 4, bonus: 2000  },
  { key: 'schaefer', label: 'Schäfer', icon: '🐕', min: 30, max: 59,   provision: 5, bonus: 5000  },
  { key: 'dogge',    label: 'Dogge',   icon: '🦮', min: 60, max: 9999, provision: 6, bonus: 10000 }
];

const HKM_REGIONS = [
  { value: 'zuerich',          label: 'Zürich/Zug'        },
  { value: 'zentralschweiz',   label: 'Zentralschweiz'    },
  { value: 'nordwestschweiz',  label: 'Nordwestschweiz'   },
  { value: 'ostschweiz',       label: 'Ostschweiz'        },
  { value: 'bern',             label: 'Bern/Aargau'       },
  { value: 'andere',           label: 'Andere'            }
];

const HKM_PAKETE = [
  'Visualisierungspaket',
  'Full-Service',
  'Grundriss-Paket',
  'Navigator',
  'Visumat MatKon',
  'Sonstiges'
];

const HKM_ABSAGE_KATEGORIEN = [
  { value: 'zu_teuer',           label: 'Zu teuer'            },
  { value: 'kein_bedarf',        label: 'Kein Bedarf'         },
  { value: 'kein_interesse',     label: 'Kein Interesse'      },
  { value: 'schlechtes_timing',  label: 'Schlechtes Timing'   },
  { value: 'anderer_anbieter',   label: 'Anderer Anbieter'    },
  { value: 'interner_entscheid', label: 'Interner Entscheid'  },
  { value: 'sonstiges',          label: 'Sonstiges'           }
];

const HKM_ZUSAGE_KATEGORIEN = [
  { value: 'preis_leistung',  label: 'Preis-Leistung'        },
  { value: 'referenzen',      label: 'Referenzprojekte'      },
  { value: 'beziehung',       label: 'Bestehende Beziehung'  },
  { value: 'produkt_demo',    label: 'Demo überzeugt'        },
  { value: 'timing',          label: 'Richtiges Timing'      },
  { value: 'empfehlung',      label: 'Empfehlung'            },
  { value: 'sonstiges',       label: 'Sonstiges'             }
];

// ─── State Extensions ─────────────────────────────────────────────────────────

state.hkmProfiles  = {};
state.hkmLeads     = [];
state.hkmActivities = [];
state.hkmChallenges = [];
state.hkmKnochenTransfers = [];
state.hkmRangLog   = [];
state.hkmTab       = 'leaderboard';
state.hkmLeadsFilter = { status: '', region: '', assignedTo: '', search: '' };
state.hkmBulkSelected = new Set();
state.hkmCurrentLeadId = null;

// ─── Utility ─────────────────────────────────────────────────────────────────

function getRangByKnochen(knochen) {
  const k = Number(knochen) || 0;
  for (let i = RANG_STUFEN.length - 1; i >= 0; i--) {
    if (k >= RANG_STUFEN[i].min) return RANG_STUFEN[i];
  }
  return RANG_STUFEN[0];
}

function getNextRang(rangKey) {
  const idx = RANG_STUFEN.findIndex(r => r.key === rangKey);
  return idx >= 0 && idx < RANG_STUFEN.length - 1 ? RANG_STUFEN[idx + 1] : null;
}

function hkmFmt(n) {
  return Number(n || 0).toLocaleString('de-CH');
}

function hkmDateStr(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d) ? '' : d.toLocaleDateString('de-CH');
}

function hkmTimeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (d > 1) return `vor ${d} Tagen`;
  if (d === 1) return 'gestern';
  if (h >= 1) return `vor ${h}h`;
  return 'gerade eben';
}

function hkmInitials(name) {
  return (name || '?').split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
}

function hkmOwnUid() {
  return currentUser?.uid || null;
}

function hkmIsAdmin() {
  const uid = hkmOwnUid();
  if (!uid) return false;
  // HKM-specific profile role
  if (state.hkmProfiles[uid]?.role === 'admin') return true;
  // Fall back: CRM admin also gets HKM admin rights
  return state.settings?.userRole === 'admin';
}

function hkmGetProfileByUid(uid) {
  return state.hkmProfiles[uid] || null;
}

function hkmGetLeadActivities(leadId) {
  return state.hkmActivities.filter(a => a.lead_id === leadId);
}

function hkmGetUidByMemberId(memberId) {
  for (const [uid, p] of Object.entries(state.hkmProfiles)) {
    if (p.memberId === memberId) return uid;
  }
  return null;
}

// ─── Tab Navigation ───────────────────────────────────────────────────────────

function setHkmTab(tab) {
  state.hkmTab = tab;
  document.querySelectorAll('[data-hkm-tab]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.hkmTab === tab);
  });
  const views = {
    leaderboard: 'hkmLeaderboardView',
    leads: 'hkmLeadsView',
    matkon: 'hkmMatkonView',
    analytics: 'hkmAnalyticsView',
    challenges: 'hkmChallengesView',
    calendar: 'hkmCalendarView',
    admin: 'hkmAdminView'
  };
  Object.entries(views).forEach(([key, id]) => {
    const el = document.getElementById(id);
    if (el) el.style.display = key === tab ? 'block' : 'none';
  });
  // Always hide session panel when switching tabs (unless staying on leads)
  if (tab !== 'leads') {
    const sessionPanel = document.getElementById('hkmSessionPanel');
    if (sessionPanel) sessionPanel.style.display = 'none';
    if (HkmSession.active) HkmSession.end();
  }
  if (tab === 'leaderboard')  renderHkmLeaderboard();
  if (tab === 'leads')        renderHkmLeads();
  if (tab === 'matkon')       { renderMatkonProjects?.(); renderMatkonMemberFilter?.(); }
  if (tab === 'analytics')    renderHkmAnalytics();
  if (tab === 'challenges')   renderHkmChallenges();
  if (tab === 'calendar')     renderHkmCalendar();
  if (tab === 'admin')        renderHkmAdmin();
}

// Called when user navigates to HKM section
function initHkmOnView() {
  // Update streak
  window.hkmUpdateStreak?.();
  // Show/hide admin tab
  const adminTab = document.querySelector('[data-hkm-tab="admin"]');
  if (adminTab) adminTab.style.display = hkmIsAdmin() ? 'inline-flex' : 'none';
  // Render current tab
  setHkmTab(state.hkmTab || 'leaderboard');
}

// ─── Render: Leaderboard ─────────────────────────────────────────────────────

function renderHkmLeaderboard() {
  const container = document.getElementById('hkmLeaderboardCards');
  if (!container) return;

  const profiles = Object.entries(state.hkmProfiles).map(([uid, p]) => ({ ...p, uid }));
  if (profiles.length === 0) {
    container.innerHTML = '<div class="hkm-empty">Noch keine Profile vorhanden. Starte eine Aktivität um dein Profil zu aktivieren.</div>';
    renderHkmActiveChallenge();
    return;
  }

  const sorted = [...profiles].sort((a, b) => (b.knochen || 0) - (a.knochen || 0));
  const leithund = sorted[0];
  const jaeger   = sorted[1] || null;

  let html = '';
  [leithund, jaeger].forEach((p, idx) => {
    if (!p) return;
    const isLeithund = idx === 0;
    const rang = getRangByKnochen(p.knochen || 0);
    const nextRang = getNextRang(rang.key);
    const progress = nextRang
      ? Math.min(100, Math.round(((p.knochen || 0) - rang.min) / (nextRang.min - rang.min) * 100))
      : 100;
    const katzenCount = p.katzen_count || 0;
    const provision = (p.provision_total || 0).toFixed(0);
    const streak = p.streak_days || 0;
    const name = p.name || 'Unbekannt';
    const dogName = p.dog_name || name;
    const borderColor = isLeithund ? '#fbbf24' : '#9ca3af';
    const borderWidth = isLeithund ? '3px' : '2px';

    const katzenIcons = Array.from({ length: Math.min(katzenCount, 20) }, () => '🐱').join('');
    const katzenExtra = katzenCount > 20 ? ` +${katzenCount - 20}` : '';

    html += `
    <div class="hkm-profile-card" style="border: ${borderWidth} solid ${borderColor};">
      ${isLeithund ? '<div class="hkm-badge hkm-badge-gold">🏆 Leithund</div>' : '<div class="hkm-badge hkm-badge-silver">🎯 Jäger</div>'}
      <div class="hkm-avatar" style="background: ${isLeithund ? 'linear-gradient(135deg,#fbbf24,#f59e0b)' : 'linear-gradient(135deg,#6b7280,#9ca3af)'}">
        ${hkmInitials(name)}
      </div>
      <div class="hkm-dog-name">${dogName}</div>
      <div class="hkm-rang-label">${rang.icon} ${rang.label}</div>
      <div class="hkm-knochen-count">🦴 ${p.knochen || 0}</div>
      <div class="hkm-meta-row">
        <span>💰 CHF ${hkmFmt(provision)}</span>
        <span>🔥 ${streak} Tage</span>
      </div>
      ${nextRang ? `
      <div class="hkm-progress-wrap">
        <div class="hkm-progress-label"><span>${rang.label}</span><span>${nextRang.label} (${nextRang.min} 🦴)</span></div>
        <div class="hkm-progress-bar">
          <div class="hkm-progress-fill" style="width:${progress}%"></div>
        </div>
        <div class="hkm-progress-sub">Noch ${Math.max(0, nextRang.min - (p.knochen||0))} 🦴 bis ${nextRang.icon} ${nextRang.label}</div>
      </div>` : `<div class="hkm-progress-sub" style="color:#f59e0b;font-weight:700;">🏆 Maximaler Rang erreicht!</div>`}
      <div class="hkm-katzen-row">
        <span style="font-size:11px;color:var(--muted);display:block;margin-bottom:4px;">Katzen gesammelt</span>
        <span class="hkm-katzen-icons">${katzenIcons || '–'}${katzenExtra}</span>
      </div>
      ${p.uid === hkmOwnUid() ? '<div class="hkm-own-badge">Du</div>' : ''}
    </div>`;
  });

  if (sorted.length > 2) {
    html += '<div class="hkm-team-list"><h4 style="margin:0 0 12px;font-size:13px;">Weitere Teammitglieder</h4>';
    sorted.slice(2).forEach(p => {
      const rang = getRangByKnochen(p.knochen || 0);
      html += `<div class="hkm-team-row">
        <span class="hkm-team-avatar" style="background:#374151">${hkmInitials(p.name||'?')}</span>
        <span style="flex:1">${p.name || 'Unbekannt'}</span>
        <span>${rang.icon} ${rang.label}</span>
        <span style="color:#f59e0b;font-weight:700;">🦴 ${p.knochen||0}</span>
      </div>`;
    });
    html += '</div>';
  }

  container.innerHTML = html;
  renderHkmActiveChallenge();
  renderHkmRecentActivities();
}

function renderHkmActiveChallenge() {
  const el = document.getElementById('hkmActiveChallengeBox');
  if (!el) return;
  const now = new Date();
  const active = state.hkmChallenges.find(c => c.status === 'aktiv' && new Date(c.end_date) >= now);
  if (!active) {
    el.innerHTML = '<div class="hkm-empty" style="padding:16px;">Keine aktive Challenge</div>';
    return;
  }
  const end = new Date(active.end_date);
  const daysLeft = Math.max(0, Math.ceil((end - now) / 86400000));
  const participants = Object.entries(state.hkmProfiles).map(([uid, p]) => ({ uid, ...p }));
  const actInRange = state.hkmActivities.filter(a => {
    const t = new Date(a.createdAt);
    return t >= new Date(active.start_date) && t <= end;
  });
  const counts = {};
  participants.forEach(p => counts[p.uid] = 0);
  actInRange.forEach(a => {
    if (active.typ === 'demos' && a.type === 'demo') counts[a.user_id] = (counts[a.user_id] || 0) + 1;
    if (active.typ === 'deals' && a.type === 'deal') counts[a.user_id] = (counts[a.user_id] || 0) + 1;
  });
  const sorted = participants.sort((a, b) => (counts[b.uid] || 0) - (counts[a.uid] || 0));

  el.innerHTML = `
  <div class="hkm-challenge-box">
    <div class="hkm-challenge-title">⚔️ ${active.titel}</div>
    <div class="hkm-challenge-meta">Typ: ${active.typ === 'demos' ? 'Meiste Demos' : 'Meiste Deals'} · Endet in ${daysLeft} Tag${daysLeft !== 1 ? 'en' : ''} · Einsatz: 🦴 ${active.knochen_einsatz}</div>
    <div class="hkm-challenge-scores">
      ${sorted.map(p => `
        <div class="hkm-challenge-score">
          <span class="hkm-team-avatar" style="background:#374151;font-size:12px;width:28px;height:28px;">${hkmInitials(p.name||'?')}</span>
          <span style="flex:1">${p.name||'?'}</span>
          <span style="font-weight:700;color:#f59e0b">${counts[p.uid] || 0}</span>
        </div>
      `).join('')}
    </div>
  </div>`;
}

function renderHkmRecentActivities() {
  const el = document.getElementById('hkmRecentActivities');
  if (!el) return;
  const recent = [...state.hkmActivities]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 8);
  if (!recent.length) {
    el.innerHTML = '<div class="hkm-empty">Noch keine Aktivitäten</div>';
    return;
  }
  const icons = { call: '📞', demo: '📅', deal: '💰', produkt: '✅', visumat: '🎯', absage: '❌' };
  el.innerHTML = recent.map(a => {
    const lead = state.hkmLeads.find(l => l.id === a.lead_id);
    const profile = state.hkmProfiles[a.user_id];
    return `<div class="hkm-activity-row">
      <span class="hkm-act-icon">${icons[a.type] || '📝'}</span>
      <span class="hkm-act-lead">${lead?.projektname || lead?.firma || 'Lead'}</span>
      <span class="hkm-act-user">${profile?.name || 'Unbekannt'}</span>
      <span class="hkm-act-time">${hkmTimeAgo(a.createdAt)}</span>
    </div>`;
  }).join('');
}

// ─── Render: Leads ───────────────────────────────────────────────────────────

function renderHkmLeads() {
  const tbody = document.getElementById('hkmLeadsBody');
  if (!tbody) return;

  // Populate assigned-to filter with current profiles
  const assignedFilterEl = document.getElementById('hkmLeadsFilterAssigned');
  if (assignedFilterEl) {
    const cur = assignedFilterEl.value;
    assignedFilterEl.innerHTML = '<option value="">Alle Mitarbeiter</option>' +
      Object.entries(state.hkmProfiles).map(([uid, p]) =>
        `<option value="${uid}">${p.name || uid}</option>`
      ).join('');
    if (cur) assignedFilterEl.value = cur;
  }

  const f = state.hkmLeadsFilter;
  let leads = [...state.hkmLeads];

  if (f.search) {
    const q = f.search.toLowerCase();
    leads = leads.filter(l =>
      (l.projektname||'').toLowerCase().includes(q) ||
      (l.firma||'').toLowerCase().includes(q) ||
      (l.kontaktperson||'').toLowerCase().includes(q)
    );
  }
  if (f.status) leads = leads.filter(l => l.status === f.status);
  if (f.region) leads = leads.filter(l => l.region === f.region);
  if (f.assignedTo) leads = leads.filter(l => l.assigned_to === f.assignedTo);

  leads.sort((a, b) => new Date(b.createdAt||0) - new Date(a.createdAt||0));

  if (!leads.length) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--muted);padding:24px;">Keine Leads gefunden</td></tr>';
    hkmUpdateBulkBar();
    return;
  }

  const statusMap = {
    neu:          { label: 'Neu',          color: '#6b7280', bg: 'rgba(107,114,128,.12)' },
    kontaktiert:  { label: 'Kontaktiert',  color: '#f59e0b', bg: 'rgba(245,158,11,.12)'  },
    demo_gebucht: { label: 'Demo gebucht', color: '#3b82f6', bg: 'rgba(59,130,246,.12)'  },
    abgeschlossen:{ label: 'Gewonnen',     color: '#10b981', bg: 'rgba(16,185,129,.12)'  },
    abgesagt:     { label: 'Abgesagt',     color: '#ef4444', bg: 'rgba(239,68,68,.12)'   }
  };

  tbody.innerHTML = leads.map(l => {
    const st = statusMap[l.status] || statusMap.neu;
    const profile = l.assigned_to ? state.hkmProfiles[l.assigned_to] : null;
    const isComplete = !!(l.projektname && l.firma && l.kontaktperson && l.region);
    const regionLabel = HKM_REGIONS.find(r => r.value === l.region)?.label || l.region || '';
    const acts = hkmGetLeadActivities(l.id);
    const lastAct = acts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
    const isChecked = state.hkmBulkSelected.has(l.id);
    return `<tr class="hkm-lead-row" onclick="openHkmLeadDetail('${l.id}')" style="cursor:pointer;${isChecked ? 'background:rgba(245,158,11,.08);' : ''}">
      <td onclick="event.stopPropagation();">
        <input type="checkbox" class="hkm-lead-check" data-id="${l.id}" ${isChecked ? 'checked' : ''} onchange="hkmToggleBulkLead('${l.id}', this.checked)">
      </td>
      <td><strong>${l.projektname || '–'}</strong></td>
      <td>${l.firma || '–'}<br><span style="font-size:11px;color:var(--muted);">${l.kontaktperson || ''}</span></td>
      <td style="font-size:12px;">${regionLabel || '–'}</td>
      <td>
        <span style="display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;background:${st.bg};color:${st.color}">${st.label}</span>
      </td>
      <td>
        ${profile ? `<span style="font-size:12px;">${profile.name||'?'}</span>` : '<span style="color:var(--muted);font-size:12px;">–</span>'}
      </td>
      <td style="text-align:center;">
        ${isComplete ? '<span style="color:#10b981;font-size:16px;">✓</span>' : '<span style="color:#ef4444;font-size:16px;">○</span>'}
      </td>
      <td style="font-size:11px;color:var(--muted);">${lastAct ? hkmTimeAgo(lastAct.createdAt) : '–'}</td>
      <td style="display:flex;gap:4px;">
        <button class="btn" style="padding:3px 10px;font-size:12px;" onclick="event.stopPropagation();openHkmLeadModal('${l.id}')">✏️</button>
        ${hkmIsAdmin() ? `<button class="btn" style="padding:3px 8px;font-size:12px;border-color:#ef4444;color:#ef4444;" onclick="event.stopPropagation();hkmDeleteLead('${l.id}','${(l.projektname||l.firma||'').replace(/'/g,'')}')" title="Lead löschen">🗑️</button>` : ''}
      </td>
    </tr>`;
  }).join('');

  // Wire up select-all checkbox
  const selectAllEl = document.getElementById('hkmSelectAll');
  if (selectAllEl) {
    selectAllEl.checked = leads.length > 0 && leads.every(l => state.hkmBulkSelected.has(l.id));
    selectAllEl.onchange = function() {
      leads.forEach(l => {
        if (this.checked) state.hkmBulkSelected.add(l.id);
        else state.hkmBulkSelected.delete(l.id);
      });
      renderHkmLeads();
    };
  }
  hkmUpdateBulkBar();
}

function updateHkmLeadsFilters() {
  const searchEl   = document.getElementById('hkmLeadsSearch');
  const statusEl   = document.getElementById('hkmLeadsFilterStatus');
  const regionEl   = document.getElementById('hkmLeadsFilterRegion');
  const assignedEl = document.getElementById('hkmLeadsFilterAssigned');
  state.hkmLeadsFilter = {
    search:     searchEl?.value.trim() || '',
    status:     statusEl?.value || '',
    region:     regionEl?.value || '',
    assignedTo: assignedEl?.value || ''
  };
  renderHkmLeads();
}

// ─── Bulk Selection ───────────────────────────────────────────────────────────

window.hkmToggleBulkLead = function(id, checked) {
  if (checked) state.hkmBulkSelected.add(id);
  else state.hkmBulkSelected.delete(id);
  hkmUpdateBulkBar();
  // Update row highlight
  const row = document.querySelector(`.hkm-lead-check[data-id="${id}"]`)?.closest('tr');
  if (row) row.style.background = checked ? 'rgba(245,158,11,.08)' : '';
};

function hkmUpdateBulkBar() {
  const bar = document.getElementById('hkmBulkBar');
  if (!bar) return;
  const count = state.hkmBulkSelected.size;
  bar.style.display = count > 0 ? 'flex' : 'none';
  const countEl = document.getElementById('hkmBulkCount');
  if (countEl) countEl.textContent = `${count} Lead${count !== 1 ? 's' : ''} ausgewählt`;
  const delBtn = document.getElementById('hkmBulkDeleteBtn');
  if (delBtn) delBtn.style.display = hkmIsAdmin() ? '' : 'none';
}

window.hkmClearBulkSelection = function() {
  state.hkmBulkSelected.clear();
  renderHkmLeads();
};

window.hkmBulkDelete = async function() {
  if (!hkmIsAdmin()) { showToast('Nur Admins dürfen Leads löschen'); return; }
  const count = state.hkmBulkSelected.size;
  if (!count) return;
  if (!confirm(`${count} Lead${count !== 1 ? 's' : ''} wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`)) return;
  const ids = [...state.hkmBulkSelected];
  let deleted = 0;
  for (const id of ids) {
    try { await window.deleteHkmLead(id); deleted++; } catch(e) { /* continue */ }
  }
  state.hkmBulkSelected.clear();
  showToast(`🗑️ ${deleted} Lead${deleted !== 1 ? 's' : ''} gelöscht`);
  renderHkmLeads();
};

window.hkmResetLeadsFilter = function() {
  state.hkmLeadsFilter = { status: '', region: '', assignedTo: '', search: '' };
  ['hkmLeadsSearch','hkmLeadsFilterStatus','hkmLeadsFilterRegion','hkmLeadsFilterAssigned']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  renderHkmLeads();
};

// ─── Lead Detail Modal ────────────────────────────────────────────────────────

function openHkmLeadDetail(leadId) {
  const lead = state.hkmLeads.find(l => l.id === leadId);
  if (!lead) return;
  state.hkmCurrentLeadId = leadId;

  const modalTitle = document.querySelector('#hkmLeadDetailModal .modal-header h2');
  if (modalTitle) modalTitle.textContent = lead.projektname || lead.firma || 'Lead Detail';
  document.getElementById('hkmDetailProjekt').textContent  = lead.projektname || '–';
  document.getElementById('hkmDetailFirma').textContent    = lead.firma || '–';
  document.getElementById('hkmDetailKontakt').textContent  = lead.kontaktperson || '–';
  document.getElementById('hkmDetailEmail').textContent    = lead.email || '–';
  document.getElementById('hkmDetailTel').textContent      = lead.telefon || '–';
  document.getElementById('hkmDetailRegion').textContent   = HKM_REGIONS.find(r => r.value === lead.region)?.label || lead.region || '–';
  document.getElementById('hkmDetailTyp').textContent      = lead.projekttyp || '–';
  if (lead.url) {
    const urlDisplay = lead.url.length > 55 ? lead.url.slice(0, 52) + '…' : lead.url;
    document.getElementById('hkmDetailUrl').innerHTML = `<a href="${lead.url}" target="_blank" rel="noopener" title="${lead.url}" style="color:var(--accent);word-break:break-all;">${urlDisplay}</a>`;
  } else {
    document.getElementById('hkmDetailUrl').textContent = '–';
  }

  // Status
  const statusMap = { neu: 'Neu', kontaktiert: 'Kontaktiert', demo_gebucht: 'Demo gebucht', abgeschlossen: 'Gewonnen', abgesagt: 'Abgesagt' };
  document.getElementById('hkmDetailStatus').textContent = statusMap[lead.status] || lead.status || '–';

  // Assigned
  const profile = lead.assigned_to ? state.hkmProfiles[lead.assigned_to] : null;
  document.getElementById('hkmDetailAssigned').textContent = profile?.name || '–';

  // Validation checklist
  const checks = [
    { label: 'Projektname', ok: !!lead.projektname },
    { label: 'Firma',       ok: !!lead.firma },
    { label: 'Kontaktperson', ok: !!lead.kontaktperson },
    { label: 'Region',      ok: !!lead.region }
  ];
  document.getElementById('hkmDetailChecklist').innerHTML = checks.map(c =>
    `<div style="display:flex;align-items:center;gap:8px;padding:4px 0;">
      <span style="color:${c.ok ? '#10b981' : '#ef4444'};font-size:14px;">${c.ok ? '✓' : '○'}</span>
      <span style="font-size:12px;color:${c.ok ? 'var(--text)' : 'var(--muted)'};">${c.label}</span>
    </div>`
  ).join('');

  // Activity log
  renderHkmLeadActivities(leadId);

  document.getElementById('hkmLeadDetailModal').style.display = 'flex';
}

function renderHkmLeadActivities(leadId) {
  const el = document.getElementById('hkmDetailActivities');
  if (!el) return;
  const acts = hkmGetLeadActivities(leadId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (!acts.length) {
    el.innerHTML = '<div style="color:var(--muted);font-size:12px;text-align:center;padding:12px;">Noch keine Aktivitäten</div>';
    return;
  }

  const icons = { call: '📞', demo: '📅', deal: '💰', produkt: '✅', visumat: '🎯', absage: '❌' };
  const labels = { call: 'Call', demo: 'Demo', deal: 'Deal (alt)', produkt: 'Produkt verkauft', visumat: 'VisuMat Paket verkauft', absage: 'Absage' };

  el.innerHTML = acts.map(a => {
    const profile = state.hkmProfiles[a.user_id];
    let detail = '';
    if (a.type === 'deal' || a.type === 'produkt' || a.type === 'visumat') detail = `${a.paket_name || ''} · CHF ${hkmFmt(a.paket_preis)} · ${a.zusage_kategorie || ''}`;
    if (a.type === 'absage') detail = a.absage_kategorie || '';
    if (a.notizen) detail += (detail ? ' · ' : '') + a.notizen;

    return `<div class="hkm-timeline-entry">
      <div class="hkm-timeline-icon">${icons[a.type] || '📝'}</div>
      <div class="hkm-timeline-content">
        <div class="hkm-timeline-title">${labels[a.type] || a.type}${profile ? ` (${profile.name})` : ''}</div>
        ${detail ? `<div class="hkm-timeline-detail">${detail}</div>` : ''}
        <div class="hkm-timeline-time">${hkmDateStr(a.createdAt)}</div>
      </div>
    </div>`;
  }).join('');
}

function closeHkmLeadDetail() {
  document.getElementById('hkmLeadDetailModal').style.display = 'none';
  state.hkmCurrentLeadId = null;
}

// ─── Lead Add/Edit Modal ──────────────────────────────────────────────────────

function openHkmLeadModal(leadId) {
  const modal = document.getElementById('hkmLeadModal');
  const lead = leadId ? state.hkmLeads.find(l => l.id === leadId) : null;
  const title = document.getElementById('hkmLeadModalTitle');
  title.textContent = lead ? 'Lead bearbeiten' : 'Neuer Lead';

  document.getElementById('hkmLeadEditId').value = lead?.id || '';
  document.getElementById('hkmLeadProjektname').value = lead?.projektname || '';
  document.getElementById('hkmLeadFirma').value = lead?.firma || '';
  document.getElementById('hkmLeadKontakt').value = lead?.kontaktperson || '';
  document.getElementById('hkmLeadEmail').value = lead?.email || '';
  document.getElementById('hkmLeadTel').value = lead?.telefon || '';
  document.getElementById('hkmLeadUrl').value = lead?.url || '';
  document.getElementById('hkmLeadRegion').value = lead?.region || '';
  document.getElementById('hkmLeadTyp').value = lead?.projekttyp || '';
  document.getElementById('hkmLeadAssigned').value = lead?.assigned_to || '';
  document.getElementById('hkmLeadStatus').value = lead?.status || 'neu';

  // Populate assigned dropdown
  const assignedEl = document.getElementById('hkmLeadAssigned');
  const currentVal = lead?.assigned_to || '';
  assignedEl.innerHTML = '<option value="">Nicht zugewiesen</option>' +
    Object.entries(state.hkmProfiles).map(([uid, p]) =>
      `<option value="${uid}" ${uid === currentVal ? 'selected' : ''}>${p.name || uid}</option>`
    ).join('');

  modal.style.display = 'flex';
}

function closeHkmLeadModal() {
  document.getElementById('hkmLeadModal').style.display = 'none';
}

async function hkmDeleteLead(leadId, name) {
  if (!hkmIsAdmin()) { showToast('Nur Admins dürfen Leads löschen'); return; }
  if (!confirm(`Lead "${name}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`)) return;
  try {
    await window.deleteHkmLead(leadId);
    showToast('🗑️ Lead gelöscht');
    renderHkmLeads();
  } catch(e) {
    showToast('❌ Fehler: ' + e.message);
  }
}
window.hkmDeleteLead = hkmDeleteLead;

async function saveHkmLeadFromModal() {
  const id = document.getElementById('hkmLeadEditId').value;
  const lead = {
    id: id || null,
    projektname:   document.getElementById('hkmLeadProjektname').value.trim(),
    firma:         document.getElementById('hkmLeadFirma').value.trim(),
    kontaktperson: document.getElementById('hkmLeadKontakt').value.trim(),
    email:         document.getElementById('hkmLeadEmail').value.trim(),
    telefon:       document.getElementById('hkmLeadTel').value.trim(),
    url:           document.getElementById('hkmLeadUrl').value.trim(),
    region:        document.getElementById('hkmLeadRegion').value,
    projekttyp:    document.getElementById('hkmLeadTyp').value.trim(),
    assigned_to:   document.getElementById('hkmLeadAssigned').value || null,
    status:        document.getElementById('hkmLeadStatus').value || 'neu',
    is_complete:   !!(document.getElementById('hkmLeadProjektname').value.trim() && document.getElementById('hkmLeadFirma').value.trim() && document.getElementById('hkmLeadKontakt').value.trim() && document.getElementById('hkmLeadRegion').value),
    created_by:    hkmOwnUid()
  };

  if (!lead.projektname && !lead.firma) {
    showToast('Bitte mindestens Projektname oder Firma eingeben');
    return;
  }

  try {
    await window.saveHkmLead(lead);
    closeHkmLeadModal();
    showToast('✅ Lead gespeichert');
  } catch (e) {
    showToast('❌ Fehler: ' + e.message);
  }
}

// ─── Activity Modal ───────────────────────────────────────────────────────────

function openHkmActivityModal(leadId) {
  state.hkmCurrentLeadId = leadId || state.hkmCurrentLeadId;
  const lead = state.hkmLeads.find(l => l.id === state.hkmCurrentLeadId);
  const modal = document.getElementById('hkmActivityModal');
  document.getElementById('hkmActivityLeadName').textContent =
    lead ? `${lead.projektname || ''} · ${lead.firma || ''}`.replace(/^·\s*|\s*·\s*$/, '') : '';
  document.getElementById('hkmActivityType').value = 'call';
  const callRadio = document.getElementById('hkmActTypeCall');
  if (callRadio) callRadio.checked = true;
  document.getElementById('hkmActivityNotizen').value = '';
  document.getElementById('hkmActivityCallResult').value = '';
  document.getElementById('hkmActivityDemoDate').value = '';
  document.getElementById('hkmActivityPaketName').value = '';
  document.getElementById('hkmActivityPaketPreis').value = '';
  document.getElementById('hkmActivityZusageKat').value = '';
  document.getElementById('hkmActivityZusageTxt').value = '';
  document.getElementById('hkmActivityAbsageKat').value = '';
  document.getElementById('hkmActivityAbsageTxt').value = '';
  hkmToggleActivityFields('call');
  modal.style.display = 'flex';
}

function closeHkmActivityModal() {
  document.getElementById('hkmActivityModal').style.display = 'none';
}

function hkmToggleActivityFields(type) {
  document.getElementById('hkmFieldsCall').style.display   = type === 'call'                               ? 'block' : 'none';
  document.getElementById('hkmFieldsDemo').style.display   = type === 'demo'                               ? 'block' : 'none';
  document.getElementById('hkmFieldsDeal').style.display   = (type === 'deal' || type === 'produkt' || type === 'visumat') ? 'block' : 'none';
  document.getElementById('hkmFieldsAbsage').style.display = type === 'absage'                             ? 'block' : 'none';
}

async function saveHkmActivityFromModal() {
  const type = document.getElementById('hkmActivityType').value;
  const leadId = state.hkmCurrentLeadId;
  if (!leadId) { showToast('Kein Lead ausgewählt'); return; }

  const activity = {
    lead_id:  leadId,
    user_id:  hkmOwnUid(),
    type,
    notizen:  document.getElementById('hkmActivityNotizen').value.trim() || null,
    createdAt: new Date().toISOString()
  };

  if (type === 'call') {
    activity.result = document.getElementById('hkmActivityCallResult').value || null;
  }
  if (type === 'demo') {
    activity.demo_date = document.getElementById('hkmActivityDemoDate').value || null;
  }
  if (type === 'deal' || type === 'produkt' || type === 'visumat') {
    const preis = parseFloat(document.getElementById('hkmActivityPaketPreis').value);
    if (!preis || preis <= 0) { showToast('Bitte Paketpreis eingeben'); return; }
    const zusageKat = document.getElementById('hkmActivityZusageKat').value;
    if (!zusageKat) { showToast('Bitte Zusage-Kategorie wählen'); return; }
    activity.paket_name         = document.getElementById('hkmActivityPaketName').value || null;
    activity.paket_preis        = preis;
    activity.zusage_kategorie   = zusageKat;
    activity.zusage_grund       = document.getElementById('hkmActivityZusageTxt').value.trim() || null;
  }
  if (type === 'absage') {
    activity.absage_kategorie = document.getElementById('hkmActivityAbsageKat').value || null;
    activity.absage_grund     = document.getElementById('hkmActivityAbsageTxt').value.trim() || null;
  }

  try {
    await window.saveHkmActivity(activity);
    closeHkmActivityModal();
    renderHkmLeadActivities(leadId);
    const isDealType = type === 'deal' || type === 'produkt' || type === 'visumat';
    showToast(isDealType ? '🦴 Verkauf gespeichert! Knochen werden vergeben...' : '✅ Aktivität gespeichert');
    // Auto-download ICS for demo
    if (type === 'demo' && activity.demo_date) {
      const lead = state.hkmLeads.find(l => l.id === leadId);
      if (lead) hkmDownloadDemoIcs(activity, lead);
    }
  } catch (e) {
    showToast('❌ Fehler: ' + e.message);
  }
}

// ─── Analytics ───────────────────────────────────────────────────────────────

function renderHkmAnalytics() {
  const fromEl   = document.getElementById('hkmAnalyticsFrom');
  const toEl     = document.getElementById('hkmAnalyticsTo');
  const memberEl = document.getElementById('hkmAnalyticsMember');

  const now = new Date();
  if (!fromEl?.value) {
    const d = new Date(now); d.setDate(1);
    if (fromEl) fromEl.value = d.toISOString().split('T')[0];
  }
  if (!toEl?.value) {
    if (toEl) toEl.value = now.toISOString().split('T')[0];
  }

  // Populate member filter
  if (memberEl) {
    const cur = memberEl.value;
    memberEl.innerHTML = '<option value="">Alle Mitarbeiter</option>' +
      Object.entries(state.hkmProfiles).map(([uid, p]) =>
        `<option value="${uid}" ${uid === cur ? 'selected' : ''}>${p.name||uid}</option>`
      ).join('');
    memberEl.value = cur;
  }

  const fromDate = fromEl?.value ? new Date(fromEl.value + 'T00:00:00') : new Date(0);
  const toDate   = toEl?.value   ? new Date(toEl.value + 'T23:59:59')   : new Date();
  const filterUid = memberEl?.value || '';

  let acts = state.hkmActivities.filter(a => {
    const t = new Date(a.createdAt);
    return t >= fromDate && t <= toDate && (!filterUid || a.user_id === filterUid);
  });

  const calls   = acts.filter(a => a.type === 'call').length;
  const demos   = acts.filter(a => a.type === 'demo').length;
  const deals   = acts.filter(a => a.type === 'deal');
  const absagen = acts.filter(a => a.type === 'absage').length;
  const revenue = deals.reduce((s, a) => s + (a.paket_preis || 0), 0);
  const total   = acts.length;
  const absageQuote = total > 0 ? Math.round(absagen / total * 100) : 0;

  // Profile for provision
  const uid = filterUid || hkmOwnUid();
  const profile = uid ? state.hkmProfiles[uid] : null;
  const rang = profile ? getRangByKnochen(profile.knochen || 0) : RANG_STUFEN[0];
  const provision = Math.round(revenue * rang.provision / 100);

  const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setText('hkmKpiCalls',    calls);
  setText('hkmKpiDemos',    demos);
  setText('hkmKpiDeals',    deals.length);
  setText('hkmKpiRevenue',  'CHF ' + hkmFmt(revenue));
  setText('hkmKpiProvision','CHF ' + hkmFmt(provision));
  setText('hkmKpiAbsage',   absageQuote + '%');

  renderHkmBarChart('hkmAbsageChart', HKM_ABSAGE_KATEGORIEN, acts.filter(a => a.type === 'absage'), 'absage_kategorie', '#ef4444');
  renderHkmBarChart('hkmZusageChart', HKM_ZUSAGE_KATEGORIEN, deals, 'zusage_kategorie', '#10b981');
  renderHkmPaketChart(deals);
  renderHkmPrognose(uid);
  renderHkmTimeChart(acts);
}

function renderHkmBarChart(containerId, kategorien, acts, field, color) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const counts = {};
  kategorien.forEach(k => counts[k.value] = 0);
  acts.forEach(a => { if (a[field]) counts[a[field]] = (counts[a[field]] || 0) + 1; });
  const max = Math.max(...Object.values(counts), 1);

  el.innerHTML = kategorien.map(k => {
    const count = counts[k.value] || 0;
    const pct = Math.round(count / max * 100);
    return `<div class="hkm-bar-row">
      <div class="hkm-bar-label">${k.label}</div>
      <div class="hkm-bar-track">
        <div class="hkm-bar-fill" style="width:${pct}%;background:${color}"></div>
      </div>
      <div class="hkm-bar-count">${count}</div>
    </div>`;
  }).join('');
}

function renderHkmPaketChart(dealActs) {
  const el = document.getElementById('hkmPaketChart');
  if (!el) return;
  const counts = {};
  dealActs.forEach(a => {
    const p = a.paket_name || 'Sonstiges';
    counts[p] = (counts[p] || 0) + 1;
  });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const max = sorted[0]?.[1] || 1;

  if (!sorted.length) { el.innerHTML = '<div class="hkm-empty">Keine Deals im Zeitraum</div>'; return; }

  el.innerHTML = sorted.map(([name, count]) => {
    const pct = Math.round(count / max * 100);
    return `<div class="hkm-bar-row">
      <div class="hkm-bar-label">${name}</div>
      <div class="hkm-bar-track">
        <div class="hkm-bar-fill" style="width:${pct}%;background:#f59e0b"></div>
      </div>
      <div class="hkm-bar-count">${count}</div>
    </div>`;
  }).join('');
}

function renderHkmPrognose(uid) {
  const el = document.getElementById('hkmPrognoseBox');
  if (!el || !uid) return;
  const profile = state.hkmProfiles[uid];
  if (!profile) { el.innerHTML = '<div class="hkm-empty">Kein Profil gefunden</div>'; return; }

  const knochen = profile.knochen || 0;
  const rang = getRangByKnochen(knochen);
  const nextRang = getNextRang(rang.key);

  // Knochen per week (last 4 weeks)
  const fourWeeksAgo = new Date(Date.now() - 28 * 86400000);
  const recentDeals = state.hkmActivities.filter(a =>
    a.user_id === uid && a.type === 'deal' && new Date(a.createdAt) > fourWeeksAgo
  );
  const knochenLast4Weeks = recentDeals.length * 2; // approximation
  const knochenPerWeek = knochenLast4Weeks / 4;

  let prognoseHtml = '';
  if (nextRang) {
    const missing = nextRang.min - knochen;
    const weeksEta = knochenPerWeek > 0 ? Math.ceil(missing / knochenPerWeek) : null;
    prognoseHtml = `
      <div class="hkm-prognose-stat">
        <span>🦴 Noch bis ${nextRang.icon} ${nextRang.label}</span>
        <strong>${missing} Knochen</strong>
      </div>
      <div class="hkm-prognose-stat">
        <span>💰 Aufstiegsbonus</span>
        <strong>CHF ${hkmFmt(nextRang.bonus)}</strong>
      </div>
      ${weeksEta ? `<div class="hkm-prognose-stat"><span>📈 ETA (ca.)</span><strong>${weeksEta} Wochen</strong></div>` : ''}
      <div class="hkm-prognose-stat">
        <span>📊 ø Knochen / Woche</span>
        <strong>${knochenPerWeek.toFixed(1)}</strong>
      </div>`;
  } else {
    prognoseHtml = `<div style="color:#f59e0b;font-weight:700;text-align:center;padding:12px;">🏆 Du bist auf dem höchsten Rang!</div>`;
  }
  el.innerHTML = prognoseHtml;
}

function renderHkmTimeChart(acts) {
  const el = document.getElementById('hkmTimeChart');
  if (!el) return;
  // Last 8 weeks: deals per week
  const weeks = [];
  for (let i = 7; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i * 7);
    const weekLabel = `KW${Math.ceil((d - new Date(d.getFullYear(), 0, 1)) / 604800000)}`;
    const weekStart = new Date(d); weekStart.setDate(d.getDate() - 6);
    const count = acts.filter(a => a.type === 'deal' && new Date(a.createdAt) >= weekStart && new Date(a.createdAt) <= d).length;
    weeks.push({ label: weekLabel, count });
  }
  const max = Math.max(...weeks.map(w => w.count), 1);
  el.innerHTML = `<div style="display:flex;align-items:flex-end;gap:6px;height:80px;">` +
    weeks.map(w => {
      const h = Math.round(w.count / max * 70);
      return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;">
        <span style="font-size:10px;color:var(--muted);">${w.count||''}</span>
        <div style="width:100%;height:${h}px;background:#f59e0b;border-radius:3px 3px 0 0;min-height:${w.count?4:0}px;"></div>
        <span style="font-size:9px;color:var(--muted);">${w.label}</span>
      </div>`;
    }).join('') + '</div>';
}

// ─── Challenges ──────────────────────────────────────────────────────────────

function renderHkmChallenges() {
  const el = document.getElementById('hkmChallengesContent');
  if (!el) return;
  const now = new Date();

  const active = state.hkmChallenges.filter(c => c.status === 'aktiv' && new Date(c.end_date) >= now);
  const completed = state.hkmChallenges.filter(c => c.status !== 'aktiv' || new Date(c.end_date) < now);

  let html = '';

  if (hkmIsAdmin()) {
    html += `<div style="text-align:right;margin-bottom:16px;">
      <button class="btn primary" onclick="openHkmChallengeModal()">+ Neue Challenge</button>
    </div>`;
  }

  if (active.length) {
    html += '<h4 style="margin:0 0 12px;font-size:13px;color:var(--text);">Aktive Challenges</h4>';
    html += active.map(c => {
      const daysLeft = Math.max(0, Math.ceil((new Date(c.end_date) - now) / 86400000));
      const winner = c.winner_uid ? state.hkmProfiles[c.winner_uid]?.name : null;
      return `<div class="hkm-challenge-card hkm-challenge-active">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
          <div>
            <div style="font-weight:700;font-size:15px;">⚔️ ${c.titel}</div>
            <div style="font-size:12px;color:var(--muted);margin-top:4px;">${c.beschreibung||''}</div>
          </div>
          <div style="text-align:right;font-size:12px;">
            <div style="color:#f59e0b;font-weight:700;">Noch ${daysLeft} Tag${daysLeft!==1?'e':''}</div>
            <div style="color:var(--muted);">Einsatz: 🦴 ${c.knochen_einsatz}</div>
          </div>
        </div>
        <div style="margin-top:12px;font-size:12px;color:var(--muted);">
          Typ: ${c.typ === 'demos' ? 'Meiste Demos' : 'Meiste Deals'} ·
          ${hkmDateStr(c.start_date)} bis ${hkmDateStr(c.end_date)}
        </div>
        ${hkmIsAdmin() ? `<div style="margin-top:12px;">
          <button class="btn" style="font-size:12px;" onclick="openHkmCompleteChallengeModal('${c.id}')">Challenge abschliessen</button>
        </div>` : ''}
      </div>`;
    }).join('');
  }

  if (completed.length) {
    html += '<h4 style="margin:16px 0 12px;font-size:13px;color:var(--text);">Abgeschlossene Challenges</h4>';
    html += '<div style="border:1px solid var(--line);border-radius:10px;overflow:hidden;">';
    html += completed.slice(-10).reverse().map(c => {
      const winner = c.winner_uid ? state.hkmProfiles[c.winner_uid]?.name || '?' : '–';
      const loser  = c.loser_uid  ? state.hkmProfiles[c.loser_uid]?.name  || '?' : '–';
      return `<div style="padding:10px 16px;border-bottom:1px solid var(--line);display:flex;gap:16px;align-items:center;">
        <span style="font-size:11px;color:var(--muted);white-space:nowrap;">${hkmDateStr(c.end_date)}</span>
        <span style="flex:1;font-size:13px;">${c.titel}</span>
        <span style="font-size:12px;color:#10b981;">🏆 ${winner}</span>
        <span style="font-size:12px;color:var(--muted);">🦴 ${c.knochen_einsatz}</span>
      </div>`;
    }).join('');
    html += '</div>';
  }

  if (!active.length && !completed.length) {
    html += '<div class="hkm-empty">Noch keine Challenges vorhanden.</div>';
  }

  el.innerHTML = html;
}

// Challenge modal
function openHkmChallengeModal() {
  const modal = document.getElementById('hkmChallengeModal');
  document.getElementById('hkmChallengeTitle').value = '';
  document.getElementById('hkmChallengeDesc').value = '';
  document.getElementById('hkmChallengeTyp').value = 'demos';
  document.getElementById('hkmChallengeEinsatz').value = '5';
  const today = new Date().toISOString().split('T')[0];
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
  document.getElementById('hkmChallengeStart').value = today;
  document.getElementById('hkmChallengeEnd').value = nextWeek;
  modal.style.display = 'flex';
}

function closeHkmChallengeModal() {
  document.getElementById('hkmChallengeModal').style.display = 'none';
}

async function saveHkmChallengeFromModal() {
  const ch = {
    titel:         document.getElementById('hkmChallengeTitle').value.trim(),
    beschreibung:  document.getElementById('hkmChallengeDesc').value.trim(),
    typ:           document.getElementById('hkmChallengeTyp').value,
    knochen_einsatz: parseInt(document.getElementById('hkmChallengeEinsatz').value) || 5,
    start_date:    document.getElementById('hkmChallengeStart').value,
    end_date:      document.getElementById('hkmChallengeEnd').value,
    status:        'aktiv',
    winner_uid:    null,
    loser_uid:     null,
    createdAt:     new Date().toISOString()
  };
  if (!ch.titel) { showToast('Bitte Titel eingeben'); return; }
  try {
    await window.saveHkmChallenge(ch);
    closeHkmChallengeModal();
    renderHkmChallenges();
    showToast('✅ Challenge erstellt');
  } catch (e) { showToast('❌ Fehler: ' + e.message); }
}

// Complete challenge modal
function openHkmCompleteChallengeModal(challengeId) {
  const ch = state.hkmChallenges.find(c => c.id === challengeId);
  if (!ch) return;
  const profiles = Object.entries(state.hkmProfiles).map(([uid, p]) => ({ uid, ...p }));
  const actInRange = state.hkmActivities.filter(a => {
    const t = new Date(a.createdAt);
    return t >= new Date(ch.start_date) && t <= new Date(ch.end_date);
  });
  const counts = {};
  profiles.forEach(p => counts[p.uid] = 0);
  actInRange.forEach(a => {
    if (ch.typ === 'demos' && a.type === 'demo') counts[a.user_id] = (counts[a.user_id] || 0) + 1;
    if (ch.typ === 'deals' && a.type === 'deal') counts[a.user_id] = (counts[a.user_id] || 0) + 1;
  });
  const sorted = profiles.sort((a, b) => (counts[b.uid] || 0) - (counts[a.uid] || 0));
  const modal = document.getElementById('hkmCompleteChallengeModal');
  document.getElementById('hkmCompleteChallengeId').value = challengeId;
  document.getElementById('hkmCompleteChallengeInfo').innerHTML = `
    <div style="margin-bottom:12px;"><strong>${ch.titel}</strong> · Einsatz: 🦴 ${ch.knochen_einsatz}</div>
    ${sorted.map(p => `<div style="padding:6px 0;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;">
      <span>${p.name||'?'}</span>
      <span style="font-weight:700;">${counts[p.uid]||0} ${ch.typ === 'demos' ? 'Demos' : 'Deals'}</span>
    </div>`).join('')}`;
  const winnerEl = document.getElementById('hkmCompleteWinner');
  winnerEl.innerHTML = '<option value="">Gewinner wählen...</option>' +
    sorted.map(p => `<option value="${p.uid}">${p.name||'?'}</option>`).join('');
  if (sorted[0]) winnerEl.value = sorted[0].uid;
  modal.style.display = 'flex';
}

function closeHkmCompleteChallengeModal() {
  document.getElementById('hkmCompleteChallengeModal').style.display = 'none';
}

async function confirmHkmChallengeComplete() {
  const challengeId = document.getElementById('hkmCompleteChallengeId').value;
  const winnerUid   = document.getElementById('hkmCompleteWinner').value;
  if (!winnerUid) { showToast('Bitte Gewinner wählen'); return; }
  const ch = state.hkmChallenges.find(c => c.id === challengeId);
  if (!ch) return;
  const profiles = Object.entries(state.hkmProfiles).map(([uid]) => uid);
  const loserUid = profiles.find(uid => uid !== winnerUid) || null;
  try {
    await window.completeHkmChallenge(challengeId, winnerUid, loserUid, ch.knochen_einsatz);
    closeHkmCompleteChallengeModal();
    renderHkmChallenges();
    showToast('✅ Challenge abgeschlossen');
  } catch (e) { showToast('❌ Fehler: ' + e.message); }
}

// ─── Admin Panel ──────────────────────────────────────────────────────────────

function renderHkmAdmin() {
  if (!hkmIsAdmin()) {
    document.getElementById('hkmAdminView').innerHTML = '<div class="hkm-empty">Nur für Admins</div>';
    return;
  }
  hkmPopulateImportAssign();
  renderHkmAdminProfiles();
  renderHkmMonthlyReset();
}

function renderHkmAdminProfiles() {
  const el = document.getElementById('hkmAdminProfiles');
  if (!el) return;
  const profiles = Object.entries(state.hkmProfiles).map(([uid, p]) => ({ uid, ...p }));

  // Find CRM users not yet in HKM
  const registeredUids = new Set(profiles.map(p => p.uid));
  const unregistered = (state.userAccounts || []).filter(u => u.uid && !registeredUids.has(u.uid));

  const profilesHtml = profiles.length === 0
    ? '<div class="hkm-empty" style="padding:16px;">Noch keine HKM-Profile vorhanden.</div>'
    : `<div style="border:1px solid var(--line);border-radius:10px;overflow:hidden;">
    <table style="width:100%;">
      <thead><tr style="background:rgba(245,158,11,.06);">
        <th>Name</th><th>Rang</th><th>🦴 Knochen</th><th>🐱 Katzen</th><th>💰 Provision</th><th>🔥 Streak</th><th>Rolle</th><th>Aktionen</th>
      </tr></thead>
      <tbody>
        ${profiles.map(p => {
          const rang = getRangByKnochen(p.knochen || 0);
          return `<tr>
            <td><strong>${p.name||'?'}</strong></td>
            <td>${rang.icon} ${rang.label}</td>
            <td style="color:#f59e0b;font-weight:700;">${p.knochen||0}</td>
            <td>${p.katzen_count||0}</td>
            <td>CHF ${hkmFmt(p.provision_total||0)}</td>
            <td>${p.streak_days||0}</td>
            <td><span style="font-size:11px;padding:2px 8px;border-radius:999px;background:${p.role==='admin'?'rgba(245,158,11,.15)':'rgba(107,114,128,.1)'};color:${p.role==='admin'?'#f59e0b':'var(--muted)'};">${p.role||'user'}</span></td>
            <td style="display:flex;gap:6px;flex-wrap:wrap;">
              <button class="btn" style="font-size:11px;padding:3px 8px;" onclick="openHkmAdjustKnochenModal('${p.uid}')">🦴</button>
              <button class="btn" style="font-size:11px;padding:3px 8px;" onclick="hkmRenameProfile('${p.uid}','${(p.name||'').replace(/'/g,'')}')">✏️ Name</button>
              <button class="btn" style="font-size:11px;padding:3px 8px;" onclick="toggleHkmRole('${p.uid}','${p.role||'user'}')">${p.role==='admin'?'→ User':'→ Admin'}</button>
            </td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
  </div>`;

  const unregisteredHtml = unregistered.length === 0 ? '' : `
    <div style="margin-top:16px;">
      <div style="font-size:12px;font-weight:700;color:var(--muted);margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px;">Noch nicht im HKM-System</div>
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${unregistered.map(u => `
          <div style="display:flex;align-items:center;gap:10px;padding:10px;border:1px dashed var(--line);border-radius:8px;background:var(--bg);">
            <div style="flex:1;">
              <input type="text" id="hkmNewName_${u.uid}" value="${(u.name||'').replace(/"/g,'&quot;')}" placeholder="Echter Name..." class="input-field" style="margin:0;font-weight:600;font-size:13px;max-width:220px;">
              <div style="font-size:11px;color:var(--muted);margin-top:2px;">${u.email || u.uid}</div>
            </div>
            <button class="btn good" style="font-size:11px;padding:4px 12px;white-space:nowrap;" onclick="hkmAddUserToSystem('${u.uid}','${(u.email||'').replace(/'/g,'')}')">➕ Zu HKM hinzufügen</button>
          </div>`).join('')}
      </div>
    </div>`;

  el.innerHTML = profilesHtml + unregisteredHtml;
}

window.hkmAddUserToSystem = async function(uid, email) {
  const nameInput = document.getElementById(`hkmNewName_${uid}`);
  const name = nameInput?.value.trim() || email || uid;
  if (!name || name === 'Dein Name') {
    nameInput?.focus();
    showToast('⚠️ Bitte zuerst den echten Namen eingeben');
    return;
  }
  try {
    await window.hkmCreateProfile(uid, name, email);
    showToast(`✅ ${name} zum HKM-System hinzugefügt`);
    renderHkmAdmin();
  } catch(e) {
    showToast('❌ Fehler: ' + e.message);
  }
};

window.hkmRenameProfile = async function(uid, currentName) {
  const newName = prompt('Neuer Name für dieses Profil:', currentName || '');
  if (!newName || !newName.trim() || newName.trim() === currentName) return;
  try {
    await window.setHkmProfileName(uid, newName.trim());
    showToast(`✅ Name auf "${newName.trim()}" geändert`);
    renderHkmAdmin();
  } catch(e) {
    showToast('❌ Fehler: ' + e.message);
  }
};

function renderHkmMonthlyReset() {
  const el = document.getElementById('hkmMonthlyReset');
  if (!el) return;
  const profiles = Object.entries(state.hkmProfiles).map(([uid, p]) => ({ uid, ...p }));
  if (profiles.length < 2) { el.innerHTML = ''; return; }
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const calcMonthRevenue = (uid) =>
    state.hkmActivities.filter(a => a.user_id === uid && a.type === 'deal' && new Date(a.createdAt) >= monthStart)
      .reduce((s, a) => s + (a.paket_preis || 0), 0);

  const withRevenue = profiles.map(p => ({ ...p, monthRev: calcMonthRevenue(p.uid) }))
    .sort((a, b) => a.monthRev - b.monthRev);
  const loser = withRevenue[0];

  el.innerHTML = `
    <div class="hkm-challenge-card" style="border-color:#ef4444;">
      <h4 style="margin:0 0 12px;font-size:13px;">Monats-Reset</h4>
      ${withRevenue.map(p => `<div style="display:flex;justify-content:space-between;padding:4px 0;">
        <span>${p.name||'?'}</span>
        <span>CHF ${hkmFmt(p.monthRev)}</span>
      </div>`).join('')}
      <div style="margin-top:12px;font-size:12px;color:#ef4444;">
        Verlierer: <strong>${loser.name||'?'}</strong> verliert 5 🦴 (nicht übertragen)
      </div>
      <button class="btn" style="margin-top:12px;border-color:#ef4444;color:#ef4444;" onclick="confirmHkmMonthlyReset('${loser.uid}')">
        Monats-Reset durchführen
      </button>
    </div>`;
}

function openHkmAdjustKnochenModal(uid) {
  const profile = state.hkmProfiles[uid];
  if (!profile) return;
  const modal = document.getElementById('hkmAdjustModal');
  document.getElementById('hkmAdjustUid').value = uid;
  document.getElementById('hkmAdjustName').textContent = profile.name || uid;
  document.getElementById('hkmAdjustCurrent').textContent = profile.knochen || 0;
  document.getElementById('hkmAdjustAmount').value = '';
  document.getElementById('hkmAdjustGrund').value = '';
  modal.style.display = 'flex';
}

function closeHkmAdjustModal() {
  document.getElementById('hkmAdjustModal').style.display = 'none';
}

async function saveHkmKnochenAdjust() {
  const uid    = document.getElementById('hkmAdjustUid').value;
  const amount = parseInt(document.getElementById('hkmAdjustAmount').value);
  const grund  = document.getElementById('hkmAdjustGrund').value.trim();
  if (!amount) { showToast('Bitte Anzahl eingeben'); return; }
  if (!grund)  { showToast('Bitte Grund eingeben'); return; }
  try {
    await window.adjustHkmKnochen(uid, amount, grund);
    closeHkmAdjustModal();
    showToast(`✅ ${amount > 0 ? '+' : ''}${amount} 🦴 für ${state.hkmProfiles[uid]?.name || uid}`);
    renderHkmAdmin();
    renderHkmLeaderboard();
  } catch (e) { showToast('❌ Fehler: ' + e.message); }
}

async function toggleHkmRole(uid, currentRole) {
  const newRole = currentRole === 'admin' ? 'user' : 'admin';
  if (!confirm(`Rolle von ${state.hkmProfiles[uid]?.name || uid} auf "${newRole}" ändern?`)) return;
  try {
    await window.setHkmRole(uid, newRole);
    showToast(`✅ Rolle auf ${newRole} gesetzt`);
    renderHkmAdmin();
  } catch (e) { showToast('❌ Fehler: ' + e.message); }
}

async function confirmHkmMonthlyReset(loserUid) {
  const name = state.hkmProfiles[loserUid]?.name || loserUid;
  if (!confirm(`Monats-Reset: ${name} verliert 5 🦴. Fortfahren?`)) return;
  try {
    await window.adjustHkmKnochen(loserUid, -5, 'Monats-Reset (niedrigster Umsatz)');
    showToast('✅ Monats-Reset durchgeführt');
    renderHkmAdmin();
    renderHkmLeaderboard();
  } catch (e) { showToast('❌ Fehler: ' + e.message); }
}

// ─── Knochen Transfer Modal ────────────────────────────────────────────────────

function openHkmTransferModal() {
  const modal = document.getElementById('hkmTransferModal');
  const profiles = Object.entries(state.hkmProfiles);
  const opts = profiles.map(([uid, p]) => `<option value="${uid}">${p.name||uid}</option>`).join('');
  document.getElementById('hkmTransferVon').innerHTML = opts;
  document.getElementById('hkmTransferZu').innerHTML = opts;
  document.getElementById('hkmTransferAnzahl').value = '';
  document.getElementById('hkmTransferGrund').value = '';
  modal.style.display = 'flex';
}

function closeHkmTransferModal() {
  document.getElementById('hkmTransferModal').style.display = 'none';
}

async function saveHkmTransfer() {
  const vonUid = document.getElementById('hkmTransferVon').value;
  const zuUid  = document.getElementById('hkmTransferZu').value;
  const anzahl = parseInt(document.getElementById('hkmTransferAnzahl').value);
  const grund  = document.getElementById('hkmTransferGrund').value.trim();
  if (vonUid === zuUid) { showToast('Von und Zu können nicht gleich sein'); return; }
  if (!anzahl || anzahl <= 0) { showToast('Bitte gültige Anzahl eingeben'); return; }
  if (!grund) { showToast('Bitte Grund eingeben'); return; }
  try {
    await window.transferHkmKnochen(vonUid, zuUid, anzahl, grund);
    closeHkmTransferModal();
    showToast(`✅ ${anzahl} 🦴 übertragen`);
    renderHkmAdmin();
    renderHkmLeaderboard();
  } catch (e) { showToast('❌ Fehler: ' + e.message); }
}

// ─── Celebration Animation ────────────────────────────────────────────────────

function triggerHkmCelebration(neuRang, bonusChf) {
  const overlay = document.getElementById('hkmCelebration');
  if (!overlay) return;
  const rang = RANG_STUFEN.find(r => r.key === neuRang) || RANG_STUFEN[0];

  overlay.innerHTML = `
    <div class="hkm-celebration-content" onclick="this.parentElement.style.display='none'">
      <div class="hkm-cel-icon">${rang.icon}</div>
      <div class="hkm-cel-rang">${rang.label.toUpperCase()}</div>
      <div class="hkm-cel-text">Du bist jetzt ${rang.label}!</div>
      ${bonusChf > 0 ? `<div class="hkm-cel-bonus">Aufstiegsbonus: CHF ${hkmFmt(bonusChf)}</div>` : ''}
      <div class="hkm-cel-close">Klicke zum Schliessen</div>
    </div>`;
  overlay.style.display = 'flex';

  if (typeof confetti !== 'undefined') {
    confetti({ particleCount: 200, spread: 100, origin: { y: 0.4 } });
  }
  setTimeout(() => { overlay.style.display = 'none'; }, 5000);
}

// Make accessible globally (called from firebase.js after rang update)
window.triggerHkmCelebration = triggerHkmCelebration;

// ─── Calendar View ───────────────────────────────────────────────────────────

state.hkmCalYear  = new Date().getFullYear();
state.hkmCalMonth = new Date().getMonth(); // 0-based

window.hkmCalNav = function(dir) {
  let m = state.hkmCalMonth + dir;
  let y = state.hkmCalYear;
  if (m < 0) { m = 11; y--; }
  if (m > 11) { m = 0; y++; }
  state.hkmCalMonth = m;
  state.hkmCalYear  = y;
  renderHkmCalendar();
};

function renderHkmCalendar() {
  const grid = document.getElementById('hkmCalendarGrid');
  const label = document.getElementById('hkmCalMonthLabel');
  if (!grid) return;

  const year = state.hkmCalYear, month = state.hkmCalMonth;
  if (label) label.textContent = new Date(year, month, 1).toLocaleDateString('de-CH', { month:'long', year:'numeric' });

  const filterEl = document.getElementById('hkmCalFilter');
  const filterVal = filterEl?.value || 'all';
  const ownUid = hkmOwnUid();

  // Collect all demo activities in this month
  const demosThisMonth = state.hkmActivities.filter(a => {
    if (a.type !== 'demo' || !a.demo_date) return false;
    if (filterVal === 'mine' && a.user_id !== ownUid) return false;
    const d = new Date(a.demo_date);
    return d.getFullYear() === year && d.getMonth() === month;
  });

  // Build date → demos map
  const dayMap = new Map();
  demosThisMonth.forEach(a => {
    const day = new Date(a.demo_date).getDate();
    if (!dayMap.has(day)) dayMap.set(day, []);
    const lead = state.hkmLeads.find(l => l.id === a.lead_id);
    const profile = state.hkmProfiles[a.user_id];
    dayMap.get(day).push({ activity: a, lead, profile });
  });

  // Calendar grid
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const startOffset = (firstDay === 0) ? 6 : firstDay - 1; // Mon-based
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const isThisMonth = today.getFullYear() === year && today.getMonth() === month;

  const DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  let html = `<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;">`;
  // Header
  DAYS.forEach(d => {
    html += `<div style="text-align:center;font-size:11px;font-weight:700;color:var(--muted);padding:4px;">${d}</div>`;
  });
  // Empty cells before month start
  for (let i = 0; i < startOffset; i++) html += `<div></div>`;
  // Day cells
  for (let day = 1; day <= daysInMonth; day++) {
    const isToday = isThisMonth && today.getDate() === day;
    const demos = dayMap.get(day) || [];
    const demoBadges = demos.slice(0, 3).map(d => {
      const name = d.lead?.projektname || d.lead?.firma || 'Demo';
      const time = d.activity.demo_date?.includes('T') ? new Date(d.activity.demo_date).toLocaleTimeString('de-CH', { hour:'2-digit', minute:'2-digit' }) : '';
      return `<div style="background:rgba(59,130,246,.15);color:#3b82f6;font-size:10px;padding:2px 5px;border-radius:4px;margin-top:2px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;" title="${name}">${time ? time+' ' : ''}${name}</div>`;
    }).join('');
    const moreCount = demos.length > 3 ? `<div style="font-size:9px;color:var(--muted);">+${demos.length-3} mehr</div>` : '';
    html += `<div style="min-height:70px;border:1px solid rgba(255,255,255,.06);border-radius:6px;padding:4px 6px;${isToday ? 'border-color:var(--accent);' : ''}">
      <div style="font-size:12px;font-weight:700;${isToday ? 'color:var(--accent);' : ''}">${day}</div>
      ${demoBadges}${moreCount}
    </div>`;
  }
  html += `</div>`;
  if (!demosThisMonth.length) {
    html += `<div style="text-align:center;color:var(--muted);font-size:13px;margin-top:16px;">Keine Demo-Termine in diesem Monat</div>`;
  }
  grid.innerHTML = html;
}

window.renderHkmCalendar = renderHkmCalendar;

window.hkmExportCalendarIcs = function() {
  const year = state.hkmCalYear, month = state.hkmCalMonth;
  const filterEl = document.getElementById('hkmCalFilter');
  const filterVal = filterEl?.value || 'all';
  const ownUid = hkmOwnUid();

  const demos = state.hkmActivities.filter(a => {
    if (a.type !== 'demo' || !a.demo_date) return false;
    if (filterVal === 'mine' && a.user_id !== ownUid) return false;
    const d = new Date(a.demo_date);
    return d.getFullYear() === year && d.getMonth() === month;
  });

  if (!demos.length) { showToast('Keine Demo-Termine in diesem Monat'); return; }

  const events = demos.map(a => {
    const lead = state.hkmLeads.find(l => l.id === a.lead_id) || {};
    const dtStart = hkmFormatIcsDate(a.demo_date);
    const dtEnd   = hkmAddMinutesToIcsDate(a.demo_date, 60);
    const summary = `Demo: ${lead.projektname || lead.firma || 'Lead'}`;
    const desc = [
      lead.firma         && `Firma: ${lead.firma}`,
      lead.kontaktperson && `Kontakt: ${lead.kontaktperson}`,
      lead.telefon       && `Tel: ${lead.telefon}`
    ].filter(Boolean).join('\\n');
    return [
      'BEGIN:VEVENT',
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${summary}`,
      desc ? `DESCRIPTION:${desc}` : '',
      `UID:demo-${a.lead_id}-${a.createdAt||Date.now()}@livetour`,
      `DTSTAMP:${hkmFormatIcsDate(new Date().toISOString().slice(0,16))}`,
      'END:VEVENT'
    ].filter(Boolean).join('\r\n');
  }).join('\r\n');

  const ics = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//liveTour//VisuMat Sales//DE\r\nCALSCALE:GREGORIAN\r\nMETHOD:PUBLISH\r\n${events}\r\nEND:VCALENDAR`;
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  const monthName = new Date(year, month, 1).toLocaleDateString('de-CH', { month:'long', year:'numeric' }).replace(' ', '_');
  a.download = `demos_${monthName}.ics`;
  a.click();
  URL.revokeObjectURL(a.href);
  showToast(`📅 ${demos.length} Demo${demos.length!==1?'s':''} exportiert`);
};

// ─── VisuMat Call-Session ─────────────────────────────────────────────────────

const HkmSession = {
  leads: [],
  idx: 0,
  active: false,

  start(leadIds) {
    this.leads = leadIds.map(id => state.hkmLeads.find(l => l.id === id)).filter(Boolean);
    if (!this.leads.length) { showToast('Keine Leads für Session ausgewählt'); return; }
    this.idx = 0;
    this.active = true;
    // Show session panel, hide leads table
    const panel = document.getElementById('hkmSessionPanel');
    const leadsView = document.getElementById('hkmLeadsView');
    if (panel) panel.style.display = 'block';
    if (leadsView) leadsView.style.display = 'none';
    // Make sure hkm section is active
    this.loadCurrent();
  },

  loadCurrent() {
    const lead = this.leads[this.idx];
    if (!lead) { this.end(); return; }
    const progress = `Lead ${this.idx + 1} / ${this.leads.length}`;
    document.getElementById('hkmSessionProgress').textContent = progress;
    document.getElementById('hkmSessionLeadName').textContent = lead.projektname || lead.firma || '(Unbekannt)';
    document.getElementById('hkmSessionFirma').textContent = lead.firma ? (lead.projektname ? `Firma: ${lead.firma}` : '') : '';
    const details = [
      lead.kontaktperson && `👤 ${lead.kontaktperson}`,
      lead.telefon       && `📞 ${lead.telefon}`,
      lead.email         && `📧 ${lead.email}`,
      lead.region        && `📍 ${HKM_REGIONS.find(r=>r.value===lead.region)?.label||lead.region}`
    ].filter(Boolean);
    document.getElementById('hkmSessionContact').innerHTML = details.map(d =>
      `<span style="background:rgba(255,255,255,.08);padding:3px 10px;border-radius:6px;font-size:12px;">${d}</span>`
    ).join('');
    document.getElementById('hkmSessionNotes').value = '';
    // Progress bar
    const pct = Math.round(((this.idx) / this.leads.length) * 100);
    const fill = document.getElementById('hkmSessionProgressFill');
    if (fill) fill.style.width = pct + '%';
    // Prev button
    const prevBtn = document.getElementById('hkmSessionPrevBtn');
    if (prevBtn) prevBtn.disabled = this.idx === 0;
  },

  async saveAndNext(result) {
    const lead = this.leads[this.idx];
    if (!lead) { this.next(); return; }
    const notes = document.getElementById('hkmSessionNotes')?.value.trim() || null;
    const activity = {
      lead_id:   lead.id,
      user_id:   hkmOwnUid(),
      type:      'call',
      result,
      notizen:   notes,
      createdAt: new Date().toISOString()
    };
    // Update lead status based on result
    const statusMap = { demo_gebucht: 'demo_gebucht', interesse: 'kontaktiert', kein_interesse: 'abgesagt', nicht_erreicht: 'kontaktiert', callback: 'kontaktiert' };
    const newStatus = statusMap[result];
    try {
      await window.saveHkmActivity(activity);
      if (newStatus && lead.status !== 'abgeschlossen') {
        await window.saveHkmLead({ ...lead, status: newStatus });
      }
      showToast(result === 'demo_gebucht' ? '📅 Demo gebucht!' : result === 'kein_interesse' ? '❌ Abgesagt' : '✅ Gespeichert');
    } catch(e) {
      showToast('❌ Fehler: ' + e.message);
    }
    this.next();
  },

  skipNext() {
    this.next();
  },

  next() {
    this.idx++;
    if (this.idx >= this.leads.length) {
      showToast(`✅ Session abgeschlossen! ${this.leads.length} Lead${this.leads.length!==1?'s':''} bearbeitet.`);
      this.end();
    } else {
      this.loadCurrent();
    }
  },

  prev() {
    if (this.idx > 0) {
      this.idx--;
      this.loadCurrent();
    }
  },

  end() {
    this.active = false;
    this.leads = [];
    this.idx = 0;
    const panel = document.getElementById('hkmSessionPanel');
    const leadsView = document.getElementById('hkmLeadsView');
    if (panel) panel.style.display = 'none';
    if (leadsView) leadsView.style.display = 'block';
    state.hkmBulkSelected.clear();
    renderHkmLeads();
  }
};

window.HkmSession = HkmSession;

window.hkmStartBulkSession = function() {
  const ids = [...state.hkmBulkSelected];
  if (!ids.length) { showToast('Bitte zuerst Leads auswählen'); return; }
  HkmSession.start(ids);
};

// ─── Import Log ──────────────────────────────────────────────────────────────

window.renderImportLog = function() {
  const container = document.getElementById('hkmImportLogContainer');
  if (!container) return;

  const leads = state.hkmLeads || [];
  // Group by importBatchId
  const batches = new Map();
  leads.forEach(l => {
    if (!l.importBatchId) return;
    if (!batches.has(l.importBatchId)) {
      batches.set(l.importBatchId, { id: l.importBatchId, leads: [], importedAt: l.importedAt });
    }
    batches.get(l.importBatchId).leads.push(l);
  });

  if (!batches.size) {
    container.innerHTML = '<div style="color:var(--muted);font-size:13px;">Keine importierten Batches gefunden.</div>';
    return;
  }

  const rows = [...batches.values()]
    .sort((a, b) => (b.importedAt||0) - (a.importedAt||0))
    .map(batch => {
      const date = batch.importedAt ? new Date(batch.importedAt).toLocaleString('de-CH', { dateStyle:'short', timeStyle:'short' }) : '–';
      return `<tr>
        <td style="font-size:12px;">${date}</td>
        <td style="font-size:11px;color:var(--muted);">${batch.id}</td>
        <td style="text-align:center;font-weight:700;">${batch.leads.length}</td>
        <td style="display:flex;gap:6px;">
          <button class="btn" style="padding:3px 10px;font-size:12px;" onclick="hkmExportBatch('${batch.id}')">📥 CSV</button>
          ${hkmIsAdmin() ? `<button class="btn" style="padding:3px 8px;font-size:12px;border-color:#ef4444;color:#ef4444;" onclick="hkmDeleteBatch('${batch.id}', ${batch.leads.length})">🗑️</button>` : ''}
        </td>
      </tr>`;
    }).join('');

  container.innerHTML = `<table style="width:100%;font-size:13px;">
    <thead><tr style="background:rgba(245,158,11,.06);">
      <th>Datum</th><th>Batch-ID</th><th>Leads</th><th>Aktionen</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
};

window.hkmExportBatch = function(batchId) {
  const origLeads = state.hkmLeads;
  state.hkmLeads = (origLeads || []).filter(l => l.importBatchId === batchId);
  window.hkmExportLeads('csv');
  state.hkmLeads = origLeads;
};

window.hkmDeleteBatch = async function(batchId, count) {
  if (!hkmIsAdmin()) { showToast('Nur Admins können Batches löschen'); return; }
  if (!confirm(`Batch mit ${count} Lead${count!==1?'s':''} löschen?`)) return;
  const toDelete = (state.hkmLeads || []).filter(l => l.importBatchId === batchId);
  let deleted = 0;
  for (const l of toDelete) {
    try { await window.deleteHkmLead(l.id); deleted++; } catch(e) { /* continue */ }
  }
  showToast(`🗑️ ${deleted} Lead${deleted!==1?'s':''} gelöscht`);
  renderImportLog();
  renderHkmLeads();
};

// ─── VisuMat Export ──────────────────────────────────────────────────────────

window.hkmExportLeads = function(format) {
  const leads = [...(state.hkmLeads || [])];
  if (!leads.length) { showToast('Keine Leads vorhanden'); return; }

  const dateStr = new Date().toISOString().split('T')[0];
  const statusLabels = { neu:'Neu', kontaktiert:'Kontaktiert', demo_gebucht:'Demo gebucht', abgeschlossen:'Gewonnen', abgesagt:'Abgesagt' };
  const actLabels = { call:'Call', demo:'Demo', deal:'Deal (alt)', produkt:'Produkt verkauft', visumat:'VisuMat Paket verkauft', absage:'Absage' };

  if (format === 'json') {
    const json = JSON.stringify(leads, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `visumat_leads_${dateStr}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('📥 JSON exportiert');
    return;
  }

  // CSV
  const headers = [
    'ID','Projektname','Firma','Kontaktperson','Email','Telefon',
    'Region','Projekttyp','URL','Status','Zugewiesen (Name)','Vollständig',
    'Erstellt','Letzte Aktivität','Anzahl Aktivitäten','Aktivitäten (Detail)','Import-Batch'
  ];
  const rows = leads.map(l => {
    const profile = l.assigned_to ? state.hkmProfiles[l.assigned_to] : null;
    const isComplete = !!(l.projektname && l.firma && l.kontaktperson && l.region);
    const acts = hkmGetLeadActivities(l.id).sort((a,b) => new Date(a.createdAt)-new Date(b.createdAt));
    const lastAct = acts[acts.length-1];
    const actsDetail = acts.map(a => {
      let d = `${actLabels[a.type]||a.type}`;
      if (a.result) d += ` (${a.result})`;
      if (a.paket_name) d += ` ${a.paket_name} CHF ${a.paket_preis||''}`;
      if (a.notizen) d += ` — ${a.notizen}`;
      d += ` [${a.createdAt ? new Date(a.createdAt).toLocaleDateString('de-CH') : ''}]`;
      return d;
    }).join(' | ');
    return [
      l.id, l.projektname, l.firma, l.kontaktperson, l.email, l.telefon,
      HKM_REGIONS.find(r=>r.value===l.region)?.label || l.region || '',
      l.projekttyp, l.url,
      statusLabels[l.status] || l.status || '',
      profile?.name || '',
      isComplete ? 'Ja' : 'Nein',
      l.createdAt ? new Date(l.createdAt).toLocaleDateString('de-CH') : '',
      lastAct?.createdAt ? new Date(lastAct.createdAt).toLocaleDateString('de-CH') : '',
      acts.length,
      actsDetail,
      l.importBatchId || ''
    ];
  });
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v||'').replaceAll('"','""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `visumat_leads_${dateStr}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
  showToast('📥 CSV exportiert');
};

// ─── ICS / Calendar ──────────────────────────────────────────────────────────

function hkmFormatIcsDate(dtStr) {
  // dtStr: "2026-05-01T14:30" → "20260501T143000"
  if (!dtStr) return '';
  return dtStr.replace(/[-:]/g, '').replace('T', 'T') + '00';
}

function hkmAddMinutesToIcsDate(dtStr, minutes) {
  // Add N minutes to a datetime-local string
  const d = new Date(dtStr);
  d.setMinutes(d.getMinutes() + minutes);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
}

function hkmDownloadDemoIcs(activity, lead) {
  const dtStr = activity.demo_date;
  if (!dtStr) return;
  const dtStart = hkmFormatIcsDate(dtStr);
  const dtEnd   = hkmAddMinutesToIcsDate(dtStr, 60);
  const summary = `Demo: ${lead.projektname || lead.firma || 'Lead'}`;
  const desc = [
    lead.firma        && `Firma: ${lead.firma}`,
    lead.kontaktperson && `Kontakt: ${lead.kontaktperson}`,
    lead.telefon      && `Tel: ${lead.telefon}`,
    lead.email        && `Email: ${lead.email}`
  ].filter(Boolean).join('\\n');
  const uid = `demo-${lead.id}-${Date.now()}@livetour`;
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//liveTour//VisuMat Sales//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${summary}`,
    desc ? `DESCRIPTION:${desc}` : '',
    `UID:${uid}`,
    `DTSTAMP:${hkmFormatIcsDate(new Date().toISOString().slice(0,16))}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].filter(Boolean).join('\r\n');

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeName = (lead.projektname || lead.firma || 'demo').replace(/[^a-zA-Z0-9_-]/g, '_');
  a.download = `demo_${safeName}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Lead Import (CSV / Excel) ────────────────────────────────────────────────

function hkmNormalizeHeader(h) {
  return h.toLowerCase()
    .replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss')
    .replace(/[^a-z0-9]/g,'');
}

function hkmMapRow(row, headers) {
  // Map normalized header → field
  const map = {
    projektname: 'projektname', projekt: 'projektname', projectname: 'projektname',
    firma: 'firma', company: 'firma', unternehmen: 'firma',
    kontakt: 'kontakt', kontaktperson: 'kontakt', contact: 'kontakt', ansprechpartner: 'kontakt',
    email: 'email', mail: 'email',
    telefon: 'telefon', tel: 'telefon', phone: 'telefon', mobile: 'telefon',
    region: 'region', revier: 'region', gebiet: 'region',
    url: 'url', website: 'url', webseite: 'url', homepage: 'url',
    notizen: 'notizen', notes: 'notizen', kommentar: 'notizen',
  };
  const out = {};
  headers.forEach((h, i) => {
    const norm = hkmNormalizeHeader(h);
    const field = map[norm];
    if (field && row[i] !== undefined && row[i] !== '') {
      out[field] = String(row[i]).trim();
    }
  });
  return out;
}

window.hkmDownloadImportTemplate = function() {
  const headers = ['Projektname','Firma','Kontaktperson','Email','Telefon','Region','URL','Notizen'];
  const csv = headers.join(';') + '\nBeispiel Projekt;Musterfirma AG;Max Muster;max@muster.ch;+41 79 000 00 00;zuerich;https://beispiel.ch;';
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'visumat_import_vorlage.csv'; a.click();
  URL.revokeObjectURL(url);
};

// Pending import state (used by duplicate modal)
let _hkmPendingImport = null;

window.hkmImportLeads = async function() {
  const fileInput = document.getElementById('hkmImportFile');
  const assignTo  = document.getElementById('hkmImportAssign')?.value || '';
  const resultEl  = document.getElementById('hkmImportResult');
  if (!fileInput?.files?.length) {
    if (resultEl) { resultEl.textContent = '⚠️ Bitte zuerst eine Datei auswählen.'; resultEl.style.display = ''; resultEl.style.background = 'rgba(234,88,12,.1)'; }
    return;
  }
  const file = fileInput.files[0];
  const name = file.name.toLowerCase();

  let rows = [];
  let headers = [];

  try {
    if (name.endsWith('.csv') || name.endsWith('.txt') || name.endsWith('.tsv')) {
      const text = await file.text();
      const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(l => l.trim());
      const delim = text.includes(';') ? ';' : (text.includes('\t') ? '\t' : ',');
      const parsed = lines.map(l => l.split(delim).map(c => c.replace(/^"|"$/g,'').trim()));
      headers = parsed[0];
      rows = parsed.slice(1);
    } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      const buf = await file.arrayBuffer();
      const wb  = XLSX.read(buf, { type: 'array' });
      const ws  = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      headers = data[0];
      rows = data.slice(1);
    } else {
      throw new Error('Dateiformat nicht unterstützt. Bitte CSV oder Excel verwenden.');
    }
  } catch(e) {
    if (resultEl) { resultEl.textContent = '❌ Fehler: ' + e.message; resultEl.style.display = ''; resultEl.style.background = 'rgba(239,68,68,.1)'; }
    return;
  }

  // Build leads array
  const batchId = 'import_' + Date.now();
  const mapped_leads = [];
  let parseSkipped = 0;
  for (const row of rows) {
    if (row.every(c => !String(c).trim())) { parseSkipped++; continue; }
    const mapped = hkmMapRow(row, headers);
    if (!mapped.projektname && !mapped.firma) { parseSkipped++; continue; }
    mapped_leads.push({
      projektname:   mapped.projektname || mapped.firma || '(Unbekannt)',
      firma:         mapped.firma || '',
      kontaktperson: mapped.kontakt || '',
      email:         mapped.email || '',
      telefon:       mapped.telefon || '',
      region:        mapped.region || '',
      url:           mapped.url || '',
      notizen:       mapped.notizen || '',
      typ:           'import',
      status:        'neu',
      assigned_to:   assignTo || null,
      checklist:     {},
      importBatchId: batchId,
      importedAt:    Date.now()
    });
  }

  if (!mapped_leads.length) {
    if (resultEl) { resultEl.textContent = `⚠️ Keine gültigen Zeilen gefunden (${parseSkipped} übersprungen).`; resultEl.style.display = ''; resultEl.style.background = 'rgba(234,88,12,.1)'; }
    return;
  }

  // Duplicate detection: key = lowercase(projektname+firma)
  const existingMap = new Map();
  (state.hkmLeads || []).forEach(l => {
    const key = ((l.projektname||'') + '|' + (l.firma||'')).toLowerCase().trim();
    if (key && key !== '|') existingMap.set(key, l);
  });

  const clean = [], dupes = [];
  mapped_leads.forEach(l => {
    const key = ((l.projektname||'') + '|' + (l.firma||'')).toLowerCase().trim();
    const existing = existingMap.get(key);
    if (existing) dupes.push({ incoming: l, existing });
    else clean.push(l);
  });

  if (dupes.length > 0) {
    // Show duplicate preview modal
    _hkmPendingImport = { clean, dupes, assignTo, resultEl, fileInput, batchId };
    hkmShowDupesModal(clean.length, dupes, parseSkipped);
  } else {
    await hkmExecuteImport(clean, [], resultEl, fileInput, parseSkipped);
  }
};

function hkmShowDupesModal(cleanCount, dupes, parseSkipped) {
  const modal = document.getElementById('hkmImportDupesModal');
  if (!modal) { console.warn('hkmImportDupesModal not found'); return; }
  document.getElementById('hkmDupeSummary').innerHTML =
    `<strong>${cleanCount}</strong> neue Leads + <strong>${dupes.length}</strong> mögliche Duplikate gefunden.
     <br>Wähle welche Duplikate trotzdem importiert werden sollen:`;
  const tbody = document.getElementById('hkmDupesBody');
  tbody.innerHTML = dupes.map((d, i) => `
    <tr>
      <td><input type="checkbox" id="hkmDupe_${i}" data-idx="${i}"></td>
      <td style="font-size:12px;"><strong>${d.incoming.projektname||'–'}</strong><br><span style="color:var(--muted)">${d.incoming.firma||''}</span></td>
      <td style="font-size:12px;">${d.incoming.kontaktperson||'–'}</td>
      <td style="font-size:11px;color:#f59e0b;">⚠️ Bereits vorhanden:<br>${d.existing.projektname||d.existing.firma||'–'}</td>
    </tr>`).join('');
  modal.style.display = 'flex';
}

window.hkmCancelImport = function() {
  document.getElementById('hkmImportDupesModal').style.display = 'none';
  _hkmPendingImport = null;
};

window.hkmConfirmImport = async function() {
  if (!_hkmPendingImport) return;
  const { clean, dupes, resultEl, fileInput, batchId } = _hkmPendingImport;
  // Collect checked dupes
  const checkedDupes = dupes.filter((_, i) => {
    const cb = document.getElementById(`hkmDupe_${i}`);
    return cb?.checked;
  }).map(d => d.incoming);
  document.getElementById('hkmImportDupesModal').style.display = 'none';
  _hkmPendingImport = null;
  const parseSkipped = 0;
  await hkmExecuteImport(clean, checkedDupes, resultEl, fileInput, parseSkipped);
};

async function hkmExecuteImport(clean, selectedDupes, resultEl, fileInput, parseSkipped) {
  const toImport = [...clean, ...selectedDupes];
  let imported = 0, failed = 0;
  for (const lead of toImport) {
    try { await window.saveHkmLead(lead); imported++; } catch(e) { failed++; }
  }
  const skippedTotal = (toImport.length === 0 ? parseSkipped : parseSkipped + (clean.length - imported + failed));
  if (resultEl) {
    resultEl.textContent = `✅ ${imported} Lead${imported!==1?'s':''} importiert${(parseSkipped+failed)>0 ? ` · ${parseSkipped+failed} übersprungen` : ''}.`;
    resultEl.style.display = '';
    resultEl.style.background = 'rgba(16,185,129,.1)';
    resultEl.style.color = '#065f46';
  }
  if (fileInput) fileInput.value = '';
  renderHkmLeads();
}

// Populate assign dropdown in Admin → Import card
function hkmPopulateImportAssign() {
  const sel = document.getElementById('hkmImportAssign');
  if (!sel) return;
  const profiles = Object.entries(state.hkmProfiles).map(([uid, p]) => ({ uid, name: p.name || uid }));
  sel.innerHTML = '<option value="">Nicht zugewiesen</option>' +
    profiles.map(p => `<option value="${p.uid}">${p.name}</option>`).join('');
}

// ─── Event listener setup ─────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function() {
  // Tab buttons
  document.querySelectorAll('[data-hkm-tab]').forEach(btn => {
    btn.addEventListener('click', () => setHkmTab(btn.dataset.hkmTab));
  });

  // Activity type toggle (radio buttons → update hidden input + toggle fields)
  document.querySelectorAll('[name="hkmActType"]').forEach(radio => {
    radio.addEventListener('change', e => {
      const type = e.target.value;
      const hidden = document.getElementById('hkmActivityType');
      if (hidden) hidden.value = type;
      hkmToggleActivityFields(type);
    });
  });

  // Leads search/filter
  const leadsSearch = document.getElementById('hkmLeadsSearch');
  if (leadsSearch) leadsSearch.addEventListener('input', updateHkmLeadsFilters);

  ['hkmLeadsFilterStatus', 'hkmLeadsFilterRegion', 'hkmLeadsFilterAssigned'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', updateHkmLeadsFilters);
  });

  // Analytics apply
  const analyticsApply = document.getElementById('hkmAnalyticsApply');
  if (analyticsApply) analyticsApply.addEventListener('click', renderHkmAnalytics);

  // Click outside modal to close
  ['hkmLeadModal', 'hkmLeadDetailModal', 'hkmActivityModal', 'hkmTransferModal', 'hkmImportDupesModal'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', e => {
      if (e.target === el) {
        el.style.display = 'none';
        if (id === 'hkmImportDupesModal') _hkmPendingImport = null;
      }
    });
  });
});

// Called by nav click
window.initHkmOnView = initHkmOnView;

// Make render functions global so firebase.js can call them
window.renderHkmLeaderboard   = renderHkmLeaderboard;
window.renderHkmLeads         = renderHkmLeads;
window.renderHkmAnalytics     = renderHkmAnalytics;
window.renderHkmChallenges    = renderHkmChallenges;
window.renderHkmAdmin         = renderHkmAdmin;
window.renderHkmAdminProfiles = renderHkmAdminProfiles;
