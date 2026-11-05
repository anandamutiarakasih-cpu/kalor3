/**
 * THERMO CHAMPIONS: HEAT EDITION
 * Firebase SDK Modular Configuration
 * Proyek: kalor3-ff4af
 */

// Dynamically check if ?db= parameter is provided in the URL
let initialDbUrl = "https://kalor3-ff4af-default-rtdb.asia-southeast1.firebasedatabase.app";
try {
  if (typeof window !== 'undefined' && window.location && window.location.search) {
    const params = new URLSearchParams(window.location.search);
    const db = params.get('db');
    if (db && decodeURIComponent(db).trim().startsWith('https://')) {
      initialDbUrl = decodeURIComponent(db).trim();
      localStorage.setItem('tc_rtdb_url', initialDbUrl);
    } else {
      const saved = localStorage.getItem('tc_rtdb_url');
      if (saved && saved.startsWith('https://')) {
        initialDbUrl = saved;
      }
    }
  }
} catch (e) {
  console.warn('DB URL detection error:', e);
}

export const firebaseConfig = {
  apiKey: "AIzaSyCErNW-portvbj7qSL-cCK1DaWNpW2yRFg",
  authDomain: "kalor3-ff4af.firebaseapp.com",
  projectId: "kalor3-ff4af",
  storageBucket: "kalor3-ff4af.firebasestorage.app",
  messagingSenderId: "137693547137",
  appId: "1:137693547137:web:4f17c9c5c8e7a47ad2db80",
  measurementId: "G-HQGHW6NYJT",
  databaseURL: initialDbUrl
};

// Admin default credentials for teacher login
export const ADMIN_CREDENTIALS = {
  passcode: "THERMO2026", // Admin master passcode for fast classroom deployment
  title: "Admin Guru Fisika SMP"
};
