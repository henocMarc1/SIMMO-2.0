// auth-protect.js
// module pour gérer l'authentification via Firebase + modal login/register

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

/* --- copie ta config Firebase ici (fourni par toi) --- */
const firebaseConfig = {
  apiKey: "AIzaSyAn8qN6WNhQSByxJjppGNZXZ5B7_sG-MV4",
  authDomain: "simmo-21084.firebaseapp.com",
  databaseURL: "https://simmo-21084-default-rtdb.firebaseio.com",
  projectId: "simmo-21084",
  storageBucket: "simmo-21084.firebasestorage.app",
  messagingSenderId: "260886429597",
  appId: "1:260886429597:web:aeeb11ec2ad4715cf7b974",
  measurementId: "G-SBENTVR4SZ"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// expose db/auth globalement pour que script.js puisse les importer si besoin
window.__FB = { app, auth, db };

/* ---------- Helper UI (modal login/register) ---------- */
function buildAuthModal() {
  if (document.getElementById('authModal')) return;

  const html = `
  <div id="authModal" class="auth-modal-overlay" aria-hidden="false">
    <div class="auth-modal">
      <button id="authClose" class="auth-close" title="Fermer">×</button>
      <h2>Connexion / Inscription</h2>

      <div class="auth-tabs">
        <button id="tabLogin" class="active">Se connecter</button>
        <button id="tabRegister">S'inscrire</button>
      </div>

      <form id="authForm">
        <div class="auth-field">
          <label for="authEmail">E-mail</label>
          <input id="authEmail" type="email" required />
        </div>
        <div class="auth-field">
          <label for="authPassword">Mot de passe</label>
          <input id="authPassword" type="password" required minlength="6" />
        </div>

        <div id="registerExtra" style="display:none;">
          <div class="auth-field">
            <label for="authName">Nom complet</label>
            <input id="authName" type="text" />
          </div>
        </div>

        <div style="display:flex;gap:8px;margin-top:10px;">
          <button id="authSubmit" class="btn btn-primary" type="submit">Se connecter</button>
          <button id="authReset" type="button" class="btn">Mot de passe ?</button>
        </div>

        <div id="authMessage" style="margin-top:10px;color:#c0392b;"></div>
      </form>
    </div>
  </div>
  `;

  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;
  document.body.appendChild(wrapper);

  // events
  const tabLogin = document.getElementById('tabLogin');
  const tabRegister = document.getElementById('tabRegister');
  const registerExtra = document.getElementById('registerExtra');
  const authSubmit = document.getElementById('authSubmit');
  const authForm = document.getElementById('authForm');
  const authReset = document.getElementById('authReset');
  const authClose = document.getElementById('authClose');
  const authMessage = document.getElementById('authMessage');

  tabLogin.addEventListener('click', () => {
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    registerExtra.style.display = 'none';
    authSubmit.textContent = 'Se connecter';
  });

  tabRegister.addEventListener('click', () => {
    tabRegister.classList.add('active');
    tabLogin.classList.remove('active');
    registerExtra.style.display = 'block';
    authSubmit.textContent = "S'inscrire";
  });

  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    authMessage.textContent = '';
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;
    const name = document.getElementById('authName').value.trim();

    if (tabLogin.classList.contains('active')) {
      // login
      try {
        await signInWithEmailAndPassword(auth, email, password);
        authMessage.style.color = 'green';
        authMessage.textContent = 'Connexion réussie…';
        // modal will auto-close onAuthStateChanged
      } catch (err) {
        authMessage.style.color = '#c0392b';
        authMessage.textContent = err.message;
      }
    } else {
      // register
      try {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        const uid = userCred.user.uid;
        // create a minimal user doc in Firestore
        await setDoc(doc(db, 'users', uid), {
          profile: { email, name: name || null, createdAt: Date.now() },
          data: { members: [], payments: [], lots: [] }
        }, { merge: true });
        authMessage.style.color = 'green';
        authMessage.textContent = "Compte créé — vous êtes connecté.";
      } catch (err) {
        authMessage.style.color = '#c0392b';
        authMessage.textContent = err.message;
      }
    }
  });

  authReset.addEventListener('click', async () => {
    const email = document.getElementById('authEmail').value.trim();
    if (!email) { authMessage.textContent = 'Entrez votre e-mail pour réinitialiser.'; return; }
    try {
      await sendPasswordResetEmail(auth, email);
      authMessage.style.color = 'green';
      authMessage.textContent = 'E-mail de réinitialisation envoyé.';
    } catch (err) {
      authMessage.style.color = '#c0392b';
      authMessage.textContent = err.message;
    }
  });

  authClose.addEventListener('click', () => {
    // ne pas permettre la fermeture si pas connecté (force auth)
    const modal = document.getElementById('authModal');
    if (auth.currentUser) modal.style.display = 'none';
  });
}

function showModal() {
  buildAuthModal();
  const m = document.getElementById('authModal');
  if (m) m.style.display = 'flex';
}

function hideModal() {
  const m = document.getElementById('authModal');
  if (m) m.style.display = 'none';
}

/* ---------- Auth state listener ---------- */
onAuthStateChanged(auth, async (user) => {
  if (user) {
    // utilisateur connecté
    hideModal();
    // expose current user globalement
    window.currentUser = user;

    // inform the app (script.js) if présent
    if (window.paymentManager && typeof window.paymentManager.loadUserData === 'function') {
      try { await window.paymentManager.loadUserData(user.uid); } catch(e) { console.error(e); }
    }
  } else {
    // pas connecté -> afficher modal, bloquer l'accès
    showModal();
    // reset global
    window.currentUser = null;
  }
});

/* ---------- helper pour logout accessible depuis UI --- */
window.firebaseSignOut = async function() {
  try {
    await signOut(auth);
    // après signOut, onAuthStateChanged affichera le modal
  } catch(e) {
    console.error('Sign out error', e);
  }
};

export { auth, db, app };