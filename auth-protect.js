// auth-protect.js
import { auth, db } from './firebase-init.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import {
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

/* -----------------------
   Utilitaires DOM simples
   ----------------------- */
const $ = sel => document.querySelector(sel);
const show = (el) => el && (el.style.display = '');
const hide = (el) => el && (el.style.display = 'none');

/* -----------------------
   Connexion / Inscription
   ----------------------- */
export async function signup(email, password, displayName = '') {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const user = cred.user;

    // Mettre displayName (optionnel)
    if (displayName) {
      await updateProfile(user, { displayName });
    }

    // Créer document user dans Firestore /users/{uid}
    const userDoc = doc(db, 'users', user.uid);
    await setDoc(userDoc, {
      email: user.email,
      displayName: displayName || user.email.split('@')[0],
      createdAt: new Date().toISOString(),
      // placez ici les champs initiaux propres à votre appli
      profile: { phone: '', address: '' },
      settings: { theme: 'light' }
    });

    return user;
  } catch (err) {
    throw err;
  }
}

export async function login(email, password) {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return cred.user;
  } catch (err) {
    throw err;
  }
}

export async function logout() {
  await signOut(auth);
}

/* -----------------------
   Synchronisation des données utilisateur
   ----------------------- */
let currentUnsubscribe = null;

function clearUserUI() {
  // cacher éléments privés et afficher le formulaire de login
  const userElements = document.querySelectorAll('[data-auth-only]');
  userElements.forEach(el => hide(el));
  const anonElements = document.querySelectorAll('[data-unauth]');
  anonElements.forEach(el => show(el));
  // vider champs affichage user
  const nameEl = $('#user-name');
  if (nameEl) nameEl.textContent = 'Invité';
}

/**
 * Appelé quand un utilisateur est connecté.
 * S'abonne au doc /users/{uid} et met à jour l'UI en temps réel.
 */
function watchUserDoc(uid) {
  const userDocRef = doc(db, 'users', uid);

  // Nettoyer subscription précédente si existe
  if (currentUnsubscribe) currentUnsubscribe();

  // onSnapshot -> mise à jour en temps réel (multi-appareils)
  currentUnsubscribe = onSnapshot(userDocRef, (snap) => {
    if (!snap.exists()) return;
    const data = snap.data();
    renderUserData(data);
  }, (err) => {
    console.error('Erreur écoute user doc:', err);
  });
}

/* -----------------------
   Rend l'UI à partir des données user
   ----------------------- */
function renderUserData(userData) {
  // Exemples : mettre à jour le nom, stats, etc.
  const nameEl = $('#user-name');
  if (nameEl) nameEl.textContent = userData.displayName || userData.email || 'Utilisateur';

  // Afficher éléments privés
  const userElements = document.querySelectorAll('[data-auth-only]');
  userElements.forEach(el => show(el));
  const anonElements = document.querySelectorAll('[data-unauth]');
  anonElements.forEach(el => hide(el));

  // Exemple : remplir un tableau, liste, etc.
  const profilePhone = $('#profile-phone');
  if (profilePhone) profilePhone.textContent = (userData.profile && userData.profile.phone) || '-';

  // Si vous avez une zone JSON :
  const rawJson = $('#user-raw-json');
  if (rawJson) rawJson.textContent = JSON.stringify(userData, null, 2);
}

/* -----------------------
   OnAuthStateChanged : protèger l'app
   ----------------------- */
onAuthStateChanged(auth, async (user) => {
  if (user) {
    // Utilisateur connecté
    watchUserDoc(user.uid);
  } else {
    // Utilisateur déconnecté
    if (currentUnsubscribe) { currentUnsubscribe(); currentUnsubscribe = null; }
    clearUserUI();
  }
});

/* -----------------------
   Exporte utilitaires DOM pour usage direct
   ----------------------- */
export { renderUserData };


// Présuppose que auth et onAuthStateChanged ont déjà été importés/initialisés
const authScreen = document.getElementById('auth-screen');

function lockUI() {
  if (authScreen) {
    authScreen.style.display = 'flex';
    authScreen.setAttribute('aria-hidden','false');
    document.body.classList.add('auth-locked');
  }
}

function unlockUI() {
  if (authScreen) {
    authScreen.style.display = 'none';
    authScreen.setAttribute('aria-hidden','true');
    document.body.classList.remove('auth-locked');
  }
}

/* appelé par onAuthStateChanged */
onAuthStateChanged(auth, (user) => {
  if (user) {
    // Utilisateur connecté -> on montre le site
    unlockUI();

    // (si tu veux garder l'écoute realtime user doc) :
    watchUserDoc(user.uid);
  } else {
    // pas connecté -> on bloque tout le site
    lockUI();
    // cache toutes les sections privées si utilisées
    clearUserUI();
  }
});

/* Contrôles du formulaire d'auth (interactions) */
document.getElementById('btnLogin').addEventListener('click', async () => {
  try {
    const email = document.getElementById('loginEmail').value;
    const pwd = document.getElementById('loginPassword').value;
    await login(email, pwd); // importe login depuis ton module
    // onAuthStateChanged se chargera de cacher l'écran
  } catch (e) {
    alert('Erreur de connexion : ' + e.message);
  }
});

document.getElementById('btnSignup').addEventListener('click', async () => {
  try {
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const pwd = document.getElementById('signupPassword').value;
    await signup(email, pwd, name);
    // onAuthStateChanged cachera l'écran de lui-même
  } catch (e) {
    alert('Erreur d\'inscription : ' + e.message);
  }
});

/* basculement login <-> signup */
document.getElementById('show-signup').addEventListener('click', () => {
  document.getElementById('login-form').style.display = 'none';
  document.getElementById('signup-form').style.display = 'block';
});
document.getElementById('show-login').addEventListener('click', () => {
  document.getElementById('signup-form').style.display = 'none';
  document.getElementById('login-form').style.display = 'block';
});