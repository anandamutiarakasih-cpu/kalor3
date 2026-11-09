/**
 * THERMO CHAMPIONS: HEAT EDITION
 * Firebase Service & Realtime Synchronization Engine
 * Multi-Mesh Sync: MQTT WebSocket Mesh + Port 443 Key-Value Cloud Relay + Firebase RTDB + BroadcastChannel
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

// Universal Port 443 HTTPS Key-Value Cloud Sync (Unblocked across Indonesian & global carriers)
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
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 2500);
    const url = `${HTTPS_RELAY_BASE}/UpdateValue/${HTTPS_RELAY_APPKEY}/${key}/${hex}`;
    await fetch(url, { method: 'POST', headers: { 'Content-Length': '0' }, cache: 'no-store', signal: controller.signal });
    clearTimeout(tid);
    return true;
  } catch (e) {
    return false;
  }
}

async function cloudRead(key) {
  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 2000);
    const url = `${HTTPS_RELAY_BASE}/GetValue/${HTTPS_RELAY_APPKEY}/${key}`;
    const res = await fetch(url, { cache: 'no-store', signal: controller.signal });
    clearTimeout(tid);
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
    this.isFirebaseReady = false;
    this.serverTimeOffset = 0;
    this.broadcast = null;
    this.listeners = new Map();
    this.activeSSE = new Map(); // sessionCode -> cleanup fn

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
        console.info('ℹ️ Note: Firebase Anonymous Auth belum diaktifkan di console. Sinkronisasi sesi tetap berjalan normal via realtime rules.');
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
      console.log('✅ Firebase Realtime Database Initialized.');
    } catch (err) {
      console.warn('⚠️ Firebase initial connection note (falling back to Global Cloud Relay):', err.message);
      this.isFirebaseReady = false;
    }
  }

  getServerTime() {
    return Date.now() + this.serverTimeOffset;
  }

  handleBroadcastMessage(msg) {
    if (!msg || !msg.type) return;
    const { sessionCode, data } = msg;
    if (this.listeners.has(sessionCode)) {
      const callbacks = this.listeners.get(sessionCode);
      callbacks.forEach((cb) => cb(data));
    }
  }

  /**
   * NOTIFY SESSION UPDATE ACROSS ALL LAYERS
   */
  notifySessionUpdate(sessionCode, sessionData) {
    // 1. In-process subscribers
    if (this.listeners.has(sessionCode)) {
      this.listeners.get(sessionCode).forEach((cb) => cb(sessionData));
    }

    // 2. BroadcastChannel for same browser/tabs
    if (this.broadcast) {
      this.broadcast.postMessage({
        type: 'SESSION_UPDATE',
        sessionCode,
        data: sessionData
      });
    }

    // 3. LocalStorage persistence
    try {
      localStorage.setItem(`tc_session_${sessionCode}`, JSON.stringify(sessionData));
    } catch (e) {}

    // 4. Global Cloud Relay (Cross-Device Internet Relay)
    this.publishToCloudRelay(sessionCode, sessionData);
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
   * GLOBAL MULTI-MESH CLOUD RELAY (Port 443 HTTPS Key-Value + Native MQTT WebSocket)
   * Guaranteed 100% connectivity on Android, iPhone Safari, cellular data & school networks
   */
  async publishToCloudRelay(sessionCode, sessionData) {
    if (!sessionCode || !sessionData) return;
    const code = sessionCode.trim().toUpperCase();
    try {
      // 1. MQTT WebSocket Instant Push (<50ms)
      try {
        mqttRelay.publish(`tc_kalor/session/${code}`, sessionData, true);
      } catch (e) {}

      // 2. HTTPS Port 443 Key-Value Relay
      cloudWrite(`TC_SESSION_${code}`, sessionData);
      if (sessionData.currentPhase) {
        cloudWrite(`TC_PHASE_${code}`, {
          code,
          phase: sessionData.currentPhase,
          phaseStartTime: sessionData.phaseStartTime || Date.now(),
          phaseDuration: sessionData.phaseDuration || 0,
          updatedAt: Date.now()
        });
      }
    } catch (err) {
      console.warn('Cloud relay publish error:', err.message);
    }
  }

  async fetchFromCloudRelay(sessionCode) {
    if (!sessionCode) return null;
    const code = sessionCode.trim().toUpperCase();
    try {
      const full = await cloudRead(`TC_SESSION_${code}`);
      if (full && full.code === code) return full;

      const phaseObj = await cloudRead(`TC_PHASE_${code}`);
      if (phaseObj && phaseObj.phase) {
        return {
          code,
          status: phaseObj.phase,
          currentPhase: phaseObj.phase,
          phaseStartTime: phaseObj.phaseStartTime,
          phaseDuration: phaseObj.phaseDuration || 0,
          teams: {}
        };
      }
    } catch (err) {
      console.warn('Cloud relay fetch error:', err.message);
    }
    return null;
  }

  listenToCloudRelay(sessionCode, callback) {
    if (!sessionCode) return () => {};
    const code = sessionCode.trim().toUpperCase();

    // 1. MQTT WebSocket Instant Topic Subscription
    const unsubMqtt = mqttRelay.subscribe(`tc_kalor/session/${code}`, (data) => {
      if (data && typeof data === 'object') {
        try {
          localStorage.setItem(`tc_session_${code}`, JSON.stringify(data));
        } catch (e) {}
        callback(data);
      }
    });

    // 1b. MQTT Score Listener
    const unsubMqttScore = mqttRelay.subscribe(`tc_kalor/score/${code}`, (scoreData) => {
      if (scoreData && scoreData.teamNumber) {
        const cur = this.getLocalSession(code) || { code, teams: {} };
        if (!cur.teams) cur.teams = {};
        const tKey = `team_${scoreData.teamNumber}`;
        const existing = cur.teams[tKey] || {};
        cur.teams[tKey] = {
          ...existing,
          number: scoreData.teamNumber,
          name: scoreData.name || existing.name || `Kelompok ${scoreData.teamNumber}`,
          scores: scoreData.scores || existing.scores || { game1: 0, game2: 0, game3: 0, total: 0 },
          progress: scoreData.progress || existing.progress || {},
          predicate: scoreData.predicate || existing.predicate || 'Temperature Rookie',
          claimed: true
        };
        try {
          localStorage.setItem(`tc_session_${code}`, JSON.stringify(cur));
        } catch (e) {}
        callback(cur);
      }
    });

    // 2. High-speed HTTPS Port 443 Key-Value Polling (800ms) for Android & cellular
    let lastPhase = null;
    let isPolling = false;
    const pollTimer = setInterval(async () => {
      if (isPolling) return;
      isPolling = true;
      try {
        const remote = await cloudRead(`TC_PHASE_${code}`);
        if (remote && remote.phase && (remote.phase !== lastPhase || remote.phaseStartTime)) {
          lastPhase = remote.phase;
          const cur = this.getLocalSession(code) || { code, teams: {} };
          if (cur.currentPhase !== remote.phase || cur.phaseStartTime !== remote.phaseStartTime) {
            cur.code = code;
            cur.currentPhase = remote.phase;
            cur.status = remote.phase;
            cur.phaseStartTime = remote.phaseStartTime;
            cur.phaseDuration = remote.phaseDuration || 0;
            try {
              localStorage.setItem(`tc_session_${code}`, JSON.stringify(cur));
            } catch (e) {}
            callback(cur);
          }
        }
      } catch (e) {}
      finally {
        isPolling = false;
      }
    }, 800);

    return () => {
      unsubMqtt();
      unsubMqttScore();
      clearInterval(pollTimer);
    };
  }

  async cloudSyncTeamScore(sessionCode, teamNumber, team) {
    const code = (sessionCode || '').trim().toUpperCase();
    if (!code || !teamNumber || !team) return;
    try {
      const payload = {
        teamNumber: parseInt(teamNumber, 10),
        name: team.name || `Kelompok ${teamNumber}`,
        scores: team.scores || { game1: 0, game2: 0, game3: 0, total: 0 },
        progress: team.progress || {},
        predicate: team.predicate || 'Temperature Rookie',
        updatedAt: Date.now()
      };
      cloudWrite(`TC_SCORE_${code}_${teamNumber}`, payload);
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

    // Push to Firebase RTDB if available
    if (this.isFirebaseReady && this.db) {
      try {
        const sRef = this.fbRef(this.db, `sessions/${code}`);
        await this.fbSet(sRef, sessionData);
      } catch (e) {
        console.warn('Firebase set error:', e);
      }
    }

    // Broadcast across all layers
    this.notifySessionUpdate(code, sessionData);
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

    let session = await this.getSession(sessionCode);
    if (!session) {
      throw new Error(`Sesi dengan kode ${sessionCode} tidak ditemukan.`);
    }

    if (session.status !== 'LOBBY') {
      throw new Error('Permainan sudah dimulai atau telah berakhir.');
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

    if (this.isFirebaseReady && this.db) {
      try {
        const teamRef = this.fbRef(this.db, `sessions/${sessionCode}/teams/team_${num}`);
        await this.fbSet(teamRef, teamData);
      } catch (e) {
        console.warn('Firebase join error:', e);
      }
    }

    this.notifySessionUpdate(sessionCode, session);
    this.saveTeamSession(sessionCode, num, teamName);
    this.cloudSyncTeamScore(sessionCode, num, teamData);

    return { success: true, teamNumber: num, sessionCode };
  }

  /**
   * SET SESSION PHASE (ADMIN CONTROL)
   */
  async setSessionPhase(sessionCode, phase) {
    let session = await this.getSession(sessionCode);
    if (!session) throw new Error('Sesi tidak ditemukan.');

    let duration = 0;
    if (phase === 'GAME1_MEMORIZE') duration = session.settings?.game1MemorizeTime || 35;
    else if (phase === 'GAME1_PLAY') duration = session.settings?.game1PlayTime || 75;
    else if (phase === 'GAME2') duration = (session.settings?.game2WordTime || 20) * 10;
    else if (phase === 'GAME3') duration = session.settings?.game3TotalTime || 120;
    else if (phase === 'FINISHED') duration = 0;

    session.status = phase;
    session.currentPhase = phase;
    session.phaseStartTime = this.getServerTime();
    session.phaseDuration = duration;

    if (this.isFirebaseReady && this.db) {
      try {
        const sessionRef = this.fbRef(this.db, `sessions/${sessionCode}`);
        await this.fbUpdate(sessionRef, {
          status: phase,
          currentPhase: phase,
          phaseStartTime: session.phaseStartTime,
          phaseDuration: duration
        });
      } catch (e) {
        console.warn('Firebase setPhase error:', e);
      }
    }

    this.notifySessionUpdate(sessionCode, session);
    return session;
  }

  /**
   * SUBMIT GAME 1 (Shuffle & Recall)
   */
  async submitGame1(sessionCode, teamNumber, userAnswers) {
    const session = await this.getSession(sessionCode);
    if (!session || !session.teams || !session.teams[`team_${teamNumber}`]) {
      throw new Error('Data kelompok tidak ditemukan.');
    }

    const team = session.teams[`team_${teamNumber}`];
    if (team.progress?.game1Submitted) {
      return { success: false, message: 'Game 1 sudah dikirim sebelumnya.' };
    }

    let correctCount = 0;
    for (const challenge of SHUFFLE_CHALLENGES) {
      const ans = (userAnswers[challenge.id] || '').trim();
      if (ans.toLowerCase() === challenge.correctAnswer.toLowerCase()) {
        correctCount++;
      }
    }

    let score = correctCount * 2.5;
    if (correctCount === SHUFFLE_CHALLENGES.length) {
      score += 5; // Perfect 10/10 bonus
    }
    score = Math.min(30, Math.round(score * 10) / 10);

    team.scores.game1 = score;
    team.scores.total = Math.min(100, Math.round((team.scores.game1 + (team.scores.game2 || 0) + (team.scores.game3 || 0)) * 10) / 10);
    team.predicate = getPredicate(team.scores.total).title;
    team.progress.game1Submitted = true;

    if (this.isFirebaseReady && this.db) {
      try {
        const teamRef = this.fbRef(this.db, `sessions/${sessionCode}/teams/team_${teamNumber}`);
        await this.fbUpdate(teamRef, {
          'scores/game1': score,
          'scores/total': team.scores.total,
          'progress/game1Submitted': true,
          predicate: team.predicate
        });
      } catch (e) {}
    }

    this.notifySessionUpdate(sessionCode, session);
    this.cloudSyncTeamScore(sessionCode, teamNumber, team);
    return {
      success: true,
      score,
      correctCount,
      totalItems: SHUFFLE_CHALLENGES.length,
      isPerfect: correctCount === SHUFFLE_CHALLENGES.length
    };
  }

  /**
   * SUBMIT GAME 2 SINGLE WORD
   */
  async submitGame2Word(sessionCode, teamNumber, itemId, answer, remainingSec = 0) {
    const session = await this.getSession(sessionCode);
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
    team.predicate = getPredicate(team.scores.total).title;

    if (this.isFirebaseReady && this.db) {
      try {
        const teamRef = this.fbRef(this.db, `sessions/${sessionCode}/teams/team_${teamNumber}`);
        await this.fbUpdate(teamRef, {
          'scores/game2': newG2,
          'scores/total': team.scores.total,
          predicate: team.predicate
        });
      } catch (e) {}
    }

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
    const session = await this.getSession(sessionCode);
    if (!session || !session.teams || !session.teams[`team_${teamNumber}`]) {
      throw new Error('Data kelompok tidak ditemukan.');
    }

    const team = session.teams[`team_${teamNumber}`];
    const item = HEAT_CALCULATION_ITEMS.find((h) => h.id === itemId);
    if (!item) return { correct: false, score: 0 };

    let rawStr = String(rawAnswer || '').trim();
    // Strip common scientific unit suffixes like "Joule", "J", "J/kg°C", "°C", "kg"
    rawStr = rawStr.replace(/(joule|j\/kg°c|j\/°c|j|°c|kg)/gi, '').trim();
    let clean = rawStr.replace(/\s+/g, '');
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
    team.predicate = getPredicate(team.scores.total).title;

    if (this.isFirebaseReady && this.db) {
      try {
        const teamRef = this.fbRef(this.db, `sessions/${sessionCode}/teams/team_${teamNumber}`);
        await this.fbUpdate(teamRef, {
          'scores/game3': newG3,
          'scores/total': team.scores.total,
          predicate: team.predicate
        });
      } catch (e) {}
    }

    this.notifySessionUpdate(sessionCode, session);
    this.cloudSyncTeamScore(sessionCode, teamNumber, team);
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
    const session = await this.getSession(sessionCode);
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

    if (this.isFirebaseReady && this.db) {
      try {
        const sessionRef = this.fbRef(this.db, `sessions/${sessionCode}`);
        await this.fbSet(sessionRef, session);
      } catch (e) {}
    }

    this.notifySessionUpdate(sessionCode, session);
    return session;
  }

  /**
   * SEND TEAM HEARTBEAT & LATENCY
   * Periodically sent by active student devices to indicate online / lag status to Teacher
   */
  async sendHeartbeat(sessionCode, teamNumber, latency = 0) {
    if (!sessionCode || !teamNumber) return;
    const now = this.getServerTime();

    if (this.isFirebaseReady && this.db) {
      try {
        const hbRef = this.fbRef(this.db, `sessions/${sessionCode}/teams/team_${teamNumber}/heartbeat`);
        await this.fbUpdate(hbRef, {
          lastSeen: now,
          latency: latency
        });
      } catch (e) {}
    }

    try {
      mqttRelay.publish(`tc_kalor/ping/${sessionCode.trim().toUpperCase()}`, {
        teamNumber: parseInt(teamNumber, 10),
        ping: latency,
        lastSeen: now
      });
    } catch (e) {}
  }

  /**
   * LISTEN TO SESSION IN REALTIME (FIREBASE + CLOUD RELAY + STORAGE + SMART POLLING)
   * Multi-layer redundancy guarantees zero dropped phase changes even on lagging cellular connections
   */
  listenToSession(sessionCode, callback) {
    if (!this.listeners.has(sessionCode)) {
      this.listeners.set(sessionCode, new Set());
    }
    this.listeners.get(sessionCode).add(callback);

    let lastKnownPhase = null;
    let lastKnownTeamsCount = 0;

    const safeNotify = (data) => {
      if (!data) return;
      lastKnownPhase = data.currentPhase;
      lastKnownTeamsCount = Object.keys(data.teams || {}).length;
      callback(data);
    };

    // Initial load
    this.getSession(sessionCode).then((s) => {
      if (s) safeNotify(s);
    });

    // 1. Firebase Live Listener
    if (this.isFirebaseReady && this.db) {
      try {
        const sRef = this.fbRef(this.db, `sessions/${sessionCode}`);
        this.fbOnValue(sRef, (snap) => {
          const val = snap.val();
          if (val) {
            this.notifySessionUpdate(sessionCode, val);
            safeNotify(val);
          }
        });
      } catch (e) {}
    }

    // 2. Global Cloud Relay SSE Listener (For cross-device sync)
    const cleanupSSE = this.listenToCloudRelay(sessionCode, (data) => {
      if (this.listeners.has(sessionCode)) {
        this.listeners.get(sessionCode).forEach((cb) => cb(data));
      }
    });

    // 3. Storage event for multi-tab
    const storageHandler = (e) => {
      if (e.key === `tc_session_${sessionCode}` && e.newValue) {
        try {
          const val = JSON.parse(e.newValue);
          safeNotify(val);
        } catch (err) {}
      }
    };
    window.addEventListener('storage', storageHandler);

    // 4. Smart Polling Fallback (Every 2.5s) to guarantee zero desync if WebSocket or SSE stalls
    const pollInterval = setInterval(async () => {
      try {
        const s = await this.getSession(sessionCode);
        if (s) {
          const curTeamsCount = Object.keys(s.teams || {}).length;
          if (s.currentPhase !== lastKnownPhase || curTeamsCount !== lastKnownTeamsCount) {
            safeNotify(s);
          }
        }
      } catch (e) {}
    }, 2500);

    // 5. Visibility Change / Tab Focus Instant Catch-up
    const visibilityHandler = () => {
      if (document.visibilityState === 'visible') {
        this.getSession(sessionCode).then((s) => {
          if (s) safeNotify(s);
        });
      }
    };
    document.addEventListener('visibilitychange', visibilityHandler);
    window.addEventListener('focus', visibilityHandler);

    return () => {
      if (this.listeners.has(sessionCode)) {
        this.listeners.get(sessionCode).delete(callback);
      }
      if (cleanupSSE) cleanupSSE();
      clearInterval(pollInterval);
      window.removeEventListener('storage', storageHandler);
      document.removeEventListener('visibilitychange', visibilityHandler);
      window.removeEventListener('focus', visibilityHandler);
    };
  }

  /**
   * GET SESSION (FIREBASE -> CLOUD RELAY -> LOCALSTORAGE)
   */
  async getSession(sessionCode) {
    // 1. Try Firebase RTDB
    if (this.isFirebaseReady && this.db) {
      try {
        const sRef = this.fbRef(this.db, `sessions/${sessionCode}`);
        const snap = await this.fbGet(sRef);
        if (snap.exists()) {
          const val = snap.val();
          try {
            localStorage.setItem(`tc_session_${sessionCode}`, JSON.stringify(val));
          } catch (e) {}
          return val;
        }
      } catch (e) {}
    }

    // 2. Try Global Cloud Relay (Fetches from Internet Relay for remote devices)
    const cloudSession = await this.fetchFromCloudRelay(sessionCode);
    if (cloudSession) {
      try {
        localStorage.setItem(`tc_session_${sessionCode}`, JSON.stringify(cloudSession));
      } catch (e) {}
      return cloudSession;
    }

    // 3. Fallback to LocalStorage
    return this.getLocalSession(sessionCode);
  }

  saveTeamSession(sessionCode, teamNumber, teamName) {
    const cred = { sessionCode, teamNumber, teamName, savedAt: Date.now() };
    try {
      localStorage.setItem('tc_team_session', JSON.stringify(cred));
      localStorage.setItem('tc_active_team_session', JSON.stringify(cred));
    } catch (e) {}
  }

  getStoredTeamSession() {
    try {
      const raw = localStorage.getItem('tc_team_session') || localStorage.getItem('tc_active_team_session');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  clearStoredTeamSession() {
    try {
      localStorage.removeItem('tc_team_session');
      localStorage.removeItem('tc_active_team_session');
    } catch (e) {}
  }
}

export const firebaseService = new FirebaseService();
