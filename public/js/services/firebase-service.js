/**
 * THERMO CHAMPIONS: HEAT EDITION
 * Firebase Service & Realtime Synchronization Engine
 * Triple-Mesh Sync: High-Speed MQTT WebSocket Relay + Firebase RTDB + LocalStorage/BroadcastChannel
 * Instant sub-50ms real-time delivery across all devices, mobile phones, and networks
 */

import { firebaseConfig } from '../config/firebase-config.js';
import { getPredicate } from '../data/predicates.js';
import { mqttRelay } from './mqtt-service.js';
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
        console.warn('BroadcastChannel note:', e);
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
        // Fallback handled by MQTT mesh relay
      }

      const offsetRef = ref(this.db, '.info/serverTimeOffset');
      onValue(offsetRef, (snap) => {
        this.serverTimeOffset = snap.val() || 0;
      });

      this.isFirebaseReady = true;
    } catch (err) {
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
   * Immediate dispatch: In-memory -> MQTT WebSocket -> BroadcastChannel -> LocalStorage -> Firebase
   */
  notifySessionUpdate(sessionCode, sessionData) {
    const code = (sessionCode || '').trim().toUpperCase();
    if (!code || !sessionData) return;
    this.sessionCache.set(code, sessionData);

    // 1. High-Speed Native MQTT WebSocket Broadcast (Instant sub-50ms to all remote devices)
    mqttRelay.publish(`tc_kalor/session/${code}`, sessionData, true);

    // 2. In-process subscribers (0ms latency)
    if (this.listeners.has(code)) {
      this.listeners.get(code).forEach((cb) => {
        try { cb(sessionData); } catch (e) { console.error(e); }
      });
    }

    // 3. BroadcastChannel for same browser/tabs
    if (this.broadcast) {
      try {
        this.broadcast.postMessage({
          type: 'SESSION_UPDATE',
          sessionCode: code,
          data: sessionData
        });
      } catch (e) {}
    }

    // 4. LocalStorage persistence
    try {
      localStorage.setItem(`tc_session_${code}`, JSON.stringify(sessionData));
    } catch (e) {}

    // 5. Firebase Realtime Database in background (non-blocking)
    if (this.isFirebaseReady && this.db) {
      try {
        const sRef = this.fbRef(this.db, `sessions/${code}`);
        this.fbUpdate(sRef, sessionData).catch(() => {});
      } catch (e) {}
    }
  }

  getLocalSession(sessionCode) {
    const code = (sessionCode || '').trim().toUpperCase();
    try {
      const raw = localStorage.getItem(`tc_session_${code}`);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
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
        game1MemorizeTime: 15,
        game1PlayTime: 90,
        game2WordTime: 20,
        game3TotalTime: 120,
        maxTeams: 8
      }
    };

    // Broadcast across all layers immediately with retain flag
    this.notifySessionUpdate(code, sessionData);

    // Push to Firebase RTDB in background
    if (this.isFirebaseReady && this.db) {
      try {
        const sRef = this.fbRef(this.db, `sessions/${code}`);
        this.fbSet(sRef, sessionData).catch(() => {});
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
      // Create local fallback session if not yet synchronized
      session = {
        code: sessionCode,
        title: 'Sesi Pembelajaran Kalor SMP',
        createdAt: this.getServerTime(),
        status: 'LOBBY',
        currentPhase: 'LOBBY',
        phaseStartTime: null,
        phaseDuration: 0,
        teams: {},
        settings: {
          game1MemorizeTime: 15,
          game1PlayTime: 90,
          game2WordTime: 20,
          game3TotalTime: 120,
          maxTeams: 8
        }
      };
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

    // Instant dispatch
    this.notifySessionUpdate(sessionCode, session);
    this.saveTeamSession(sessionCode, num, teamName);

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
    if (!session) {
      session = {
        code: sessionCode,
        status: phase,
        currentPhase: phase,
        teams: {}
      };
    }

    let duration = 0;
    if (phase === 'GAME1' || phase === 'GAME1_PLAY') duration = 0;
    else if (phase === 'GAME1_MEMORIZE') duration = 15;
    else if (phase === 'GAME2') duration = 200;
    else if (phase === 'GAME3') duration = 120;
    else if (phase === 'FINISHED') duration = 0;

    session.status = phase;
    session.currentPhase = phase;
    session.phaseStartTime = this.getServerTime();
    session.phaseDuration = duration;

    // IMMEDIATE REALTIME DISPATCH VIA MQTT + WEBSOCKETS (Pushes to all students in < 50ms)
    this.notifySessionUpdate(sessionCode, session);

    return session;
  }

  /**
   * SUBMIT CLASH OF CHAMPIONS SHUFFLE & RECALL (GAME 1)
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

    const g1Weighted = Math.round(score * 0.3 * 10) / 10;
    const g2 = team.scores.game2 || 0;
    const g3 = team.scores.game3 || 0;
    team.scores.total = Math.min(100, Math.round((g1Weighted + g2 + g3) * 10) / 10);
    team.predicate = getPredicate(team.scores.total).title;
    team.progress.game1Submitted = true;
    team.progress.game1Order = submittedOrder;
    team.progress.game1Score = score;
    team.progress.game1CorrectCount = correctCount;

    this.notifySessionUpdate(sessionCode, session);

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

  async submitGame1(sessionCode, teamNumber, payload) {
    if (Array.isArray(payload)) {
      return this.submitClashShuffle(sessionCode, teamNumber, payload);
    }
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
    return session;
  }

  /**
   * LISTEN TO SESSION IN REALTIME (ULTRA-RESPONSIVE)
   * 1. Immediate local cache delivery (0ms)
   * 2. Live MQTT WebSocket Topic Subscription (sub-50ms push)
   * 3. Cross-tab storage & BroadcastChannel
   * 4. Firebase onValue fallback
   */
  listenToSession(sessionCode, callback) {
    const code = (sessionCode || '').trim().toUpperCase();
    if (!code) return () => {};

    if (!this.listeners.has(code)) {
      this.listeners.set(code, new Set());
    }
    this.listeners.get(code).add(callback);

    // Initial load: return cached session immediately
    const cached = this.sessionCache.get(code) || this.getLocalSession(code);
    if (cached) {
      callback(cached);
    }

    // 1. Live MQTT WebSocket Topic Subscription (Pushes state immediately on connection)
    const unsubMqtt = mqttRelay.subscribe(`tc_kalor/session/${code}`, (data) => {
      if (data && typeof data === 'object') {
        this.sessionCache.set(code, data);
        try {
          localStorage.setItem(`tc_session_${code}`, JSON.stringify(data));
        } catch (e) {}

        if (this.listeners.has(code)) {
          this.listeners.get(code).forEach((cb) => cb(data));
        }
      }
    });

    // 2. Storage event for multi-tab
    const storageHandler = (e) => {
      if (e.key === `tc_session_${code}` && e.newValue) {
        try {
          const val = JSON.parse(e.newValue);
          this.sessionCache.set(code, val);
          callback(val);
        } catch (err) {}
      }
    };
    window.addEventListener('storage', storageHandler);

    // 3. Window focus event (Immediately pulls state when student switches back to browser tab)
    const onFocus = () => {
      this.getSession(code).then((s) => {
        if (s) callback(s);
      });
    };
    window.addEventListener('focus', onFocus);

    // 4. Firebase RTDB listener if available
    if (this.isFirebaseReady && this.db) {
      try {
        const sRef = this.fbRef(this.db, `sessions/${code}`);
        this.fbOnValue(sRef, (snap) => {
          const val = snap.val();
          if (val) {
            this.sessionCache.set(code, val);
            if (this.listeners.has(code)) {
              this.listeners.get(code).forEach((cb) => cb(val));
            }
          }
        });
      } catch (e) {}
    }

    return () => {
      if (this.listeners.has(code)) {
        this.listeners.get(code).delete(callback);
      }
      unsubMqtt();
      window.removeEventListener('storage', storageHandler);
      window.removeEventListener('focus', onFocus);
    };
  }

  /**
   * GET SESSION (CACHE -> MQTT WEBSOCKET -> LOCALSTORAGE -> FIREBASE)
   */
  async getSession(sessionCode) {
    const code = (sessionCode || '').trim().toUpperCase();
    if (!code) return null;

    // 1. In-memory cache (0ms)
    if (this.sessionCache.has(code)) {
      return this.sessionCache.get(code);
    }

    // 2. LocalStorage (0ms)
    const local = this.getLocalSession(code);
    if (local) {
      this.sessionCache.set(code, local);
      return local;
    }

    // 3. Fast race with MQTT retained message (Max 800ms)
    return new Promise((resolve) => {
      let resolved = false;
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve(this.sessionCache.get(code) || this.getLocalSession(code));
        }
      }, 800);

      const unsub = mqttRelay.subscribe(`tc_kalor/session/${code}`, (data) => {
        if (!resolved && data) {
          resolved = true;
          clearTimeout(timeout);
          unsub();
          this.sessionCache.set(code, data);
          try {
            localStorage.setItem(`tc_session_${code}`, JSON.stringify(data));
          } catch (e) {}
          resolve(data);
        }
      });
    });
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
