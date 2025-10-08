// firebase-init.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import {
  getDatabase
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-database.js";
// Si tu préfères Firestore, remplace par getFirestore etc.

// --- Ta config (déjà fournie) ---
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
const rtdb = getDatabase(app);

export { app, auth, rtdb };