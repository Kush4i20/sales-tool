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

// ─── HKM Write Helpers ────────────────────────────────────────────────────────

window.saveHkmLead = async (lead) => {
  if (!currentUser) throw new Error('not-authenticated');
  const path = lead.id
    ? `hkm/leads/${lead.id}`
    : `hkm/leads/${push(ref(db, 'hkm/leads')).key}`;
  if (!lead.id) lead.id = path.split('/').pop();
  lead.updatedAt = new Date().toISOString();
  if (!lead.createdAt) lead.createdAt = lead.updatedAt;
  await set(ref(db, path), lead);
};

window.deleteHkmLead = async (leadId) => {
  if (!currentUser) throw new Error('not-authenticated');
  await set(ref(db, `hkm/leads/${leadId}`), null);
};

// Reset all VisuMat test data (admin only)
window.hkmFirebaseReset = async (mode) => {
  if (!currentUser) throw new Error('not-authenticated');
  // Delete all leads and activities
  await set(ref(db, 'hkm/leads'),      null);
  await set(ref(db, 'hkm/activities'), null);
  if (mode === 'full') {
    // Reset every profile's gamification stats to zero; keep name/role/memberId
    const snap = await get(ref(db, 'hkm/profiles'));
    if (snap.exists()) {
      const updates = [];
      snap.forEach(child => {
        const uid = child.key;
        updates.push(
          set(ref(db, `hkm/profiles/${uid}/knochen`),          0),
          set(ref(db, `hkm/profiles/${uid}/rang`),             'dackel'),
          set(ref(db, `hkm/profiles/${uid}/provision_total`),  0),
          set(ref(db, `hkm/profiles/${uid}/katzen_count`),     0),
          set(ref(db, `hkm/profiles/${uid}/boni_ausgezahlt`),  []),
          set(ref(db, `hkm/profiles/${uid}/streak_days`),      0),
          set(ref(db, `hkm/profiles/${uid}/last_active_date`), null)
        );
      });
      await Promise.all(updates);
    }
  }
};

window.saveHkmChallenge = async (ch) => {
  if (!currentUser) throw new Error('not-authenticated');
  const path = ch.id
    ? `hkm/challenges/${ch.id}`
    : `hkm/challenges/${push(ref(db, 'hkm/challenges')).key}`;
  if (!ch.id) ch.id = path.split('/').pop();
  await set(ref(db, path), ch);
};

window.completeHkmChallenge = async (challengeId, winnerUid, loserUid, knochenEinsatz) => {
  if (!currentUser) throw new Error('not-authenticated');
  // Transfer knochen from loser to winner
  if (loserUid && knochenEinsatz > 0) {
    await window.transferHkmKnochen(loserUid, winnerUid, knochenEinsatz, `Challenge abgeschlossen: ${challengeId}`);
  }
  // Mark challenge as completed
  await set(ref(db, `hkm/challenges/${challengeId}/status`),      'abgeschlossen');
  await set(ref(db, `hkm/challenges/${challengeId}/winner_uid`),  winnerUid);
  await set(ref(db, `hkm/challenges/${challengeId}/loser_uid`),   loserUid);
};

window.transferHkmKnochen = async (vonUid, zuUid, anzahl, grund) => {
  if (!currentUser) throw new Error('not-authenticated');
  const vonSnap = await get(ref(db, `hkm/profiles/${vonUid}/knochen`));
  const vonKnochen = Number(vonSnap.val() || 0);
  const newVon = Math.max(0, vonKnochen - anzahl);

  const zuSnap = await get(ref(db, `hkm/profiles/${zuUid}/knochen`));
  const zuKnochen = Number(zuSnap.val() || 0) + anzahl;

  await set(ref(db, `hkm/profiles/${vonUid}/knochen`), newVon);
  await set(ref(db, `hkm/profiles/${zuUid}/knochen`),  zuKnochen);

  // Log transfer
  const transferRef = push(ref(db, 'hkm/knochen_transfers'));
  await set(transferRef, {
    id:          transferRef.key,
    von_uid:     vonUid,
    zu_uid:      zuUid,
    anzahl,
    grund,
    erstellt_von: currentUser.uid,
    createdAt:   new Date().toISOString()
  });

  // Rang check for both
  await hkmCheckAndApplyRang(vonUid);
  await hkmCheckAndApplyRang(zuUid);
};

window.adjustHkmKnochen = async (uid, amount, grund) => {
  if (!currentUser) throw new Error('not-authenticated');
  const snap = await get(ref(db, `hkm/profiles/${uid}/knochen`));
  const current = Number(snap.val() || 0);
  const newVal = Math.max(0, current + amount);
  await set(ref(db, `hkm/profiles/${uid}/knochen`), newVal);

  // Log as transfer with system marker
  const tRef = push(ref(db, 'hkm/knochen_transfers'));
  await set(tRef, {
    id: tRef.key,
    von_uid: amount > 0 ? 'system' : uid,
    zu_uid:  amount > 0 ? uid : 'system',
    anzahl:  Math.abs(amount),
    grund,
    erstellt_von: currentUser.uid,
    createdAt: new Date().toISOString()
  });

  await hkmCheckAndApplyRang(uid);
};

window.setHkmRole = async (uid, role) => {
  if (!currentUser) throw new Error('not-authenticated');
  await set(ref(db, `hkm/profiles/${uid}/role`), role);
};

window.setHkmProfileName = async (uid, name) => {
  if (!currentUser) throw new Error('not-authenticated');
  await set(ref(db, `hkm/profiles/${uid}/name`), name);
};

window.saveHkmActivity = async (activity) => {
  if (!currentUser) throw new Error('not-authenticated');
  const actRef = push(ref(db, 'hkm/activities'));
  activity.id = actRef.key;
  activity.user_id = activity.user_id || currentUser.uid;
  await set(actRef, activity);

  // Update lead status
  const leadStatusMap = { demo: 'demo_gebucht', deal: 'abgeschlossen', absage: 'abgesagt', call: null };
  const newStatus = leadStatusMap[activity.type];
  if (newStatus && activity.lead_id) {
    await set(ref(db, `hkm/leads/${activity.lead_id}/status`), newStatus);
  }

  // Award knochen for deals
  if (activity.type === 'deal') {
    const uid = activity.user_id;
    const firma = activity.firma || null;

    // Check if Neukunde or Folgeprojekt
    const allActs = await get(ref(db, 'hkm/activities'));
    const actsData = allActs.val() || {};
    const prevDeals = Object.values(actsData).filter(a =>
      a.type === 'deal' && a.id !== activity.id
    );
    const leadSnap = await get(ref(db, `hkm/leads/${activity.lead_id}`));
    const leadData = leadSnap.val() || {};
    const firmaName = leadData.firma || '';

    const isNeukunde = !prevDeals.some(a => {
      if (!firmaName) return false;
      const prevLeadSnap = state?.hkmLeads?.find(l => l.id === a.lead_id);
      return prevLeadSnap?.firma?.toLowerCase() === firmaName.toLowerCase();
    });

    const knochenAmount = isNeukunde ? 2 : 1;
    const reason = isNeukunde
      ? `Neukunden-Deal: ${firmaName || activity.lead_id}`
      : `Folge-Deal: ${firmaName || activity.lead_id}`;

    // Add knochen
    const snap = await get(ref(db, `hkm/profiles/${uid}/knochen`));
    const current = Number(snap.val() || 0);
    await set(ref(db, `hkm/profiles/${uid}/knochen`), current + knochenAmount);

    // Add provision
    if (activity.paket_preis) {
      const rangSnap = await get(ref(db, `hkm/profiles/${uid}/rang`));
      const rangKey  = rangSnap.val() || 'dackel';
      const RANG_PROV = { dackel: 3, boxer: 4, schaefer: 5, dogge: 6 };
      const provPct  = RANG_PROV[rangKey] || 3;
      const provision = Math.round(activity.paket_preis * provPct / 100);
      const provSnap = await get(ref(db, `hkm/profiles/${uid}/provision_total`));
      const currentProv = Number(provSnap.val() || 0);
      await set(ref(db, `hkm/profiles/${uid}/provision_total`), currentProv + provision);
    }

    // Add katze for Neukunde
    if (isNeukunde) {
      const katSnap = await get(ref(db, `hkm/profiles/${uid}/katzen_count`));
      const katzen = Number(katSnap.val() || 0);
      await set(ref(db, `hkm/profiles/${uid}/katzen_count`), katzen + 1);
    }

    // Log transfer
    const tRef = push(ref(db, 'hkm/knochen_transfers'));
    await set(tRef, {
      id: tRef.key,
      von_uid: 'system',
      zu_uid:  uid,
      anzahl:  knochenAmount,
      grund:   reason,
      erstellt_von: currentUser.uid,
      createdAt: new Date().toISOString()
    });

    // Check rang
    await hkmCheckAndApplyRang(uid);
  }
};

async function hkmCheckAndApplyRang(uid) {
  const knochenSnap = await get(ref(db, `hkm/profiles/${uid}/knochen`));
  const knochen = Number(knochenSnap.val() || 0);
  const currentRangSnap = await get(ref(db, `hkm/profiles/${uid}/rang`));
  const currentRang = currentRangSnap.val() || 'dackel';

  const RANG_STUFEN_FB = [
    { key: 'dackel',   min: 0,  max: 9,    bonus: 0     },
    { key: 'boxer',    min: 10, max: 29,   bonus: 2000  },
    { key: 'schaefer', min: 30, max: 59,   bonus: 5000  },
    { key: 'dogge',    min: 60, max: 9999, bonus: 10000 }
  ];

  let newRang = 'dackel';
  for (let i = RANG_STUFEN_FB.length - 1; i >= 0; i--) {
    if (knochen >= RANG_STUFEN_FB[i].min) { newRang = RANG_STUFEN_FB[i].key; break; }
  }

  if (newRang !== currentRang) {
    await set(ref(db, `hkm/profiles/${uid}/rang`), newRang);

    const rangData = RANG_STUFEN_FB.find(r => r.key === newRang);
    const isUpgrade = RANG_STUFEN_FB.findIndex(r => r.key === newRang) > RANG_STUFEN_FB.findIndex(r => r.key === currentRang);

    // Log rang change
    const logRef = push(ref(db, 'hkm/rang_log'));
    await set(logRef, {
      id: logRef.key,
      uid,
      von_rang: currentRang,
      zu_rang:  newRang,
      bonus_chf: isUpgrade ? (rangData?.bonus || 0) : 0,
      createdAt: new Date().toISOString()
    });

    // Pay bonus for upgrade (track in profile to avoid double-pay)
    if (isUpgrade && rangData?.bonus > 0) {
      const bonusSnap = await get(ref(db, `hkm/profiles/${uid}/boni_ausgezahlt`));
      const boniArr = normalizeFirebaseArray(bonusSnap.val());
      if (!boniArr.includes(newRang)) {
        boniArr.push(newRang);
        await set(ref(db, `hkm/profiles/${uid}/boni_ausgezahlt`), boniArr);
      }
    }

    // Trigger celebration if it's the current user's rang change
    if (uid === currentUser?.uid && isUpgrade) {
      window.triggerHkmCelebration?.(newRang, isUpgrade ? (rangData?.bonus || 0) : 0);
    }
  }
}

window.hkmUpdateStreak = async () => {
  if (!currentUser) return;
  const uid = currentUser.uid;
  const today = new Date().toISOString().split('T')[0];
  const snap = await get(ref(db, `hkm/profiles/${uid}`));
  const profile = snap.val();
  if (!profile) return;

  const lastActive = profile.last_active_date || '';
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  let newStreak = profile.streak_days || 0;
  if (lastActive === today) {
    return; // already updated today
  } else if (lastActive === yesterday) {
    newStreak = newStreak + 1;
  } else {
    newStreak = 1;
  }
  await set(ref(db, `hkm/profiles/${uid}/streak_days`),     newStreak);
  await set(ref(db, `hkm/profiles/${uid}/last_active_date`), today);
};

async function hkmEnsureProfile(uid, name, email) {
  const snap = await get(ref(db, `hkm/profiles/${uid}`));
  if (!snap.val()) {
    await set(ref(db, `hkm/profiles/${uid}`), {
      uid,
      name:          name || '',
      email:         email || '',
      role:          'user',
      rang:          'dackel',
      knochen:       0,
      katzen_count:  0,
      provision_total: 0,
      streak_days:   0,
      last_active_date: '',
      boni_ausgezahlt: [],
      createdAt:     new Date().toISOString()
    });
  }
}

window.hkmCreateProfile = async (uid, name, email) => {
  if (!currentUser) throw new Error('not-authenticated');
  await set(ref(db, `hkm/profiles/${uid}`), {
    uid,
    name:          name || '',
    email:         email || '',
    role:          'user',
    rang:          'dackel',
    knochen:       0,
    katzen_count:  0,
    provision_total: 0,
    streak_days:   0,
    last_active_date: '',
    boni_ausgezahlt: [],
    createdAt:     new Date().toISOString()
  });
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
      // Helper: on first load, if Firebase is empty but localStorage has data → auto-sync up.
      // This prevents "empty Firebase wipes local cache" data loss on first login.
      function makeSyncHandler(fbPath, localKey, stateKey, renderFns, normalizer) {
        let initialized = false;
        return {
          handler: (snapshot) => {
            const raw = snapshot.val();
            let remoteList = normalizeFirebaseArray(raw);
            if (normalizer) remoteList = remoteList.map(normalizer).filter(Boolean);

            if (!initialized && remoteList.length === 0) {
              // Firebase is empty on first load — check if local cache has data
              try {
                const local = JSON.parse(localStorage.getItem(localKey) || '[]');
                if (local.length > 0) {
                  // Auto-sync local → Firebase (restores unsync'd data)
                  set(ref(db, fbPath), local).catch(e => console.error(`Auto-sync ${stateKey} error:`, e));
                  console.info(`[Firebase] Auto-synced ${local.length} ${stateKey} from localStorage → Firebase`);
                  state[stateKey] = local;
                  initialized = true;
                  renderFns.forEach(fn => fn?.());
                  return;
                }
              } catch (_) {}
            }
            initialized = true;
            state[stateKey] = remoteList;
            localStorage.setItem(localKey, JSON.stringify(remoteList));
            renderFns.forEach(fn => fn?.());
          }
        };
      }

      // contacts
      onValue(ref(db, `orgs/${orgId}/contacts`),
        makeSyncHandler(`orgs/${orgId}/contacts`, 'phcontacts', 'contacts', [
          () => renderKontakte?.(), () => renderContactsTable?.(),
          () => renderStats?.(), () => updateKontakteStats?.()
        ]).handler,
        (e) => console.error('Firebase contacts error:', e));

      // calls
      onValue(ref(db, `orgs/${orgId}/calls`),
        makeSyncHandler(`orgs/${orgId}/calls`, 'phlog', 'callLog', [
          () => renderSessionLog?.(), () => renderAnalytics?.()
        ], normalizeCallEntry).handler,
        (e) => console.error('Firebase calls error:', e));

      // tags
      onValue(ref(db, `orgs/${orgId}/tags`),
        makeSyncHandler(`orgs/${orgId}/tags`, 'phtags', 'tags', [
          () => renderTagsList?.(), () => renderTagFilter?.(),
          () => renderEditTagSelect?.(), () => renderKontakte?.()
        ]).handler,
        (e) => console.error('Firebase tags error:', e));

      // companies
      onValue(ref(db, `orgs/${orgId}/companies`),
        makeSyncHandler(`orgs/${orgId}/companies`, 'phcompanies', 'companies', [
          () => renderCompaniesTable?.(), () => renderCompanyOptions?.(), () => renderLeadOptions?.()
        ]).handler,
        (e) => console.error('Firebase companies error:', e));

      // leads
      onValue(ref(db, `orgs/${orgId}/leads`),
        makeSyncHandler(`orgs/${orgId}/leads`, 'phleads', 'leads', [
          () => renderLeadsTable?.(), () => renderOutreachContactOptions?.(),
          () => renderLeadOptions?.(), () => renderAnalytics?.()
        ]).handler,
        (e) => console.error('Firebase leads error:', e));

      // deals
      onValue(ref(db, `orgs/${orgId}/deals`),
        makeSyncHandler(`orgs/${orgId}/deals`, 'phdeals', 'deals', [
          () => renderDealsTable?.(), () => renderPipelineBoard?.()
        ]).handler,
        (e) => console.error('Firebase deals error:', e));

      // activities
      onValue(ref(db, `orgs/${orgId}/activities`),
        makeSyncHandler(`orgs/${orgId}/activities`, 'phactivities', 'activities', [
          () => renderActivitiesTable?.(), () => renderAnalytics?.()
        ]).handler,
        (e) => console.error('Firebase activities error:', e));

      // templates
      onValue(ref(db, `orgs/${orgId}/templates`),
        makeSyncHandler(`orgs/${orgId}/templates`, 'phtemplates', 'templates', [
          () => renderTemplatesList?.(), () => renderTemplateOptions?.()
        ]).handler,
        (e) => console.error('Firebase templates error:', e));

      // sequences
      onValue(ref(db, `orgs/${orgId}/sequences`),
        makeSyncHandler(`orgs/${orgId}/sequences`, 'phsequences', 'sequences', [
          () => renderSequencesList?.()
        ]).handler,
        (e) => console.error('Firebase sequences error:', e));

      // members (shared team members)
      onValue(ref(db, `orgs/${orgId}/members`),
        makeSyncHandler(`orgs/${orgId}/members`, 'phmembers', 'members', [
          () => renderMembersList?.(), () => renderMemberSwitcher?.(), () => renderMatkonMemberFilters?.()
        ]).handler,
        (e) => console.error('Firebase members error:', e));

      // tasks
      onValue(ref(db, `orgs/${orgId}/tasks`),
        makeSyncHandler(`orgs/${orgId}/tasks`, 'phtasks', 'tasks', [
          () => renderTasks?.(),
          () => { if (state.tasksTab === 'analytics') renderTasksAnalytics?.(); },
          () => renderBoardKanban?.(),
          () => renderDashboardBoards?.()
        ]).handler,
        (e) => console.error('Firebase tasks error:', e));

      // boards
      onValue(ref(db, `orgs/${orgId}/boards`),
        makeSyncHandler(`orgs/${orgId}/boards`, 'phboards', 'boards', [
          () => renderBoards?.(),
          () => renderBoardKanban?.(),
          () => renderDashboardBoards?.()
        ]).handler,
        (e) => console.error('Firebase boards error:', e));

      // checklistTemplates
      onValue(ref(db, `orgs/${orgId}/checklistTemplates`),
        makeSyncHandler(`orgs/${orgId}/checklistTemplates`, 'phChecklistTemplates', 'checklistTemplates', [
          () => renderTemplatesList_Checklist?.()
        ]).handler,
        (e) => console.error('Firebase checklistTemplates error:', e));

      // boardTemplates
      onValue(ref(db, `orgs/${orgId}/boardTemplates`),
        makeSyncHandler(`orgs/${orgId}/boardTemplates`, 'phBoardTemplates', 'boardTemplates', [
          () => renderTemplatesList_Checklist?.()
        ]).handler,
        (e) => console.error('Firebase boardTemplates error:', e));

      // taskTypes
      onValue(ref(db, `orgs/${orgId}/taskTypes`),
        makeSyncHandler(`orgs/${orgId}/taskTypes`, 'phTaskTypes', 'taskTypes', [
          () => renderTaskTypesSettings?.()
        ]).handler,
        (e) => console.error('Firebase taskTypes error:', e));

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

      // ─── HKM global subscriptions (at /hkm/ root, not per-org) ──────────────
      // Ensure profile exists for this user
      hkmEnsureProfile(user.uid, state.currentUserProfile?.name || state.settings?.name || '', user.email || '').catch(console.error);

      onValue(ref(db, 'hkm/profiles'), (snapshot) => {
        state.hkmProfiles = snapshot.val() || {};
        window.renderHkmLeaderboard?.();
        window.renderHkmAdminProfiles?.();
      }, (e) => console.error('HKM profiles error:', e));

      onValue(ref(db, 'hkm/leads'), (snapshot) => {
        const raw = snapshot.val() || {};
        state.hkmLeads = Object.values(raw).filter(Boolean);
        window.renderHkmLeads?.();
      }, (e) => console.error('HKM leads error:', e));

      onValue(ref(db, 'hkm/activities'), (snapshot) => {
        const raw = snapshot.val() || {};
        state.hkmActivities = Object.values(raw).filter(Boolean);
        window.renderHkmLeaderboard?.();
        window.renderHkmLeads?.();
      }, (e) => console.error('HKM activities error:', e));

      onValue(ref(db, 'hkm/challenges'), (snapshot) => {
        const raw = snapshot.val() || {};
        state.hkmChallenges = Object.values(raw).filter(Boolean);
        window.renderHkmChallenges?.();
      }, (e) => console.error('HKM challenges error:', e));

      onValue(ref(db, 'hkm/knochen_transfers'), (snapshot) => {
        const raw = snapshot.val() || {};
        state.hkmKnochenTransfers = Object.values(raw).filter(Boolean);
      }, (e) => console.error('HKM knochen_transfers error:', e));

      onValue(ref(db, 'hkm/rang_log'), (snapshot) => {
        const raw = snapshot.val() || {};
        state.hkmRangLog = Object.values(raw).filter(Boolean);
      }, (e) => console.error('HKM rang_log error:', e));

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
