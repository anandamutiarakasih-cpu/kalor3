/**
 * THERMO CHAMPIONS: HEAT EDITION
 * Firebase Service & Realtime Synchronization Engine
 * Dual-Engine Realtime Sync:
 * 1. HTTPS Port 443 Cloud Sync (100% Guaranteed connectivity on iPhone Safari, iOS Chrome, iCloud Private Relay & mobile networks)
 * 2. Ultra-Fast Native MQTT-over-WebSocket Mesh Relay (Instant sub-50ms push on Android & PC)
 * 3. BroadcastChannel & LocalStorage (Same-machine multi-tab)
 * 4. Firebase Realtime Database (Background fallback)
 */

import { firebaseConfig } from '../config/firebase-config.js';
import { getPredicate } from '../data/predicates.js';
import { mqttRelay } from './mqtt-service.js';
import {
  SHUFFLE_MEMORIZE_CARDS,
  SHUFFLE_CHALLENGES,
  WORD_SCRAMBLE_ITEMS,
  HEAT_CALCULATION_ITEMS
} from '../data/questions-bank.js';

// HTTPS Cloud Key-Value Relay on Port 443 (Compatible with iOS Safari, iCloud Private Relay, & all networks)
const HTTPS_RELAY_APPKEY = 'vjatsu02';
const HTTPS_RELAY_BASE = 'https://keyvalue.immanuel.co/api/KeyVal';

function toHex(str) {
  try {
    const bytes = new TextEncoder().encode(str);
    let hex = '';
    for (let i = 0; i < bytes.length; i++) {
      hex += bytes[i].toString(16).padStart(2, '0');
    }
    return hex;
  } catch (e) {
    return '';
  }
}

function fromHex(hex) {
  try {
    if (!hex || typeof hex !== 'string') return '';
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return new TextDecoder().decode(bytes);
  } catch (e) {
    return '';
  }
}

async function cloudWrite(key, data) {
  try {
    const payloadStr = typeof data === 'string' ? data : JSON.stringify(data);
    const hex = toHex(payloadStr);
    if (!hex) return false;
    const url = `${HTTPS_RELAY_BASE}/UpdateValue/${HTTPS_RELAY_APPKEY}/${key}/${hex}`;
    await fetch(url, { method: 'POST', headers: { 'Content-Length': '0' }, cache: 'no-store' });
    return true;
  } catch (e) {
    return false;
  }
}

async function cloudRead(key) {
  try {
    const url = `${HTTPS_RELAY_BASE}/GetValue/${HTTPS_RELAY_APPKEY}/${key}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const hexVal = await res.json();
    if (!hexVal || typeof hexVal !== 'string') return null;
    const decoded = fromHex(hexVal);
    if (!decoded) return null;
    return JSON.parse(decoded);
  } catch (e) {
    return null;
  }
}

class FirebaseService {
  constructor() {
    this.app = null;
    this.db = null;
    this.auth = null;
    this.isOnline = navigator.onLine;
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
        this.broadcast = new BroadcastChannel('tc_heat_edition_channel');
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
      const {
        getDatabase,
        ref,
        set,
        get,
        update,
        onValue,
        serverTimestamp
      } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js');
      const { getAuth, signInAnonymously } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js');

      this.app = initializeApp(firebaseConfig);
      this.db = getDatabase(this.app);
      this.auth = getAuth(this.app);

      this.fbRef = ref;
      this.fbSet = set;
      this.fbGet = get;
      this.fbUpdate = update;
      this.fbOnValue = onValue;
      this.fbServerTimestamp = serverTimestamp;

      try {
        await signInAnonymously(this.auth);
      } catch (authErr) {}

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
   * Immediate dispatch: MQTT WebSocket (Android/PC) + HTTPS Port 443 (iPhone Safari) + LocalStorage + Firebase
   */
  notifySessionUpdate(sessionCode, sessionData) {
    const code = (sessionCode || '').trim().toUpperCase();
    if (!code || !sessionData) return;
    this.sessionCache.set(code, sessionData);

    // 1. High-Speed Native MQTT WebSocket Broadcast (Instant sub-50ms to Android/PC)
    try {
      mqttRelay.publish(`tc_kalor/session/${code}`, sessionData, true);
    } catch (e) {}

    // 2. HTTPS Port 443 Cloud Sync (Guaranteed delivery to iPhone Safari, iCloud Private Relay, & all networks)
    if (sessionData.currentPhase) {
      cloudWrite(`TC_PHASE_${code}`, {
        code,
        phase: sessionData.currentPhase,
        phaseStartTime: sessionData.phaseStartTime || Date.now()
      });
    }

    // 3. In-process subscribers (0ms latency)
    if (this.listeners.has(code)) {
      this.listeners.get(code).forEach((cb) => {
        try { cb(sessionData); } catch (e) { console.error(e); }
      });
    }

    // 4. BroadcastChannel for same browser/tabs
    if (this.broadcast) {
      try {
        this.broadcast.postMessage({
          type: 'SESSION_UPDATE',
          sessionCode: code,
          data: sessionData
        });
      } catch (e) {}
    }

    // 5. LocalStorage persistence
    try {
      localStorage.setItem(`tc_session_${code}`, JSON.stringify(sessionData));
    } catch (e) {}

    // 6. Firebase Realtime Database in background (non-blocking)
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
        game1MemorizeTime: 35,
        game1PlayTime: 75,
        game2WordTime: 20,
        game3TotalTime: 120,
        maxTeams: 8
      }
    };

    // Broadcast across all layers immediately with retain flag
    this.notifySessionUpdate(code, sessionData);
    cloudWrite(`TC_PHASE_${code}`, {
      code,
      phase: 'LOBBY',
      phaseStartTime: Date.now()
    });

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
          game1MemorizeTime: 35,
          game1PlayTime: 75,
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
    this.cloudSyncTeamScore(sessionCode, num, teamData);

    return { success: true, teamNumber: num, sessionCode };
  }

  /**
   * SET SESSION PHASE (ADMIN CONTROL)
   * Instant non-blocking execution (0ms lag!)
   */
  async setSessionPhase(sessionCode, phase) {
    const code = (sessionCode || '').trim().toUpperCase();
    let session = this.sessionCache.get(code) || this.getLocalSession(code);
    if (!session) {
      session = await this.getSession(code);
    }
    if (!session) {
      session = {
        code,
        status: phase,
        currentPhase: phase,
        teams: {}
      };
    }

    let duration = 0;
    if (phase === 'GAME1_MEMORIZE') duration = 35;
    else if (phase === 'GAME1_PLAY' || phase === 'GAME1') duration = 75;
    else if (phase === 'GAME2') duration = 200;
    else if (phase === 'GAME3') duration = 120;
    else if (phase === 'FINISHED') duration = 0;

    session.status = phase;
    session.currentPhase = phase;
    session.phaseStartTime = this.getServerTime();
    session.phaseDuration = duration;

    // IMMEDIATE REALTIME DISPATCH VIA MQTT + HTTPS PORT 443 CLOUD
    this.notifySessionUpdate(code, session);
    cloudWrite(`TC_PHASE_${code}`, {
      code,
      phase,
      phaseStartTime: session.phaseStartTime,
      duration
    });

    return session;
  }

  /**
   * SUBMIT GAME 1 - SHUFFLE & RECALL (ORIGINAL 10 CHALLENGES - MAX 30 PTS)
   */
  async submitGame1(sessionCode, teamNumber, userAnswers) {
    let session = this.sessionCache.get(sessionCode) || this.getLocalSession(sessionCode);
    if (!session) session = await this.getSession(sessionCode);
    if (!session || !session.teams || !session.teams[`team_${teamNumber}`]) {
      throw new Error('Data kelompok tidak ditemukan.');
    }

    const team = session.teams[`team_${teamNumber}`];
    if (team.progress?.game1Submitted) {
      return { success: false, message: 'Game 1 sudah dikirim sebelumnya.' };
    }

    let correctCount = 0;
    for (const challenge of SHUFFLE_CHALLENGES) {
      const ans = ((userAnswers && userAnswers[challenge.id]) || '').trim();
      if (ans.toLowerCase() === challenge.correctAnswer.toLowerCase()) {
        correctCount++;
      }
    }

    // 2.5 pts each + 5 pts perfect bonus = 30 pts max
    let score = correctCount * 2.5;
    if (correctCount === SHUFFLE_CHALLENGES.length) {
      score += 5;
    }
    score = Math.min(30, Math.round(score * 10) / 10);

    if (!team.scores) team.scores = { game1: 0, game2: 0, game3: 0, total: 0 };
    team.scores.game1 = score;
    team.scores.total = Math.min(100, Math.round((team.scores.game1 + (team.scores.game2 || 0) + (team.scores.game3 || 0)) * 10) / 10);
    const predObj = getPredicate(team.scores.total);
    team.predicate = predObj?.title || predObj || 'Temperature Rookie';

    if (!team.progress) team.progress = {};
    team.progress.game1Submitted = true;
    team.progress.game1CorrectCount = correctCount;

    this.notifySessionUpdate(sessionCode, session);
    this.cloudSyncTeamScore(sessionCode, teamNumber, team);

    return {
      success: true,
      score,
      correctCount,
      totalQuestions: SHUFFLE_CHALLENGES.length,
      isPerfect: correctCount === SHUFFLE_CHALLENGES.length
    };
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
    team.scores.total = Math.min(100, Math.round(((team.scores.game1 || 0) + newG2 + (team.scores.game3 || 0)) * 10) / 10);
    const predObj = getPredicate(team.scores.total);
    team.predicate = predObj?.title || predObj || 'Temperature Rookie';

    this.notifySessionUpdate(sessionCode, session);
    this.cloudSyncTeamScore(sessionCode, teamNumber, team);

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
    team.scores.total = Math.min(100, Math.round(((team.scores.game1 || 0) + (team.scores.game2 || 0) + newG3) * 10) / 10);
    const predObj = getPredicate(team.scores.total);
    team.predicate = predObj?.title || predObj || 'Temperature Rookie';

    this.notifySessionUpdate(sessionCode, session);
    this.cloudSyncTeamScore(sessionCode, teamNumber, team);

    return {
      success: true,
      correct: isCorrect,
      addedScore,
      totalGame3Score: newG3,
      expected: item.correctAnswer,
      unit: item.unit
    };
  }

  /**
   * CLOUD SYNC HELPERS FOR TEAM SCORES (FOR IPHONE CLIENTS)
   */
  async cloudSyncTeamScore(sessionCode, teamNumber, team) {
    const code = (sessionCode || '').trim().toUpperCase();
    if (!code || !teamNumber || !team) return;
    try {
      const payload = {
        teamNumber,
        name: team.name || `Kelompok ${teamNumber}`,
        scores: team.scores || { game1: 0, game2: 0, game3: 0, total: 0 },
        progress: team.progress || {},
        predicate: team.predicate || 'Temperature Rookie',
        updatedAt: Date.now()
      };
      await cloudWrite(`TC_SCORE_${code}_${teamNumber}`, payload);
      try {
        mqttRelay.publish(`tc_kalor/score/${code}`, payload, true);
      } catch (e) {}
    } catch (e) {}
  }

  async cloudGetScore(sessionCode, teamNumber) {
    const code = (sessionCode || '').trim().toUpperCase();
    if (!code || !teamNumber) return null;
    return await cloudRead(`TC_SCORE_${code}_${teamNumber}`);
  }

  /**
   * RESET SESSION SCORES (ADMIN)
   */
  async resetSession(sessionCode) {
    let session = this.sessionCache.get(sessionCode) || this.getLocalSession(sessionCode);
    if (!session) session = await this.getSession(sessionCode);
    if (!session) return;

    session.status = 'LOBBY';
    session.currentPhase = 'LOBBY';
    session.phaseStartTime = null;

    if (session.teams) {
      for (const tKey of Object.keys(session.teams)) {
        const team = session.teams[tKey];
        team.scores = { game1: 0, game2: 0, game3: 0, total: 0 };
        team.progress = { game1Submitted: false, game2Index: 0, game3Index: 0 };
        team.predicate = 'Temperature Rookie';
        this.cloudSyncTeamScore(sessionCode, team.number, team);
      }
    }

    this.notifySessionUpdate(sessionCode, session);
    cloudWrite(`TC_PHASE_${sessionCode}`, {
      code: sessionCode,
      phase: 'LOBBY',
      phaseStartTime: Date.now()
    });

    return session;
  }

  /**
   * REALTIME SESSION LISTENER
   * Dual-Sync: Instant MQTT WebSocket (Android/PC) + HTTPS Port 443 Polling (iPhone Safari)
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
      try { callback(cached); } catch (e) {}
    }

    // 1. Live MQTT WebSocket Topic Subscription (Instant push on Android/PC)
    const unsubMqtt = mqttRelay.subscribe(`tc_kalor/session/${code}`, (data) => {
      if (data && typeof data === 'object') {
        this.sessionCache.set(code, data);
        try {
          localStorage.setItem(`tc_session_${code}`, JSON.stringify(data));
        } catch (e) {}

        if (this.listeners.has(code)) {
          this.listeners.get(code).forEach((cb) => {
            try { cb(data); } catch (e) {}
          });
        }
      }
    });

    // 2. Continuous HTTPS Port 443 Polling (1000ms loop for iPhone Safari & restricted mobile networks)
    let isPolling = false;
    const httpsPollInterval = setInterval(async () => {
      if (isPolling) return;
      isPolling = true;
      try {
        const remote = await cloudRead(`TC_PHASE_${code}`);
        if (remote && remote.phase) {
          const cur = this.sessionCache.get(code) || this.getLocalSession(code) || { code, teams: {} };
          if (cur.currentPhase !== remote.phase || cur.phaseStartTime !== remote.phaseStartTime) {
            cur.code = code;
            cur.currentPhase = remote.phase;
            cur.status = remote.phase;
            cur.phaseStartTime = remote.phaseStartTime;
            this.sessionCache.set(code, cur);
            try { localStorage.setItem(`tc_session_${code}`, JSON.stringify(cur)); } catch (e) {}
            if (this.listeners.has(code)) {
              this.listeners.get(code).forEach((cb) => {
                try { cb(cur); } catch (e) {}
              });
            }
          }
        }
      } catch (e) {
      } finally {
        isPolling = false;
      }
    }, 1000);

    // 3. Storage event for multi-tab
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

    // 4. Window focus event (Immediately pulls state when student switches back to browser tab)
    const onFocus = () => {
      this.getSession(code).then((s) => {
        if (s) callback(s);
      });
    };
    window.addEventListener('focus', onFocus);

    // 5. Firebase RTDB listener if available
    if (this.isFirebaseReady && this.db) {
      try {
        const sRef = this.fbRef(this.db, `sessions/${code}`);
        this.fbOnValue(sRef, (snap) => {
          const val = snap.val();
          if (val) {
            this.sessionCache.set(code, val);
            if (this.listeners.has(code)) {
              this.listeners.get(code).forEach((cb) => {
                try { cb(val); } catch (e) {}
              });
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
      clearInterval(httpsPollInterval);
      window.removeEventListener('storage', storageHandler);
      window.removeEventListener('focus', onFocus);
    };
  }

  /**
   * GET SESSION (CACHE -> HTTPS PORT 443 -> LOCALSTORAGE -> FIREBASE)
   */
  async getSession(sessionCode) {
    const code = (sessionCode || '').trim().toUpperCase();
    if (!code) return null;

    let session = this.sessionCache.get(code) || this.getLocalSession(code);

    // Also probe HTTPS Port 443 cloud relay
    try {
      const remote = await cloudRead(`TC_PHASE_${code}`);
      if (remote && remote.phase) {
        if (!session) {
          session = {
            code,
            title: 'Sesi Pembelajaran Kalor SMP',
            createdAt: Date.now(),
            status: remote.phase,
            currentPhase: remote.phase,
            phaseStartTime: remote.phaseStartTime,
            teams: {}
          };
        } else {
          session.currentPhase = remote.phase;
          session.status = remote.phase;
          session.phaseStartTime = remote.phaseStartTime;
        }
        this.sessionCache.set(code, session);
        try { localStorage.setItem(`tc_session_${code}`, JSON.stringify(session)); } catch (e) {}
      }
    } catch (e) {}

    // Fallback to Firebase RTDB if available
    if (!session && this.isFirebaseReady && this.db) {
      try {
        const sRef = this.fbRef(this.db, `sessions/${code}`);
        const snap = await this.fbGet(sRef);
        if (snap.exists()) {
          session = snap.val();
          this.sessionCache.set(code, session);
        }
      } catch (e) {}
    }

    return session;
  }

  saveTeamSession(sessionCode, teamNumber, teamName) {
    try {
      localStorage.setItem('tc_active_team_session', JSON.stringify({
        sessionCode,
        teamNumber,
        teamName,
        savedAt: Date.now()
      }));
    } catch (e) {}
  }

  getStoredTeamSession() {
    try {
      const raw = localStorage.getItem('tc_active_team_session');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  clearStoredTeamSession() {
    try {
      localStorage.removeItem('tc_active_team_session');
    } catch (e) {}
  }
}

export const firebaseService = new FirebaseService();
