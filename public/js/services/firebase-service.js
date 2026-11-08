/**
 * THERMO CHAMPIONS: HEAT EDITION
 * Firebase Service & Realtime Synchronization Engine
 * Dual-Sync: Firebase RTDB + Global Cloud Relay (SSE/REST) + BroadcastChannel
 * Ultra-Responsive Zero-Lag Architecture
 */

import { firebaseConfig } from '../config/firebase-config.js';
import { getPredicate } from '../data/predicates.js';
import {
  CLASH_SHUFFLE_CARDS,
  SHUFFLE_CHALLENGES,
  WORD_SCRAMBLE_ITEMS,
  HEAT_CALCULATION_ITEMS
} from '../data/questions-bank.js';

class FirebaseService {
  constructor() {
    this.app = null;
    this.db = null;
    this.auth = null;
    this.isFirebaseReady = false;
    this.serverTimeOffset = 0;
    this.broadcast = null;
    this.listeners = new Map();
    this.activeSSE = new Map();
    this.sessionCache = new Map();

    this.initBroadcastChannel();
    this.initFirebase();
  }

  initBroadcastChannel() {
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.broadcast = new BroadcastChannel('thermo_champions_mesh');
        this.broadcast.onmessage = (event) => {
          this.handleBroadcastMessage(event.data);
        };
      } catch (e) {
        console.warn('BroadcastChannel not supported:', e);
      }
    }
  }

  async initFirebase() {
    try {
      const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js');
      const { getDatabase, ref, onValue, set, update, get } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js');
      const { getAuth, signInAnonymously } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js');

      this.app = initializeApp(firebaseConfig);
      this.db = firebaseConfig.databaseURL ? getDatabase(this.app, firebaseConfig.databaseURL) : getDatabase(this.app);
      this.auth = getAuth(this.app);
      this.fbRef = ref;
      this.fbOnValue = onValue;
      this.fbSet = set;
      this.fbUpdate = update;
      this.fbGet = get;

      try {
        await signInAnonymously(this.auth);
      } catch (authErr) {
        console.info('ℹ️ Note: Firebase Auth fallback active. Sinkronisasi berjalan via realtime cloud relay.');
      }

      // Listen for server time offset
      const offsetRef = ref(this.db, '.info/serverTimeOffset');
      onValue(offsetRef, (snap) => {
        this.serverTimeOffset = snap.val() || 0;
      });

      // Listen for connection status
      const connRef = ref(this.db, '.info/connected');
      onValue(connRef, (snap) => {
        const val = snap.val();
        this.isOnline = !!val;
        console.log(val ? '🟢 Firebase RTDB Online' : '🟠 Firebase RTDB Offline/Connecting');
      });

      this.isFirebaseReady = true;
      console.log('✅ Firebase Realtime Engine Ready.');
    } catch (err) {
      console.warn('⚠️ Firebase initial connection note (running on Global Cloud Relay):', err.message);
      this.isFirebaseReady = false;
    }
  }

  getServerTime() {
    return Date.now() + this.serverTimeOffset;
  }

  handleBroadcastMessage(msg) {
    if (!msg || !msg.type) return;
    const { sessionCode, data } = msg;
    if (sessionCode && data) {
      this.sessionCache.set(sessionCode, data);
      if (this.listeners.has(sessionCode)) {
        this.listeners.get(sessionCode).forEach((cb) => cb(data));
      }
    }
  }

  /**
   * NOTIFY SESSION UPDATE ACROSS ALL LAYERS
   * Immediate synchronous dispatch (0ms latency for UI)
   */
  notifySessionUpdate(sessionCode, sessionData) {
    if (!sessionCode || !sessionData) return;
    this.sessionCache.set(sessionCode, sessionData);

    // 1. In-process subscribers (Instant)
    if (this.listeners.has(sessionCode)) {
      this.listeners.get(sessionCode).forEach((cb) => {
        try { cb(sessionData); } catch (e) { console.error(e); }
      });
    }

    // 2. BroadcastChannel for same browser/tabs
    if (this.broadcast) {
      try {
        this.broadcast.postMessage({
          type: 'SESSION_UPDATE',
          sessionCode,
          data: sessionData
        });
      } catch (e) {}
    }

    // 3. LocalStorage persistence
    try {
      localStorage.setItem(`tc_session_${sessionCode}`, JSON.stringify(sessionData));
    } catch (e) {}

    // 4. Global Cloud Relay (Cross-Device Internet Relay - non-blocking background)
    this.publishToCloudRelay(sessionCode, sessionData).catch(() => {});
  }

  getLocalSession(sessionCode) {
    try {
      const raw = localStorage.getItem(`tc_session_${sessionCode}`);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  /**
   * GLOBAL CLOUD RELAY (ntfy.sh Server-Sent Events & REST)
   * Ensures devices on different networks connect 100% reliably
   */
  async publishToCloudRelay(sessionCode, sessionData) {
    if (!sessionCode || !sessionData) return;
    try {
      await fetch(`https://ntfy.sh/tc_kalor_${sessionCode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionData)
      });
    } catch (err) {
      // Cloud relay fallback
    }
  }

  async fetchFromCloudRelay(sessionCode) {
    if (!sessionCode) return null;
    try {
      const res = await fetch(`https://ntfy.sh/tc_kalor_${sessionCode}/json?poll=1&since=all`);
      if (!res.ok) return null;
      const text = await res.text();
      const lines = text.trim().split('\n').filter(Boolean);
      for (let i = lines.length - 1; i >= 0; i--) {
        try {
          const item = JSON.parse(lines[i]);
          if (item && item.message) {
            const data = JSON.parse(item.message);
            if (data && data.code === sessionCode) {
              return data;
            }
          }
        } catch (e) {}
      }
    } catch (err) {}
    return null;
  }

  listenToCloudRelay(sessionCode, callback) {
    if (!sessionCode || typeof EventSource === 'undefined') return () => {};
    try {
      const eventSource = new EventSource(`https://ntfy.sh/tc_kalor_${sessionCode}/sse`);
      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload && payload.message) {
            const data = JSON.parse(payload.message);
            if (data && data.code === sessionCode) {
              this.sessionCache.set(sessionCode, data);
              try {
                localStorage.setItem(`tc_session_${sessionCode}`, JSON.stringify(data));
              } catch (e) {}
              callback(data);
            }
          }
        } catch (e) {}
      };
      return () => {
        eventSource.close();
      };
    } catch (err) {
      return () => {};
    }
  }

  /**
   * CREATE A NEW GAME SESSION
   */
  async createSession(title = 'Sesi Pembelajaran Kalor SMP') {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = 'TC';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const sessionData = {
      code,
      title,
      createdAt: this.getServerTime(),
      status: 'LOBBY',
      currentPhase: 'LOBBY',
      phaseStartTime: null,
      phaseDuration: 0,
      teams: {},
      settings: {
        game1MemorizeTime: 15, // 15 detik sesuai prompt Clash of Champions
        game1PlayTime: 90,
        game2WordTime: 20,
        game3TotalTime: 120,
        maxTeams: 8
      }
    };

    // Broadcast across all layers immediately
    this.notifySessionUpdate(code, sessionData);

    // Push to Firebase RTDB in background without blocking
    if (this.isFirebaseReady && this.db) {
      try {
        const sRef = this.fbRef(this.db, `sessions/${code}`);
        this.fbSet(sRef, sessionData).catch((e) => console.warn('Firebase set error:', e));
      } catch (e) {}
    }

    return sessionData;
  }

  /**
   * JOIN SESSION & REGISTER TEAM (1 to 8)
   */
  async joinSession(sessionCode, teamNumber, teamName, members) {
    const num = parseInt(teamNumber, 10);
    if (isNaN(num) || num < 1 || num > 8) {
      throw new Error('Nomor kelompok harus berada di antara 1 sampai 8.');
    }

    let session = this.sessionCache.get(sessionCode) || this.getLocalSession(sessionCode);
    if (!session) {
      session = await this.getSession(sessionCode);
    }
    if (!session) {
      throw new Error(`Sesi dengan kode ${sessionCode} tidak ditemukan.`);
    }

    if (session.status !== 'LOBBY') {
      // Allow joining if team already belongs to this device
      const mySaved = this.getStoredTeamSession();
      if (!mySaved || mySaved.teamNumber !== num || mySaved.sessionCode !== sessionCode) {
        throw new Error('Permainan sudah dimulai atau telah berakhir.');
      }
    }

    if (session.teams && session.teams[`team_${num}`] && session.teams[`team_${num}`].claimed) {
      const mySaved = this.getStoredTeamSession();
      if (!mySaved || mySaved.teamNumber !== num || mySaved.sessionCode !== sessionCode) {
        throw new Error(`Kelompok ${num} sudah diambil oleh perangkat lain.`);
      }
    }

    const teamData = {
      number: num,
      name: (teamName || `Kelompok ${num}`).trim(),
      members: Array.isArray(members) ? members : [],
      claimed: true,
      ready: true,
      joinedAt: this.getServerTime(),
      scores: {
        game1: 0,
        game2: 0,
        game3: 0,
        total: 0
      },
      progress: {
        game1Submitted: false,
        game2Index: 0,
        game3Index: 0
      },
      predicate: 'Temperature Rookie'
    };

    if (!session.teams) session.teams = {};
    session.teams[`team_${num}`] = teamData;

    // Synchronous immediate dispatch
    this.notifySessionUpdate(sessionCode, session);
    this.saveTeamSession(sessionCode, num, teamName);

    // Non-blocking Firebase write
    if (this.isFirebaseReady && this.db) {
      try {
        const teamRef = this.fbRef(this.db, `sessions/${sessionCode}/teams/team_${num}`);
        this.fbSet(teamRef, teamData).catch((e) => console.warn('Firebase join error:', e));
      } catch (e) {}
    }

    return { success: true, teamNumber: num, sessionCode };
  }

  /**
   * SET SESSION PHASE (ADMIN CONTROL)
   * Instant non-blocking execution (0ms lag!)
   */
  async setSessionPhase(sessionCode, phase) {
    let session = this.sessionCache.get(sessionCode) || this.getLocalSession(sessionCode);
    if (!session) {
      session = await this.getSession(sessionCode);
    }
    if (!session) throw new Error('Sesi tidak ditemukan.');

    let duration = 0;
    if (phase === 'GAME1' || phase === 'GAME1_PLAY') duration = 0;
    else if (phase === 'GAME1_MEMORIZE') duration = 15; // 15 detik Clash of Champions
    else if (phase === 'GAME2') duration = (session.settings?.game2WordTime || 20) * 10;
    else if (phase === 'GAME3') duration = session.settings?.game3TotalTime || 120;
    else if (phase === 'FINISHED') duration = 0;

    session.status = phase;
    session.currentPhase = phase;
    session.phaseStartTime = this.getServerTime();
    session.phaseDuration = duration;

    // IMMEDIATE LOCAL & CLOUD RELAY NOTIFY
    this.notifySessionUpdate(sessionCode, session);

    // Non-blocking Firebase RTDB update in background
    if (this.isFirebaseReady && this.db) {
      try {
        const sessionRef = this.fbRef(this.db, `sessions/${sessionCode}`);
        this.fbUpdate(sessionRef, {
          status: phase,
          currentPhase: phase,
          phaseStartTime: session.phaseStartTime,
          phaseDuration: duration
        }).catch((e) => console.warn('Firebase setPhase async error:', e));
      } catch (e) {}
    }

    return session;
  }

  /**
   * SUBMIT CLASH OF CHAMPIONS SHUFFLE & RECALL (GAME 1)
   * Sistem Penilaian:
   * - Setiap kartu pada posisi benar mendapatkan 25 poin
   * - Setiap kartu pada posisi salah mendapatkan 0 poin
   * - Skor maksimal 100 poin
   */
  async submitClashShuffle(sessionCode, teamNumber, submittedOrder) {
    let session = this.sessionCache.get(sessionCode) || this.getLocalSession(sessionCode);
    if (!session) session = await this.getSession(sessionCode);
    if (!session || !session.teams || !session.teams[`team_${teamNumber}`]) {
      throw new Error('Data kelompok tidak ditemukan.');
    }

    const team = session.teams[`team_${teamNumber}`];
    if (!team.scores) team.scores = { game1: 0, game2: 0, game3: 0, total: 0 };
    if (!team.progress) team.progress = {};

    const correctOrder = ['c1', 'c2', 'c3', 'c4'];
    let correctCount = 0;
    const slotResults = [];

    for (let i = 0; i < 4; i++) {
      const isMatch = (submittedOrder[i] || '') === correctOrder[i];
      if (isMatch) correctCount++;
      slotResults.push({
        slotIndex: i + 1,
        submittedCardId: submittedOrder[i],
        correctCardId: correctOrder[i],
        isCorrect: isMatch
      });
    }

    const score = correctCount * 25; // 25 pts each, max 100
    team.scores.game1 = score;

    // Total keseluruhan: Game 1 (bobot 30% / 30 poin maks), Game 2 (35 poin maks), Game 3 (35 poin maks)
    const g1Weighted = Math.round(score * 0.3 * 10) / 10;
    const g2 = team.scores.game2 || 0;
    const g3 = team.scores.game3 || 0;
    team.scores.total = Math.min(100, Math.round((g1Weighted + g2 + g3) * 10) / 10);
    team.predicate = getPredicate(team.scores.total).title;
    team.progress.game1Submitted = true;
    team.progress.game1Order = submittedOrder;
    team.progress.game1Score = score;
    team.progress.game1CorrectCount = correctCount;

    // Synchronous immediate dispatch
    this.notifySessionUpdate(sessionCode, session);

    // Non-blocking Firebase write
    if (this.isFirebaseReady && this.db) {
      try {
        const teamRef = this.fbRef(this.db, `sessions/${sessionCode}/teams/team_${teamNumber}`);
        this.fbUpdate(teamRef, {
          'scores/game1': score,
          'scores/total': team.scores.total,
          'progress/game1Submitted': true,
          'progress/game1Order': submittedOrder,
          'progress/game1Score': score,
          'progress/game1CorrectCount': correctCount,
          predicate: team.predicate
        }).catch((e) => console.warn('Firebase submit Game1 error:', e));
      } catch (e) {}
    }

    return {
      success: true,
      score,
      correctCount,
      wrongCount: 4 - correctCount,
      slotResults,
      submittedOrder,
      correctOrder
    };
  }

  /**
   * BACKWARD COMPATIBLE SUBMIT GAME 1
   */
  async submitGame1(sessionCode, teamNumber, payload) {
    if (Array.isArray(payload)) {
      return this.submitClashShuffle(sessionCode, teamNumber, payload);
    }
    // Object answers fallback
    let session = this.sessionCache.get(sessionCode) || this.getLocalSession(sessionCode);
    if (!session) session = await this.getSession(sessionCode);
    if (!session || !session.teams || !session.teams[`team_${teamNumber}`]) {
      throw new Error('Data kelompok tidak ditemukan.');
    }

    const team = session.teams[`team_${teamNumber}`];
    let correctCount = 0;
    for (const challenge of SHUFFLE_CHALLENGES) {
      const ans = ((payload && payload[challenge.id]) || '').trim();
      if (ans.toLowerCase() === challenge.correctAnswer.toLowerCase()) {
        correctCount++;
      }
    }
    const score = Math.round((correctCount / SHUFFLE_CHALLENGES.length) * 100);
    team.scores.game1 = score;
    const g1Weighted = Math.round(score * 0.3 * 10) / 10;
    team.scores.total = Math.min(100, Math.round((g1Weighted + (team.scores.game2 || 0) + (team.scores.game3 || 0)) * 10) / 10);
    team.predicate = getPredicate(team.scores.total).title;
    team.progress.game1Submitted = true;

    this.notifySessionUpdate(sessionCode, session);
    return { success: true, score, correctCount };
  }

  /**
   * SUBMIT GAME 2 SINGLE WORD
   */
  async submitGame2Word(sessionCode, teamNumber, itemId, answer, remainingSec = 0) {
    let session = this.sessionCache.get(sessionCode) || this.getLocalSession(sessionCode);
    if (!session) session = await this.getSession(sessionCode);
    if (!session || !session.teams || !session.teams[`team_${teamNumber}`]) {
      throw new Error('Data kelompok tidak ditemukan.');
    }

    const team = session.teams[`team_${teamNumber}`];
    const item = WORD_SCRAMBLE_ITEMS.find((w) => w.id === itemId);
    if (!item) return { correct: false, score: 0 };

    const cleanUser = (answer || '').replace(/\s+/g, '').toUpperCase();
    const cleanTarget = item.answer.replace(/\s+/g, '').toUpperCase();
    const isCorrect = cleanUser === cleanTarget;

    let addedScore = 0;
    if (isCorrect) {
      addedScore = item.points || 3.0;
      if (remainingSec > 0) {
        const fraction = Math.min(1, Math.max(0, remainingSec / (item.timeLimit || 20)));
        addedScore += fraction * 0.5;
      }
      addedScore = Math.round(addedScore * 10) / 10;
    }

    const currentG2 = team.scores?.game2 || 0;
    const newG2 = Math.min(35, Math.round((currentG2 + addedScore) * 10) / 10);

    team.scores.game2 = newG2;
    const g1Weighted = Math.round((team.scores.game1 || 0) * 0.3 * 10) / 10;
    team.scores.total = Math.min(100, Math.round((g1Weighted + newG2 + (team.scores.game3 || 0)) * 10) / 10);
    team.predicate = getPredicate(team.scores.total).title;

    this.notifySessionUpdate(sessionCode, session);

    if (this.isFirebaseReady && this.db) {
      try {
        const teamRef = this.fbRef(this.db, `sessions/${sessionCode}/teams/team_${teamNumber}`);
        this.fbUpdate(teamRef, {
          'scores/game2': newG2,
          'scores/total': team.scores.total,
          predicate: team.predicate
        }).catch((e) => console.warn('Firebase submit Game2 error:', e));
      } catch (e) {}
    }

    return {
      success: true,
      correct: isCorrect,
      addedScore,
      totalGame2Score: newG2,
      expected: item.answer
    };
  }

  /**
   * SUBMIT GAME 3 CALCULATION
   */
  async submitGame3Calculation(sessionCode, teamNumber, itemId, rawAnswer, remainingSec = 0) {
    let session = this.sessionCache.get(sessionCode) || this.getLocalSession(sessionCode);
    if (!session) session = await this.getSession(sessionCode);
    if (!session || !session.teams || !session.teams[`team_${teamNumber}`]) {
      throw new Error('Data kelompok tidak ditemukan.');
    }

    const team = session.teams[`team_${teamNumber}`];
    const item = HEAT_CALCULATION_ITEMS.find((h) => h.id === itemId);
    if (!item) return { correct: false, score: 0 };

    let clean = String(rawAnswer || '').trim().replace(/\s+/g, '');
    if (/^\d{1,3}(\.\d{3})+$/.test(clean)) {
      clean = clean.replace(/\./g, '');
    } else if (/^\d+,\d+$/.test(clean)) {
      clean = clean.replace(',', '.');
    } else {
      clean = clean.replace(/,/g, '');
    }

    const num = parseFloat(clean);
    const expected = item.correctAnswer;
    const tolerance = item.tolerance || 0.01;
    const isCorrect = !isNaN(num) && Math.abs(num - expected) <= Math.max(0.001, expected * tolerance);

    let addedScore = 0;
    if (isCorrect) {
      addedScore = item.points || 3.5;
      if (remainingSec > 0) {
        const fraction = Math.min(1, Math.max(0, remainingSec / 120));
        addedScore += fraction * 0.5;
      }
      addedScore = Math.round(addedScore * 10) / 10;
    }

    const currentG3 = team.scores?.game3 || 0;
    const newG3 = Math.min(35, Math.round((currentG3 + addedScore) * 10) / 10);

    team.scores.game3 = newG3;
    const g1Weighted = Math.round((team.scores.game1 || 0) * 0.3 * 10) / 10;
    team.scores.total = Math.min(100, Math.round((g1Weighted + (team.scores.game2 || 0) + newG3) * 10) / 10);
    team.predicate = getPredicate(team.scores.total).title;

    this.notifySessionUpdate(sessionCode, session);

    if (this.isFirebaseReady && this.db) {
      try {
        const teamRef = this.fbRef(this.db, `sessions/${sessionCode}/teams/team_${teamNumber}`);
        this.fbUpdate(teamRef, {
          'scores/game3': newG3,
          'scores/total': team.scores.total,
          predicate: team.predicate
        }).catch((e) => console.warn('Firebase submit Game3 error:', e));
      } catch (e) {}
    }

    return {
      success: true,
      correct: isCorrect,
      addedScore,
      totalGame3Score: newG3,
      expected: item.correctAnswer,
      explanation: item.explanation
    };
  }

  /**
   * RESET SESSION
   */
  async resetSession(sessionCode) {
    let session = this.sessionCache.get(sessionCode) || this.getLocalSession(sessionCode);
    if (!session) session = await this.getSession(sessionCode);
    if (!session) return;

    session.status = 'LOBBY';
    session.currentPhase = 'LOBBY';
    session.phaseStartTime = null;
    session.phaseDuration = 0;
    if (session.teams) {
      Object.keys(session.teams).forEach((k) => {
        session.teams[k].scores = { game1: 0, game2: 0, game3: 0, total: 0 };
        session.teams[k].progress = { game1Submitted: false, game2Index: 0, game3Index: 0 };
        session.teams[k].predicate = 'Temperature Rookie';
      });
    }

    this.notifySessionUpdate(sessionCode, session);

    if (this.isFirebaseReady && this.db) {
      try {
        const sessionRef = this.fbRef(this.db, `sessions/${sessionCode}`);
        this.fbSet(sessionRef, session).catch((e) => console.warn('Firebase reset error:', e));
      } catch (e) {}
    }

    return session;
  }

  /**
   * LISTEN TO SESSION IN REALTIME (ULTRA-RESPONSIVE)
   * Instant local cache + SSE + 1.2s Polling + Window Focus
   */
  listenToSession(sessionCode, callback) {
    if (!sessionCode) return () => {};

    if (!this.listeners.has(sessionCode)) {
      this.listeners.set(sessionCode, new Set());
    }
    this.listeners.get(sessionCode).add(callback);

    // Initial load: return cached session immediately (0ms!)
    const cached = this.sessionCache.get(sessionCode) || this.getLocalSession(sessionCode);
    if (cached) {
      callback(cached);
    }
    this.getSession(sessionCode).then((s) => {
      if (s) callback(s);
    });

    // 1. Firebase Live Listener
    if (this.isFirebaseReady && this.db) {
      try {
        const sRef = this.fbRef(this.db, `sessions/${sessionCode}`);
        this.fbOnValue(sRef, (snap) => {
          const val = snap.val();
          if (val) {
            this.notifySessionUpdate(sessionCode, val);
          }
        });
      } catch (e) {}
    }

    // 2. Global Cloud Relay SSE Listener (Instant cross-device push)
    const cleanupSSE = this.listenToCloudRelay(sessionCode, (data) => {
      if (this.listeners.has(sessionCode)) {
        this.sessionCache.set(sessionCode, data);
        this.listeners.get(sessionCode).forEach((cb) => cb(data));
      }
    });

    // 3. Active 1.2s Polling fallback (Ensures zero lag even if SSE disconnects)
    const pollInterval = setInterval(async () => {
      try {
        const remote = await this.fetchFromCloudRelay(sessionCode);
        if (remote) {
          const cur = this.sessionCache.get(sessionCode);
          if (!cur || remote.currentPhase !== cur.currentPhase || remote.status !== cur.status || JSON.stringify(remote.teams) !== JSON.stringify(cur.teams)) {
            this.notifySessionUpdate(sessionCode, remote);
          }
        }
      } catch (e) {}
    }, 1200);

    // 4. Focus event listener
    const onFocus = () => {
      this.fetchFromCloudRelay(sessionCode).then((remote) => {
        if (remote) this.notifySessionUpdate(sessionCode, remote);
      }).catch(() => {});
    };
    window.addEventListener('focus', onFocus);

    // 5. Storage event for multi-tab
    const storageHandler = (e) => {
      if (e.key === `tc_session_${sessionCode}` && e.newValue) {
        try {
          const val = JSON.parse(e.newValue);
          this.sessionCache.set(sessionCode, val);
          callback(val);
        } catch (err) {}
      }
    };
    window.addEventListener('storage', storageHandler);

    return () => {
      if (this.listeners.has(sessionCode)) {
        this.listeners.get(sessionCode).delete(callback);
      }
      clearInterval(pollInterval);
      if (cleanupSSE) cleanupSSE();
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('storage', storageHandler);
    };
  }

  /**
   * GET SESSION (CACHE -> CLOUD RELAY -> LOCALSTORAGE -> FIREBASE)
   * Never hangs or blocks the UI!
   */
  async getSession(sessionCode) {
    if (!sessionCode) return null;

    // 1. Check in-memory cache first (0ms)
    if (this.sessionCache.has(sessionCode)) {
      return this.sessionCache.get(sessionCode);
    }

    // 2. Check LocalStorage
    const local = this.getLocalSession(sessionCode);
    if (local) {
      this.sessionCache.set(sessionCode, local);
      this.fetchFromCloudRelay(sessionCode).then((remote) => {
        if (remote && JSON.stringify(remote) !== JSON.stringify(local)) {
          this.notifySessionUpdate(sessionCode, remote);
        }
      }).catch(() => {});
      return local;
    }

    // 3. Fast race between Cloud Relay and Firebase (Max 600ms timeout)
    const fetchCloud = this.fetchFromCloudRelay(sessionCode);
    let fetchFb = null;
    if (this.isFirebaseReady && this.db) {
      try {
        const sRef = this.fbRef(this.db, `sessions/${sessionCode}`);
        fetchFb = this.fbGet(sRef).then((snap) => (snap.exists() ? snap.val() : null)).catch(() => null);
      } catch (e) {}
    }

    const timeout = new Promise((resolve) => setTimeout(() => resolve(null), 600));

    try {
      const candidates = [fetchCloud, timeout];
      if (fetchFb) candidates.push(fetchFb);
      const result = await Promise.race(candidates);
      if (result) {
        this.sessionCache.set(sessionCode, result);
        try { localStorage.setItem(`tc_session_${sessionCode}`, JSON.stringify(result)); } catch (e) {}
        return result;
      }
    } catch (e) {}

    // Fallback to cloud relay or local
    const cloudFallback = await fetchCloud.catch(() => null);
    if (cloudFallback) {
      this.sessionCache.set(sessionCode, cloudFallback);
      return cloudFallback;
    }

    return this.getLocalSession(sessionCode);
  }

  saveTeamSession(sessionCode, teamNumber, teamName) {
    const cred = { sessionCode, teamNumber, teamName, savedAt: Date.now() };
    localStorage.setItem('tc_team_session', JSON.stringify(cred));
  }

  getStoredTeamSession() {
    try {
      const raw = localStorage.getItem('tc_team_session');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  clearStoredTeamSession() {
    localStorage.removeItem('tc_team_session');
  }
}

export const firebaseService = new FirebaseService();
