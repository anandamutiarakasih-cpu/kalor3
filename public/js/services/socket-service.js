/**
 * THERMO CHAMPIONS: HEAT EDITION
 * Client Authoritative Socket.IO Multiplayer Service
 * High-Speed Persistent WebSocket Client for Vercel Frontend
 */

import { SOCKET_CONFIG } from '../config/socket-config.js';
import { getPredicate } from '../data/predicates.js';

class SocketService {
  constructor() {
    this.socket = null;
    this.backendUrl = SOCKET_CONFIG.getBackendUrl();
    this.isConnected = false;
    this.isConnecting = false;
    this.activeRoomCode = null;
    this.currentRoomState = null;
    this.sessionListeners = new Map(); // roomCode -> Set of callbacks
    this.timerListeners = new Set();
    this.connectionListeners = new Set();
    this.serverTimeOffset = 0;
    this.heartbeatInterval = null;
  }

  /**
   * Initialize or return persistent Socket.IO connection
   */
  async getSocket() {
    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    if (this.isConnecting && this.socket) {
      return new Promise((resolve) => {
        this.socket.once('connect', () => resolve(this.socket));
        setTimeout(() => resolve(this.socket), 4000);
      });
    }

    this.isConnecting = true;
    const url = SOCKET_CONFIG.getBackendUrl();
    console.log(`[SocketService] Connecting to Authoritative Backend at: ${url}`);

    // Check if io client is loaded globally via CDN or module
    const ioFn = (typeof window !== 'undefined' && window.io) ? window.io : null;
    if (!ioFn) {
      throw new Error('Socket.IO Client library (window.io) belum dimuat.');
    }

    this.socket = ioFn(url, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
      forceNew: false
    });

    this.setupSocketListeners();

    return new Promise((resolve) => {
      this.socket.once('connect', () => {
        this.isConnected = true;
        this.isConnecting = false;
        console.log(`[SocketService] Connected successfully. Socket ID: ${this.socket.id}`);
        this.notifyConnectionStatus(true);
        this.syncServerClock();
        resolve(this.socket);
      });

      this.socket.once('connect_error', (err) => {
        console.warn(`[SocketService] Initial connection failed: ${err.message}`);
        this.isConnecting = false;
        resolve(this.socket);
      });

      setTimeout(() => {
        this.isConnecting = false;
        resolve(this.socket);
      }, 5000);
    });
  }

  setupSocketListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.isConnected = true;
      this.notifyConnectionStatus(true);
      console.log('[SocketService] WebSocket connection established.');

      // Auto rejoin room if active
      if (this.activeRoomCode) {
        this.socket.emit('join_room', { roomCode: this.activeRoomCode });

        // Auto recover team session if stored
        const stored = this.getStoredTeamSession();
        if (stored && stored.sessionCode === this.activeRoomCode && stored.sessionToken) {
          this.reconnectSession(stored.sessionCode, stored.teamNumber, stored.sessionToken).catch(() => {});
        }
      }
    });

    this.socket.on('disconnect', (reason) => {
      this.isConnected = false;
      this.notifyConnectionStatus(false, reason);
      console.warn(`[SocketService] Disconnected from server: ${reason}`);
    });

    // Authoritative Room Updates
    this.socket.on('room_updated', (data) => {
      if (data && data.room) {
        this.currentRoomState = data.room;
        this.broadcastRoomUpdate(data.room);
      }
    });

    this.socket.on('phase_changed', (data) => {
      console.log('[SocketService] Authoritative Phase Changed:', data.phase);
      if (data && data.room) {
        this.currentRoomState = data.room;
        this.broadcastRoomUpdate(data.room);
      }
    });

    this.socket.on('team_joined', (data) => {
      if (this.currentRoomState && data.team) {
        this.currentRoomState.teams[`team_${data.teamNumber}`] = data.team;
        this.broadcastRoomUpdate(this.currentRoomState);
      }
    });

    this.socket.on('player_reconnected', (data) => {
      if (this.currentRoomState && data.team) {
        this.currentRoomState.teams[`team_${data.teamNumber}`] = data.team;
        this.broadcastRoomUpdate(this.currentRoomState);
      }
    });

    this.socket.on('player_disconnected', (data) => {
      if (this.currentRoomState && this.currentRoomState.teams[`team_${data.teamNumber}`]) {
        this.currentRoomState.teams[`team_${data.teamNumber}`].isOnline = false;
        this.broadcastRoomUpdate(this.currentRoomState);
      }
    });

    this.socket.on('team_updated', (data) => {
      if (this.currentRoomState && data.team) {
        this.currentRoomState.teams[`team_${data.teamNumber}`] = data.team;
        this.broadcastRoomUpdate(this.currentRoomState);
      }
    });

    this.socket.on('score_updated', (data) => {
      if (this.currentRoomState && this.currentRoomState.teams[`team_${data.teamNumber}`]) {
        const team = this.currentRoomState.teams[`team_${data.teamNumber}`];
        if (data.totalScore !== undefined) team.scores.total = data.totalScore;
        if (data.predicate) team.predicate = data.predicate;
        this.broadcastRoomUpdate(this.currentRoomState);
      }
    });

    this.socket.on('room_reset', (data) => {
      if (data && data.room) {
        this.currentRoomState = data.room;
        this.broadcastRoomUpdate(data.room);
      }
    });

    // Authoritative Timer Sync
    this.socket.on('sync_timer', (timerData) => {
      if (timerData.serverTime) {
        this.serverTimeOffset = timerData.serverTime - Date.now();
      }
      this.timerListeners.forEach((fn) => {
        try { fn(timerData); } catch (e) {}
      });
    });

    this.socket.on('phase_time_up', (data) => {
      console.log('[SocketService] Authoritative Time is UP for phase:', data.phase);
      this.timerListeners.forEach((fn) => {
        try { fn({ expired: true, phase: data.phase }); } catch (e) {}
      });
    });
  }

  notifyConnectionStatus(online, reason = '') {
    this.connectionListeners.forEach((fn) => {
      try { fn(online, reason); } catch (e) {}
    });
  }

  broadcastRoomUpdate(room) {
    if (!room) return;
    const listeners = this.sessionListeners.get(room.code);
    if (listeners) {
      listeners.forEach((fn) => {
        try { fn(room); } catch (e) {}
      });
    }
  }

  async syncServerClock() {
    if (!this.socket || !this.socket.connected) return;
    const t0 = Date.now();
    this.socket.emit('sync_timer', {}, (ack) => {
      if (ack && ack.serverTime) {
        const roundTrip = Date.now() - t0;
        this.serverTimeOffset = (ack.serverTime + (roundTrip / 2)) - Date.now();
      }
    });
  }

  getServerTime() {
    return Date.now() + this.serverTimeOffset;
  }

  /**
   * 1. CREATE SESSION (Admin / Host)
   */
  async createSession(title = 'Sesi Pembelajaran Kalor SMP', settings = {}) {
    const socket = await this.getSocket();
    return new Promise((resolve, reject) => {
      socket.emit('create_room', { title, settings }, (res) => {
        if (res && res.success) {
          this.activeRoomCode = res.roomCode;
          this.currentRoomState = res.room;
          this.saveHostToken(res.roomCode, res.hostToken);
          resolve({
            code: res.roomCode,
            hostToken: res.hostToken,
            ...res.room
          });
        } else {
          reject(new Error((res && res.error) || 'Gagal membuat sesi di server.'));
        }
      });
      setTimeout(() => reject(new Error('Koneksi timeout saat membuat sesi.')), 8000);
    });
  }

  /**
   * 2. JOIN SESSION (Team 1 - 8)
   */
  async joinSession(sessionCode, teamNumber, teamName, members = []) {
    const code = (sessionCode || '').trim().toUpperCase();
    const socket = await this.getSocket();
    this.activeRoomCode = code;

    // Check if we have an existing session token for this room & team
    const stored = this.getStoredTeamSession();
    let sessionToken = null;
    if (stored && stored.sessionCode === code && parseInt(stored.teamNumber, 10) === parseInt(teamNumber, 10)) {
      sessionToken = stored.sessionToken;
    }

    return new Promise((resolve, reject) => {
      socket.emit('register_team', {
        roomCode: code,
        teamNumber,
        teamName,
        members,
        sessionToken
      }, (res) => {
        if (res && res.success) {
          this.currentRoomState = res.room;
          this.saveTeamSession(code, teamNumber, res.team.name, res.sessionToken);
          this.startHeartbeat(code, teamNumber);
          resolve(res);
        } else {
          reject(new Error((res && res.error) || 'Gagal mendaftar ke kelompok.'));
        }
      });
      setTimeout(() => reject(new Error('Koneksi timeout saat mendaftar kelompok.')), 8000);
    });
  }

  /**
   * 3. RECONNECT SESSION (Session recovery on reload)
   */
  async reconnectSession(sessionCode, teamNumber, sessionToken) {
    const code = (sessionCode || '').trim().toUpperCase();
    const socket = await this.getSocket();
    this.activeRoomCode = code;

    return new Promise((resolve, reject) => {
      socket.emit('reconnect_session', {
        roomCode: code,
        teamNumber,
        sessionToken
      }, (res) => {
        if (res && res.success) {
          this.currentRoomState = res.room;
          this.startHeartbeat(code, teamNumber);
          resolve(res);
        } else {
          reject(new Error((res && res.error) || 'Gagal memulihkan sesi kelompok.'));
        }
      });
      setTimeout(() => reject(new Error('Timeout memulihkan sesi kelompok.')), 6000);
    });
  }

  /**
   * 4. GET SESSION STATE
   */
  async getSession(sessionCode) {
    const code = (sessionCode || '').trim().toUpperCase();
    if (!code) return null;

    try {
      const socket = await this.getSocket();
      this.activeRoomCode = code;

      return new Promise((resolve) => {
        socket.emit('request_game_state', { roomCode: code }, (res) => {
          if (res && res.success && res.room) {
            this.currentRoomState = res.room;
            resolve(res.room);
          } else {
            resolve(this.currentRoomState || null);
          }
        });
        setTimeout(() => resolve(this.currentRoomState || null), 4000);
      });
    } catch (e) {
      return this.currentRoomState || null;
    }
  }

  /**
   * 5. SET SESSION PHASE (Host Only)
   */
  async setSessionPhase(sessionCode, phase) {
    const code = (sessionCode || '').trim().toUpperCase();
    const hostToken = this.getHostToken(code);
    const socket = await this.getSocket();

    return new Promise((resolve, reject) => {
      socket.emit('set_phase', {
        roomCode: code,
        phase,
        hostToken
      }, (res) => {
        if (res && res.success) {
          if (res.room) this.currentRoomState = res.room;
          resolve(res);
        } else {
          reject(new Error((res && res.error) || 'Gagal mengubah fase sesi.'));
        }
      });
      setTimeout(() => reject(new Error('Koneksi timeout saat mengubah fase.')), 6000);
    });
  }

  /**
   * 6. SUBMIT GAME 1 (Shuffle & Recall)
   */
  async submitGame1(sessionCode, teamNumber, answers) {
    const code = (sessionCode || '').trim().toUpperCase();
    const stored = this.getStoredTeamSession();
    const sessionToken = stored ? stored.sessionToken : null;
    const socket = await this.getSocket();

    return new Promise((resolve, reject) => {
      socket.emit('submit_game1', {
        roomCode: code,
        teamNumber,
        answers,
        sessionToken
      }, (res) => {
        if (res && res.success) {
          resolve(res);
        } else {
          reject(new Error((res && res.error) || 'Gagal mengirim jawaban Game 1.'));
        }
      });
      setTimeout(() => reject(new Error('Timeout mengirim jawaban Game 1.')), 6000);
    });
  }

  /**
   * 7. SUBMIT GAME 2 (Word Scramble)
   */
  async submitGame2Word(sessionCode, teamNumber, itemId, answer) {
    const code = (sessionCode || '').trim().toUpperCase();
    const stored = this.getStoredTeamSession();
    const sessionToken = stored ? stored.sessionToken : null;
    const socket = await this.getSocket();

    return new Promise((resolve, reject) => {
      socket.emit('submit_game2_word', {
        roomCode: code,
        teamNumber,
        itemId,
        answer,
        sessionToken
      }, (res) => {
        if (res && res.success) {
          resolve(res);
        } else {
          reject(new Error((res && res.error) || 'Gagal mengirim jawaban Game 2.'));
        }
      });
      setTimeout(() => reject(new Error('Timeout mengirim kata Game 2.')), 5000);
    });
  }

  /**
   * 8. SUBMIT GAME 3 (Heat Calculation)
   */
  async submitGame3Calculation(sessionCode, teamNumber, itemId, answer) {
    const code = (sessionCode || '').trim().toUpperCase();
    const stored = this.getStoredTeamSession();
    const sessionToken = stored ? stored.sessionToken : null;
    const socket = await this.getSocket();

    return new Promise((resolve, reject) => {
      socket.emit('submit_game3_calc', {
        roomCode: code,
        teamNumber,
        itemId,
        answer,
        sessionToken
      }, (res) => {
        if (res && res.success) {
          resolve(res);
        } else {
          reject(new Error((res && res.error) || 'Gagal mengirim kalkulasi Game 3.'));
        }
      });
      setTimeout(() => reject(new Error('Timeout mengirim kalkulasi Game 3.')), 5000);
    });
  }

  /**
   * 9. RESET SESSION (Host Only)
   */
  async resetSession(sessionCode) {
    const code = (sessionCode || '').trim().toUpperCase();
    const hostToken = this.getHostToken(code);
    const socket = await this.getSocket();

    return new Promise((resolve, reject) => {
      socket.emit('reset_room', { roomCode: code, hostToken }, (res) => {
        if (res && res.success) {
          if (res.room) this.currentRoomState = res.room;
          resolve(res);
        } else {
          reject(new Error((res && res.error) || 'Gagal me-reset sesi.'));
        }
      });
      setTimeout(() => reject(new Error('Timeout me-reset sesi.')), 5000);
    });
  }

  /**
   * 10. REALTIME LISTEN TO SESSION
   */
  listenToSession(sessionCode, callback) {
    const code = (sessionCode || '').trim().toUpperCase();
    if (!this.sessionListeners.has(code)) {
      this.sessionListeners.set(code, new Set());
    }
    this.sessionListeners.get(code).add(callback);

    // Ensure socket connected and room joined
    this.getSocket().then((sock) => {
      this.activeRoomCode = code;
      sock.emit('join_room', { roomCode: code }, (ack) => {
        if (ack && ack.room) {
          this.currentRoomState = ack.room;
          callback(ack.room);
        }
      });
    });

    // Immediate cached state delivery
    if (this.currentRoomState && this.currentRoomState.code === code) {
      setTimeout(() => callback(this.currentRoomState), 0);
    }

    return () => {
      const set = this.sessionListeners.get(code);
      if (set) {
        set.delete(callback);
        if (set.size === 0) this.sessionListeners.delete(code);
      }
    };
  }

  /**
   * 11. REALTIME TIMER LISTENER
   */
  listenToTimer(callback) {
    this.timerListeners.add(callback);
    return () => {
      this.timerListeners.delete(callback);
    };
  }

  /**
   * 12. CONNECTION STATUS LISTENER
   */
  listenToConnectionStatus(callback) {
    this.connectionListeners.add(callback);
    // Immediate callback with current state
    callback(this.isConnected);
    return () => {
      this.connectionListeners.delete(callback);
    };
  }

  /**
   * 13. HEARTBEAT
   */
  async sendHeartbeat(sessionCode, teamNumber, latency = 0) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('send_heartbeat', {
        roomCode: sessionCode,
        teamNumber,
        clientTimestamp: Date.now() - (latency || 0)
      });
    }
  }

  startHeartbeat(sessionCode, teamNumber) {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    const send = () => {
      this.sendHeartbeat(sessionCode, teamNumber, 0);
    };
    send();
    this.heartbeatInterval = setInterval(send, 4000);
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  onConnectionChange(callback) {
    return this.listenToConnectionStatus((online, reason) => {
      callback({
        online,
        consecutiveFailures: online ? 0 : 3,
        latencyMs: online ? 20 : 9999
      });
    });
  }

  /**
   * 14. LOCAL STORAGE TOKEN & SESSION MANAGERS
   */
  saveTeamSession(sessionCode, teamNumber, teamName, sessionToken) {
    try {
      const data = {
        sessionCode: sessionCode.toUpperCase(),
        teamNumber: parseInt(teamNumber, 10),
        teamName,
        sessionToken,
        joinedAt: Date.now()
      };
      localStorage.setItem('tc_socket_session', JSON.stringify(data));
      // Backward compatibility key
      localStorage.setItem('tc_team_session', JSON.stringify(data));
    } catch (e) {}
  }

  getStoredTeamSession() {
    try {
      const raw = localStorage.getItem('tc_socket_session') || localStorage.getItem('tc_team_session');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
  }

  clearStoredTeamSession() {
    try {
      localStorage.removeItem('tc_socket_session');
      localStorage.removeItem('tc_team_session');
      this.stopHeartbeat();
    } catch (e) {}
  }

  saveHostToken(roomCode, token) {
    try {
      localStorage.setItem(`tc_host_token_${roomCode.toUpperCase()}`, token);
    } catch (e) {}
  }

  getHostToken(roomCode) {
    try {
      return localStorage.getItem(`tc_host_token_${roomCode.toUpperCase()}`) || null;
    } catch (e) {}
    return null;
  }
}

export const socketService = new SocketService();
// Drop-in alias for existing code
export const firebaseService = socketService;
