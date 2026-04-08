// firebase.js – Firebase Auth + Realtime Database (Org-Level shared data model)
// All shared team data lives under orgs/{orgId}/ instead of per-user silos.
// User-specific data (settings, profile, role, orgId) stays under users/{uid}/.

import { initializeApp, deleteApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import { getDatabase, ref, set, get, onValue, push } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBDFNel-aihRzmfOn_bEYuhbnp2euiXDF0",
  authDomain: "powerhour-8890a.firebaseapp.com",
  databaseURL: "https://powerhour-8890a-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "powerhour-8890a",
  storageBucket: "powerhour-8890a.firebasestorage.app",
  messagingSenderId: "533667633971",
  appId: "1:533667633971:web:670bd8a42e9a3eb0d7bc46"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// ─── Utility Functions ────────────────────────────────────────────────────────

function normalizeFirebaseArray(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data.filter(Boolean);
  if (typeof data === 'object') return Object.values(data).filter(Boolean);
  return [];
}

function toLocalDateString(dateValue) {
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function normalizeCallEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const tsRaw = entry.timestamp || entry.ts || entry.time || entry.createdAt || '';
  const timestamp = tsRaw ? new Date(tsRaw).toISOString() : new Date().toISOString();
  const date = entry.date || (tsRaw ? toLocalDateString(tsRaw) : '');

  let vorname = entry.vorname || '';
  let nachname = entry.nachname || '';
  if ((!vorname || !nachname) && entry.name) {
    const parts = String(entry.name).trim().split(/\s+/);
    if (!vorname) vorname = parts[0] || '';
    if (!nachname) nachname = parts.slice(1).join(' ');
  }

  const status = String(entry.status || 'called').toLowerCase();
  const notes = entry.notes || entry.problem || '';
  let mode = String(entry.mode || entry.sessionMode || '').toLowerCase();
  if (!['call', 'mail', 'outreach', 'followup'].includes(mode)) {
    if (status === 'followup' || status === 'followuptoday' || status === 'nokeinbedarf' || String(notes).toLowerCase().includes('followup')) mode = 'followup';
    else if (status === 'mail_sent' || status === 'mailsend' || status === 'mailtonewcontact' || String(notes).toLowerCase().includes('mail')) mode = 'mail';
    else if (status === 'request' || status === 'message' || status === 'reply' || String(notes).toLowerCase().includes('linkedin')) mode = 'outreach';
    else mode = 'call';
  }

  return {
    id: entry.id || entry.contactId || Math.random().toString(36).substr(2, 9),
    contactId: entry.contactId || '',
    vorname,
    nachname,
    firma: entry.firma || '',
    status,
    notes,
    mode,
    rating: Number(entry.rating || 0) || 0,
    timestamp,
    date
  };
}

// ─── Admin: Create new Firebase user ──────────────────────────────────────────

window.createFirebaseUserAccount = async ({ name, email, password, role, memberId, company, orgId }) => {
  const secondaryName = `userCreator_${Date.now()}`;
  const secondaryApp = initializeApp(firebaseConfig, secondaryName);
  const secondaryAuth = getAuth(secondaryApp);
  try {
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    const uid = cred.user.uid;
    const now = new Date().toISOString();

    const writeSafe = async (path, value) => {
      try {
        await set(ref(db, path), value);
      } catch (e) {
        const code = e?.code || '';
        if (code === 'permission-denied' || code === 'PERMISSION_DENIED' || String(code).toLowerCase().includes('permission')) return;
        throw e;
      }
    };

    // Per-user data: profile + role + orgId + personal settings
    await writeSafe(`users/${uid}/profile`, {
      uid,
      name: name || '',
      email,
      role: role || 'user',
      memberId: memberId || null,
      createdAt: now,
      createdBy: currentUser?.uid || null
    });
    await writeSafe(`users/${uid}/role`, role || 'user');
    await writeSafe(`users/${uid}/orgId`, orgId || state?.orgId || 'livetour');
    await writeSafe(`users/${uid}/memberId`, memberId || null);
    await writeSafe(`users/${uid}/settings`, {
      name: name || '',
      company: company || '',
      guides: '',
      commProvider: 'mailto',
      commSender: '',
      commAutoCompose: false,
      commBridgeUrl: '',
      commBridgeToken: '',
      immoApiKey: '',
      immoTemplateTone: 'consultative'
    });

    await signOut(secondaryAuth);
    return { uid, seeded: true };
  } finally {
    await deleteApp(secondaryApp).catch(() => {});
  }
};

// ─── Admin: Update user role ───────────────────────────────────────────────────

window.updateFirebaseUserRole = async (uid, role) => {
  if (!currentUser) throw new Error('not-authenticated');
  // Update authoritative role path
  await set(ref(db, `users/${uid}/role`), role);
  // Also update profile for display
  const profileSnap = await get(ref(db, `users/${uid}/profile`));
  const profileVal = profileSnap.val() || {};
  await set(ref(db, `users/${uid}/profile`), { ...profileVal, role });
  return true;
};

// ─── Admin: Password reset ─────────────────────────────────────────────────────

window.sendFirebasePasswordReset = async (email) => {
  await sendPasswordResetEmail(auth, email);
  return true;
};

// ─── MatKon: Project write helpers (exposed globally) ─────────────────────────

window.saveMatkonProject = async (project) => {
  const orgId = state?.orgId;
  if (!orgId || !currentUser) return;
  const path = project.id
    ? `orgs/${orgId}/matkon/projects/${project.id}`
    : `orgs/${orgId}/matkon/projects/${push(ref(db, `orgs/${orgId}/matkon/projects`)).key}`;
  if (!project.id) project.id = path.split('/').pop();
  await set(ref(db, path), project);
};

window.deleteMatkonProject = async (projectId) => {
  const orgId = state?.orgId;
  if (!orgId || !currentUser) return;
  await set(ref(db, `orgs/${orgId}/matkon/projects/${projectId}`), null);
};

window.addMatkonActivity = async (projectId, activity) => {
  const orgId = state?.orgId;
  if (!orgId || !currentUser) return;
  const newRef = push(ref(db, `orgs/${orgId}/matkon/projects/${projectId}/activity`));
  activity.id = newRef.key;
  activity.uid = currentUser.uid;
  activity.timestamp = activity.timestamp || new Date().toISOString();
  await set(newRef, activity);
  // Update project status based on activity type
  const statusMap = { package_sold: 'closed_won', rejected: 'closed_lost', demo_booked: 'in_progress', call_done: 'in_progress' };
  if (statusMap[activity.type]) {
    await set(ref(db, `orgs/${orgId}/matkon/projects/${projectId}/status`), statusMap[activity.type]);
    await set(ref(db, `orgs/${orgId}/matkon/projects/${projectId}/updatedAt`), activity.timestamp);
  }
};

window.updateMatkonChecklist = async (projectId, itemId, checked) => {
  const orgId = state?.orgId;
  if (!orgId || !currentUser) return;
  await set(ref(db, `orgs/${orgId}/matkon/projects/${projectId}/checklist/${itemId}/checked`), checked);
  await set(ref(db, `orgs/${orgId}/matkon/projects/${projectId}/checklist/${itemId}/checkedBy`), checked ? currentUser.uid : null);
  await set(ref(db, `orgs/${orgId}/matkon/projects/${projectId}/checklist/${itemId}/checkedAt`), checked ? new Date().toISOString() : null);
};

// ─── Login UI elements ─────────────────────────────────────────────────────────

const loginBtn = document.getElementById('btnLogin');
const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const loginError = document.getElementById('loginError');
const loginOverlay = document.getElementById('loginOverlay');
const appLayout = document.getElementById('appLayout');
const appDiv = document.getElementById('app');
const logoutBtn = document.getElementById('btnLogout');
const migrationJsonFile = document.getElementById('migrationJsonFile');
const migrationJsonPaste = document.getElementById('migrationJsonPaste');
const migrationImportBtn = document.getElementById('btnImportMigrationJson');

function showLoginError(msg) {
  loginError.textContent = msg;
  loginError.classList.add('show');
  setTimeout(() => loginError.classList.remove('show'), 4000);
}

loginBtn.addEventListener('click', async () => {
  const email = loginEmail.value.trim();
  const password = loginPassword.value.trim();
  if (!email || !password) { showLoginError('❌ Email und Passwort erforderlich'); return; }
  loginBtn.disabled = true;
  loginBtn.textContent = '⏳ Wird angemeldet...';
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    let msg = '❌ Fehler: ' + error.code;
    if (error.code === 'auth/user-not-found') msg = '❌ Email nicht gefunden';
    if (error.code === 'auth/wrong-password') msg = '❌ Passwort falsch';
    if (error.code === 'auth/invalid-email') msg = '❌ Ungültige Email';
    if (error.code === 'auth/invalid-credential') msg = '❌ Email oder Passwort falsch';
    if (error.code === 'auth/too-many-requests') msg = '❌ Zu viele Versuche. Warte kurz.';
    showLoginError(msg);
    loginBtn.disabled = false;
    loginBtn.textContent = '🔓 Anmelden';
  }
});

[loginEmail, loginPassword].forEach(el => {
  el.addEventListener('keypress', (e) => { if (e.key === 'Enter') loginBtn.click(); });
});

logoutBtn.addEventListener('click', async () => { await signOut(auth); });

// ─── Migration (file/JSON import) ─────────────────────────────────────────────

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('File read error'));
    reader.readAsText(file, 'UTF-8');
  });
}

if (migrationJsonFile) {
  migrationJsonFile.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const content = await readFileAsText(file);
      if (migrationJsonPaste) migrationJsonPaste.value = content;
      window.showToast?.('✅ JSON-Datei geladen');
    } catch (err) {
      window.showToast?.('❌ Datei konnte nicht gelesen werden');
    }
  });
}

if (migrationImportBtn) {
  migrationImportBtn.addEventListener('click', async () => {
    const orgId = state?.orgId;
    if (!currentUser || !orgId) { window.showToast?.('❌ Bitte erst anmelden und Org konfigurieren'); return; }
    let payload = migrationJsonPaste?.value || '';
    if (!payload && migrationJsonFile?.files?.[0]) {
      try { payload = await readFileAsText(migrationJsonFile.files[0]); } catch (err) { console.error(err); }
    }
    if (!payload) { window.showToast?.('❌ Kein JSON gefunden'); return; }
    try {
      const parsed = JSON.parse(payload.trim());
      await set(ref(db, `orgs/${orgId}`), parsed);
      window.showToast?.('✅ Migration importiert');
    } catch (e) {
      window.showToast?.(`❌ Import fehlgeschlagen: ${e.message}`);
    }
  });
}

// ─── Auth State Change → Load Org Data ────────────────────────────────────────

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    // Start with minimum privilege until remote role is confirmed
    state.settings.userRole = 'user';
    applyRolePermissionsUI?.();

    try {
      // Step 1: Load user record to get orgId, role, memberId
      const userSnap = await get(ref(db, `users/${user.uid}`));
      const userRecord = userSnap.val() || {};

      const orgId = userRecord.orgId || null;
      const remoteRole = userRecord.role || userRecord.profile?.role || userRecord.settings?.userRole || 'user';
      const memberId = userRecord.memberId || userRecord.profile?.memberId || null;

      if (!orgId) {
        // New user without org assignment – show error
        loginOverlay.classList.remove('hidden');
        if (appLayout) appLayout.style.display = 'none';
        showLoginError('⚠️ Kein Team konfiguriert. Bitte Admin kontaktieren.');
        await signOut(auth);
        return;
      }

      // Store org context in global state
      state.orgId = orgId;
      state.settings.userRole = ['admin', 'manager', 'user'].includes(remoteRole) ? remoteRole : 'user';
      state.currentUserProfile = userRecord.profile || { uid: user.uid, name: userRecord.settings?.name || '', role: remoteRole, memberId };
      if (memberId) state.currentUserProfile.memberId = memberId;

      // Show app
      loginOverlay.classList.add('hidden');
      if (appLayout) appLayout.style.display = 'grid';
      if (appDiv) appDiv.style.display = 'block';
      loginBtn.disabled = false;
      loginBtn.textContent = '🔓 Anmelden';

      applyRolePermissionsUI?.();
      populateAnalyticsMemberFilter?.();

      // Step 2: Subscribe to personal settings
      onValue(ref(db, `users/${user.uid}/settings`), (snapshot) => {
        const s = snapshot.val();
        if (s && typeof s === 'object') {
          state.settings = { ...state.settings, ...s };
          // Role is authoritative from users/{uid}/role, not settings
          state.settings.userRole = ['admin', 'manager', 'user'].includes(remoteRole) ? remoteRole : 'user';
          localStorage.setItem('phsettings', JSON.stringify(state.settings));
          const nameEl = document.getElementById('settingsName');
          if (nameEl) nameEl.value = state.settings.name || '';
          const companyEl = document.getElementById('settingsCompany');
          if (companyEl) companyEl.value = state.settings.company || '';
          const guidesEl = document.getElementById('settingsGuides');
          if (guidesEl) guidesEl.value = state.settings.guides || '';
        }
      });

      // Step 3: Subscribe to ALL shared org collections
      // contacts
      onValue(ref(db, `orgs/${orgId}/contacts`), (snapshot) => {
        const remoteList = normalizeFirebaseArray(snapshot.val());
        state.contacts = remoteList;
        localStorage.setItem('phcontacts', JSON.stringify(state.contacts));
        renderKontakte?.();
        renderContactsTable?.();
        renderStats?.();
        updateKontakteStats?.();
      }, (e) => console.error('Firebase contacts error:', e));

      // calls
      onValue(ref(db, `orgs/${orgId}/calls`), (snapshot) => {
        const remoteList = normalizeFirebaseArray(snapshot.val()).map(normalizeCallEntry).filter(Boolean);
        state.callLog = remoteList;
        localStorage.setItem('phlog', JSON.stringify(state.callLog));
        renderSessionLog?.();
        renderAnalytics?.();
      }, (e) => console.error('Firebase calls error:', e));

      // tags
      onValue(ref(db, `orgs/${orgId}/tags`), (snapshot) => {
        const remoteList = normalizeFirebaseArray(snapshot.val());
        state.tags = remoteList;
        localStorage.setItem('phtags', JSON.stringify(state.tags));
        renderTagsList?.();
        renderTagFilter?.();
        renderEditTagSelect?.();
        renderKontakte?.();
      }, (e) => console.error('Firebase tags error:', e));

      // companies
      onValue(ref(db, `orgs/${orgId}/companies`), (snapshot) => {
        const remoteList = normalizeFirebaseArray(snapshot.val());
        state.companies = remoteList;
        localStorage.setItem('phcompanies', JSON.stringify(state.companies));
        renderCompaniesTable?.();
        renderCompanyOptions?.();
        renderLeadOptions?.();
      }, (e) => console.error('Firebase companies error:', e));

      // leads
      onValue(ref(db, `orgs/${orgId}/leads`), (snapshot) => {
        const remoteList = normalizeFirebaseArray(snapshot.val());
        state.leads = remoteList;
        localStorage.setItem('phleads', JSON.stringify(state.leads));
        renderLeadsTable?.();
        renderOutreachContactOptions?.();
        renderLeadOptions?.();
        renderAnalytics?.();
      }, (e) => console.error('Firebase leads error:', e));

      // deals
      onValue(ref(db, `orgs/${orgId}/deals`), (snapshot) => {
        const remoteList = normalizeFirebaseArray(snapshot.val());
        state.deals = remoteList;
        localStorage.setItem('phdeals', JSON.stringify(state.deals));
        renderDealsTable?.();
        renderPipelineBoard?.();
      }, (e) => console.error('Firebase deals error:', e));

      // activities
      onValue(ref(db, `orgs/${orgId}/activities`), (snapshot) => {
        const remoteList = normalizeFirebaseArray(snapshot.val());
        state.activities = remoteList;
        localStorage.setItem('phactivities', JSON.stringify(state.activities));
        renderActivitiesTable?.();
        renderAnalytics?.();
      }, (e) => console.error('Firebase activities error:', e));

      // templates
      onValue(ref(db, `orgs/${orgId}/templates`), (snapshot) => {
        const remoteList = normalizeFirebaseArray(snapshot.val());
        state.templates = remoteList;
        localStorage.setItem('phtemplates', JSON.stringify(state.templates));
        renderTemplatesList?.();
        renderTemplateOptions?.();
      }, (e) => console.error('Firebase templates error:', e));

      // sequences
      onValue(ref(db, `orgs/${orgId}/sequences`), (snapshot) => {
        const remoteList = normalizeFirebaseArray(snapshot.val());
        state.sequences = remoteList;
        localStorage.setItem('phsequences', JSON.stringify(state.sequences));
        renderSequencesList?.();
      }, (e) => console.error('Firebase sequences error:', e));

      // members (shared team members)
      onValue(ref(db, `orgs/${orgId}/members`), (snapshot) => {
        const remoteList = normalizeFirebaseArray(snapshot.val());
        state.members = remoteList;
        localStorage.setItem('phmembers', JSON.stringify(state.members));
        renderMembersList?.();
        renderMemberSwitcher?.();
        renderMatkonMemberFilters?.();
      }, (e) => console.error('Firebase members error:', e));

      // tasks
      onValue(ref(db, `orgs/${orgId}/tasks`), (snapshot) => {
        const remoteList = normalizeFirebaseArray(snapshot.val());
        state.tasks = remoteList;
        localStorage.setItem('phtasks', JSON.stringify(state.tasks));
        renderTasks?.();
        if (state.tasksTab === 'analytics') renderTasksAnalytics?.();
      }, (e) => console.error('Firebase tasks error:', e));

      // liSnapshots
      onValue(ref(db, `orgs/${orgId}/liSnapshots`), (snapshot) => {
        const remoteList = normalizeFirebaseArray(snapshot.val());
        state.liSnapshots = remoteList;
        localStorage.setItem('phliSnapshots', JSON.stringify(state.liSnapshots));
        if (state.tasksTab === 'linkedin') renderLiTracking?.();
        if (state.tasksTab === 'analytics') renderTasksAnalytics?.();
      }, (e) => console.error('Firebase liSnapshots error:', e));

      // liPosts
      onValue(ref(db, `orgs/${orgId}/liPosts`), (snapshot) => {
        const remoteList = normalizeFirebaseArray(snapshot.val());
        state.liPosts = remoteList;
        localStorage.setItem('phliPosts', JSON.stringify(state.liPosts));
        if (state.tasksTab === 'linkedin') renderLiTracking?.();
        if (state.tasksTab === 'analytics') renderTasksAnalytics?.();
      }, (e) => console.error('Firebase liPosts error:', e));

      // weeklyGoals
      onValue(ref(db, `orgs/${orgId}/weeklyGoals`), (snapshot) => {
        const remoteGoals = snapshot.val();
        if (remoteGoals && typeof remoteGoals === 'object') {
          state.weeklyGoals = remoteGoals;
          localStorage.setItem('phWeeklyGoals', JSON.stringify(state.weeklyGoals));
          if (state.tasksTab === 'analytics') renderTasksAnalytics?.();
        }
      }, (e) => console.error('Firebase weeklyGoals error:', e));

      // weeklyChecklist
      onValue(ref(db, `orgs/${orgId}/weeklyChecklist`), (snapshot) => {
        const remoteList = normalizeFirebaseArray(snapshot.val());
        state.weeklyChecklist = remoteList;
        localStorage.setItem('phWeeklyChecklist', JSON.stringify(state.weeklyChecklist));
        if (state.tasksTab === 'analytics') renderTasksAnalytics?.();
      }, (e) => console.error('Firebase weeklyChecklist error:', e));

      // userAccounts (team user list, managed by admin)
      onValue(ref(db, `orgs/${orgId}/userAccounts`), (snapshot) => {
        const remoteList = normalizeFirebaseArray(snapshot.val());
        state.userAccounts = remoteList;
        localStorage.setItem('phUserAccounts', JSON.stringify(state.userAccounts));
        renderUserAccountsList?.();
      }, (e) => console.error('Firebase userAccounts error:', e));

      // MatKon projects (real-time)
      onValue(ref(db, `orgs/${orgId}/matkon/projects`), (snapshot) => {
        const raw = snapshot.val() || {};
        // Convert Firebase object to array, include nested activity/checklist as objects
        state.matkonProjects = Object.entries(raw).map(([id, val]) => ({ ...val, id }));
        renderMatkonProjects?.();
        if (document.querySelector('[data-matkon-tab="analytics"]')?.classList.contains('active')) {
          renderMatkonAnalytics?.();
        }
      }, (e) => console.error('Firebase matkonProjects error:', e));

      // MatKon checklist template
      onValue(ref(db, `orgs/${orgId}/matkon/checklistTemplate`), (snapshot) => {
        state.matkonChecklistTemplate = normalizeFirebaseArray(snapshot.val());
      }, (e) => console.error('Firebase matkonChecklistTemplate error:', e));

      // ─── syncToFirebase: writes to org-level paths ─────────────────────────
      window.syncToFirebase = (type, data) => {
        set(ref(db, `orgs/${orgId}/${type}`), data)
          .catch(e => console.error('Firebase sync error:', e));
      };

      // Personal settings save (still per-user)
      window.syncSettingsToFirebase = (data) => {
        set(ref(db, `users/${user.uid}/settings`), data)
          .catch(e => console.error('Firebase settings sync error:', e));
      };

    } catch (err) {
      console.error('Auth state error:', err);
      showLoginError('❌ Fehler beim Laden der Daten');
    }

  } else {
    // Logged out
    currentUser = null;
    state.orgId = null;
    state.currentUserProfile = null;
    window.syncToFirebase = null;
    window.syncSettingsToFirebase = null;
    localStorage.removeItem('phCurrentUserProfile');
    loginOverlay.classList.remove('hidden');
    if (appLayout) appLayout.style.display = 'none';
    if (appDiv) appDiv.style.display = 'none';
    loginEmail.value = '';
    loginPassword.value = '';
    loginBtn.disabled = false;
    loginBtn.textContent = '🔓 Anmelden';
  }
});
