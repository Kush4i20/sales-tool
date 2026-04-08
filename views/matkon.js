// views/matkon.js – MatKon Sales Tracking Module
// Hund-Katze-Maus Branding: Sales Team = Hunde, Kunden = Katzen
// Manages: Projektliste (List-Building), Employee View, Analytics Dashboard

// ─── Tab Navigation ─────────────────────────────────────────────────────────

function setMatkonTab(tab) {
  state.matkonTab = tab;
  document.querySelectorAll('[data-matkon-tab]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.matkonTab === tab);
  });
  const projectsView = document.getElementById('matkonProjectsView');
  const analyticsView = document.getElementById('matkonAnalyticsView');
  if (projectsView) projectsView.style.display = tab === 'projects' ? 'block' : 'none';
  if (analyticsView) analyticsView.style.display = tab === 'analytics' ? 'block' : 'none';
  if (tab === 'analytics') {
    initMatkonDateRange();
    renderMatkonAnalytics();
  } else {
    renderMatkonProjects();
  }
}

function initMatkonDateRange() {
  const fromEl = document.getElementById('matkonDateFrom');
  const toEl = document.getElementById('matkonDateTo');
  if (!fromEl || !toEl) return;
  if (!fromEl.value) {
    const d = new Date();
    d.setDate(1);
    fromEl.value = d.toISOString().split('T')[0];
  }
  if (!toEl.value) {
    toEl.value = new Date().toISOString().split('T')[0];
  }
}

// ─── Helper: Get member name by id ──────────────────────────────────────────

function getMatkonMemberName(memberId) {
  if (!memberId) return '–';
  const m = state.members.find(m => m.id === memberId);
  return m ? `${m.vorname || ''} ${m.nachname || ''}`.trim() || m.kuerzel || memberId : memberId;
}

function getMatkonMemberColor(memberId) {
  if (!memberId) return '#6b7280';
  const m = state.members.find(m => m.id === memberId);
  return m?.color || '#6b7280';
}

// ─── Status Badge ────────────────────────────────────────────────────────────

function matkonStatusBadge(status) {
  const map = {
    new: { label: 'Neu', color: '#6b7280', bg: 'rgba(107,114,128,.12)' },
    in_progress: { label: 'In Bearbeitung', color: '#f59e0b', bg: 'rgba(245,158,11,.12)' },
    closed_won: { label: 'Gewonnen ✅', color: '#10b981', bg: 'rgba(16,185,129,.12)' },
    closed_lost: { label: 'Verloren ❌', color: '#ef4444', bg: 'rgba(239,68,68,.12)' }
  };
  const s = map[status] || map.new;
  return `<span style="display:inline-flex;align-items:center;padding:3px 8px;border-radius:999px;font-size:11px;font-weight:700;background:${s.bg};color:${s.color}">${s.label}</span>`;
}

// ─── Render: Update filters dropdowns ────────────────────────────────────────

function renderMatkonMemberFilters() {
  const els = ['matkonFilterMember', 'matkonAnalyticsMember'];
  els.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const current = el.value;
    const opts = state.members.map(m =>
      `<option value="${m.id}">${m.vorname || ''} ${m.nachname || ''}`.trim() + `</option>`
    ).join('');
    el.innerHTML = `<option value="">Alle Mitarbeiter</option>${opts}`;
    el.value = current;
  });

  // Territory filter
  const terrEl = document.getElementById('matkonFilterTerritory');
  if (terrEl) {
    const territories = [...new Set(state.matkonProjects.map(p => p.territory).filter(Boolean))].sort();
    const current = terrEl.value;
    terrEl.innerHTML = `<option value="">Alle Regionen</option>` +
      territories.map(t => `<option value="${t}">${t}</option>`).join('');
    terrEl.value = current;
  }
}

// ─── Render: Projektliste ────────────────────────────────────────────────────

function renderMatkonProjects() {
  const tbody = document.getElementById('matkonProjectsBody');
  if (!tbody) return;

  renderMatkonMemberFilters();

  const search = (document.getElementById('matkonSearch')?.value || '').toLowerCase();
  const filterTerritory = document.getElementById('matkonFilterTerritory')?.value || '';
  const filterMember = document.getElementById('matkonFilterMember')?.value || '';
  const filterStatus = document.getElementById('matkonFilterStatus')?.value || '';

  let projects = [...(state.matkonProjects || [])];

  if (search) {
    projects = projects.filter(p =>
      (p.name || '').toLowerCase().includes(search) ||
      (p.company || '').toLowerCase().includes(search) ||
      (p.contactName || '').toLowerCase().includes(search)
    );
  }
  if (filterTerritory) projects = projects.filter(p => p.territory === filterTerritory);
  if (filterMember) projects = projects.filter(p => p.assignedMemberId === filterMember);
  if (filterStatus) projects = projects.filter(p => p.status === filterStatus);

  // Sort: newest first
  projects.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  if (!projects.length) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--muted);padding:24px;">Keine Projekte gefunden</td></tr>`;
    return;
  }

  tbody.innerHTML = projects.map(p => {
    const checklist = p.checklist ? Object.values(p.checklist) : [];
    const checked = checklist.filter(c => c.checked).length;
    const total = checklist.length;
    const checklistBadge = total > 0
      ? `<span style="font-size:11px;padding:2px 7px;border-radius:999px;background:${checked === total ? 'rgba(16,185,129,.15)' : 'rgba(245,158,11,.15)'};color:${checked === total ? '#10b981' : '#d97706'}">${checked}/${total}</span>`
      : `<span style="color:var(--muted);font-size:11px;">–</span>`;

    const activities = p.activity ? Object.values(p.activity) : [];
    const lastAct = activities.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''))[0];
    const lastActLabel = lastAct ? activityTypeLabel(lastAct.type) : '–';
    const lastActDate = lastAct ? new Date(lastAct.timestamp).toLocaleDateString('de-CH') : '';

    const memberColor = getMatkonMemberColor(p.assignedMemberId);
    const memberName = getMatkonMemberName(p.assignedMemberId);

    const canManage = hasPermission?.('matkon_manage') ?? true;

    return `<tr onclick="openMatkonProjectDetail('${p.id}')" style="cursor:pointer;">
      <td>
        <div style="font-weight:600;font-size:13px;">${escapeHtml(p.name || '')}</div>
        ${p.url ? `<a href="${escapeHtml(p.url)}" target="_blank" onclick="event.stopPropagation()" style="font-size:11px;color:var(--accent);">🔗 Website</a>` : ''}
      </td>
      <td>
        <div style="font-size:12px;">${escapeHtml(p.company || '')}</div>
        <div style="font-size:11px;color:var(--muted);">${escapeHtml(p.contactName || '')}</div>
      </td>
      <td><span style="font-size:12px;">${escapeHtml(p.territory || '–')}</span></td>
      <td>
        <span style="display:inline-flex;align-items:center;gap:5px;font-size:12px;">
          <span style="width:8px;height:8px;border-radius:50%;background:${memberColor};flex-shrink:0;"></span>
          ${escapeHtml(memberName)}
        </span>
      </td>
      <td>${matkonStatusBadge(p.status)}</td>
      <td>${checklistBadge}</td>
      <td>
        <div style="font-size:11px;">${lastActLabel}</div>
        <div style="font-size:11px;color:var(--muted);">${lastActDate}</div>
      </td>
      <td onclick="event.stopPropagation()" style="white-space:nowrap;">
        <button class="btn" style="padding:5px 10px;font-size:11px;" onclick="openMatkonProjectDetail('${p.id}')">Öffnen</button>
        ${canManage ? `<button class="btn" style="padding:5px 10px;font-size:11px;margin-left:4px;color:var(--bad);border-color:var(--bad);" onclick="deleteMatkonProjectConfirm('${p.id}')">🗑</button>` : ''}
      </td>
    </tr>`;
  }).join('');
}

function activityTypeLabel(type) {
  const map = {
    call_done: '📞 Call erledigt',
    demo_booked: '📅 Demo gebucht',
    package_sold: '💰 Paket verkauft',
    rejected: '❌ Absage'
  };
  return map[type] || type;
}

function escapeHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── Render: Analytics ───────────────────────────────────────────────────────

function renderMatkonAnalytics() {
  const fromVal = document.getElementById('matkonDateFrom')?.value || '';
  const toVal = document.getElementById('matkonDateTo')?.value || '';
  const memberFilter = document.getElementById('matkonAnalyticsMember')?.value || '';

  renderMatkonMemberFilters();

  // Collect all activities across all projects
  let activities = [];
  (state.matkonProjects || []).forEach(project => {
    if (!project.activity) return;
    Object.values(project.activity).forEach(act => {
      activities.push({ ...act, projectId: project.id, projectName: project.name });
    });
  });

  // Apply date + member filter
  if (fromVal) activities = activities.filter(a => (a.timestamp || '').split('T')[0] >= fromVal);
  if (toVal) activities = activities.filter(a => (a.timestamp || '').split('T')[0] <= toVal);
  if (memberFilter) activities = activities.filter(a => a.memberId === memberFilter);

  const calls = activities.filter(a => a.type === 'call_done').length;
  const demos = activities.filter(a => a.type === 'demo_booked').length;
  const won = activities.filter(a => a.type === 'package_sold').length;
  const rejected = activities.filter(a => a.type === 'rejected').length;
  const revenue = activities
    .filter(a => a.type === 'package_sold' && a.price)
    .reduce((sum, a) => sum + (Number(a.price) || 0), 0);

  // KPIs
  const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setEl('mkKpiCalls', calls);
  setEl('mkKpiDemos', demos);
  setEl('mkKpiWon', won);
  setEl('mkKpiRejected', rejected);
  setEl('mkKpiRevenue', `CHF ${revenue.toLocaleString('de-CH')}`);

  // Package breakdown
  const packageEl = document.getElementById('matkonPackageBreakdown');
  if (packageEl) {
    const packages = { Basic: 0, Plus: 0, Pro: 0, Enterprise: 0 };
    activities.filter(a => a.type === 'package_sold').forEach(a => {
      if (packages[a.packageType] !== undefined) packages[a.packageType]++;
    });
    const maxPkg = Math.max(...Object.values(packages), 1);
    packageEl.innerHTML = Object.entries(packages).map(([pkg, count]) => {
      const colors = { Basic: '#6b7280', Plus: '#3b82f6', Pro: '#f59e0b', Enterprise: '#10b981' };
      const pct = Math.round((count / maxPkg) * 100);
      return `<div class="analytics-bar-row">
        <div class="analytics-bar-label">${pkg}</div>
        <div class="analytics-bar-track"><div class="analytics-bar-fill" style="width:${pct}%;background:${colors[pkg]}"></div></div>
        <div class="analytics-bar-count">${count}</div>
      </div>`;
    }).join('');
  }

  // Rejection reasons
  const rejEl = document.getElementById('matkonRejectionReasons');
  if (rejEl) {
    const reasons = {};
    const categoryLabels = {
      price: '💶 Zu teuer',
      no_budget: '💸 Kein Budget',
      wrong_timing: '⏰ Falscher Zeitpunkt',
      competitor: '🏆 Konkurrenz',
      no_need: '🚫 Kein Bedarf',
      other: '❓ Sonstiges'
    };
    activities.filter(a => a.type === 'rejected').forEach(a => {
      const cat = a.rejectionCategory || 'other';
      reasons[cat] = (reasons[cat] || 0) + 1;
    });
    const sorted = Object.entries(reasons).sort((a, b) => b[1] - a[1]);
    const maxR = sorted[0]?.[1] || 1;
    if (!sorted.length) {
      rejEl.innerHTML = `<div style="color:var(--muted);text-align:center;padding:20px;">Keine Absagen im Zeitraum</div>`;
    } else {
      rejEl.innerHTML = sorted.map(([cat, count]) => {
        const pct = Math.round((count / maxR) * 100);
        return `<div class="analytics-bar-row">
          <div class="analytics-bar-label" style="min-width:140px;">${categoryLabels[cat] || cat}</div>
          <div class="analytics-bar-track"><div class="analytics-bar-fill" style="width:${pct}%;background:#ef4444"></div></div>
          <div class="analytics-bar-count">${count}</div>
        </div>`;
      }).join('');
    }
  }
}

// ─── Modal: Neues Projekt anlegen ────────────────────────────────────────────

function openAddMatkonProjectModal() {
  if (!hasPermission?.('matkon_manage')) {
    showToast?.('⛔ Keine Berechtigung zum Anlegen von Projekten');
    return;
  }
  const modal = document.getElementById('matkonProjectModal');
  if (!modal) {
    createMatkonProjectModal();
    return openAddMatkonProjectModal();
  }
  document.getElementById('matkonModalTitle').textContent = '+ Neues Projekt';
  document.getElementById('matkonProjectForm').reset();
  document.getElementById('matkonProjectId').value = '';
  populateMatkonMemberSelect('matkonProjectMember');
  renderMatkonChecklistTemplate();
  modal.classList.add('show');
}

function createMatkonProjectModal() {
  const modal = document.createElement('div');
  modal.id = 'matkonProjectModal';
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content" style="max-width:620px;position:relative;">
      <button class="modal-close" onclick="closeMatkonProjectModal()">✕</button>
      <h3 class="modal-title" id="matkonModalTitle">Neues Projekt</h3>
      <input type="hidden" id="matkonProjectId">
      <form id="matkonProjectForm" onsubmit="return false;">
        <div class="two-col">
          <div>
            <label class="label">Projektname *</label>
            <input type="text" id="matkonProjectName" class="input-field" placeholder="z.B. Muster AG – Büroprojekt Winterthur" required>
          </div>
          <div>
            <label class="label">Firma *</label>
            <input type="text" id="matkonProjectCompany" class="input-field" placeholder="Firmenname" required>
          </div>
        </div>
        <div class="two-col">
          <div>
            <label class="label">Kontaktperson</label>
            <input type="text" id="matkonProjectContactName" class="input-field" placeholder="Vor- und Nachname">
          </div>
          <div>
            <label class="label">E-Mail</label>
            <input type="email" id="matkonProjectContactEmail" class="input-field" placeholder="email@firma.ch">
          </div>
        </div>
        <div class="two-col">
          <div>
            <label class="label">Telefon</label>
            <input type="text" id="matkonProjectContactPhone" class="input-field" placeholder="+41 79 123 45 67">
          </div>
          <div>
            <label class="label">Website / URL</label>
            <input type="url" id="matkonProjectUrl" class="input-field" placeholder="https://...">
          </div>
        </div>
        <div class="two-col">
          <div>
            <label class="label">Region / Revier *</label>
            <input type="text" id="matkonProjectTerritory" class="input-field" placeholder="z.B. Zürich-Nord, Bern-Ost" list="matkonTerritoryList" required>
            <datalist id="matkonTerritoryList"></datalist>
          </div>
          <div>
            <label class="label">Zuweisen an</label>
            <select id="matkonProjectMember" class="input-field"></select>
          </div>
        </div>
        <div>
          <label class="label">Validierungs-Checkliste</label>
          <div id="matkonChecklistItems" style="display:grid;gap:6px;margin-top:4px;"></div>
        </div>
        <div style="display:flex;gap:8px;margin-top:20px;justify-content:flex-end;">
          <button class="btn" type="button" onclick="closeMatkonProjectModal()">Abbrechen</button>
          <button class="btn primary" type="button" onclick="saveMatkonProjectFromModal()">💾 Speichern</button>
        </div>
      </form>
    </div>`;
  document.body.appendChild(modal);
}

function closeMatkonProjectModal() {
  document.getElementById('matkonProjectModal')?.classList.remove('show');
}

function populateMatkonMemberSelect(selectId) {
  const el = document.getElementById(selectId);
  if (!el) return;
  el.innerHTML = `<option value="">Nicht zugewiesen</option>` +
    state.members.map(m => `<option value="${m.id}">${m.vorname || ''} ${m.nachname || ''}`.trim() + `</option>`).join('');

  // Pre-select own member if user has one
  if (state.currentUserProfile?.memberId && !hasPermission?.('matkon_assign')) {
    el.value = state.currentUserProfile.memberId;
    el.disabled = true;
  } else {
    el.disabled = false;
  }
}

function renderMatkonChecklistTemplate() {
  const container = document.getElementById('matkonChecklistItems');
  if (!container) return;
  const items = state.matkonChecklistTemplate || [];
  // Also populate territory datalist
  const terrList = document.getElementById('matkonTerritoryList');
  if (terrList) {
    const territories = [...new Set(state.matkonProjects.map(p => p.territory).filter(Boolean))];
    terrList.innerHTML = territories.map(t => `<option value="${t}">`).join('');
  }
  container.innerHTML = items.map((item, i) => `
    <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;">
      <input type="checkbox" id="matkonChk_${item.id || i}" value="${item.id || i}" checked style="width:16px;height:16px;">
      ${escapeHtml(item.label)}
    </label>`).join('');
}

async function saveMatkonProjectFromModal() {
  const name = document.getElementById('matkonProjectName')?.value?.trim();
  const company = document.getElementById('matkonProjectCompany')?.value?.trim();
  const territory = document.getElementById('matkonProjectTerritory')?.value?.trim();

  if (!name || !company || !territory) {
    showToast?.('❌ Projektname, Firma und Region sind Pflichtfelder');
    return;
  }

  const existingId = document.getElementById('matkonProjectId')?.value;
  const projectId = existingId || `mk_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const now = new Date().toISOString();

  // Build checklist from template
  const checklist = {};
  (state.matkonChecklistTemplate || []).forEach((item, i) => {
    const chkEl = document.getElementById(`matkonChk_${item.id || i}`);
    checklist[item.id || `chk${i}`] = {
      label: item.label,
      checked: false,
      checkedBy: null,
      checkedAt: null
    };
  });

  const project = {
    id: projectId,
    name,
    company,
    contactName: document.getElementById('matkonProjectContactName')?.value?.trim() || '',
    contactEmail: document.getElementById('matkonProjectContactEmail')?.value?.trim() || '',
    contactPhone: document.getElementById('matkonProjectContactPhone')?.value?.trim() || '',
    url: document.getElementById('matkonProjectUrl')?.value?.trim() || '',
    territory,
    assignedMemberId: document.getElementById('matkonProjectMember')?.value || '',
    status: existingId ? (state.matkonProjects.find(p => p.id === existingId)?.status || 'new') : 'new',
    createdAt: existingId ? (state.matkonProjects.find(p => p.id === existingId)?.createdAt || now) : now,
    createdBy: currentUser?.uid || '',
    updatedAt: now,
    checklist: existingId ? (state.matkonProjects.find(p => p.id === existingId)?.checklist || checklist) : checklist
  };

  try {
    await window.saveMatkonProject?.(project);
    closeMatkonProjectModal();
    showToast?.('✅ Projekt gespeichert');
  } catch (e) {
    showToast?.(`❌ Fehler: ${e.message}`);
  }
}

// ─── Delete Project ───────────────────────────────────────────────────────────

function deleteMatkonProjectConfirm(projectId) {
  if (!hasPermission?.('matkon_manage')) { showToast?.('⛔ Keine Berechtigung'); return; }
  const project = state.matkonProjects.find(p => p.id === projectId);
  if (!project) return;
  if (!confirm(`Projekt "${project.name}" wirklich löschen?`)) return;
  window.deleteMatkonProject?.(projectId).then(() => {
    showToast?.('🗑 Projekt gelöscht');
  }).catch(e => showToast?.(`❌ ${e.message}`));
}

// ─── Project Detail View ─────────────────────────────────────────────────────

function openMatkonProjectDetail(projectId) {
  const project = state.matkonProjects.find(p => p.id === projectId);
  if (!project) return;

  let modal = document.getElementById('matkonDetailModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'matkonDetailModal';
    modal.className = 'modal';
    document.body.appendChild(modal);
  }

  const activities = project.activity ? Object.values(project.activity).sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || '')) : [];
  const checklist = project.checklist ? Object.entries(project.checklist) : [];
  const checklistDone = checklist.filter(([, c]) => c.checked).length;

  const memberName = getMatkonMemberName(project.assignedMemberId);
  const memberColor = getMatkonMemberColor(project.assignedMemberId);
  const canAct = !hasPermission || hasPermission('matkon_view');
  const canManage = hasPermission?.('matkon_manage') ?? true;

  modal.innerHTML = `
    <div class="modal-content" style="max-width:720px;position:relative;">
      <button class="modal-close" onclick="closeMatkonDetailModal()">✕</button>
      <div style="display:flex;align-items:start;justify-content:space-between;gap:12px;margin-bottom:16px;">
        <div>
          <h3 class="modal-title" style="margin-bottom:4px;">🐾 ${escapeHtml(project.name)}</h3>
          <div style="font-size:12px;color:var(--muted);">${escapeHtml(project.company)} · ${escapeHtml(project.territory || '–')}</div>
          <div style="margin-top:6px;">${matkonStatusBadge(project.status)}</div>
        </div>
        <div style="text-align:right;">
          <div style="display:flex;align-items:center;gap:6px;font-size:12px;justify-content:flex-end;">
            <span style="width:10px;height:10px;border-radius:50%;background:${memberColor};display:inline-block;"></span>
            <span>${escapeHtml(memberName)}</span>
          </div>
          ${project.url ? `<a href="${escapeHtml(project.url)}" target="_blank" style="font-size:11px;color:var(--accent);">🔗 ${escapeHtml(project.url)}</a>` : ''}
        </div>
      </div>

      <!-- Contact info -->
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px;background:var(--bg);border-radius:8px;padding:12px;">
        <div><div style="font-size:10px;color:var(--muted);text-transform:uppercase;">Kontakt</div><div style="font-size:13px;font-weight:600;">${escapeHtml(project.contactName || '–')}</div></div>
        <div><div style="font-size:10px;color:var(--muted);text-transform:uppercase;">Telefon</div><div style="font-size:13px;">${escapeHtml(project.contactPhone || '–')}</div></div>
        <div><div style="font-size:10px;color:var(--muted);text-transform:uppercase;">E-Mail</div><div style="font-size:13px;">${escapeHtml(project.contactEmail || '–')}</div></div>
      </div>

      <!-- Checkliste -->
      <div style="margin-bottom:16px;">
        <div style="font-size:12px;font-weight:700;margin-bottom:8px;color:var(--accent);">Checkliste ${checklistDone}/${checklist.length}</div>
        <div style="display:grid;gap:4px;">
          ${checklist.map(([itemId, item]) => `
            <label style="display:flex;align-items:center;gap:8px;font-size:12px;cursor:pointer;">
              <input type="checkbox" ${item.checked ? 'checked' : ''}
                onchange="toggleMatkonChecklist('${project.id}', '${itemId}', this.checked)"
                style="width:15px;height:15px;">
              <span style="${item.checked ? 'text-decoration:line-through;color:var(--muted)' : ''}">${escapeHtml(item.label || itemId)}</span>
            </label>`).join('') || '<div style="color:var(--muted);font-size:12px;">Keine Checkliste</div>'}
        </div>
      </div>

      <!-- Aktionsbuttons (Employee View) -->
      <div style="border:1px solid var(--line);border-radius:10px;padding:14px;margin-bottom:16px;background:rgba(245,158,11,.04);">
        <div style="font-size:12px;font-weight:700;margin-bottom:12px;">🐾 Aktivität erfassen</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn good" onclick="recordMatkonActivity('${project.id}', 'call_done')">📞 Call erledigt</button>
          <button class="btn" style="border-color:#3b82f6;color:#3b82f6;" onclick="openMatkonDemoModal('${project.id}')">📅 Demo buchen</button>
          <button class="btn primary" onclick="openMatkonSaleModal('${project.id}')">💰 Paket verkauft</button>
          <button class="btn" style="border-color:var(--bad);color:var(--bad);" onclick="openMatkonRejectionModal('${project.id}')">❌ Absage</button>
        </div>
      </div>

      <!-- Aktivitäts-Timeline -->
      <div>
        <div style="font-size:12px;font-weight:700;margin-bottom:8px;">📋 Aktivitäts-Timeline (${activities.length})</div>
        <div style="max-height:220px;overflow-y:auto;">
          ${!activities.length ? `<div style="color:var(--muted);font-size:12px;padding:12px;text-align:center;">Noch keine Aktivitäten</div>` :
            activities.map(a => {
              const memberN = getMatkonMemberName(a.memberId);
              const date = a.timestamp ? new Date(a.timestamp).toLocaleDateString('de-CH', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '';
              let detail = '';
              if (a.type === 'demo_booked' && a.demoDate) detail = `Demo am ${new Date(a.demoDate).toLocaleDateString('de-CH')}`;
              if (a.type === 'package_sold') detail = `${a.packageType || '–'} · CHF ${(a.price || 0).toLocaleString('de-CH')}`;
              if (a.type === 'rejected') detail = `${a.rejectionCategory ? (a.rejectionCategory) : ''} – ${a.rejectionReason || ''}`;
              const colors = { call_done: '#10b981', demo_booked: '#3b82f6', package_sold: '#f59e0b', rejected: '#ef4444' };
              const color = colors[a.type] || '#6b7280';
              return `<div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid var(--line);">
                <div style="width:6px;border-radius:3px;background:${color};flex-shrink:0;margin-top:2px;"></div>
                <div>
                  <div style="font-size:12px;font-weight:600;">${activityTypeLabel(a.type)}</div>
                  ${detail ? `<div style="font-size:11px;color:var(--muted);">${escapeHtml(detail)}</div>` : ''}
                  <div style="font-size:11px;color:var(--muted);">${escapeHtml(memberN)} · ${date}</div>
                </div>
              </div>`;
            }).join('')
          }
        </div>
      </div>

      <div style="display:flex;gap:8px;margin-top:16px;justify-content:flex-end;">
        ${canManage ? `<button class="btn" onclick="openEditMatkonProject('${project.id}')">✏️ Bearbeiten</button>` : ''}
        <button class="btn primary" onclick="closeMatkonDetailModal()">Schliessen</button>
      </div>
    </div>`;

  modal.classList.add('show');
}

function closeMatkonDetailModal() {
  document.getElementById('matkonDetailModal')?.classList.remove('show');
}

function openEditMatkonProject(projectId) {
  const project = state.matkonProjects.find(p => p.id === projectId);
  if (!project) return;
  closeMatkonDetailModal();
  // Open add modal and pre-fill
  openAddMatkonProjectModal();
  setTimeout(() => {
    document.getElementById('matkonModalTitle').textContent = '✏️ Projekt bearbeiten';
    document.getElementById('matkonProjectId').value = project.id;
    document.getElementById('matkonProjectName').value = project.name || '';
    document.getElementById('matkonProjectCompany').value = project.company || '';
    document.getElementById('matkonProjectContactName').value = project.contactName || '';
    document.getElementById('matkonProjectContactEmail').value = project.contactEmail || '';
    document.getElementById('matkonProjectContactPhone').value = project.contactPhone || '';
    document.getElementById('matkonProjectUrl').value = project.url || '';
    document.getElementById('matkonProjectTerritory').value = project.territory || '';
    document.getElementById('matkonProjectMember').value = project.assignedMemberId || '';
  }, 50);
}

// ─── Quick activity recording ─────────────────────────────────────────────────

async function recordMatkonActivity(projectId, type, extra = {}) {
  const activity = {
    type,
    memberId: state.currentUserProfile?.memberId || '',
    ...extra
  };
  try {
    await window.addMatkonActivity?.(projectId, activity);
    // Refresh detail modal
    openMatkonProjectDetail(projectId);
    showToast?.('✅ Aktivität gespeichert');
  } catch (e) {
    showToast?.(`❌ Fehler: ${e.message}`);
  }
}

// ─── Demo Modal ───────────────────────────────────────────────────────────────

function openMatkonDemoModal(projectId) {
  const date = prompt('Demo-Datum (YYYY-MM-DD):', new Date(Date.now() + 7*86400000).toISOString().split('T')[0]);
  if (date === null) return;
  recordMatkonActivity(projectId, 'demo_booked', { demoDate: date });
}

// ─── Sale Modal ───────────────────────────────────────────────────────────────

function openMatkonSaleModal(projectId) {
  let modal = document.getElementById('matkonSaleModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'matkonSaleModal';
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content" style="max-width:440px;position:relative;">
        <button class="modal-close" onclick="document.getElementById('matkonSaleModal').classList.remove('show')">✕</button>
        <h3 class="modal-title">💰 Paket verkauft</h3>
        <input type="hidden" id="matkonSaleProjectId">
        <label class="label">Paket *</label>
        <select id="matkonSalePackage" class="input-field">
          <option value="Basic">Basic</option>
          <option value="Plus">Plus</option>
          <option value="Pro" selected>Pro</option>
          <option value="Enterprise">Enterprise</option>
        </select>
        <label class="label">Preis (CHF) *</label>
        <input type="number" id="matkonSalePrice" class="input-field" placeholder="z.B. 4800" min="0">
        <div style="display:flex;gap:8px;margin-top:16px;justify-content:flex-end;">
          <button class="btn" onclick="document.getElementById('matkonSaleModal').classList.remove('show')">Abbrechen</button>
          <button class="btn primary" onclick="confirmMatkonSale()">💾 Speichern</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
  }
  document.getElementById('matkonSaleProjectId').value = projectId;
  modal.classList.add('show');
}

async function confirmMatkonSale() {
  const projectId = document.getElementById('matkonSaleProjectId')?.value;
  const packageType = document.getElementById('matkonSalePackage')?.value;
  const price = Number(document.getElementById('matkonSalePrice')?.value);
  if (!packageType || !price) { showToast?.('❌ Paket und Preis sind Pflichtfelder'); return; }
  document.getElementById('matkonSaleModal')?.classList.remove('show');
  await recordMatkonActivity(projectId, 'package_sold', { packageType, price, currency: 'CHF' });
}

// ─── Rejection Modal ──────────────────────────────────────────────────────────

function openMatkonRejectionModal(projectId) {
  let modal = document.getElementById('matkonRejectionModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'matkonRejectionModal';
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content" style="max-width:440px;position:relative;">
        <button class="modal-close" onclick="document.getElementById('matkonRejectionModal').classList.remove('show')">✕</button>
        <h3 class="modal-title">❌ Absage erfassen</h3>
        <input type="hidden" id="matkonRejProjectId">
        <label class="label">Absagegrund (Kategorie) *</label>
        <select id="matkonRejCategory" class="input-field">
          <option value="price">💶 Zu teuer</option>
          <option value="no_budget">💸 Kein Budget</option>
          <option value="wrong_timing">⏰ Falscher Zeitpunkt</option>
          <option value="competitor">🏆 Konkurrenz gewählt</option>
          <option value="no_need">🚫 Kein Bedarf</option>
          <option value="other">❓ Sonstiges</option>
        </select>
        <label class="label">Details (Freitext)</label>
        <textarea id="matkonRejReason" class="input-field" rows="3" placeholder="Was hat der Kunde gesagt..."></textarea>
        <div style="display:flex;gap:8px;margin-top:16px;justify-content:flex-end;">
          <button class="btn" onclick="document.getElementById('matkonRejectionModal').classList.remove('show')">Abbrechen</button>
          <button class="btn" style="border-color:var(--bad);background:rgba(239,68,68,.1);color:var(--bad);" onclick="confirmMatkonRejection()">❌ Absage speichern</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
  }
  document.getElementById('matkonRejProjectId').value = projectId;
  document.getElementById('matkonRejReason').value = '';
  modal.classList.add('show');
}

async function confirmMatkonRejection() {
  const projectId = document.getElementById('matkonRejProjectId')?.value;
  const rejectionCategory = document.getElementById('matkonRejCategory')?.value;
  const rejectionReason = document.getElementById('matkonRejReason')?.value?.trim() || '';
  document.getElementById('matkonRejectionModal')?.classList.remove('show');
  await recordMatkonActivity(projectId, 'rejected', { rejectionCategory, rejectionReason });
}

// ─── Checklist toggle ─────────────────────────────────────────────────────────

async function toggleMatkonChecklist(projectId, itemId, checked) {
  try {
    await window.updateMatkonChecklist?.(projectId, itemId, checked);
  } catch (e) {
    showToast?.(`❌ Fehler: ${e.message}`);
  }
}

// ─── Init on view switch ─────────────────────────────────────────────────────

// Hook into setView to render MatKon when switching to it
const _origSetView = typeof setView === 'function' ? setView : null;
if (_origSetView) {
  window.setView = function(viewId) {
    _origSetView(viewId);
    if (viewId === 'matkon') {
      setMatkonTab(state.matkonTab || 'projects');
      renderMatkonMemberFilters();
    }
  };
}
