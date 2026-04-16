    const state = {
      contacts: [],
      selectedContacts: new Set(),
      callLog: [],
      tags: [],
      companies: [],
      leads: [],
      deals: [],
      activities: [],
      templates: [],
      sequences: [],
      selectedTagFilter: null,
      selectedFollowupTagFilter: null,
      selectedFollowupSource: 'calls',
      crmSelectedCompany: null,
      immoRadar: {
        segment: 'all',
        query: '',
        status: 'all',
        sortBy: 'score',
        sortDesc: true,
        expandedId: null,
        page: 1,
        pageSize: 12,
        generatedTemplates: {},
        generatingId: null
      },
      dashboardView: 'tiles',
      dashboardListFilters: {
        person: '',
        phone: '',
        email: '',
        company: '',
        location: '',
        status: '',
        phase: '',
        rating: '',
        due: ''
      },
      vrOverview: {
        query: '',
        status: 'all',
        sortBy: 'nextDue',
        sortDesc: false,
        view: 'list'
      },
      quickFilter: 'all',
      sessionLogFilter: 'all',
      analyticsModule: 'all',
      tasksTab: 'list',
      tasks: [],
      taskTypes: [],
      boards: [],
      checklistTemplates: [],
      taskListShowCompleted: false,
      taskListSortBy: 'faelligkeit',
      taskFilterDateFrom: '',
      taskFilterDateTo: '',
      taskFilterBoard: 'all',
      activeBoardId: null,
      boardsSubView: 'list',
      _modalSubtasks: [],
      _cltItems: [],
      _btplTasks: [],
      boardTemplates: [],
      liTracking: { profile: 'company' },
      liSnapshots: [],
      liPosts: [],
      weeklyGoals: {},
      weeklyChecklist: [],
      userAccounts: [],
      members: [],
      activeMember: null,
      currentUserProfile: null,
      vrQueue: [],
      // Multi-user org context (set by firebase.js on login)
      orgId: null,
      // MatKon module state
      matkonProjects: [],
      matkonChecklistTemplate: [
        { id: 'chk1', label: 'LinkedIn Profil geprüft', order: 1 },
        { id: 'chk2', label: 'Website + Projekte angeschaut', order: 2 },
        { id: 'chk3', label: 'Kontaktperson korrekt', order: 3 },
        { id: 'chk4', label: 'Telefonnummer verifiziert', order: 4 },
        { id: 'chk5', label: 'Region / Revier eingetragen', order: 5 }
      ],
      matkonTab: 'projects',
      settings: {
        name: 'Dein Name',
        company: 'Firma',
        guides: '',
        enforceDealGovernance: true,
        userRole: 'user',
        commProvider: 'mailto',
        commSender: '',
        commAutoCompose: false,
        commBridgeUrl: '',
        commBridgeToken: '',
        immoApiKey: '',
        immoTemplateTone: 'consultative'
      }
    };

    let currentUser = null;
    let currentEditContactId = null;

    const fmtMMSS = sec => `${Math.floor(sec/60).toString().padStart(2,'0')}:${(sec%60).toString().padStart(2,'0')}`;

    function showToast(msg) {
      const t = document.getElementById('toast');
      t.textContent = msg;
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2000);
    }

    function setView(viewId) {
      document.querySelectorAll('[data-view]').forEach(e => e.classList.remove('active'));
      document.querySelector(`[data-view="${viewId}"]`)?.classList.add('active');
      document.querySelectorAll('.section').forEach(e => e.classList.remove('active'));
      document.getElementById(viewId)?.classList.add('active');
      document.getElementById('sidebar')?.classList.remove('open');
      document.getElementById('sidebarOverlay')?.classList.remove('show');
    }

    window.switchKontakteTab = function(tab) {
      // Update tab buttons
      document.querySelectorAll('[data-kontakte-tab]').forEach(b => {
        b.classList.toggle('active', b.dataset.kontakteTab === tab);
      });
      // Show/hide panels
      const listeEl = document.getElementById('kontakteTabListe');
      const crmEl   = document.getElementById('kontakteTabCrm');
      if (listeEl) listeEl.style.display = tab === 'liste' ? '' : 'none';
      if (crmEl)   crmEl.style.display   = tab === 'crm'   ? '' : 'none';
      // Show/hide header buttons
      document.getElementById('btnOpenTagManager').style.display = tab === 'liste' ? '' : 'none';
      document.getElementById('btnAddContact').style.display     = tab === 'liste' ? '' : 'none';
      // Render CRM when switching to it
      if (tab === 'crm') {
        renderCrmCompanies();
        renderCrmCompanyDetail();
        renderDuplicateResults();
      }
    };

    // LOAD / SAVE
    function saveContacts() {
      localStorage.setItem('phcontacts', JSON.stringify(state.contacts));
      if (currentUser) syncToFirebase('contacts', state.contacts);
    }

    function saveCallLog() {
      localStorage.setItem('phlog', JSON.stringify(state.callLog));
      if (currentUser) syncToFirebase('calls', state.callLog);
    }

    function saveSettings() {
      localStorage.setItem('phsettings', JSON.stringify(state.settings));
      // Personal settings go to users/{uid}/settings, not the org path
      if (currentUser && window.syncSettingsToFirebase) window.syncSettingsToFirebase(state.settings);
    }

    function saveTags() {
      localStorage.setItem('phtags', JSON.stringify(state.tags));
      if (currentUser) syncToFirebase('tags', state.tags);
    }

    function saveCompanies() {
      localStorage.setItem('phcompanies', JSON.stringify(state.companies));
      if (currentUser) syncToFirebase('companies', state.companies);
    }

    function saveLeads() {
      localStorage.setItem('phleads', JSON.stringify(state.leads));
      if (currentUser) syncToFirebase('leads', state.leads);
    }

    function saveDeals() {
      localStorage.setItem('phdeals', JSON.stringify(state.deals));
      if (currentUser) syncToFirebase('deals', state.deals);
    }

    function saveActivities() {
      localStorage.setItem('phactivities', JSON.stringify(state.activities));
      if (currentUser) syncToFirebase('activities', state.activities);
    }

    function saveTemplates() {
      localStorage.setItem('phtemplates', JSON.stringify(state.templates));
      if (currentUser) syncToFirebase('templates', state.templates);
    }

    function saveSequences() {
      localStorage.setItem('phsequences', JSON.stringify(state.sequences));
      if (currentUser) syncToFirebase('sequences', state.sequences);
    }

    function saveMembers() {
      localStorage.setItem('phmembers', JSON.stringify(state.members));
      if (currentUser) syncToFirebase('members', state.members);
    }

    function saveTasks() {
      localStorage.setItem('phtasks', JSON.stringify(state.tasks));
      if (currentUser) syncToFirebase('tasks', state.tasks);
    }

    function saveBoards() {
      localStorage.setItem('phboards', JSON.stringify(state.boards));
      if (currentUser) syncToFirebase('boards', state.boards);
    }
    function saveChecklistTemplates() {
      localStorage.setItem('phChecklistTemplates', JSON.stringify(state.checklistTemplates));
      if (currentUser) syncToFirebase('checklistTemplates', state.checklistTemplates);
    }
    function saveBoardTemplates() {
      localStorage.setItem('phBoardTemplates', JSON.stringify(state.boardTemplates));
      if (currentUser) syncToFirebase('boardTemplates', state.boardTemplates);
    }
    function saveTaskTypes() {
      localStorage.setItem('phTaskTypes', JSON.stringify(state.taskTypes));
      if (currentUser) syncToFirebase('taskTypes', state.taskTypes);
    }

    function saveLiSnapshots() {
      localStorage.setItem('phliSnapshots', JSON.stringify(state.liSnapshots));
      if (currentUser) syncToFirebase('liSnapshots', state.liSnapshots);
    }

    function saveLiPosts() {
      localStorage.setItem('phliPosts', JSON.stringify(state.liPosts));
      if (currentUser) syncToFirebase('liPosts', state.liPosts);
    }

    function saveWeeklyGoals() {
      localStorage.setItem('phWeeklyGoals', JSON.stringify(state.weeklyGoals));
      if (currentUser) syncToFirebase('weeklyGoals', state.weeklyGoals);
    }

    function saveWeeklyChecklist() {
      localStorage.setItem('phWeeklyChecklist', JSON.stringify(state.weeklyChecklist));
      if (currentUser) syncToFirebase('weeklyChecklist', state.weeklyChecklist);
    }

    function saveUserAccounts() {
      localStorage.setItem('phUserAccounts', JSON.stringify(state.userAccounts));
      if (currentUser) syncToFirebase('userAccounts', state.userAccounts);
    }

    function loadFromStorage() {
      const contacts = localStorage.getItem('phcontacts');
      if (contacts) state.contacts = JSON.parse(contacts);

      const log = localStorage.getItem('phlog');
      if (log) state.callLog = JSON.parse(log);

      const settings = localStorage.getItem('phsettings');
      if (settings) state.settings = JSON.parse(settings);

      const tags = localStorage.getItem('phtags');
      if (tags) state.tags = JSON.parse(tags);

      const companies = localStorage.getItem('phcompanies');
      if (companies) state.companies = JSON.parse(companies);

      state.companies.forEach(c => ensureCompanyStructure(c));

      const leads = localStorage.getItem('phleads');
      if (leads) state.leads = JSON.parse(leads);

      const deals = localStorage.getItem('phdeals');
      if (deals) state.deals = JSON.parse(deals);

      const activities = localStorage.getItem('phactivities');
      if (activities) state.activities = JSON.parse(activities);

      const templates = localStorage.getItem('phtemplates');
      if (templates) state.templates = JSON.parse(templates);

      const sequences = localStorage.getItem('phsequences');
      if (sequences) state.sequences = JSON.parse(sequences);

      const members = localStorage.getItem('phmembers');
      if (members) state.members = JSON.parse(members);

      const tasks = localStorage.getItem('phtasks');
      if (tasks) state.tasks = JSON.parse(tasks);

      const boards = localStorage.getItem('phboards');
      if (boards) state.boards = JSON.parse(boards);
      const checklistTemplates = localStorage.getItem('phChecklistTemplates');
      if (checklistTemplates) state.checklistTemplates = JSON.parse(checklistTemplates);
      const taskTypes = localStorage.getItem('phTaskTypes');
      if (taskTypes) state.taskTypes = JSON.parse(taskTypes);
      const boardTemplates = localStorage.getItem('phBoardTemplates');
      if (boardTemplates) state.boardTemplates = JSON.parse(boardTemplates);

      const liSnapshots = localStorage.getItem('phliSnapshots');
      if (liSnapshots) state.liSnapshots = JSON.parse(liSnapshots);

      const liPosts = localStorage.getItem('phliPosts');
      if (liPosts) state.liPosts = JSON.parse(liPosts);

      const weeklyGoals = localStorage.getItem('phWeeklyGoals');
      if (weeklyGoals) state.weeklyGoals = JSON.parse(weeklyGoals);

      const weeklyChecklist = localStorage.getItem('phWeeklyChecklist');
      if (weeklyChecklist) state.weeklyChecklist = JSON.parse(weeklyChecklist);

      const userAccounts = localStorage.getItem('phUserAccounts');
      if (userAccounts) state.userAccounts = JSON.parse(userAccounts);

      const currentUserProfile = localStorage.getItem('phCurrentUserProfile');
      if (currentUserProfile) {
        try {
          state.currentUserProfile = JSON.parse(currentUserProfile);
        } catch {
          state.currentUserProfile = null;
        }
      }

      // Konvertiere bereits importierte Kontakte (z.B. aus CSV) zu echten Companies
      // (nur wenn Kontakte vorhanden sind und Firmen noch nicht richtig verlinkt)
      const hasUnlinkedContacts = state.contacts.some(c => c.firma && !c.companyId);
      if (hasUnlinkedContacts) {
        ensureCompaniesFromContacts();
        saveCompanies();
      }

      document.getElementById('settingsName').value = state.settings.name || '';
      document.getElementById('settingsCompany').value = state.settings.company || '';
      document.getElementById('settingsGuides').value = state.settings.guides || '';
      renderTaskTypesSettings?.();
      if (typeof state.settings.enforceDealGovernance !== 'boolean') {
        state.settings.enforceDealGovernance = true;
      }
      if (!['admin', 'manager', 'user'].includes(state.settings.userRole || '')) {
        state.settings.userRole = 'user';
      }
      if (!['mailto', 'gmail', 'outlook', 'outlook_graph_direct', 'ionos_imap_direct'].includes(state.settings.commProvider || '')) {
        state.settings.commProvider = 'mailto';
      }
      state.settings.commSender = state.settings.commSender || '';
      state.settings.commAutoCompose = state.settings.commAutoCompose === true;
      state.settings.commBridgeUrl = (state.settings.commBridgeUrl || '').trim();
      state.settings.commBridgeToken = state.settings.commBridgeToken || '';
      state.settings.immoApiKey = state.settings.immoApiKey || state.settings.commBridgeToken || '';
      state.settings.immoTemplateTone = state.settings.immoTemplateTone || 'consultative';
      const governanceCheckbox = document.getElementById('settingsEnforceDealGovernance');
      if (governanceCheckbox) {
        governanceCheckbox.checked = state.settings.enforceDealGovernance !== false;
      }
      const roleSelect = document.getElementById('settingsUserRole');
      if (roleSelect) roleSelect.value = state.settings.userRole;
      const commProviderSelect = document.getElementById('settingsCommProvider');
      if (commProviderSelect) commProviderSelect.value = state.settings.commProvider;
      const commSenderInput = document.getElementById('settingsCommSender');
      if (commSenderInput) commSenderInput.value = state.settings.commSender;
      const commAutoComposeInput = document.getElementById('settingsCommAutoCompose');
      if (commAutoComposeInput) commAutoComposeInput.checked = state.settings.commAutoCompose === true;
      const commBridgeUrlInput = document.getElementById('settingsCommBridgeUrl');
      if (commBridgeUrlInput) commBridgeUrlInput.value = state.settings.commBridgeUrl || '';
      const commBridgeTokenInput = document.getElementById('settingsCommBridgeToken');
      if (commBridgeTokenInput) commBridgeTokenInput.value = state.settings.commBridgeToken || '';
      applyRolePermissionsUI();

      const leadOwner = document.getElementById('leadOwner');
      const dealOwner = document.getElementById('dealOwner');
      if (leadOwner && !leadOwner.value) leadOwner.value = state.settings.name || '';
      if (dealOwner && !dealOwner.value) dealOwner.value = state.settings.name || '';
    }

    function syncToFirebase(type, data) {
      if (!currentUser) return;
      if (typeof window.syncToFirebase === 'function') {
        window.syncToFirebase(type, data);
      }
    }

    // TAG MANAGEMENT
    const PRESET_COLORS = [
      '#FF6B6B', '#FF8E72', '#FFA500', '#FFD166', '#06D6A0',
      '#118AB2', '#073B4C', '#9D84B7', '#D5B3D4', '#FF6B9D',
      '#C34A36', '#E63946', '#F1FAEE', '#A8DADC', '#457B9D',
      '#1D3557', '#2A9D8F', '#264653', '#8ECAE6', '#FB8500',
      '#FFB4A2', '#E5989B', '#D4A5A5', '#CDCDCD', '#A0AEC0',
      '#F8B500', '#00A3E0'
    ];

    function normalizeColor(color) {
      // Converts hex, rgb, or color to valid hex
      if (color.startsWith('#')) {
        return color.toUpperCase();
      }
      if (color.startsWith('rgb')) {
        const match = color.match(/\d+/g);
        if (match && match.length >= 3) {
          const r = parseInt(match[0]).toString(16).padStart(2, '0');
          const g = parseInt(match[1]).toString(16).padStart(2, '0');
          const b = parseInt(match[2]).toString(16).padStart(2, '0');
          return '#' + (r + g + b).toUpperCase();
        }
      }
      return '#808080';
    }

    function createTag(name, color) {
      if (!name || !name.trim()) {
        showToast('❌ Tag-Name erforderlich');
        return false;
      }

      const normalizedColor = normalizeColor(color);
      const newTag = {
        id: Math.random().toString(36).substr(2, 9),
        name: name.trim(),
        color: normalizedColor,
        createdAt: new Date().toISOString()
      };

      state.tags.push(newTag);
      saveTags();
      return true;
    }

    function deleteTag(tagId) {
      state.tags = state.tags.filter(t => t.id !== tagId);
      // Remove tag from all contacts
      state.contacts.forEach(c => {
        if (c.tags) {
          c.tags = c.tags.filter(t => t !== tagId);
        }
      });
      saveTags();
      saveContacts();
    }

    function addTagToContact(contactId, tagId) {
      const contact = state.contacts.find(c => c.id === contactId);
      if (!contact) return;
      if (!contact.tags) contact.tags = [];
      if (!contact.tags.includes(tagId)) {
        contact.tags.push(tagId);
        saveContacts();
      }
    }

    function removeTagFromContact(contactId, tagId) {
      const contact = state.contacts.find(c => c.id === contactId);
      if (!contact || !contact.tags) return;
      contact.tags = contact.tags.filter(t => t !== tagId);
      saveContacts();
    }

    function getTagById(tagId) {
      return state.tags.find(t => t.id === tagId);
    }

    function renderColorPalette() {
      const palette = document.getElementById('colorPalette');
      palette.innerHTML = PRESET_COLORS.map(color => `
        <div class="color-option" style="background-color: ${color};" data-color="${color}" title="${color}"></div>
      `).join('');

      document.querySelectorAll('.color-option').forEach(el => {
        el.addEventListener('click', () => {
          document.querySelectorAll('.color-option').forEach(e => e.classList.remove('selected'));
          el.classList.add('selected');
          document.getElementById('btnShowColorPicker').style.backgroundColor = el.getAttribute('data-color');
          document.getElementById('hexInput').value = el.getAttribute('data-color');
        });
      });
    }

    function renderTagsList() {
      const tagsList = document.getElementById('tagsList');
      if (state.tags.length === 0) {
        tagsList.innerHTML = '<div style="color: var(--muted); font-size: 12px; text-align: center; padding: 20px;">Keine Tags vorhanden. Erstelle dein erstes Tag!</div>';
        return;
      }

      tagsList.innerHTML = state.tags.map(tag => `
        <div class="tag-list-item">
          <div class="tag-list-item-content">
            <div class="tag-list-color-swatch" style="background-color: ${tag.color}; border: 1px solid var(--line);"></div>
            <span>${tag.name}</span>
            <span style="color: var(--muted); font-size: 10px;">
              (${state.contacts.filter(c => c.tags && c.tags.includes(tag.id)).length})
            </span>
          </div>
          <button class="tag-list-item-delete" data-tag-id="${tag.id}">🗑️</button>
        </div>
      `).join('');

      document.querySelectorAll('.tag-list-item-delete').forEach(btn => {
        btn.addEventListener('click', () => {
          if (confirm('Dieses Tag wirklich löschen?')) {
            deleteTag(btn.getAttribute('data-tag-id'));
            renderTagsList();
            renderTagFilter();
            renderFollowupTagFilter();
            renderKontakte();
            showToast('✅ Tag gelöscht');
          }
        });
      });
    }

    function renderTagFilter() {
      const tagFilterOptions = document.getElementById('tagFilterOptions');
      tagFilterOptions.innerHTML = state.tags.map(tag => {
        const contactCount = state.contacts.filter(c => c.tags && c.tags.includes(tag.id)).length;
        return `
          <div class="tag-filter-option" data-tag-id="${tag.id}">
            <div class="tag-filter-color-dot" style="background-color: ${tag.color}; border: 1px solid var(--line);"></div>
            <span>${tag.name} <span style="color: var(--muted);">(${contactCount})</span></span>
          </div>
        `;
      }).join('');

      document.querySelectorAll('.tag-filter-option[data-tag-id]').forEach(el => {
        el.addEventListener('click', () => {
          const tagId = el.getAttribute('data-tag-id');
          if (state.selectedTagFilter === tagId) {
            state.selectedTagFilter = null;
            document.getElementById('btnTagFilter').classList.remove('active');
            document.getElementById('tagFilterCount').textContent = '';
          } else {
            state.selectedTagFilter = tagId;
            document.getElementById('btnTagFilter').classList.add('active');
            const tag = getTagById(tagId);
            document.getElementById('tagFilterCount').textContent = tag ? ` (${tag.name})` : '';
          }
          document.getElementById('tagFilterMenu').classList.remove('show');
          renderKontakte();
        });
      });

      document.querySelector('[data-tag="all"]')?.addEventListener('click', () => {
        state.selectedTagFilter = null;
        document.getElementById('btnTagFilter').classList.remove('active');
        document.getElementById('tagFilterCount').textContent = '';
        document.getElementById('tagFilterMenu').classList.remove('show');
        renderKontakte();
      });
    }

    function renderFollowupTagFilter() {
      const tagFilterOptions = document.getElementById('followupTagFilterOptions');
      if (!tagFilterOptions) return;

      tagFilterOptions.innerHTML = state.tags.map(tag => {
        const contactCount = state.contacts.filter(c => c.tags && c.tags.includes(tag.id) && c.status === 'followup').length;
        return `
          <div class="tag-filter-option" data-followup-tag-id="${tag.id}">
            <div class="tag-filter-color-dot" style="background-color: ${tag.color}; border: 1px solid var(--line);"></div>
            <span>${tag.name} <span style="color: var(--muted);">(${contactCount})</span></span>
          </div>
        `;
      }).join('');

      document.querySelectorAll('.tag-filter-option[data-followup-tag-id]').forEach(el => {
        el.addEventListener('click', () => {
          const tagId = el.getAttribute('data-followup-tag-id');
          if (state.selectedFollowupTagFilter === tagId) {
            state.selectedFollowupTagFilter = null;
            document.getElementById('btnFollowupTagFilter').classList.remove('active');
            document.getElementById('followupTagFilterCount').textContent = '';
          } else {
            state.selectedFollowupTagFilter = tagId;
            document.getElementById('btnFollowupTagFilter').classList.add('active');
            const tag = getTagById(tagId);
            document.getElementById('followupTagFilterCount').textContent = tag ? ` (${tag.name})` : '';
          }
          document.getElementById('followupTagFilterMenu').classList.remove('show');
          renderFollowupGrid();
        });
      });

      document.querySelector('[data-followup-tag="all"]')?.addEventListener('click', () => {
        state.selectedFollowupTagFilter = null;
        document.getElementById('btnFollowupTagFilter').classList.remove('active');
        document.getElementById('followupTagFilterCount').textContent = '';
        document.getElementById('followupTagFilterMenu').classList.remove('show');
        renderFollowupGrid();
      });
    }

    function renderEditTagSelect() {
      const select = document.getElementById('editTagSelect');
      select.innerHTML = '<option value="">+ Tag hinzufügen...</option>' + state.tags.map(tag => `
        <option value="${tag.id}">${tag.name}</option>
      `).join('');

      select.addEventListener('change', (e) => {
        if (e.target.value && currentEditContactId) {
          addTagToContact(currentEditContactId, e.target.value);
          renderContactTagsInModal();
          renderKontakte();
          e.target.value = '';
        }
      });
    }

    function renderContactTagsInModal() {
      const contact = state.contacts.find(c => c.id === currentEditContactId);
      const container = document.getElementById('editTagsContainer');

      if (!contact || !contact.tags || contact.tags.length === 0) {
        container.innerHTML = '';
        return;
      }

      container.innerHTML = contact.tags.map(tagId => {
        const tag = getTagById(tagId);
        if (!tag) return '';
        return `
          <div class="tag-badge" style="background-color: ${tag.color}22; border-color: ${tag.color}; color: ${tag.color};">
            ${tag.name}
            <span class="tag-delete" data-tag-id="${tag.id}">✕</span>
          </div>
        `;
      }).join('');

      document.querySelectorAll('.tag-delete').forEach(btn => {
        btn.addEventListener('click', () => {
          removeTagFromContact(currentEditContactId, btn.getAttribute('data-tag-id'));
          renderContactTagsInModal();
          renderKontakte();
        });
      });
    }

    // CRM + OUTREACH HELPERS
    function normalizeCompanyName(name) {
      return (name || '').trim().toLowerCase();
    }

    function getCompanyByName(name) {
      const key = normalizeCompanyName(name);
      if (!key) return null;
      return state.companies.find(c => normalizeCompanyName(c.name) === key) || null;
    }

    function ensureCompanyStructure(company) {
      if (!company) return;
      if (!Array.isArray(company.branches) || company.branches.length === 0) {
        const primaryId = company.primaryBranchId || Math.random().toString(36).substr(2, 9);
        company.branches = [
          {
            id: primaryId,
            label: 'Hauptadresse',
            street: company.street || '',
            postal: company.postal || '',
            city: company.city || '',
            location: company.location || '',
            industry: company.industry || '',
            website: company.website || ''
          }
        ];
        company.primaryBranchId = primaryId;
      }
      if (!company.primaryBranchId && company.branches.length) {
        company.primaryBranchId = company.branches[0].id;
      }
      if (!Array.isArray(company.notesHistory)) {
        company.notesHistory = [];
        if (company.notes) {
          company.notesHistory.push({
            text: company.notes,
            timestamp: company.updatedAt || company.createdAt || new Date().toISOString(),
            status: 'note',
            mode: 'legacy',
            contactId: null,
            contactName: ''
          });
        }
      }
    }

    function getCompanyForContact(contact) {
      if (!contact) return null;
      if (contact.companyId) {
        return state.companies.find(c => c.id === contact.companyId) || null;
      }
      return getCompanyByName(contact.firma || '');
    }

    function getBranchForContact(contact, company) {
      if (!company) return null;
      ensureCompanyStructure(company);
      if (contact?.companyBranchId) {
        return company.branches.find(b => b.id === contact.companyBranchId) || null;
      }
      return company.branches.find(b => b.id === company.primaryBranchId) || company.branches[0] || null;
    }

    function getCompanyContactsByName(name, companyId) {
      const key = normalizeCompanyName(name);
      return state.contacts.filter(c => {
        if (companyId && c.companyId) return c.companyId === companyId;
        return normalizeCompanyName(c.firma || '') === key;
      });
    }

    function setPrimaryContactForCompany(targetContact) {
      if (!targetContact) return;
      const company = getCompanyForContact(targetContact);
      const companyName = company?.name || targetContact.firma || '';
      const contacts = getCompanyContactsByName(companyName, company?.id);
      contacts.forEach(c => {
        c.isPrimaryContact = c.id === targetContact.id;
      });
    }

    function setPrimaryBranchForCompany(company, branchId) {
      if (!company) return;
      ensureCompanyStructure(company);
      company.primaryBranchId = branchId;
      company.updatedAt = new Date().toISOString();
    }

    function renderCompanyBranchSelect(selectEl, company, selectedBranchId) {
      if (!selectEl) return;
      if (!company) {
        selectEl.innerHTML = '<option value="">-- Keine Firma --</option>';
        return;
      }
      ensureCompanyStructure(company);
      const options = company.branches.map(b => {
        const label = b.label || 'Adresse';
        const address = [b.street, b.postal, b.city].filter(Boolean).join(' ');
        const text = address ? `${label} · ${address}` : label;
        const selected = selectedBranchId === b.id ? 'selected' : '';
        return `<option value="${b.id}" ${selected}>${text}</option>`;
      }).join('');
      selectEl.innerHTML = options || '<option value="">-- Keine Adresse --</option>';
    }

    function renderRelatedContactsInModal(contact) {
      const container = document.getElementById('editRelatedContacts');
      if (!container || !contact) return;
      const company = getCompanyForContact(contact);
      const companyName = company?.name || contact.firma || '';
      const related = getCompanyContactsByName(companyName, company?.id)
        .filter(c => c.id !== contact.id);
      if (!related.length) {
        container.innerHTML = '<span style="color: var(--muted); font-size: 11px;">Keine weiteren Ansprechpartner</span>';
        return;
      }
      container.innerHTML = related.map(c => {
        const name = `${c.vorname || ''} ${c.nachname || ''}`.trim() || 'Kontakt';
        const primaryTag = c.isPrimaryContact ? ' ⭐' : '';
        return `<button class="btn" data-related-contact="${c.id}" style="padding: 4px 8px; font-size: 11px;">${name}${primaryTag}</button>`;
      }).join('');

      container.querySelectorAll('[data-related-contact]').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-related-contact');
          if (id) openEditModal(id);
        });
      });
    }

    function ensureCompaniesFromContacts() {
      // Erstelle Companies aus allen Kontakten die keine companyId haben
      const firmaMap = {}; // {normalizedFirma: {firma, kontakte, adressen}}
      
      state.contacts.forEach(c => {
        if (c.firma && !c.companyId) {
          const firmaKey = normalizeCompanyName(c.firma);
          if (!firmaMap[firmaKey]) {
            firmaMap[firmaKey] = {
              firmaName: c.firma,
              kontakte: [],
              adressen: new Map() // {street|city: [...kontakte]}
            };
          }
          firmaMap[firmaKey].kontakte.push(c);
          
          // Group by address (street + city)
          const addressKey = `${c.strasse || 'Keine Straße'}|${c.ortschaft || 'Keine Stadt'}`;
          if (!firmaMap[firmaKey].adressen.has(addressKey)) {
            firmaMap[firmaKey].adressen.set(addressKey, []);
          }
          firmaMap[firmaKey].adressen.get(addressKey).push(c);
        }
      });

      Object.keys(firmaMap).forEach(firmaKey => {
        const firmaData = firmaMap[firmaKey];
        
        // Check if company already exists
        const existing = state.companies.find(c => normalizeCompanyName(c.name) === firmaKey);
        if (existing) {
          // Link contacts to existing company with correct branches
          firmaData.kontakte.forEach(c => {
            c.companyId = existing.id;
            ensureCompanyStructure(existing);
            
            // Find or create matching branch for this contact
            const addressKey = `${c.strasse || 'Keine Straße'}|${c.ortschaft || 'Keine Stadt'}`;
            let matchingBranch = existing.branches.find(b => 
              (b.street === (c.strasse || '') || b.street === '') && 
              (b.city === (c.ortschaft || '') || b.city === '')
            );
            if (!matchingBranch) {
              matchingBranch = existing.branches[0];
            }
            c.companyBranchId = matchingBranch.id;
          });
          return;
        }

        // Create new company
        const company = {
          id: Math.random().toString(36).substr(2, 9),
          name: firmaData.firmaName,
          industry: firmaData.kontakte[0]?.region || '',
          location: firmaData.kontakte[0]?.ortschaft || '',
          website: '',
          street: firmaData.kontakte[0]?.strasse || '',
          postal: '',
          city: firmaData.kontakte[0]?.ortschaft || '',
          branches: [],
          createdAt: new Date().toISOString()
        };

        // Create a branch for each unique address
        const branchMap = {}; // {addressKey: branchId}
        let firstBranchId = null;
        
        firmaData.adressen.forEach((kontakte, addressKey) => {
          const [strasse, stadt] = addressKey.split('|');
          const branchId = Math.random().toString(36).substr(2, 9);
          
          let branchLabel = 'Hauptadresse';
          if (firmaData.adressen.size > 1) {
            // Multiple addresses - label them
            branchLabel = strasse === 'Keine Straße' ? stadt : `${strasse}, ${stadt}`;
          }
          
          company.branches.push({
            id: branchId,
            label: branchLabel,
            street: strasse === 'Keine Straße' ? '' : strasse,
            postal: '',
            city: stadt === 'Keine Stadt' ? '' : stadt,
            location: kontakte[0]?.region || '',
            industry: kontakte[0]?.region || '',
            website: ''
          });
          
          branchMap[addressKey] = branchId;
          if (!firstBranchId) firstBranchId = branchId;
        });

        company.primaryBranchId = firstBranchId;
        state.companies.push(company);

        // Link all contacts with this firma to the company and correct branch
        firmaData.kontakte.forEach(c => {
          c.companyId = company.id;
          const addressKey = `${c.strasse || 'Keine Straße'}|${c.ortschaft || 'Keine Stadt'}`;
          c.companyBranchId = branchMap[addressKey];
        });
      });
    }

    function getCompaniesByToken(token) {
      const key = (token || '').trim().toLowerCase();
      if (!key) return [];
      
      // Simply search in companies - all firmen should be companies now
      return state.companies.filter(c => normalizeCompanyName(c.name).includes(key));
    }

    function renderDuplicateResults() {
      const token = document.getElementById('crmDuplicateToken')?.value || '';
      const results = document.getElementById('crmDuplicateResults');
      if (!results) return;

      if (!token.trim()) {
        results.innerHTML = '<div style="color: var(--muted); font-size: 12px;">Token eingeben (z.B. "Remax", "Engel"), um Doubletten zu finden.</div>';
        return;
      }

      // Ensure all contact firmen are converted to companies first
      ensureCompaniesFromContacts();

      const matches = getCompaniesByToken(token);

      if (matches.length === 0) {
        results.innerHTML = '<div style="color: var(--muted); font-size: 12px;">Keine Treffer für "<strong>' + token.trim() + '</strong>".</div>';
        return;
      }

      results.innerHTML = matches.map(c => {
        ensureCompanyStructure(c);
        const branch = c.branches.find(b => b.id === c.primaryBranchId) || c.branches[0];
        const address = branch ? [branch.street, branch.postal, branch.city].filter(Boolean).join(' ') : '';
        const contactCount = state.contacts.filter(ct => normalizeCompanyName(ct.firma || '') === normalizeCompanyName(c.name)).length;
        const contactLabel = contactCount > 0 ? ` (${contactCount} Kontakte)` : '';
        return `
          <label style="display: flex; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px solid var(--border);">
            <input type="checkbox" data-duplicate-company="${c.id}">
            <span><strong>${c.name}</strong>${address ? ` · ${address}` : ''}<br><span style="font-size: 10px; color: var(--muted);">${contactLabel} • ${c.branches?.length || 1} Niederlassungen</span></span>
          </label>
        `;
      }).join('');
    }

    function mergeDuplicateCompanies() {
      // Step 1: Collect selected companies
      const selectedIds = Array.from(document.querySelectorAll('[data-duplicate-company]:checked'))
        .map(el => el.getAttribute('data-duplicate-company'))
        .filter(Boolean);

      if (selectedIds.length < 2) {
        showToast('❌ Bitte mindestens 2 Firmen auswählen');
        return;
      }

      // Open modal for branch selection
      openMergeDuplicatesModal(selectedIds);
    }

    function openMergeDuplicatesModal(companyIds) {
      // Resolve company objects from IDs (including temporary ones)
      const companies = companyIds.map(id => {
        let company = state.companies.find(c => c.id === id);
        // If not found and ID is temporary, keep the company object for display
        return company;
      }).filter(Boolean);
      
      if (companies.length === 0) return;

      // Store for later use
      window.mergeCompanyIds = companyIds;

      // Show selected companies
      document.getElementById('mergeSelectedCompanies').innerHTML = `
        <div style="background: var(--line); padding: 8px; border-radius: 6px; margin-bottom: 12px;">
          <strong>Ausgewählte Firmen (${companies.length}):</strong>
          <div style="margin-top: 6px;">
            ${companies.map(c => `<div style="font-size: 12px; margin: 4px 0;">• ${c.name}</div>`).join('')}
          </div>
        </div>
      `;

      // Create branch list from all selected companies
      let allBranches = [];
      companies.forEach(company => {
        // Ensure company has branches
        if (!company.branches) {
          company.branches = [{
            id: Math.random().toString(36).substr(2, 9),
            label: 'Hauptadresse',
            street: company.street || '',
            postal: company.postal || '',
            city: company.city || '',
            location: company.location || '',
            industry: company.industry || '',
            website: company.website || ''
          }];
          if (!company.primaryBranchId) {
            company.primaryBranchId = company.branches[0].id;
          }
        }
        
        company.branches.forEach(branch => {
          allBranches.push({
            companyId: company.id,
            companyName: company.name,
            ...branch
          });
        });
      });

      // Populate branch select
      const branchSelect = document.getElementById('mergeMainBranchSelect');
      branchSelect.innerHTML = '<option value="">-- Wähle Hauptniederlassung --</option>' +
        allBranches.map(b => {
          const address = [b.street, b.postal, b.city].filter(Boolean).join(' ');
          const label = b.label ? `${b.label} · ${b.companyName}` : `${b.companyName} · ${address}`;
          return `<option value="${b.companyId}|${b.id}">${label}</option>`;
        }).join('');

      // Show preview
      document.getElementById('mergeBranchesPreview').innerHTML = allBranches.map(b => {
        const address = [b.street, b.postal, b.city].filter(Boolean).join(' ') || '–';
        return `<div style="font-size: 11px; margin: 4px 0;">📍 ${b.label || 'Adresse'} · ${address}</div>`;
      }).join('');

      document.getElementById('mergeDuplicatesModal').classList.add('show');
    }

    function closeMergeDuplicatesModal() {
      document.getElementById('mergeDuplicatesModal').classList.remove('show');
      window.mergeCompanyIds = null;
    }

    function mergeDuplicateCompaniesConfirmed() {
      const selectedBranch = document.getElementById('mergeMainBranchSelect').value;
      const companyIds = window.mergeCompanyIds || [];

      if (!selectedBranch) {
        showToast('❌ Bitte Hauptniederlassung wählen');
        return;
      }

      const [masterCompanyId, masterBranchId] = selectedBranch.split('|');
      const master = state.companies.find(c => c.id === masterCompanyId);
      
      if (!master) {
        showToast('❌ Master-Firma nicht gefunden');
        return;
      }

      ensureCompanyStructure(master);
      master.primaryBranchId = masterBranchId;

      // Merge all other companies
      const idsToMerge = companyIds.filter(id => id !== masterCompanyId);
      idsToMerge.forEach(id => {
        const duplicate = state.companies.find(c => c.id === id);
        if (!duplicate) return;
        
        ensureCompanyStructure(duplicate);

        // Map duplicate branches to master
        const branchMap = {};
        duplicate.branches.forEach(branch => {
          // Check if master already has this address
          const existingBranch = master.branches.find(b => 
            (b.street === branch.street && b.postal === branch.postal && b.city === branch.city) ||
            b.id === branch.id
          );
          
          if (!existingBranch) {
            // Add as new branch to master
            branchMap[branch.id] = branch.id;
            master.branches.push({...branch});
          } else {
            // Map to existing branch
            branchMap[branch.id] = existingBranch.id;
          }
        });

        // Remap all contacts from duplicate company to master
        const dupName = duplicate.name || '';
        state.contacts.forEach(contact => {
          const contactCompany = normalizeCompanyName(contact.firma || '');
          if (contact.companyId === duplicate.id || contactCompany === normalizeCompanyName(dupName)) {
            contact.firma = master.name;
            contact.companyId = master.id;
            if (contact.companyBranchId && branchMap[contact.companyBranchId]) {
              contact.companyBranchId = branchMap[contact.companyBranchId];
            } else {
              contact.companyBranchId = master.primaryBranchId;
            }
          }
        });

        // Remove duplicate company
        state.companies = state.companies.filter(c => c.id !== duplicate.id);
      });

      master.updatedAt = new Date().toISOString();
      saveCompanies();
      saveContacts();
      renderCrmCompanies();
      renderCrmCompanyDetail();
      renderDuplicateResults();
      renderKontakte();
      closeMergeDuplicatesModal();
      showToast('✅ ' + (idsToMerge.length + 1) + ' Firmen zusammengeführt');
    }

    function getCompanyById(companyId) {
      return state.companies.find(c => c.id === companyId);
    }

    function getLeadById(leadId) {
      return state.leads.find(l => l.id === leadId);
    }

    function getTemplateById(templateId) {
      return state.templates.find(t => t.id === templateId);
    }

    function getCompanyNamePool() {
      const names = new Set();
      state.companies.forEach(c => {
        if (c.name) names.add(c.name.trim());
      });
      state.contacts.forEach(c => {
        if (c.firma) names.add(c.firma.trim());
      });
      return Array.from(names).filter(Boolean).sort((a, b) => a.localeCompare(b));
    }

    function updateCrmCompanyHint() {
      const input = document.getElementById('crmCompanyName');
      const hint = document.getElementById('crmCompanyHint');
      const list = document.getElementById('crmCompanySuggestions');
      if (!input || !hint || !list) return;

      const name = (input.value || '').trim();
      if (!name) {
        hint.textContent = '';
        list.style.display = 'none';
        return;
      }

      const exists = getCompanyByName(name);
      hint.textContent = exists ? `Gefunden: ${exists.name}` : 'Neue Firma wird angelegt';

      if (exists) {
        ensureCompanyStructure(exists);
        const primary = exists.branches.find(b => b.id === exists.primaryBranchId) || exists.branches[0];
        document.getElementById('crmCompanyIndustry').value = exists.industry || '';
        document.getElementById('crmCompanyLocation').value = exists.location || '';
        document.getElementById('crmCompanyWebsite').value = exists.website || '';
        document.getElementById('crmCompanyStreet').value = primary?.street || exists.street || '';
        document.getElementById('crmCompanyPostal').value = primary?.postal || exists.postal || '';
        document.getElementById('crmCompanyCity').value = primary?.city || exists.city || '';
      }

      const pool = getCompanyNamePool();
      const matches = pool.filter(n => n.toLowerCase().includes(name.toLowerCase()));
      list.innerHTML = matches.map(n => `
        <div class="suggestion-item" data-company-name="${n}">${n}</div>
      `).join('');
      list.style.display = matches.length ? 'block' : 'none';
      list.querySelectorAll('.suggestion-item').forEach(item => {
        item.addEventListener('click', () => {
          input.value = item.getAttribute('data-company-name') || '';
          list.style.display = 'none';
          updateCrmCompanyHint();
        });
      });
    }

    function renderCrmCompanies() {
      const tbody = document.getElementById('crmCompaniesBody');
      const countEl = document.getElementById('crmCompanyCount');
      if (!tbody || !countEl) return;

      const search = (document.getElementById('crmSearch')?.value || '').toLowerCase();
      const pool = getCompanyNamePool();
      const companies = pool.map(name => {
        const meta = getCompanyByName(name) || {};
        const contacts = getCompanyContactsByName(name, meta.id);
        return {
          name,
          industry: meta.industry || '',
          location: meta.location || meta.city || '',
          contactsCount: contacts.length
        };
      }).filter(c => {
        if (!search) return true;
        const text = `${c.name} ${c.industry} ${c.location}`.toLowerCase();
        return text.includes(search);
      });

      countEl.textContent = `${companies.length} Firmen`;

      if (companies.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--muted); padding: 16px;">Keine Firmen gefunden</td></tr>';
        return;
      }

      tbody.innerHTML = companies.map(c => `
        <tr data-crm-company="${c.name}" style="cursor: pointer;">
          <td>${c.name}</td>
          <td>${c.industry || '–'}</td>
          <td>${c.location || '–'}</td>
          <td>${c.contactsCount}</td>
        </tr>
      `).join('');

      tbody.querySelectorAll('[data-crm-company]').forEach(row => {
        row.addEventListener('click', () => {
          const name = row.getAttribute('data-crm-company');
          state.crmSelectedCompany = name;
          renderCrmCompanyDetail();
        });
      });
    }

    function renderCrmCompanyDetail() {
      const title = document.getElementById('crmDetailTitle');
      const sub = document.getElementById('crmDetailSub');
      const tbody = document.getElementById('crmContactsBody');
      const notesContainer = document.getElementById('crmCompanyNotesHistory');
      const notesFilter = document.getElementById('crmCompanyNotesFilter');
      const branchSelect = document.getElementById('crmNewContactBranch');
      const primaryCheckbox = document.getElementById('crmNewContactPrimary');
      if (!title || !sub || !tbody) return;

      const name = state.crmSelectedCompany;
      if (!name) {
        title.textContent = 'Firma auswaehlen';
        sub.textContent = 'Waehl eine Firma, um Kontakte zu sehen';
        tbody.innerHTML = '';
        if (notesContainer) notesContainer.innerHTML = '<div style="color: var(--muted); font-size: 11px; text-align: center;">Keine Firma ausgewaehlt</div>';
        if (notesFilter) notesFilter.innerHTML = '<option value="all">Alle Kontaktpersonen</option>';
        if (branchSelect) branchSelect.innerHTML = '<option value="">-- Keine Firma --</option>';
        if (primaryCheckbox) primaryCheckbox.checked = false;
        return;
      }

      const contacts = getCompanyContactsByName(name);
      const meta = getCompanyByName(name);
      if (meta) ensureCompanyStructure(meta);
      const primaryBranch = meta?.branches?.find(b => b.id === meta.primaryBranchId) || meta?.branches?.[0];
      const metaText = meta
        ? `${meta.industry || '–'} • ${meta.location || meta.city || '–'} • ${primaryBranch?.street || meta.street || '–'}`
        : '–';
      title.textContent = name;
      sub.textContent = metaText;

      renderCompanyBranchSelect(branchSelect, meta, meta?.primaryBranchId || '');
      if (primaryCheckbox) {
        const hasPrimary = contacts.some(c => c.isPrimaryContact);
        primaryCheckbox.checked = !hasPrimary;
      }

      const addressRows = (meta?.branches || []).map(branch => {
        const address = [branch.street, branch.postal, branch.city].filter(Boolean).join(' ');
        const isPrimary = branch.id === meta.primaryBranchId;
        const marker = isPrimary ? 'Hauptadresse' : 'Zweigniederlassung';
        const action = isPrimary
          ? '<span style="color: var(--muted); font-size: 11px;">Standard</span>'
          : `<button class="btn" data-branch-primary="${branch.id}" style="padding: 4px 8px; font-size: 11px;">Hauptadresse</button>`;
        return `
          <tr>
            <td>Adresse</td>
            <td>${address || '–'}</td>
            <td>–</td>
            <td>–</td>
            <td>–</td>
            <td>${marker}</td>
            <td>${action}</td>
          </tr>
        `;
      });

      const contactRows = contacts.map(c => {
        const isPrimary = Boolean(c.isPrimaryContact);
        const marker = isPrimary ? 'Hauptansprechperson' : '';
        const actionPrimary = isPrimary
          ? '<span style="color: var(--muted); font-size: 11px;">Standard</span>'
          : `<button class="btn" data-contact-primary="${c.id}" style="padding: 4px 8px; font-size: 11px;">Hauptanspr.</button>`;
        return `
          <tr>
            <td>Kontakt</td>
            <td>${c.vorname || ''} ${c.nachname || ''}</td>
            <td>${c.rolle || '–'}</td>
            <td>${c.telefon || '–'}</td>
            <td>${c.email || '–'}</td>
            <td>${marker || '–'}</td>
            <td>
              <button class="btn" data-crm-contact="${c.id}" style="padding: 4px 8px; font-size: 11px;">✎ Edit</button>
              ${actionPrimary}
            </td>
          </tr>
        `;
      });

      renderCrmCompanyNotes(meta, contacts);

      if (addressRows.length === 0 && contactRows.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--muted); padding: 16px;">Keine Eintraege vorhanden</td></tr>';
        return;
      }

      tbody.innerHTML = [...addressRows, ...contactRows].join('');

      tbody.querySelectorAll('[data-crm-contact]').forEach(btn => {
        btn.addEventListener('click', () => {
          openEditModal(btn.getAttribute('data-crm-contact'));
        });
      });

      tbody.querySelectorAll('[data-contact-primary]').forEach(btn => {
        btn.addEventListener('click', () => {
          const contactId = btn.getAttribute('data-contact-primary');
          const target = state.contacts.find(c => c.id === contactId);
          if (target) {
            setPrimaryContactForCompany(target);
            saveContacts();
            renderCrmCompanyDetail();
            showToast('✅ Hauptansprechperson gesetzt');
          }
        });
      });

      tbody.querySelectorAll('[data-branch-primary]').forEach(btn => {
        btn.addEventListener('click', () => {
          const branchId = btn.getAttribute('data-branch-primary');
          if (meta && branchId) {
            setPrimaryBranchForCompany(meta, branchId);
            saveCompanies();
            renderCrmCompanyDetail();
            showToast('✅ Hauptadresse gesetzt');
          }
        });
      });

    }

    function renderCrmCompanyNotes(company, contacts) {
      const container = document.getElementById('crmCompanyNotesHistory');
      const filter = document.getElementById('crmCompanyNotesFilter');
      if (!container || !filter) return;

      const companyContacts = Array.isArray(contacts) ? contacts : [];
      const previous = filter.value || 'all';
      const options = ['<option value="all">Alle Kontaktpersonen</option>']
        .concat(companyContacts.map(c => `<option value="${c.id}">${getSessionPersonDisplayName(c)}</option>`));
      filter.innerHTML = options.join('');
      filter.value = [...filter.options].some(o => o.value === previous) ? previous : 'all';

      const selectedId = filter.value || 'all';
      const entries = Array.isArray(company?.notesHistory) ? company.notesHistory.slice() : [];
      const filteredEntries = entries
        .filter(e => selectedId === 'all' || (e.contactId && e.contactId === selectedId))
        .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

      if (!filteredEntries.length) {
        container.innerHTML = '<div style="color: var(--muted); font-size: 11px; text-align: center;">Keine Firmen-Notizen vorhanden</div>';
        return;
      }

      container.innerHTML = filteredEntries.map((entry, idx) => `
        <div style="padding: 8px 0; ${idx < filteredEntries.length - 1 ? 'border-bottom: 1px solid var(--line);' : ''}">
          <div style="font-size: 10px; color: var(--muted); margin-bottom: 4px; display:flex; gap:8px; flex-wrap:wrap;">
            <span>📅 ${new Date(entry.timestamp).toLocaleString('de-CH', { dateStyle: 'short', timeStyle: 'short' })}</span>
            <span>👤 ${entry.contactName || 'Unbekannt'}</span>
            <span>🏷 ${entry.mode || 'session'}</span>
            ${entry.status ? `<span>• ${getStatusLabel(entry.status)}</span>` : ''}
          </div>
          <div style="font-size: 12px; white-space: pre-wrap;">${entry.text || ''}</div>
        </div>
      `).join('');
    }

    function addCrmAddress() {
      if (!requirePermission('entities_manage', 'Nur Admin/Manager duerfen CRM-Firmen bearbeiten')) return;
      const companyName = document.getElementById('crmCompanyName').value.trim();
      if (!companyName) {
        showToast('❌ Firmenname fehlt');
        return;
      }

      const draft = {
        vorname: document.getElementById('crmContactFirst').value.trim(),
        nachname: document.getElementById('crmContactLast').value.trim(),
        firma: companyName,
        telefon: document.getElementById('crmContactPhone').value.trim(),
        email: document.getElementById('crmContactEmail').value.trim()
      };
      const contactError = validateContactData(draft, { requireCompany: true });
      if (contactError) {
        showToast(`❌ ${contactError}`);
        return;
      }
      const duplicate = findDuplicateContact(draft);
      if (duplicate) {
        showToast(`⚠️ Dublette erkannt: ${duplicate.vorname || ''} ${duplicate.nachname || ''} (${duplicate.firma || 'Ohne Firma'})`);
        return;
      }

      let company = getCompanyByName(companyName);
      if (!company) {
        const branchId = Math.random().toString(36).substr(2, 9);
        company = {
          id: Math.random().toString(36).substr(2, 9),
          name: companyName,
          industry: document.getElementById('crmCompanyIndustry').value.trim(),
          location: document.getElementById('crmCompanyLocation').value.trim(),
          website: document.getElementById('crmCompanyWebsite').value.trim(),
          street: document.getElementById('crmCompanyStreet').value.trim(),
          postal: document.getElementById('crmCompanyPostal').value.trim(),
          city: document.getElementById('crmCompanyCity').value.trim(),
          primaryBranchId: branchId,
          branches: [
            {
              id: branchId,
              label: 'Hauptadresse',
              street: document.getElementById('crmCompanyStreet').value.trim(),
              postal: document.getElementById('crmCompanyPostal').value.trim(),
              city: document.getElementById('crmCompanyCity').value.trim(),
              location: document.getElementById('crmCompanyLocation').value.trim(),
              industry: document.getElementById('crmCompanyIndustry').value.trim(),
              website: document.getElementById('crmCompanyWebsite').value.trim()
            }
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        state.companies.push(company);
        saveCompanies();
      } else {
        ensureCompanyStructure(company);
        const primary = company.branches.find(b => b.id === company.primaryBranchId) || company.branches[0];
        if (primary) {
          primary.street = document.getElementById('crmCompanyStreet').value.trim();
          primary.postal = document.getElementById('crmCompanyPostal').value.trim();
          primary.city = document.getElementById('crmCompanyCity').value.trim();
          primary.location = document.getElementById('crmCompanyLocation').value.trim();
          primary.industry = document.getElementById('crmCompanyIndustry').value.trim();
          primary.website = document.getElementById('crmCompanyWebsite').value.trim();
        }
        company.industry = document.getElementById('crmCompanyIndustry').value.trim();
        company.location = document.getElementById('crmCompanyLocation').value.trim();
        company.website = document.getElementById('crmCompanyWebsite').value.trim();
        company.street = document.getElementById('crmCompanyStreet').value.trim();
        company.postal = document.getElementById('crmCompanyPostal').value.trim();
        company.city = document.getElementById('crmCompanyCity').value.trim();
        company.updatedAt = new Date().toISOString();
        saveCompanies();
      }

      const hasPrimary = getCompanyContactsByName(company.name, company.id).some(c => c.isPrimaryContact);
      const contact = {
        id: Math.random().toString(36).substr(2, 9),
        vorname: document.getElementById('crmContactFirst').value.trim(),
        nachname: document.getElementById('crmContactLast').value.trim(),
        firma: company.name,
        companyId: company.id,
        companyBranchId: company.primaryBranchId || null,
        telefon: document.getElementById('crmContactPhone').value.trim(),
        email: document.getElementById('crmContactEmail').value.trim(),
        linkedin: document.getElementById('crmContactLinkedIn').value.trim(),
        unternehmenstelefon: '',
        unternehmensemail: '',
        rolle: document.getElementById('crmContactRole').value.trim(),
        strasse: '',
        ortschaft: '',
        region: '',
        status: 'new',
        notes: '',
        source: 'crm',
        dealStage: null,
        dealValue: null,
        dealProbability: null,
        dealCloseDate: null,
        isPrimaryContact: !hasPrimary,
        createdAt: new Date().toISOString()
      };

      state.contacts.push(contact);
      if (contact.isPrimaryContact) {
        setPrimaryContactForCompany(contact);
      }
      saveContacts();
      renderDashboard();
      renderContactsTable();
      renderCrmCompanies();
      state.crmSelectedCompany = company.name;
      renderCrmCompanyDetail();
      showToast('✅ Adresse gespeichert');
    }

    function addCrmContactToSelectedCompany() {
      if (!requirePermission('entities_manage', 'Nur Admin/Manager duerfen CRM-Kontakte bearbeiten')) return;
      const name = state.crmSelectedCompany;
      if (!name) {
        showToast('❌ Bitte Firma auswaehlen');
        return;
      }

      const draft = {
        vorname: document.getElementById('crmNewContactFirst').value.trim(),
        nachname: document.getElementById('crmNewContactLast').value.trim(),
        firma: name,
        telefon: document.getElementById('crmNewContactPhone').value.trim(),
        email: document.getElementById('crmNewContactEmail').value.trim()
      };
      const contactError = validateContactData(draft, { requireCompany: true });
      if (contactError) {
        showToast(`❌ ${contactError}`);
        return;
      }
      const duplicate = findDuplicateContact(draft);
      if (duplicate) {
        showToast(`⚠️ Dublette erkannt: ${duplicate.vorname || ''} ${duplicate.nachname || ''} (${duplicate.firma || 'Ohne Firma'})`);
        return;
      }

      const company = getCompanyByName(name);
      if (company) ensureCompanyStructure(company);
      const branchSelect = document.getElementById('crmNewContactBranch');
      const selectedBranchId = branchSelect?.value || company?.primaryBranchId || null;
      const hasPrimary = company ? getCompanyContactsByName(company.name, company.id).some(c => c.isPrimaryContact) : false;
      const isPrimary = document.getElementById('crmNewContactPrimary')?.checked || !hasPrimary;

      const contact = {
        id: Math.random().toString(36).substr(2, 9),
        vorname: document.getElementById('crmNewContactFirst').value.trim(),
        nachname: document.getElementById('crmNewContactLast').value.trim(),
        firma: name,
        companyId: company?.id || null,
        companyBranchId: selectedBranchId,
        telefon: document.getElementById('crmNewContactPhone').value.trim(),
        email: document.getElementById('crmNewContactEmail').value.trim(),
        linkedin: document.getElementById('crmNewContactLinkedIn').value.trim(),
        unternehmenstelefon: '',
        unternehmensemail: '',
        rolle: document.getElementById('crmNewContactRole').value.trim(),
        strasse: '',
        ortschaft: '',
        region: '',
        status: 'new',
        notes: '',
        source: 'crm',
        dealStage: null,
        dealValue: null,
        dealProbability: null,
        dealCloseDate: null,
        isPrimaryContact: isPrimary,
        createdAt: new Date().toISOString()
      };

      state.contacts.push(contact);
      if (contact.isPrimaryContact) {
        setPrimaryContactForCompany(contact);
      }
      saveContacts();
      renderCrmCompanyDetail();
      renderDashboard();
      renderContactsTable();
      showToast('✅ Kontaktperson gespeichert');
    }

    function getContactSearchText(contact) {
      const notesHistory = Array.isArray(contact.notesHistory) ? contact.notesHistory.map(n => n.text).join(' ') : '';
      const companyMeta = state.companies.find(c => (c.name || '').toLowerCase() === (contact.firma || '').toLowerCase());
      const companyText = companyMeta ? `${companyMeta.industry || ''} ${companyMeta.location || ''} ${companyMeta.website || ''}` : '';
      return [
        contact.vorname,
        contact.nachname,
        contact.firma,
        contact.telefon,
        contact.email,
        contact.rolle,
        contact.region,
        contact.ortschaft,
        contact.strasse,
        contact.linkedin,
        contact.status,
        contact.outreachStatus,
        contact.dealStage,
        contact.dealValue,
        contact.dealProbability,
        contact.dealCloseDate,
        contact.notes,
        notesHistory,
        companyText
      ].filter(Boolean).join(' ').toLowerCase();
    }

    function renderGlobalSearchResults(query) {
      const results = document.getElementById('globalSearchResults');
      if (!results) return;
      const q = (query || '').trim().toLowerCase();
      if (!q) {
        results.style.display = 'none';
        results.innerHTML = '';
        return;
      }

      const matches = state.contacts
        .map(c => ({
          contact: c,
          text: getContactSearchText(c)
        }))
        .filter(x => x.text.includes(q))
        .slice(0, 20);

      if (matches.length === 0) {
        results.innerHTML = '<div class="global-search-item" style="cursor: default;">Keine Treffer</div>';
        results.style.display = 'block';
        return;
      }

      results.innerHTML = matches.map(m => {
        const c = m.contact;
        const name = `${c.vorname || ''} ${c.nachname || ''}`.trim() || 'Kontakt';
        const company = c.firma || '–';
        const status = c.dealStage || c.status || '–';
        return `
          <div class="global-search-item" data-contact-id="${c.id}">
            <div>
              <div style="font-weight: 600;">${name}</div>
              <div style="color: var(--muted); font-size: 11px;">${company}</div>
            </div>
            <div style="color: var(--muted); font-size: 11px; align-self: center;">${status}</div>
          </div>
        `;
      }).join('');

      results.style.display = 'block';
      results.querySelectorAll('[data-contact-id]').forEach(item => {
        item.addEventListener('click', () => {
          const id = item.getAttribute('data-contact-id');
          results.style.display = 'none';
          openEditModal(id);
        });
      });
    }

    function getLeadChannelByContact(contact) {
      const hasLinkedIn = state.activities.some(a => a.contactId === contact.id && a.channel === 'linkedin');
      if (hasLinkedIn) return 'linkedin';
      return contact?.source || 'calls';
    }

    function getContactLatestNote(contact) {
      const notesHistory = Array.isArray(contact?.notesHistory) ? contact.notesHistory : [];
      if (notesHistory.length > 0) {
        return notesHistory[notesHistory.length - 1].text || '';
      }
      return contact?.notes || '';
    }

    function findOrCreateCompanyByName(name) {
      const clean = (name || '').trim();
      if (!clean) return null;
      let company = state.companies.find(c => (c.name || '').toLowerCase() === clean.toLowerCase());
      if (!company) {
        company = {
          id: Math.random().toString(36).substr(2, 9),
          name: clean,
          industry: '',
          location: '',
          website: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        state.companies.push(company);
        saveCompanies();
      }
      return company;
    }

    function syncLeadFromContact(contact) {
      if (!contact?.leadId) return;
      const lead = state.leads.find(l => l.id === contact.leadId);
      if (!lead) return;

      const company = findOrCreateCompanyByName(contact.firma);
      lead.name = `${contact.vorname || ''} ${contact.nachname || ''}`.trim();
      lead.companyId = company ? company.id : null;
      lead.email = contact.email || '';
      lead.phone = contact.telefon || '';
      lead.linkedin = contact.linkedin || '';
      lead.tags = Array.isArray(contact.tags) ? contact.tags.slice() : [];
      lead.notes = getContactLatestNote(contact);
      lead.updatedAt = new Date().toISOString();

      saveLeads();
      renderCompanyOptions();
    }

    function ensureLeadFromContact(contactId) {
      const contact = state.contacts.find(c => c.id === contactId);
      if (!contact) return;

      if (!contact.leadId) {
        const company = findOrCreateCompanyByName(contact.firma);
        const lead = {
          id: Math.random().toString(36).substr(2, 9),
          contactId: contact.id,
          name: `${contact.vorname || ''} ${contact.nachname || ''}`.trim(),
          role: contact.rolle || '',
          companyId: company ? company.id : null,
          email: contact.email || '',
          phone: contact.telefon || '',
          linkedin: contact.linkedin || '',
          status: 'new',
          owner: state.settings.name || '',
          tags: Array.isArray(contact.tags) ? contact.tags.slice() : [],
          notes: getContactLatestNote(contact),
          channel: 'linkedin',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        state.leads.push(lead);
        contact.leadId = lead.id;
        contact.source = 'linkedin';
        saveContacts();
        saveLeads();
        renderLeadsTable();
        renderOutreachContactOptions();
        renderCompanyOptions();
        renderAnalytics();
        showToast('✅ Kontakt als Lead verknuepft');
      } else {
        syncLeadFromContact(contact);
        showToast('✅ Lead mit Kontakt synchronisiert');
      }
    }

    function removeLeadAndRelations(leadId) {
      state.leads = state.leads.filter(l => l.id !== leadId);
      state.activities = state.activities.filter(a => a.leadId !== leadId);
      state.deals.forEach(d => {
        if (d.leadId === leadId) d.leadId = null;
      });
      state.contacts.forEach(c => {
        if (c.leadId === leadId) c.leadId = null;
      });
      saveLeads();
      saveActivities();
      saveDeals();
      saveContacts();
    }

    function renderCompanyOptions() {
      const selectOptions = ['<option value="">-- Firma waehlen --</option>']
        .concat(state.companies.map(c => `<option value="${c.id}">${c.name}</option>`))
        .join('');

      const dealSelect = document.getElementById('dealCompany');
      if (dealSelect) dealSelect.innerHTML = selectOptions;
    }

    function renderLeadOptions() {
      const options = ['<option value="">-- Lead waehlen --</option>']
        .concat(state.leads.map(l => `<option value="${l.id}">${l.name || 'Lead'}</option>`))
        .join('');
      const dealSelect = document.getElementById('dealLead');
      if (dealSelect) dealSelect.innerHTML = options;
    }

    function renderOutreachContactOptions() {
      const options = ['<option value="">-- Kontakt waehlen --</option>']
        .concat(state.contacts.map(c => {
          const name = `${c.vorname || ''} ${c.nachname || ''}`.trim() || 'Kontakt';
          const company = c.firma ? ` (${c.firma})` : '';
          return `<option value="${c.id}">${name}${company}</option>`;
        }))
        .join('');

      const el = document.getElementById('activityContact');
      if (el) el.innerHTML = options;
    }

    function renderTemplateOptions() {
      const options = ['<option value="">-- Template waehlen --</option>']
        .concat(state.templates.map(t => `<option value="${t.id}">${t.name}</option>`))
        .join('');
      const el = document.getElementById('activityTemplate');
      if (el) el.innerHTML = options;
    }

    function renderCompaniesTable() {
      const tbody = document.getElementById('companiesTableBody');
      if (!tbody) return;

      if (state.companies.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--muted); padding: 16px;">Keine Firmen vorhanden</td></tr>';
        return;
      }

      tbody.innerHTML = state.companies.map(c => `
        <tr>
          <td>${c.name || '–'}</td>
          <td>${c.industry || '–'}</td>
          <td>${c.location || '–'}</td>
          <td>${c.website ? `<a href="${c.website}" target="_blank">Link</a>` : '–'}</td>
          <td><button class="btn" data-company-id="${c.id}" style="padding: 4px 8px; font-size: 11px;">🗑️</button></td>
        </tr>
      `).join('');

      tbody.querySelectorAll('[data-company-id]').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-company-id');
          state.companies = state.companies.filter(c => c.id !== id);
          state.leads.forEach(l => {
            if (l.companyId === id) l.companyId = null;
          });
          state.deals.forEach(d => {
            if (d.companyId === id) d.companyId = null;
          });
          saveCompanies();
          saveLeads();
          saveDeals();
          renderCompaniesTable();
          renderCompanyOptions();
          renderLeadOptions();
          renderDealsTable();
          renderLeadsTable();
          showToast('✅ Firma geloescht');
        });
      });
    }

    function renderLeadsTable() {
      const tbody = document.getElementById('leadsTableBody');
      if (!tbody) return;

      if (state.leads.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--muted); padding: 16px;">Keine Leads vorhanden</td></tr>';
        return;
      }

      tbody.innerHTML = state.leads.map(l => {
        const company = getCompanyById(l.companyId);
        const status = l.status || 'new';
        return `
          <tr>
            <td>${l.name || '–'}</td>
            <td>${company ? company.name : '–'}</td>
            <td>${l.role || '–'}</td>
            <td>
              <select class="input-field lead-status-select" data-lead-id="${l.id}" style="margin: 0;">
                <option value="new" ${status === 'new' ? 'selected' : ''}>Neu</option>
                <option value="contacted" ${status === 'contacted' ? 'selected' : ''}>Kontaktiert</option>
                <option value="replied" ${status === 'replied' ? 'selected' : ''}>Antwort</option>
                <option value="meeting" ${status === 'meeting' ? 'selected' : ''}>Termin</option>
                <option value="won" ${status === 'won' ? 'selected' : ''}>Gewonnen</option>
                <option value="lost" ${status === 'lost' ? 'selected' : ''}>Verloren</option>
              </select>
            </td>
            <td><button class="btn" data-lead-id="${l.id}" style="padding: 4px 8px; font-size: 11px;">🗑️</button></td>
          </tr>
        `;
      }).join('');

      tbody.querySelectorAll('.lead-status-select').forEach(select => {
        select.addEventListener('change', () => {
          const id = select.getAttribute('data-lead-id');
          const lead = getLeadById(id);
          if (lead) {
            lead.status = select.value;
            lead.updatedAt = new Date().toISOString();
            saveLeads();
            renderAnalytics();
          }
        });
      });

      tbody.querySelectorAll('[data-lead-id]').forEach(btn => {
        if (btn.classList.contains('lead-status-select')) return;
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-lead-id');
          removeLeadAndRelations(id);
          renderLeadsTable();
          renderOutreachContactOptions();
          renderDealsTable();
          renderActivitiesTable();
          renderAnalytics();
          showToast('✅ Lead geloescht');
        });
      });
    }

    function renderDealsTable() {
      const tbody = document.getElementById('dealsTableBody');
      if (!tbody) return;

      if (state.deals.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--muted); padding: 16px;">Keine Deals vorhanden</td></tr>';
        return;
      }

      tbody.innerHTML = state.deals.map(d => {
        const company = getCompanyById(d.companyId);
        const lead = getLeadById(d.leadId);
        const stage = d.stage || 'prospecting';
        return `
          <tr>
            <td>${d.title || '–'}</td>
            <td>${company ? company.name : '–'}</td>
            <td>${lead ? lead.name : '–'}</td>
            <td>
              <select class="input-field deal-stage-select" data-deal-id="${d.id}" style="margin: 0;">
                <option value="prospecting" ${stage === 'prospecting' ? 'selected' : ''}>Prospecting</option>
                <option value="qualified" ${stage === 'qualified' ? 'selected' : ''}>Qualified</option>
                <option value="meeting" ${stage === 'meeting' ? 'selected' : ''}>Meeting</option>
                <option value="proposal" ${stage === 'proposal' ? 'selected' : ''}>Proposal</option>
                <option value="won" ${stage === 'won' ? 'selected' : ''}>Won</option>
                <option value="lost" ${stage === 'lost' ? 'selected' : ''}>Lost</option>
              </select>
            </td>
            <td>${d.value ? `${d.value} CHF` : '–'}</td>
            <td>${d.owner || '–'}</td>
            <td><button class="btn" data-deal-id="${d.id}" style="padding: 4px 8px; font-size: 11px;">🗑️</button></td>
          </tr>
        `;
      }).join('');

      tbody.querySelectorAll('.deal-stage-select').forEach(select => {
        select.addEventListener('change', () => {
          if (!requirePermission('entities_manage', 'Nur Admin/Manager duerfen Deal-Stages aendern')) {
            renderDealsTable();
            return;
          }
          const id = select.getAttribute('data-deal-id');
          const deal = state.deals.find(d => d.id === id);
          if (deal) {
            const previousStage = deal.stage || 'prospecting';
            deal.stage = select.value;
            deal.updatedAt = new Date().toISOString();
            saveDeals();

            const lead = deal.leadId ? getLeadById(deal.leadId) : null;
            const contactId = lead?.contactId || null;
            if (previousStage !== deal.stage) {
              logTimelineEvent({
                contactId,
                leadId: deal.leadId || null,
                dealId: deal.id,
                companyId: deal.companyId || null,
                type: 'deal_stage_change',
                status: 'system',
                note: `${previousStage} -> ${deal.stage}`,
                channel: 'system',
                timestamp: deal.updatedAt
              });
            }

            if (lead && ['won', 'lost'].includes(deal.stage) && lead.status !== deal.stage) {
              lead.status = deal.stage;
              lead.updatedAt = new Date().toISOString();
              saveLeads();
              renderLeadsTable();
              renderAnalytics();
            }
          }
        });
      });

      tbody.querySelectorAll('[data-deal-id]').forEach(btn => {
        if (btn.classList.contains('deal-stage-select')) return;
        btn.addEventListener('click', () => {
          if (!requirePermission('entities_manage', 'Nur Admin/Manager duerfen Deals loeschen')) return;
          const id = btn.getAttribute('data-deal-id');
          state.deals = state.deals.filter(d => d.id !== id);
          saveDeals();
          renderDealsTable();
          showToast('✅ Deal geloescht');
        });
      });
    }

    function renderPipelineBoard() {
      const board = document.getElementById('pipelineBoard');
      if (!board) return;

      const stages = [
        { id: 'prospecting', label: 'Prospecting' },
        { id: 'qualified', label: 'Qualified' },
        { id: 'meeting', label: 'Meeting' },
        { id: 'proposal', label: 'Proposal' },
        { id: 'won', label: 'Won' },
        { id: 'lost', label: 'Lost' }
      ];

      board.innerHTML = stages.map(stage => {
        const items = state.deals.filter(d => (d.stage || 'prospecting') === stage.id);
        const cards = items.map(d => {
          const company = d.companyId ? getCompanyById(d.companyId)?.name : '';
          const value = d.value ? `CHF ${d.value}` : '—';
          return `
            <div class="kanban-card">
              <div style="font-weight: 600; margin-bottom: 4px;">${d.title}</div>
              <div style="color: var(--muted);">${company || 'Ohne Firma'}</div>
              <div style="margin-top: 6px;">${value}</div>
            </div>
          `;
        }).join('') || '<div style="color: var(--muted); font-size: 12px;">Keine Deals</div>';

        return `
          <div class="kanban-col" data-stage="${stage.id}">
            <h4>${stage.label} · ${items.length}</h4>
            ${cards}
          </div>
        `;
      }).join('');
    }

    function renderActivitiesTable() {
      const tbody = document.getElementById('activityTableBody');
      if (!tbody) return;

      if (state.activities.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--muted); padding: 16px;">Keine Aktivitaeten vorhanden</td></tr>';
        return;
      }

      const sorted = state.activities.slice().sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      tbody.innerHTML = sorted.map(a => {
        const contact = a.contactId ? state.contacts.find(c => c.id === a.contactId) : null;
        const lead = a.leadId ? getLeadById(a.leadId) : null;
        const company = a.companyId ? getCompanyById(a.companyId) : null;
        const companyName = contact?.firma || company?.name || (lead ? getCompanyById(lead.companyId)?.name : null);
        const displayName = contact ? `${contact.vorname || ''} ${contact.nachname || ''}`.trim() : (lead?.name || '–');
        const template = getTemplateById(a.templateId);
        return `
          <tr>
            <td>${new Date(a.timestamp).toLocaleString('de-CH', { dateStyle: 'short', timeStyle: 'short' })}</td>
            <td>${displayName || '–'}</td>
            <td>${companyName || '–'}</td>
            <td>${getActivityTypeLabel(a.type)}</td>
            <td>${getActivityStatusLabel(a.status)}</td>
            <td>${template ? template.name : '–'}</td>
            <td style="max-width: 220px; overflow: hidden; text-overflow: ellipsis;">${a.note || '–'}</td>
            <td><button class="btn" data-activity-id="${a.id}" style="padding: 4px 8px; font-size: 11px;">🗑️</button></td>
          </tr>
        `;
      }).join('');

      tbody.querySelectorAll('[data-activity-id]').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-activity-id');
          state.activities = state.activities.filter(a => a.id !== id);
          saveActivities();
          renderActivitiesTable();
          renderAnalytics();
          showToast('✅ Aktivitaet geloescht');
        });
      });
    }

    function renderTemplatesList() {
      const container = document.getElementById('templatesList');
      if (!container) return;

      if (state.templates.length === 0) {
        container.innerHTML = '<div style="color: var(--muted); font-size: 12px; text-align: center; padding: 16px;">Keine Templates vorhanden</div>';
        return;
      }

      container.innerHTML = state.templates.map(t => `
        <div style="background: var(--card); border: 1px solid var(--line); border-radius: 8px; padding: 12px;">
          <div style="display: flex; justify-content: space-between; gap: 8px;">
            <div>
              <div style="font-size: 12px; font-weight: 600;">${t.name}</div>
              <div style="font-size: 10px; color: var(--muted);">${t.stage}</div>
            </div>
            <button class="btn" data-template-id="${t.id}" style="padding: 4px 8px; font-size: 11px;">🗑️</button>
          </div>
          <div style="font-size: 12px; white-space: pre-wrap; margin-top: 8px;">${t.body}</div>
        </div>
      `).join('');

      container.querySelectorAll('[data-template-id]').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-template-id');
          state.templates = state.templates.filter(t => t.id !== id);
          saveTemplates();
          renderTemplatesList();
          renderTemplateOptions();
          showToast('✅ Template geloescht');
        });
      });
    }

    function renderSequencesList() {
      const container = document.getElementById('sequencesList');
      if (!container) return;

      if (state.sequences.length === 0) {
        container.innerHTML = '<div style="color: var(--muted); font-size: 12px; text-align: center; padding: 16px;">Keine Sequenzen vorhanden</div>';
        return;
      }

      container.innerHTML = state.sequences.map(s => `
        <div style="background: var(--card); border: 1px solid var(--line); border-radius: 8px; padding: 12px;">
          <div style="display: flex; justify-content: space-between; gap: 8px;">
            <div style="font-size: 12px; font-weight: 600;">${s.name}</div>
            <button class="btn" data-sequence-id="${s.id}" style="padding: 4px 8px; font-size: 11px;">🗑️</button>
          </div>
          <div style="font-size: 12px; white-space: pre-wrap; margin-top: 8px;">${s.stepsText || ''}</div>
        </div>
      `).join('');

      container.querySelectorAll('[data-sequence-id]').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-sequence-id');
          state.sequences = state.sequences.filter(s => s.id !== id);
          saveSequences();
          renderSequencesList();
          showToast('✅ Sequenz geloescht');
        });
      });
    }

    function addCompany() {
      if (!requirePermission('entities_manage', 'Nur Admin/Manager duerfen Firmen erstellen')) return;
      const name = document.getElementById('companyName').value.trim();
      if (!name) {
        showToast('❌ Firmenname fehlt');
        return;
      }
      if (state.companies.some(c => normalizeCompanyName(c.name) === normalizeCompanyName(name))) {
        showToast('⚠️ Firma existiert bereits');
        return;
      }

      const company = {
        id: Math.random().toString(36).substr(2, 9),
        name,
        industry: document.getElementById('companyIndustry').value.trim(),
        location: document.getElementById('companyLocation').value.trim(),
        website: document.getElementById('companyWebsite').value.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      state.companies.push(company);
      saveCompanies();
      renderCompaniesTable();
      renderCompanyOptions();
      renderLeadOptions();
      showToast('✅ Firma erstellt');
    }

    function addLead() {
      if (!requirePermission('entities_manage', 'Nur Admin/Manager duerfen Leads erstellen')) return;
      const name = document.getElementById('leadName').value.trim();
      if (!name) {
        showToast('❌ Lead-Name fehlt');
        return;
      }

      const companyName = document.getElementById('leadCompanyName').value.trim();
      let company = null;
      if (companyName) {
        company = state.companies.find(c => (c.name || '').toLowerCase() === companyName.toLowerCase());
        if (!company) {
          company = {
            id: Math.random().toString(36).substr(2, 9),
            name: companyName,
            industry: document.getElementById('leadCompanyIndustry')?.value?.trim() || '',
            location: document.getElementById('leadCompanyLocation')?.value?.trim() || '',
            website: document.getElementById('leadCompanyWebsite')?.value?.trim() || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          state.companies.push(company);
          saveCompanies();
        }
      }

      const lead = {
        id: Math.random().toString(36).substr(2, 9),
        name,
        role: document.getElementById('leadRole').value.trim(),
        companyId: company ? company.id : null,
        email: document.getElementById('leadEmail').value.trim(),
        phone: document.getElementById('leadPhone').value.trim(),
        linkedin: document.getElementById('leadLinkedIn').value.trim(),
        status: document.getElementById('leadStatus').value || 'new',
        owner: document.getElementById('leadOwner').value.trim() || state.settings.name || '',
        tags: [],
        notes: '',
        channel: 'linkedin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Create contact from lead (CRM is source of truth)
      const nameParts = name.split(/\s+/).filter(Boolean);
      const vorname = nameParts[0] || '';
      const nachname = nameParts.slice(1).join(' ');
      const contact = {
        id: Math.random().toString(36).substr(2, 9),
        leadId: lead.id,
        vorname,
        nachname,
        firma: company ? company.name : companyName || '',
        telefon: lead.phone || '',
        email: lead.email || '',
        linkedin: lead.linkedin || '',
        unternehmenstelefon: '',
        unternehmensemail: '',
        rolle: lead.role || '',
        strasse: '',
        ortschaft: '',
        region: '',
        status: 'new',
        notes: '',
        source: 'linkedin',
        createdAt: new Date().toISOString()
      };

      const contactError = validateContactData(contact, { requireCompany: false });
      if (contactError) {
        showToast(`❌ ${contactError}`);
        return;
      }
      const duplicate = findDuplicateContact(contact);
      if (duplicate) {
        showToast(`⚠️ Dublette erkannt: ${duplicate.vorname || ''} ${duplicate.nachname || ''} (${duplicate.firma || 'Ohne Firma'})`);
        return;
      }

      state.leads.push(lead);

      state.contacts.push(contact);
      lead.contactId = contact.id;
      saveContacts();
      saveLeads();
      renderLeadsTable();
      renderLeadOptions();
      renderOutreachContactOptions();
      renderKontakte();
      renderContactsTable();
      renderAnalytics();
      showToast('✅ Lead erstellt');
    }

    function addDeal() {
      if (!requirePermission('entities_manage', 'Nur Admin/Manager duerfen Deals erstellen')) return;
      const title = document.getElementById('dealTitle').value.trim();
      if (!title) {
        showToast('❌ Deal-Titel fehlt');
        return;
      }

      const deal = {
        id: Math.random().toString(36).substr(2, 9),
        title,
        companyId: document.getElementById('dealCompany').value || null,
        leadId: document.getElementById('dealLead').value || null,
        stage: document.getElementById('dealStage').value || 'prospecting',
        value: parseFloat(document.getElementById('dealValue').value || '0') || 0,
        probability: parseFloat(document.getElementById('dealProbability').value || '0') || 0,
        closeDate: document.getElementById('dealCloseDate').value || null,
        owner: document.getElementById('dealOwner').value.trim() || state.settings.name || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      state.deals.push(deal);
      saveDeals();
      logTimelineEvent({
        leadId: deal.leadId || null,
        dealId: deal.id,
        companyId: deal.companyId || null,
        type: 'deal_created',
        status: 'system',
        note: `${deal.title} (${deal.stage}, CHF ${deal.value || 0})`,
        channel: 'system',
        timestamp: deal.createdAt
      });
      renderDealsTable();
      renderPipelineBoard();

      if (deal.stage === 'won' && deal.leadId) {
        const lead = getLeadById(deal.leadId);
        if (lead) {
          lead.status = 'won';
          lead.updatedAt = new Date().toISOString();
          saveLeads();
          renderLeadsTable();
          renderAnalytics();
        }
      }

      showToast('✅ Deal erstellt');
    }

    function addActivity() {
      if (!requirePermission('entities_manage', 'Nur Admin/Manager duerfen Aktivitaeten erstellen')) return;
      const leadId = document.getElementById('activityLead').value;
      if (!leadId) {
        showToast('❌ Lead auswaehlen');
        return;
      }

      const timestampInput = document.getElementById('activityTime').value;
      const timestamp = timestampInput ? new Date(timestampInput).toISOString() : new Date().toISOString();
      const type = document.getElementById('activityType').value;
      const statusInput = document.getElementById('activityStatus').value;
      const activity = {
        id: Math.random().toString(36).substr(2, 9),
        leadId,
        type,
        status: type === 'reply' ? 'replied' : statusInput,
        templateId: document.getElementById('activityTemplate').value || null,
        note: document.getElementById('activityNote').value.trim(),
        channel: 'linkedin',
        timestamp
      };

      state.activities.push(activity);
      saveActivities();
      renderActivitiesTable();
      renderAnalytics();

      const lead = getLeadById(leadId);
      if (lead) {
        if (activity.type === 'reply' || activity.status === 'replied') {
          lead.status = 'replied';
        } else if (['request', 'message', 'followup'].includes(activity.type) && lead.status === 'new') {
          lead.status = 'contacted';
        }
        lead.updatedAt = new Date().toISOString();
        saveLeads();
        renderLeadsTable();
      }

      showToast('✅ Aktivitaet gespeichert');
    }

    function addTemplate() {
      if (!requirePermission('entities_manage', 'Nur Admin/Manager duerfen Templates erstellen')) return;
      const name = document.getElementById('templateName').value.trim();
      if (!name) {
        showToast('❌ Template-Name fehlt');
        return;
      }

      const template = {
        id: Math.random().toString(36).substr(2, 9),
        name,
        stage: document.getElementById('templateStage').value || 'message',
        body: document.getElementById('templateBody').value.trim(),
        createdAt: new Date().toISOString()
      };

      state.templates.push(template);
      saveTemplates();
      renderTemplatesList();
      renderTemplateOptions();
      showToast('✅ Template gespeichert');
    }

    function addSequence() {
      if (!requirePermission('entities_manage', 'Nur Admin/Manager duerfen Sequenzen erstellen')) return;
      const name = document.getElementById('sequenceName').value.trim();
      if (!name) {
        showToast('❌ Sequenz-Name fehlt');
        return;
      }

      const sequence = {
        id: Math.random().toString(36).substr(2, 9),
        name,
        stepsText: document.getElementById('sequenceSteps').value.trim(),
        createdAt: new Date().toISOString()
      };

      state.sequences.push(sequence);
      saveSequences();
      renderSequencesList();
      showToast('✅ Sequenz gespeichert');
    }

    function updateKontakteStats() {
      let callToday = 0;
      let followupToday = 0;
      let followup = 0;
      for (const contact of state.contacts) {
        if (contact.status === 'callstoday') callToday += 1;
        if (contact.status === 'followuptoday') followupToday += 1;
        if (contact.status === 'followup' || contact.phase === 'followup1' || contact.phase === 'followup2' || contact.phase === 'followup3') followup += 1;
      }
      const total = state.contacts.length;
      const el = document.getElementById('kontakteStats');
      if (el) el.textContent = `${total} Kontakte · ${callToday} heute anrufen · ${followupToday} Followup Today · ${followup} im Followup`;
    }

    function setDashboardListFilter(key, value) {
      if (!state.dashboardListFilters) state.dashboardListFilters = {};
      state.dashboardListFilters[key] = String(value || '');
      renderKontakte();
    }

    function setDashboardSort(sortKey) {
      const sortEl = document.getElementById('sortBy');
      const dirEl = document.getElementById('btnToggleSortOrder');
      if (!sortEl || !dirEl) return;

      if (sortEl.value === sortKey) {
        dirEl.classList.toggle('descending');
      } else {
        sortEl.value = sortKey;
        dirEl.classList.remove('descending');
      }

      dirEl.textContent = dirEl.classList.contains('descending') ? '↓ Absteigend' : '↑ Aufsteigend';
      renderKontakte();
    }

    function getDashboardSortIndicator(sortKey) {
      const sortEl = document.getElementById('sortBy');
      const dirEl = document.getElementById('btnToggleSortOrder');
      const current = sortEl?.value || 'name';
      if (current !== sortKey) return '';
      return dirEl?.classList.contains('descending') ? ' ↓' : ' ↑';
    }

    function renderKontakte() {
      const searchTerm = (document.getElementById('dashboardSearch')?.value || '').toLowerCase();
      const sortBy = document.getElementById('sortBy')?.value || 'name';
      const statusFilter = document.getElementById('btnStatusFilterDropdown')?.dataset.status || 'all';
      const sortDescending = document.getElementById('btnToggleSortOrder')?.classList.contains('descending') || false;
      const plzRangeText = (document.getElementById('dashboardPLZRange')?.value || '').trim();

      let filtered = state.contacts.slice();

      if (state.activeMember) {
        filtered = filtered.filter(c => c.memberId === state.activeMember);
      }

      if (state.quickFilter && state.quickFilter !== 'all') {
        if (state.quickFilter === 'callstoday') filtered = filtered.filter(c => c.status === 'callstoday');
        if (state.quickFilter === 'followuptoday') filtered = filtered.filter(c => c.status === 'followuptoday');
        if (state.quickFilter === 'followup') filtered = filtered.filter(c => c.status === 'followup' || c.status === 'followuptoday' || ['followup1','followup2','followup3'].includes(c.phase));
        if (state.quickFilter === 'linkedin') filtered = filtered.filter(c => c.source === 'linkedin' || c.outreachStatus || ['lioutboundtoday','lioutboundfollowup','limailgesendet','lioutbound','LI-Outbound'].includes(c.status));
        if (state.quickFilter === 'won') filtered = filtered.filter(c => c.status === 'won');
        if (state.quickFilter === 'vrundgang') filtered = filtered.filter(c => c.status && c.status.startsWith('vr'));
      }

      if (searchTerm) {
        filtered = filtered.filter(c => {
          const text = `${c.vorname} ${c.nachname} ${c.firma} ${c.telefon} ${c.email} ${c.ortschaft}`.toLowerCase();
          return text.includes(searchTerm);
        });
      }

      if (plzRangeText) {
        const parts = plzRangeText.split('-').map(p => p.trim());
        if (parts.length === 2) {
          const minPLZ = parseInt(parts[0], 10);
          const maxPLZ = parseInt(parts[1], 10);
          if (!isNaN(minPLZ) && !isNaN(maxPLZ)) {
            filtered = filtered.filter(c => {
              if (!c.ortschaft) return false;
              const match = c.ortschaft.match(/^\d{4,5}/);
              if (match) {
                const contactPLZ = parseInt(match[0], 10);
                return contactPLZ >= minPLZ && contactPLZ <= maxPLZ;
              }
              return false;
            });
          }
        }
      }

      if (statusFilter !== 'all') {
        if (statusFilter === 'followupdue') {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          filtered = filtered.filter(c => c.status === 'followup' && c.followupCallDate && new Date(c.followupCallDate) <= today);
        } else if (statusFilter === 'new') {
          filtered = filtered.filter(c => c.status === 'new' || !c.status);
        } else {
          filtered = filtered.filter(c => c.status === statusFilter);
        }
      }

      if (state.selectedTagFilter) {
        filtered = filtered.filter(c => c.tags && c.tags.includes(state.selectedTagFilter));
      }

      // GROUP CONTACTS BY FIRMA (deduplicate company view)
      const contactsByFirma = {};
      filtered.forEach(c => {
        const firma = normalizeCompanyName(c.firma || '');
        if (!contactsByFirma[firma]) {
          contactsByFirma[firma] = [];
        }
        contactsByFirma[firma].push(c);
      });

      // Sort contacts within each firma: primary contact first
      Object.keys(contactsByFirma).forEach(firma => {
        contactsByFirma[firma].sort((a, b) => {
          if (a.isPrimaryContact && !b.isPrimaryContact) return -1;
          if (!a.isPrimaryContact && b.isPrimaryContact) return 1;
          return `${a.vorname} ${a.nachname}`.localeCompare(`${b.vorname} ${b.nachname}`);
        });
      });

      // Create array of firma groups with primary contact as representative
      let firmaGroups = Object.keys(contactsByFirma).map(firma => ({
        firma,
        contacts: contactsByFirma[firma],
        primaryContact: contactsByFirma[firma].find(c => c.isPrimaryContact) || contactsByFirma[firma][0]
      }));

      // Sort firma groups by selected sort order
      firmaGroups.sort((groupA, groupB) => {
        const cA = groupA.primaryContact;
        const cB = groupB.primaryContact;
        let result = 0;
        switch (sortBy) {
          case 'name':
            result = `${cA.vorname} ${cA.nachname}`.localeCompare(`${cB.vorname} ${cB.nachname}`);
            break;
          case 'company':
            result = (cA.firma || '').localeCompare(cB.firma || '');
            break;
          case 'location':
            result = (cA.ortschaft || '').localeCompare(cB.ortschaft || '');
            break;
          case 'phone':
            result = (cA.telefon || '').localeCompare(cB.telefon || '');
            break;
          case 'email':
            result = (cA.email || '').localeCompare(cB.email || '');
            break;
          case 'status':
            result = (cA.status || '').localeCompare(cB.status || '');
            break;
          case 'newest':
            result = new Date(cB.createdAt || 0) - new Date(cA.createdAt || 0);
            break;
          case 'phase': {
            const phaseOrder = { coldcall: 1, mail: 2, followup1: 3, followup2: 4, followup3: 5 };
            result = (phaseOrder[cA.phase] || 0) - (phaseOrder[cB.phase] || 0);
            break;
          }
          case 'rating':
            result = (cB.rating || 0) - (cA.rating || 0); // high rating first
            break;
          case 'followupdue': {
            const dateA = cA.followupDueDate ? new Date(cA.followupDueDate) : (cA.followupCallDate ? new Date(cA.followupCallDate) : new Date('2099-12-31'));
            const dateB = cB.followupDueDate ? new Date(cB.followupDueDate) : (cB.followupCallDate ? new Date(cB.followupCallDate) : new Date('2099-12-31'));
            result = dateA - dateB;
            break;
          }
          default:
            result = 0;
        }
        return sortDescending ? -result : result;
      });

      const grid = document.getElementById('dashboardGrid');
      if (!grid) return;
      if (firmaGroups.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; padding: 20px; text-align: center; color: var(--muted)">Keine Kontakte gefunden</div>';
        updateSelectedCount();
        updateKontakteStats();
        return;
      }

      const tagById = new Map(state.tags.map(tag => [tag.id, tag]));

      const tileBtn = document.getElementById('btnDashboardTileView');
      const listBtn = document.getElementById('btnDashboardListView');
      if (tileBtn) tileBtn.classList.toggle('active', (state.dashboardView || 'tiles') === 'tiles');
      if (listBtn) listBtn.classList.toggle('active', (state.dashboardView || 'tiles') === 'list');

      if ((state.dashboardView || 'tiles') === 'list') {
        const listFilters = state.dashboardListFilters || {};
        const normalize = (v) => String(v || '').toLowerCase();
        const personFilter = normalize(listFilters.person);
        const phoneFilter = normalize(listFilters.phone);
        const emailFilter = normalize(listFilters.email);
        const companyFilter = normalize(listFilters.company);
        const locationFilter = normalize(listFilters.location);
        const statusFilterList = normalize(listFilters.status);
        const phaseFilter = normalize(listFilters.phase);
        const ratingFilter = normalize(listFilters.rating);
        const dueFilter = normalize(listFilters.due);

        const filteredGroups = firmaGroups.filter(group => {
          const c = group.primaryContact;
          const allNames = group.contacts.map(x => `${x.vorname || ''} ${x.nachname || ''}`.trim()).join(' | ');
          const allPhones = group.contacts.map(x => x.telefon || '').filter(Boolean).join(' | ');
          const allEmails = group.contacts.map(x => x.email || '').filter(Boolean).join(' | ');
          const companyVal = normalize(c.firma || '');
          const locationVal = normalize(c.ortschaft || '');
          const statusVal = normalize(group.contacts.map(x => getStatusLabel(x.status || 'new')).join(' | '));
          const phaseVal = normalize(group.contacts.map(x => x.phase || '').join(' | '));
          const ratingVal = normalize(group.contacts.map(x => String(x.rating || '')).join(' | '));
          const dueCandidates = group.contacts
            .map(x => x.followupDueDate || x.followupCallDate || '')
            .filter(Boolean)
            .map(v => new Date(v).toLocaleDateString('de-CH'));
          const dueDate = dueCandidates.join(' | ');
          const dueVal = normalize(dueDate);

          const personVal = normalize(allNames);
          const phoneVal = normalize(allPhones);
          const emailVal = normalize(allEmails);

          if (personFilter && !personVal.includes(personFilter)) return false;
          if (phoneFilter && !phoneVal.includes(phoneFilter)) return false;
          if (emailFilter && !emailVal.includes(emailFilter)) return false;
          if (companyFilter && !companyVal.includes(companyFilter)) return false;
          if (locationFilter && !locationVal.includes(locationFilter)) return false;
          if (statusFilterList && !statusVal.includes(statusFilterList)) return false;
          if (phaseFilter && !phaseVal.includes(phaseFilter)) return false;
          if (ratingFilter && !ratingVal.includes(ratingFilter)) return false;
          if (dueFilter && !dueVal.includes(dueFilter)) return false;
          return true;
        });

        const listSortedGroups = filteredGroups.slice().sort((groupA, groupB) => {
          const cA = groupA.primaryContact;
          const cB = groupB.primaryContact;

          const firstNonEmpty = (contacts, key) => {
            for (const x of contacts) {
              const val = String(x[key] || '').trim();
              if (val) return val;
            }
            return '';
          };

          const firstDueTs = (contacts) => {
            const dates = contacts
              .map(x => x.followupDueDate || x.followupCallDate || '')
              .filter(Boolean)
              .map(v => new Date(v).getTime())
              .filter(Number.isFinite);
            return dates.length ? Math.min(...dates) : Number.POSITIVE_INFINITY;
          };

          let result = 0;
          switch (sortBy) {
            case 'name':
              result = `${cA.vorname || ''} ${cA.nachname || ''}`.localeCompare(`${cB.vorname || ''} ${cB.nachname || ''}`);
              break;
            case 'phone':
              result = firstNonEmpty(groupA.contacts, 'telefon').localeCompare(firstNonEmpty(groupB.contacts, 'telefon'));
              break;
            case 'email':
              result = firstNonEmpty(groupA.contacts, 'email').localeCompare(firstNonEmpty(groupB.contacts, 'email'));
              break;
            case 'company':
              result = (cA.firma || '').localeCompare(cB.firma || '');
              break;
            case 'location':
              result = (cA.ortschaft || '').localeCompare(cB.ortschaft || '');
              break;
            case 'status':
              result = getStatusLabel(cA.status || 'new').localeCompare(getStatusLabel(cB.status || 'new'));
              break;
            case 'phase': {
              const phaseOrder = { coldcall: 1, mail: 2, followup1: 3, followup2: 4, followup3: 5 };
              result = (phaseOrder[cA.phase] || 0) - (phaseOrder[cB.phase] || 0);
              break;
            }
            case 'rating':
              result = (cB.rating || 0) - (cA.rating || 0);
              break;
            case 'followupdue':
              result = firstDueTs(groupA.contacts) - firstDueTs(groupB.contacts);
              break;
            case 'newest':
              result = new Date(cB.createdAt || 0) - new Date(cA.createdAt || 0);
              break;
            default:
              result = 0;
          }
          return sortDescending ? -result : result;
        });

        const rows = listSortedGroups.map(group => {
          const c = group.primaryContact;
          const contactCount = group.contacts.length;
          const isSelected = state.selectedContacts && state.selectedContacts.has(c.id);
          const phaseLabels = { coldcall: 'Phase 1', mail: 'Phase 2', followup1: 'FU 1', followup2: 'FU 2', followup3: 'FU 3' };
          const phase = c.phase ? phaseLabels[c.phase] || c.phase : '–';
          const firstPhone = group.contacts.map(x => x.telefon || '').find(Boolean) || c.telefon || '–';
          const firstEmail = group.contacts.map(x => x.email || '').find(Boolean) || c.email || '–';
          const firstDueRaw = group.contacts.map(x => x.followupDueDate || x.followupCallDate || '').find(Boolean) || '';
          const due = firstDueRaw ? new Date(firstDueRaw).toLocaleDateString('de-CH') : '–';
          const rating = c.rating || 0;
          const stars = rating > 0 ? `${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}` : '–';
          return `
            <tr onclick="openEditModal('${c.id}')" style="cursor:pointer;">
              <td style="padding:8px 6px;" onclick="event.stopPropagation();">
                <button class="contact-select" onclick="event.stopPropagation(); toggleContactSelection('${c.id}')" style="position:static; width:30px; height:30px;">${isSelected ? '✓' : '○'}</button>
              </td>
              <td style="padding:8px 6px;">${c.vorname || ''} ${c.nachname || ''}</td>
              <td style="padding:8px 6px;">${firstPhone}</td>
              <td style="padding:8px 6px; max-width:200px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${firstEmail}</td>
              <td style="padding:8px 6px;">${c.firma || '–'} ${contactCount > 1 ? `<span style="color:var(--muted);">(${contactCount})</span>` : ''}</td>
              <td style="padding:8px 6px;">${c.ortschaft || '–'}</td>
              <td style="padding:8px 6px;"><span class="contact-status-badge ${c.status || 'new'}">${getStatusLabel(c.status || 'new')}</span></td>
              <td style="padding:8px 6px;">${phase}</td>
              <td style="padding:8px 6px; letter-spacing:1px;">${stars}</td>
              <td style="padding:8px 6px;">${due}</td>
              <td style="padding:8px 6px;"><button class="btn" onclick="event.stopPropagation(); openEditModal('${c.id}')" style="padding:4px 8px; font-size:11px;">✎ Edit</button></td>
            </tr>
          `;
        }).join('');

        grid.innerHTML = `
          <div class="dashboard-list-wrap" style="grid-column:1/-1; overflow-x:auto;">
            <table style="width:100%; border-collapse:collapse; font-size:12px; margin-top:0;">
              <thead>
                <tr style="border-bottom:1px solid var(--line);">
                  <th style="padding:8px 6px; width:42px;"></th>
                  <th style="padding:8px 6px; color:var(--muted); font-weight:600;"><button class="btn" onclick="setDashboardSort('name')" style="padding:0; border:none; background:transparent; color:inherit; font-size:12px;">Ansprechperson${getDashboardSortIndicator('name')}</button></th>
                  <th style="padding:8px 6px; color:var(--muted); font-weight:600;"><button class="btn" onclick="setDashboardSort('phone')" style="padding:0; border:none; background:transparent; color:inherit; font-size:12px;">Telefon${getDashboardSortIndicator('phone')}</button></th>
                  <th style="padding:8px 6px; color:var(--muted); font-weight:600;"><button class="btn" onclick="setDashboardSort('email')" style="padding:0; border:none; background:transparent; color:inherit; font-size:12px;">E-Mail${getDashboardSortIndicator('email')}</button></th>
                  <th style="padding:8px 6px; color:var(--muted); font-weight:600;"><button class="btn" onclick="setDashboardSort('company')" style="padding:0; border:none; background:transparent; color:inherit; font-size:12px;">Firma${getDashboardSortIndicator('company')}</button></th>
                  <th style="padding:8px 6px; color:var(--muted); font-weight:600;"><button class="btn" onclick="setDashboardSort('location')" style="padding:0; border:none; background:transparent; color:inherit; font-size:12px;">Ort${getDashboardSortIndicator('location')}</button></th>
                  <th style="padding:8px 6px; color:var(--muted); font-weight:600;"><button class="btn" onclick="setDashboardSort('status')" style="padding:0; border:none; background:transparent; color:inherit; font-size:12px;">Status${getDashboardSortIndicator('status')}</button></th>
                  <th style="padding:8px 6px; color:var(--muted); font-weight:600;"><button class="btn" onclick="setDashboardSort('phase')" style="padding:0; border:none; background:transparent; color:inherit; font-size:12px;">Phase${getDashboardSortIndicator('phase')}</button></th>
                  <th style="padding:8px 6px; color:var(--muted); font-weight:600;"><button class="btn" onclick="setDashboardSort('rating')" style="padding:0; border:none; background:transparent; color:inherit; font-size:12px;">Rating${getDashboardSortIndicator('rating')}</button></th>
                  <th style="padding:8px 6px; color:var(--muted); font-weight:600;"><button class="btn" onclick="setDashboardSort('followupdue')" style="padding:0; border:none; background:transparent; color:inherit; font-size:12px;">Followup fällig${getDashboardSortIndicator('followupdue')}</button></th>
                  <th style="padding:8px 6px; color:var(--muted); font-weight:600;">Aktion</th>
                </tr>
                <tr style="border-bottom:1px solid var(--line); background:rgba(107,114,128,.06);">
                  <th style="padding:6px;"></th>
                  <th style="padding:6px;"><input class="input-field" style="margin:0; font-size:11px; padding:6px 8px;" placeholder="Filter Name" value="${listFilters.person || ''}" oninput="setDashboardListFilter('person', this.value)"></th>
                  <th style="padding:6px;"><input class="input-field" style="margin:0; font-size:11px; padding:6px 8px;" placeholder="Filter Telefon" value="${listFilters.phone || ''}" oninput="setDashboardListFilter('phone', this.value)"></th>
                  <th style="padding:6px;"><input class="input-field" style="margin:0; font-size:11px; padding:6px 8px;" placeholder="Filter E-Mail" value="${listFilters.email || ''}" oninput="setDashboardListFilter('email', this.value)"></th>
                  <th style="padding:6px;"><input class="input-field" style="margin:0; font-size:11px; padding:6px 8px;" placeholder="Filter Firma" value="${listFilters.company || ''}" oninput="setDashboardListFilter('company', this.value)"></th>
                  <th style="padding:6px;"><input class="input-field" style="margin:0; font-size:11px; padding:6px 8px;" placeholder="Filter Ort" value="${listFilters.location || ''}" oninput="setDashboardListFilter('location', this.value)"></th>
                  <th style="padding:6px;"><input class="input-field" style="margin:0; font-size:11px; padding:6px 8px;" placeholder="Filter Status" value="${listFilters.status || ''}" oninput="setDashboardListFilter('status', this.value)"></th>
                  <th style="padding:6px;"><input class="input-field" style="margin:0; font-size:11px; padding:6px 8px;" placeholder="Filter Phase" value="${listFilters.phase || ''}" oninput="setDashboardListFilter('phase', this.value)"></th>
                  <th style="padding:6px;"><input class="input-field" style="margin:0; font-size:11px; padding:6px 8px;" placeholder="Filter Rating" value="${listFilters.rating || ''}" oninput="setDashboardListFilter('rating', this.value)"></th>
                  <th style="padding:6px;"><input class="input-field" style="margin:0; font-size:11px; padding:6px 8px;" placeholder="Filter Fälligkeit" value="${listFilters.due || ''}" oninput="setDashboardListFilter('due', this.value)"></th>
                  <th style="padding:6px;"></th>
                </tr>
              </thead>
              <tbody>${rows || '<tr><td colspan="11" style="text-align:center; color:var(--muted); padding:16px;">Keine Kontakte für diesen Listenfilter</td></tr>'}</tbody>
            </table>
          </div>
        `;
        updateSelectedCount();
        updateKontakteStats();
        return;
      }

      grid.innerHTML = firmaGroups.map(group => {
        const c = group.primaryContact;
        const allContacts = group.contacts;
        const contactCount = allContacts.length;
        const isSelected = state.selectedContacts && state.selectedContacts.has(c.id);
        const followupDetails = (c.status === 'followup' || c.status === 'followuptoday')
          ? `<div class="pill" style="background: ${c.status === 'followuptoday' ? 'rgba(234,88,12,.12)' : 'var(--accent-soft)'}; color: ${c.status === 'followuptoday' ? '#ea580c' : 'var(--accent)'};">🔄 Followup · ${c.followupDueDate ? 'fällig: ' + new Date(c.followupDueDate).toLocaleDateString('de-CH') : (c.followupCallDate ? new Date(c.followupCallDate).toLocaleDateString('de-CH') : 'kein Datum')}</div>`
          : '';

        // Phase badge
        const phaseLabels = { coldcall: '📞 Phase 1 · Cold Call', mail: '✉️ Phase 2 · Mail', followup1: '🔄 Phase 3 · FU 1', followup2: '🔁 Phase 4 · FU 2', followup3: '🔂 Phase 5 · FU 3' };
        const phaseHTML = c.phase ? `<span class="phase-badge ${c.phase}">${phaseLabels[c.phase] || c.phase}</span>` : '';

        // Member badge
        const cardMember = state.members.find(m => m.id === c.memberId);
        const memberBadgeHTML = cardMember ? `<span style="background:${cardMember.color}22;border:1px solid ${cardMember.color};color:${cardMember.color};border-radius:999px;padding:2px 8px;font-size:10px;font-weight:700;margin-left:6px;">${cardMember.kuerzel}</span>` : '';

        // Star rating display
        const rating = c.rating || 0;
        const starsHTML = rating > 0 ? `<span style="font-size: 12px; letter-spacing: 1px;">${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}</span>` : '';

        // Contact history from notesHistory
        const history = c.notesHistory || [];
        const wasCalled = history.some(n => ['called', 'notreached', 'callstoday', 'preselected'].includes(n.status));
        const gotMail = history.some(n => ['mailsend', 'mail_sent', 'mailtonewcontact', 'followup'].includes(n.status));
        const wasFollowup = history.some(n => ['followup', 'followuptoday'].includes(n.status)) || c.phase === 'followup1' || c.phase === 'followup2' || c.phase === 'followup3';
        const historyHTML = (wasCalled || gotMail || wasFollowup) ? `
          <div class="contact-history">
            ${wasCalled ? '<span class="history-pill">☎️ Angerufen</span>' : ''}
            ${gotMail ? '<span class="history-pill">✉️ Mail</span>' : ''}
            ${wasFollowup ? '<span class="history-pill">🔄 Followup war</span>' : ''}
          </div>` : '';

        const tagsHTML = c.tags && c.tags.length > 0 ? `
          <div class="tag-badges">
            ${c.tags.map(tagId => {
              const tag = tagById.get(tagId);
              return tag ? `<div class="tag-badge" style="background-color: ${tag.color}22; border-color: ${tag.color}; color: ${tag.color};">${tag.name}</div>` : '';
            }).join('')}
          </div>
        ` : '';

        const neubaauHTML = c.neubau ? `
          <div class="pill" style="background: ${c.neubau === 'vorhanden' ? 'rgba(16,185,129,.15)' : 'rgba(245,158,11,.15)'}; color: ${c.neubau === 'vorhanden' ? 'var(--good)' : 'var(--warn)'}; border: 1px solid ${c.neubau === 'vorhanden' ? 'rgba(16,185,129,.3)' : 'rgba(245,158,11,.3)'};">🏗️ ${c.neubau === 'vorhanden' ? 'Neubau Online' : 'Neubau in Planung'}</div>
        ` : '';

        const contactsListHTML = contactCount > 1 ? `
          <div style="font-size: 11px; color: var(--muted); margin-top: 4px; padding-top: 4px; border-top: 1px solid var(--border);">
            <strong>${contactCount} Ansprechpartner:</strong>
            ${allContacts.map(contact => {
              const star = contact.isPrimaryContact ? ' ⭐' : '';
              const primary = contact.isPrimaryContact ? ' (Hauptansprechperson)' : '';
              return `<div style="margin-top: 2px;">
                <button onclick="event.stopPropagation(); openEditModal('${contact.id}')" style="background: none; border: none; color: var(--link); cursor: pointer; text-decoration: underline; font-size: 11px;">
                  ${contact.vorname} ${contact.nachname}${star}
                </button>${primary}
              </div>`;
            }).join('')}
          </div>
        ` : '';

        return `
        <div class="contact-card ${isSelected ? 'selected' : ''}" data-contact-id="${c.id}" onclick="openEditModal('${c.id}')">
          <button class="contact-select" onclick="event.stopPropagation(); toggleContactSelection('${c.id}')">${isSelected ? '✓' : '○'}</button>
          <div>
            <div class="contact-name">${c.vorname} ${c.nachname}${starsHTML ? ' <span style="margin-left:4px;">' + starsHTML + '</span>' : ''}</div>
            <div class="contact-company">${c.firma || '–'}${c.rolle ? ' • ' + c.rolle : ''}${contactCount > 1 ? ` (${contactCount})` : ''}${memberBadgeHTML}</div>
          </div>
          ${phaseHTML ? `<div style="margin-top: 2px;">${phaseHTML}</div>` : ''}
          <div class="contact-meta">
            ${c.telefon ? '📞 ' + c.telefon : ''}
            ${c.email ? '<div>📧 ' + c.email + '</div>' : ''}
            ${c.ortschaft ? '<div>📍 ' + c.ortschaft + '</div>' : ''}
          </div>
          ${historyHTML}
          ${followupDetails}
          <div class="status-badge">${getStatusLabel(c.status || 'new')}</div>
          ${neubaauHTML}
          ${tagsHTML}
          ${contactsListHTML}
          <div class="contact-actions">
            ${c.telefon ? `<a href="tel:${c.telefon}" onclick="event.stopPropagation();">📞 Anrufen</a>` : ''}
            ${c.email ? `<button onclick="event.stopPropagation(); openContactMail('${c.id}', 'dashboard')">✉️ Mail</button>` : ''}
            <button onclick="event.stopPropagation(); quickSetStatus('${c.id}', 'callstoday')">Heute</button>
            <button onclick="event.stopPropagation(); quickSetStatus('${c.id}', 'followuptoday')" style="color: #ea580c;">FU Today</button>
            <button onclick="event.stopPropagation(); deleteContactDirect('${c.id}')" style="color: var(--bad);">Loeschen</button>
          </div>
        </div>
      `}).join('');

      updateSelectedCount();
      updateKontakteStats();
    }

    const renderDashboard = renderKontakte;

    function toggleContactSelection(contactId) {
      if (!state.selectedContacts) state.selectedContacts = new Set();
      if (state.selectedContacts.has(contactId)) {
        state.selectedContacts.delete(contactId);
      } else {
        state.selectedContacts.add(contactId);
      }
      renderKontakte();
    }

    function updateSelectedCount() {
      const count = state.selectedContacts ? state.selectedContacts.size : 0;
      const el = document.getElementById('selectedCount');
      if (el) el.textContent = count > 0 ? `${count} ausgewählt` : '0 ausgewählt';
      const bar = document.getElementById('batchBar');
      if (bar) bar.classList.toggle('show', count > 0);
    }

    function deleteContactDirect(contactId) {
      if (!requirePermission('contacts_delete', 'Nur Admin/Manager duerfen Kontakte loeschen')) return;
      if (!confirm('Kontakt wirklich löschen?')) return;
      const contact = state.contacts.find(c => c.id === contactId);
      if (contact?.leadId) {
        removeLeadAndRelations(contact.leadId);
      }
      state.activities = state.activities.filter(a => a.contactId !== contactId);
      state.contacts = state.contacts.filter(c => c.id !== contactId);
      saveContacts();
      saveActivities();
      renderDashboard();
      renderContactsTable();
      renderCrmCompanies();
      renderCrmCompanyDetail();
      renderStats();
      showToast('✅ Kontakt gelöscht');
    }

    function quickSetStatus(contactId, status) {
      const contact = state.contacts.find(c => c.id === contactId);
      if (!contact) return;
      const previousStatus = contact.status || 'new';
      contact.status = status;
      contact.updatedAt = new Date().toISOString();
      if (previousStatus !== status) {
        logTimelineEvent({
          contactId: contact.id,
          leadId: contact.leadId || null,
          companyId: contact.companyId || null,
          type: 'status_change',
          status: 'system',
          note: `${getStatusLabel(previousStatus)} -> ${getStatusLabel(status)}`,
          channel: 'system'
        });
      }
      saveContacts();
      renderKontakte();
      renderAnalytics();
      showToast(`✅ Status gesetzt: ${getStatusLabel(status)}`);
    }

    function getStatusLabel(status) {
      const labels = {
        // Allgemein
        new:              '🆕 Neu',
        callstoday:       '📞 Heute anrufen',
        followuptoday:    '🔔 Followup heute',
        // Calls
        called:           '☎️ Angerufen',
        notreached:       '📵 Nicht erreicht',
        inprogress:       '⏳ In Bearbeitung',
        // E-Mail / Followup
        mailsend:         '📧 Mail senden',
        mailtonewcontact: '📨 Mail: Neue Kontaktperson',
        response:         '💬 Antwort erhalten',
        preselected:      '✅ Vorselektiert',
        followup:         '🔄 Im Followup',
        // LinkedIn
        lioutboundtoday:    '🔗 LinkedIn: Heute',
        lioutboundfollowup: '🔁 LinkedIn: Followup',
        limailgesendet:     '✉️ LinkedIn: Mail gesendet',
        // Legacy LinkedIn aliases (read-only, keep for old data)
        lioutbound:            '🔗 LinkedIn: Heute',
        'LI-Outbound':         '🔗 LinkedIn: Heute',
        'LI-Outbound Today':   '🔗 LinkedIn: Heute',
        'LIO Today':           '🔗 LinkedIn: Heute',
        'LI-Outbound Followup':'🔁 LinkedIn: Followup',
        'LIO Followup':        '🔁 LinkedIn: Followup',
        'LI-Mailgesendet':     '✉️ LinkedIn: Mail gesendet',
        'LI-Mail gesendet':    '✉️ LinkedIn: Mail gesendet',
        // VR-Pipeline
        vrmail_gesendet: '🎥 VR: Mail gesendet',
        vrfollowup1:     '🎥 VR: Followup 1',
        vrfollowup2:     '🎥 VR: Followup 2',
        vrfollowup3:     '🎥 VR: Followup 3',
        vrtoday:         '🎥 VR: Heute',
        // Abschluss
        won:          '🏆 Gewonnen',
        nointerest:   '🚫 Kein Interesse',
        nokeinbedarf: '💤 Kein Bedarf aktuell'
      };
      return labels[status] || status;
    }

    function normalizeEmail(email) {
      return String(email || '').trim().toLowerCase();
    }

    function normalizePhone(phone) {
      const raw = String(phone || '').trim();
      if (!raw) return '';
      const hasPlus = raw.startsWith('+');
      const digits = raw.replace(/\D+/g, '');
      if (!digits) return '';
      return hasPlus ? `+${digits}` : digits;
    }

    function normalizePersonName(v) {
      return String(v || '').trim().toLowerCase();
    }

    function validateContactData(input, opts = {}) {
      const requireCompany = opts.requireCompany !== false;
      const company = (input.firma || '').trim();
      const email = normalizeEmail(input.email || '');
      const phone = normalizePhone(input.telefon || '');

      if (requireCompany && !company) return 'Firma ist erforderlich';

      if (email) {
        const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        if (!ok) return 'E-Mail ist ungueltig';
      }

      if (phone) {
        const digits = phone.replace(/\D+/g, '');
        if (digits.length < 6) return 'Telefonnummer ist zu kurz';
      }

      return '';
    }

    function findDuplicateContact(input, ignoreId = null) {
      return state.contacts.find(c => {
        if (ignoreId && c.id === ignoreId) return false;
        return isDuplicateContactPair(c, input);
      }) || null;
    }

    function isDuplicateContactPair(a, b) {
      const aEmail = normalizeEmail(a.email || '');
      const bEmail = normalizeEmail(b.email || '');
      if (aEmail && bEmail && aEmail === bEmail) return true;

      const aPhone = normalizePhone(a.telefon || '');
      const bPhone = normalizePhone(b.telefon || '');
      if (aPhone && bPhone && aPhone === bPhone) return true;

      const aCompany = normalizeCompanyName(a.firma || '');
      const bCompany = normalizeCompanyName(b.firma || '');
      const aFirst = normalizePersonName(a.vorname || '');
      const bFirst = normalizePersonName(b.vorname || '');
      const aLast = normalizePersonName(a.nachname || '');
      const bLast = normalizePersonName(b.nachname || '');
      const hasNames = aFirst && bFirst && aLast && bLast;
      if (hasNames && aCompany && bCompany && aFirst === bFirst && aLast === bLast && aCompany === bCompany) return true;

      return false;
    }

    function getCurrentRole() {
      const explicit = state.settings.userRole;
      if (explicit && ['admin', 'manager', 'user'].includes(explicit)) return explicit;
      // No RBAC set up yet (empty userAccounts) → treat as admin
      if (!state.userAccounts || state.userAccounts.length === 0) return 'admin';
      return 'user';
    }

    function getCurrentUserLinkedMemberId() {
      const profileMemberId = state.currentUserProfile?.memberId || null;
      if (profileMemberId) return profileMemberId;
      if (!currentUser?.uid) return null;
      const account = (state.userAccounts || []).find(u => u.uid === currentUser.uid);
      return account?.memberId || null;
    }

    function populateAnalyticsMemberFilter() {
      const sel = document.getElementById('dashAnalyticsMember');
      if (!sel) return;

      const role = getCurrentRole();
      const linkedMemberId = getCurrentUserLinkedMemberId();
      const linkedMember = state.members.find(m => m.id === linkedMemberId);
      const currentValue = sel.value;

      if (role === 'admin') {
        sel.innerHTML = '<option value="all">Alle</option>' +
          state.members.map(m => `<option value="${m.id}">${m.vorname} ${m.nachname} (${m.kuerzel})</option>`).join('');
        sel.disabled = false;
        if ([...sel.options].some(o => o.value === currentValue)) sel.value = currentValue;
        else sel.value = 'all';
        return;
      }

      // Non-admin users see only their own assigned member reporting.
      if (linkedMember) {
        sel.innerHTML = `<option value="${linkedMember.id}">${linkedMember.vorname} ${linkedMember.nachname} (${linkedMember.kuerzel})</option>`;
        sel.value = linkedMember.id;
      } else {
        sel.innerHTML = '<option value="__none__">Kein Mitarbeiter zugewiesen</option>';
        sel.value = '__none__';
      }
      sel.disabled = true;
    }

    function buildComposeUrl(to, subject, body) {
      const provider = state.settings.commProvider || 'mailto';
      const t = encodeURIComponent(to || '');
      const s = encodeURIComponent(subject || '');
      const b = encodeURIComponent(body || '');
      if (provider === 'gmail') {
        return `https://mail.google.com/mail/?view=cm&fs=1&to=${t}&su=${s}&body=${b}`;
      }
      if (provider === 'outlook') {
        return `https://outlook.office.com/mail/deeplink/compose?to=${t}&subject=${s}&body=${b}`;
      }
      if (provider === 'outlook_graph_direct') {
        return `https://outlook.office.com/mail/deeplink/compose?to=${t}&subject=${s}&body=${b}`;
      }
      return `mailto:${to || ''}?subject=${s}&body=${b}`;
    }

    function isDirectMailProvider(provider) {
      return provider === 'outlook_graph_direct' || provider === 'ionos_imap_direct';
    }

    async function sendMailViaBridge(payload) {
      const endpoint = (state.settings.commBridgeUrl || '').trim();
      if (!endpoint) throw new Error('Kein Bridge Endpoint konfiguriert');

      const headers = { 'Content-Type': 'application/json' };
      const token = (state.settings.commBridgeToken || '').trim();
      if (token) headers.Authorization = `Bearer ${token}`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      let responseBody = null;
      try {
        responseBody = await response.json();
      } catch (_) {
        responseBody = null;
      }

      if (!response.ok) {
        const reason = responseBody?.error || responseBody?.message || `HTTP ${response.status}`;
        throw new Error(reason);
      }

      return responseBody || { ok: true };
    }

    async function openContactMail(contactId, source = 'dashboard') {
      const contact = state.contacts.find(c => c.id === contactId);
      if (!contact) return;
      const email = normalizeEmail(contact.email || '');
      if (!email) {
        showToast('❌ Keine E-Mail beim Kontakt hinterlegt');
        return;
      }
      const mailError = validateContactData({ firma: contact.firma || '', email, telefon: '' }, { requireCompany: false });
      if (mailError) {
        showToast(`❌ ${mailError}`);
        return;
      }

      const sender = state.settings.commSender ? `\n\n--\n${state.settings.commSender}` : '';
      const subject = `${state.settings.company || 'Power Hour'} | ${contact.firma || ''}`.trim();
      const body = `Hallo ${contact.vorname || ''} ${contact.nachname || ''},${sender}`.trim();

      const provider = state.settings.commProvider || 'mailto';
      if (isDirectMailProvider(provider)) {
        try {
          const result = await sendMailViaBridge({
            provider,
            to: email,
            from: state.settings.commSender || null,
            subject,
            body,
            contactId: contact.id,
            source
          });

          logTimelineEvent({
            contactId: contact.id,
            leadId: contact.leadId || null,
            companyId: contact.companyId || null,
            type: 'message',
            status: 'sent',
            note: `Mail Direct Send via ${provider} (${source})${result?.messageId ? ` [${result.messageId}]` : ''}`,
            channel: 'email'
          });
          saveActivities();
          renderActivitiesTable();
          showToast('✅ Mail direkt versendet');
          return;
        } catch (error) {
          const reason = error?.message || 'Unbekannter Fehler';
          logTimelineEvent({
            contactId: contact.id,
            leadId: contact.leadId || null,
            companyId: contact.companyId || null,
            type: 'message',
            status: 'failed',
            note: `Direct Send fehlgeschlagen (${provider}): ${reason}`,
            channel: 'email'
          });
          saveActivities();
          renderActivitiesTable();
          showToast(`⚠️ Direct Send fehlgeschlagen: ${reason} - Compose wird geoeffnet`);
        }
      }

      const composeUrl = buildComposeUrl(email, subject, body);
      window.open(composeUrl, '_blank', 'noopener');

      logTimelineEvent({
        contactId: contact.id,
        leadId: contact.leadId || null,
        companyId: contact.companyId || null,
        type: 'message',
        status: 'sent',
        note: `Mail Compose via ${provider} (${source})`,
        channel: 'email'
      });
      saveActivities();
      renderActivitiesTable();
    }

    function shouldAutoComposeSessionMail(mode, result) {
      if (state.settings.commAutoCompose !== true) return false;
      if (mode === 'call') return result === 'mailsend';
      if (mode === 'mail') return result !== 'nointerest';
      if (mode === 'followup') return result === 'mailsend';
      return false;
    }

    function hasPermission(action) {
      const role = getCurrentRole();
      const matrix = {
        admin: {
          contacts_delete: true,
          bulk_delete_all: true,
          entities_manage: true,
          contacts_import: true,
          team_manage: true,
          user_manage: true,
          settings_admin: true,
          migration_import: true,
          matkon_view: true,
          matkon_manage: true,
          matkon_assign: true
        },
        manager: {
          contacts_delete: true,
          bulk_delete_all: false,
          entities_manage: true,
          contacts_import: true,
          team_manage: true,
          user_manage: true,
          settings_admin: false,
          migration_import: false,
          matkon_view: true,
          matkon_manage: true,
          matkon_assign: true
        },
        user: {
          contacts_delete: false,
          bulk_delete_all: false,
          entities_manage: true,
          contacts_import: true,
          team_manage: false,
          user_manage: false,
          settings_admin: false,
          migration_import: false,
          matkon_view: true,
          matkon_manage: false,
          matkon_assign: false
        }
      };
      return Boolean(matrix[role]?.[action]);
    }

    function requirePermission(action, message) {
      if (hasPermission(action)) return true;
      const role = getCurrentRole();
      showToast(`⛔ ${message || 'Keine Berechtigung'} (Rolle: ${role})`);
      return false;
    }

    function applyRolePermissionsUI() {
      const role = getCurrentRole();
      const badge = document.getElementById('currentRoleBadge');
      if (badge) badge.textContent = `Role: ${role.charAt(0).toUpperCase() + role.slice(1)}`;

      const settingsRole = document.getElementById('settingsUserRole');
      if (settingsRole) {
        settingsRole.value = role;
        settingsRole.disabled = !hasPermission('settings_admin');
      }

      const governanceEl = document.getElementById('settingsEnforceDealGovernance');
      if (governanceEl) governanceEl.disabled = !hasPermission('settings_admin');

      const migrationBtn = document.getElementById('btnImportMigrationJson');
      if (migrationBtn) migrationBtn.disabled = !hasPermission('migration_import');

      const clearAllBtn = document.getElementById('btnClearAllContacts');
      if (clearAllBtn) clearAllBtn.disabled = !hasPermission('bulk_delete_all');

      const entityButtonIds = ['btnAddCompany', 'btnAddLead', 'btnAddDeal', 'btnAddActivity', 'btnAddTemplate', 'btnAddSequence'];
      entityButtonIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.disabled = !hasPermission('entities_manage');
      });

      const teamButtons = ['btnAddMember'];
      teamButtons.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.disabled = !hasPermission('team_manage');
      });

      populateAnalyticsMemberFilter?.();
      renderUserAccountsList?.();
    }

    function logTimelineEvent(event, saveNow = true) {
      const entry = {
        id: Math.random().toString(36).substr(2, 9),
        contactId: event.contactId || null,
        leadId: event.leadId || null,
        dealId: event.dealId || null,
        companyId: event.companyId || null,
        type: event.type || 'note',
        status: event.status || 'system',
        templateId: null,
        note: event.note || '',
        channel: event.channel || 'system',
        timestamp: event.timestamp || new Date().toISOString()
      };
      state.activities.push(entry);
      if (saveNow) saveActivities();
      return entry;
    }

    function getActivityTypeLabel(type) {
      const labels = {
        request: 'Kontaktanfrage',
        message: 'Nachricht',
        followup: 'Follow-up',
        reply: 'Antwort',
        status_change: 'Statuswechsel',
        phase_change: 'Phasenwechsel',
        deal_stage_change: 'Deal-Stage geaendert',
        deal_created: 'Deal erstellt',
        ownership_change: 'Zuweisung geaendert'
      };
      return labels[type] || type;
    }

    function getActivityStatusLabel(status) {
      const labels = {
        sent: 'Gesendet',
        replied: 'Antwort erhalten',
        system: 'System'
      };
      return labels[status] || status;
    }

    function updateDealOutcomeFieldsVisibility() {
      const stage = document.getElementById('editDealStage')?.value || '';
      const container = document.getElementById('editDealOutcomeContainer');
      const noteLabel = document.getElementById('editDealOutcomeNoteLabel');
      if (!container || !noteLabel) return;
      const isFinalStage = stage === 'won' || stage === 'lost';
      container.style.display = isFinalStage ? 'block' : 'none';
      noteLabel.textContent = stage === 'lost' ? 'Outcome Notiz (Pflicht)' : 'Outcome Notiz';
    }

    function validateDealGovernance(stage, value, probability, closeDate, outcomeReason, outcomeNote) {
      const enforce = state.settings.enforceDealGovernance !== false;
      if (!enforce || !stage) return '';

      const needsCoreFields = ['qualified', 'meeting', 'proposal', 'won', 'lost'].includes(stage);
      if (needsCoreFields && (!(value > 0))) {
        return 'Deal-Wert > 0 ist fuer diese Stage erforderlich';
      }
      if (needsCoreFields && (!(probability >= 0 && probability <= 100))) {
        return 'Wahrscheinlichkeit muss zwischen 0 und 100 liegen';
      }
      if (needsCoreFields && !closeDate) {
        return 'Close Date ist fuer diese Stage erforderlich';
      }

      if (stage === 'won' && !outcomeReason) {
        return 'Outcome Grund ist bei Won erforderlich';
      }
      if (stage === 'lost' && !outcomeReason) {
        return 'Outcome Grund ist bei Lost erforderlich';
      }
      if (stage === 'lost' && (outcomeNote || '').trim().length < 8) {
        return 'Outcome Notiz (mind. 8 Zeichen) ist bei Lost erforderlich';
      }

      return '';
    }

    function renderStats() {
      const total = state.contacts.length;
      const newCount = state.contacts.filter(c => c.status !== 'called' && c.status !== 'preselected').length;
      const calledCount = state.contacts.filter(c => c.status === 'called').length;
      const preselectedCount = state.contacts.filter(c => c.status === 'preselected').length;
      const contactedCount = calledCount + preselectedCount;
      const rate = total > 0 ? Math.round(contactedCount / total * 100) : 0;

      const statTotal = document.getElementById('statTotal');
      if (statTotal) statTotal.textContent = total;
      const statNew = document.getElementById('statNew');
      if (statNew) statNew.textContent = newCount;
      const statCalled = document.getElementById('statCalled');
      if (statCalled) statCalled.textContent = calledCount;
      const statPreselected = document.getElementById('statPreselected');
      if (statPreselected) statPreselected.textContent = preselectedCount;
      const statContacted = document.getElementById('statContacted');
      if (statContacted) statContacted.textContent = contactedCount;
      const statRate = document.getElementById('statRate');
      if (statRate) statRate.textContent = rate > 0 ? rate + '%' : '-';
    }

    // KONTAKTELISTE RENDERING
    function renderContactsTable() {
      const tbody = document.getElementById('contactsTableBody');
      const title = document.getElementById('contactsListTitle');
      title.textContent = `Kontakteliste (${state.contacts.length})`;

      if (state.contacts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; color: var(--muted); padding: 20px;">Keine Kontakte geladen</td></tr>';
        return;
      }

      tbody.innerHTML = state.contacts.map(c => {
        const tblMember = state.members.find(m => m.id === c.memberId);
        const tblMemberHTML = tblMember
          ? `<span style="background:${tblMember.color}22;border:1px solid ${tblMember.color};color:${tblMember.color};border-radius:999px;padding:2px 7px;font-size:10px;font-weight:700;">${tblMember.kuerzel}</span>`
          : '–';
        return `
        <tr>
          <td>${c.vorname || '–'}</td>
          <td>${c.nachname || '–'}</td>
          <td>${c.firma}</td>
          <td>${c.telefon || '–'}</td>
          <td style="max-width: 150px; overflow: hidden; text-overflow: ellipsis;">${c.email || '–'}</td>
          <td>${c.rolle || '–'}</td>
          <td>${c.region || '–'}</td>
          <td><span class="contact-status-badge ${c.status || 'new'}">${getStatusLabel(c.status || 'new').split(' ')[0]}</span></td>
          <td>${tblMemberHTML}</td>
          <td>
            <button class="btn" onclick="openEditModal('${c.id}')" style="padding: 4px 8px; font-size: 11px;">✎ Edit</button>
          </td>
        </tr>
      `}).join('');
    }

    // MODAL EDIT
    function openEditModal(contactId) {
      currentEditContactId = contactId;
      const contact = state.contacts.find(c => c.id === contactId);

      if (!contact) return;

      document.getElementById('editVorname').value = contact.vorname || '';
      document.getElementById('editNachname').value = contact.nachname || '';
      document.getElementById('editFirma').value = contact.firma || '';
      document.getElementById('editTelefon').value = contact.telefon || '';
      document.getElementById('editEmail').value = contact.email || '';
      document.getElementById('editLinkedIn').value = contact.linkedin || '';
      document.getElementById('editFirmaTel').value = contact.unternehmenstelefon || '';
      document.getElementById('editFirmaEmail').value = contact.unternehmensemail || '';
      document.getElementById('editRolle').value = contact.rolle || '';
      document.getElementById('editStrasse').value = contact.strasse || '';
      document.getElementById('editOrtschaft').value = contact.ortschaft || '';
      document.getElementById('editRegion').value = contact.region || '';
      document.getElementById('editNeubau').value = contact.neubau || '';
      document.getElementById('editStatus').value = contact.status || 'new';
      document.getElementById('editNotes').value = '';

      const company = getCompanyForContact(contact);
      const branchSelect = document.getElementById('editCompanyBranch');
      renderCompanyBranchSelect(branchSelect, company, contact.companyBranchId || company?.primaryBranchId || '');
      const primaryCheckbox = document.getElementById('editPrimaryContact');
      if (primaryCheckbox) primaryCheckbox.checked = Boolean(contact.isPrimaryContact);
      
      // Phase & Rating
      document.getElementById('editPhase').value = contact.phase || '';
      const rating = contact.rating || 0;
      document.getElementById('editRating').value = rating;
      renderEditStars(rating);

      // Followup Felder
      document.getElementById('editEmailSentDate').value = contact.emailSentDate || '';
      document.getElementById('editAnswerReceivedDate').value = contact.answerReceivedDate || '';
      document.getElementById('editFollowupCallDate').value = contact.followupCallDate || '';

      document.getElementById('editDealStage').value = contact.dealStage || '';
      document.getElementById('editDealValue').value = contact.dealValue || '';
      document.getElementById('editDealProbability').value = contact.dealProbability || '';
      document.getElementById('editDealCloseDate').value = contact.dealCloseDate || '';
      document.getElementById('editDealOutcomeReason').value = contact.dealOutcomeReason || '';
      document.getElementById('editDealOutcomeNote').value = contact.dealOutcomeNote || '';
      updateDealOutcomeFieldsVisibility();
      
      // Followup Fields bei Status "followup" oder "followuptoday" oder bei Followup-Phasen anzeigen
      const showFollowupFields = ['followup', 'followuptoday'].includes(contact.status) || ['followup1', 'followup2', 'followup3'].includes(contact.phase);
      document.getElementById('followupFieldsContainer').style.display = showFollowupFields ? 'block' : 'none';

      // VR Felder
      const isVrContact = contact.status && contact.status.startsWith('vr');
      document.getElementById('vrFieldsContainer').style.display = isVrContact ? 'block' : 'none';
      if (isVrContact) {
        document.getElementById('editVrProjekt').value = contact.vrProjekt || '';
        document.getElementById('editVrWohnung').value = contact.vrWohnung || '';
        document.getElementById('editVrPunkte').value = contact.vrPunkte || '';
        document.getElementById('editVrMailSentDate').value = contact.vrMailSentDate ? contact.vrMailSentDate.split('T')[0] : '';
        document.getElementById('editVrFollowup1Date').value = contact.vrFollowup1Date ? contact.vrFollowup1Date.split('T')[0] : '';
        document.getElementById('editVrFollowup2Date').value = contact.vrFollowup2Date ? contact.vrFollowup2Date.split('T')[0] : '';
        document.getElementById('editVrFollowup3Date').value = contact.vrFollowup3Date ? contact.vrFollowup3Date.split('T')[0] : '';
        const showVrHeute = ['vrmail_gesendet','vrfollowup1','vrfollowup2','vrfollowup3'].includes(contact.status);
        const btnVrHeute = document.getElementById('btnVrHeute');
        if (btnVrHeute) {
          btnVrHeute.style.display = showVrHeute ? 'block' : 'none';
          btnVrHeute.onclick = () => {
            contact.status = 'vrtoday';
            contact.vrMailSentDate = new Date().toISOString();
            document.getElementById('editStatus').value = 'vrtoday';
            document.getElementById('editVrMailSentDate').value = new Date().toISOString().split('T')[0];
            saveContacts();
            renderKontakte();
            showToast('🎥 VR Rundgang heute gesetzt');
          };
        }
      }

      // Member dropdown
      renderMemberSelectInModal(contact.memberId || '');

      // Render tags
      renderEditTagSelect();
      renderContactTagsInModal();
      renderNotesHistory();
      renderRelatedContactsInModal(contact);

      document.getElementById('editModal').classList.add('show');
    }

    function renderNotesHistory() {
      const contact = state.contacts.find(c => c.id === currentEditContactId);
      const container = document.getElementById('editNotesHistory');
      if (!container || !contact) return;

      // Migration: Alte Notizen in notesHistory übertragen
      if (!Array.isArray(contact.notesHistory)) {
        contact.notesHistory = [];
        if (contact.notes) {
          contact.notesHistory.push({
            text: contact.notes,
            timestamp: contact.updatedAt || contact.createdAt || new Date().toISOString(),
            status: contact.status || 'new'
          });
          saveContacts();
        }
      }

      const notesHistory = contact.notesHistory;

      if (notesHistory.length === 0) {
        container.innerHTML = '<div style="color: var(--muted); font-size: 11px; text-align: center;">Keine Notizen vorhanden</div>';
        return;
      }

      container.innerHTML = notesHistory.map((entry, idx) => `
        <div style="margin-bottom: 12px; padding-bottom: 12px; ${idx < notesHistory.length - 1 ? 'border-bottom: 1px solid var(--line);' : ''}">
          <div style="font-size: 10px; color: var(--muted); margin-bottom: 4px;">
            📅 ${new Date(entry.timestamp).toLocaleString('de-CH', {dateStyle: 'short', timeStyle: 'short'})}
            ${entry.status ? ' • ' + getStatusLabel(entry.status) : ''}
          </div>
          <div style="font-size: 12px; white-space: pre-wrap;">${entry.text}</div>
        </div>
      `).join('');
    }

    function addNoteToContact() {
      const contact = state.contacts.find(c => c.id === currentEditContactId);
      if (!contact) return;

      const noteText = document.getElementById('editNotes').value.trim();
      if (!noteText) {
        showToast('❌ Notiz ist leer');
        return;
      }

      // Ensure notesHistory exists (migration already done in renderNotesHistory)
      if (!Array.isArray(contact.notesHistory)) {
        contact.notesHistory = [];
      }

      contact.notesHistory.push({
        text: noteText,
        timestamp: new Date().toISOString(),
        status: contact.status || 'new'
      });

      // Keep legacy notes field updated with latest
      contact.notes = noteText;
      contact.updatedAt = new Date().toISOString();

      saveContacts();
      document.getElementById('editNotes').value = '';
      renderNotesHistory();
      showToast('✅ Notiz hinzugefügt');
    }

    function closeEditModal() {
      document.getElementById('editModal').classList.remove('show');
      currentEditContactId = null;
    }

    function saveEditedContact() {
      const contact = state.contacts.find(c => c.id === currentEditContactId);
      if (!contact) return;
      const originalContactSnapshot = { ...contact };
      const previous = {
        status: contact.status || 'new',
        phase: contact.phase || '',
        dealStage: contact.dealStage || null,
        memberId: contact.memberId || null
      };

      contact.vorname = document.getElementById('editVorname').value.trim();
      contact.nachname = document.getElementById('editNachname').value.trim();
      contact.firma = document.getElementById('editFirma').value.trim();
      contact.telefon = document.getElementById('editTelefon').value.trim();
      contact.email = document.getElementById('editEmail').value.trim();
      contact.linkedin = document.getElementById('editLinkedIn').value.trim();
      contact.unternehmenstelefon = document.getElementById('editFirmaTel').value.trim();
      contact.unternehmensemail = document.getElementById('editFirmaEmail').value.trim();
      contact.rolle = document.getElementById('editRolle').value.trim();
      contact.strasse = document.getElementById('editStrasse').value.trim();
      contact.ortschaft = document.getElementById('editOrtschaft').value.trim();
      contact.region = document.getElementById('editRegion').value.trim();
      contact.neubau = document.getElementById('editNeubau').value || '';
      const newStatus = document.getElementById('editStatus').value;
      const newPhase = document.getElementById('editPhase').value || '';
      const newRating = parseInt(document.getElementById('editRating').value, 10) || 0;
      // Auto-set followupDueDate when entering a followup phase
      if (['followup', 'followup1', 'followup2', 'followup3'].includes(newPhase) && newPhase !== contact.phase) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 45);
        contact.followupDueDate = dueDate.toISOString().split('T')[0];
      }
      contact.phase = newPhase;
      contact.rating = newRating;
      contact.status = newStatus;
      contact.notes = document.getElementById('editNotes').value.trim();

      const contactError = validateContactData(contact, { requireCompany: false });
      if (contactError) {
        Object.assign(contact, originalContactSnapshot);
        showToast(`❌ ${contactError}`);
        return;
      }
      const duplicateContact = findDuplicateContact(contact, contact.id);
      if (duplicateContact) {
        Object.assign(contact, originalContactSnapshot);
        showToast(`⚠️ Dublette erkannt: ${duplicateContact.vorname || ''} ${duplicateContact.nachname || ''} (${duplicateContact.firma || 'Ohne Firma'})`);
        return;
      }

      const company = getCompanyByName(contact.firma || '');
      if (company) {
        contact.companyId = company.id;
      }
      const branchSelect = document.getElementById('editCompanyBranch');
      if (branchSelect) {
        contact.companyBranchId = branchSelect.value || null;
      }
      const primaryCheckbox = document.getElementById('editPrimaryContact');
      if (primaryCheckbox) {
        contact.isPrimaryContact = primaryCheckbox.checked;
        if (contact.isPrimaryContact) {
          setPrimaryContactForCompany(contact);
        }
      }
      
      // Followup Felder speichern
      contact.emailSentDate = document.getElementById('editEmailSentDate').value || null;
      contact.answerReceivedDate = document.getElementById('editAnswerReceivedDate').value || null;
      contact.followupCallDate = document.getElementById('editFollowupCallDate').value || null;

      const dealStage = document.getElementById('editDealStage').value || null;
      const dealValueRaw = document.getElementById('editDealValue').value;
      const dealProbabilityRaw = document.getElementById('editDealProbability').value;
      const dealCloseDate = document.getElementById('editDealCloseDate').value || null;
      const dealOutcomeReason = document.getElementById('editDealOutcomeReason').value || null;
      const dealOutcomeNote = document.getElementById('editDealOutcomeNote').value.trim();
      const dealValue = dealValueRaw === '' ? null : (parseFloat(dealValueRaw) || 0);
      const dealProbability = dealProbabilityRaw === '' ? null : (parseFloat(dealProbabilityRaw) || 0);

      const governanceError = validateDealGovernance(
        dealStage,
        dealValue,
        dealProbability,
        dealCloseDate,
        dealOutcomeReason,
        dealOutcomeNote
      );
      if (governanceError) {
        Object.assign(contact, originalContactSnapshot);
        showToast(`❌ ${governanceError}`);
        return;
      }

      const dealChanged = (previous.dealStage || null) !== (dealStage || null)
        || Number(contact.dealValue || 0) !== Number(dealValue || 0)
        || Number(contact.dealProbability || 0) !== Number(dealProbability || 0)
        || (contact.dealCloseDate || null) !== (dealCloseDate || null)
        || (contact.dealOutcomeReason || null) !== ((dealStage === 'won' || dealStage === 'lost') ? (dealOutcomeReason || null) : null)
        || (contact.dealOutcomeNote || null) !== ((dealStage === 'won' || dealStage === 'lost') ? (dealOutcomeNote || null) : null);
      if (dealChanged && !hasPermission('entities_manage')) {
        Object.assign(contact, originalContactSnapshot);
        showToast('⛔ Nur Admin/Manager duerfen Deal-Daten aendern');
        return;
      }

      contact.dealStage = dealStage;
      contact.dealValue = dealValue;
      contact.dealProbability = dealProbability;
      contact.dealCloseDate = dealCloseDate;
      contact.dealOutcomeReason = (dealStage === 'won' || dealStage === 'lost') ? dealOutcomeReason : null;
      contact.dealOutcomeNote = (dealStage === 'won' || dealStage === 'lost') ? (dealOutcomeNote || null) : null;

      // Mitarbeiter-Zuweisung
      const memberSelectEl = document.getElementById('editMemberSelect');
      contact.memberId = memberSelectEl ? (memberSelectEl.value || null) : (contact.memberId || null);

      // VR Felder speichern
      if (newStatus && newStatus.startsWith('vr')) {
        contact.vrProjekt = document.getElementById('editVrProjekt').value.trim() || contact.vrProjekt || null;
        contact.vrWohnung = document.getElementById('editVrWohnung').value.trim() || contact.vrWohnung || null;
        contact.vrPunkte = document.getElementById('editVrPunkte').value || contact.vrPunkte || null;
        const vrDateVal = document.getElementById('editVrMailSentDate').value;
        if (vrDateVal) contact.vrMailSentDate = vrDateVal + 'T00:00:00.000Z';
      }

      contact.updatedAt = new Date().toISOString();

      let timelineChanged = false;
      if (previous.status !== (contact.status || 'new')) {
        logTimelineEvent({
          contactId: contact.id,
          leadId: contact.leadId || null,
          companyId: contact.companyId || null,
          type: 'status_change',
          status: 'system',
          note: `${getStatusLabel(previous.status)} -> ${getStatusLabel(contact.status || 'new')}`,
          channel: 'system',
          timestamp: contact.updatedAt
        }, false);
        timelineChanged = true;
      }

      if ((previous.phase || '') !== (contact.phase || '')) {
        logTimelineEvent({
          contactId: contact.id,
          leadId: contact.leadId || null,
          companyId: contact.companyId || null,
          type: 'phase_change',
          status: 'system',
          note: `${previous.phase || 'Keine Phase'} -> ${contact.phase || 'Keine Phase'}`,
          channel: 'system',
          timestamp: contact.updatedAt
        }, false);
        timelineChanged = true;
      }

      if ((previous.dealStage || '') !== (contact.dealStage || '')) {
        logTimelineEvent({
          contactId: contact.id,
          leadId: contact.leadId || null,
          companyId: contact.companyId || null,
          type: 'deal_stage_change',
          status: 'system',
          note: `${previous.dealStage || 'Kein Deal'} -> ${contact.dealStage || 'Kein Deal'}`,
          channel: 'system',
          timestamp: contact.updatedAt
        }, false);
        timelineChanged = true;
      }

      if ((previous.memberId || '') !== (contact.memberId || '')) {
        const prevMember = state.members.find(m => m.id === previous.memberId);
        const nextMember = state.members.find(m => m.id === contact.memberId);
        logTimelineEvent({
          contactId: contact.id,
          leadId: contact.leadId || null,
          companyId: contact.companyId || null,
          type: 'ownership_change',
          status: 'system',
          note: `${prevMember ? prevMember.kuerzel : 'Unassigned'} -> ${nextMember ? nextMember.kuerzel : 'Unassigned'}`,
          channel: 'system',
          timestamp: contact.updatedAt
        }, false);
        timelineChanged = true;
      }

      if (contact.leadId) {
        syncLeadFromContact(contact);
      }

      if (timelineChanged) saveActivities();
      saveContacts();
      renderDashboard();
      renderContactsTable();
      renderCrmCompanies();
      renderCrmCompanyDetail();
      renderStats();
      closeEditModal();
      showToast('✅ Kontakt gespeichert');
    }

    function deleteContact() {
      if (!requirePermission('contacts_delete', 'Nur Admin/Manager duerfen Kontakte loeschen')) return;
      if (!confirm('Kontakt wirklich löschen?')) return;
      const contact = state.contacts.find(c => c.id === currentEditContactId);
      if (contact?.leadId) {
        removeLeadAndRelations(contact.leadId);
      }
      state.activities = state.activities.filter(a => a.contactId !== currentEditContactId);
      state.contacts = state.contacts.filter(c => c.id !== currentEditContactId);
      saveContacts();
      saveActivities();
      renderDashboard();
      renderContactsTable();
      renderCrmCompanies();
      renderCrmCompanyDetail();
      renderStats();
      closeEditModal();
      showToast('✅ Kontakt gelöscht');
    }

    // CSV IMPORT
    function loadContactsFromCSV(csv) {
      if (!requirePermission('contacts_import', 'Kein Import-Recht fuer diese Rolle')) return;

      try {

      if (typeof csv !== 'string' || !csv.trim()) {
        showToast('❌ CSV ist leer oder ungueltig');
        return;
      }

      const parseDelimitedLine = (line, delimiter) => {
        const out = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          const next = line[i + 1];
          if (ch === '"') {
            if (inQuotes && next === '"') {
              current += '"';
              i += 1;
            } else {
              inQuotes = !inQuotes;
            }
            continue;
          }
          if (ch === delimiter && !inQuotes) {
            out.push(current.trim());
            current = '';
            continue;
          }
          current += ch;
        }

        out.push(current.trim());
        return out.map(v => String(v || '').replace(/^"(.*)"$/, '$1').trim());
      };

      const normalizeImportKey = (value) => String(value || '')
        .toLowerCase()
        .replace(/ä/g, 'ae')
        .replace(/ö/g, 'oe')
        .replace(/ü/g, 'ue')
        .replace(/ß/g, 'ss')
        .replace(/[^a-z0-9]/g, '');

      const pickImportValue = (normRow, aliases) => {
        for (const alias of aliases) {
          const key = normalizeImportKey(alias);
          if (normRow[key] !== undefined && String(normRow[key]).trim() !== '') {
            return String(normRow[key]).trim();
          }
        }
        return '';
      };

      const normalizeVrStatus = (rawStatus) => {
        const v = String(rawStatus || '').toLowerCase().trim();
        if (!v) return '';
        if (['vrtoday', 'vr today', 'vr_heute', 'vr-heute', 'today'].includes(v)) return 'vrtoday';
        if (['vrmail_gesendet', 'vr mail gesendet', 'mail gesendet', 'mail sent'].includes(v)) return 'vrmail_gesendet';
        if (['vrfollowup1', 'vr followup 1', 'followup1', 'fu1'].includes(v)) return 'vrfollowup1';
        if (['vrfollowup2', 'vr followup 2', 'followup2', 'fu2'].includes(v)) return 'vrfollowup2';
        if (['vrfollowup3', 'vr followup 3', 'followup3', 'fu3'].includes(v)) return 'vrfollowup3';
        return '';
      };

      const parseIsoDate = (raw) => {
        const val = String(raw || '').trim();
        if (!val) return '';

        // Excel serial date (e.g. 45967) from xlsx exports
        if (/^\d{5,}$/.test(val)) {
          const serial = Number(val);
          if (!Number.isNaN(serial) && serial > 20000 && serial < 90000) {
            const epoch = new Date(Date.UTC(1899, 11, 30));
            const d = new Date(epoch.getTime() + serial * 86400000);
            return d.toISOString();
          }
        }

        // Common EU format dd.mm.yyyy
        const dm = val.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
        if (dm) {
          const d = new Date(Date.UTC(Number(dm[3]), Number(dm[2]) - 1, Number(dm[1])));
          if (!Number.isNaN(d.getTime())) return d.toISOString();
        }

        const d = new Date(val);
        if (Number.isNaN(d.getTime())) return '';
        return d.toISOString();
      };

      const splitFullName = (raw) => {
        const cleaned = String(raw || '')
          .replace(/^frau\s+/i, '')
          .replace(/^herr\s+/i, '')
          .replace(/^mr\.?\s+/i, '')
          .replace(/^ms\.?\s+/i, '')
          .trim();
        if (!cleaned) return { vorname: '', nachname: '' };
        const parts = cleaned.split(/\s+/).filter(Boolean);
        if (parts.length === 1) return { vorname: parts[0], nachname: '' };
        return { vorname: parts[0], nachname: parts.slice(1).join(' ') };
      };

      const deriveVrStatusFromColumns = (normRow, currentStatusText) => {
        const fu3 = parseIsoDate(pickImportValue(normRow, ['3. Follow up', '3 Follow up', '3 Followup', 'VR Followup3', 'VR FU3']));
        const call = parseIsoDate(pickImportValue(normRow, ['Anruf', 'Call']));
        const fu2 = parseIsoDate(pickImportValue(normRow, ['2. Follow up', '2 Follow up', '2 Followup', 'VR Followup2', 'VR FU2']));
        const fu1 = parseIsoDate(pickImportValue(normRow, ['1. Follow up Mail', '1 Follow up Mail', 'VR Followup1', 'VR FU1']));
        const mail1 = parseIsoDate(pickImportValue(normRow, ['1. Mail', '1 Mail', 'VR Mail Sent', 'VR Mail Datum', 'Mail Gesendet Am']));

        const statusText = String(currentStatusText || '').toLowerCase();
        if (statusText.includes('abgesagt') || statusText.includes('kein bedarf') || statusText.includes('kein interesse')) {
          return { status: 'nointerest', vrMailSentDate: mail1, vrFollowup1Date: fu1, vrFollowup2Date: fu2 || call, vrFollowup3Date: fu3 };
        }

        if (fu3) return { status: 'vrfollowup3', vrMailSentDate: mail1, vrFollowup1Date: fu1, vrFollowup2Date: fu2 || call, vrFollowup3Date: fu3 };
        if (fu2 || call) return { status: 'vrfollowup2', vrMailSentDate: mail1, vrFollowup1Date: fu1, vrFollowup2Date: fu2 || call, vrFollowup3Date: '' };
        if (fu1) return { status: 'vrfollowup1', vrMailSentDate: mail1, vrFollowup1Date: fu1, vrFollowup2Date: '', vrFollowup3Date: '' };
        if (mail1) return { status: 'vrmail_gesendet', vrMailSentDate: mail1, vrFollowup1Date: '', vrFollowup2Date: '', vrFollowup3Date: '' };
        return { status: 'vrtoday', vrMailSentDate: '', vrFollowup1Date: '', vrFollowup2Date: '', vrFollowup3Date: '' };
      };

      const findMemberIdFromImport = (raw) => {
        const value = String(raw || '').trim();
        if (!value) return null;
        const low = value.toLowerCase();
        const member = state.members.find(m =>
          m.id === value ||
          String(m.kuerzel || '').toLowerCase() === low ||
          `${m.vorname || ''} ${m.nachname || ''}`.trim().toLowerCase() === low ||
          `${m.nachname || ''} ${m.vorname || ''}`.trim().toLowerCase() === low
        );
        return member ? member.id : null;
      };

      const lines = String(csv || '').replace(/^\uFEFF/, '').trim().split(/\r?\n/);
      if (lines.length < 1) {
        showToast('❌ CSV ist leer');
        return;
      }

      const tabCount = (lines[0].match(/\t/g) || []).length;
      const semiCount = (lines[0].match(/;/g) || []).length;
      const commaCount = (lines[0].match(/,/g) || []).length;

      let delimiter = ',';
      if (tabCount > semiCount && tabCount > commaCount) {
        delimiter = '\t';
      } else if (semiCount > commaCount) {
        delimiter = ';';
      }

      const header = parseDelimitedLine(lines[0], delimiter);
      const newContacts = [];
      let skippedInvalid = 0;
      let skippedDuplicate = 0;
      let importedVrCount = 0;
      let assignedMemberCount = 0;
      let updatedExistingCount = 0;
      let mergedBatchCount = 0;

      const hasValue = (value) => String(value ?? '').trim() !== '';
      const mergeImportedIntoContact = (target, incoming, isVrRow) => {
        const preferIncoming = (field) => {
          if (hasValue(incoming[field])) target[field] = incoming[field];
        };

        [
          'vorname', 'nachname', 'firma', 'telefon', 'email', 'linkedin',
          'unternehmenstelefon', 'unternehmensemail', 'rolle', 'strasse',
          'ortschaft', 'region', 'memberId', 'vrProjekt', 'website'
        ].forEach(preferIncoming);

        if (hasValue(incoming.notes)) {
          const current = String(target.notes || '').trim();
          if (!current) {
            target.notes = incoming.notes;
          } else if (!current.includes(incoming.notes)) {
            target.notes = `${current} | ${incoming.notes}`;
          }
        }

        if (isVrRow) {
          target.source = 'vr';
          if (hasValue(incoming.status)) target.status = incoming.status;
          ['vrMailSentDate', 'vrFollowup1Date', 'vrFollowup2Date', 'vrFollowup3Date'].forEach(preferIncoming);
        }

        target.updatedAt = new Date().toISOString();
      };

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        const parts = parseDelimitedLine(line, delimiter);
        const row = {};
        const normRow = {};
        header.forEach((col, idx) => {
          row[col] = parts[idx] || '';
          normRow[normalizeImportKey(col)] = parts[idx] || '';
        });

        const firma = pickImportValue(normRow, ['Vermarktung/Unternehmen', 'Unternehmen', 'Firma', 'Company']);
        if (!firma) continue;

        const projectName = pickImportValue(normRow, ['Projekt', 'Projektname', 'Neubauprojekt']);
        const fullName = pickImportValue(normRow, ['Vor-/Nachname', 'Vorname Nachname', 'Ansprechpartner', 'Kontaktperson']);
        const splitName = splitFullName(fullName);
        const currentStand = pickImportValue(normRow, ['Aktueller Stand', 'Status Text']);

        const importedStatusRaw = pickImportValue(normRow, ['VR Status', 'Status', 'Phase', 'Followup Status']);
        const importedStatus = normalizeVrStatus(importedStatusRaw);

        const importedSourceRaw = pickImportValue(normRow, ['Quelle', 'Source', 'Kanal']);
        const importedSource = String(importedSourceRaw || '').toLowerCase();
        const isVrListRow = Boolean(importedStatus) || importedSource.includes('vr') || importedSource.includes('rundgang') || Boolean(projectName) || Boolean(currentStand);

        const derived = isVrListRow
          ? deriveVrStatusFromColumns(normRow, currentStand)
          : { status: '', vrMailSentDate: '', vrFollowup1Date: '', vrFollowup2Date: '', vrFollowup3Date: '' };

        const memberRaw = pickImportValue(normRow, ['Mitarbeiter', 'Owner', 'Zustaendig', 'Kuerzel', 'Member']);
        const memberId = findMemberIdFromImport(memberRaw);

        const contact = {
          id: Math.random().toString(36).substr(2, 9),
          vorname: pickImportValue(normRow, ['Vorname', 'First Name']) || splitName.vorname,
          nachname: pickImportValue(normRow, ['Nachname', 'Last Name']) || splitName.nachname,
          firma,
          telefon: pickImportValue(normRow, ['AnsprechpartnerTelefon', 'Telefon', 'Phone', 'Mobile']),
          email: pickImportValue(normRow, ['AnsprechpartnerEmail', 'E-Mail', 'Email']),
          linkedin: pickImportValue(normRow, ['LinkedIn', 'LinkedIn URL', 'LinkedInURL']),
          unternehmenstelefon: pickImportValue(normRow, ['UnternehmensTel', 'Unternehmens Telefon', 'Company Phone']),
          unternehmensemail: pickImportValue(normRow, ['UnternehmensEmail', 'Unternehmens E-Mail', 'Company Email']),
          rolle: pickImportValue(normRow, ['Rolle', 'Position']),
          strasse: pickImportValue(normRow, ['Strasse', 'Adresse', 'Address']),
          ortschaft: pickImportValue(normRow, ['Ortschaft', 'Ort', 'Stadt', 'City']),
          region: pickImportValue(normRow, ['Region', 'Segment', 'Kanton']),
          status: importedStatus || (isVrListRow ? derived.status : 'new'),
          notes: [currentStand, pickImportValue(normRow, ['Notiz', 'Notizen', 'Kommentar', 'Bemerkung'])].filter(Boolean).join(' | '),
          source: isVrListRow ? 'vr' : 'calls',
          memberId,
          vrProjekt: projectName || null,
          website: pickImportValue(normRow, ['link Projekt', 'Projektlink', 'Website', 'URL']) || undefined,
          createdAt: new Date().toISOString()
        };

        const vrMailSentDate = derived.vrMailSentDate || parseIsoDate(pickImportValue(normRow, ['VR Mail Sent', 'VR Mail Datum', 'Mail Gesendet Am', 'vrMailSentDate', '1. Mail']));
        const vrFollowup1Date = derived.vrFollowup1Date || parseIsoDate(pickImportValue(normRow, ['VR Followup1', 'VR FU1', 'Followup1 Datum', 'vrFollowup1Date', '1. Follow up Mail']));
        const vrFollowup2Date = derived.vrFollowup2Date || parseIsoDate(pickImportValue(normRow, ['VR Followup2', 'VR FU2', 'Followup2 Datum', 'vrFollowup2Date', '2. Follow up', 'Anruf']));
        const vrFollowup3Date = derived.vrFollowup3Date || parseIsoDate(pickImportValue(normRow, ['VR Followup3', 'VR FU3', 'Followup3 Datum', 'vrFollowup3Date', '3. Follow up']));

        if (vrMailSentDate) contact.vrMailSentDate = vrMailSentDate;
        if (vrFollowup1Date) contact.vrFollowup1Date = vrFollowup1Date;
        if (vrFollowup2Date) contact.vrFollowup2Date = vrFollowup2Date;
        if (vrFollowup3Date) contact.vrFollowup3Date = vrFollowup3Date;

        // Falls Status gesetzt ist, aber Datumsfelder fehlen, initialisieren wir ein konsistentes Basisdatum.
        if (isVrListRow) {
          importedVrCount += 1;
          const baseline = new Date().toISOString();
          if (contact.status === 'vrmail_gesendet' && !contact.vrMailSentDate) contact.vrMailSentDate = baseline;
          if (contact.status === 'vrfollowup1' && !contact.vrFollowup1Date) contact.vrFollowup1Date = baseline;
          if (contact.status === 'vrfollowup2' && !contact.vrFollowup2Date) contact.vrFollowup2Date = baseline;
          if (contact.status === 'vrfollowup3' && !contact.vrFollowup3Date) contact.vrFollowup3Date = baseline;
        }
        if (memberId) assignedMemberCount += 1;

        let validationError = validateContactData(contact, { requireCompany: true });
        if (validationError === 'E-Mail ist ungueltig') {
          contact.email = '';
          validationError = validateContactData(contact, { requireCompany: true });
        }
        if (validationError === 'Telefonnummer ist zu kurz') {
          contact.telefon = '';
          validationError = validateContactData(contact, { requireCompany: true });
        }
        if (validationError) {
          skippedInvalid += 1;
          continue;
        }

        const existingDuplicate = findDuplicateContact(contact);
        const batchDuplicate = newContacts.find(c => isDuplicateContactPair(c, contact));
        if (existingDuplicate || batchDuplicate) {
          if (isVrListRow) {
            if (existingDuplicate) {
              mergeImportedIntoContact(existingDuplicate, contact, true);
              updatedExistingCount += 1;
            } else if (batchDuplicate) {
              mergeImportedIntoContact(batchDuplicate, contact, true);
              mergedBatchCount += 1;
            }
            continue;
          }
          skippedDuplicate += 1;
          continue;
        }

        newContacts.push(contact);
      }

      if (newContacts.length === 0 && updatedExistingCount === 0 && mergedBatchCount === 0) {
        showToast(`❌ Keine neuen Kontakte importiert (ungueltig: ${skippedInvalid}, Dubletten: ${skippedDuplicate})`);
        return;
      }

      // Füge neue Kontakte zu bestehenden hinzu statt sie zu ersetzen
      if (newContacts.length > 0) {
        state.contacts = state.contacts.concat(newContacts);
      }
      
      // Erstelle Companies aus den importierten Firmen-Namen
      ensureCompaniesFromContacts();
      
      saveContacts();
      saveCompanies();
      renderDashboard();
      renderContactsTable();
      renderStats();
      showToast(`✅ ${newContacts.length} Kontakte importiert · ${updatedExistingCount} aktualisiert · ${mergedBatchCount} zusammengefuehrt · VR: ${importedVrCount} · Mitarbeiter zugewiesen: ${assignedMemberCount} (ungueltig: ${skippedInvalid}, Dubletten: ${skippedDuplicate})`);
      } catch (error) {
        console.error('CSV import failed:', error);
        const msg = String(error?.message || error || 'Unbekannter Fehler');
        showToast(`❌ Import fehlgeschlagen: ${msg}`);
      }
    }

    let lastCsvUploadClickAt = 0;
    let lastCsvPasteClickAt = 0;

    function handleCsvUploadClick() {
      const nowMs = Date.now();
      if (nowMs - lastCsvUploadClickAt < 700) return;
      lastCsvUploadClickAt = nowMs;

      const input = document.getElementById('csvUpload');
      const file = input?.files?.[0];
      if (!file) { showToast('❌ Waehle eine CSV-Datei'); return; }

      const name = String(file.name || '').toLowerCase();
      const isExcel = name.endsWith('.xlsx') || name.endsWith('.xls');
      if (isExcel) {
        if (typeof XLSX === 'undefined') {
          showToast('❌ Excel-Import nicht verfuegbar. Bitte als CSV speichern.');
          return;
        }

        const readerExcel = new FileReader();
        readerExcel.onerror = () => showToast('❌ Excel-Datei konnte nicht gelesen werden');
        readerExcel.onload = (e) => {
          try {
            const data = e?.target?.result;
            const wb = XLSX.read(data, { type: 'array' });
            const firstSheet = wb?.SheetNames?.[0];
            if (!firstSheet) {
              showToast('❌ Keine Tabellenblaetter in Excel-Datei gefunden');
              return;
            }
            const csv = XLSX.utils.sheet_to_csv(wb.Sheets[firstSheet], { FS: ';' });
            loadContactsFromCSV(csv);
          } catch (err) {
            console.error('Excel import parse failed:', err);
            showToast('❌ Excel-Import fehlgeschlagen');
          }
        };
        readerExcel.readAsArrayBuffer(file);
        return;
      }

      const reader = new FileReader();
      reader.onerror = () => showToast('❌ Datei konnte nicht gelesen werden');
      reader.onload = (e) => loadContactsFromCSV(String(e?.target?.result || ''));
      reader.readAsText(file, 'UTF-8');
    }

    function handleCsvPasteClick() {
      const nowMs = Date.now();
      if (nowMs - lastCsvPasteClickAt < 700) return;
      lastCsvPasteClickAt = nowMs;

      const field = document.getElementById('csvPaste');
      const text = String(field?.value || '').trim();
      if (!text) { showToast('❌ Nichts eingefuegt'); return; }
      loadContactsFromCSV(text);
      field.value = '';
    }

    window.handleCsvUploadClick = handleCsvUploadClick;
    window.handleCsvPasteClick = handleCsvPasteClick;

    // CSV EXPORT – liest Datumsfilter aus dem neuen Analytics-Dashboard
    function getAnalyticsDateRange() {
      const fromVal = document.getElementById('dashAnalyticsFrom')?.value;
      const toVal   = document.getElementById('dashAnalyticsTo')?.value;

      if ((fromVal && !toVal) || (!fromVal && toVal)) {
        showToast('❌ Bitte Von und Bis setzen');
        return { invalid: true };
      }

      if (!fromVal && !toVal) return null;

      const from = new Date(fromVal);
      const to   = new Date(toVal);
      to.setHours(23, 59, 59, 999);
      return { from, to };
    }

    function exportContacts() {
      const headers = [
        'Vorname', 'Nachname', 'Firma', 'Telefon', 'Email',
        'Telefon Firma', 'Email Firma', 'Rolle', 'Strasse', 'Ortschaft', 'Region',
        'Firma Strasse', 'Firma PLZ', 'Firma Ort', 'Firma Branche', 'Firma Website',
        'Status', 'Neubauprojekt', 'Kanal', 'Notizen (mit Zeit)'
      ];
      const rows = state.contacts.map(c => {
        const company = getCompanyForContact(c);
        const branch = getBranchForContact(c, company);
        const notesHistory = Array.isArray(c.notesHistory) ? c.notesHistory : [];
        const notesWithTime = notesHistory.length > 0
          ? notesHistory
              .map(entry => {
                const ts = entry.timestamp ? new Date(entry.timestamp) : null;
                const tsText = ts && !isNaN(ts) ? ts.toLocaleString('de-CH', { dateStyle: 'short', timeStyle: 'short' }) : '—';
                return `${tsText} - ${entry.text || ''}`.trim();
              })
              .join(' | ')
          : (c.notes || '');

        const neubaauLabel = c.neubau === 'vorhanden' ? 'Online' : (c.neubau === 'planung' ? 'In Planung' : '');
        return [
          c.vorname, c.nachname, c.firma, c.telefon, c.email,
          c.unternehmenstelefon, c.unternehmensemail, c.rolle,
          c.strasse, c.ortschaft, c.region,
          branch?.street || company?.street || '',
          branch?.postal || company?.postal || '',
          branch?.city || company?.city || '',
          branch?.industry || company?.industry || '',
          branch?.website || company?.website || '',
          c.status,
          neubaauLabel,
          getLeadChannelByContact(c),
          notesWithTime
        ];
      });
      const csv = [headers, ...rows].map(r => r.map(v => `"${String(v || '').replaceAll('"', '""')}"`).join(';')).join('\r\n');
      const _csvBytes1 = new TextEncoder().encode(csv);
      const blob = new Blob([new Uint8Array([0xEF,0xBB,0xBF]), _csvBytes1], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.setAttribute('href', URL.createObjectURL(blob));
      link.setAttribute('download', `contacts_${new Date().toISOString().split('T')[0]}.csv`);
      link.click();
      showToast('📥 Kontakte exportiert!');
    }

    function exportLinkedInOutreach() {
      const dateRange = getAnalyticsDateRange();
      if (dateRange?.invalid) return;

      let activities = state.activities.filter(a => a.channel === 'linkedin');
      if (dateRange) {
        activities = activities.filter(a => {
          const ts = new Date(a.timestamp);
          return ts >= dateRange.from && ts <= dateRange.to;
        });
      }

      const headers = [
        'Datum', 'Zeit', 'Vorname', 'Nachname', 'Firma',
        'LinkedIn URL', 'Aktivitaet', 'Status', 'Notiz', 'Kanal'
      ];

      const rows = activities.map(a => {
        const contact = a.contactId ? state.contacts.find(c => c.id === a.contactId) : null;
        const lead = a.leadId ? getLeadById(a.leadId) : null;
        const company = contact?.firma || (lead ? getCompanyById(lead.companyId)?.name : '') || '';
        const fullName = contact
          ? `${contact.vorname || ''} ${contact.nachname || ''}`.trim()
          : (lead?.name || '');
        const nameParts = fullName.split(/\s+/).filter(Boolean);
        const vorname = nameParts[0] || '';
        const nachname = nameParts.slice(1).join(' ');
        const ts = new Date(a.timestamp);

        return [
          ts.toLocaleDateString('de-CH'),
          ts.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' }),
          vorname,
          nachname,
          company,
          contact?.linkedin || lead?.linkedin || '',
          getActivityTypeLabel(a.type),
          getActivityStatusLabel(a.status),
          a.note || '',
          'linkedin'
        ];
      });

      const csv = [headers, ...rows].map(r => r.map(v => `"${String(v || '').replaceAll('"', '""')}"`).join(';')).join('\r\n');
      const _csvBytes2 = new TextEncoder().encode(csv);
      const blob = new Blob([new Uint8Array([0xEF,0xBB,0xBF]), _csvBytes2], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.setAttribute('href', URL.createObjectURL(blob));
      link.setAttribute('download', `linkedin_outreach_${new Date().toISOString().split('T')[0]}.csv`);
      link.click();
      showToast('📥 LinkedIn Outreach exportiert!');
    }

    function renderFollowupGrid() {
      const searchTerm = (document.getElementById('followupSearch')?.value || '').toLowerCase();
      const followupFilter = document.querySelector('[data-followup-filter].active')?.dataset.followupFilter || 'all';
      const followupSource = state.selectedFollowupSource || 'calls';
      const emailFromDate = document.getElementById('followupEmailFromDate')?.value;
      const emailToDate = document.getElementById('followupEmailToDate')?.value;
      const sortBy = document.getElementById('followupSortBy')?.value || 'followupdue';
      const sortDescending = document.getElementById('btnToggleFollowupSortOrder')?.classList.contains('descending') || false;
      const plzRangeText = (document.getElementById('followupPLZRange')?.value || '').trim();

      const followupGrid = document.getElementById('followupGrid');
      const outreachList = document.getElementById('outreachFollowupList');
      if (!followupGrid) return;

      if (followupSource === 'outreach') {
        if (followupGrid) followupGrid.style.display = 'none';
        if (outreachList) outreachList.style.display = 'block';
        renderOutreachFollowupList(followupFilter);
        return;
      }

      if (followupGrid) followupGrid.style.display = 'grid';
      if (outreachList) outreachList.style.display = 'none';

      let filtered = state.contacts.filter(c => c.status === 'followup');

      // Filter by search
      if (searchTerm) {
        filtered = filtered.filter(c => {
          const text = `${c.vorname} ${c.nachname} ${c.firma} ${c.telefon} ${c.email} ${c.ortschaft}`.toLowerCase();
          return text.includes(searchTerm);
        });
      }

      // Filter by PLZ range (e.g., "8000-8100" or "8000 - 8100")
      if (plzRangeText) {
        const parts = plzRangeText.split('-').map(p => p.trim());
        if (parts.length === 2) {
          const minPLZ = parseInt(parts[0], 10);
          const maxPLZ = parseInt(parts[1], 10);
          if (!isNaN(minPLZ) && !isNaN(maxPLZ)) {
            filtered = filtered.filter(c => {
              if (!c.ortschaft) return false;
              const match = c.ortschaft.match(/^\d{4,5}/);
              if (match) {
                const contactPLZ = parseInt(match[0], 10);
                return contactPLZ >= minPLZ && contactPLZ <= maxPLZ;
              }
              return false;
            });
          }
        }
      }

      // Filter by due date
      if (followupFilter === 'due') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        filtered = filtered.filter(c => 
          c.followupCallDate && new Date(c.followupCallDate) <= today
        );
      }

      // Filter by tag
      if (state.selectedFollowupTagFilter) {
        filtered = filtered.filter(c => c.tags && c.tags.includes(state.selectedFollowupTagFilter));
      }

      // Filter by email date
      if (emailFromDate && emailToDate) {
        const dateFrom = new Date(emailFromDate);
        const dateTo = new Date(emailToDate);
        dateTo.setHours(23, 59, 59);
        filtered = filtered.filter(c => {
          if (!c.emailSentDate) return false;
          const emailDate = new Date(c.emailSentDate);
          return emailDate >= dateFrom && emailDate <= dateTo;
        });
      }

      // Sort
      filtered.sort((a, b) => {
        let result = 0;
        switch(sortBy) {
          case 'name':
            result = `${a.vorname} ${a.nachname}`.localeCompare(`${b.vorname} ${b.nachname}`);
            break;
          case 'company':
            result = (a.firma || '').localeCompare(b.firma || '');
            break;
          case 'location':
            result = (a.ortschaft || '').localeCompare(b.ortschaft || '');
            break;
          case 'status':
            result = (a.status || '').localeCompare(b.status || '');
            break;
          case 'newest':
            result = new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
            break;
          case 'followupdue':
            const dateA = a.followupCallDate ? new Date(a.followupCallDate) : new Date('2099-12-31');
            const dateB = b.followupCallDate ? new Date(b.followupCallDate) : new Date('2099-12-31');
            result = dateA - dateB;
            break;
          default:
            result = 0;
        }
        return sortDescending ? -result : result;
      });

      const grid = document.getElementById('followupGrid');
      if (filtered.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; padding: 20px; text-align: center; color: var(--muted)">Keine Followup-Kontakte gefunden</div>';
        return;
      }

      grid.innerHTML = filtered.map(c => {
        const isSelected = state.selectedContacts && state.selectedContacts.has(c.id);
        const emailSentDate = c.emailSentDate ? new Date(c.emailSentDate).toLocaleDateString('de-CH') : '–';
        const followupCallDate = c.followupCallDate ? new Date(c.followupCallDate).toLocaleDateString('de-CH') : '–';
        const notesHistory = Array.isArray(c.notesHistory) ? c.notesHistory : [];
        const latestNotes = notesHistory.length > 0 
          ? notesHistory[notesHistory.length - 1].text 
          : (c.notes || '–');

        const tagsHTML = c.tags && c.tags.length > 0 ? `
          <div class="tag-badges">
            ${c.tags.map(tagId => {
              const tag = getTagById(tagId);
              return tag ? `<div class="tag-badge" style="background-color: ${tag.color}22; border-color: ${tag.color}; color: ${tag.color};">${tag.name}</div>` : '';
            }).join('')}
          </div>
        ` : '';

        const firstTag = c.tags && c.tags.length > 0 ? getTagById(c.tags[0]) : null;
        const backgroundColor = firstTag ? firstTag.color + '55' : 'var(--card)';
        const tagClass = firstTag ? 'with-tag' : '';

        return `
        <div class="contact-tile ${isSelected ? 'selected' : ''} ${tagClass}" data-contact-id="${c.id}" style="background-color: ${backgroundColor};" onclick="openEditModal('${c.id}')">
          <button class="contact-select" onclick="event.stopPropagation(); toggleContactSelection('${c.id}')">${isSelected ? '✓' : '○'}</button>
          <div class="contact-header">
            <div style="flex: 1">
              <div class="contact-name">${c.vorname} ${c.nachname}</div>
              <div class="contact-company">${c.firma}${c.rolle ? ' • ' + c.rolle : ''}</div>
            </div>
            <span class="contact-status-badge followup">🔄 Followup</span>
          </div>
          <div class="contact-details">
            ${c.telefon ? '📞 ' + c.telefon : ''}
            ${c.email ? '<br>📧 ' + c.email : ''}
            ${c.strasse ? '<br>📍 ' + c.strasse : ''}
            ${c.ortschaft ? ' ' + c.ortschaft : ''}
          </div>
          ${tagsHTML}
          <div style="background: rgba(100,200,255,.1); padding: 8px; border-radius: 6px; margin-top: 8px; font-size: 11px;">
            <div>📧 Email: <strong>${emailSentDate}</strong></div>
            <div>📞 Followup: <strong>${followupCallDate}</strong></div>
            <div style="margin-top: 4px; color: var(--muted);">📝 ${latestNotes.substring(0, 60)}${latestNotes.length > 60 ? '...' : ''}</div>
          </div>
        </div>
      `}).join('');
    }

    function renderOutreachFollowupList(followupFilter) {
      const tbody = document.getElementById('outreachFollowupBody');
      if (!tbody) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const lastActivityByContact = new Map();
      state.activities.forEach(activity => {
        if (!activity?.contactId) return;
        const prev = lastActivityByContact.get(activity.contactId);
        if (!prev || new Date(activity.timestamp) > new Date(prev.timestamp)) {
          lastActivityByContact.set(activity.contactId, activity);
        }
      });

      const getLastActivity = (contactId) => lastActivityByContact.get(contactId) || null;

      let items = state.contacts
        .filter(c => c.source === 'linkedin')
        .filter(c => ['request', 'message', 'followup', 'outreachtoday'].includes(c.outreachStatus));

      if (followupFilter === 'due') {
        const cutoff = new Date(today);
        cutoff.setDate(cutoff.getDate() - 3);
        items = items.filter(c => {
          const last = getLastActivity(c.id);
          const lastDate = last ? new Date(last.timestamp) : new Date(c.updatedAt || c.createdAt || 0);
          return lastDate <= cutoff;
        });
      }

      if (items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--muted); padding: 16px;">Keine Outreach-Followups</td></tr>';
        return;
      }

      tbody.innerHTML = items.map(contact => {
        const last = getLastActivity(contact.id);
        return `
          <tr>
            <td>${contact.vorname || ''} ${contact.nachname || ''}</td>
            <td>${contact.firma || '–'}</td>
            <td>${last ? getActivityTypeLabel(last.type) : '–'}</td>
            <td>${last ? new Date(last.timestamp).toLocaleDateString('de-CH') : '–'}</td>
            <td>${contact.outreachStatus || '–'}</td>
            <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis;">${last?.note || '–'}</td>
          </tr>
        `;
      }).join('');
    }

    function renderSessionLog() {
      const tbody = document.getElementById('sessionLogTable');
      const summaryEl = document.getElementById('sessionTodaySummary');
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const activeFilter = state.sessionLogFilter || 'all';

      const getLogMode = (entry) => {
        const mode = String(entry.mode || entry.sessionMode || '').toLowerCase();
        if (['call', 'mail', 'outreach', 'followup'].includes(mode)) return mode;
        const status = String(entry.status || '').toLowerCase();
        const note = String(entry.notes || '').toLowerCase();
        if (status === 'followup' || status === 'followuptoday' || status === 'nokeinbedarf' || note.includes('🔄 fu') || note.includes('followup')) return 'followup';
        if (status === 'mail_sent' || status === 'mailsend' || status === 'mailtonewcontact' || note.includes('📧 mail')) return 'mail';
        if (status === 'request' || status === 'message' || status === 'reply' || note.includes('linkedin')) return 'outreach';
        return 'call';
      };

      const todayLog = state.callLog.filter(x => {
        const dateMatch = x.date ? x.date === todayStr : (() => {
          const ts = new Date(x.timestamp);
          const tsLocal = `${ts.getFullYear()}-${String(ts.getMonth() + 1).padStart(2, '0')}-${String(ts.getDate()).padStart(2, '0')}`;
          return tsLocal === todayStr;
        })();
        if (!dateMatch) return false;
        if (activeFilter !== 'all' && getLogMode(x) !== activeFilter) return false;
        return true;
      });

      const counts = todayLog.reduce((acc, entry) => {
        const key = entry.status || 'unknown';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});

      if (summaryEl) {
        summaryEl.textContent = `Total abgeschlossen: ${todayLog.length} · Angerufen: ${counts.called || 0} · Mail wollen: ${(counts.mailsend || 0) + (counts.mailtonewcontact || 0)} · Nicht erreicht: ${counts.notreached || 0} · Vorselektiert: ${counts.preselected || 0} · Kein Interesse: ${counts.nointerest || 0} · Gewonnen: ${counts.won || 0} · Antwort: ${counts.response || 0}`;
      }

      if (todayLog.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--muted);">Keine Calls heute</td></tr>';
        return;
      }

      tbody.innerHTML = todayLog.map(x => {
        const r = x.rating || 0;
        const starsHTML = [1,2,3,4,5].map(i =>
          `<span onclick="setCallRating('${x.id}', ${i})" style="cursor:pointer;color:${i <= r ? '#f59e0b' : '#d1d5db'};font-size:14px;transition:color .15s;">★</span>`
        ).join('');
        return `
          <tr>
            <td>${x.vorname} ${x.nachname}</td>
            <td>${x.firma}</td>
            <td>${getStatusLabel(x.status).split(' ')[0]}</td>
            <td style="font-size: 11px;">${new Date(x.timestamp).toLocaleTimeString('de-CH', {hour: '2-digit', minute: '2-digit'})}</td>
            <td style="white-space:nowrap;">${starsHTML}</td>
          </tr>
        `;
      }).join('');
    }

    function setCallRating(callId, val) {
      const entry = state.callLog.find(x => x.id === callId);
      if (!entry) return;
      entry.rating = entry.rating === val ? 0 : val;
      const contact = state.contacts.find(c => c.id === entry.contactId);
      if (contact) { contact.rating = entry.rating; saveContacts(); }
      saveCallLog();
      renderSessionLog();
    }

    // ANALYTICS – vollständig neu aufgebaut
    // ─────────────────────────────────────────────────────────────

    // Normalisiert den Modus eines callLog-Eintrags (rückwärtskompatibel)
    function getLogEntryMode(entry) {
      const m = String(entry.mode || entry.sessionMode || '').toLowerCase();
      if (['call', 'mail', 'outreach', 'followup'].includes(m)) return m;
      const s = String(entry.status || '').toLowerCase();
      const n = String(entry.notes || '').toLowerCase();
      if (['followup','followuptoday','nokeinbedarf'].includes(s) || n.includes('🔄 fu') || n.includes('followup')) return 'followup';
      if (['mail_sent','mailsend','mailtonewcontact'].includes(s) || n.includes('📧 mail')) return 'mail';
      if (['request','message','reply','outreachtoday','lioutboundtoday','lioutboundfollowup'].includes(s) || n.includes('linkedin')) return 'outreach';
      return 'call';
    }

    function renderDashboardMyDay() {
      const el = document.getElementById('dashboardMyDayBar');
      if (!el) return;

      const today    = new Date().toISOString().split('T')[0];
      const todayStr = new Date().toLocaleDateString('de-CH', { weekday: 'long', day: 'numeric', month: 'long' });
      const role     = getCurrentRole();

      // Determine default member filter: own linked member, or 'all' for admin with no link
      if (!state.dashMyDayMember) {
        const ownId = getCurrentUserLinkedMemberId();
        state.dashMyDayMember = ownId || 'all';
      }
      const activeMember = state.dashMyDayMember;

      // Member dropdown options
      const memberOptions = role === 'admin'
        ? `<option value="all"${activeMember === 'all' ? ' selected' : ''}>Alle Mitarbeiter</option>` +
          state.members.map(m =>
            `<option value="${m.id}"${activeMember === m.id ? ' selected' : ''}>${m.vorname} ${m.nachname}</option>`
          ).join('')
        : (() => {
            const m = state.members.find(x => x.id === activeMember);
            return m ? `<option value="${m.id}" selected>${m.vorname} ${m.nachname}</option>` : '';
          })();

      // Filter contacts by member
      const mFilter = c => activeMember === 'all' || c.memberId === activeMember;

      // KPI counts
      const callsToday    = state.contacts.filter(c => mFilter(c) && c.status === 'callstoday').length;
      const followupToday = state.contacts.filter(c => mFilter(c) && c.status === 'followuptoday').length;
      const contactMap    = new Map(state.contacts.map(c => [c.id, c]));
      const sessionsToday = state.callLog.filter(x => {
        const d = String(x.date || x.timestamp || '');
        if (!d.startsWith(today)) return false;
        if (activeMember === 'all') return true;
        const c = contactMap.get(x.contactId);
        return c?.memberId === activeMember;
      }).length;
      const vrToday       = state.contacts.filter(c => mFilter(c) && ['vrtoday','vrfollowup1','vrfollowup2','vrfollowup3'].includes(c.status)).length;
      const tasksToday    = state.tasks.filter(t =>
        t.dueDate && t.dueDate <= today && !['erledigt','abgesagt'].includes(t.status)
      ).length;

      // Task preview (max 5) — tasks not filtered by member (org-wide)
      const tasksDue = state.tasks
        .filter(t => t.dueDate && t.dueDate <= today && !['erledigt','abgesagt'].includes(t.status))
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
        .slice(0, 5);

      const kpiCard = (icon, label, count, color, onclick) => `
        <div class="analytics-kpi-card" onclick="${onclick}" style="cursor:pointer; border-left: 3px solid ${color};">
          <div class="analytics-kpi-value" style="color:${count > 0 ? color : 'var(--muted)'};">${count}</div>
          <div class="analytics-kpi-label">${icon} ${label}</div>
        </div>`;

      const taskRows = tasksDue.length === 0
        ? '<div style="color:var(--muted);font-size:13px;padding:8px 0;">Keine offenen Aufgaben für heute.</div>'
        : tasksDue.map(t => {
            const overdue = t.dueDate < today;
            return `<div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--line);">
              <span style="font-size:13px;flex:1;">${t.title || '(ohne Titel)'}</span>
              <span style="font-size:11px;color:${overdue ? 'var(--bad)' : 'var(--muted)'};">${overdue ? '⚠️ überfällig' : '📅 ' + new Date(t.dueDate).toLocaleDateString('de-CH')}</span>
              <button class="btn" style="padding:2px 8px;font-size:11px;" onclick="setView('aufgaben')">→</button>
            </div>`;
          }).join('');

      el.innerHTML = `
        <div style="margin-bottom:16px;">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;flex-wrap:wrap;">
            <div style="font-size:12px;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.5px;flex:1;">Heute · ${todayStr}</div>
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="font-size:12px;color:var(--muted);">Ansicht:</span>
              <select id="dashMyDayMemberSel" class="input-field" style="margin:0;min-width:160px;font-size:13px;" onchange="state.dashMyDayMember=this.value;renderDashboardMyDay()" ${role !== 'admin' ? 'disabled' : ''}>
                ${memberOptions}
              </select>
            </div>
          </div>
          <div class="analytics-kpi-grid" style="grid-template-columns:repeat(auto-fill,minmax(140px,1fr));margin-bottom:16px;">
            ${kpiCard('📞', 'Heute anrufen',  callsToday,    '#3b82f6', "setView('session');setSessionMode('call')")}
            ${kpiCard('🔔', 'Followup heute', followupToday, '#ea580c', "setView('session');setSessionMode('followup')")}
            ${kpiCard('✅', 'Sessions heute', sessionsToday, '#10b981', "setView('session')")}
            ${kpiCard('🎥', 'VR fällig',      vrToday,       '#8b5cf6', "setView('session');setSessionMode('vr')")}
            ${kpiCard('📋', 'Aufgaben heute', tasksToday,    '#f59e0b', "setView('aufgaben')")}
          </div>
          ${tasksToday > 0 ? `
          <div class="card" style="margin-bottom:16px;">
            <div class="card-content" style="padding:12px 16px;">
              <div style="font-size:12px;font-weight:700;color:var(--muted);margin-bottom:8px;">OFFENE AUFGABEN HEUTE</div>
              ${taskRows}
              ${tasksToday > 5 ? `<div style="font-size:12px;color:var(--accent);padding-top:8px;cursor:pointer;" onclick="setView('aufgaben')">+ ${tasksToday - 5} weitere → Aufgaben öffnen</div>` : ''}
            </div>
          </div>` : ''}
        </div>`;
      renderDashboardBoards();
    }

    function renderAnalytics() {
      // ── Mitarbeiter-Dropdown (rollenbasiert) aktuell halten ─────
      populateAnalyticsMemberFilter();

      // ── Filter-Werte lesen ──────────────────────────────────────
      const dateFromVal = document.getElementById('dashAnalyticsFrom')?.value;
      const dateToVal   = document.getElementById('dashAnalyticsTo')?.value;
      const activeModule  = state.analyticsModule || 'all';
      const memberFilter  = document.getElementById('dashAnalyticsMember')?.value || 'all';

      let dateFrom = null, dateTo = null;
      if (dateFromVal && dateToVal) {
        dateFrom = new Date(dateFromVal);
        dateTo   = new Date(dateToVal);
        dateTo.setHours(23, 59, 59, 999);
      } else if (dateFromVal || dateToVal) {
        const infoEl = document.getElementById('dashAnalyticsFilterInfo');
        if (infoEl) infoEl.textContent = '⚠️ Bitte Von und Bis angeben für Zeitraumfilter.';
        return;
      }

      // Filter-Info anzeigen
      const infoEl = document.getElementById('dashAnalyticsFilterInfo');
      if (infoEl) {
        const moduleLabel = { all:'Alle Aktivitäten', call:'Calls', mail:'Mail', followup:'Followup', outreach:'LinkedIn Outreach', vr:'VR Rundgang' }[activeModule] || activeModule;
        const dateLabel = dateFrom ? `${dateFrom.toLocaleDateString('de-CH')} – ${dateTo.toLocaleDateString('de-CH')}` : 'Gesamter Zeitraum';
        const memberLabel = memberFilter !== 'all' ? (' · ' + (state.members.find(m=>m.id===memberFilter)?.vorname || (memberFilter === '__none__' ? 'Kein Mitglied' : memberFilter))) : '';
        const memberHint = memberFilter === '__none__' ? ' · ⚠️ Bitte User einem Mitarbeiter zuordnen.' : '';
        infoEl.textContent = `Modul: ${moduleLabel} · Zeitraum: ${dateLabel}${memberLabel}${memberHint}`;
      }

      // ── callLog filtern ─────────────────────────────────────────
      const contactById = new Map(state.contacts.map(c => [c.id, c]));

      const filtered = state.callLog.filter(x => {
        // Datum
        if (dateFrom && dateTo) {
          const ts = new Date(x.timestamp).getTime();
          if (ts < dateFrom.getTime() || ts > dateTo.getTime()) return false;
        }
        // Modul
        if (activeModule !== 'all' && activeModule !== 'vr') {
          const entryMode = getLogEntryMode(x);
          if (activeModule === 'outreach' && entryMode !== 'outreach') return false;
          if (activeModule !== 'outreach' && entryMode !== activeModule) return false;
        }
        if (activeModule === 'vr') return false; // VR hat keine callLog-Einträge
        // Mitarbeiter
        if (memberFilter !== 'all') {
          const c = contactById.get(x.contactId);
          if (!c || c.memberId !== memberFilter) return false;
        }
        return true;
      });

      // ── VR-Kontakte separat (über vrMailSentDate) ───────────────
      const vrContacts = state.contacts.filter(c => {
        if (!c.vrMailSentDate) return false;
        if (dateFrom && dateTo) {
          const ts = new Date(c.vrMailSentDate).getTime();
          return ts >= dateFrom.getTime() && ts <= dateTo.getTime();
        }
        return true;
      });

      // Zeitreferenzen für Heute / Diese Woche
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const todayTs    = todayStart.getTime();
      const tomorrowTs = todayTs + 86400000;
      const weekAgoTs  = todayTs - 7 * 86400000;

      // ── Grundzahlen über gesamtes callLog (unabhängig v. Filter) ─
      let todayAll = 0, weekAll = 0;
      for (const x of state.callLog) {
        const ts = new Date(x.timestamp).getTime();
        if (ts >= todayTs && ts < tomorrowTs) todayAll++;
        if (ts >= weekAgoTs) weekAll++;
      }

      // ── Im Zeitraum (filtered) ──────────────────────────────────
      const total = filtered.length + (activeModule === 'vr' || activeModule === 'all' ? vrContacts.length : 0);

      // Modul-Aufschlüsselung für "Alle"
      const byMode = { call: 0, mail: 0, followup: 0, outreach: 0 };
      for (const x of filtered) { byMode[getLogEntryMode(x)] = (byMode[getLogEntryMode(x)] || 0) + 1; }

      // Kontaktquote (anhand vorhandener Status, unabhängig vom Zeitraum)
      const contactedStatuses = new Set(['called','preselected','response','followup','followuptoday','mailsend','won']);
      const contactedCount = state.contacts.filter(c => contactedStatuses.has(c.status || '')).length;
      const contactRate = state.contacts.length > 0 ? Math.round(contactedCount / state.contacts.length * 100) : 0;

      // ── KPI-Karten rendern ──────────────────────────────────────
      const kpiEl = document.getElementById('dashAnalyticsKpis');
      if (kpiEl) {
        const kpis = [
          { val: total, lbl: activeModule === 'all' ? 'Aktionen im Zeitraum' : ({ call:'Calls im Zeitraum', mail:'Mails im Zeitraum', followup:'Followups im Zeitraum', outreach:'LinkedIn-Aktionen', vr:'VR-Mails gesendet' }[activeModule] || 'Im Zeitraum'), sub: dateFrom ? '' : 'Gesamt', cls: '' },
          { val: todayAll, lbl: 'Heute (gesamt)', sub: new Date().toLocaleDateString('de-CH'), cls: '' },
          { val: weekAll,  lbl: 'Diese Woche (7 Tage)', sub: 'rollierend', cls: '' },
          { val: contactRate + '%', lbl: 'Kontaktquote', sub: `${contactedCount} von ${state.contacts.length}`, cls: contactRate >= 50 ? 'highlight-good' : '' },
        ];
        if (activeModule === 'all') {
          kpis.push({ val: byMode.call, lbl: '📞 Calls', sub: 'Anruf-Session', cls: '' });
          kpis.push({ val: byMode.mail, lbl: '📧 Mail', sub: 'Mail-Session', cls: '' });
          kpis.push({ val: byMode.followup, lbl: '🔄 Followup', sub: 'Followup-Session', cls: '' });
          kpis.push({ val: byMode.outreach, lbl: '💼 LinkedIn', sub: 'Outreach-Session', cls: '' });
          kpis.push({ val: vrContacts.length, lbl: '🎥 VR Mails', sub: 'Rundgang-Session', cls: '' });
        }
        kpiEl.innerHTML = kpis.map(k => `
          <div class="analytics-kpi-card ${k.cls}">
            <div class="analytics-kpi-value">${k.val}</div>
            <div class="analytics-kpi-label">${k.lbl}</div>
            ${k.sub ? `<div class="analytics-kpi-sub">${k.sub}</div>` : ''}
          </div>`).join('');
      }

      // ── Modul-Detail-Stats ──────────────────────────────────────
      const detailEl = document.getElementById('dashAnalyticsModuleDetail');
      if (detailEl) {
        if (activeModule === 'call' || activeModule === 'all') {
          const callEntries = activeModule === 'all' ? filtered.filter(x => getLogEntryMode(x) === 'call') : filtered;
          const statusCount = (s) => callEntries.filter(x => x.status === s).length;
          const reached = callEntries.filter(x => ['called','preselected','mailsend','won','response','followup','followuptoday'].includes(x.status)).length;
          const notReached = statusCount('notreached');
          const reachRate = callEntries.length > 0 ? Math.round(reached / callEntries.length * 100) : 0;
          detailEl.innerHTML = `
            <div class="card" style="margin-bottom:0;">
              <div class="card-head"><h3 class="card-title">📞 Call-Details</h3><div class="card-sub">Ausgewertete Anruf-Sessions</div></div>
              <div class="card-content">
                <div class="analytics-detail-grid">
                  <div class="analytics-detail-box"><div class="adval">${callEntries.length}</div><div class="adlbl">Calls total</div></div>
                  <div class="analytics-detail-box" style="border-color:var(--good);"><div class="adval" style="color:var(--good);">${reached}</div><div class="adlbl">Erreicht</div></div>
                  <div class="analytics-detail-box" style="border-color:var(--bad);"><div class="adval" style="color:var(--bad);">${notReached}</div><div class="adlbl">Nicht erreicht</div></div>
                  <div class="analytics-detail-box"><div class="adval">${reachRate}%</div><div class="adlbl">Erreichquote</div></div>
                  <div class="analytics-detail-box"><div class="adval">${statusCount('preselected')}</div><div class="adlbl">Vorselektiert</div></div>
                  <div class="analytics-detail-box"><div class="adval">${statusCount('mailsend')}</div><div class="adlbl">Mail erwünscht</div></div>
                  <div class="analytics-detail-box" style="border-color:var(--warn);"><div class="adval" style="color:var(--warn);">${callEntries.filter(x=>['followup','followuptoday'].includes(x.status)).length}</div><div class="adlbl">FU eröffnet</div></div>
                  <div class="analytics-detail-box" style="border-color:var(--good);"><div class="adval" style="color:var(--good);">${statusCount('won')}</div><div class="adlbl">Gewonnen</div></div>
                  <div class="analytics-detail-box"><div class="adval">${statusCount('nointerest')}</div><div class="adlbl">Kein Interesse</div></div>
                </div>
              </div>
            </div>`;
        } else if (activeModule === 'mail') {
          const mailEntries = filtered;
          detailEl.innerHTML = `
            <div class="card" style="margin-bottom:0;">
              <div class="card-head"><h3 class="card-title">📧 Mail-Details</h3><div class="card-sub">Ausgewertete Mail-Sessions</div></div>
              <div class="card-content">
                <div class="analytics-detail-grid">
                  <div class="analytics-detail-box"><div class="adval">${mailEntries.length}</div><div class="adlbl">Mails gesendet</div></div>
                  <div class="analytics-detail-box" style="border-color:var(--warn);"><div class="adval" style="color:var(--warn);">${mailEntries.filter(x=>['followup','followuptoday','mailsend'].includes(x.status)).length}</div><div class="adlbl">FU gestartet</div></div>
                  <div class="analytics-detail-box" style="border-color:var(--bad);"><div class="adval" style="color:var(--bad);">${mailEntries.filter(x=>x.status==='nointerest').length}</div><div class="adlbl">Kein Interesse</div></div>
                </div>
              </div>
            </div>`;
        } else if (activeModule === 'followup') {
          const fuEntries = filtered;
          const fuReached = fuEntries.filter(x => ['called','preselected','mailsend','won','response','followup','followuptoday'].includes(x.status)).length;
          const fuRate = fuEntries.length > 0 ? Math.round(fuReached / fuEntries.length * 100) : 0;
          detailEl.innerHTML = `
            <div class="card" style="margin-bottom:0;">
              <div class="card-head"><h3 class="card-title">🔄 Followup-Details</h3><div class="card-sub">Ausgewertete Followup-Sessions</div></div>
              <div class="card-content">
                <div class="analytics-detail-grid">
                  <div class="analytics-detail-box"><div class="adval">${fuEntries.length}</div><div class="adlbl">FU Calls total</div></div>
                  <div class="analytics-detail-box" style="border-color:var(--good);"><div class="adval" style="color:var(--good);">${fuReached}</div><div class="adlbl">Erreicht</div></div>
                  <div class="analytics-detail-box"><div class="adval">${fuRate}%</div><div class="adlbl">Erreichquote</div></div>
                  <div class="analytics-detail-box"><div class="adval">${fuEntries.filter(x=>x.status==='notreached').length}</div><div class="adlbl">Nicht erreicht</div></div>
                  <div class="analytics-detail-box" style="border-color:var(--good);"><div class="adval" style="color:var(--good);">${fuEntries.filter(x=>x.status==='won').length}</div><div class="adlbl">Gewonnen</div></div>
                  <div class="analytics-detail-box"><div class="adval">${fuEntries.filter(x=>x.status==='nointerest').length}</div><div class="adlbl">Kein Interesse</div></div>
                </div>
              </div>
            </div>`;
        } else if (activeModule === 'outreach') {
          const liEntries = filtered;
          const requests = liEntries.filter(x=>x.status==='request').length;
          const messages = liEntries.filter(x=>x.status==='message').length;
          const replies  = liEntries.filter(x=>['reply','replied'].includes(x.status)).length;
          const replyRate = liEntries.length > 0 ? Math.round(replies / liEntries.length * 100) : 0;
          // LinkedIn-Activities im Zeitraum (aus state.activities)
          let liActivities = state.activities.filter(a => a.channel === 'linkedin');
          if (dateFrom && dateTo) {
            liActivities = liActivities.filter(a => {
              const ts = new Date(a.timestamp).getTime();
              return ts >= dateFrom.getTime() && ts <= dateTo.getTime();
            });
          }
          const liReplies = liActivities.filter(a => a.type === 'reply' || a.status === 'replied').length;
          detailEl.innerHTML = `
            <div class="card" style="margin-bottom:0;">
              <div class="card-head"><h3 class="card-title">💼 LinkedIn-Details</h3><div class="card-sub">Outreach-Aktionen im Zeitraum</div></div>
              <div class="card-content">
                <div class="analytics-detail-grid">
                  <div class="analytics-detail-box"><div class="adval">${liEntries.length}</div><div class="adlbl">Outreach-Aktionen</div></div>
                  <div class="analytics-detail-box"><div class="adval">${requests}</div><div class="adlbl">Requests</div></div>
                  <div class="analytics-detail-box"><div class="adval">${messages}</div><div class="adlbl">Messages</div></div>
                  <div class="analytics-detail-box" style="border-color:var(--good);"><div class="adval" style="color:var(--good);">${replies}</div><div class="adlbl">Antworten</div></div>
                  <div class="analytics-detail-box"><div class="adval">${replyRate}%</div><div class="adlbl">Antwortquote</div></div>
                  <div class="analytics-detail-box"><div class="adval">${liActivities.length}</div><div class="adlbl">Activities (Logs)</div></div>
                  <div class="analytics-detail-box" style="border-color:var(--good);"><div class="adval" style="color:var(--good);">${liReplies}</div><div class="adlbl">Replies (Activities)</div></div>
                </div>
              </div>
            </div>`;
        } else if (activeModule === 'vr') {
          const projects = [...new Set(vrContacts.map(c=>c.vrProjekt).filter(Boolean))];
          detailEl.innerHTML = `
            <div class="card" style="margin-bottom:0;">
              <div class="card-head"><h3 class="card-title">🎥 VR Rundgang-Details</h3><div class="card-sub">VR-Mails im Zeitraum</div></div>
              <div class="card-content">
                <div class="analytics-detail-grid">
                  <div class="analytics-detail-box"><div class="adval">${vrContacts.length}</div><div class="adlbl">VR-Mails gesendet</div></div>
                  <div class="analytics-detail-box"><div class="adval">${projects.length}</div><div class="adlbl">Projekte</div></div>
                </div>
                ${projects.length > 0 ? `<div style="margin-top:10px; font-size:12px; color:var(--muted);">Projekte: ${projects.join(', ')}</div>` : ''}
              </div>
            </div>`;
        } else {
          detailEl.innerHTML = '';
        }
      }

      // ── Tagesverlauf-Chart ──────────────────────────────────────
      const trendEl = document.getElementById('dashAnalyticsTrend');
      const subtitleEl = document.getElementById('dashTrendSubtitle');
      if (trendEl) {
        // Datenquelle: filtered callLog + VR wenn nötig
        const trendSource = [...filtered];

        // Datumsbereich bestimmen
        let trendStart, trendEnd;
        if (dateFrom && dateTo) {
          trendStart = new Date(dateFrom); trendStart.setHours(0,0,0,0);
          trendEnd   = new Date(dateTo);   trendEnd.setHours(0,0,0,0);
        } else {
          // Letzten 14 Tage
          trendEnd   = new Date(); trendEnd.setHours(0,0,0,0);
          trendStart = new Date(trendEnd); trendStart.setDate(trendStart.getDate() - 13);
        }

        // Alle Tage im Bereich erzeugen
        const days = [];
        const d = new Date(trendStart);
        while (d <= trendEnd) {
          days.push(new Date(d));
          d.setDate(d.getDate() + 1);
        }

        if (subtitleEl) subtitleEl.textContent = `${days.length} Tage · ${activeModule === 'all' ? 'Alle Aktivitäten' : ({'call':'Calls','mail':'Mails','followup':'Followups','outreach':'LinkedIn','vr':'VR'}[activeModule]||activeModule)}`;

        // Zählen pro Tag
        const dayCount = new Map();
        for (const x of trendSource) {
          const xd = new Date(x.timestamp); xd.setHours(0,0,0,0);
          const key = xd.toISOString().split('T')[0];
          dayCount.set(key, (dayCount.get(key)||0) + 1);
        }
        if (activeModule === 'vr' || activeModule === 'all') {
          for (const c of vrContacts) {
            if (!c.vrMailSentDate) continue;
            const vd = new Date(c.vrMailSentDate); vd.setHours(0,0,0,0);
            const key = vd.toISOString().split('T')[0];
            dayCount.set(key, (dayCount.get(key)||0) + 1);
          }
        }

        const maxVal = Math.max(1, ...days.map(d => dayCount.get(d.toISOString().split('T')[0])||0));
        const showLabels = days.length <= 31;

        // Aggregation: wenn > 60 Tage → nach Woche gruppieren
        if (days.length > 60) {
          // Wochenweise zusammenfassen
          const weekMap = new Map();
          for (const [key, cnt] of dayCount.entries()) {
            const dd = new Date(key);
            dd.setDate(dd.getDate() - dd.getDay()); // Montag-ish
            const wkey = dd.toISOString().split('T')[0];
            weekMap.set(wkey, (weekMap.get(wkey)||0) + cnt);
          }
          const weeks = [...weekMap.entries()].sort((a,b)=>a[0]<b[0]?-1:1);
          const maxW = Math.max(1, ...weeks.map(w=>w[1]));
          trendEl.innerHTML = weeks.map(([wk, cnt]) => {
            const pct = Math.round(cnt/maxW*100);
            const label = new Date(wk).toLocaleDateString('de-CH',{day:'2-digit',month:'2-digit'});
            return `<div class="analytics-bar-row">
              <div class="analytics-bar-label">KW ${label}</div>
              <div class="analytics-bar-track"><div class="analytics-bar-fill" style="width:${pct}%;"></div></div>
              <div class="analytics-bar-count">${cnt}</div>
            </div>`;
          }).join('') || '<div style="color:var(--muted);padding:16px;text-align:center;font-size:12px;">Keine Daten</div>';
        } else {
          trendEl.innerHTML = days.map(dayDate => {
            const key = dayDate.toISOString().split('T')[0];
            const cnt = dayCount.get(key) || 0;
            const pct = Math.round(cnt / maxVal * 100);
            const label = showLabels
              ? dayDate.toLocaleDateString('de-CH', { weekday:'short', day:'2-digit', month:'2-digit' })
              : dayDate.toLocaleDateString('de-CH', { day:'2-digit', month:'2-digit' });
            const isToday = key === new Date().toISOString().split('T')[0];
            return `<div class="analytics-bar-row">
              <div class="analytics-bar-label" style="${isToday ? 'color:var(--accent);font-weight:700;' : ''}">${label}</div>
              <div class="analytics-bar-track"><div class="analytics-bar-fill" style="width:${pct}%;${isToday?'background:var(--good);':''}"></div></div>
              <div class="analytics-bar-count" style="${cnt === 0 ? 'color:var(--muted);' : ''}">${cnt}</div>
            </div>`;
          }).join('') || '<div style="color:var(--muted);padding:16px;text-align:center;font-size:12px;">Keine Daten im Zeitraum</div>';
        }
      }

      // ── Status Verteilung ───────────────────────────────────────
      const statusDist = {};
      for (const c of state.contacts) {
        const s = c.status || 'new';
        statusDist[s] = (statusDist[s] || 0) + 1;
      }
      const statusDistEl = document.getElementById('dashAnalyticsStatusDist');
      if (statusDistEl) {
        const maxStatusCnt = Math.max(1, ...Object.values(statusDist));
        statusDistEl.innerHTML = Object.entries(statusDist)
          .sort((a,b) => b[1]-a[1])
          .map(([s, cnt]) => {
            const pct = Math.round(cnt/maxStatusCnt*100);
            return `<div class="analytics-bar-row">
              <div class="analytics-bar-label">${getStatusLabel(s).split(' ').slice(1).join(' ') || getStatusLabel(s)}</div>
              <div class="analytics-bar-track"><div class="analytics-bar-fill" style="width:${pct}%;"></div></div>
              <div class="analytics-bar-count">${cnt}</div>
            </div>`;
          }).join('') || '<div style="color:var(--muted);font-size:12px;padding:8px;">Keine Daten</div>';
      }

      // ── Deal Funnel ─────────────────────────────────────────────
      const dealStages = [
        { id:'prospecting', label:'Prospecting' }, { id:'qualified', label:'Qualified' },
        { id:'meeting', label:'Meeting' },          { id:'proposal', label:'Proposal' },
        { id:'won', label:'Won' },                  { id:'lost', label:'Lost' }
      ];
      const totalDeals = state.deals.length;
      const weightedPipeline = state.deals.reduce((s,d) => s + Number(d.value||0) * Number(d.probability||0) / 100, 0);
      const funnelEl = document.getElementById('dashAnalyticsDealFunnel');
      if (funnelEl) {
        const maxDealCnt = Math.max(1, ...dealStages.map(s => state.deals.filter(d=>(d.stage||'prospecting')===s.id).length));
        const rows = dealStages.map(s => {
          const cnt = state.deals.filter(d => (d.stage||'prospecting') === s.id).length;
          const pct = Math.round(cnt/maxDealCnt*100);
          return `<div class="analytics-bar-row">
            <div class="analytics-bar-label">${s.label}</div>
            <div class="analytics-bar-track"><div class="analytics-bar-fill" style="width:${pct}%;"></div></div>
            <div class="analytics-bar-count">${cnt}</div>
          </div>`;
        }).join('');
        funnelEl.innerHTML = `
          <div style="margin-bottom:12px; padding:10px 12px; background:rgba(16,185,129,.1); border:1px solid rgba(16,185,129,.3); border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:12px; font-weight:600;">Weighted Pipeline</span>
            <strong>CHF ${Math.round(weightedPipeline).toLocaleString('de-CH')}</strong>
          </div>
          ${rows || '<div style="color:var(--muted);font-size:12px;padding:8px;">Keine Deals vorhanden</div>'}`;
      }

      // ── Member Stats ────────────────────────────────────────────
      const memberEl = document.getElementById('dashAnalyticsMemberStats');
      if (memberEl) {
        if (!state.members.length) {
          memberEl.innerHTML = '<div style="color:var(--muted);font-size:12px;padding:8px;">Keine Mitarbeiter angelegt</div>';
        } else {
          memberEl.innerHTML = state.members.map(m => {
            const assigned = state.contacts.filter(c => c.memberId === m.id);
            // Calls dieses Mitarbeiters im Zeitraum
            const memberCalls = state.callLog.filter(x => {
              const c = contactById.get(x.contactId);
              if (!c || c.memberId !== m.id) return false;
              if (dateFrom && dateTo) {
                const ts = new Date(x.timestamp).getTime();
                return ts >= dateFrom.getTime() && ts <= dateTo.getTime();
              }
              return true;
            });
            const callsInPeriod   = memberCalls.filter(x => getLogEntryMode(x) === 'call').length;
            const mailsInPeriod   = memberCalls.filter(x => getLogEntryMode(x) === 'mail').length;
            const fuInPeriod      = memberCalls.filter(x => getLogEntryMode(x) === 'followup').length;
            const wonInPeriod     = memberCalls.filter(x => x.status === 'won').length;
            return `
              <div style="display:flex; align-items:center; gap:12px; padding:12px; background:var(--bg); border:1px solid var(--line); border-radius:8px; margin-bottom:6px; flex-wrap:wrap;">
                <span style="background:${m.color}22;border:1px solid ${m.color};color:${m.color};border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0;">${m.kuerzel}</span>
                <div style="flex:1; min-width:120px;">
                  <div style="font-size:13px;font-weight:700;">${m.vorname} ${m.nachname}</div>
                  <div style="font-size:11px;color:var(--muted);margin-top:3px;">Kontakte gesamt: <strong>${assigned.length}</strong></div>
                </div>
                <div style="display:flex; gap:16px; flex-wrap:wrap;">
                  <div style="text-align:center;"><div style="font-size:16px;font-weight:700;">${callsInPeriod}</div><div style="font-size:10px;color:var(--muted);">Calls</div></div>
                  <div style="text-align:center;"><div style="font-size:16px;font-weight:700;">${mailsInPeriod}</div><div style="font-size:10px;color:var(--muted);">Mails</div></div>
                  <div style="text-align:center;"><div style="font-size:16px;font-weight:700;">${fuInPeriod}</div><div style="font-size:10px;color:var(--muted);">Followups</div></div>
                  <div style="text-align:center;"><div style="font-size:16px;font-weight:700;color:var(--good);">${wonInPeriod}</div><div style="font-size:10px;color:var(--muted);">Won</div></div>
                </div>
              </div>`;
          }).join('');
        }
      }

      // ── Kontakte im Zeitraum ────────────────────────────────────
      dashRenderAnalyticsContacts(filtered, vrContacts, activeModule);
    }

    function dashRenderAnalyticsContacts(filteredCalls, vrContacts, activeModule) {
      const container = document.getElementById('dashAnalyticsContacts');
      const titleEl   = document.getElementById('dashAnalyticsContactsTitle');
      if (!container) return;

      // Eindeutige Kontakte aus callLog-Einträgen
      const contactById = new Map(state.contacts.map(c => [c.id, c]));
      const contactIdSet = new Set([
        ...filteredCalls.map(x => x.contactId).filter(Boolean),
        ...(activeModule === 'vr' || activeModule === 'all' ? vrContacts.map(c=>c.id) : [])
      ]);
      const contacts = [...contactIdSet].map(id => contactById.get(id)).filter(Boolean);

      if (titleEl) titleEl.textContent = `Kontakte im Zeitraum (${contacts.length})`;

      if (!contacts.length) {
        container.innerHTML = '<div style="color:var(--muted);font-size:12px;text-align:center;padding:20px;">Keine Kontakte im gewählten Zeitraum gefunden</div>';
        return;
      }

      container.innerHTML = contacts.map(c => {
        const notesHist = Array.isArray(c.notesHistory) ? c.notesHistory : [];
        const latestNote = notesHist.length > 0 ? notesHist[notesHist.length-1].text : (c.notes || '–');
        const notePreview = latestNote.length > 90 ? latestNote.substring(0,90)+'...' : latestNote;
        // Anzahl Entries für diesen Kontakt
        const cnt = filteredCalls.filter(x=>x.contactId===c.id).length;
        return `
          <div style="background:var(--card);border:1px solid var(--line);border-radius:8px;padding:12px;cursor:pointer;display:flex;gap:12px;align-items:flex-start;"
               onclick="openEditModal('${c.id}')"
               onmouseover="this.style.borderColor='var(--accent)'"
               onmouseout="this.style.borderColor='var(--line)'">
            <div style="flex:1;">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;gap:8px;flex-wrap:wrap;">
                <div>
                  <div style="font-size:13px;font-weight:700;">${c.firma || '–'}</div>
                  <div style="font-size:11px;color:var(--muted);">${c.vorname || ''} ${c.nachname || ''}</div>
                </div>
                <div style="display:flex;gap:6px;align-items:center;flex-shrink:0;">
                  ${cnt > 0 ? `<span style="background:var(--accent-soft);color:var(--accent);font-size:10px;border-radius:10px;padding:2px 8px;font-weight:700;">${cnt} Aktionen</span>` : ''}
                  <span class="contact-status-badge ${c.status||'new'}">${getStatusLabel(c.status||'new')}</span>
                </div>
              </div>
              <div style="font-size:11px;color:var(--muted);">📝 ${notePreview}</div>
            </div>
          </div>`;
      }).join('');
    }

    function getImmoRadarScore(contact) {
      const ratingScore = (Number(contact.rating || 0) * 14);
      const status = String(contact.status || 'new');
      const dealStage = String(contact.dealStage || '');
      const phase = String(contact.phase || '');

      const statusMap = {
        won: 35,
        response: 20,
        preselected: 14,
        followup: 12,
        followuptoday: 14,
        lioutboundfollowup: 10,
        lioutboundtoday: 8,
        called: 6,
        mailsend: 6,
        callstoday: 4,
        nointerest: -35,
        nokeinbedarf: -12
      };

      const stageMap = {
        prospecting: 4,
        qualified: 10,
        meeting: 18,
        proposal: 24,
        won: 34,
        lost: -24
      };

      const phaseMap = {
        coldcall: 2,
        mail: 4,
        followup1: 8,
        followup2: 10,
        followup3: 12
      };

      const sourceBonus = contact.source === 'linkedin' ? 8 : 0;
      const raw = 30 + ratingScore + (statusMap[status] || 0) + (stageMap[dealStage] || 0) + (phaseMap[phase] || 0) + sourceBonus;
      return Math.max(0, Math.min(100, Math.round(raw)));
    }

    function getImmoRadarSegment(score) {
      if (score >= 75) return 'hot';
      if (score >= 55) return 'warm';
      if (score >= 35) return 'cool';
      return 'cold';
    }

    function getLastTouchForContact(contactId) {
      let lastTs = 0;
      state.activities.forEach(a => {
        if (a.contactId === contactId) {
          const ts = new Date(a.timestamp || 0).getTime();
          if (ts > lastTs) lastTs = ts;
        }
      });
      state.callLog.forEach(l => {
        if (l.contactId === contactId) {
          const ts = new Date(l.timestamp || 0).getTime();
          if (ts > lastTs) lastTs = ts;
        }
      });
      return lastTs || 0;
    }

    function getStrengthLabel(lastTouchTs) {
      if (!lastTouchTs) return { label: 'Schwach', color: '#6b7280' };
      const ageDays = (Date.now() - lastTouchTs) / 86400000;
      if (ageDays <= 7) return { label: 'Stark', color: '#10b981' };
      if (ageDays <= 21) return { label: 'Mittel', color: '#f59e0b' };
      return { label: 'Schwach', color: '#6b7280' };
    }

    function getImmoRadarRows() {
      return state.contacts.map(contact => {
        const score = getImmoRadarScore(contact);
        const segment = getImmoRadarSegment(score);
        const lastTouchTs = getLastTouchForContact(contact.id);
        return {
          id: contact.id,
          name: `${contact.vorname || ''} ${contact.nachname || ''}`.trim() || 'Kontakt',
          company: contact.firma || '–',
          city: contact.ortschaft || '',
          status: contact.status || 'new',
          pipeline: contact.dealStage || contact.phase || 'prospecting',
          source: getLeadChannelByContact(contact),
          score,
          segment,
          lastTouchTs,
          strength: getStrengthLabel(lastTouchTs)
        };
      });
    }

    function getImmoRadarTemplateForRow(row) {
      const contact = state.contacts.find(c => c.id === row.id) || {};
      const anrede = (contact.vorname || '').trim() ? `Hallo ${contact.vorname},` : 'Hallo,';
      const tone = state.settings.immoTemplateTone || 'consultative';
      const openerMap = {
        consultative: 'ich habe mir Ihr aktuelles Immobilienmarketing angesehen und sehe kurzfristig Potenzial.',
        direct: 'ich melde mich mit einem konkreten Vorschlag zur Lead-Generierung fuer Ihr Team.',
        friendly: 'ich hoffe, bei Ihnen laeuft alles gut - ich habe eine Idee, die zu Ihrem Vertrieb passen koennte.'
      };
      const opener = openerMap[tone] || openerMap.consultative;
      const cta = row.segment === 'hot'
        ? 'Haben Sie morgen 15 Minuten fuer einen schnellen Austausch?'
        : 'Ist ein kurzer Austausch in den naechsten Tagen interessant?';

      return `${anrede}\n\n${opener}\n\nFuer ${row.company} sehe ich speziell in ${row.city || 'Ihrer Region'} Chancen, mehr qualifizierte Erstgespraeche ueber LinkedIn und Followups zu erzeugen.\n\nWenn Sie moechten, zeige ich Ihnen kurz den Ablauf und zwei konkrete Hebel aus vergleichbaren Projekten.\n\n${cta}\n\nBeste Gruesse`;
    }

    function updateImmoRadarApiIndicator() {
      const dot = document.getElementById('irApiDot');
      const text = document.getElementById('irApiText');
      if (!dot || !text) return;
      const hasEndpoint = Boolean((state.settings.commBridgeUrl || '').trim());
      const hasKey = Boolean((state.settings.immoApiKey || state.settings.commBridgeToken || '').trim());
      if (hasEndpoint && hasKey) {
        dot.classList.add('ok');
        text.textContent = 'API verbunden';
      } else if (hasEndpoint || hasKey) {
        dot.classList.remove('ok');
        text.textContent = 'API teilweise konfiguriert';
      } else {
        dot.classList.remove('ok');
        text.textContent = 'API nicht konfiguriert';
      }
    }

    function openImmoRadarApiModal() {
      const modal = document.getElementById('irApiModal');
      if (!modal) return;
      const bridgeEl = document.getElementById('irApiBridgeUrl');
      const tokenEl = document.getElementById('irApiToken');
      const toneEl = document.getElementById('irTemplateTone');
      if (bridgeEl) bridgeEl.value = state.settings.commBridgeUrl || '';
      if (tokenEl) tokenEl.value = state.settings.immoApiKey || state.settings.commBridgeToken || '';
      if (toneEl) toneEl.value = state.settings.immoTemplateTone || 'consultative';
      modal.classList.add('show');
    }

    function closeImmoRadarApiModal() {
      document.getElementById('irApiModal')?.classList.remove('show');
    }

    function saveImmoRadarApiConfig() {
      const bridge = document.getElementById('irApiBridgeUrl')?.value.trim() || '';
      const token = document.getElementById('irApiToken')?.value || '';
      const tone = document.getElementById('irTemplateTone')?.value || 'consultative';

      state.settings.commBridgeUrl = bridge;
      state.settings.commBridgeToken = token;
      state.settings.immoApiKey = token;
      state.settings.immoTemplateTone = tone;

      const settingsBridge = document.getElementById('settingsCommBridgeUrl');
      if (settingsBridge) settingsBridge.value = bridge;
      const settingsToken = document.getElementById('settingsCommBridgeToken');
      if (settingsToken) settingsToken.value = token;

      saveSettings();
      updateImmoRadarApiIndicator();
      renderImmoRadar();
      closeImmoRadarApiModal();
      showToast('✅ ImmoRadar API gespeichert');
    }

    function copyImmoRadarTemplate(contactId) {
      const rows = getImmoRadarRows();
      const row = rows.find(r => r.id === contactId);
      if (!row) return;
      const text = state.immoRadar.generatedTemplates?.[contactId] || getImmoRadarTemplateForRow(row);
      navigator.clipboard.writeText(text)
        .then(() => showToast('📋 Template kopiert'))
        .catch(() => showToast('❌ Kopieren fehlgeschlagen'));
    }

    async function generateImmoTemplateViaBridge(contactId) {
      const row = getImmoRadarRows().find(r => r.id === contactId);
      if (!row) return;
      const endpoint = (state.settings.commBridgeUrl || '').trim();
      if (!endpoint) {
        showToast('❌ Kein Bridge Endpoint konfiguriert');
        return;
      }

      state.immoRadar.generatingId = contactId;
      renderImmoRadar();

      try {
        const payload = {
          action: 'generate_template',
          module: 'immoradar',
          tone: state.settings.immoTemplateTone || 'consultative',
          contactId,
          context: {
            name: row.name,
            company: row.company,
            city: row.city,
            segment: row.segment,
            score: row.score,
            status: row.status,
            pipeline: row.pipeline
          }
        };

        const result = await sendMailViaBridge(payload);
        const generated = result?.template || result?.body || result?.text || result?.content || result?.message || '';
        if (!generated || typeof generated !== 'string') {
          throw new Error('Bridge lieferte kein Template zurück');
        }

        state.immoRadar.generatedTemplates[contactId] = generated.trim();
        showToast('✅ AI Template generiert');
      } catch (error) {
        console.error('Immo template generation error:', error);
        const fallback = getImmoRadarTemplateForRow(row);
        state.immoRadar.generatedTemplates[contactId] = fallback;
        showToast('⚠️ Bridge fehlgeschlagen - Fallback Template verwendet');
      } finally {
        state.immoRadar.generatingId = null;
        renderImmoRadar();
      }
    }

    function markImmoRadarLioToday(contactId) {
      const contact = state.contacts.find(c => c.id === contactId);
      if (!contact) return;
      contact.status = 'lioutboundtoday';
      contact.outreachStatus = 'outreachtoday';
      contact.source = 'linkedin';
      contact.updatedAt = new Date().toISOString();
      saveContacts();
      renderKontakte();
      renderAnalytics();
      renderImmoRadar();
      showToast('✅ Als LIO Today markiert');
    }

    function setImmoRadarPage(page) {
      const p = Math.max(1, Number(page) || 1);
      state.immoRadar.page = p;
      renderImmoRadar();
    }

    function getFilteredImmoRadarRows() {
      const rows = getImmoRadarRows();
      let filtered = rows.slice();

      const q = (state.immoRadar.query || '').trim().toLowerCase();
      if (q) {
        filtered = filtered.filter(r => `${r.name} ${r.company} ${r.city}`.toLowerCase().includes(q));
      }
      if (state.immoRadar.segment !== 'all') {
        filtered = filtered.filter(r => r.segment === state.immoRadar.segment);
      }
      if (state.immoRadar.status !== 'all') {
        filtered = filtered.filter(r => r.status === state.immoRadar.status);
      }

      const sortBy = state.immoRadar.sortBy || 'score';
      const desc = state.immoRadar.sortDesc === true;
      filtered.sort((a, b) => {
        let res = 0;
        if (sortBy === 'score') res = a.score - b.score;
        if (sortBy === 'name') res = a.name.localeCompare(b.name);
        if (sortBy === 'company') res = a.company.localeCompare(b.company);
        if (sortBy === 'lastTouch') res = a.lastTouchTs - b.lastTouchTs;
        return desc ? -res : res;
      });

      return filtered;
    }

    function markFilteredImmoRadarLioToday() {
      const filtered = getFilteredImmoRadarRows();
      if (!filtered.length) {
        showToast('❌ Keine gefilterten Kontakte vorhanden');
        return;
      }
      let count = 0;
      filtered.forEach(row => {
        const c = state.contacts.find(x => x.id === row.id);
        if (!c) return;
        c.status = 'lioutboundtoday';
        c.outreachStatus = 'outreachtoday';
        c.source = 'linkedin';
        c.updatedAt = new Date().toISOString();
        count += 1;
      });
      saveContacts();
      renderKontakte();
      renderAnalytics();
      renderImmoRadar();
      showToast(`✅ ${count} Kontakte als LIO Today markiert`);
    }

    function renderImmoRadar() {
      const body = document.getElementById('irTableBody');
      const pipeline = document.getElementById('irPipeline');
      const pagination = document.getElementById('irPagination');
      if (!body || !pipeline || !pagination) return;

      const rows = getImmoRadarRows();
      const allCount = rows.length;
      const hotCount = rows.filter(r => r.segment === 'hot').length;
      const warmCount = rows.filter(r => r.segment === 'warm').length;
      const coolCount = rows.filter(r => r.segment === 'cool').length;
      const linkedinCount = rows.filter(r => r.source === 'linkedin').length;
      const wonCount = rows.filter(r => r.status === 'won' || r.pipeline === 'won').length;

      const setText = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = String(val);
      };
      setText('irKpiTotal', allCount);
      setText('irKpiHot', hotCount);
      setText('irKpiWarm', warmCount);
      setText('irKpiCool', coolCount);
      setText('irKpiLinkedin', linkedinCount);
      setText('irKpiWon', wonCount);

      const filtered = getFilteredImmoRadarRows();

      const totalFiltered = filtered.length;
      const pageSize = Number(state.immoRadar.pageSize || 12);
      const pageCount = Math.max(1, Math.ceil(totalFiltered / pageSize));
      if (state.immoRadar.page > pageCount) state.immoRadar.page = pageCount;
      const currentPage = Math.max(1, state.immoRadar.page || 1);
      const start = (currentPage - 1) * pageSize;
      const pageRows = filtered.slice(start, start + pageSize);

      if (!pageRows.length) {
        body.innerHTML = '<tr><td colspan="8" style="text-align:center; color:var(--muted); padding:16px;">Keine Treffer für die aktuelle Auswahl</td></tr>';
      } else {
        body.innerHTML = pageRows.map(r => {
          const lastTouch = r.lastTouchTs ? new Date(r.lastTouchTs).toLocaleDateString('de-CH') : '–';
          const expanded = state.immoRadar.expandedId === r.id;
          const template = state.immoRadar.generatedTemplates?.[r.id] || getImmoRadarTemplateForRow(r);
          const isGenerating = state.immoRadar.generatingId === r.id;
          return `
            <tr>
              <td><strong>${r.name}</strong><div class="ir-muted">${r.company}</div></td>
              <td><span class="ir-score ${r.segment}">${r.score}</span></td>
              <td>${r.segment.toUpperCase()}</td>
              <td><span class="ir-strength-dot" style="background:${r.strength.color};"></span>${r.strength.label}</td>
              <td>${getStatusLabel(r.status)}</td>
              <td>${r.pipeline || '–'}</td>
              <td>${lastTouch}</td>
              <td style="display:flex; gap:6px; flex-wrap:wrap;">
                <button class="btn" onclick="openEditModal('${r.id}')" style="padding:4px 8px; font-size:11px;">Oeffnen</button>
                <button class="btn" onclick="markImmoRadarLioToday('${r.id}')" style="padding:4px 8px; font-size:11px; border-color:#3b82f6; color:#3b82f6;">LIO Today</button>
                <button class="btn" onclick="state.immoRadar.expandedId = state.immoRadar.expandedId === '${r.id}' ? null : '${r.id}'; renderImmoRadar();" style="padding:4px 8px; font-size:11px;">${expanded ? 'Weniger' : 'Details'}</button>
              </td>
            </tr>
            ${expanded ? `
              <tr class="ir-detail-row">
                <td colspan="8">
                  <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                    <div>
                      <div class="ir-muted"><strong>Kontakt-Kontext</strong></div>
                      <div style="font-size:12px; margin-top:6px;">Segment: ${r.segment.toUpperCase()} · Score: ${r.score} · Status: ${getStatusLabel(r.status)}</div>
                      <div style="font-size:12px; margin-top:4px;">Pipeline: ${r.pipeline || '–'} · Last Touch: ${lastTouch}</div>
                    </div>
                    <div>
                      <div class="ir-muted"><strong>LinkedIn Nachricht (Template)</strong></div>
                      <div class="ir-template-box">${template}</div>
                      <div style="display:flex; gap:8px; margin-top:8px;">
                        <button class="btn" onclick="generateImmoTemplateViaBridge('${r.id}')" ${isGenerating ? 'disabled' : ''}>${isGenerating ? '<span class="ir-spinner"></span>Generiere...' : '✨ AI Template'}</button>
                        <button class="btn" onclick="copyImmoRadarTemplate('${r.id}')">📋 Kopieren</button>
                        <button class="btn" onclick="openContactMail('${r.id}', 'immoradar-template')">✉️ Mail oeffnen</button>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            ` : ''}
          `;
        }).join('');
      }

      const from = totalFiltered === 0 ? 0 : start + 1;
      const to = Math.min(start + pageSize, totalFiltered);
      pagination.innerHTML = `
        <button class="btn" onclick="setImmoRadarPage(${Math.max(1, currentPage - 1)})" ${currentPage <= 1 ? 'disabled' : ''} style="padding:4px 10px; font-size:11px;">←</button>
        <span class="ir-muted">${from}-${to} / ${totalFiltered} · Seite ${currentPage}/${pageCount}</span>
        <button class="btn" onclick="setImmoRadarPage(${Math.min(pageCount, currentPage + 1)})" ${currentPage >= pageCount ? 'disabled' : ''} style="padding:4px 10px; font-size:11px;">→</button>
      `;

      const cols = [
        { id: 'prospecting', label: 'Prospecting' },
        { id: 'qualified', label: 'Qualified' },
        { id: 'meeting', label: 'Meeting' },
        { id: 'proposal', label: 'Proposal' },
        { id: 'won', label: 'Won' }
      ];

      pipeline.innerHTML = cols.map(col => {
        const items = filtered.filter(r => r.pipeline === col.id).slice(0, 4);
        const itemsHtml = items.length
          ? items.map(it => `<div class="ir-pipe-item">${it.name}<br><span class="ir-muted">${it.company}</span></div>`).join('')
          : '<div class="ir-muted">Keine Einträge</div>';
        const count = filtered.filter(r => r.pipeline === col.id).length;
        return `
          <div class="ir-pipe-col">
            <div class="ir-pipe-title"><span>${col.label}</span><span>${count}</span></div>
            ${itemsHtml}
          </div>
        `;
      }).join('');

      const renderBars = (containerId, rowsData, defs) => {
        const el = document.getElementById(containerId);
        if (!el) return;
        const total = rowsData.length || 1;
        el.innerHTML = defs.map(d => {
          const count = rowsData.filter(d.filter).length;
          const pct = Math.round((count / total) * 100);
          return `
            <div class="ir-bar-row">
              <span>${d.label}</span>
              <div class="ir-bar-track"><div class="ir-bar-fill" style="width:${pct}%; background:${d.color};"></div></div>
              <strong>${count}</strong>
            </div>
          `;
        }).join('');
      };

      renderBars('irChartSegments', filtered, [
        { label: 'Hot', color: 'linear-gradient(90deg,#f97316,#fb923c)', filter: r => r.segment === 'hot' },
        { label: 'Warm', color: 'linear-gradient(90deg,#f59e0b,#fbbf24)', filter: r => r.segment === 'warm' },
        { label: 'Cool', color: 'linear-gradient(90deg,#3b82f6,#60a5fa)', filter: r => r.segment === 'cool' },
        { label: 'Cold', color: 'linear-gradient(90deg,#6b7280,#9ca3af)', filter: r => r.segment === 'cold' }
      ]);

      renderBars('irChartPipeline', filtered, [
        { label: 'Prospecting', color: 'linear-gradient(90deg,#6b7280,#9ca3af)', filter: r => r.pipeline === 'prospecting' },
        { label: 'Qualified', color: 'linear-gradient(90deg,#3b82f6,#60a5fa)', filter: r => r.pipeline === 'qualified' },
        { label: 'Meeting', color: 'linear-gradient(90deg,#0ea5e9,#22d3ee)', filter: r => r.pipeline === 'meeting' },
        { label: 'Proposal', color: 'linear-gradient(90deg,#f59e0b,#fbbf24)', filter: r => r.pipeline === 'proposal' },
        { label: 'Won', color: 'linear-gradient(90deg,#10b981,#34d399)', filter: r => r.pipeline === 'won' }
      ]);

      updateImmoRadarApiIndicator();
    }

    function exportCalls() {
      const dateRange = getAnalyticsDateRange();
      if (dateRange?.invalid) return;

      const headers = [
        'Datum', 'Zeit', 'Vorname', 'Nachname', 'Firma', 
        'Telefon Ansprechpartner', 'Email Ansprechpartner',
        'Telefon Unternehmen', 'Email Unternehmen', 
        'Rolle', 'Strasse', 'Ortschaft', 'Region',
        'Status', 'Kanal', 'Notizen', 'Tags'
      ];

      let callLog = state.callLog;
      if (dateRange) {
        callLog = state.callLog.filter(x => {
          const ts = new Date(x.timestamp);
          return ts >= dateRange.from && ts <= dateRange.to;
        });
      }

      const rows = callLog.map(x => {
        // Finde den vollständigen Kontakt
        const contact = state.contacts.find(c => c.id === x.contactId) || {};
        const ts = x.timestamp ? new Date(x.timestamp) : null;
        
        // Hole Tags für diesen Kontakt
        const contactTags = state.tags
          .filter(tag => (contact.tags || []).includes(tag.id))
          .map(tag => tag.name)
          .join('; ');
        
        return [
          x.date || (ts ? ts.toISOString().split('T')[0] : ''),
          ts ? ts.toLocaleTimeString('de-CH') : '',
          x.vorname || contact.vorname || '',
          x.nachname || contact.nachname || '',
          x.firma || contact.firma || '',
          contact.telefon || '',
          contact.email || '',
          contact.unternehmenstelefon || '',
          contact.unternehmensemail || '',
          contact.rolle || '',
          contact.strasse || '',
          contact.ortschaft || '',
          contact.region || '',
          x.status,
          'calls',
          x.notes || '',
          contactTags
        ];
      });
      
      const csv = [headers, ...rows].map(r => r.map(v => `"${String(v || '').replaceAll('"', '""')}"`).join(';')).join('\r\n');
      const _csvBytes3 = new TextEncoder().encode(csv);
      const blob = new Blob([new Uint8Array([0xEF,0xBB,0xBF]), _csvBytes3], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.setAttribute('href', URL.createObjectURL(blob));
      link.setAttribute('download', `calls_${new Date().toISOString().split('T')[0]}.csv`);
      link.click();
      showToast('📥 Calls exportiert!');
    }

    // FIREBASE AUTH
    const firebase_config = {
      apiKey: "AIzaSyBDFNel-aihRzmfOn_bEYuhbnp2euiXDF0",
      authDomain: "powerhour-8890a.firebaseapp.com",
      databaseURL: "https://powerhour-8890a-default-rtdb.europe-west1.firebasedatabase.app",
      projectId: "powerhour-8890a",
      storageBucket: "powerhour-8890a.firebasestorage.app",
      messagingSenderId: "533667633971",
      appId: "1:533667633971:web:670bd8a42e9a3eb0d7bc46"
    };

    // Initialize will be added in script module tag below

    function initTheme() {
      const saved = localStorage.getItem('phtheme');
      const theme = saved || 'light';
      setTheme(theme);
    }

    function setTheme(theme) {
      const html = document.documentElement;
      if (theme === 'dark') {
        html.setAttribute('data-theme', 'dark');
        document.getElementById('btnThemeToggle').textContent = '🌙';
      } else {
        html.removeAttribute('data-theme');
        document.getElementById('btnThemeToggle').textContent = '☀️';
      }
      localStorage.setItem('phtheme', theme);
    }

    function toggleTheme() {
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      const next = current === 'dark' ? 'light' : 'dark';
      setTheme(next);
    }

    function setPipelineTab(tabId) {
      document.querySelectorAll('[data-pipeline-panel]').forEach(panel => {
        panel.style.display = panel.dataset.pipelinePanel === tabId ? 'block' : 'none';
      });
      document.querySelectorAll('[data-pipeline-tab]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.pipelineTab === tabId);
      });
    }

    function setSessionMode(mode) {
      state.currentSessionMode = mode;
      document.querySelectorAll('[data-session-mode]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.sessionMode === mode);
      });

      const isVr = mode === 'vr';
      const vrPanel   = document.getElementById('vrSessionPanel');
      const stdStart  = document.getElementById('btnStartUnifiedSession');
      const stdInfo   = document.querySelector('#session .two-col');

      if (vrPanel)  vrPanel.style.display  = isVr ? '' : 'none';
      if (stdStart) stdStart.closest('.two-col').style.display = isVr ? 'none' : '';

      if (isVr) {
        VrSession.updateInfo();
        return; // VR has its own logic, skip standard session mode setup
      }

      renderSessionResultButtons(mode);
      updateSessionContactPersonVisibility(mode);

      const info = document.getElementById('sessionInfo');
      if (info && (!SessionEngine.contacts.length || document.getElementById('activeSession')?.style.display !== 'block')) {
        const label = mode === 'mail' ? 'Mail' : mode === 'outreach' ? 'LinkedIn' : mode === 'followup' ? 'Followup' : 'Anruf';
        info.textContent = `Modus: ${label} – Session starten, um Kontakte zu laden`;
      }

      const active = document.getElementById('activeSession');
      const date = document.getElementById('sessionDate')?.value;
      if (active && active.style.display === 'block' && date) {
        SessionEngine.start(mode, date);
      }
    }

    function renderSessionResultButtons(mode) {
      const container = document.getElementById('sessionResultButtons');
      if (!container) return;
      const map = {
        call: [
          { value: 'called', label: '☎️ Angerufen' },
          { value: 'preselected', label: '✅ Vorselektiert' },
          { value: 'mailsend', label: '📧 Mail senden' },
          { value: 'response', label: '💬 Antwort' },
          { value: 'notreached', label: '📵 Nicht erreicht' },
          { value: 'nointerest', label: '🚫 Kein Interesse' },
          { value: 'won', label: '⭐ Gewonnen' }
        ],
        mail: [
          { value: 'mail_sent', label: '✉️ Mail gesendet' },
          { value: 'followup', label: '🔄 Followup' },
          { value: 'nointerest', label: '🚫 Kein Interesse' }
        ],
        followup: [
          { value: 'won', label: '🏆 Gewonnen / Termin' },
          { value: 'called', label: '☎️ FU Angerufen' },
          { value: 'mailsend', label: '📧 FU Mail senden' },
          { value: 'followup', label: '🔄 Nächster Followup (45/10/7d)' },
          { value: 'notreached', label: '📵 Nicht erreicht' },
          { value: 'nokeinbedarf', label: '💤 Kein Bedarf momentan' },
          { value: 'nointerest', label: '🚫 Kein Interesse' }
        ],
        outreach: [
          { value: 'request', label: '🤝 Anfrage' },
          { value: 'message', label: '💬 Nachricht' },
          { value: 'followup', label: '🔁 Follow-up' },
          { value: 'reply', label: '✅ Antwort' },
          { value: 'nointerest', label: '🚫 Kein Interesse' }
        ]
      };
      const buttons = (map[mode] || map.call)
        .map(item => `<button class="btn" data-session-result="${item.value}">${item.label}</button>`)
        .join('');
      container.innerHTML = buttons;
      container.querySelectorAll('[data-session-result]').forEach(btn => {
        btn.addEventListener('click', () => {
          container.querySelectorAll('[data-session-result]').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        });
      });
    }

    function addNotesHistory(contact, text, status) {
      if (!text) return;
      if (!Array.isArray(contact.notesHistory)) {
        contact.notesHistory = [];
        if (contact.notes) {
          contact.notesHistory.push({
            text: contact.notes,
            timestamp: contact.updatedAt || contact.createdAt || new Date().toISOString(),
            status: contact.status || 'new'
          });
        }
      }
      contact.notesHistory.push({
        text,
        timestamp: new Date().toISOString(),
        status
      });
      contact.notes = text;
    }

    function getSessionContactPersonInput() {
      const first = document.getElementById('sessionPersonFirst')?.value.trim() || '';
      const last = document.getElementById('sessionPersonLast')?.value.trim() || '';
      const phone = document.getElementById('sessionPersonPhone')?.value.trim() || '';
      const email = document.getElementById('sessionPersonEmail')?.value.trim() || '';
      const role = document.getElementById('sessionPersonRole')?.value.trim() || '';
      const hasInput = Boolean(first || last || phone || email || role);
      return {
        first,
        last,
        phone,
        email,
        role,
        hasInput
      };
    }

    function getSessionPersonDisplayName(contact) {
      if (!contact) return '';
      const name = `${contact.vorname || ''} ${contact.nachname || ''}`.trim();
      if (name) return name;
      if (contact.email) return contact.email;
      if (contact.telefon) return contact.telefon;
      return 'Kontaktperson';
    }

    function buildSessionCompanyQueue(contacts) {
      const buckets = new Map();
      (contacts || []).forEach(contact => {
        const company = getCompanyForContact(contact) || getCompanyByName(contact.firma || '');
        const normalizedName = normalizeCompanyName(contact.firma || '');
        const key = company?.id
          ? `company:${company.id}`
          : (normalizedName ? `name:${normalizedName}` : `contact:${contact.id}`);
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key).push(contact);
      });

      const queue = [];
      buckets.forEach(list => {
        if (!list.length) return;
        const primary = list.find(c => c.isPrimaryContact) || list[0];
        queue.push(primary);
      });

      return queue.sort((a, b) => {
        const aCompany = (a.firma || '').toLowerCase();
        const bCompany = (b.firma || '').toLowerCase();
        if (aCompany && bCompany && aCompany !== bCompany) return aCompany.localeCompare(bCompany);
        return getSessionPersonDisplayName(a).localeCompare(getSessionPersonDisplayName(b));
      });
    }

    function toggleSessionPersonFields(editable) {
      ['sessionPersonFirst', 'sessionPersonLast', 'sessionPersonPhone', 'sessionPersonEmail', 'sessionPersonRole']
        .forEach(id => {
          const el = document.getElementById(id);
          if (!el) return;
          el.readOnly = !editable;
          el.style.opacity = editable ? '1' : '0.9';
        });
    }

    function clearSessionPersonFields() {
      ['sessionPersonFirst', 'sessionPersonLast', 'sessionPersonPhone', 'sessionPersonEmail', 'sessionPersonRole']
        .forEach(id => {
          const el = document.getElementById(id);
          if (el) el.value = '';
        });
    }

    function fillSessionPersonFields(contact) {
      const first = document.getElementById('sessionPersonFirst');
      const last = document.getElementById('sessionPersonLast');
      const phone = document.getElementById('sessionPersonPhone');
      const email = document.getElementById('sessionPersonEmail');
      const role = document.getElementById('sessionPersonRole');
      if (first) first.value = contact?.vorname || '';
      if (last) last.value = contact?.nachname || '';
      if (phone) phone.value = contact?.telefon || '';
      if (email) email.value = contact?.email || '';
      if (role) role.value = contact?.rolle || '';
    }

    function renderSessionPersonSelect(sessionContact, selectedValue = null) {
      const select = document.getElementById('sessionPersonSelect');
      if (!select || !sessionContact) return;

      const company = getCompanyForContact(sessionContact) || getCompanyByName(sessionContact.firma || '');
      const companyName = company?.name || sessionContact.firma || '';
      const companyContacts = getCompanyContactsByName(companyName, company?.id)
        .filter(c => c && c.id)
        .sort((a, b) => getSessionPersonDisplayName(a).localeCompare(getSessionPersonDisplayName(b)));

      const seen = new Set();
      const uniqueContacts = companyContacts.filter(c => {
        if (seen.has(c.id)) return false;
        seen.add(c.id);
        return true;
      });

      if (!uniqueContacts.some(c => c.id === sessionContact.id)) {
        uniqueContacts.unshift(sessionContact);
      }

      const options = uniqueContacts.map(c => {
        const isCurrent = c.id === sessionContact.id;
        const primary = c.isPrimaryContact ? ' ⭐' : '';
        const label = `${getSessionPersonDisplayName(c)}${isCurrent ? ' (Session-Kontakt)' : ''}${primary}`;
        return `<option value="${c.id}">${label}</option>`;
      });
      options.push('<option value="__new__">+ Neue Kontaktperson erfassen</option>');
      select.innerHTML = options.join('');

      const valueToSet = selectedValue && [...select.options].some(o => o.value === selectedValue)
        ? selectedValue
        : (sessionContact.id || '__new__');
      select.value = valueToSet;

      if (select.value === '__new__') {
        clearSessionPersonFields();
        toggleSessionPersonFields(true);
      } else {
        const selectedContact = state.contacts.find(c => c.id === select.value) || sessionContact;
        fillSessionPersonFields(selectedContact);
        toggleSessionPersonFields(false);
      }
    }

    function addSessionNoteToCompany(baseContact, personContact, mode, status, notes, timestamp) {
      const company = getCompanyForContact(baseContact)
        || getCompanyByName(baseContact?.firma || '')
        || findOrCreateCompanyByName(baseContact?.firma || '');
      if (!company) return;

      ensureCompanyStructure(company);
      if (!Array.isArray(company.notesHistory)) {
        company.notesHistory = [];
      }

      const modeLabel = mode === 'mail' ? 'Mail' : mode === 'followup' ? 'Followup' : mode === 'outreach' ? 'LinkedIn' : 'Call';
      const personName = getSessionPersonDisplayName(personContact || baseContact);
      const textBody = notes || `${modeLabel}: ${getStatusLabel(status)}`;
      const text = `[${personName}] ${textBody}`;

      company.notesHistory.push({
        text,
        timestamp,
        status,
        mode,
        contactId: personContact?.id || baseContact?.id || null,
        contactName: personName,
        rawText: notes || ''
      });
      company.notes = text;
      company.updatedAt = timestamp;
      saveCompanies();
    }

    function resolveSessionPersonContact(originalContact, timestamp) {
      const select = document.getElementById('sessionPersonSelect');
      const selectedValue = select?.value || originalContact.id;
      if (selectedValue && selectedValue !== '__new__') {
        const selectedContact = state.contacts.find(c => c.id === selectedValue);
        if (selectedContact) return selectedContact;
      }

      const input = getSessionContactPersonInput();
      if (!input.hasInput) {
        showToast('❌ Bitte Kontaktperson auswaehlen oder neue Kontaktperson erfassen');
        return null;
      }

      const draft = {
        vorname: input.first,
        nachname: input.last,
        firma: originalContact.firma || '',
        telefon: input.phone,
        email: input.email
      };
      const validationError = validateContactData(draft, { requireCompany: true });
      if (validationError) {
        showToast(`❌ ${validationError}`);
        return null;
      }

      const duplicate = findDuplicateContact(draft);
      if (duplicate) {
        showToast('ℹ️ Bestehende Kontaktperson verwendet');
        return duplicate;
      }

      const created = createContactFromSessionPerson(originalContact, input, timestamp);
      created.isPrimaryContact = false;
      state.contacts.push(created);
      return created;
    }

    function createContactFromSessionPerson(originalContact, input, timestamp) {
      return {
        id: Math.random().toString(36).substr(2, 9),
        vorname: input.first || '',
        nachname: input.last || '',
        firma: originalContact.firma || '',
        companyId: originalContact.companyId || null,
        companyBranchId: originalContact.companyBranchId || null,
        telefon: input.phone || '',
        email: input.email || '',
        linkedin: '',
        unternehmenstelefon: originalContact.unternehmenstelefon || '',
        unternehmensemail: originalContact.unternehmensemail || '',
        rolle: input.role || '',
        strasse: originalContact.strasse || '',
        ortschaft: originalContact.ortschaft || '',
        region: originalContact.region || '',
        status: 'new',
        notes: '',
        source: originalContact.source || 'calls',
        dealStage: null,
        dealValue: null,
        dealProbability: null,
        dealCloseDate: null,
        tags: Array.isArray(originalContact.tags) ? originalContact.tags.slice() : [],
        createdAt: timestamp,
        updatedAt: timestamp,
        notesHistory: []
      };
    }

    function applyStatusAndNotes(contact, status, notes, timestamp) {
      const previousStatus = contact.status || 'new';
      contact.status = status;
      contact.updatedAt = timestamp;
      addNotesHistory(contact, notes, status);
      // Auto-advance phase based on session action
      if (status === 'mailsend' || status === 'mail_sent') {
        if (!contact.phase || contact.phase === 'coldcall') contact.phase = 'mail';
        contact.emailSentDate = timestamp.split('T')[0];
      }
      if (status === 'followup') {
        // Followup cadence: FU1 +45d, FU2 +10d, FU3 +7d
        if (!contact.phase || contact.phase === 'coldcall' || contact.phase === 'mail') {
          contact.phase = 'followup1';
        } else if (contact.phase === 'followup1') {
          contact.phase = 'followup2';
        } else if (contact.phase === 'followup2') {
          contact.phase = 'followup3';
        } else {
          contact.phase = 'followup3';
        }
        const followupDays = {
          followup1: 45,
          followup2: 10,
          followup3: 7
        };
        const due = new Date(timestamp);
        due.setDate(due.getDate() + (followupDays[contact.phase] || 45));
        contact.followupDueDate = due.toISOString().split('T')[0];
      }
      if (status === 'called' || status === 'notreached' || status === 'preselected') {
        if (!contact.phase) contact.phase = 'coldcall';
      }
      // nokeinbedarf: reset followupDueDate to 90 days out (try again later)
      if (status === 'nokeinbedarf') {
        const due = new Date(timestamp);
        due.setDate(due.getDate() + 90);
        contact.followupDueDate = due.toISOString().split('T')[0];
      }

      if (previousStatus !== status) {
        logTimelineEvent({
          contactId: contact.id,
          leadId: contact.leadId || null,
          companyId: contact.companyId || null,
          type: 'status_change',
          status: 'system',
          note: `${getStatusLabel(previousStatus)} -> ${getStatusLabel(status)}`,
          channel: 'system',
          timestamp
        });
      }
    }

    function updateSessionContactPersonVisibility(mode) {
      const container = document.getElementById('sessionContactPerson');
      if (!container) return;
      container.style.display = 'block';
    }

    const SessionEngine = {
      mode: 'call',
      contacts: [],
      currentIdx: 0,
      date: null,
      selectedPersonId: null,

      start(mode, date) {
        this.mode = mode || 'call';
        this.date = date || new Date().toISOString().split('T')[0];
        let sessionContacts = [];
        if (this.mode === 'call') {
          sessionContacts = state.contacts.filter(c => c.status === 'callstoday');
        } else if (this.mode === 'mail') {
          sessionContacts = state.contacts.filter(c => c.status === 'mailsend');
        } else if (this.mode === 'followup') {
          sessionContacts = state.contacts.filter(c => c.status === 'followuptoday');
        } else {
          sessionContacts = state.contacts.filter(c => c.status === 'lioutboundtoday' || c.outreachStatus === 'outreachtoday');
        }
        this.contacts = buildSessionCompanyQueue(sessionContacts);
        this.currentIdx = 0;
        this.selectedPersonId = null;
        updateSessionContactPersonVisibility(this.mode);
        const info = document.getElementById('sessionInfo');
        if (info) {
          info.textContent = this.contacts.length
            ? `${this.contacts.length} Firmen markiert (${this.mode})`
            : 'Keine Kontakte für diesen Modus';
        }
        const active = document.getElementById('activeSession');
        if (active) active.style.display = this.contacts.length ? 'block' : 'none';
        this.loadCurrent();
      },

      jumpTo(n) {
        const idx = Number(n) - 1;
        if (isNaN(idx) || idx < 0 || idx >= this.contacts.length) {
          showToast(`❌ Gültige Nummer zwischen 1 und ${this.contacts.length} eingeben`);
          return;
        }
        this.currentIdx = idx;
        this.loadCurrent();
        const inp = document.getElementById('sessionJumpInput');
        if (inp) inp.value = '';
        showToast(`➡️ Firma ${idx + 1} von ${this.contacts.length}`);
      },

      loadCurrent() {
        const contact = this.contacts[this.currentIdx];
        if (!contact) return;

        const selectContactId = this.selectedPersonId || contact.id;
        const selected = state.contacts.find(c => c.id === selectContactId) || contact;

        // Top: always company name; sub-line: selected person
        document.getElementById('sessionContactName').textContent = contact.firma || '(Firma unbekannt)';
        document.getElementById('sessionContactCompany').textContent = `Ansprechperson: ${getSessionPersonDisplayName(selected)}`;
        const phaseLabelsSession = { coldcall: 'Phase 1 Cold Call', mail: 'Phase 2 Mail', followup1: 'Phase 3 FU1', followup2: 'Phase 4 FU2', followup3: 'Phase 5 FU3' };
        const phaseInfo = contact.phase ? ` | ${phaseLabelsSession[contact.phase] || contact.phase}` : '';
        const ratingInfo = contact.rating ? ` | ${'★'.repeat(contact.rating)}` : '';
        document.getElementById('sessionContactStatus').textContent = getStatusLabel(contact.status || 'new') + phaseInfo + ratingInfo;
        // Details: always from selected person's own fields
        document.getElementById('sessionContactDetails').textContent = [
          selected.telefon && '📞 ' + selected.telefon,
          selected.email   && '📧 ' + selected.email,
          selected.linkedin && '💼 ' + selected.linkedin,
          contact.ortschaft && '📍 ' + contact.ortschaft
        ].filter(Boolean).join(' | ');

        document.getElementById('sessionNotes').value = '';
        document.getElementById('sessionProgress').textContent = `${this.currentIdx + 1} / ${this.contacts.length}`;
        // Update progress bar fill
        const _sPct = this.contacts.length > 1 ? Math.round((this.currentIdx / (this.contacts.length - 1)) * 100) : 100;
        const _sFill = document.getElementById('sessionProgressFill');
        if (_sFill) _sFill.style.width = _sPct + '%';
        this.renderQueue();
        renderSessionResultButtons(this.mode);
        renderSessionPersonSelect(contact, this.selectedPersonId || contact.id);
        this.selectedPersonId = document.getElementById('sessionPersonSelect')?.value || contact.id;
        const openMailBtn = document.getElementById('btnSessionOpenMail');
        if (openMailBtn) {
          const selectedPerson = state.contacts.find(c => c.id === this.selectedPersonId) || contact;
          const hasMail = Boolean(normalizeEmail(selectedPerson.email || ''));
          const canOpenMail = hasMail && this.mode !== 'outreach';
          openMailBtn.style.display = canOpenMail ? 'inline-flex' : 'none';
          openMailBtn.textContent = this.mode === 'followup' ? '✉️ FU Mail öffnen' : '✉️ Mail öffnen';
        }
        // Load existing rating
        const existingRating = contact.rating || 0;
        document.getElementById('sessionRating').value = existingRating;
        renderSessionStars(existingRating);

      },

      saveAndNext() {
        const contact = this.contacts[this.currentIdx];
        if (!contact) return;
        const resultBtn = document.querySelector('#sessionResultButtons .active');
        if (!resultBtn) {
          showToast('❌ Bitte Ergebnis auswählen');
          return;
        }
        const result = resultBtn.dataset.sessionResult;
        const notes = document.getElementById('sessionNotes').value.trim();
        const timestamp = new Date().toISOString();
        let composeTarget = null;

        const originalContact = state.contacts.find(c => c.id === contact.id);
        if (!originalContact) return;
        // Save session star rating onto contact
        const sessionRating = parseInt(document.getElementById('sessionRating')?.value, 10) || 0;
        if (sessionRating > 0) originalContact.rating = sessionRating;
        const sessionPerson = resolveSessionPersonContact(originalContact, timestamp);
        if (!sessionPerson) return;
        this.selectedPersonId = sessionPerson.id || null;

        if (this.mode === 'call') {
          applyStatusAndNotes(originalContact, result, notes, timestamp);
          addSessionNoteToCompany(originalContact, sessionPerson, this.mode, result, notes, timestamp);

          if (result === 'mailsend') {
            composeTarget = normalizeEmail(sessionPerson.email || '') ? sessionPerson : originalContact;
          }

          state.callLog.push({
            id: Math.random().toString(36).substr(2, 9),
            date: this.date,
            contactId: sessionPerson.id || originalContact.id,
            vorname: sessionPerson.vorname || originalContact.vorname,
            nachname: sessionPerson.nachname || originalContact.nachname,
            firma: originalContact.firma,
            status: result,
            mode: this.mode,
            rating: sessionRating || 0,
            notes,
            timestamp
          });

          saveCallLog();
        } else if (this.mode === 'mail') {
          if (result === 'nointerest') {
            originalContact.status = 'nointerest';
          } else {
            originalContact.status = 'followup';
            originalContact.emailSentDate = this.date;
            if (!originalContact.phase || originalContact.phase === 'coldcall') originalContact.phase = 'mail';
            const due = new Date(timestamp);
            due.setDate(due.getDate() + 45);
            originalContact.followupDueDate = due.toISOString().split('T')[0];
            composeTarget = normalizeEmail(sessionPerson.email || '') ? sessionPerson : originalContact;
          }
          originalContact.updatedAt = timestamp;
          addNotesHistory(originalContact, notes, result === 'nointerest' ? 'nointerest' : 'mailsend');
          addSessionNoteToCompany(originalContact, sessionPerson, this.mode, result === 'nointerest' ? 'nointerest' : 'mailsend', notes, timestamp);
          state.callLog.push({
            id: Math.random().toString(36).substr(2, 9),
            date: this.date,
            contactId: sessionPerson.id || originalContact.id,
            vorname: sessionPerson.vorname || originalContact.vorname,
            nachname: sessionPerson.nachname || originalContact.nachname,
            firma: originalContact.firma,
            status: result === 'nointerest' ? 'nointerest' : 'mailsend',
            mode: this.mode,
            rating: sessionRating || 0,
            notes,
            timestamp
          });
          saveCallLog();
        } else if (this.mode === 'followup') {
          applyStatusAndNotes(originalContact, result, notes, timestamp);
          addSessionNoteToCompany(originalContact, sessionPerson, this.mode, result, notes, timestamp);
          if (result === 'mailsend') {
            composeTarget = normalizeEmail(sessionPerson.email || '') ? sessionPerson : originalContact;
          }
          state.callLog.push({
            id: Math.random().toString(36).substr(2, 9),
            date: this.date,
            contactId: sessionPerson.id || originalContact.id,
            vorname: sessionPerson.vorname || originalContact.vorname,
            nachname: sessionPerson.nachname || originalContact.nachname,
            firma: originalContact.firma,
            status: result,
            mode: this.mode,
            rating: sessionRating || 0,
            notes,
            timestamp
          });
          saveCallLog();
        } else {
          originalContact.outreachStatus = result;
          if (result === 'reply') {
            originalContact.status = 'response';
          } else if (result === 'nointerest') {
            originalContact.status = 'nointerest';
          } else {
            originalContact.status = 'lioutboundfollowup';
          }
          originalContact.source = 'linkedin';
          originalContact.updatedAt = timestamp;
          addNotesHistory(originalContact, notes, result);
          if (['request', 'message', 'followup'].includes(result)) {
            originalContact.liLastOutboundDate = timestamp;
          }
          addSessionNoteToCompany(originalContact, sessionPerson, this.mode, result, notes, timestamp);

          state.activities.push({
            id: Math.random().toString(36).substr(2, 9),
            contactId: sessionPerson.id || originalContact.id,
            type: result,
            status: result === 'reply' ? 'replied' : 'sent',
            templateId: null,
            note: notes,
            channel: 'linkedin',
            timestamp,
            date: this.date
          });
          saveActivities();
          state.callLog.push({
            id: Math.random().toString(36).substr(2, 9),
            date: this.date,
            contactId: sessionPerson.id || originalContact.id,
            vorname: sessionPerson.vorname || originalContact.vorname,
            nachname: sessionPerson.nachname || originalContact.nachname,
            firma: originalContact.firma,
            status: result,
            mode: this.mode,
            rating: sessionRating || 0,
            notes,
            timestamp
          });
          saveCallLog();

          if (originalContact.leadId) {
            const lead = getLeadById(originalContact.leadId);
            if (lead) {
              if (result === 'reply') lead.status = 'replied';
              if (['request', 'message', 'followup'].includes(result) && lead.status === 'new') {
                lead.status = 'contacted';
              }
              lead.updatedAt = new Date().toISOString();
              saveLeads();
            }
          }
        }

        if (composeTarget && shouldAutoComposeSessionMail(this.mode, result)) {
          openContactMail(composeTarget.id, 'session-auto');
        }

        saveContacts();
        renderKontakte();
        renderAnalytics();
        renderSessionLog();
        this.next();
      },

      prev() {
        if (this.currentIdx > 0) {
          this.currentIdx -= 1;
          this.loadCurrent();
        }
      },

      next() {
        const nextIdx = this.currentIdx + 1;
        if (nextIdx < this.contacts.length) {
          this.currentIdx = nextIdx;
          this.loadCurrent();
        } else {
          showToast('🎉 Session abgeschlossen!');
          const active = document.getElementById('activeSession');
          if (active) active.style.display = 'none';
        }
      },

      end() {
        const active = document.getElementById('activeSession');
        if (active) active.style.display = 'none';
      },

      openCurrentMail(source = 'session-manual') {
        const contact = this.contacts[this.currentIdx];
        if (!contact) return;
        const selected = state.contacts.find(c => c.id === this.selectedPersonId) || contact;
        openContactMail(selected.id, source);
      },

      renderQueue() {
        const el = document.getElementById('sessionQueueList');
        if (!el) return;
        el.innerHTML = this.contacts.map((c, i) => {
          const isActive = i === this.currentIdx;
          return `<div onclick="SessionEngine.jumpTo(${i + 1})" style="padding:7px 10px;border-radius:6px;cursor:pointer;margin-bottom:3px;
            background:${isActive ? 'rgba(245,158,11,.2)' : 'rgba(255,255,255,.04)'};
            border-left:3px solid ${isActive ? 'var(--accent)' : 'transparent'};">
            <div style="font-size:12px;font-weight:${isActive ? 700 : 400};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(c.firma || '–')}</div>
          </div>`;
        }).join('');
      }
    };

    // ─── VR SESSION ENGINE ──────────────────────────────────────────────

    function isVrSessionCandidate(contact) {
      if (!contact) return false;
      return ['vrtoday', 'vrfollowup1', 'vrfollowup2'].includes(contact.status || '');
    }

    const VrSession = {
      contacts: [],
      currentIdx: 0,
      sessionAnrede: 'Herr',
      sessionForm: 'Sie',
      linkedContactId: null,
      adHocMode: false,

      clearForm() {
        ['vrSVorname','vrSNachname','vrSFirma','vrSEmail','vrSTelefon','vrSProjekt','vrSWohnung','vrSNotes']
          .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
        const pEl = document.getElementById('vrSPunkte');
        if (pEl) pEl.value = '1';
        this.sessionAnrede = 'Herr';
        document.getElementById('vrSAnredeHerr')?.classList.add('active');
        document.getElementById('vrSAnredeFrau')?.classList.remove('active');
        renderVrSessionPreview();
      },

      start(contacts, adHoc) {
        this.contacts = (contacts || []).slice();
        this.adHocMode = Boolean(adHoc) || this.contacts.length === 0;
        this.currentIdx = 0;
        this.linkedContactId = null;
        this.updateInfo();
        const active = document.getElementById('vrActiveSession');
        if (active) active.style.display = 'block';
        if (this.contacts.length) {
          this.loadCurrent();
        } else {
          this.clearForm();
          const badge = document.getElementById('vrLinkedContactBadge');
          if (badge) badge.style.display = 'none';
          const searchEl = document.getElementById('vrContactSearch');
          if (searchEl) searchEl.value = '';
          const progEl = document.getElementById('vrSessionProgress');
          if (progEl) progEl.textContent = 'Freie Eingabe';
        }
      },

      updateInfo() {
        const info = document.getElementById('vrSessionInfo');
        if (!info) return;
        info.textContent = this.contacts.length
          ? `${this.contacts.length} Kontakte in der Queue – Session starten oder Kontakt direkt erfassen.`
          : 'Session starten und Kontakt direkt erfassen – oder per Batch aus der Kontaktliste laden.';
      },

      loadCurrent() {
        const contact = this.contacts[this.currentIdx];
        if (!contact) return;
        this.linkedContactId = contact.id;

        document.getElementById('vrSessionContactName').textContent =
          (`${contact.vorname || ''} ${contact.nachname || ''}`).trim() || '–';
        document.getElementById('vrSessionContactCompany').textContent = contact.firma || '–';
        document.getElementById('vrSessionContactMeta').textContent = [
          contact.telefon && '📞 ' + contact.telefon,
          contact.email && '📧 ' + contact.email,
          contact.ortschaft && '📍 ' + contact.ortschaft
        ].filter(Boolean).join(' | ') || '–';
        document.getElementById('vrSessionContactStatus').textContent =
          getStatusLabel(contact.status || 'new');
        document.getElementById('vrSessionProgress').textContent =
          `${this.currentIdx + 1} / ${this.contacts.length}`;
        // Progress bar fill
        const _vrPct = this.contacts.length > 1 ? Math.round((this.currentIdx / (this.contacts.length - 1)) * 100) : 100;
        const _vrFill = document.getElementById('vrSessionProgressFill');
        if (_vrFill) _vrFill.style.width = _vrPct + '%';
        this.renderQueue();

        const badge = document.getElementById('vrLinkedContactBadge');
        if (badge) badge.style.display = 'block';
        const searchEl = document.getElementById('vrContactSearch');
        if (searchEl) searchEl.value = '';
        const resultsEl = document.getElementById('vrContactSearchResults');
        if (resultsEl) resultsEl.style.display = 'none';

        // Pre-fill form
        document.getElementById('vrSVorname').value = contact.vorname || '';
        document.getElementById('vrSNachname').value = contact.nachname || '';
        document.getElementById('vrSFirma').value = contact.firma || '';
        document.getElementById('vrSEmail').value = contact.email || '';
        document.getElementById('vrSTelefon').value = contact.telefon || '';
        document.getElementById('vrSProjekt').value = contact.vrProjekt || '';
        document.getElementById('vrSWohnung').value = contact.vrWohnung || '';
        document.getElementById('vrSPunkte').value = contact.vrPunkte || '1';
        document.getElementById('vrSNotes').value = '';

        this.sessionAnrede = 'Herr';
        document.getElementById('vrSAnredeHerr').classList.add('active');
        document.getElementById('vrSAnredeFrau').classList.remove('active');
        renderVrSessionPreview();
      },

      saveAndNext() {
        const vorname  = (document.getElementById('vrSVorname')?.value  || '').trim();
        const nachname = (document.getElementById('vrSNachname')?.value || '').trim();
        const firma    = (document.getElementById('vrSFirma')?.value    || '').trim();
        const email    = (document.getElementById('vrSEmail')?.value    || '').trim();
        const telefon  = (document.getElementById('vrSTelefon')?.value  || '').trim();
        const projekt  = (document.getElementById('vrSProjekt')?.value  || '').trim();
        const wohnung  = (document.getElementById('vrSWohnung')?.value  || '').trim();
        const punkte   = document.getElementById('vrSPunkte')?.value    || '1';
        const notes    = (document.getElementById('vrSNotes')?.value    || '').trim();
        const timestamp = new Date().toISOString();

        if (!vorname && !nachname && !firma && !email) {
          showToast('❌ Bitte mindestens Name, Firma oder E-Mail angeben');
          return;
        }

        let orig = this.linkedContactId
          ? state.contacts.find(c => c.id === this.linkedContactId)
          : null;

        if (!orig) {
          const company = firma ? (getCompanyByName(firma) || findOrCreateCompanyByName(firma)) : null;
          orig = {
            id: Math.random().toString(36).substr(2, 9),
            vorname, nachname, firma: firma || '',
            companyId: company?.id || null,
            companyBranchId: company?.primaryBranchId || null,
            telefon, email, linkedin: '',
            unternehmenstelefon: '', unternehmensemail: '',
            rolle: this.sessionAnrede || 'Herr',
            strasse: '', ortschaft: '', region: '',
            status: 'vrmail_gesendet', notes: '',
            source: 'vr', dealStage: null, dealValue: null,
            dealProbability: null, dealCloseDate: null,
            tags: [], createdAt: timestamp, notesHistory: []
          };
          state.contacts.push(orig);
        } else {
          if (!orig.vorname  && vorname)  orig.vorname  = vorname;
          if (!orig.nachname && nachname) orig.nachname = nachname;
          if (!orig.email    && email)    orig.email    = email;
          if (!orig.telefon  && telefon)  orig.telefon  = telefon;
          if (!orig.firma    && firma)    orig.firma    = firma;
        }

        orig.vrProjekt = projekt || orig.vrProjekt || null;
        orig.vrWohnung = wohnung || orig.vrWohnung || null;
        orig.vrPunkte  = punkte  || orig.vrPunkte  || null;
        orig.vrMailSentDate = timestamp;
        orig.status    = 'vrmail_gesendet';
        orig.updatedAt = timestamp;

        addNotesHistory(orig,
          notes ? `🎥 VR Mail: ${notes}` : '🎥 VR Mail gesendet',
          'vrmail_gesendet'
        );

        state.vrQueue = (state.vrQueue || []).filter(id => id !== orig.id);
        if (!this.adHocMode) this.contacts.splice(this.currentIdx, 1);

        saveContacts();
        renderKontakte();
        renderVrTrackingTable();

        if (this.adHocMode) {
          showToast('🎥 Gespeichert – Formular für nächsten Eintrag bereit');
          this.linkedContactId = null;
          this.clearForm();
          const badge = document.getElementById('vrLinkedContactBadge');
          if (badge) badge.style.display = 'none';
          const searchEl = document.getElementById('vrContactSearch');
          if (searchEl) searchEl.value = '';
        } else if (this.currentIdx < this.contacts.length) {
          showToast('🎥 Gespeichert');
          this.loadCurrent();
        } else {
          showToast('🎉 VR Session abgeschlossen!');
          document.getElementById('vrActiveSession').style.display = 'none';
          this.contacts = [];
          state.vrQueue = [];
          this.adHocMode = false;
          this.updateInfo();
        }
      },

      applyResult(status) {
        const timestamp = new Date().toISOString();

        const orig = this.linkedContactId
          ? state.contacts.find(c => c.id === this.linkedContactId)
          : null;

        if (!orig) {
          showToast('❌ Kein Kontakt verknüpft – bitte zuerst Kontakt auswählen');
          return;
        }

        const dateField = {
          vrmail_gesendet: 'vrMailSentDate',
          vrfollowup1: 'vrFollowup1Date',
          vrfollowup2: 'vrFollowup2Date',
          vrfollowup3: 'vrFollowup3Date'
        }[status];

        orig.status = status;
        orig.updatedAt = timestamp;
        if (dateField) orig[dateField] = timestamp;

        const statusLabels = {
          vrmail_gesendet: '🎥 VR Mail gesendet',
          vrfollowup1: '🔄 VR Follow-up 1',
          vrfollowup2: '🔄 VR Follow-up 2',
          vrfollowup3: '🔄 VR Follow-up 3',
          won: '🏆 VR Gewonnen',
          nointerest: '❌ VR Kein Interesse',
          nokeinbedarf: '🚫 VR Kein Bedarf'
        };

        let noteText = statusLabels[status] || status;

        if (status === 'nointerest' || status === 'nokeinbedarf') {
          const reason = (document.getElementById('vrNoInterestReason')?.value || '').trim();
          const note   = (document.getElementById('vrNoInterestNote')?.value   || '').trim();
          if (reason) noteText += ` – ${reason}`;
          if (note)   noteText += `: ${note}`;
        } else {
          const extraNote = (document.getElementById('vrSNotes')?.value || '').trim();
          if (extraNote) noteText += `: ${extraNote}`;
        }

        addNotesHistory(orig, noteText, status);

        state.vrQueue = (state.vrQueue || []).filter(id => id !== orig.id);
        if (!this.adHocMode) this.contacts.splice(this.currentIdx, 1);

        saveContacts();
        renderKontakte();
        renderVrTrackingTable();

        const label = statusLabels[status] || status;

        if (this.adHocMode) {
          showToast(`✅ ${label} gespeichert`);
          this.linkedContactId = null;
          this.clearForm();
          const badge = document.getElementById('vrLinkedContactBadge');
          if (badge) badge.style.display = 'none';
          const searchEl = document.getElementById('vrContactSearch');
          if (searchEl) searchEl.value = '';
        } else if (this.currentIdx < this.contacts.length) {
          showToast(`✅ ${label}`);
          this.loadCurrent();
        } else {
          showToast('🎉 VR Session abgeschlossen!');
          document.getElementById('vrActiveSession').style.display = 'none';
          this.contacts = [];
          state.vrQueue = [];
          this.adHocMode = false;
          this.updateInfo();
        }
      },

      next() {
        if (this.adHocMode) {
          this.linkedContactId = null;
          this.clearForm();
          const badge = document.getElementById('vrLinkedContactBadge');
          if (badge) badge.style.display = 'none';
          const searchEl = document.getElementById('vrContactSearch');
          if (searchEl) searchEl.value = '';
          return;
        }
        const nextIdx = this.currentIdx + 1;
        if (nextIdx < this.contacts.length) {
          this.currentIdx = nextIdx;
          this.loadCurrent();
        } else {
          showToast('🎉 VR Session abgeschlossen!');
          document.getElementById('vrActiveSession').style.display = 'none';
          this.contacts = [];
          state.vrQueue = [];
          this.adHocMode = false;
          this.updateInfo();
        }
      },

      prev() {
        if (this.adHocMode) return;
        if (this.currentIdx > 0) {
          this.currentIdx -= 1;
          this.loadCurrent();
        }
      },

      end() {
        document.getElementById('vrActiveSession').style.display = 'none';
        this.contacts = [];
        state.vrQueue = [];
        this.adHocMode = false;
        this.linkedContactId = null;
        this.updateInfo();
      },

      renderQueue() {
        const el = document.getElementById('vrSessionQueueList');
        if (!el) return;
        el.innerHTML = this.contacts.map((c, i) => {
          const isActive = i === this.currentIdx;
          const name = (`${c.vorname || ''} ${c.nachname || ''}`).trim() || c.firma || '–';
          return `<div onclick="VrSession.jumpTo(${i})" style="padding:7px 10px;border-radius:6px;cursor:pointer;margin-bottom:3px;
            background:${isActive ? 'rgba(245,158,11,.2)' : 'rgba(255,255,255,.04)'};
            border-left:3px solid ${isActive ? 'var(--accent)' : 'transparent'};">
            <div style="font-size:12px;font-weight:${isActive ? 700 : 400};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(name)}</div>
            ${c.firma ? `<div style="font-size:11px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(c.firma)}</div>` : ''}
          </div>`;
        }).join('') || '<div style="color:var(--muted);font-size:11px;padding:4px 8px;">Ad-hoc Modus</div>';
      },

      jumpTo(i) {
        if (i >= 0 && i < this.contacts.length) {
          this.currentIdx = i;
          this.loadCurrent();
        }
      }
    };

    function vrSSetAnrede(a) {
      VrSession.sessionAnrede = a;
      document.getElementById('vrSAnredeHerr').classList.toggle('active', a === 'Herr');
      document.getElementById('vrSAnredeFrau').classList.toggle('active', a === 'Frau');
      renderVrSessionPreview();
    }

    function vrSSetForm(f) {
      VrSession.sessionForm = f;
      document.getElementById('vrSFormSie').classList.toggle('active', f === 'Sie');
      document.getElementById('vrSFormDu').classList.toggle('active', f === 'du');
      renderVrSessionPreview();
    }

    function buildVrMailForSession() {
      const anrede = VrSession.sessionAnrede;
      const nachname = (document.getElementById('vrSNachname')?.value || '').trim() || '[Nachname]';
      const projekt = (document.getElementById('vrSProjekt')?.value || '').trim() || '[Projektname]';
      const wohnung = (document.getElementById('vrSWohnung')?.value || '').trim() || '[Wohnungsname]';
      const punkte = parseInt(document.getElementById('vrSPunkte')?.value || '1', 10) || 1;
      const total = (punkte * 400).toLocaleString('de-CH');
      const sourceVal = document.getElementById('vrSVariante')?.value || 'web';
      const isPortal = sourceVal === 'portal' || sourceVal === 'portal_grundriss';
      const anredeStr = anrede === 'Herr' ? 'Herr' : 'Frau';

      const subject = `Virtueller Rundgang für Ihr Projekt ${projekt} - Wohnungen online erlebbar machen`;

      const intro = isPortal
        ? `Ich bin auf das Projekt ${projekt} auf einem der Immobilienportale gestossen und habe mir die Unterlagen angesehen. Die Visualisierungen und die Aufmachung des Inserats haben mich angesprochen.`
        : `Ich habe gesehen, dass Sie aktuell das Projekt ${projekt} vermarkten und derzeit die Wohnungen verfügbar sind. Die Projektseite gefällt mir sehr gut, besonders das Farbkonzept und die Visualisierungen.`;

      const body =
`Guten Tag ${anredeStr} ${nachname}

${intro}

Gerade bei Neubauprojekten fällt Interessenten oft schwer, sich anhand von Grundrissen wirklich vorzustellen, wie sich die Räume später anfühlen werden. Ein virtueller Rundgang macht die Wohnungen bereits online räumlich erlebbar. Elemente wie das Bad en Suite oder die Terrasse würden bei Ihrem Projekt im Rundgang besonders gut zur Geltung kommen.

Ich empfehle Ihnen konkret einen Rundgang der ${wohnung} mit ${punkte} 360°-Bildern. Der Preis beträgt CHF 400.- pro Bild, was einem Gesamtbetrag von CHF ${total}.- entspricht. Im Anhang sehen Sie, wo die Punkte für die 360°-Bilder genau liegen würden. Damit auch die Aussenbereiche auf dem virtuellen Rundgang realistisch aussehen, würden wir Drohnenbilder aufnehmen, die kostenlos im Angebot enthalten sind.

Zusätzlich besteht die Möglichkeit, direkt aus dem Rundgang Visualisierungen zu erstellen. Hier liegen die Kosten bei CHF 240.- pro Bild.

Aktuelle Beispiele sowie weitere Informationen finden Sie hier: https://www.livetour.ch/virtueller-rundgang

Der Aufwand für Sie ist minimal und der Rundgang lässt sich unkompliziert auf Ihrer Projektwebseite integrieren.

Darf ich Ihnen dazu eine formelle Offerte erstellen?

Ich freue mich auf Ihre Rückmeldung!

Freundliche Grüsse

Kushtrim Demhasaj
liveTour Immobilienmarketing GmbH
Wellhauserweg 41a
8500 Frauenfeld
CHE-166.999.293

kushtrim.demhasaj@livetour.ch
T: +41 71 575 24 64
www.livetour.ch`;

      return { subject, body };
    }

    function renderVrSessionPreview() {
      const { subject, body } = buildVrMailForSession();
      const subjectEl = document.getElementById('vrSPreviewSubject');
      const bodyEl = document.getElementById('vrSPreviewBody');
      if (subjectEl) subjectEl.textContent = 'Betreff: ' + subject;
      if (bodyEl) bodyEl.textContent = body;
    }

    function copyVrSessionMail() {
      const { subject, body } = buildVrMailForSession();
      navigator.clipboard.writeText(`Betreff: ${subject}\n\n${body}`)
        .then(() => showToast('📋 Mail kopiert!'))
        .catch(() => showToast('Kopieren fehlgeschlagen'));
    }

    function sendVrSessionMail() {
      const email = (document.getElementById('vrSEmail')?.value || '').trim();
      if (!email) {
        showToast('❌ E-Mail fehlt – bitte Adresse im Formular eintragen');
        return;
      }
      const { subject, body } = buildVrMailForSession();
      // encodeURIComponent: korrekte UTF-8-Kodierung (°, ä, ö, ü etc.)
      const href = 'mailto:' + email
        + '?subject=' + encodeURIComponent(subject)
        + '&body='    + encodeURIComponent(body);
      const a = document.createElement('a');
      a.href = href;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }

    function vrSearchContacts(query) {
      const resultsEl = document.getElementById('vrContactSearchResults');
      if (!resultsEl) return;
      const q = (query || '').trim().toLowerCase();
      if (q.length < 2) { resultsEl.style.display = 'none'; return; }
      const matches = state.contacts
        .filter(c => [c.vorname, c.nachname, c.firma, c.email, c.telefon]
          .filter(Boolean).join(' ').toLowerCase().includes(q))
        .slice(0, 15);
      if (!matches.length) {
        resultsEl.innerHTML = '<div style="padding:10px; color:var(--muted); text-align:center; font-size:12px;">Keine Treffer</div>';
        resultsEl.style.display = 'block';
        return;
      }
      resultsEl.innerHTML = matches.map(c => {
        const name = (`${c.vorname || ''} ${c.nachname || ''}`).trim() || 'Kontakt';
        const sub  = [c.firma, c.email].filter(Boolean).join(' · ');
        return `<div style="padding:8px 12px; cursor:pointer; border-bottom:1px solid var(--line);"
          onmousedown="vrSelectContact('${c.id}')"
          onmouseover="this.style.background='var(--accent-soft)'"
          onmouseout="this.style.background=''">
          <div style="font-weight:600; font-size:12px;">${name}</div>
          <div style="font-size:11px; color:var(--muted);">${sub}</div>
        </div>`;
      }).join('');
      resultsEl.style.display = 'block';
    }

    function vrSelectContact(id) {
      const contact = state.contacts.find(c => c.id === id);
      if (!contact) return;
      VrSession.linkedContactId = id;
      document.getElementById('vrSessionContactName').textContent =
        (`${contact.vorname || ''} ${contact.nachname || ''}`).trim() || '–';
      document.getElementById('vrSessionContactCompany').textContent = contact.firma || '–';
      document.getElementById('vrSessionContactMeta').textContent = [
        contact.telefon && '📞 ' + contact.telefon,
        contact.email   && '📧 ' + contact.email,
        contact.ortschaft && '📍 ' + contact.ortschaft
      ].filter(Boolean).join(' | ') || '–';
      document.getElementById('vrSessionContactStatus').textContent =
        getStatusLabel(contact.status || 'new');
      const badge = document.getElementById('vrLinkedContactBadge');
      if (badge) badge.style.display = 'block';
      document.getElementById('vrSVorname').value  = contact.vorname   || '';
      document.getElementById('vrSNachname').value = contact.nachname  || '';
      document.getElementById('vrSFirma').value    = contact.firma     || '';
      document.getElementById('vrSEmail').value    = contact.email     || '';
      document.getElementById('vrSTelefon').value  = contact.telefon   || '';
      document.getElementById('vrSProjekt').value  = contact.vrProjekt || '';
      document.getElementById('vrSWohnung').value  = contact.vrWohnung || '';
      document.getElementById('vrSPunkte').value   = contact.vrPunkte  || '1';
      const searchEl  = document.getElementById('vrContactSearch');
      if (searchEl)  searchEl.value = '';
      const resultsEl = document.getElementById('vrContactSearchResults');
      if (resultsEl) resultsEl.style.display = 'none';
      renderVrSessionPreview();
    }

    function vrClearContact() {
      VrSession.linkedContactId = null;
      VrSession.clearForm();
      const badge = document.getElementById('vrLinkedContactBadge');
      if (badge) badge.style.display = 'none';
      const searchEl  = document.getElementById('vrContactSearch');
      if (searchEl)  searchEl.value = '';
      const resultsEl = document.getElementById('vrContactSearchResults');
      if (resultsEl) resultsEl.style.display = 'none';
    }

    // ─── END VR SESSION ENGINE ──────────────────────────────────────────

    // VR FOLLOWUP ESKALATION
    function checkVrFollowups() {
      const now = new Date();
      let changed = false;
      state.contacts.forEach(c => {
        if (c.status === 'vrmail_gesendet' && c.vrMailSentDate) {
          const daysSince = (now - new Date(c.vrMailSentDate)) / 86400000;
          if (daysSince >= 7) {
            c.status = 'vrfollowup1';
            c.vrFollowup1Date = now.toISOString();
            changed = true;
          }
        } else if (c.status === 'vrfollowup1' && c.vrFollowup1Date) {
          const daysSince = (now - new Date(c.vrFollowup1Date)) / 86400000;
          if (daysSince >= 7) {
            c.status = 'vrfollowup2';
            c.vrFollowup2Date = now.toISOString();
            changed = true;
          }
        }
      });
      if (changed) {
        saveContacts();
        renderKontakte();
        renderVrTrackingTable();
      }
    }

    // LINKEDIN FOLLOWUP ESKALATION (analog VR)
    // Nach 7 Tagen ohne neue LinkedIn-Aktion wird der Kontakt wieder auf "LIO Today" gesetzt.
    function checkLinkedInFollowups() {
      const now = new Date();
      let changed = false;

      state.contacts.forEach(c => {
        if (c.source !== 'linkedin') return;
        if (c.status !== 'lioutboundfollowup') return;
        if (['response', 'nointerest', 'won'].includes(c.status || '')) return;

        const baseTs = c.liLastOutboundDate || c.updatedAt || c.createdAt;
        if (!baseTs) return;

        const daysSince = (now - new Date(baseTs)) / 86400000;
        if (daysSince >= 7) {
          c.status = 'lioutboundtoday';
          c.outreachStatus = 'outreachtoday';
          c.liFollowupStep = Math.min((Number(c.liFollowupStep) || 0) + 1, 3);
          c.liFollowupDueDate = now.toISOString().split('T')[0];
          changed = true;
        }
      });

      if (changed) {
        saveContacts();
      }
    }

    // VR MAIL GENERATOR STATE
    const vrState = { variant: 'A', form: 'Sie', anrede: 'Herr' };

    function setVrVariant(v) {
      vrState.variant = v;
      document.getElementById('vrVariantA').classList.toggle('active', v === 'A');
      document.getElementById('vrVariantB').classList.toggle('active', v === 'B');
      renderVrPreview();
    }

    function setVrForm(f) {
      vrState.form = f;
      document.getElementById('vrFormSie').classList.toggle('active', f === 'Sie');
      document.getElementById('vrFormDu').classList.toggle('active', f === 'du');
      document.getElementById('vrAnredeRow').style.display = f === 'Sie' ? 'block' : 'none';
      document.getElementById('vrNachnameRow').style.display = f === 'Sie' ? 'block' : 'none';
      renderVrPreview();
    }

    function setVrAnrede(a) {
      vrState.anrede = a;
      document.getElementById('vrAnredeHerr').classList.toggle('active', a === 'Herr');
      document.getElementById('vrAnredeFrau').classList.toggle('active', a === 'Frau');
      renderVrPreview();
    }

    function updateVrTotal() {
      const punkte = parseInt(document.getElementById('vrPunkte').value, 10) || 0;
      document.getElementById('vrTotal').value = (punkte * 400).toLocaleString('de-CH');
    }

    function buildVrMail() {
      const anrede = vrState.anrede;
      const nachname = (document.getElementById('vrNachname')?.value || '').trim() || '[Nachname]';
      const projekt = (document.getElementById('vrProjektname')?.value || '').trim() || '[Projektname]';
      const wohnung = (document.getElementById('vrWohnungsname')?.value || '').trim() || '[Wohnungsname]';
      const punkte = parseInt(document.getElementById('vrPunkte')?.value || '1', 10) || 1;
      const total = (punkte * 400).toLocaleString('de-CH');
      const sourceVal = document.getElementById('vrSource')?.value || 'web';
      const isPortal = sourceVal === 'portal' || sourceVal === 'portal_grundriss';
      const anredeStr = anrede === 'Herr' ? 'Herr' : 'Frau';

      const subject = `Virtueller Rundgang für Ihr Projekt ${projekt} - Wohnungen online erlebbar machen`;

      const intro = isPortal
        ? `Ich bin auf das Projekt ${projekt} auf einem der Immobilienportale gestossen und habe mir die Unterlagen angesehen. Die Visualisierungen und die Aufmachung des Inserats haben mich angesprochen.`
        : `Ich habe gesehen, dass Sie aktuell das Projekt ${projekt} vermarkten und derzeit die Wohnungen verfügbar sind. Die Projektseite gefällt mir sehr gut, besonders das Farbkonzept und die Visualisierungen.`;

      const body =
`Guten Tag ${anredeStr} ${nachname}

${intro}

Gerade bei Neubauprojekten fällt Interessenten oft schwer, sich anhand von Grundrissen wirklich vorzustellen, wie sich die Räume später anfühlen werden. Ein virtueller Rundgang macht die Wohnungen bereits online räumlich erlebbar. Elemente wie das Bad en Suite oder die Terrasse würden bei Ihrem Projekt im Rundgang besonders gut zur Geltung kommen.

Ich empfehle Ihnen konkret einen Rundgang der ${wohnung} mit ${punkte} 360°-Bildern. Der Preis beträgt CHF 400.- pro Bild, was einem Gesamtbetrag von CHF ${total}.- entspricht. Im Anhang sehen Sie, wo die Punkte für die 360°-Bilder genau liegen würden. Damit auch die Aussenbereiche auf dem virtuellen Rundgang realistisch aussehen, würden wir Drohnenbilder aufnehmen, die kostenlos im Angebot enthalten sind.

Zusätzlich besteht die Möglichkeit, direkt aus dem Rundgang Visualisierungen zu erstellen. Hier liegen die Kosten bei CHF 240.- pro Bild.

Aktuelle Beispiele sowie weitere Informationen finden Sie hier: https://www.livetour.ch/virtueller-rundgang

Der Aufwand für Sie ist minimal und der Rundgang lässt sich unkompliziert auf Ihrer Projektwebseite integrieren.

Darf ich Ihnen dazu eine formelle Offerte erstellen?

Ich freue mich auf Ihre Rückmeldung!

Freundliche Grüsse

Kushtrim Demhasaj
liveTour Immobilienmarketing GmbH
Wellhauserweg 41a
8500 Frauenfeld
CHE-166.999.293

kushtrim.demhasaj@livetour.ch
T: +41 71 575 24 64
www.livetour.ch`;

      return { subject, body };
    }

    function renderVrPreview() {
      const { subject, body } = buildVrMail();
      const subEl = document.getElementById('vrPreviewSubject');
      const bodyEl = document.getElementById('vrPreviewBody');
      if (subEl) subEl.textContent = 'Betreff: ' + subject;
      if (bodyEl) bodyEl.textContent = body;
    }

    function copyVrMail() {
      const { subject, body } = buildVrMail();
      const text = `Betreff: ${subject}\n\n${body}`;
      navigator.clipboard.writeText(text).then(() => {
        showToast('📋 Mail kopiert!');
      }).catch(() => {
        showToast('Kopieren fehlgeschlagen');
      });
    }

    function getVrOverviewRows() {
      const overview = state.vrOverview || {};
      const query = String(overview.query || '').trim().toLowerCase();
      const statusFilter = overview.status || 'all';
      const sortBy = overview.sortBy || 'nextDue';
      const sortDesc = Boolean(overview.sortDesc);

      const now = new Date();
      now.setHours(0, 0, 0, 0);

      const rows = state.contacts
        .filter(c => c.status && c.status.startsWith('vr'))
        .map(c => {
          const mailDate = c.vrMailSentDate ? new Date(c.vrMailSentDate) : null;
          const fu1Date = c.vrFollowup1Date ? new Date(c.vrFollowup1Date) : null;
          const fu2Date = c.vrFollowup2Date ? new Date(c.vrFollowup2Date) : null;
          const latest = fu2Date || fu1Date || mailDate;
          const latestTs = latest ? latest.getTime() : 0;
          const lastTouchText = latest ? latest.toLocaleDateString('de-CH') : '–';
          const daysSinceLast = latest ? Math.floor((now - new Date(latest.getFullYear(), latest.getMonth(), latest.getDate())) / 86400000) : null;

          let nextDue = null;
          if (c.status === 'vrmail_gesendet' && mailDate) {
            nextDue = new Date(mailDate);
            nextDue.setDate(nextDue.getDate() + 7);
          } else if (c.status === 'vrfollowup1' && fu1Date) {
            nextDue = new Date(fu1Date);
            nextDue.setDate(nextDue.getDate() + 7);
          } else if (c.status === 'vrtoday') {
            nextDue = new Date();
          }
          const nextDueTs = nextDue ? nextDue.getTime() : Number.POSITIVE_INFINITY;
          const nextDueText = nextDue ? nextDue.toLocaleDateString('de-CH') : '–';

          const statusRank = {
            vrtoday: 1,
            vrmail_gesendet: 2,
            vrfollowup1: 3,
            vrfollowup2: 4,
            vrfollowup3: 5
          };

          return {
            contact: c,
            id: c.id,
            name: `${c.vorname || ''} ${c.nachname || ''}`.trim(),
            company: c.firma || '',
            location: c.ortschaft || '',
            project: c.vrProjekt || '',
            status: c.status || '',
            statusLabel: getStatusLabel(c.status || ''),
            statusRank: statusRank[c.status] || 99,
            lastTouchText,
            latestTs,
            nextDueText,
            nextDueTs,
            daysSinceLast
          };
        })
        .filter(row => {
          if (statusFilter !== 'all' && row.status !== statusFilter) return false;
          if (!query) return true;
          const hay = `${row.name} ${row.company} ${row.location} ${row.project} ${row.statusLabel}`.toLowerCase();
          return hay.includes(query);
        });

      rows.sort((a, b) => {
        let res = 0;
        if (sortBy === 'status') res = a.statusRank - b.statusRank;
        if (sortBy === 'name') res = a.name.localeCompare(b.name);
        if (sortBy === 'company') res = a.company.localeCompare(b.company);
        if (sortBy === 'location') res = a.location.localeCompare(b.location);
        if (sortBy === 'lastTouch') res = a.latestTs - b.latestTs;
        if (sortBy === 'nextDue') res = a.nextDueTs - b.nextDueTs;
        return sortDesc ? -res : res;
      });

      return rows;
    }

    function renderVrTrackingTable() {
      const tbody = document.getElementById('vrTrackingBody');
      const grid = document.getElementById('vrTrackingGrid');
      const listWrap = document.getElementById('vrTrackingListWrap');
      const summary = document.getElementById('vrOverviewSummary');
      const listBtn = document.getElementById('btnVrViewList');
      const tilesBtn = document.getElementById('btnVrViewTiles');
      if (!tbody || !grid) return;

      const rows = getVrOverviewRows();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dueToday = rows.filter(r => {
        if (!Number.isFinite(r.nextDueTs)) return false;
        const d = new Date(r.nextDueTs);
        d.setHours(0, 0, 0, 0);
        return d <= today;
      }).length;

      if (summary) summary.textContent = `${rows.length} Kontakte · ${dueToday} heute fällig`;
      if (listBtn) listBtn.classList.toggle('active', (state.vrOverview?.view || 'list') === 'list');
      if (tilesBtn) tilesBtn.classList.toggle('active', (state.vrOverview?.view || 'list') === 'tiles');

      if (rows.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:var(--muted); padding:20px;">Keine VR-Kontakte für diesen Filter</td></tr>';
        grid.innerHTML = '<div style="padding:16px; text-align:center; color:var(--muted); border:1px dashed var(--line); border-radius:10px;">Keine VR-Kontakte für diesen Filter</div>';
      } else {
        tbody.innerHTML = rows.map(row => `
          <tr style="border-bottom:1px solid var(--line);">
            <td style="padding:8px 6px;">${row.name || '–'}</td>
            <td style="padding:8px 6px;">${row.company || '–'}</td>
            <td style="padding:8px 6px;">${row.location || '–'}</td>
            <td style="padding:8px 6px;">${row.project || '–'}</td>
            <td style="padding:8px 6px;"><span class="contact-status-badge ${row.status}">${row.statusLabel}</span></td>
            <td style="padding:8px 6px;">${row.lastTouchText}${typeof row.daysSinceLast === 'number' ? ` <span style="color:var(--muted)">(${row.daysSinceLast}d)</span>` : ''}</td>
            <td style="padding:8px 6px;">${row.nextDueText}</td>
            <td style="padding:8px 6px;"><button class="btn" onclick="openEditModal('${row.id}')" style="padding:4px 8px; font-size:11px;">✎ Edit</button></td>
          </tr>
        `).join('');

        grid.innerHTML = rows.map(row => `
          <div class="contact-card" onclick="openEditModal('${row.id}')" style="cursor:pointer; padding:14px;">
            <div>
              <div class="contact-name">${row.name || '–'}</div>
              <div class="contact-company">${row.company || '–'}</div>
            </div>
            <div class="contact-meta">
              <div>📍 ${row.location || '–'}</div>
              <div>🏗️ ${row.project || '–'}</div>
              <div>🗓 Letzte Aktion: ${row.lastTouchText}</div>
              <div>⏭ Nächster Schritt: ${row.nextDueText}</div>
            </div>
            <div><span class="contact-status-badge ${row.status}">${row.statusLabel}</span></div>
          </div>
        `).join('');
      }

      const showList = (state.vrOverview?.view || 'list') === 'list';
      if (listWrap) listWrap.style.display = showList ? 'block' : 'none';
      grid.style.display = showList ? 'none' : 'grid';
    }

    // INIT
    // AUTO 45-TAGE FOLLOWUP TRIGGER
    function checkFollowupDueDates() {
      const today = new Date().toISOString().split('T')[0];
      let changed = false;
      state.contacts.forEach(c => {
        if (c.followupDueDate && c.followupDueDate <= today &&
            c.status !== 'followuptoday' &&
            !['nointerest', 'nokeinbedarf', 'won'].includes(c.status)) {
          c.status = 'followuptoday';
          changed = true;
        }
      });
      if (changed) saveContacts();
    }

    // STAR RATING HELPERS
    const STAR_LABELS = ['', '1 – Wenig Interesse', '2 – Geringes Interesse', '3 – Mittleres Interesse', '4 – Grosses Interesse', '5 – Sehr grosses Interesse'];

    function renderEditStars(rating) {
      document.querySelectorAll('#editStarRating .star').forEach((s, i) => s.classList.toggle('filled', i < rating));
      const lbl = document.getElementById('editStarLabel');
      if (lbl) lbl.textContent = STAR_LABELS[rating] || '–';
    }

    function renderSessionStars(rating) {
      document.querySelectorAll('#sessionStarRating .star').forEach((s, i) => s.classList.toggle('filled', i < rating));
      const lbl = document.getElementById('sessionStarLabel');
      if (lbl) lbl.textContent = STAR_LABELS[rating] || '–';
    }

    // ─── TEAM / MITARBEITER ────────────────────────────────────────────

    const MEMBER_COLORS = ['#6366f1','#3b82f6','#0ea5e9','#10b981','#f59e0b','#ef4444','#ec4899','#8b5cf6'];

    function renderMemberColorPalette() {
      const palette = document.getElementById('memberColorPalette');
      if (!palette) return;
      const current = document.getElementById('memberSelectedColor')?.value || MEMBER_COLORS[0];
      palette.innerHTML = MEMBER_COLORS.map(col => `
        <span onclick="selectMemberColor('${col}')" style="
          display:inline-block; width:22px; height:22px; border-radius:50%; background:${col};
          cursor:pointer; border:3px solid ${col === current ? '#fff' : 'transparent'};
          box-shadow:${col === current ? '0 0 0 2px ' + col : 'none'};
        "></span>
      `).join('');
    }

    function selectMemberColor(color) {
      const el = document.getElementById('memberSelectedColor');
      if (el) el.value = color;
      renderMemberColorPalette();
    }

    function suggestKuerzel() {
      const v = (document.getElementById('memberVorname')?.value || '').trim();
      const n = (document.getElementById('memberNachname')?.value || '').trim();
      const kEl = document.getElementById('memberKuerzel');
      if (!kEl) return;
      if (v && n) {
        kEl.value = (v[0] + n[0]).toUpperCase();
      } else if (v) {
        kEl.value = v.substring(0, 2).toUpperCase();
      }
    }

    function addMember() {
      if (!requirePermission('team_manage', 'Nur Admin/Manager duerfen Teammitglieder verwalten')) return;
      const vorname = document.getElementById('memberVorname')?.value.trim() || '';
      const nachname = document.getElementById('memberNachname')?.value.trim() || '';
      const kuerzel = document.getElementById('memberKuerzel')?.value.trim().toUpperCase() || '';
      const color = document.getElementById('memberSelectedColor')?.value || MEMBER_COLORS[0];
      if (!vorname || !kuerzel) {
        showToast('Vorname und Kuerzel benoetigt');
        return;
      }
      const member = {
        id: Math.random().toString(36).substr(2, 9),
        vorname,
        nachname,
        kuerzel,
        color,
        createdAt: new Date().toISOString()
      };
      state.members.push(member);
      saveMembers();
      document.getElementById('memberVorname').value = '';
      document.getElementById('memberNachname').value = '';
      document.getElementById('memberKuerzel').value = '';
      document.getElementById('memberSelectedColor').value = MEMBER_COLORS[0];
      renderMemberColorPalette();
      renderMembersList();
      populateUserMemberSelect();
      renderMemberSwitcher();
      showToast('Mitarbeiter hinzugefuegt');
    }

    function deleteMember(id) {
      if (!requirePermission('team_manage', 'Nur Admin/Manager duerfen Teammitglieder verwalten')) return;
      state.members = state.members.filter(m => m.id !== id);
      state.contacts.forEach(c => { if (c.memberId === id) c.memberId = null; });
      saveMembers();
      saveContacts();
      renderMembersList();
      populateUserMemberSelect();
      renderMemberSwitcher();
      if (state.activeMember === id) {
        state.activeMember = null;
        renderKontakte();
      }
    }

    function renderMembersList() {
      const el = document.getElementById('membersList');
      if (!el) return;
      if (state.members.length === 0) {
        el.innerHTML = '<div style="color:var(--muted); font-size:12px; text-align:center; padding:12px;">Noch keine Mitarbeiter angelegt</div>';
        return;
      }
      el.innerHTML = state.members.map(m => `
        <div style="display:flex; align-items:center; gap:10px; padding:8px 10px; background:var(--bg); border:1px solid var(--line); border-radius:8px;">
          <span style="background:${m.color}22;border:1px solid ${m.color};color:${m.color};border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;">${m.kuerzel}</span>
          <span style="flex:1; font-size:13px;">${m.vorname} ${m.nachname}</span>
          <button class="btn" onclick="deleteMember('${m.id}')" style="padding:3px 8px; font-size:11px; color:var(--bad); border-color:var(--bad);">Loeschen</button>
        </div>
      `).join('');
    }

    function populateUserMemberSelect() {
      const sel = document.getElementById('newUserMember');
      if (!sel) return;
      const current = sel.value || '';
      sel.innerHTML = '<option value="">Kein Mitarbeiter verknüpft</option>' +
        state.members.map(m => `<option value="${m.id}">${m.vorname} ${m.nachname} (${m.kuerzel})</option>`).join('');
      if ([...sel.options].some(o => o.value === current)) sel.value = current;
    }

    function sanitizeAssignableRole(role) {
      const currentRole = getCurrentRole();
      if (currentRole === 'admin') return ['admin', 'manager', 'user'].includes(role) ? role : 'user';
      if (currentRole === 'manager') return ['manager', 'user'].includes(role) ? role : 'user';
      return 'user';
    }

    async function updateUserRoleInRegistry(uid, role) {
      if (!requirePermission('user_manage', 'Keine Berechtigung für User-Verwaltung')) return;
      const normalizedRole = sanitizeAssignableRole(role);
      const row = state.userAccounts.find(x => x.uid === uid);
      if (!row) return;
      const previousRole = row.role || 'user';
      row.role = normalizedRole;
      row.updatedAt = new Date().toISOString();
      saveUserAccounts();
      try {
        if (typeof window.updateFirebaseUserRole === 'function') {
          await window.updateFirebaseUserRole(uid, normalizedRole);
        }
        showToast('✅ Rolle aktualisiert (inkl. Firebase)');
      } catch (e) {
        row.role = previousRole;
        saveUserAccounts();
        const code = e?.code || e?.message || 'Fehler';
        showToast(`❌ Rollenupdate fehlgeschlagen (${code})`);
      }
      renderUserAccountsList();
    }

    // ── UID Migration ─────────────────────────────────────────────────────────
    // Old UIDs that all belonged to Timmo (current UID: Ju7AwROL4pb46Dt2xLVnUKbeC0k2)
    const OLD_UIDS = [
      'Fhe983SGRpgw3GPZ3f8DVB3nqm32',
      'T0gmPrUhrEXVefpxiyDnvQqgA252',
      'V5nn7y3XKqSbR4j4oSpGWDdsfkx2',
      'Z1Ql9qpqOvUiKSfhz1CC0W897Wn1'
    ];

    function initUidMigrationCard() {
      if (getCurrentRole() !== 'admin') return;
      const card = document.getElementById('uidMigrationCard');
      if (!card) return;

      // Find memberIds linked to old UIDs
      const oldAccounts = (state.userAccounts || []).filter(u => OLD_UIDS.includes(u.uid));
      const oldMemberIds = [...new Set(oldAccounts.map(u => u.memberId).filter(Boolean))];
      const currentMemberId = getCurrentUserLinkedMemberId();
      const currentMember = state.members.find(m => m.id === currentMemberId);

      // Count contacts still on old member IDs
      const affectedContacts = state.contacts.filter(c => oldMemberIds.includes(c.memberId)).length;

      const statusEl = document.getElementById('uidMigrationStatus');
      if (statusEl) {
        if (affectedContacts === 0 && oldAccounts.length === 0) {
          statusEl.textContent = '✅ Keine Migration notwendig — alle Daten sind bereits korrekt zugeordnet.';
          card.style.display = '';
          document.getElementById('btnRunUidMigration').style.display = 'none';
          return;
        }
        const lines = [
          `Aktueller Account: ${currentMember ? currentMember.vorname + ' ' + currentMember.nachname : '(kein Mitarbeiter verknüpft)'}`,
          `Alte Accounts gefunden: ${oldAccounts.length} (${oldAccounts.map(u => u.name || u.email || u.uid.slice(0,8)).join(', ')})`,
          `Kontakte auf alten Mitarbeiter-IDs: ${affectedContacts}`,
        ];
        statusEl.innerHTML = lines.map(l => `<div>• ${l}</div>`).join('');
      }
      card.style.display = '';
    }

    window.runUidMigration = async function() {
      if (getCurrentRole() !== 'admin') return;
      const currentMemberId = getCurrentUserLinkedMemberId();
      if (!currentMemberId) {
        alert('Bitte zuerst deinen Account mit einem Mitarbeiter-Profil verknüpfen (Einstellungen → Benutzer).');
        return;
      }

      const oldAccounts  = (state.userAccounts || []).filter(u => OLD_UIDS.includes(u.uid));
      const oldMemberIds = [...new Set(oldAccounts.map(u => u.memberId).filter(Boolean))];

      let movedContacts = 0;

      // Reassign contacts
      state.contacts.forEach(c => {
        if (oldMemberIds.includes(c.memberId)) {
          c.memberId = currentMemberId;
          movedContacts++;
        }
      });

      if (movedContacts > 0) {
        saveContacts();
      }

      // Remove old userAccount entries (they were dummy accounts, not real users)
      const keepUids = new Set(OLD_UIDS);
      state.userAccounts = (state.userAccounts || []).filter(u => !keepUids.has(u.uid));
      saveUserAccounts();

      const resultEl = document.getElementById('uidMigrationResult');
      if (resultEl) {
        resultEl.textContent = `✅ Migration abgeschlossen: ${movedContacts} Kontakte auf deinen Account übertragen.`;
        resultEl.style.display = '';
        resultEl.style.background = 'rgba(16,185,129,.1)';
        resultEl.style.color = '#065f46';
      }
      document.getElementById('btnRunUidMigration').disabled = true;
      renderKontakte();
      renderUserAccountsList();
    };

    function renderUserAccountsList() {
      const el = document.getElementById('userAccountsList');
      if (!el) return;
      const canManageUsers = hasPermission('user_manage');
      const canAssignAdmin = getCurrentRole() === 'admin';
      const createBtn = document.getElementById('btnCreateUserAccount');
      if (createBtn) createBtn.disabled = !canManageUsers;

      const roleSel = document.getElementById('newUserRole');
      if (roleSel) {
        roleSel.disabled = !canManageUsers;
        if (!canAssignAdmin && roleSel.value === 'admin') roleSel.value = 'manager';
      }

      if (!state.userAccounts || state.userAccounts.length === 0) {
        el.innerHTML = '<div style="color:var(--muted);font-size:12px;text-align:center;padding:10px;">Noch keine User-Accounts erfasst</div>';
        return;
      }

      const byTime = [...state.userAccounts].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
      const memberOpts = state.members.map(m => `<option value="${m.id}">${m.vorname} ${m.nachname} (${m.kuerzel})</option>`).join('');
      el.innerHTML = byTime.map(u => {
        const member = state.members.find(m => m.id === u.memberId);
        const hkmUid = u.uid;
        const hkmProfile = state.hkmProfiles?.[hkmUid];
        const hkmLinked  = hkmProfile?.memberId === u.memberId && !!u.memberId;
        const roleBadgeColor = u.role === 'admin' ? '#ef4444' : u.role === 'manager' ? '#f59e0b' : '#3b82f6';
        const memberSelectVal = u.memberId || '';
        return `
          <div style="padding:10px;border:1px solid ${!u.memberId?'#f59e0b':hkmLinked?'var(--line)':'var(--line)'};border-radius:8px;background:var(--bg);">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
              <div style="font-size:13px;font-weight:600;flex:1;min-width:180px;">${escapeHtml(u.name || u.email || u.uid)}</div>
              <span style="font-size:11px;padding:2px 8px;border-radius:999px;background:${roleBadgeColor}22;color:${roleBadgeColor};border:1px solid ${roleBadgeColor}55;">${u.role || 'user'}</span>
              ${hkmLinked ? '<span style="font-size:10px;padding:1px 6px;border-radius:4px;background:rgba(16,185,129,.12);color:#059669;">✓ VisuMat verknüpft</span>' : '<span style="font-size:10px;padding:1px 6px;border-radius:4px;background:rgba(245,158,11,.12);color:#d97706;">⚠ VisuMat nicht verknüpft</span>'}
            </div>
            <div style="margin-top:4px;font-size:12px;color:var(--muted);">${u.email || ''}</div>
            <div style="margin-top:8px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
              <label class="label" style="margin:0;font-size:11px;">Rolle</label>
              <select class="input-field" style="max-width:130px;${canManageUsers?'':'opacity:.7;'}" ${canManageUsers?'':'disabled'} onchange="updateUserRoleInRegistry('${u.uid}', this.value)">
                <option value="user" ${u.role==='user'?'selected':''}>User</option>
                <option value="manager" ${u.role==='manager'?'selected':''}>Manager</option>
                ${canAssignAdmin?`<option value="admin" ${u.role==='admin'?'selected':''}>Admin</option>`:''}
              </select>
              <label class="label" style="margin:0;font-size:11px;">Mitarbeiter</label>
              <select id="memberSel_${u.uid}" class="input-field" style="flex:1;min-width:150px;${canManageUsers?'':'opacity:.7;'}" ${canManageUsers?'':'disabled'}>
                <option value="">– nicht verknüpft –</option>
                ${memberOpts}
              </select>
              <button class="btn primary" style="padding:4px 10px;font-size:11px;" ${canManageUsers?'':'disabled'} onclick="linkUserToMember('${u.uid}')">💾</button>
              <button class="btn" style="padding:4px 10px;font-size:11px;" ${canManageUsers&&u.email?'':'disabled'} onclick='sendPasswordResetForUser(${JSON.stringify(u.email||"")})'>🔑</button>
            </div>
          </div>
        `;
      }).join('');
      // Set select values after rendering
      byTime.forEach(u => {
        const sel = document.getElementById(`memberSel_${u.uid}`);
        if (sel && u.memberId) sel.value = u.memberId;
      });
    }

    async function sendPasswordResetForUser(email) {
      if (!requirePermission('user_manage', 'Keine Berechtigung für User-Verwaltung')) return;
      const normalizedEmail = String(email || '').trim().toLowerCase();
      if (!normalizedEmail) {
        showToast('❌ Keine E-Mail hinterlegt');
        return;
      }
      if (typeof window.sendFirebasePasswordReset !== 'function') {
        showToast('❌ Firebase Reset-API nicht bereit');
        return;
      }
      try {
        await window.sendFirebasePasswordReset(normalizedEmail);
        showToast(`✅ Passwort-Reset Mail gesendet: ${normalizedEmail}`);
      } catch (e) {
        const code = e?.code || e?.message || 'Fehler';
        const map = {
          'auth/user-not-found': 'E-Mail nicht gefunden',
          'auth/invalid-email': 'Ungültige E-Mail-Adresse',
          'auth/too-many-requests': 'Zu viele Versuche, bitte später erneut',
          'auth/operation-not-allowed': 'Passwort-Reset ist in Firebase nicht aktiviert'
        };
        showToast(`❌ Passwort-Reset fehlgeschlagen: ${map[code] || code}`);
        console.error('Password reset error:', e);
      }
    }

    async function linkUserToMember(uid) {
      if (!hasPermission('user_manage')) return;
      const sel = document.getElementById(`memberSel_${uid}`);
      const memberId = sel?.value || null;
      const acct = (state.userAccounts || []).find(u => u.uid === uid);
      if (!acct) return;
      acct.memberId = memberId;
      acct.updatedAt = new Date().toISOString();
      saveUserAccounts();
      // Sync to HKM profile
      if (typeof window.setHkmProfileMemberId === 'function') {
        try {
          await window.setHkmProfileMemberId(uid, memberId);
          showToast('✅ Mitarbeiter-Verknüpfung gespeichert (inkl. VisuMat)');
        } catch(e) {
          showToast('✅ Gespeichert (VisuMat-Sync fehlgeschlagen: ' + (e?.message||e) + ')');
        }
      } else {
        showToast('✅ Mitarbeiter-Verknüpfung gespeichert');
      }
      renderUserAccountsList();
    }

    async function createUserAccountFromSettings() {
      if (!requirePermission('user_manage', 'Keine Berechtigung für User-Verwaltung')) return;
      if (typeof window.createFirebaseUserAccount !== 'function') {
        showToast('❌ Firebase User-API nicht bereit');
        return;
      }

      const name = (document.getElementById('newUserName')?.value || '').trim();
      const email = (document.getElementById('newUserEmail')?.value || '').trim().toLowerCase();
      const password = document.getElementById('newUserPassword')?.value || '';
      const role = sanitizeAssignableRole(document.getElementById('newUserRole')?.value || 'user');
      const memberId = document.getElementById('newUserMember')?.value || null;

      if (!name || !email || password.length < 6) {
        showToast('❌ Name, E-Mail und Passwort (min. 6) erforderlich');
        return;
      }

      try {
        const result = await window.createFirebaseUserAccount({
          name,
          email,
          password,
          role,
          memberId,
          company: state.settings.company || ''
        });

        // Auto-create member if none selected
        let resolvedMemberId = memberId;
        if (!resolvedMemberId) {
          const parts  = name.trim().split(/\s+/);
          const vorname  = parts[0] || name;
          const nachname = parts.slice(1).join(' ') || '';
          const kuerzel  = ((vorname[0] || '') + (nachname[0] || vorname[1] || '')).toUpperCase() || 'XX';
          const colors   = ['#3b82f6','#f59e0b','#10b981','#8b5cf6','#ef4444','#ec4899'];
          const color    = colors[state.members.length % colors.length];
          const newMember = { id: 'member_' + Date.now() + '_' + Math.random().toString(36).substr(2,4), vorname, nachname, kuerzel, color, email, createdAt: new Date().toISOString() };
          state.members.push(newMember);
          saveMembers();
          resolvedMemberId = newMember.id;
        }

        // Ensure HKM profile has memberId
        if (typeof window.setHkmProfileMemberId === 'function') {
          window.setHkmProfileMemberId(result.uid, resolvedMemberId).catch(console.error);
        }

        const existing = state.userAccounts.find(x => x.uid === result.uid);
        if (existing) {
          existing.name = name; existing.email = email; existing.role = role;
          existing.memberId = resolvedMemberId; existing.updatedAt = new Date().toISOString();
        } else {
          state.userAccounts.push({ uid: result.uid, name, email, role, memberId: resolvedMemberId, createdAt: new Date().toISOString(), createdBy: currentUser?.uid || null });
        }
        saveUserAccounts();
        renderUserAccountsList();
        renderMembersList?.(); populateUserMemberSelect?.(); renderMemberSwitcher?.();

        const nameEl = document.getElementById('newUserName');
        const emailEl = document.getElementById('newUserEmail');
        const passEl = document.getElementById('newUserPassword');
        if (nameEl) nameEl.value = '';
        if (emailEl) emailEl.value = '';
        if (passEl) passEl.value = '';

        if (result?.seeded === false) {
          showToast(`✅ Login erstellt (${email}), aber Startdaten nicht initialisiert (Firebase Rules)`);
        } else {
          showToast(`✅ User erstellt: ${email}`);
        }
      } catch (e) {
        const code = e?.code || e?.message || 'Fehler';
        const map = {
          'auth/email-already-in-use': 'Diese E-Mail existiert bereits',
          'auth/invalid-email': 'Ungültige E-Mail-Adresse',
          'auth/weak-password': 'Passwort ist zu schwach (mind. 6 Zeichen)',
          'auth/operation-not-allowed': 'E-Mail/Passwort Login ist in Firebase nicht aktiviert',
          'permission-denied': 'Firebase Rules blockieren das Schreiben von User-Daten'
        };
        showToast(`❌ User-Erstellung fehlgeschlagen: ${map[code] || code}`);
        console.error('Create user error:', e);
      }
    }

    function renderMemberSwitcher() {
      const container = document.getElementById('memberSwitcherBtns');
      if (!container) return;
      const allActive = !state.activeMember;
      const allBtn = `<button onclick="setActiveMember(null)" style="
        padding:4px 10px; border-radius:999px; font-size:11px; cursor:pointer; font-weight:600;
        background:${allActive ? 'var(--accent)' : 'transparent'};
        color:${allActive ? '#fff' : 'var(--text)'};
        border:1px solid ${allActive ? 'var(--accent)' : 'var(--line)'};
      ">Alle</button>`;
      const memberBtns = state.members.map(m => {
        const isActive = state.activeMember === m.id;
        return `<button onclick="setActiveMember('${m.id}')" style="
          padding:4px 10px; border-radius:999px; font-size:11px; cursor:pointer; font-weight:700;
          background:${isActive ? m.color + '33' : 'transparent'};
          color:${m.color};
          border:2px solid ${isActive ? m.color : m.color + '66'};
        ">${m.kuerzel}</button>`;
      }).join('');
      container.innerHTML = allBtn + memberBtns;
    }

    function setActiveMember(id) {
      state.activeMember = id || null;
      renderMemberSwitcher();
      renderKontakte();
    }

    function renderMemberSelectInModal(selectedId) {
      const sel = document.getElementById('editMemberSelect');
      if (!sel) return;
      sel.innerHTML = '<option value="">Nicht zugewiesen</option>' +
        state.members.map(m => `<option value="${m.id}" ${m.id === selectedId ? 'selected' : ''}>${m.vorname} ${m.nachname} (${m.kuerzel})</option>`).join('');
    }

    function populateBatchMemberSelect() {
      const sel = document.getElementById('batchMemberSelect');
      if (!sel) return;
      sel.innerHTML = '<option value="">Nicht zugewiesen</option>' +
        state.members.map(m => `<option value="${m.id}">${m.vorname} ${m.nachname} (${m.kuerzel})</option>`).join('');
    }

    function renderAnalyticsMemberStats() {
      const el = document.getElementById('analyticsMemberStats');
      if (!el) return;
      if (state.members.length === 0) {
        el.innerHTML = '<div style="color:var(--muted);font-size:12px;padding:8px;">Keine Mitarbeiter angelegt</div>';
        return;
      }
      el.innerHTML = state.members.map(m => {
        const assigned = state.contacts.filter(c => c.memberId === m.id);
        const callstoday = assigned.filter(c => c.status === 'callstoday').length;
        const followuptoday = assigned.filter(c => c.status === 'followuptoday').length;
        return `
          <div style="display:flex; align-items:center; gap:12px; padding:10px 12px; background:var(--bg); border:1px solid var(--line); border-radius:8px; margin-bottom:6px;">
            <span style="background:${m.color}22;border:1px solid ${m.color};color:${m.color};border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;">${m.kuerzel}</span>
            <div style="flex:1;">
              <div style="font-size:13px;font-weight:600;">${m.vorname} ${m.nachname}</div>
              <div style="font-size:11px;color:var(--muted);margin-top:2px;">
                <span style="margin-right:10px;">Kontakte: <strong>${assigned.length}</strong></span>
                <span style="margin-right:10px; color:var(--good);">Heute: <strong>${callstoday}</strong></span>
                <span style="color:var(--warn);">FU Today: <strong>${followuptoday}</strong></span>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    // ─── END TEAM / MITARBEITER ────────────────────────────────────────

    // ─── AUFGABEN MODULE ─────────────────────────────────────────────────────

    // Legacy-Lookup für alte Aufgaben mit code-basierten Typen
    const TASK_TYPES_LEGACY = {
      liUnternehmen: 'LinkedIn Unternehmen',
      liPersoenlich: 'LinkedIn Persönlich',
      blog: 'Blog',
      event: 'Event',
      sonstiges: 'Sonstiges'
    };
    // Gibt den Anzeige-Namen eines Typs zurück (legacy-kompatibel)
    function taskTypeLabel(type) { return TASK_TYPES_LEGACY[type] || type || '–'; }
    // Effektive Typen: aus state oder Defaults
    function getEffectiveTaskTypes() {
      return (state.taskTypes && state.taskTypes.length > 0)
        ? state.taskTypes
        : ['LinkedIn Unternehmen', 'LinkedIn Persönlich', 'Blog', 'Event', 'Sonstiges'];
    }
    function _populateTaskTypeFilter() {
      const sel = document.getElementById('taskFilterType');
      if (!sel) return;
      const cur = sel.value;
      const fromTasks = [...new Set(state.tasks.map(t => t.type).filter(Boolean))];
      const all = [...new Set([...getEffectiveTaskTypes(), ...fromTasks])];
      sel.innerHTML = '<option value="all">Alle Typen</option>' +
        all.map(v => `<option value="${v}"${v===cur?' selected':''}>${taskTypeLabel(v)}</option>`).join('');
    }
    function _populateTaskTypeDatalist() {
      const dl = document.getElementById('taskTypeList');
      if (!dl) return;
      dl.innerHTML = getEffectiveTaskTypes().map(t => `<option value="${t}">`).join('');
    }

    const TASK_STATUS = {
      idee:          { label: '💡 Idee',           color: '#6366f1' },
      geplant:       { label: '📅 Geplant',         color: '#3b82f6' },
      inbearbeitung: { label: '⚙️ In Bearbeitung',  color: '#f59e0b' },
      erledigt:      { label: '✅ Erledigt',         color: '#22c55e' },
      abgesagt:      { label: '❌ Abgesagt',         color: '#ef4444' }
    };

    const TASK_PRIORITY = {
      hoch:   { label: '🔴 Hoch',   color: '#ef4444' },
      mittel: { label: '🟡 Mittel', color: '#f59e0b' },
      tief:   { label: '🟢 Tief',   color: '#22c55e' }
    };

    function _renderTaskFilterExtras() {
      const bfEl = document.getElementById('taskFilterBoard');
      if (bfEl) {
        const cur = state.taskFilterBoard || 'all';
        bfEl.innerHTML = '<option value="all">Alle Boards</option><option value="__none__">Ohne Board</option>' +
          state.boards.map(b => `<option value="${b.id}">${escapeHtml(b.name)}</option>`).join('');
        bfEl.value = cur;
      }
      const ssEl = document.getElementById('taskSortBy');
      if (ssEl) ssEl.value = state.taskListSortBy || 'faelligkeit';
      const dfEl = document.getElementById('taskFilterDateFrom');
      const dtEl = document.getElementById('taskFilterDateTo');
      if (dfEl) dfEl.value = state.taskFilterDateFrom || '';
      if (dtEl) dtEl.value = state.taskFilterDateTo || '';
    }

    function renderTasks() {
      _populateTaskTypeFilter();
      const typeFilter     = document.getElementById('taskFilterType')?.value || 'all';
      const statusFilter   = document.getElementById('taskFilterStatus')?.value || 'all';
      const priorityFilter = document.getElementById('taskFilterPriority')?.value || 'all';
      const boardFilter    = state.taskFilterBoard || 'all';
      const dateFrom       = state.taskFilterDateFrom || '';
      const dateTo         = state.taskFilterDateTo || '';
      const sortBy         = state.taskListSortBy || 'faelligkeit';
      const showCompleted  = state.taskListShowCompleted;

      _renderTaskFilterExtras();

      let filtered = state.tasks.slice();
      if (typeFilter !== 'all')     filtered = filtered.filter(t => t.type === typeFilter);
      if (statusFilter !== 'all')   filtered = filtered.filter(t => t.status === statusFilter);
      if (priorityFilter !== 'all') filtered = filtered.filter(t => t.priority === priorityFilter);
      if (boardFilter === '__none__') filtered = filtered.filter(t => !t.boardId);
      else if (boardFilter !== 'all') filtered = filtered.filter(t => t.boardId === boardFilter);
      if (dateFrom) filtered = filtered.filter(t => !t.dueDate || t.dueDate >= dateFrom);
      if (dateTo)   filtered = filtered.filter(t => !t.dueDate || t.dueDate <= dateTo);

      const open      = filtered.filter(t => !['erledigt','abgesagt'].includes(t.status));
      const completed = filtered.filter(t =>  ['erledigt','abgesagt'].includes(t.status));

      const prioOrder   = { hoch: 0, mittel: 1, tief: 2 };
      const statusOrder = { inbearbeitung: 0, geplant: 1, idee: 2, erledigt: 3, abgesagt: 4 };
      const sortFn = (a, b) => {
        if (sortBy === 'prioritaet') { const d = (prioOrder[a.priority]??9)-(prioOrder[b.priority]??9); if (d!==0) return d; }
        if (sortBy === 'status')     { const d = (statusOrder[a.status]??9)-(statusOrder[b.status]??9); if (d!==0) return d; }
        if (sortBy === 'erstellt')   return new Date(b.createdAt||0)-new Date(a.createdAt||0);
        if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
        return a.dueDate ? -1 : b.dueDate ? 1 : 0;
      };
      open.sort(sortFn);
      completed.sort((a,b) => new Date(b.completedAt||b.updatedAt||0)-new Date(a.completedAt||a.updatedAt||0));

      const today   = new Date().toISOString().split('T')[0];
      const total   = state.tasks.length;
      const done    = state.tasks.filter(t => t.status === 'erledigt').length;
      const inprog  = state.tasks.filter(t => t.status === 'inbearbeitung').length;
      const overdue = state.tasks.filter(t => t.dueDate && t.dueDate < today && !['erledigt','abgesagt'].includes(t.status)).length;
      const statsEl = document.getElementById('aufgabenStats');
      if (statsEl) statsEl.textContent = `${total} Aufgaben · ${done} erledigt · ${inprog} in Bearbeitung${overdue>0?' · ⚠️ '+overdue+' überfällig':''}`;

      const el = document.getElementById('aufgabenListe');
      if (!el) return;

      const fmt = d => new Date(d+'T00:00:00').toLocaleDateString('de-CH',{day:'2-digit',month:'2-digit',year:'numeric'});

      const renderTaskCard = task => {
        const typeLabel  = taskTypeLabel(task.type);
        const statusInfo = TASK_STATUS[task.status] || { label: task.status, color: '#888' };
        const prioInfo   = TASK_PRIORITY[task.priority] || { label: task.priority, color: '#888' };
        const isOverdue  = task.dueDate && task.dueDate < today && !['erledigt','abgesagt'].includes(task.status);
        const isDone     = task.status === 'erledigt' || task.status === 'abgesagt';
        const board      = task.boardId ? state.boards.find(b => b.id === task.boardId) : null;
        const subs       = task.subtasks || [];
        const subTotal   = subs.length;
        const subDone    = subs.filter(s => s.done).length;
        const subPct     = subTotal > 0 ? Math.round((subDone/subTotal)*100) : 0;
        const allSubsDone = subTotal > 0 && subDone === subTotal;
        const leftBorder = isOverdue ? '#ef4444' : allSubsDone && subTotal > 0 ? '#22c55e' : statusInfo.color;

        const subtaskBar = subTotal > 0 ? `
          <div style="margin-top:8px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:3px;">
              <span style="font-size:11px;color:var(--muted);">${subDone}/${subTotal} Erledigt</span>
              <span style="font-size:11px;padding:1px 7px;border-radius:999px;font-weight:600;background:${allSubsDone?'rgba(34,197,94,.15)':'rgba(245,158,11,.1)'};color:${allSubsDone?'#22c55e':'var(--accent)'};">${subPct}%</span>
            </div>
            <div style="height:4px;background:var(--line);border-radius:2px;overflow:hidden;">
              <div style="height:100%;width:${subPct}%;background:${allSubsDone?'#22c55e':'var(--accent)'};border-radius:2px;transition:width .2s;"></div>
            </div>
          </div>` : '';

        const subtaskRows = subTotal > 0 ? `
          <div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--line);">
            ${subs.slice().sort((a,b)=>(a.order??0)-(b.order??0)).map(s=>`
              <div style="display:flex;align-items:center;gap:8px;padding:3px 0;">
                <input type="checkbox" ${s.done?'checked':''} style="accent-color:var(--accent);width:14px;height:14px;cursor:pointer;flex-shrink:0;"
                  onchange="toggleSubtask('${task.id}','${s.id}',this.checked)">
                <span style="font-size:12px;${s.done?'text-decoration:line-through;color:var(--muted);':''}">${escapeHtml(s.text)}</span>
              </div>`).join('')}
          </div>` : '';

        return `<div style="background:var(--card);border:1px solid var(--line);border-left:3px solid ${leftBorder};border-radius:10px;padding:14px 16px;${isDone?'opacity:0.65;':''}">
          <div style="display:flex;gap:14px;align-items:flex-start;">
            <div style="flex:1;min-width:0;">
              <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:6px;">
                <span style="font-size:11px;background:var(--accent-soft);color:var(--accent);padding:2px 8px;border-radius:999px;">${typeLabel}</span>
                <span style="font-size:11px;background:${statusInfo.color}22;color:${statusInfo.color};padding:2px 8px;border-radius:999px;border:1px solid ${statusInfo.color}44;">${statusInfo.label}</span>
                <span style="font-size:11px;color:${prioInfo.color};font-weight:600;">${prioInfo.label}</span>
                ${board?`<span style="font-size:11px;padding:2px 8px;border-radius:999px;background:${board.color}22;color:${board.color};font-weight:600;">📁 ${escapeHtml(board.name)}</span>`:''}
                ${isOverdue?'<span style="font-size:11px;color:#ef4444;font-weight:700;">⚠️ Überfällig</span>':''}
              </div>
              <div style="font-size:14px;font-weight:600;color:var(--text);${isDone?'text-decoration:line-through;':''}">${escapeHtml(task.title)}</div>
              ${task.description?`<div style="font-size:12px;color:var(--muted);margin-top:3px;">${escapeHtml(task.description)}</div>`:''}
              <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:6px;font-size:11px;color:var(--muted);">
                ${task.dueDate?`<span>📅 Fällig: <strong style="color:${isOverdue?'#ef4444':'var(--text)'};">${fmt(task.dueDate)}</strong></span>`:''}
                ${task.type==='event'&&task.eventDate?`<span>📍 Event: <strong>${fmt(task.eventDate)}</strong>${task.eventLocation?' · '+escapeHtml(task.eventLocation):''}</span>`:''}
                ${task.notes?`<span style="font-style:italic;">📝 ${escapeHtml(task.notes)}</span>`:''}
              </div>
              ${subtaskBar}${subtaskRows}
            </div>
            <div style="display:flex;gap:6px;flex-shrink:0;">
              ${!isDone?`<button class="btn" style="padding:4px 10px;font-size:11px;" onclick="quickCompleteTask('${task.id}')" title="Erledigt">✅</button>`:''}
              <button class="btn" style="padding:4px 10px;font-size:11px;" onclick="openTaskModal('${task.id}')">✏️</button>
              <button class="btn" style="padding:4px 10px;font-size:11px;color:#ef4444;" onclick="deleteTask('${task.id}')">🗑️</button>
            </div>
          </div>
        </div>`;
      };

      let html = '';
      if (open.length === 0) {
        html += '<div style="text-align:center;padding:32px;color:var(--muted);font-size:13px;">Keine offenen Aufgaben. Erstelle eine neue Aufgabe oder zeige erledigte an.</div>';
      } else {
        html += '<div style="display:grid;gap:10px;">' + open.map(renderTaskCard).join('') + '</div>';
      }
      if (completed.length > 0) {
        html += `<div style="margin-top:16px;">
          <button onclick="toggleShowCompleted()" style="background:none;border:none;color:var(--muted);font-size:13px;cursor:pointer;padding:6px 0;display:flex;align-items:center;gap:6px;width:100%;">
            ${showCompleted?'▲':'▼'} ${completed.length} erledigte Aufgabe${completed.length!==1?'n':''} ${showCompleted?'verbergen':'anzeigen'}
          </button>
          ${showCompleted?'<div style="display:grid;gap:10px;margin-top:8px;">'+completed.map(renderTaskCard).join('')+'</div>':''}
        </div>`;
      }
      el.innerHTML = html || '<div style="text-align:center;padding:40px;color:var(--muted);font-size:13px;">Keine Aufgaben gefunden.</div>';
    }

    function toggleSubtask(taskId, subId, done) {
      const task = state.tasks.find(t => t.id === taskId);
      if (!task || !task.subtasks) return;
      const sub = task.subtasks.find(s => s.id === subId);
      if (!sub) return;
      sub.done = done;
      sub.completedAt = done ? new Date().toISOString() : null;
      task.updatedAt = new Date().toISOString();
      saveTasks();
      renderTasks();
      if (typeof renderBoardKanban === 'function') renderBoardKanban();
    }

    function toggleShowCompleted() {
      state.taskListShowCompleted = !state.taskListShowCompleted;
      renderTasks();
    }

    function applyTaskFilters() {
      state.taskFilterBoard    = document.getElementById('taskFilterBoard')?.value    || 'all';
      state.taskFilterDateFrom = document.getElementById('taskFilterDateFrom')?.value || '';
      state.taskFilterDateTo   = document.getElementById('taskFilterDateTo')?.value   || '';
      state.taskListSortBy     = document.getElementById('taskSortBy')?.value         || 'faelligkeit';
      renderTasks();
    }

    function resetTaskFilter() {
      const tf = document.getElementById('taskFilterType');
      const sf = document.getElementById('taskFilterStatus');
      const pf = document.getElementById('taskFilterPriority');
      if (tf) tf.value = 'all';
      if (sf) sf.value = 'all';
      if (pf) pf.value = 'all';
      state.taskFilterBoard = 'all';
      state.taskFilterDateFrom = '';
      state.taskFilterDateTo = '';
      state.taskListSortBy = 'faelligkeit';
      _renderTaskFilterExtras();
      renderTasks();
    }

    function getCurrentWeekKey() {
      const now = new Date();
      const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
      d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
      return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
    }

    function getWeekInfoFromKey(weekKey) {
      const m = /^(\d{4})-W(\d{2})$/.exec(weekKey || '');
      if (!m) return null;
      const year = Number(m[1]);
      const week = Number(m[2]);
      const jan4 = new Date(Date.UTC(year, 0, 4));
      const jan4Day = jan4.getUTCDay() || 7;
      const mondayWeek1 = new Date(jan4);
      mondayWeek1.setUTCDate(jan4.getUTCDate() - (jan4Day - 1));
      const start = new Date(mondayWeek1);
      start.setUTCDate(mondayWeek1.getUTCDate() + (week - 1) * 7);
      const end = new Date(start);
      end.setUTCDate(start.getUTCDate() + 6);
      const toIso = d => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
      return {
        weekKey,
        startIso: toIso(start),
        endIso: toIso(end),
        label: `${start.toLocaleDateString('de-CH')} - ${end.toLocaleDateString('de-CH')}`
      };
    }

    function getWeeklyGoals(weekKey) {
      const defaults = {
        completedTasks: 0,
        companyPosts: 0,
        personalPosts: 0,
        events: 0,
        companyFollowers: 0,
        personalConnections: 0,
        sessionCalls: 0,
        sessionOutbound: 0,
        sessionMail: 0,
        sessionFollowup: 0,
        sessionVr: 0
      };
      return { ...defaults, ...(state.weeklyGoals?.[weekKey] || {}) };
    }

    function countLiGrowthForWeek(profile, key, startIso, endIso) {
      const snaps = state.liSnapshots
        .filter(s => s.profile === profile)
        .sort((a, b) => a.date.localeCompare(b.date));
      const baseline = [...snaps].reverse().find(s => s.date <= startIso && s[key] !== undefined);
      const latest = [...snaps].reverse().find(s => s.date <= endIso && s[key] !== undefined);
      if (!baseline || !latest) return 0;
      return Math.max(0, Number(latest[key] || 0) - Number(baseline[key] || 0));
    }

    function saveWeeklyGoalsFromInputs() {
      const weekKey = document.getElementById('taskWeekKey')?.value || getCurrentWeekKey();
      if (!state.weeklyGoals) state.weeklyGoals = {};
      state.weeklyGoals[weekKey] = {
        completedTasks: Number(document.getElementById('goalCompletedTasks')?.value || 0),
        companyPosts: Number(document.getElementById('goalCompanyPosts')?.value || 0),
        personalPosts: Number(document.getElementById('goalPersonalPosts')?.value || 0),
        events: Number(document.getElementById('goalEvents')?.value || 0),
        companyFollowers: Number(document.getElementById('goalCompanyFollowers')?.value || 0),
        personalConnections: Number(document.getElementById('goalPersonalConnections')?.value || 0),
        sessionCalls: Number(document.getElementById('goalSessionCalls')?.value || 0),
        sessionOutbound: Number(document.getElementById('goalSessionOutbound')?.value || 0),
        sessionMail: Number(document.getElementById('goalSessionMail')?.value || 0),
        sessionFollowup: Number(document.getElementById('goalSessionFollowup')?.value || 0),
        sessionVr: Number(document.getElementById('goalSessionVr')?.value || 0)
      };
      saveWeeklyGoals();
      renderTasksAnalytics();
      showToast('✅ Wochenziele gespeichert');
    }

    function addWeeklyChecklistItem() {
      const weekKey = document.getElementById('taskWeekKey')?.value || getCurrentWeekKey();
      const input = document.getElementById('weeklyChecklistInput');
      const text = (input?.value || '').trim();
      if (!text) {
        showToast('❌ Bitte einen Checklistenpunkt eingeben');
        return;
      }
      state.weeklyChecklist.push({
        id: 'wcl_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        weekKey,
        text,
        done: false,
        createdAt: new Date().toISOString()
      });
      saveWeeklyChecklist();
      if (input) input.value = '';
      renderTasksAnalytics();
    }

    function toggleWeeklyChecklistItem(id) {
      const item = state.weeklyChecklist.find(x => x.id === id);
      if (!item) return;
      item.done = !item.done;
      saveWeeklyChecklist();
      renderTasksAnalytics();
    }

    function deleteWeeklyChecklistItem(id) {
      state.weeklyChecklist = state.weeklyChecklist.filter(x => x.id !== id);
      saveWeeklyChecklist();
      renderTasksAnalytics();
    }

    function renderWeeklyGoalSection() {
      const weekInput = document.getElementById('taskWeekKey');
      if (!weekInput) return;
      if (!weekInput.value) weekInput.value = getCurrentWeekKey();

      const weekInfo = getWeekInfoFromKey(weekInput.value) || getWeekInfoFromKey(getCurrentWeekKey());
      const weekKey = weekInfo.weekKey;
      const goals = getWeeklyGoals(weekKey);

      const labelEl = document.getElementById('weeklyRangeLabel');
      if (labelEl) labelEl.textContent = `Kalenderwoche ${weekKey} (${weekInfo.label})`;

      const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = String(val || 0);
      };
      setVal('goalCompletedTasks', goals.completedTasks);
      setVal('goalCompanyPosts', goals.companyPosts);
      setVal('goalPersonalPosts', goals.personalPosts);
      setVal('goalEvents', goals.events);
      setVal('goalCompanyFollowers', goals.companyFollowers);
      setVal('goalPersonalConnections', goals.personalConnections);
      setVal('goalSessionCalls', goals.sessionCalls);
      setVal('goalSessionOutbound', goals.sessionOutbound);
      setVal('goalSessionMail', goals.sessionMail);
      setVal('goalSessionFollowup', goals.sessionFollowup);
      setVal('goalSessionVr', goals.sessionVr);

      const weeklySessionEntries = state.callLog.filter(x => {
        const ts = String(x.timestamp || '').substring(0, 10);
        return ts >= weekInfo.startIso && ts <= weekInfo.endIso;
      });
      const modeCounts = { call: 0, outreach: 0, mail: 0, followup: 0, vr: 0 };
      weeklySessionEntries.forEach(x => {
        const mode = getLogEntryMode(x);
        if (modeCounts[mode] !== undefined) modeCounts[mode] += 1;
      });
      modeCounts.vr = weeklySessionEntries.filter(x => String(x.mode || '').toLowerCase() === 'vr').length;

      const actual = {
        completedTasks: state.tasks.filter(t => t.status === 'erledigt' && t.completedAt && t.completedAt.substring(0, 10) >= weekInfo.startIso && t.completedAt.substring(0, 10) <= weekInfo.endIso).length,
        companyPosts: state.liPosts.filter(p => p.profile === 'company' && p.date >= weekInfo.startIso && p.date <= weekInfo.endIso).length,
        personalPosts: state.liPosts.filter(p => p.profile === 'personal' && p.date >= weekInfo.startIso && p.date <= weekInfo.endIso).length,
        events: state.tasks.filter(t => t.type === 'event' && ((t.eventDate && t.eventDate >= weekInfo.startIso && t.eventDate <= weekInfo.endIso) || (t.dueDate && t.dueDate >= weekInfo.startIso && t.dueDate <= weekInfo.endIso))).length,
        companyFollowers: countLiGrowthForWeek('company', 'followers', weekInfo.startIso, weekInfo.endIso),
        personalConnections: countLiGrowthForWeek('personal', 'connections', weekInfo.startIso, weekInfo.endIso),
        sessionCalls: modeCounts.call,
        sessionOutbound: modeCounts.outreach,
        sessionMail: modeCounts.mail,
        sessionFollowup: modeCounts.followup,
        sessionVr: modeCounts.vr
      };

      const cmpRows = [
        { label: 'Erledigte Aufgaben', key: 'completedTasks' },
        { label: 'Company Posts', key: 'companyPosts' },
        { label: 'Personal Posts', key: 'personalPosts' },
        { label: 'Event-Aktivitäten', key: 'events' },
        { label: 'Neue Company Follower', key: 'companyFollowers' },
        { label: 'Neue persönliche Verbindungen', key: 'personalConnections' },
        { label: 'Session Calls', key: 'sessionCalls' },
        { label: 'Session Outbound (LI)', key: 'sessionOutbound' },
        { label: 'Session Mail', key: 'sessionMail' },
        { label: 'Session Followup', key: 'sessionFollowup' },
        { label: 'Session VR', key: 'sessionVr' }
      ];

      const cmpEl = document.getElementById('weeklyGoalComparison');
      if (cmpEl) {
        cmpEl.innerHTML = cmpRows.map(r => {
          const goal = Number(goals[r.key] || 0);
          const act = Number(actual[r.key] || 0);
          const done = goal <= 0 ? act > 0 : act >= goal;
          const status = goal <= 0 ? (act > 0 ? 'ℹ️ Aktiv' : '–') : (done ? '✅ Erreicht' : '⏳ Offen');
          return `<div style="display:grid; grid-template-columns:1fr 60px 60px 90px; gap:8px; align-items:center; padding:6px 0; border-bottom:1px dashed var(--line); font-size:12px;">
            <div>${r.label}</div>
            <div style="text-align:right; color:var(--muted);">${goal}</div>
            <div style="text-align:right; font-weight:600; color:${done ? '#22c55e' : 'var(--text)'};">${act}</div>
            <div style="text-align:right; color:${done ? '#22c55e' : 'var(--muted)'};">${status}</div>
          </div>`;
        }).join('');
      }

      const weekItems = state.weeklyChecklist.filter(x => x.weekKey === weekKey);
      const checklistEl = document.getElementById('weeklyChecklistList');
      if (checklistEl) {
        if (weekItems.length === 0) {
          checklistEl.innerHTML = '<div style="font-size:12px;color:var(--muted);padding:6px 0;">Noch keine Punkte für diese Woche.</div>';
        } else {
          checklistEl.innerHTML = weekItems.map(item => `
            <div style="display:flex; align-items:center; gap:10px; padding:7px 0; border-bottom:1px dashed var(--line);">
              <input type="checkbox" ${item.done ? 'checked' : ''} onchange="toggleWeeklyChecklistItem('${item.id}')">
              <div style="flex:1; font-size:12px; ${item.done ? 'text-decoration:line-through; color:var(--muted);' : ''}">${item.text}</div>
              <button class="btn" style="padding:2px 8px; font-size:11px; color:#ef4444;" onclick="deleteWeeklyChecklistItem('${item.id}')">🗑️</button>
            </div>
          `).join('');
        }
      }
    }

    function renderTasksAnalytics() {
      const kpiEl = document.getElementById('taskKpiGrid');
      if (!kpiEl) return;

      renderWeeklyGoalSection();

      const today   = new Date().toISOString().split('T')[0];
      const total   = state.tasks.length;
      const done    = state.tasks.filter(t => t.status === 'erledigt').length;
      const inprog  = state.tasks.filter(t => t.status === 'inbearbeitung').length;
      const end7    = new Date(); end7.setDate(end7.getDate() + 7);
      const end7str = end7.toISOString().split('T')[0];
      const week    = state.tasks.filter(t => t.dueDate && t.dueDate >= today && t.dueDate <= end7str && !['erledigt','abgesagt'].includes(t.status)).length;
      const overdue = state.tasks.filter(t => t.dueDate && t.dueDate < today && !['erledigt','abgesagt'].includes(t.status)).length;
      const rate    = total > 0 ? Math.round((done / total) * 100) : 0;

      kpiEl.innerHTML = [
        { label: 'Total Aufgaben',       value: total,         icon: '📋', color: 'var(--accent)' },
        { label: 'Erledigt',             value: done,          icon: '✅', color: '#22c55e' },
        { label: 'In Bearbeitung',       value: inprog,        icon: '⚙️', color: '#f59e0b' },
        { label: 'Diese Woche fällig',   value: week,          icon: '📅', color: '#3b82f6' },
        { label: 'Überfällig',           value: overdue,       icon: '⚠️', color: overdue > 0 ? '#ef4444' : 'var(--muted)' },
        { label: 'Erledigungsquote',     value: rate + '%',    icon: '📈', color: '#8b5cf6' }
      ].map(k => `
        <div class="analytics-kpi-card">
          <div class="kpi-icon">${k.icon}</div>
          <div class="kpi-value" style="color:${k.color};">${k.value}</div>
          <div class="kpi-label">${k.label}</div>
        </div>`).join('');

      const byType = document.getElementById('taskByType');
      if (byType) {
        const usedTypes = [...new Set(state.tasks.map(t => t.type).filter(Boolean))];
        const allTypes  = [...new Set([...getEffectiveTaskTypes(), ...usedTypes])];
        const entries = allTypes.map(v => ({ label: taskTypeLabel(v), count: state.tasks.filter(t => t.type === v).length }))
          .filter(e => e.count > 0);
        if (entries.length === 0) { byType.innerHTML = '<div style="color:var(--muted);font-size:12px;">Keine Daten</div>'; }
        else {
          const max = Math.max(...entries.map(e => e.count), 1);
          byType.innerHTML = entries.map(({ label, count }) => `
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
              <div style="width:145px;font-size:12px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(label)}</div>
              <div style="flex:1;background:var(--bg);border-radius:4px;height:14px;overflow:hidden;">
                <div style="height:100%;background:var(--accent);border-radius:4px;width:${Math.round((count/max)*100)}%;"></div>
              </div>
              <div style="width:22px;text-align:right;font-size:12px;font-weight:600;">${count}</div>
            </div>`).join('');
        }
      }

      const byStatus = document.getElementById('taskByStatus');
      if (byStatus) {
        const entries = Object.entries(TASK_STATUS).map(([key, info]) => ({ label: info.label, color: info.color, count: state.tasks.filter(t => t.status === key).length }));
        const max = Math.max(...entries.map(e => e.count), 1);
        byStatus.innerHTML = entries.map(({ label, color, count }) => `
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
            <div style="width:155px;font-size:12px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${label}</div>
            <div style="flex:1;background:var(--bg);border-radius:4px;height:14px;overflow:hidden;">
              <div style="height:100%;background:${color};border-radius:4px;width:${Math.round((count/max)*100)}%;"></div>
            </div>
            <div style="width:22px;text-align:right;font-size:12px;font-weight:600;">${count}</div>
          </div>`).join('');
      }

      const trendEl = document.getElementById('taskTrend');
      if (trendEl) {
        const doneTasks = state.tasks.filter(t => t.completedAt);
        const monthMap  = {};
        doneTasks.forEach(t => { const m = t.completedAt.substring(0, 7); monthMap[m] = (monthMap[m] || 0) + 1; });
        const months = Object.keys(monthMap).sort().slice(-6);
        if (months.length === 0) {
          trendEl.innerHTML = '<div style="color:var(--muted);font-size:12px;">Noch keine erledigten Aufgaben.</div>';
        } else {
          const maxVal = Math.max(...months.map(m => monthMap[m]), 1);
          trendEl.innerHTML = `<div style="display:flex;gap:8px;align-items:flex-end;height:90px;">` +
            months.map(m => {
              const val = monthMap[m] || 0;
              const pct = Math.max(Math.round((val / maxVal) * 70), 4);
              const lbl = m.substring(5) + '/' + m.substring(2, 4);
              return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;">
                <div style="font-size:11px;font-weight:600;">${val}</div>
                <div style="width:100%;background:var(--accent);border-radius:4px 4px 0 0;height:${pct}px;"></div>
                <div style="font-size:10px;color:var(--muted);">${lbl}</div>
              </div>`;
            }).join('') + '</div>';
        }
      }
    }

    function _populateTaskBoardSelect(selectedId) {
      const sel = document.getElementById('taskBoardId');
      if (!sel) return;
      sel.innerHTML = '<option value="">Kein Board</option>' +
        state.boards.map(b => `<option value="${b.id}"${b.id===selectedId?' selected':''}>${escapeHtml(b.name)}</option>`).join('');
      if (selectedId) sel.value = selectedId;
    }

    function openTaskModal(taskId) {
      const modal = document.getElementById('taskModal');
      if (!modal) return;
      document.getElementById('taskEditId').value = taskId || '';
      document.getElementById('taskModalTitle').textContent = taskId ? 'Aufgabe bearbeiten' : 'Neue Aufgabe';
      if (taskId) {
        const task = state.tasks.find(t => t.id === taskId);
        if (!task) return;
        document.getElementById('taskType').value          = task.type || 'sonstiges';
        document.getElementById('taskTitle').value         = task.title || '';
        document.getElementById('taskDescription').value   = task.description || '';
        document.getElementById('taskStatus').value        = task.status || 'idee';
        document.getElementById('taskPriority').value      = task.priority || 'mittel';
        document.getElementById('taskDueDate').value       = task.dueDate || '';
        document.getElementById('taskEventDate').value     = task.eventDate || '';
        document.getElementById('taskEventLocation').value = task.eventLocation || '';
        document.getElementById('taskNotes').value         = task.notes || '';
        _populateTaskBoardSelect(task.boardId || '');
        renderSubtasksInModal(task.subtasks || []);
      } else {
        document.getElementById('taskType').value          = getEffectiveTaskTypes()[0] || '';
        document.getElementById('taskTitle').value         = '';
        document.getElementById('taskDescription').value   = '';
        document.getElementById('taskStatus').value        = 'geplant';
        document.getElementById('taskPriority').value      = 'mittel';
        document.getElementById('taskDueDate').value       = '';
        document.getElementById('taskEventDate').value     = '';
        document.getElementById('taskEventLocation').value = '';
        document.getElementById('taskNotes').value         = '';
        const preBoard = state.taskFilterBoard !== 'all' && state.taskFilterBoard !== '__none__' ? state.taskFilterBoard : '';
        _populateTaskBoardSelect(preBoard);
        const board = preBoard ? state.boards.find(b => b.id === preBoard) : null;
        const initSubs = board?.templateId
          ? (state.checklistTemplates.find(t => t.id === board.templateId)?.items || []).map(i => ({
              id: 'sub_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
              text: i.text, done: false, completedAt: null, order: i.order
            }))
          : [];
        renderSubtasksInModal(initSubs);
      }
      _populateTaskTypeDatalist();
      _populateSubtaskTemplateSelect();
      modal.classList.add('show');
    }

    function closeTaskModal() { document.getElementById('taskModal')?.classList.remove('show'); }

    function renderSubtasksInModal(subtasks) {
      state._modalSubtasks = subtasks.map(s => ({ ...s }));
      const el = document.getElementById('taskSubtaskEditor');
      if (!el) return;
      const items = (state._modalSubtasks || []).slice().sort((a,b) => (a.order??0)-(b.order??0));
      el.innerHTML =
        (items.length === 0 ? '<div style="color:var(--muted);font-size:12px;padding:4px 0 6px;">Noch keine Teilschritte.</div>' : '') +
        items.map(s => `
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
            <input type="checkbox" ${s.done?'checked':''} style="accent-color:var(--accent);width:14px;height:14px;cursor:pointer;flex-shrink:0;"
              onchange="updateModalSubtaskDone('${s.id}',this.checked)">
            <input type="text" value="${(s.text||'').replace(/"/g,'&quot;')}" class="input-field"
              style="flex:1;padding:4px 8px;font-size:12px;"
              oninput="updateModalSubtaskText('${s.id}',this.value)" placeholder="Teilschritt…">
            <button class="btn" style="padding:2px 8px;font-size:11px;color:var(--danger);" onclick="removeModalSubtask('${s.id}')">✕</button>
          </div>`).join('');
    }

    function _populateSubtaskTemplateSelect() {
      const sel = document.getElementById('taskSubtaskTemplateSelect');
      if (!sel) return;
      sel.innerHTML = '<option value="">Vorlage anwenden...</option>' +
        state.checklistTemplates.map(t => `<option value="${t.id}">${escapeHtml(t.name)}</option>`).join('');
    }

    function addModalSubtask() {
      const id = 'sub_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
      (state._modalSubtasks = state._modalSubtasks || []).push({ id, text: '', done: false, completedAt: null, order: state._modalSubtasks.length });
      renderSubtasksInModal(state._modalSubtasks);
    }
    function removeModalSubtask(subId) {
      state._modalSubtasks = (state._modalSubtasks || []).filter(s => s.id !== subId);
      renderSubtasksInModal(state._modalSubtasks);
    }
    function updateModalSubtaskText(subId, text) {
      const s = (state._modalSubtasks || []).find(x => x.id === subId);
      if (s) s.text = text;
    }
    function updateModalSubtaskDone(subId, done) {
      const s = (state._modalSubtasks || []).find(x => x.id === subId);
      if (s) { s.done = done; s.completedAt = done ? new Date().toISOString() : null; }
    }
    function applyChecklistTemplate(tplId) {
      const tpl = state.checklistTemplates.find(t => t.id === tplId);
      if (!tpl) return;
      state._modalSubtasks = tpl.items.map(item => ({
        id: 'sub_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        text: item.text, done: false, completedAt: null, order: item.order
      }));
      renderSubtasksInModal(state._modalSubtasks);
    }
    function applySelectedTemplate() {
      const sel = document.getElementById('taskSubtaskTemplateSelect');
      if (sel?.value) { applyChecklistTemplate(sel.value); sel.value = ''; }
    }

    function toggleTaskEventFields() {
      const type      = document.getElementById('taskType')?.value;
      const eventFlds = document.getElementById('taskEventFields');
      if (eventFlds) eventFlds.style.display = (type === 'event') ? 'grid' : 'none';
    }

    function saveTaskFromModal() {
      const title = (document.getElementById('taskTitle')?.value || '').trim();
      if (!title) { showToast('❌ Titel ist Pflichtfeld'); return; }
      const taskId = document.getElementById('taskEditId')?.value;
      const now    = new Date().toISOString();
      const status = document.getElementById('taskStatus')?.value || 'geplant';
      if (taskId) {
        const task = state.tasks.find(t => t.id === taskId);
        if (!task) return;
        const wasNotDone = task.status !== 'erledigt';
        task.type          = document.getElementById('taskType').value;
        task.title         = title;
        task.description   = (document.getElementById('taskDescription')?.value || '').trim();
        task.status        = status;
        task.priority      = document.getElementById('taskPriority')?.value || 'mittel';
        task.dueDate       = document.getElementById('taskDueDate')?.value || '';
        task.eventDate     = document.getElementById('taskEventDate')?.value || '';
        task.eventLocation = (document.getElementById('taskEventLocation')?.value || '').trim();
        task.notes         = (document.getElementById('taskNotes')?.value || '').trim();
        task.boardId       = document.getElementById('taskBoardId')?.value || null;
        task.subtasks      = (state._modalSubtasks || []).filter(s => (s.text||'').trim());
        task.updatedAt     = now;
        if (wasNotDone && status === 'erledigt') task.completedAt = now;
      } else {
        state.tasks.push({
          id:            'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
          type:          document.getElementById('taskType').value,
          title,
          description:   (document.getElementById('taskDescription')?.value || '').trim(),
          status,
          priority:      document.getElementById('taskPriority')?.value || 'mittel',
          dueDate:       document.getElementById('taskDueDate')?.value || '',
          eventDate:     document.getElementById('taskEventDate')?.value || '',
          eventLocation: (document.getElementById('taskEventLocation')?.value || '').trim(),
          notes:         (document.getElementById('taskNotes')?.value || '').trim(),
          boardId:       document.getElementById('taskBoardId')?.value || null,
          subtasks:      (state._modalSubtasks || []).filter(s => (s.text||'').trim()),
          completedAt:   status === 'erledigt' ? now : null,
          createdAt:     now,
          updatedAt:     now
        });
      }
      saveTasks();
      closeTaskModal();
      renderTasks();
      if (state.tasksTab === 'analytics') renderTasksAnalytics();
      if (typeof renderBoardKanban === 'function') renderBoardKanban();
      if (typeof renderBoards === 'function') renderBoards();
      if (typeof renderDashboardBoards === 'function') renderDashboardBoards();
      showToast(taskId ? '✅ Aufgabe aktualisiert' : '✅ Aufgabe erstellt');
    }

    function quickCompleteTask(taskId) {
      const task = state.tasks.find(t => t.id === taskId);
      if (!task) return;
      const now      = new Date().toISOString();
      task.status      = 'erledigt';
      task.completedAt = now;
      task.updatedAt   = now;
      saveTasks();
      renderTasks();
      if (state.tasksTab === 'analytics') renderTasksAnalytics();
      showToast('✅ Aufgabe erledigt');
    }

    function deleteTask(taskId) {
      if (!confirm('Aufgabe wirklich löschen?')) return;
      state.tasks = state.tasks.filter(t => t.id !== taskId);
      saveTasks();
      renderTasks();
      if (state.tasksTab === 'analytics') renderTasksAnalytics();
      showToast('🗑️ Aufgabe gelöscht');
    }

    function applyTaskFilter() { applyTaskFilters(); }

    // ─── END AUFGABEN MODULE ───────────────────────────────────────────────────

    // ─── BOARDS MODULE ────────────────────────────────────────────────────────────

    function setAufgabenTab(tab) {
      state.tasksTab = tab;
      document.querySelectorAll('[data-tasks-tab]').forEach(b => {
        b.classList.toggle('active', b.dataset.tasksTab === tab);
        b.style.borderBottom = b.dataset.tasksTab === tab ? '2px solid var(--accent)' : '';
      });
      const views = { list:'aufgabenListTab', boards:'aufgabenBoardsTab', vorlagen:'aufgabenVorlagenTab', analytics:'aufgabenAnalyticsTab', linkedin:'aufgabenLiTab' };
      Object.entries(views).forEach(([k,id]) => { const el=document.getElementById(id); if(el) el.style.display = k===tab?'':'none'; });
      if (tab === 'analytics')  renderTasksAnalytics();
      else if (tab === 'linkedin') renderLiTracking();
      else if (tab === 'boards')  renderBoards();
      else if (tab === 'vorlagen') renderTemplatesList_Checklist();
      else renderTasks();
    }

    function renderBoards() {
      const el = document.getElementById('aufgabenBoardsView');
      if (!el) return;
      const boardCards = state.boards.length === 0
        ? '<div style="text-align:center;padding:40px;color:var(--muted);font-size:13px;">Noch keine Boards erstellt. Klicke auf \"+ Neues Board\".</div>'
        : state.boards.map(b => {
            const tasks  = state.tasks.filter(t => t.boardId === b.id);
            const total  = tasks.length;
            const done   = tasks.filter(t => t.status === 'erledigt').length;
            const inprog = tasks.filter(t => t.status === 'inbearbeitung').length;
            const open   = tasks.filter(t => !['erledigt','abgesagt'].includes(t.status)).length;
            const pct    = total > 0 ? Math.round((done/total)*100) : 0;
            return `<div class="card" style="border-left:4px solid ${b.color||'#3b82f6'};margin-bottom:10px;">
              <div class="card-content" style="padding:14px 16px;">
                <div style="display:flex;align-items:flex-start;gap:12px;">
                  <div style="flex:1;min-width:0;">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                      <div style="width:12px;height:12px;border-radius:50%;background:${b.color||'#3b82f6'};flex-shrink:0;"></div>
                      <span style="font-size:15px;font-weight:700;">${escapeHtml(b.name)}</span>
                    </div>
                    ${b.description?`<div style="font-size:12px;color:var(--muted);margin-bottom:8px;">${escapeHtml(b.description)}</div>`:''}
                    <div style="display:flex;gap:14px;font-size:12px;color:var(--muted);margin-bottom:8px;flex-wrap:wrap;">
                      <span>${total} Aufgaben</span>
                      <span style="color:#22c55e;">✓ ${done} erledigt</span>
                      <span style="color:#f59e0b;">⚙ ${inprog} in Bearbeitung</span>
                      <span>${open} offen</span>
                    </div>
                    <div style="display:flex;align-items:center;gap:8px;">
                      <div style="flex:1;height:6px;background:var(--line);border-radius:3px;overflow:hidden;">
                        <div style="height:100%;width:${pct}%;background:${b.color||'#3b82f6'};border-radius:3px;transition:width .3s;"></div>
                      </div>
                      <span style="font-size:11px;color:var(--muted);white-space:nowrap;">${done}/${total} · ${pct}%</span>
                    </div>
                  </div>
                  <div style="display:flex;gap:6px;flex-shrink:0;flex-wrap:wrap;">
                    <button class="btn primary" style="padding:4px 10px;font-size:11px;" onclick="openBoardKanban('${b.id}')">📋 Kanban</button>
                    <button class="btn" style="padding:4px 10px;font-size:11px;" onclick="openBoardModal('${b.id}')">✏️</button>
                    <button class="btn" style="padding:4px 10px;font-size:11px;color:var(--danger);" onclick="deleteBoard('${b.id}')">🗑️</button>
                  </div>
                </div>
              </div>
            </div>`;
          }).join('');
      el.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
          <div style="font-size:16px;font-weight:700;">📁 Boards</div>
          <button class="btn primary" onclick="openBoardModal()">+ Neues Board</button>
        </div>
        ${boardCards}`;
    }

    function openBoardModal(boardId) {
      const modal = document.getElementById('boardModal');
      if (!modal) return;
      document.getElementById('boardEditId').value = boardId || '';
      document.getElementById('boardModalTitle').textContent = boardId ? 'Board bearbeiten' : 'Neues Board';
      const board = boardId ? state.boards.find(x => x.id === boardId) : null;
      document.getElementById('boardName').value        = board?.name || '';
      document.getElementById('boardColor').value       = board?.color || '#3b82f6';
      document.getElementById('boardDescription').value = board?.description || '';
      const tplSel = document.getElementById('boardTemplateId');
      if (tplSel) {
        const cur = board?.templateId || '';
        tplSel.innerHTML = '<option value="">Keine Vorlage</option>' +
          state.checklistTemplates.map(t => `<option value="${t.id}"${t.id===cur?' selected':''}>${escapeHtml(t.name)}</option>`).join('');
        tplSel.value = cur;
      }
      modal.style.display = 'flex';
    }

    function closeBoardModal() { const m=document.getElementById('boardModal'); if(m) m.style.display='none'; }

    function saveBoardFromModal() {
      const name = (document.getElementById('boardName')?.value || '').trim();
      if (!name) { showToast('❌ Board-Name ist Pflichtfeld'); return; }
      const boardId = document.getElementById('boardEditId')?.value;
      const now = new Date().toISOString();
      if (boardId) {
        const b = state.boards.find(x => x.id === boardId);
        if (!b) return;
        b.name        = name;
        b.color       = document.getElementById('boardColor')?.value || '#3b82f6';
        b.description = (document.getElementById('boardDescription')?.value || '').trim();
        b.templateId  = document.getElementById('boardTemplateId')?.value || null;
        b.updatedAt   = now;
      } else {
        state.boards.push({
          id: 'board_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
          name, color: document.getElementById('boardColor')?.value || '#3b82f6',
          description: (document.getElementById('boardDescription')?.value || '').trim(),
          templateId: document.getElementById('boardTemplateId')?.value || null,
          createdAt: now, updatedAt: now
        });
      }
      saveBoards();
      closeBoardModal();
      renderBoards();
      renderDashboardBoards();
      showToast(boardId ? '✅ Board aktualisiert' : '✅ Board erstellt');
    }

    function deleteBoard(boardId) {
      if (!confirm('Board wirklich löschen? Aufgaben bleiben erhalten, werden aber vom Board gelöst.')) return;
      state.boards = state.boards.filter(b => b.id !== boardId);
      state.tasks.forEach(t => { if (t.boardId === boardId) { t.boardId = null; t.updatedAt = new Date().toISOString(); } });
      saveBoards(); saveTasks();
      renderBoards(); renderTasks(); renderDashboardBoards();
      showToast('🗑️ Board gelöscht');
    }

    function openBoardKanban(boardId) {
      state.activeBoardId = boardId;
      state.boardsSubView = 'kanban';
      const lv = document.getElementById('aufgabenBoardsView');
      const kv = document.getElementById('aufgabenBoardsKanbanView');
      if (lv) lv.style.display = 'none';
      if (kv) kv.style.display = '';
      renderBoardKanban();
    }

    function closeBoardKanban() {
      state.activeBoardId = null;
      state.boardsSubView = 'list';
      const lv = document.getElementById('aufgabenBoardsView');
      const kv = document.getElementById('aufgabenBoardsKanbanView');
      if (lv) lv.style.display = '';
      if (kv) kv.style.display = 'none';
      renderBoards();
    }

    function renderBoardKanban() {
      const el = document.getElementById('aufgabenBoardsKanbanView');
      if (!el) return;
      const board = state.boards.find(b => b.id === state.activeBoardId);
      if (!board) { el.innerHTML = ''; return; }
      const COLS = [
        { key:'offen',    label:'Offen',          statuses:['idee','geplant'],     color:'#3b82f6' },
        { key:'inprog',   label:'In Bearbeitung',  statuses:['inbearbeitung'],       color:'#f59e0b' },
        { key:'erledigt', label:'Erledigt',         statuses:['erledigt','abgesagt'], color:'#22c55e' }
      ];
      const tasks   = state.tasks.filter(t => t.boardId === state.activeBoardId);
      const today   = new Date().toISOString().split('T')[0];
      const fmt     = d => new Date(d+'T00:00:00').toLocaleDateString('de-CH',{day:'2-digit',month:'2-digit'});
      const po      = { hoch:0, mittel:1, tief:2 };
      const boardId = state.activeBoardId || '';

      const renderCard = (t, colKey) => {
        const subs  = t.subtasks || [];
        const sd    = subs.filter(s => s.done).length;
        const isOv  = t.dueDate && t.dueDate < today && colKey !== 'erledigt';
        const prio  = TASK_PRIORITY[t.priority] || { color:'#888' };
        const sp    = subs.length > 0 ? Math.round((sd / subs.length) * 100) : 0;
        const isDone = colKey === 'erledigt';

        // quick-action buttons depending on column
        const actionBtns = isDone
          ? `<button class="btn" style="font-size:11px;padding:2px 8px;" title="Zurücksetzen"
               onclick="event.stopPropagation();kanbanSetStatus('${t.id}','geplant')">↩ Zurücksetzen</button>`
          : colKey === 'inprog'
          ? `<button class="btn" style="font-size:11px;padding:2px 8px;background:#22c55e;color:#fff;border-color:#22c55e;"
               onclick="event.stopPropagation();kanbanSetStatus('${t.id}','erledigt')">✅ Erledigt</button>`
          : `<button class="btn" style="font-size:11px;padding:2px 8px;background:#f59e0b;color:#fff;border-color:#f59e0b;"
               onclick="event.stopPropagation();kanbanSetStatus('${t.id}','inbearbeitung')">▶ In Bearbeitung</button>`;

        // subtask list
        const subsList = subs.length === 0 ? '' : `
          <div style="margin-top:8px;display:flex;flex-direction:column;gap:4px;" onclick="event.stopPropagation()">
            ${subs.map(s => `
              <label style="display:flex;align-items:flex-start;gap:7px;cursor:pointer;font-size:12px;line-height:1.4;">
                <input type="checkbox" ${s.done?'checked':''} style="accent-color:var(--accent);margin-top:2px;flex-shrink:0;"
                  onchange="toggleSubtask('${t.id}','${s.id}',this.checked)">
                <span style="${s.done?'text-decoration:line-through;color:var(--muted);':''}">${escapeHtml(s.text||'–')}</span>
              </label>`).join('')}
          </div>`;

        return `<div style="background:var(--card);border:1px solid var(--line);border-left:3px solid ${prio.color};border-radius:6px;padding:10px 12px;cursor:pointer;${isDone?'opacity:.7':''}"
             onclick="openTaskModal('${t.id}')">
          <div style="font-size:13px;font-weight:600;margin-bottom:5px;${isDone?'text-decoration:line-through;color:var(--muted);':''}">${escapeHtml(t.title)}</div>
          ${t.dueDate ? `<div style="font-size:11px;color:${isOv?'#ef4444':'var(--muted)'};margin-bottom:4px;">${isOv?'⚠️ überfällig · ':'📅 '}${fmt(t.dueDate)}</div>` : ''}
          ${subs.length > 0 ? `
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
              <div style="flex:1;height:3px;background:var(--line);border-radius:2px;overflow:hidden;">
                <div style="height:100%;width:${sp}%;background:${sp===100?'#22c55e':'var(--accent)'};border-radius:2px;transition:width .2s;"></div>
              </div>
              <span style="font-size:11px;color:var(--muted);white-space:nowrap;">${sd}/${subs.length}</span>
            </div>` : ''}
          ${subsList}
          <div style="margin-top:8px;" onclick="event.stopPropagation()">${actionBtns}</div>
        </div>`;
      };

      el.innerHTML = `
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">
          <button class="btn" onclick="closeBoardKanban()">← Zurück</button>
          <span style="font-size:16px;font-weight:700;color:${board.color||'var(--accent)'};">${escapeHtml(board.name)}</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;align-items:start;">` +
        COLS.map(col => {
          const colTasks = tasks.filter(t => col.statuses.includes(t.status)).sort((a,b)=>(po[a.priority]??9)-(po[b.priority]??9));
          return `<div style="background:var(--bg);border:1px solid var(--line);border-top:3px solid ${col.color};border-radius:8px;padding:12px;">
            <div style="font-size:12px;font-weight:700;color:${col.color};text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px;">
              ${col.label} <span style="font-weight:400;color:var(--muted);">(${colTasks.length})</span>
            </div>
            <div style="display:grid;gap:8px;">
              ${colTasks.length === 0
                ? `<div style="color:var(--muted);font-size:12px;text-align:center;padding:12px 0;">Keine Aufgaben</div>`
                : colTasks.map(t => renderCard(t, col.key)).join('')}
            </div>
            <button class="btn" style="width:100%;margin-top:10px;font-size:12px;"
              onclick="(function(){openTaskModal();setTimeout(function(){var s=document.getElementById('taskBoardId');if(s)s.value='${boardId}'},50)})()">
              + Aufgabe
            </button>
          </div>`;
        }).join('') + `</div>`;
    }

    window.kanbanSetStatus = function(taskId, status) {
      const task = state.tasks.find(t => t.id === taskId);
      if (!task) return;
      task.status    = status;
      task.updatedAt = new Date().toISOString();
      if (status === 'erledigt') task.completedAt = task.updatedAt;
      saveTasks();
      renderBoardKanban();
      renderDashboardBoards();
    };

    // ─── CHECKLIST TEMPLATES MODULE ───────────────────────────────────────────────

    function renderTemplatesList_Checklist() {
      const el = document.getElementById('aufgabenVorlagenView');
      if (!el) return;

      // ── Board-Vorlagen ─────────────────────────────────────────────────────
      const btplCards = state.boardTemplates.length === 0
        ? '<div style="text-align:center;padding:24px;color:var(--muted);font-size:13px;">Noch keine Board-Vorlagen. Klicke auf \"+ Neue Board-Vorlage\".</div>'
        : state.boardTemplates.map(t => {
            const taskCount = (t.taskTemplates || []).length;
            return `<div class="card" style="border-left:4px solid ${t.color||'#3b82f6'};margin-bottom:10px;">
              <div class="card-content" style="padding:14px 16px;">
                <div style="display:flex;align-items:flex-start;gap:12px;">
                  <div style="flex:1;min-width:0;">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                      <div style="width:11px;height:11px;border-radius:50%;background:${t.color||'#3b82f6'};flex-shrink:0;"></div>
                      <span style="font-size:15px;font-weight:700;">${escapeHtml(t.name)}</span>
                    </div>
                    ${t.description?`<div style="font-size:12px;color:var(--muted);margin-bottom:6px;">${escapeHtml(t.description)}</div>`:''}
                    <div style="font-size:12px;color:var(--muted);margin-bottom:6px;">${taskCount} Aufgabe${taskCount!==1?'n':''} vordefiniert</div>
                    <div>${(t.taskTemplates||[]).slice(0,4).map(tt=>`<span style="display:inline-block;background:var(--accent-soft);color:var(--accent);padding:1px 7px;border-radius:4px;margin:2px;font-size:11px;">${escapeHtml(tt.title||'–')}</span>`).join('')}${taskCount>4?`<span style="font-size:11px;color:var(--muted);"> +${taskCount-4} weitere</span>`:''}</div>
                  </div>
                  <div style="display:flex;gap:6px;flex-shrink:0;flex-wrap:wrap;">
                    <button class="btn primary" style="padding:4px 10px;font-size:11px;" onclick="openBoardInstantiateModal('${t.id}')">🚀 Board erstellen</button>
                    <button class="btn" style="padding:4px 10px;font-size:11px;" onclick="openBoardTemplateModal('${t.id}')">✏️</button>
                    <button class="btn" style="padding:4px 10px;font-size:11px;color:var(--danger);" onclick="deleteBoardTemplate('${t.id}')">🗑️</button>
                  </div>
                </div>
              </div>
            </div>`;
          }).join('');

      // ── Checklisten-Vorlagen ───────────────────────────────────────────────
      const cltCards = state.checklistTemplates.length === 0
        ? '<div style="text-align:center;padding:24px;color:var(--muted);font-size:13px;">Noch keine Checklisten-Vorlagen. Klicke auf \"+ Neue Vorlage\".</div>'
        : state.checklistTemplates.map(t => `
          <div class="card" style="margin-bottom:10px;">
            <div class="card-content" style="padding:14px 16px;">
              <div style="display:flex;align-items:flex-start;gap:12px;">
                <div style="flex:1;min-width:0;">
                  <div style="font-size:15px;font-weight:700;margin-bottom:4px;">📋 ${escapeHtml(t.name)}</div>
                  <div style="font-size:12px;color:var(--muted);margin-bottom:6px;">${t.items.length} Punkt${t.items.length!==1?'e':''}</div>
                  <div>${t.items.slice(0,4).map(i=>`<span style="display:inline-block;background:var(--accent-soft);color:var(--accent);padding:1px 7px;border-radius:4px;margin:2px;font-size:11px;">${escapeHtml(i.text)}</span>`).join('')}${t.items.length>4?`<span style="font-size:11px;color:var(--muted);"> +${t.items.length-4} weitere</span>`:''}</div>
                </div>
                <div style="display:flex;gap:6px;flex-shrink:0;">
                  <button class="btn" style="padding:4px 10px;font-size:11px;" onclick="openChecklistTemplateModal('${t.id}')">✏️</button>
                  <button class="btn" style="padding:4px 10px;font-size:11px;color:var(--danger);" onclick="deleteChecklistTemplate('${t.id}')">🗑️</button>
                </div>
              </div>
            </div>
          </div>`).join('');

      el.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <div style="font-size:16px;font-weight:700;">📁 Board-Vorlagen</div>
          <button class="btn primary" onclick="openBoardTemplateModal()">+ Neue Board-Vorlage</button>
        </div>
        ${btplCards}
        <div style="display:flex;justify-content:space-between;align-items:center;margin:20px 0 10px;">
          <div style="font-size:16px;font-weight:700;">📋 Checklisten-Vorlagen</div>
          <button class="btn primary" onclick="openChecklistTemplateModal()">+ Neue Vorlage</button>
        </div>
        ${cltCards}`;
    }

    function openChecklistTemplateModal(tplId) {
      const modal = document.getElementById('checklistTemplateModal');
      if (!modal) return;
      document.getElementById('cltEditId').value = tplId || '';
      document.getElementById('cltModalTitle').textContent = tplId ? 'Vorlage bearbeiten' : 'Neue Vorlage';
      if (tplId) {
        const tpl = state.checklistTemplates.find(t => t.id === tplId);
        if (!tpl) return;
        document.getElementById('cltName').value = tpl.name || '';
        state._cltItems = tpl.items.map(i => ({ ...i }));
      } else {
        document.getElementById('cltName').value = '';
        state._cltItems = [];
      }
      renderCltItems();
      modal.style.display = 'flex';
    }

    function closeChecklistTemplateModal() { const m=document.getElementById('checklistTemplateModal'); if(m) m.style.display='none'; }

    function renderCltItems() {
      const el = document.getElementById('cltItemsEditor');
      if (!el) return;
      const items = (state._cltItems || []).slice().sort((a,b)=>(a.order??0)-(b.order??0));
      el.innerHTML =
        (items.length===0?'<div style="color:var(--muted);font-size:12px;padding:4px 0;">Noch keine Punkte.</div>':'') +
        items.map(item=>`
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
            <span style="font-size:12px;color:var(--muted);width:22px;text-align:right;flex-shrink:0;">${(item.order||0)+1}.</span>
            <input type="text" value="${(item.text||'').replace(/"/g,'&quot;')}" class="input-field"
              style="flex:1;padding:4px 8px;font-size:12px;"
              oninput="updateCltItemText('${item.id}',this.value)" placeholder="Schritt…">
            <button class="btn" style="padding:2px 8px;font-size:11px;color:var(--danger);" onclick="removeCltItem('${item.id}')">✕</button>
          </div>`).join('') +
        `<button class="btn" style="font-size:12px;margin-top:6px;" onclick="addCltItem()">+ Punkt hinzufügen</button>`;
    }

    function addCltItem() {
      (state._cltItems = state._cltItems||[]).push({ id:'item_'+Date.now()+'_'+Math.random().toString(36).substr(2,4), text:'', order:state._cltItems.length });
      renderCltItems();
    }
    function removeCltItem(id) { state._cltItems=(state._cltItems||[]).filter(x=>x.id!==id); renderCltItems(); }
    function updateCltItemText(id, text) { const i=(state._cltItems||[]).find(x=>x.id===id); if(i) i.text=text; }

    function saveChecklistTemplateFromModal() {
      const name = (document.getElementById('cltName')?.value || '').trim();
      if (!name) { showToast('❌ Name ist Pflichtfeld'); return; }
      const tplId = document.getElementById('cltEditId')?.value;
      const now   = new Date().toISOString();
      const items = (state._cltItems||[]).filter(i=>(i.text||'').trim()).map((i,idx)=>({...i,order:idx}));
      if (tplId) {
        const tpl = state.checklistTemplates.find(t => t.id === tplId);
        if (!tpl) return;
        tpl.name = name; tpl.items = items; tpl.updatedAt = now;
      } else {
        state.checklistTemplates.push({ id:'tpl_'+Date.now()+'_'+Math.random().toString(36).substr(2,6), name, items, createdAt:now, updatedAt:now });
      }
      saveChecklistTemplates();
      closeChecklistTemplateModal();
      renderTemplatesList_Checklist();
      showToast(tplId ? '✅ Vorlage aktualisiert' : '✅ Vorlage erstellt');
    }

    function deleteChecklistTemplate(tplId) {
      if (!confirm('Vorlage wirklich löschen?')) return;
      state.checklistTemplates = state.checklistTemplates.filter(t => t.id !== tplId);
      state.boards.forEach(b => { if (b.templateId===tplId) { b.templateId=null; b.updatedAt=new Date().toISOString(); } });
      saveChecklistTemplates(); saveBoards();
      renderTemplatesList_Checklist(); renderBoards();
      showToast('🗑️ Vorlage gelöscht');
    }

    // ─── BOARD TEMPLATES MODULE ──────────────────────────────────────────────────

    function openBoardTemplateModal(btplId) {
      const modal = document.getElementById('boardTemplateModal');
      if (!modal) return;
      document.getElementById('btplEditId').value = btplId || '';
      document.getElementById('btplModalTitle').textContent = btplId ? 'Board-Vorlage bearbeiten' : 'Neue Board-Vorlage';
      const tpl = btplId ? state.boardTemplates.find(t => t.id === btplId) : null;
      document.getElementById('btplName').value        = tpl?.name || '';
      document.getElementById('btplColor').value       = tpl?.color || '#3b82f6';
      document.getElementById('btplDescription').value = tpl?.description || '';
      state._btplTasks = tpl ? (tpl.taskTemplates || []).map(t => ({...t})) : [];
      _renderBtplTasks();
      modal.style.display = 'flex';
    }

    function closeBoardTemplateModal() { const m=document.getElementById('boardTemplateModal'); if(m) m.style.display='none'; }

    function saveBoardTemplateFromModal() {
      const name = (document.getElementById('btplName')?.value || '').trim();
      if (!name) { showToast('❌ Name ist Pflichtfeld'); return; }
      const btplId = document.getElementById('btplEditId')?.value;
      const now    = new Date().toISOString();
      const tasks  = (state._btplTasks || []).filter(t => t.title?.trim()).map((t,i) => ({...t, order:i}));
      if (btplId) {
        const tpl = state.boardTemplates.find(t => t.id === btplId);
        if (!tpl) return;
        tpl.name          = name;
        tpl.color         = document.getElementById('btplColor')?.value || '#3b82f6';
        tpl.description   = (document.getElementById('btplDescription')?.value || '').trim();
        tpl.taskTemplates = tasks;
        tpl.updatedAt     = now;
      } else {
        state.boardTemplates.push({
          id: 'btpl_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
          name, color: document.getElementById('btplColor')?.value || '#3b82f6',
          description: (document.getElementById('btplDescription')?.value || '').trim(),
          taskTemplates: tasks,
          createdAt: now, updatedAt: now
        });
      }
      saveBoardTemplates();
      closeBoardTemplateModal();
      renderTemplatesList_Checklist();
      showToast(btplId ? '✅ Board-Vorlage aktualisiert' : '✅ Board-Vorlage erstellt');
    }

    function deleteBoardTemplate(btplId) {
      if (!confirm('Board-Vorlage löschen? Bestehende Boards werden nicht beeinflusst.')) return;
      state.boardTemplates = state.boardTemplates.filter(t => t.id !== btplId);
      saveBoardTemplates();
      renderTemplatesList_Checklist();
      showToast('🗑️ Board-Vorlage gelöscht');
    }

    function _renderBtplTasks() {
      const el = document.getElementById('btplTasksEditor');
      if (!el) return;
      const tasks = (state._btplTasks || []).slice().sort((a,b) => (a.order??0)-(b.order??0));
      if (tasks.length === 0) {
        el.innerHTML = '<div style="color:var(--muted);font-size:12px;padding:8px 0;">Noch keine Aufgaben definiert.</div>';
        return;
      }
      const cltOpts = '<option value="">Keine Checklisten-Vorlage</option>' +
        state.checklistTemplates.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
      const prioColors = { hoch:'#ef4444', mittel:'#f59e0b', tief:'#22c55e' };
      el.innerHTML = tasks.map((t,i) => `
        <div style="background:var(--bg);border:1px solid var(--line);border-left:3px solid ${prioColors[t.priority]||'#888'};border-radius:8px;padding:10px 12px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
            <span style="font-size:12px;color:var(--muted);flex-shrink:0;">#${i+1}</span>
            <input type="text" value="${(t.title||'').replace(/"/g,'&quot;')}" class="input-field"
              style="flex:1;padding:4px 8px;font-size:13px;font-weight:600;"
              oninput="updateBtplTaskField('${t.id}','title',this.value)" placeholder="Aufgaben-Titel *">
            <button class="btn" style="padding:2px 8px;font-size:11px;color:var(--danger);flex-shrink:0;" onclick="removeBtplTask('${t.id}')">✕</button>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">
            <div>
              <div style="font-size:11px;color:var(--muted);margin-bottom:3px;">Priorität</div>
              <select class="input-field" style="width:100%;font-size:12px;padding:3px 6px;"
                onchange="updateBtplTaskField('${t.id}','priority',this.value)">
                <option value="hoch"${t.priority==='hoch'?' selected':''}>🔴 Hoch</option>
                <option value="mittel"${t.priority==='mittel'?' selected':''}>🟡 Mittel</option>
                <option value="tief"${t.priority==='tief'?' selected':''}>🟢 Tief</option>
              </select>
            </div>
            <div>
              <div style="font-size:11px;color:var(--muted);margin-bottom:3px;">Status</div>
              <select class="input-field" style="width:100%;font-size:12px;padding:3px 6px;"
                onchange="updateBtplTaskField('${t.id}','status',this.value)">
                <option value="idee"${t.status==='idee'?' selected':''}>💡 Idee</option>
                <option value="geplant"${t.status==='geplant'?' selected':''}>📅 Geplant</option>
                <option value="inbearbeitung"${t.status==='inbearbeitung'?' selected':''}>⚙️ In Bearbeitung</option>
              </select>
            </div>
            <div>
              <div style="font-size:11px;color:var(--muted);margin-bottom:3px;">Checklisten-Vorlage</div>
              <select class="input-field" style="width:100%;font-size:12px;padding:3px 6px;"
                onchange="updateBtplTaskField('${t.id}','checklistTemplateId',this.value)">
                ${cltOpts.replace(`value="${t.checklistTemplateId||''}"`,`value="${t.checklistTemplateId||''}" selected`)}
              </select>
            </div>
          </div>
        </div>`).join('');
    }

    window.addBtplTask = function() {
      const id = 'ttempl_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
      (state._btplTasks = state._btplTasks || []).push({ id, title:'', type:'', priority:'mittel', status:'geplant', checklistTemplateId:null, order: state._btplTasks.length });
      _renderBtplTasks();
    };

    window.removeBtplTask = function(id) {
      state._btplTasks = (state._btplTasks || []).filter(t => t.id !== id).map((t,i) => ({...t, order:i}));
      _renderBtplTasks();
    };

    window.updateBtplTaskField = function(id, field, value) {
      const t = (state._btplTasks || []).find(t => t.id === id);
      if (t) { t[field] = value || null; if (field === 'priority') _renderBtplTasks(); }
    };

    window.openBoardInstantiateModal = function(btplId) {
      const modal = document.getElementById('boardInstantiateModal');
      if (!modal) return;
      const tpl = state.boardTemplates.find(t => t.id === btplId);
      if (!tpl) return;
      document.getElementById('boardInstantiateTplId').value = btplId;
      document.getElementById('boardInstantiateName').value  = tpl.name;
      const taskCount = (tpl.taskTemplates || []).length;
      document.getElementById('boardInstantiateInfo').textContent =
        `Erstellt ein neues Board auf Basis von „${tpl.name}" mit ${taskCount} vordefinierten Aufgabe${taskCount!==1?'n':''}.`;
      modal.style.display = 'flex';
      setTimeout(() => document.getElementById('boardInstantiateName')?.select(), 50);
    };

    window.closeBoardInstantiateModal = function() {
      const m = document.getElementById('boardInstantiateModal'); if(m) m.style.display='none';
    };

    window.createBoardFromTemplate = function() {
      const btplId = document.getElementById('boardInstantiateTplId')?.value;
      const name   = (document.getElementById('boardInstantiateName')?.value || '').trim();
      if (!name) { showToast('❌ Board-Name ist Pflichtfeld'); return; }
      const tpl = state.boardTemplates.find(t => t.id === btplId);
      if (!tpl) return;
      const now     = new Date().toISOString();
      const boardId = 'board_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
      state.boards.push({ id: boardId, name, color: tpl.color || '#3b82f6', description: tpl.description || '', templateId: null, createdAt: now, updatedAt: now });

      (tpl.taskTemplates || []).forEach((tt, i) => {
        const subtasks = tt.checklistTemplateId
          ? (state.checklistTemplates.find(c => c.id === tt.checklistTemplateId)?.items || [])
              .map(item => ({ id: 'sub_' + Date.now() + '_' + Math.random().toString(36).substr(2,4) + '_' + i, text: item.text, done: false, completedAt: null, order: item.order }))
          : [];
        state.tasks.push({
          id:          'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6) + '_' + i,
          boardId, title: tt.title || 'Aufgabe', type: tt.type || 'sonstiges',
          status: tt.status || 'geplant', priority: tt.priority || 'mittel',
          description: '', notes: '', dueDate: '', eventDate: '', eventLocation: '',
          subtasks, createdAt: now, updatedAt: now
        });
      });

      saveBoards(); saveTasks();
      closeBoardInstantiateModal();
      setAufgabenTab('boards');
      renderBoards(); renderDashboardBoards();
      showToast(`✅ Board „${name}" mit ${(tpl.taskTemplates||[]).length} Aufgaben erstellt`);
    };

    // ─── DASHBOARD BOARDS WIDGET ─────────────────────────────────────────────────

    function renderDashboardBoards() {
      const el = document.getElementById('dashboardBoardsWidget');
      if (!el) return;
      if (!state.boards || state.boards.length === 0) { el.style.display = 'none'; return; }
      el.style.display = '';
      const shown = state.boards.slice(0, 4);
      el.innerHTML = `<div class="card" style="margin-bottom:16px;">
        <div class="card-content" style="padding:14px 16px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
            <div style="font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;">📁 Boards · Projektübersicht</div>
            <button class="btn" style="font-size:11px;padding:3px 10px;" onclick="setView('aufgaben');setTimeout(()=>setAufgabenTab('boards'),50)">Alle Boards →</button>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:10px;">
            ${shown.map(b => {
              const tasks = state.tasks.filter(t => t.boardId === b.id);
              const total = tasks.length;
              const done  = tasks.filter(t => t.status === 'erledigt').length;
              const pct   = total > 0 ? Math.round((done/total)*100) : 0;
              return `<div style="background:var(--bg);border:1px solid var(--line);border-left:3px solid ${b.color||'#3b82f6'};border-radius:8px;padding:10px 12px;cursor:pointer;"
                   onclick="setView('aufgaben');setTimeout(()=>{setAufgabenTab('boards');openBoardKanban('${b.id}')},80)">
                <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
                  <div style="width:10px;height:10px;border-radius:50%;background:${b.color||'#3b82f6'};flex-shrink:0;"></div>
                  <span style="font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(b.name)}</span>
                </div>
                <div style="font-size:11px;color:var(--muted);margin-bottom:5px;">${done}/${total} ✓</div>
                <div style="height:4px;background:var(--line);border-radius:2px;overflow:hidden;">
                  <div style="height:100%;width:${pct}%;background:${b.color||'#3b82f6'};border-radius:2px;transition:width .3s;"></div>
                </div>
              </div>`;
            }).join('')}
          </div>
          ${state.boards.length>4?`<div style="font-size:12px;color:var(--muted);margin-top:8px;text-align:right;">+ ${state.boards.length-4} weitere Boards</div>`:''}
        </div>
      </div>`;
    }

    // ─── AUFGABEN-TYPEN SETTINGS ──────────────────────────────────────────────

    function renderTaskTypesSettings() {
      const el = document.getElementById('taskTypesSettingsCard');
      if (!el) return;
      const types = state.taskTypes || [];
      el.innerHTML =
        (types.length === 0
          ? '<div style="color:var(--muted);font-size:12px;margin-bottom:8px;">Noch keine Typen definiert. Defaults werden verwendet.</div>'
          : types.map((t, i) => `
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
              <span style="flex:1;font-size:13px;">${escapeHtml(t)}</span>
              <button class="btn" style="padding:2px 8px;font-size:11px;color:var(--danger);" onclick="removeTaskType(${i})">✕</button>
            </div>`).join('')) +
        `<div style="display:flex;gap:8px;margin-top:8px;">
           <input type="text" id="newTaskTypeInput" class="input-field" placeholder="Neuer Typ..." style="flex:1;"
             onkeydown="if(event.key==='Enter')addTaskType()">
           <button class="btn primary" style="font-size:12px;" onclick="addTaskType()">+ Hinzufügen</button>
         </div>`;
    }

    window.addTaskType = function() {
      const input = document.getElementById('newTaskTypeInput');
      const val = (input?.value || '').trim();
      if (!val) return;
      if ((state.taskTypes || []).includes(val)) { showToast('Typ bereits vorhanden'); return; }
      (state.taskTypes = state.taskTypes || []).push(val);
      saveTaskTypes();
      renderTaskTypesSettings();
      if (input) input.value = '';
      showToast('✅ Typ hinzugefügt');
    };

    window.removeTaskType = function(idx) {
      if (!state.taskTypes) return;
      state.taskTypes.splice(idx, 1);
      saveTaskTypes();
      renderTaskTypesSettings();
    };

    // ─── LINKEDIN TRACKING MODULE ─────────────────────────────────────────────

    const LI_FORMATS = {
      text:     '📝 Text',
      bild:     '🖼️ Bild',
      video:    '🎬 Video',
      artikel:  '📰 Artikel',
      dokument: '📄 Dokument/PDF',
      carousel: '🎠 Karussell',
      umfrage:  '📊 Umfrage'
    };

    function renderLiTracking() {
      const profile   = state.liTracking.profile;
      const isCompany = profile === 'company';

      // Sub-tab button visuals
      document.querySelectorAll('[data-li-profile]').forEach(b => {
        const active = b.dataset.liProfile === profile;
        b.className  = active ? 'btn primary' : 'btn';
      });

      // Labels
      const titleEl   = document.getElementById('liGrowthTitle');
      const subEl     = document.getElementById('liGrowthSub');
      const postSubEl = document.getElementById('liPostsSub');
      if (titleEl)   titleEl.textContent   = isCompany ? 'Follower-Entwicklung' : 'Verbindungen-Entwicklung';
      if (subEl)     subEl.textContent     = isCompany ? 'LinkedIn Unternehmensseite' : 'LinkedIn Persönliches Profil';
      if (postSubEl) postSubEl.textContent = isCompany ? 'Posts der Unternehmensseite' : 'Posts des persönlichen Profils';

      // ── GROWTH / SNAPSHOT SECTION ──────────────────────────────────────────
      const countKey   = isCompany ? 'followers' : 'connections';
      const countLabel = isCompany ? 'Follower' : 'Verbindungen';
      const snapshots  = state.liSnapshots.filter(s => s.profile === profile).sort((a, b) => a.date.localeCompare(b.date));

      const latest    = snapshots.length > 0 ? Number(snapshots[snapshots.length - 1][countKey]) : null;
      const d30ago    = new Date(); d30ago.setDate(d30ago.getDate() - 30);
      const d90ago    = new Date(); d90ago.setDate(d90ago.getDate() - 90);
      const snap30val = [...snapshots].reverse().find(s => new Date(s.date + 'T00:00:00') <= d30ago)?.[countKey] ?? null;
      const snap90val = [...snapshots].reverse().find(s => new Date(s.date + 'T00:00:00') <= d90ago)?.[countKey] ?? null;
      const growth30  = latest !== null && snap30val !== null ? latest - Number(snap30val) : null;
      const growth90  = latest !== null && snap90val !== null ? latest - Number(snap90val) : null;

      const fmt      = v => v !== null && v !== undefined ? Number(v).toLocaleString('de-CH') : '–';
      const fmtDelta = v => v === null ? '–' : (v >= 0 ? '▲ +' : '▼ ') + Math.abs(v).toLocaleString('de-CH');
      const fmtDate  = d => new Date(d + 'T00:00:00').toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });

      const kpiEl = document.getElementById('liGrowthKpis');
      if (kpiEl) {
        kpiEl.innerHTML = [
          { label: `Aktuell (${countLabel})`, value: fmt(latest), icon: isCompany ? '🏢' : '👤', color: 'var(--accent)' },
          { label: 'Wachstum ±30 Tage',  value: fmtDelta(growth30), icon: '📈', color: growth30 > 0 ? '#22c55e' : growth30 < 0 ? '#ef4444' : 'var(--muted)' },
          { label: 'Wachstum ±90 Tage',  value: fmtDelta(growth90), icon: '📊', color: growth90 > 0 ? '#22c55e' : growth90 < 0 ? '#ef4444' : 'var(--muted)' },
          { label: 'Snapshots erfasst',   value: String(snapshots.length), icon: '📸', color: 'var(--muted)' }
        ].map(k => `
          <div class="analytics-kpi-card">
            <div class="kpi-icon">${k.icon}</div>
            <div class="kpi-value" style="color:${k.color};">${k.value}</div>
            <div class="kpi-label">${k.label}</div>
          </div>`).join('');
      }

      // Growth chart (last 12 snapshots)
      const chartEl = document.getElementById('liGrowthChart');
      if (chartEl) {
        if (snapshots.length < 2) {
          chartEl.innerHTML = '<div style="color:var(--muted);font-size:12px;text-align:center;padding:16px 0;">Mindestens 2 Snapshots erfassen, um den Verlauf zu sehen.</div>';
        } else {
          const display = snapshots.slice(-12);
          const maxVal  = Math.max(...display.map(s => Number(s[countKey]) || 0), 1);
          chartEl.innerHTML = '<div style="display:flex;gap:5px;align-items:flex-end;height:100px;overflow-x:auto;">' +
            display.map(s => {
              const val = Number(s[countKey]) || 0;
              const pct = Math.max(Math.round((val / maxVal) * 80), 4);
              const shortDate = s.date.substring(5).replace('-', '/');
              return `<div style="flex:1;min-width:36px;display:flex;flex-direction:column;align-items:center;gap:3px;" title="${s.date}: ${val.toLocaleString('de-CH')} ${countLabel}${s.notes ? ' · ' + s.notes : ''}">
                <div style="font-size:10px;font-weight:600;color:var(--accent);">${val >= 1000 ? (val/1000).toFixed(1)+'k' : val}</div>
                <div style="width:100%;background:var(--accent);border-radius:4px 4px 0 0;height:${pct}px;"></div>
                <div style="font-size:9px;color:var(--muted);">${shortDate}</div>
              </div>`;
            }).join('') + '</div>';
        }
      }

      // Snapshot table
      const tableEl = document.getElementById('liSnapshotTable');
      if (tableEl) {
        if (snapshots.length === 0) {
          tableEl.innerHTML = '<div style="color:var(--muted);font-size:12px;text-align:center;padding:16px 0;">Noch keine Snapshots. Klicke "+ Snapshot" um den aktuellen Stand zu erfassen.</div>';
        } else {
          const rows = [...snapshots].reverse().map((s, i, arr) => {
            const val     = Number(s[countKey]) || 0;
            const prevVal = i < arr.length - 1 ? Number(arr[i + 1][countKey]) || 0 : null;
            const delta   = prevVal !== null ? val - prevVal : null;
            return `<tr style="border-bottom:1px solid var(--line);">
              <td style="padding:7px 8px;font-size:12px;">${fmtDate(s.date)}</td>
              <td style="padding:7px 8px;font-size:13px;font-weight:600;color:var(--accent);">${val.toLocaleString('de-CH')}</td>
              <td style="padding:7px 8px;font-size:12px;color:${delta === null ? 'var(--muted)' : delta >= 0 ? '#22c55e' : '#ef4444'};">
                ${delta !== null ? (delta >= 0 ? '▲ +' : '▼ ') + Math.abs(delta).toLocaleString('de-CH') : '–'}
              </td>
              <td style="padding:7px 8px;font-size:12px;color:var(--muted);">${s.notes || ''}</td>
              <td style="padding:7px 8px;text-align:right;">
                <button class="btn" style="padding:3px 8px;font-size:11px;" onclick="deleteLiSnapshot('${s.id}')">🗑️</button>
              </td>
            </tr>`;
          }).join('');
          tableEl.innerHTML = `<table style="width:100%;border-collapse:collapse;margin-top:8px;">
            <thead><tr style="border-bottom:2px solid var(--line);">
              <th style="padding:5px 8px;text-align:left;font-size:11px;color:var(--muted);">Datum</th>
              <th style="padding:5px 8px;text-align:left;font-size:11px;color:var(--muted);">${countLabel}</th>
              <th style="padding:5px 8px;text-align:left;font-size:11px;color:var(--muted);">Veränderung</th>
              <th style="padding:5px 8px;text-align:left;font-size:11px;color:var(--muted);">Notizen</th>
              <th></th>
            </tr></thead><tbody>${rows}</tbody></table>`;
        }
      }

      // ── POST PERFORMANCE SECTION ──────────────────────────────────────────
      const formatFilter = document.getElementById('liPostFilterFormat')?.value || 'all';
      const fromVal      = document.getElementById('liPostFilterFrom')?.value || '';
      const toVal        = document.getElementById('liPostFilterTo')?.value || '';

      let posts = state.liPosts.filter(p => p.profile === profile);
      if (formatFilter !== 'all') posts = posts.filter(p => p.format === formatFilter);
      if (fromVal) posts = posts.filter(p => p.date >= fromVal);
      if (toVal)   posts = posts.filter(p => p.date <= toVal);
      posts = [...posts].sort((a, b) => b.date.localeCompare(a.date));

      const postKpiEl = document.getElementById('liPostKpis');
      if (postKpiEl) {
        const n = posts.length;
        const totalImpr  = posts.reduce((s, p) => s + (Number(p.impressions) || 0), 0);
        const totalLikes = posts.reduce((s, p) => s + (Number(p.likes) || 0), 0);
        const totalClicks = posts.reduce((s, p) => s + (Number(p.clicks) || 0), 0);
        const avgImpr    = n > 0 ? Math.round(totalImpr / n) : 0;
        const avgEng     = n > 0 ? posts.reduce((s, p) => {
          const impr = Number(p.impressions) || 0;
          const eng  = (Number(p.likes) || 0) + (Number(p.comments) || 0) + (Number(p.shares) || 0);
          return s + (impr > 0 ? (eng / impr) * 100 : 0);
        }, 0) / n : 0;
        const bestPost = n > 0 ? posts.reduce((best, p) => (Number(p.impressions) || 0) > (Number(best.impressions) || 0) ? p : best, posts[0]) : null;

        postKpiEl.innerHTML = [
          { label: 'Posts (gefiltert)',    value: String(n),                               icon: '📝', color: 'var(--accent)' },
          { label: 'Ø Impressionen',       value: avgImpr.toLocaleString('de-CH'),          icon: '👁️', color: '#3b82f6' },
          { label: 'Ø Engagement Rate',    value: avgEng.toFixed(2) + '%',                  icon: '💬', color: '#f59e0b' },
          { label: 'Total Likes',          value: totalLikes.toLocaleString('de-CH'),        icon: '👍', color: '#22c55e' },
          { label: 'Total Klicks',         value: totalClicks.toLocaleString('de-CH'),       icon: '🖱️', color: '#8b5cf6' },
          { label: 'Bester Post (Impr.)',  value: bestPost ? Number(bestPost.impressions).toLocaleString('de-CH') : '–', icon: '🏆', color: '#f59e0b' }
        ].map(k => `
          <div class="analytics-kpi-card">
            <div class="kpi-icon">${k.icon}</div>
            <div class="kpi-value" style="color:${k.color};">${k.value}</div>
            <div class="kpi-label">${k.label}</div>
          </div>`).join('');
      }

      // Post table
      const postsTableEl = document.getElementById('liPostsTable');
      if (postsTableEl) {
        if (posts.length === 0) {
          postsTableEl.innerHTML = '<div style="color:var(--muted);font-size:12px;text-align:center;padding:24px 0;">Keine Posts gefunden. Klicke "+ Post erfassen" um einen Beitrag einzutragen.</div>';
        } else {
          const fmtN = v => (Number(v) || 0).toLocaleString('de-CH');
          const rows = posts.map(p => {
            const eng     = (Number(p.likes) || 0) + (Number(p.comments) || 0) + (Number(p.shares) || 0);
            const engRate = Number(p.impressions) > 0 ? (eng / Number(p.impressions) * 100).toFixed(1) + '%' : '–';
            const fmtLbl  = LI_FORMATS[p.format] || p.format;
            const shortDate = new Date(p.date + 'T00:00:00').toLocaleDateString('de-CH', { day:'2-digit', month:'2-digit', year:'2-digit' });
            return `<tr style="border-bottom:1px solid var(--line);" title="${p.notes || ''}">
              <td style="padding:7px 8px;font-size:11px;color:var(--muted);white-space:nowrap;">${shortDate}</td>
              <td style="padding:7px 8px;font-size:12px;max-width:170px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${p.title}">${p.title}</td>
              <td style="padding:7px 8px;font-size:11px;white-space:nowrap;">${fmtLbl}</td>
              <td style="padding:7px 8px;font-size:12px;font-weight:600;color:#3b82f6;text-align:right;">${fmtN(p.impressions)}</td>
              <td style="padding:7px 8px;font-size:12px;text-align:right;">${fmtN(p.clicks)}</td>
              <td style="padding:7px 8px;font-size:12px;color:#22c55e;text-align:right;">${fmtN(p.likes)}</td>
              <td style="padding:7px 8px;font-size:12px;text-align:right;">${fmtN(p.comments)}</td>
              <td style="padding:7px 8px;font-size:12px;text-align:right;">${fmtN(p.shares)}</td>
              <td style="padding:7px 8px;font-size:12px;font-weight:600;color:#f59e0b;text-align:right;">${engRate}</td>
              <td style="padding:7px 8px;text-align:right;white-space:nowrap;">
                <button class="btn" style="padding:3px 8px;font-size:11px;" onclick="openLiPostModal('${p.id}')">✏️</button>
                <button class="btn" style="padding:3px 8px;font-size:11px;color:#ef4444;" onclick="deleteLiPost('${p.id}')">🗑️</button>
              </td>
            </tr>`;
          }).join('');
          postsTableEl.innerHTML = `<table style="width:100%;border-collapse:collapse;min-width:680px;">
            <thead><tr style="border-bottom:2px solid var(--line);background:var(--bg);">
              <th style="padding:5px 8px;text-align:left;font-size:10px;color:var(--muted);">Datum</th>
              <th style="padding:5px 8px;text-align:left;font-size:10px;color:var(--muted);">Titel</th>
              <th style="padding:5px 8px;text-align:left;font-size:10px;color:var(--muted);">Format</th>
              <th style="padding:5px 8px;text-align:right;font-size:10px;color:var(--muted);">Impr.</th>
              <th style="padding:5px 8px;text-align:right;font-size:10px;color:var(--muted);">Klicks</th>
              <th style="padding:5px 8px;text-align:right;font-size:10px;color:var(--muted);">Likes</th>
              <th style="padding:5px 8px;text-align:right;font-size:10px;color:var(--muted);">Komm.</th>
              <th style="padding:5px 8px;text-align:right;font-size:10px;color:var(--muted);">Shares</th>
              <th style="padding:5px 8px;text-align:right;font-size:10px;color:var(--muted);">Eng.%</th>
              <th style="padding:5px 8px;"></th>
            </tr></thead><tbody>${rows}</tbody></table>`;
        }
      }
    }

    function resetLiPostFilter() {
      const ff = document.getElementById('liPostFilterFormat');
      const fd = document.getElementById('liPostFilterFrom');
      const ft = document.getElementById('liPostFilterTo');
      if (ff) ff.value = 'all';
      if (fd) fd.value = '';
      if (ft) ft.value = '';
      renderLiTracking();
    }

    function openLiSnapshotModal(snapshotId) {
      const modal = document.getElementById('liSnapshotModal');
      if (!modal) return;
      const profile   = state.liTracking.profile;
      const isCompany = profile === 'company';
      document.getElementById('liSnapshotEditId').value   = snapshotId || '';
      document.getElementById('liSnapshotProfile').value  = profile;
      document.getElementById('liSnapshotModalTitle').textContent = isCompany ? 'Follower Snapshot' : 'Verbindungen Snapshot';
      document.getElementById('liSnapshotCountLabel').textContent = isCompany ? 'Follower *' : 'Verbindungen *';
      if (snapshotId) {
        const s = state.liSnapshots.find(x => x.id === snapshotId);
        if (!s) return;
        document.getElementById('liSnapshotDate').value  = s.date || '';
        document.getElementById('liSnapshotCount').value = isCompany ? (s.followers ?? '') : (s.connections ?? '');
        document.getElementById('liSnapshotNotes').value = s.notes || '';
      } else {
        document.getElementById('liSnapshotDate').value  = new Date().toISOString().split('T')[0];
        document.getElementById('liSnapshotCount').value = '';
        document.getElementById('liSnapshotNotes').value = '';
      }
      modal.classList.add('show');
    }

    function closeLiSnapshotModal() { document.getElementById('liSnapshotModal')?.classList.remove('show'); }

    function saveLiSnapshot() {
      const date  = document.getElementById('liSnapshotDate')?.value;
      const count = document.getElementById('liSnapshotCount')?.value;
      if (!date || !count) { showToast('❌ Datum und Anzahl sind Pflichtfelder'); return; }
      const profile   = document.getElementById('liSnapshotProfile')?.value || state.liTracking.profile;
      const isCompany = profile === 'company';
      const editId    = document.getElementById('liSnapshotEditId')?.value;
      const countVal  = parseInt(count, 10);
      const now       = new Date().toISOString();
      if (editId) {
        const s = state.liSnapshots.find(x => x.id === editId);
        if (!s) return;
        s.date      = date;
        s.notes     = (document.getElementById('liSnapshotNotes')?.value || '').trim();
        s.updatedAt = now;
        if (isCompany) s.followers   = countVal;
        else           s.connections = countVal;
      } else {
        const snap = { id: 'lisnap_' + Date.now(), profile, date, notes: (document.getElementById('liSnapshotNotes')?.value || '').trim(), createdAt: now, updatedAt: now };
        if (isCompany) snap.followers   = countVal;
        else           snap.connections = countVal;
        state.liSnapshots.push(snap);
      }
      saveLiSnapshots();
      closeLiSnapshotModal();
      renderLiTracking();
      showToast('✅ Snapshot gespeichert');
    }

    function deleteLiSnapshot(id) {
      if (!confirm('Snapshot löschen?')) return;
      state.liSnapshots = state.liSnapshots.filter(s => s.id !== id);
      saveLiSnapshots();
      renderLiTracking();
      showToast('🗑️ Snapshot gelöscht');
    }

    function openLiPostModal(postId) {
      const modal = document.getElementById('liPostModal');
      if (!modal) return;
      const profile   = state.liTracking.profile;
      const isCompany = profile === 'company';
      document.getElementById('liPostEditId').value  = postId || '';
      document.getElementById('liPostProfile').value = profile;
      document.getElementById('liPostModalTitle').textContent = isCompany ? 'Post erfassen – Unternehmen' : 'Post erfassen – Persönlich';
      if (postId) {
        const p = state.liPosts.find(x => x.id === postId);
        if (!p) return;
        document.getElementById('liPostDate').value        = p.date || '';
        document.getElementById('liPostTitle').value       = p.title || '';
        document.getElementById('liPostFormat').value      = p.format || 'text';
        document.getElementById('liPostImpressions').value = p.impressions || '';
        document.getElementById('liPostClicks').value      = p.clicks || '';
        document.getElementById('liPostLikes').value       = p.likes || '';
        document.getElementById('liPostComments').value    = p.comments || '';
        document.getElementById('liPostShares').value      = p.shares || '';
        document.getElementById('liPostNotes').value       = p.notes || '';
      } else {
        document.getElementById('liPostDate').value        = new Date().toISOString().split('T')[0];
        document.getElementById('liPostTitle').value       = '';
        document.getElementById('liPostFormat').value      = 'text';
        document.getElementById('liPostImpressions').value = '';
        document.getElementById('liPostClicks').value      = '';
        document.getElementById('liPostLikes').value       = '';
        document.getElementById('liPostComments').value    = '';
        document.getElementById('liPostShares').value      = '';
        document.getElementById('liPostNotes').value       = '';
      }
      modal.classList.add('show');
    }

    function closeLiPostModal() { document.getElementById('liPostModal')?.classList.remove('show'); }

    function saveLiPost() {
      const date  = document.getElementById('liPostDate')?.value;
      const title = (document.getElementById('liPostTitle')?.value || '').trim();
      if (!date || !title) { showToast('❌ Datum und Titel sind Pflichtfelder'); return; }
      const profile = document.getElementById('liPostProfile')?.value || state.liTracking.profile;
      const editId  = document.getElementById('liPostEditId')?.value;
      const now     = new Date().toISOString();
      const data    = {
        profile,
        date,
        title,
        format:      document.getElementById('liPostFormat')?.value || 'text',
        impressions: parseInt(document.getElementById('liPostImpressions')?.value || '0', 10) || 0,
        clicks:      parseInt(document.getElementById('liPostClicks')?.value    || '0', 10) || 0,
        likes:       parseInt(document.getElementById('liPostLikes')?.value     || '0', 10) || 0,
        comments:    parseInt(document.getElementById('liPostComments')?.value  || '0', 10) || 0,
        shares:      parseInt(document.getElementById('liPostShares')?.value    || '0', 10) || 0,
        notes:       (document.getElementById('liPostNotes')?.value || '').trim()
      };
      if (editId) {
        const p = state.liPosts.find(x => x.id === editId);
        if (!p) return;
        Object.assign(p, data, { updatedAt: now });
      } else {
        state.liPosts.push({ id: 'lipost_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5), createdAt: now, updatedAt: now, ...data });
      }
      saveLiPosts();
      closeLiPostModal();
      renderLiTracking();
      showToast(editId ? '✅ Post aktualisiert' : '✅ Post erfasst');
    }

    function deleteLiPost(id) {
      if (!confirm('Post löschen?')) return;
      state.liPosts = state.liPosts.filter(p => p.id !== id);
      saveLiPosts();
      renderLiTracking();
      showToast('🗑️ Post gelöscht');
    }

    // ─── END LINKEDIN TRACKING MODULE ─────────────────────────────────────────

    window.addEventListener('DOMContentLoaded', () => {
      initTheme();
      loadFromStorage();
      checkFollowupDueDates();
      checkVrFollowups();
      checkLinkedInFollowups();

      renderColorPalette();
      renderTagsList();
      renderTagFilter();
      renderKontakte();
      renderContactsTable();
      renderAnalytics();
      renderCrmCompanies();
      renderCrmCompanyDetail();
      renderDuplicateResults();
      updateKontakteStats();
      renderVrTrackingTable();
      renderTasks();
      renderMembersList();
      populateUserMemberSelect();
      renderUserAccountsList();
      renderMemberSwitcher();
      renderMemberColorPalette();
      initUidMigrationCard();

      setView('analytics');
      renderDashboardMyDay();
      setSessionMode('call');

      document.getElementById('btnThemeToggle')?.addEventListener('click', toggleTheme);

      // Edit modal star rating
      document.querySelectorAll('#editStarRating .star').forEach(star => {
        star.addEventListener('click', () => {
          const val = parseInt(star.dataset.star, 10);
          const current = parseInt(document.getElementById('editRating').value, 10) || 0;
          const newVal = current === val ? 0 : val;
          document.getElementById('editRating').value = newVal;
          renderEditStars(newVal);
        });
      });

      // Session star rating
      document.querySelectorAll('#sessionStarRating .star').forEach(star => {
        star.addEventListener('click', () => {
          const val = parseInt(star.dataset.star, 10);
          const current = parseInt(document.getElementById('sessionRating').value, 10) || 0;
          const newVal = current === val ? 0 : val;
          document.getElementById('sessionRating').value = newVal;
          renderSessionStars(newVal);
        });
      });

      document.querySelectorAll('[data-view]').forEach(btn => {
        btn.addEventListener('click', () => {
          setView(btn.dataset.view);
          if (btn.dataset.view === 'kontakte') {
            // Restore correct button visibility for active tab
            const activeTab = document.querySelector('[data-kontakte-tab].active')?.dataset.kontakteTab || 'liste';
            document.getElementById('btnOpenTagManager').style.display = activeTab === 'liste' ? '' : 'none';
            document.getElementById('btnAddContact').style.display = activeTab === 'liste' ? '' : 'none';
            if (activeTab === 'crm') {
              renderCrmCompanies();
              renderCrmCompanyDetail();
              renderDuplicateResults();
            }
          }
          if (btn.dataset.view === 'analytics') {
            renderDashboardMyDay();
            populateAnalyticsMemberFilter();
            renderAnalytics();
          }
          if (btn.dataset.view === 'aufgaben') {
            setAufgabenTab(state.tasksTab || 'list');
          }
          if (btn.dataset.view === 'hkm') {
            window.initHkmOnView?.();
          }
        });
      });

      // ImmoRadar removed 2026-04 (scoring functions kept for future use)

      // AUFGABEN TABS
      document.querySelectorAll('[data-tasks-tab]').forEach(btn => {
        btn.addEventListener('click', () => setAufgabenTab(btn.dataset.tasksTab));
      });

      // LINKEDIN PROFILE SUB-TABS
      document.querySelectorAll('[data-li-profile]').forEach(btn => {
        btn.addEventListener('click', () => {
          state.liTracking.profile = btn.dataset.liProfile;
          renderLiTracking();
        });
      });
      document.getElementById('weeklyChecklistInput')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          addWeeklyChecklistItem();
        }
      });
      document.getElementById('btnCloseIrApiModal')?.addEventListener('click', closeImmoRadarApiModal);
      document.getElementById('btnIrApiCancel')?.addEventListener('click', closeImmoRadarApiModal);
      document.getElementById('btnIrApiSave')?.addEventListener('click', saveImmoRadarApiConfig);
      document.getElementById('irApiModal')?.addEventListener('click', (e) => {
        if (e.target === document.getElementById('irApiModal')) closeImmoRadarApiModal();
      });
      document.getElementById('btnIrBulkLio')?.addEventListener('click', markFilteredImmoRadarLioToday);
      document.getElementById('irSearch')?.addEventListener('input', (e) => {
        state.immoRadar.query = e.target.value || '';
        state.immoRadar.page = 1;
        renderImmoRadar();
      });
      document.getElementById('irStatus')?.addEventListener('change', (e) => {
        state.immoRadar.status = e.target.value || 'all';
        state.immoRadar.page = 1;
        renderImmoRadar();
      });
      document.getElementById('irSortBy')?.addEventListener('change', (e) => {
        state.immoRadar.sortBy = e.target.value || 'score';
        state.immoRadar.page = 1;
        renderImmoRadar();
      });
      document.getElementById('irPageSize')?.addEventListener('change', (e) => {
        const size = Number(e.target.value || 12);
        state.immoRadar.pageSize = [12, 25, 50].includes(size) ? size : 12;
        state.immoRadar.page = 1;
        renderImmoRadar();
      });
      document.getElementById('irSortDir')?.addEventListener('click', (e) => {
        state.immoRadar.sortDesc = !state.immoRadar.sortDesc;
        e.target.textContent = state.immoRadar.sortDesc ? '↓ Absteigend' : '↑ Aufsteigend';
        renderImmoRadar();
      });
      document.querySelectorAll('[data-ir-segment]').forEach(btn => {
        btn.addEventListener('click', () => {
          state.immoRadar.segment = btn.getAttribute('data-ir-segment') || 'all';
          state.immoRadar.page = 1;
          document.querySelectorAll('[data-ir-segment]').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          renderImmoRadar();
        });
      });

      document.getElementById('vrOverviewSearch')?.addEventListener('input', (e) => {
        state.vrOverview.query = e.target.value || '';
        renderVrTrackingTable();
      });
      document.getElementById('vrOverviewStatus')?.addEventListener('change', (e) => {
        state.vrOverview.status = e.target.value || 'all';
        renderVrTrackingTable();
      });
      document.getElementById('vrOverviewSortBy')?.addEventListener('change', (e) => {
        state.vrOverview.sortBy = e.target.value || 'nextDue';
        renderVrTrackingTable();
      });
      document.getElementById('btnVrOverviewSortDir')?.addEventListener('click', (e) => {
        state.vrOverview.sortDesc = !state.vrOverview.sortDesc;
        e.target.textContent = state.vrOverview.sortDesc ? '↓ Absteigend' : '↑ Aufsteigend';
        renderVrTrackingTable();
      });
      document.getElementById('btnVrOverviewReset')?.addEventListener('click', () => {
        state.vrOverview.query = '';
        state.vrOverview.status = 'all';
        state.vrOverview.sortBy = 'nextDue';
        state.vrOverview.sortDesc = false;
        const queryEl = document.getElementById('vrOverviewSearch');
        const statusEl = document.getElementById('vrOverviewStatus');
        const sortEl = document.getElementById('vrOverviewSortBy');
        const dirEl = document.getElementById('btnVrOverviewSortDir');
        if (queryEl) queryEl.value = '';
        if (statusEl) statusEl.value = 'all';
        if (sortEl) sortEl.value = 'nextDue';
        if (dirEl) dirEl.textContent = '↑ Aufsteigend';
        renderVrTrackingTable();
      });
      document.getElementById('btnVrViewList')?.addEventListener('click', () => {
        state.vrOverview.view = 'list';
        renderVrTrackingTable();
      });
      document.getElementById('btnVrViewTiles')?.addEventListener('click', () => {
        state.vrOverview.view = 'tiles';
        renderVrTrackingTable();
      });

      document.getElementById('btnSidebarToggle')?.addEventListener('click', () => {
        document.getElementById('sidebar')?.classList.toggle('open');
        document.getElementById('sidebarOverlay')?.classList.toggle('show');
      });
      document.getElementById('sidebarOverlay')?.addEventListener('click', () => {
        document.getElementById('sidebar')?.classList.remove('open');
        document.getElementById('sidebarOverlay')?.classList.remove('show');
      });

      document.getElementById('dashboardSearch')?.addEventListener('input', () => {
        const hasValue = document.getElementById('dashboardSearch').value.trim().length > 0;
        document.getElementById('btnClearDashboardSearch').style.display = hasValue ? 'block' : 'none';
        renderKontakte();
      });

      document.getElementById('btnClearDashboardSearch')?.addEventListener('click', () => {
        document.getElementById('dashboardSearch').value = '';
        document.getElementById('btnClearDashboardSearch').style.display = 'none';
        renderKontakte();
      });

      document.getElementById('dashboardPLZRange')?.addEventListener('input', () => {
        const hasValue = document.getElementById('dashboardPLZRange').value.trim().length > 0;
        document.getElementById('btnClearPLZRange').style.display = hasValue ? 'block' : 'none';
        renderKontakte();
      });

      document.getElementById('btnClearPLZRange')?.addEventListener('click', () => {
        document.getElementById('dashboardPLZRange').value = '';
        document.getElementById('btnClearPLZRange').style.display = 'none';
        renderKontakte();
      });

      document.getElementById('btnDashboardTileView')?.addEventListener('click', () => {
        state.dashboardView = 'tiles';
        renderKontakte();
      });

      document.getElementById('btnDashboardListView')?.addEventListener('click', () => {
        state.dashboardView = 'list';
        renderKontakte();
      });

      document.getElementById('sortBy')?.addEventListener('change', renderKontakte);

      document.getElementById('btnToggleSortOrder')?.addEventListener('click', (e) => {
        e.target.classList.toggle('descending');
        e.target.textContent = e.target.classList.contains('descending') ? '↓ Absteigend' : '↑ Aufsteigend';
        renderKontakte();
      });

      document.getElementById('btnResetAllFilters')?.addEventListener('click', () => {
        document.getElementById('dashboardSearch').value = '';
        document.getElementById('btnClearDashboardSearch').style.display = 'none';
        document.getElementById('sortBy').value = 'name';
        document.getElementById('btnToggleSortOrder').classList.remove('descending');
        document.getElementById('btnToggleSortOrder').textContent = '↑ Aufsteigend';
        const statusBtn = document.getElementById('btnStatusFilterDropdown');
        statusBtn.dataset.status = 'all';
        document.getElementById('statusFilterLabel').textContent = 'Alle';
        statusBtn.classList.add('active');
        document.querySelectorAll('.status-filter-option').forEach(o => o.classList.remove('active'));
        state.selectedTagFilter = null;
        document.getElementById('btnTagFilter').classList.remove('active');
        document.getElementById('tagFilterCount').textContent = '';
        document.getElementById('tagFilterLabel').textContent = 'Alle Tags';
        document.getElementById('dashboardPLZRange').value = '';
        state.dashboardListFilters = {
          person: '',
          phone: '',
          email: '',
          company: '',
          location: '',
          status: '',
          phase: '',
          rating: '',
          due: ''
        };
        renderKontakte();
      });

      document.getElementById('btnTagFilter')?.addEventListener('click', (e) => {
        e.stopPropagation();
        const menu = document.getElementById('tagFilterMenu');
        menu.classList.toggle('show');
      });

      document.addEventListener('click', (e) => {
        const menu = document.getElementById('tagFilterMenu');
        const btn = document.getElementById('btnTagFilter');
        if (menu && btn && !menu.contains(e.target) && !btn.contains(e.target)) {
          menu.classList.remove('show');
        }
      });

      document.querySelectorAll('[data-open-tag-manager], #btnOpenTagManager').forEach(btn => {
        btn.addEventListener('click', () => {
          document.getElementById('tagManagerModal').classList.add('show');
        });
      });

      document.getElementById('btnCloseTagManager').addEventListener('click', () => {
        document.getElementById('tagManagerModal').classList.remove('show');
      });

      document.getElementById('tagManagerModal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('tagManagerModal')) {
          document.getElementById('tagManagerModal').classList.remove('show');
        }
      });

      // Color picker
      document.getElementById('btnShowColorPicker').addEventListener('click', (e) => {
        e.stopPropagation();
        const container = document.getElementById('colorPickerContainer');
        container.style.display = container.style.display === 'none' ? 'block' : 'none';
      });

      document.getElementById('btnCancelColorPicker').addEventListener('click', () => {
        document.getElementById('colorPickerContainer').style.display = 'none';
      });

      document.getElementById('btnApplyHex').addEventListener('click', () => {
        const hexValue = document.getElementById('hexInput').value.trim();
        const normalized = normalizeColor(hexValue);
        document.getElementById('btnShowColorPicker').style.backgroundColor = normalized;
      });

      // Create tag
      document.getElementById('btnCreateTag').addEventListener('click', () => {
        const name = document.getElementById('tagNameInput').value.trim();
        const colorBtn = document.getElementById('btnShowColorPicker');
        const color = window.getComputedStyle(colorBtn).backgroundColor || '#808080';
        
        if (!name) {
          showToast('❌ Tag-Name erforderlich');
          return;
        }

        if (createTag(name, color)) {
          document.getElementById('tagNameInput').value = '';
          document.getElementById('hexInput').value = '';
          document.getElementById('colorPickerContainer').style.display = 'none';
          document.getElementById('btnShowColorPicker').style.backgroundColor = '';
          
          renderColorPalette();
          renderTagsList();
          renderTagFilter();
          renderFollowupTagFilter();
          renderKontakte();
          renderEditTagSelect();
          
          showToast('✅ Tag erstellt!');
        }
      });

      // Enter-Event für Tag-Name Input
      document.getElementById('tagNameInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          document.getElementById('btnCreateTag').click();
        }
      });
      
      // STATUS FILTER DROPDOWN
      const statusFilterBtn = document.getElementById('btnStatusFilterDropdown');
      const statusFilterMenu = document.getElementById('statusFilterMenu');
      const statusFilterOptions = document.querySelectorAll('.status-filter-option');

      statusFilterBtn.addEventListener('click', () => {
        statusFilterMenu.classList.toggle('show');
      });

      statusFilterOptions.forEach(option => {
        option.addEventListener('click', () => {
          const status = option.dataset.status;
          statusFilterBtn.dataset.status = status;
          document.getElementById('statusFilterLabel').textContent = option.textContent;
          statusFilterBtn.classList.add('active');
          statusFilterMenu.classList.remove('show');
          option.classList.add('active');
          statusFilterOptions.forEach(o => o !== option && o.classList.remove('active'));
          renderKontakte();
        });
      });

      document.addEventListener('click', (e) => {
        if (!statusFilterBtn.contains(e.target) && !statusFilterMenu.contains(e.target)) {
          statusFilterMenu.classList.remove('show');
        }
      });

      document.getElementById('btnSelectAll')?.addEventListener('click', () => {
        // Markiere nur sichtbare (gefilterte) Kontakte
        const grid = document.getElementById('dashboardGrid');
        const visibleContactIds = Array.from(grid.querySelectorAll('[data-contact-id]')).map(el => el.getAttribute('data-contact-id'));
        state.selectedContacts = new Set(visibleContactIds);
        renderKontakte();
        showToast(`✅ ${visibleContactIds.length} Kontakte markiert`);
      });

      document.getElementById('btnClearSelection')?.addEventListener('click', () => {
        state.selectedContacts.clear();
        renderKontakte();
      });

      document.getElementById('btnMarkCallsToday')?.addEventListener('click', () => {
        if (state.selectedContacts.size === 0) {
          showToast('❌ Bitte Kontakte markieren');
          return;
        }
        const count = state.selectedContacts.size;
        state.selectedContacts.forEach(id => {
          const contact = state.contacts.find(c => c.id === id);
          if (contact) contact.status = 'callstoday';
        });
        saveContacts();
        state.selectedContacts.clear();
        renderKontakte();
        renderStats();
        showToast(`✅ ${count} Kontakte als "Calls Today" markiert`);
      });

      document.getElementById('btnMarkFollowupToday')?.addEventListener('click', () => {
        if (!state.selectedContacts || state.selectedContacts.size === 0) {
          showToast('❌ Bitte Kontakte markieren');
          return;
        }
        const count = state.selectedContacts.size;
        state.selectedContacts.forEach(id => {
          const contact = state.contacts.find(c => c.id === id);
          if (contact) contact.status = 'followuptoday';
        });
        saveContacts();
        state.selectedContacts.clear();
        renderKontakte();
        renderStats();
        showToast(`✅ ${count} Kontakte als "Followup Today" markiert`);
      });

      document.getElementById('btnMarkOutreach')?.addEventListener('click', () => {
        if (state.selectedContacts.size === 0) {
          showToast('❌ Bitte Kontakte markieren');
          return;
        }
        let count = 0;

        state.selectedContacts.forEach(id => {
          const contact = state.contacts.find(c => c.id === id);
          if (!contact) return;
          contact.status = 'lioutboundtoday';
          contact.outreachStatus = 'outreachtoday';
          contact.source = 'linkedin';
          contact.updatedAt = new Date().toISOString();
          count += 1;
        });

        saveContacts();
        state.selectedContacts.clear();
        renderKontakte();
        renderStats();
        renderAnalytics();
        showToast(`✅ ${count} Kontakte als "LIO Today" markiert`);
      });

      document.getElementById('btnBatchSetStatus')?.addEventListener('click', () => {
        const targetStatus = document.getElementById('batchStatusSelect').value;
        if (!targetStatus) {
          showToast('❌ Bitte Status auswaehlen');
          return;
        }
        if (state.selectedContacts.size === 0) {
          showToast('❌ Bitte Kontakte markieren');
          return;
        }
        let count = 0;
        state.selectedContacts.forEach(id => {
          const contact = state.contacts.find(c => c.id === id);
          if (!contact) return;
          contact.status = targetStatus;
          contact.updatedAt = new Date().toISOString();
          count += 1;
        });
        saveContacts();
        state.selectedContacts.clear();
        document.getElementById('batchStatusSelect').value = '';
        renderKontakte();
        renderStats();
        showToast(`✅ ${count} Kontakte auf "${getStatusLabel(targetStatus)}" gesetzt`);
      });

      // Batch assign member
      document.getElementById('btnBatchAssign')?.addEventListener('click', () => {
        const sel = document.getElementById('batchMemberSelect');
        if (!sel) return;
        if (sel.style.display === 'none' || sel.style.display === '') {
          populateBatchMemberSelect();
          sel.style.display = 'inline-block';
          sel.focus();
        } else {
          sel.style.display = 'none';
        }
      });

      document.getElementById('batchMemberSelect')?.addEventListener('change', () => {
        if (state.selectedContacts.size === 0) {
          showToast('Bitte Kontakte markieren');
          return;
        }
        const memberId = document.getElementById('batchMemberSelect').value || null;
        let count = 0;
        state.selectedContacts.forEach(id => {
          const contact = state.contacts.find(c => c.id === id);
          if (!contact) return;
          contact.memberId = memberId;
          contact.updatedAt = new Date().toISOString();
          count += 1;
        });
        saveContacts();
        state.selectedContacts.clear();
        document.getElementById('batchMemberSelect').style.display = 'none';
        renderKontakte();
        showToast(`${count} Kontakte zugewiesen`);
      });

      // VR Session
      document.getElementById('btnVrLoadAll')?.addEventListener('click', () => {
        const vrContacts = state.contacts.filter(c => isVrSessionCandidate(c));
        if (!vrContacts.length) {
          showToast('Keine Kontakte mit VR-Status gefunden');
          return;
        }
        state.vrQueue = vrContacts.map(c => c.id);
        VrSession.updateInfo();
        showToast(`${state.vrQueue.length} VR-Kontakte geladen – Session starten`);
      });

      document.getElementById('btnVrStartSession')?.addEventListener('click', () => {
        let contacts = [];
        if (state.vrQueue && state.vrQueue.length) {
          contacts = state.vrQueue
            .map(id => state.contacts.find(c => c.id === id))
            .filter(c => Boolean(c) && isVrSessionCandidate(c));
        } else {
          contacts = state.contacts.filter(c => isVrSessionCandidate(c));
        }
        // Immer starten – ohne Kontakte läuft die Session im Freitext-Modus (ad-hoc)
        VrSession.start(contacts, contacts.length === 0);
      });

      document.getElementById('btnVrSaveAndNext')?.addEventListener('click', () => VrSession.saveAndNext());
      document.getElementById('btnVrSkip')?.addEventListener('click', () => VrSession.next());
      document.getElementById('btnVrSessionPrev')?.addEventListener('click', () => VrSession.prev());
      document.getElementById('btnVrSessionNext')?.addEventListener('click', () => VrSession.next());
      document.getElementById('btnVrEndSession')?.addEventListener('click', () => VrSession.end());

      // Batch -> VR Session (auto-start, kein zweiter Klick nötig)
      document.getElementById('btnBatchVrSession')?.addEventListener('click', () => {
        if (!state.selectedContacts || state.selectedContacts.size === 0) {
          showToast('Bitte zuerst Kontakte markieren');
          return;
        }
        const ids = Array.from(state.selectedContacts);
        const contacts = ids
          .map(id => state.contacts.find(c => c.id === id))
          .filter(Boolean);
        state.vrQueue = ids;
        state.selectedContacts.clear();
        renderKontakte();
        setView('session');
        setSessionMode('vr');
        VrSession.start(contacts);
        showToast(`🎥 VR-Session mit ${contacts.length} Kontakten gestartet`);
      });

      // Member settings form
      document.getElementById('memberVorname')?.addEventListener('input', suggestKuerzel);
      document.getElementById('memberNachname')?.addEventListener('input', suggestKuerzel);
      document.getElementById('btnAddMember')?.addEventListener('click', addMember);
      document.getElementById('btnCreateUserAccount')?.addEventListener('click', createUserAccountFromSettings);

      document.getElementById('btnAddContact')?.addEventListener('click', () => {
        const newContact = {
          id: Math.random().toString(36).substr(2, 9),
          vorname: '',
          nachname: '',
          firma: '',
          telefon: '',
          email: '',
          linkedin: '',
          unternehmenstelefon: '',
          unternehmensemail: '',
          rolle: '',
          strasse: '',
          ortschaft: '',
          region: '',
          status: 'new',
          notes: '',
          source: 'calls',
          dealStage: null,
          dealValue: null,
          dealProbability: null,
          dealCloseDate: null,
          createdAt: new Date().toISOString()
        };
        state.contacts.push(newContact);
        saveContacts();
        openEditModal(newContact.id);
        renderKontakte();
        renderContactsTable();
        renderStats();
      });
      document.querySelectorAll('.filter-tab').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          state.quickFilter = btn.dataset.quickFilter || 'all';
          renderKontakte();
        });
      });

      // CRM DUPLICATE DETECTION EVENT LISTENERS
      document.getElementById('crmDuplicateToken')?.addEventListener('input', renderDuplicateResults);
      document.getElementById('btnCrmMergeDuplicates')?.addEventListener('click', mergeDuplicateCompanies);
      
      // Initial render of duplicates on page load
      setTimeout(() => {
        renderDuplicateResults();
      }, 500);

      document.getElementById('crmCompanyName')?.addEventListener('input', updateCrmCompanyHint);
      document.getElementById('crmSearch')?.addEventListener('input', renderCrmCompanies);
      document.getElementById('btnCrmSaveAddress')?.addEventListener('click', () => {
        addCrmAddress();
        document.getElementById('crmCompanyName').value = '';
        document.getElementById('crmCompanyIndustry').value = '';
        document.getElementById('crmCompanyLocation').value = '';
        document.getElementById('crmCompanyWebsite').value = '';
        document.getElementById('crmCompanyStreet').value = '';
        document.getElementById('crmCompanyPostal').value = '';
        document.getElementById('crmCompanyCity').value = '';
        document.getElementById('crmContactFirst').value = '';
        document.getElementById('crmContactLast').value = '';
        document.getElementById('crmContactPhone').value = '';
        document.getElementById('crmContactEmail').value = '';
        document.getElementById('crmContactLinkedIn').value = '';
        document.getElementById('crmContactRole').value = '';
        updateCrmCompanyHint();
      });
      document.getElementById('btnCrmAddContact')?.addEventListener('click', () => {
        addCrmContactToSelectedCompany();
        document.getElementById('crmNewContactFirst').value = '';
        document.getElementById('crmNewContactLast').value = '';
        document.getElementById('crmNewContactPhone').value = '';
        document.getElementById('crmNewContactEmail').value = '';
        document.getElementById('crmNewContactLinkedIn').value = '';
        document.getElementById('crmNewContactRole').value = '';
        const branchSelect = document.getElementById('crmNewContactBranch');
        if (branchSelect) branchSelect.value = '';
        const primaryCheckbox = document.getElementById('crmNewContactPrimary');
        if (primaryCheckbox) primaryCheckbox.checked = false;
      });

      document.querySelectorAll('[data-pipeline-tab]').forEach(btn => {
        btn.addEventListener('click', () => {
          setPipelineTab(btn.dataset.pipelineTab);
        });
      });

      document.querySelectorAll('[data-session-mode]').forEach(btn => {
        btn.addEventListener('click', () => {
          setSessionMode(btn.dataset.sessionMode);
          state.sessionLogFilter = btn.dataset.sessionMode;
          document.querySelectorAll('[data-log-filter]').forEach(b => {
            b.classList.toggle('active', b.dataset.logFilter === state.sessionLogFilter);
          });
          renderSessionLog();
        });
      });

      document.querySelectorAll('[data-log-filter]').forEach(btn => {
        btn.addEventListener('click', () => {
          state.sessionLogFilter = btn.dataset.logFilter;
          document.querySelectorAll('[data-log-filter]').forEach(b => {
            b.classList.toggle('active', b.dataset.logFilter === state.sessionLogFilter);
          });
          renderSessionLog();
        });
      });

      document.getElementById('btnStartUnifiedSession')?.addEventListener('click', () => {
        const date = document.getElementById('sessionDate').value || new Date().toISOString().split('T')[0];
        SessionEngine.start(state.currentSessionMode || 'call', date);
      });

      document.getElementById('btnSaveAndNext')?.addEventListener('click', () => SessionEngine.saveAndNext());
      document.getElementById('btnSkipContact')?.addEventListener('click', () => SessionEngine.next());
      document.getElementById('btnSessionOpenMail')?.addEventListener('click', () => SessionEngine.openCurrentMail());
      document.getElementById('btnSessionPrev')?.addEventListener('click', () => SessionEngine.prev());
      document.getElementById('btnSessionNext')?.addEventListener('click', () => SessionEngine.next());
      document.getElementById('btnEndSession')?.addEventListener('click', () => SessionEngine.end());

      document.getElementById('sessionPersonSelect')?.addEventListener('change', (e) => {
        SessionEngine.selectedPersonId = e.target.value || null;
        if (e.target.value === '__new__') {
          clearSessionPersonFields();
          toggleSessionPersonFields(true);
          const nameEl = document.getElementById('sessionContactCompany');
          if (nameEl) nameEl.textContent = 'Kontaktperson: Neue Kontaktperson';
          const openMailBtn = document.getElementById('btnSessionOpenMail');
          if (openMailBtn) openMailBtn.style.display = 'none';
          return;
        }
        const selected = state.contacts.find(c => c.id === e.target.value);
        if (selected) {
          fillSessionPersonFields(selected);
          toggleSessionPersonFields(false);
          const details = document.getElementById('sessionContactDetails');
          if (details) {
            details.textContent = [
              selected.telefon && '📞 ' + selected.telefon,
              selected.email && '📧 ' + selected.email,
              selected.linkedin && '💼 ' + selected.linkedin
            ].filter(Boolean).join(' | ') || '–';
          }
          const title = document.getElementById('sessionContactCompany');
          if (title) title.textContent = `Kontaktperson: ${getSessionPersonDisplayName(selected)}`;
          const openMailBtn = document.getElementById('btnSessionOpenMail');
          if (openMailBtn) {
            const hasMail = Boolean(normalizeEmail(selected.email || ''));
            const canOpenMail = hasMail && SessionEngine.mode !== 'outreach';
            openMailBtn.style.display = canOpenMail ? 'inline-flex' : 'none';
          }
        }
      });

      document.getElementById('btnSessionNewPerson')?.addEventListener('click', () => {
        const select = document.getElementById('sessionPersonSelect');
        if (!select) return;
        select.value = '__new__';
        SessionEngine.selectedPersonId = '__new__';
        clearSessionPersonFields();
        toggleSessionPersonFields(true);
        const details = document.getElementById('sessionContactDetails');
        if (details) details.textContent = '–';
        const title = document.getElementById('sessionContactCompany');
        if (title) title.textContent = 'Kontaktperson: Neue Kontaktperson';
        const openMailBtn = document.getElementById('btnSessionOpenMail');
        if (openMailBtn) openMailBtn.style.display = 'none';
      });

      document.getElementById('crmCompanyNotesFilter')?.addEventListener('change', () => {
        renderCrmCompanyDetail();
      });

      document.getElementById('btnSessionJump')?.addEventListener('click', () => {
        const val = document.getElementById('sessionJumpInput')?.value;
        SessionEngine.jumpTo(val);
      });
      document.getElementById('sessionJumpInput')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          SessionEngine.jumpTo(e.target.value);
        }
      });

      document.getElementById('btnEditSessionContact')?.addEventListener('click', () => {
        const contact = SessionEngine.contacts[SessionEngine.currentIdx];
        if (!contact) return;
        const selected = state.contacts.find(c => c.id === SessionEngine.selectedPersonId) || contact;
        openEditModal(selected.id);
      });

      document.getElementById('btnAddTemplate')?.addEventListener('click', () => {
        addTemplate();
        document.getElementById('templateName').value = '';
        document.getElementById('templateBody').value = '';
      });

      document.getElementById('btnAddSequence')?.addEventListener('click', () => {
        addSequence();
        document.getElementById('sequenceName').value = '';
        document.getElementById('sequenceSteps').value = '';
      });

      document.getElementById('btnAddCompany')?.addEventListener('click', () => {
        addCompany();
        document.getElementById('companyName').value = '';
        document.getElementById('companyIndustry').value = '';
        document.getElementById('companyLocation').value = '';
        document.getElementById('companyWebsite').value = '';
      });

      document.getElementById('btnAddLead')?.addEventListener('click', () => {
        addLead();
        document.getElementById('leadName').value = '';
        document.getElementById('leadCompanyName').value = '';
        document.getElementById('leadRole').value = '';
        document.getElementById('leadEmail').value = '';
        document.getElementById('leadPhone').value = '';
        document.getElementById('leadLinkedIn').value = '';
      });

      document.getElementById('btnAddDeal')?.addEventListener('click', () => {
        addDeal();
        document.getElementById('dealTitle').value = '';
        document.getElementById('dealValue').value = '';
        document.getElementById('dealProbability').value = '';
        document.getElementById('dealCloseDate').value = '';
        renderPipelineBoard();
      });

      // CONTACTS
      // CSV import buttons use inline onclick fallback to stay functional even if init binding fails.

      document.getElementById('btnExportContacts').addEventListener('click', exportContacts);
      document.getElementById('btnClearAllContacts').addEventListener('click', () => {
        if (!requirePermission('bulk_delete_all', 'Nur Admin darf alle Kontakte loeschen')) return;
        if (confirm('Alle Kontakte wirklich löschen?')) {
          state.contacts = [];
          saveContacts();
          renderDashboard();
          renderContactsTable();
          renderStats();
          showToast('✅ Gelöscht');
        }
      });

      // MODAL
      document.getElementById('btnCloseModal').addEventListener('click', closeEditModal);
      document.getElementById('btnSaveContact').addEventListener('click', saveEditedContact);
      document.getElementById('btnDeleteContact').addEventListener('click', deleteContact);
      document.getElementById('btnAddNote').addEventListener('click', addNoteToContact);
      document.getElementById('btnConvertToLead').addEventListener('click', () => {
        if (currentEditContactId) {
          ensureLeadFromContact(currentEditContactId);
          renderCompanyOptions();
          renderOutreachContactOptions();
        }
      });

      document.getElementById('editModal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('editModal')) closeEditModal();
      });

      // Show/Hide Followup Fields basierend auf Status
      document.getElementById('editStatus').addEventListener('change', (e) => {
        const showFollowupFields = e.target.value === 'followup';
        document.getElementById('followupFieldsContainer').style.display = showFollowupFields ? 'block' : 'none';
      });

      document.getElementById('editDealStage')?.addEventListener('change', (e) => {
        const stage = e.target.value;
        const reasonEl = document.getElementById('editDealOutcomeReason');
        if (stage === 'won' && reasonEl && !reasonEl.value) {
          reasonEl.value = 'closed_won';
        }
        updateDealOutcomeFieldsVisibility();
      });

      // ANALYTICS
      document.getElementById('btnExportCalls').addEventListener('click', exportCalls);
      document.getElementById('btnExportOutreach').addEventListener('click', exportLinkedInOutreach);
      document.getElementById('btnExportAddresses').addEventListener('click', exportContacts);
      document.getElementById('btnExportFull').addEventListener('click', () => {
        exportContacts();
        setTimeout(exportCalls, 500);
        setTimeout(exportLinkedInOutreach, 1000);
      });

      // ANALYTICS DASHBOARD EVENT LISTENERS
      const applyAnalytics = () => renderAnalytics();
      document.getElementById('btnDashAnalyticsApply')?.addEventListener('click', applyAnalytics);
      document.getElementById('btnDashAnalyticsApply2')?.addEventListener('click', applyAnalytics);
      document.getElementById('btnDashAnalyticsReset')?.addEventListener('click', () => {
        const fromEl = document.getElementById('dashAnalyticsFrom');
        const toEl   = document.getElementById('dashAnalyticsTo');
        const memEl  = document.getElementById('dashAnalyticsMember');
        if (fromEl) fromEl.value = '';
        if (toEl)   toEl.value   = '';
        populateAnalyticsMemberFilter();
        if (memEl && !memEl.disabled) memEl.value = 'all';
        state.analyticsModule = 'all';
        document.querySelectorAll('[data-analytics-module]').forEach(b => b.classList.toggle('active', b.dataset.analyticsModule === 'all'));
        renderAnalytics();
      });
      document.querySelectorAll('[data-analytics-module]').forEach(btn => {
        btn.addEventListener('click', () => {
          state.analyticsModule = btn.dataset.analyticsModule;
          document.querySelectorAll('[data-analytics-module]').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          renderAnalytics();
        });
      });

      // Settings tab switching
      document.querySelectorAll('[data-settings-tab]').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('[data-settings-tab]').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const tab = btn.dataset.settingsTab;
          const allgemeinEl = document.getElementById('settingsTabAllgemein');
          const importExportEl = document.getElementById('settingsTabImportExport');
          const datenEl = document.getElementById('settingsTabDaten');
          if (allgemeinEl)    allgemeinEl.style.display    = tab === 'allgemein'      ? '' : 'none';
          if (importExportEl) importExportEl.style.display = tab === 'import-export'  ? '' : 'none';
          if (datenEl)        datenEl.style.display        = tab === 'daten'          ? '' : 'none';
          if (tab === 'import-export') renderImportLog();
        });
      });

      document.getElementById('btnSaveSettings')?.addEventListener('click', () => {
        const requestedRole = document.getElementById('settingsUserRole')?.value || state.settings.userRole || 'user';
        const requestedGovernance = document.getElementById('settingsEnforceDealGovernance')?.checked !== false;

        if (!hasPermission('settings_admin')) {
          if (requestedRole !== (state.settings.userRole || 'user') || requestedGovernance !== (state.settings.enforceDealGovernance !== false)) {
            showToast('⛔ Nur Admin darf Rolle und Governance aendern');
            const roleEl = document.getElementById('settingsUserRole');
            if (roleEl) roleEl.value = state.settings.userRole || 'user';
            const govEl = document.getElementById('settingsEnforceDealGovernance');
            if (govEl) govEl.checked = state.settings.enforceDealGovernance !== false;
            return;
          }
        }

        state.settings.name = document.getElementById('settingsName').value.trim();
        state.settings.company = document.getElementById('settingsCompany').value.trim();
        state.settings.guides = document.getElementById('settingsGuides').value.trim();
        state.settings.commProvider = document.getElementById('settingsCommProvider')?.value || 'mailto';
        state.settings.commSender = document.getElementById('settingsCommSender')?.value.trim() || '';
        state.settings.commAutoCompose = document.getElementById('settingsCommAutoCompose')?.checked === true;
        state.settings.commBridgeUrl = document.getElementById('settingsCommBridgeUrl')?.value.trim() || '';
        state.settings.commBridgeToken = document.getElementById('settingsCommBridgeToken')?.value || '';
        state.settings.immoApiKey = state.settings.commBridgeToken;
        state.settings.immoTemplateTone = state.settings.immoTemplateTone || 'consultative';
        state.settings.userRole = requestedRole;
        state.settings.enforceDealGovernance = requestedGovernance;
        saveSettings();
        const leadOwner = document.getElementById('leadOwner');
        const dealOwner = document.getElementById('dealOwner');
        if (leadOwner && !leadOwner.value) leadOwner.value = state.settings.name || '';
        if (dealOwner && !dealOwner.value) dealOwner.value = state.settings.name || '';
        applyRolePermissionsUI();
        updateImmoRadarApiIndicator();
        showToast('✅ Einstellungen gespeichert');
      });
      // (Analytics filter buttons – moved to Analytics Dashboard section above)

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeEditModal();

        const activeTag = document.activeElement?.tagName;
        const isTypingContext = activeTag === 'INPUT' || activeTag === 'TEXTAREA' || document.activeElement?.isContentEditable;

        if (e.key.toLowerCase() === 'n' && !isTypingContext) {
          document.getElementById('btnAddContact')?.click();
        }

        if (e.key.toLowerCase() === 'g' && e.ctrlKey && e.altKey && !isTypingContext) {
          document.getElementById('dashboardSearch')?.focus();
        }
      });
    });
