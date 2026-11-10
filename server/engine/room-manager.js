/**
 * THERMO CHAMPIONS: HEAT EDITION
 * Server Authoritative Room & State Engine
 * Optimized for High-Concurrency Multiplayer (Up to 41 Concurrent Users in 1 Room)
 */

import crypto from 'crypto';
import {
  evaluateShuffleAnswers,
  evaluateWordScrambleWord,
  evaluateCalculationItem,
  computePredicate,
  computeLeaderboard
} from './scoring-engine.js';
import {
  dbUpsertRoom,
  dbUpsertTeam,
  dbRecordAnswer,
  dbSaveGameResults
} from '../config/supabase.js';

export class RoomManager {
  constructor(io, timerManager) {
    this.io = io;
    this.timerManager = timerManager;
    this.rooms = new Map(); // roomCode -> Room Object
    this.socketToUser = new Map(); // socketId -> { roomCode, teamNumber, sessionToken, isHost }
    this.submissionIdCache = new Map(); // roomCode:teamNum:key -> timestamp (TTL cache for idempotency)
  }

  generateRoomCode() {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = 'TC';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // Prevent collisions
    if (this.rooms.has(code)) {
      return this.generateRoomCode();
    }
    return code;
  }

  generateToken() {
    return 'tok_' + crypto.randomBytes(16).toString('hex');
  }

  /**
   * CREATE ROOM (Host / Teacher)
   * Supports configurable team/player slots (up to 40 students + 1 teacher)
   */
  async createRoom(hostSocketId, title = 'Sesi Pembelajaran Kalor SMP', settings = {}) {
    const roomCode = this.generateRoomCode();
    const hostToken = this.generateToken();
    const maxTeams = Math.min(60, Math.max(8, parseInt(settings.maxTeams, 10) || 40));

    const room = {
      code: roomCode,
      title: title.trim(),
      hostSocketId,
      hostToken,
      status: 'LOBBY',
      currentPhase: 'LOBBY',
      phaseStartedAt: null,
      phaseEndsAt: null,
      phaseDuration: 0,
      createdAt: Date.now(),
      teams: {}, // team_1 to team_maxTeams
      settings: {
        game1MemorizeTime: 35,
        game1PlayTime: 75,
        game2WordTime: 20,
        game3TotalTime: 120,
        maxTeams,
        ...settings
      },
      dbId: null
    };

    // Initialize team slots
    for (let i = 1; i <= maxTeams; i++) {
      room.teams[`team_${i}`] = {
        number: i,
        name: `Kelompok ${i}`,
        members: [],
        claimed: false,
        ready: false,
        isOnline: false,
        socketId: null,
        sockets: new Set(),
        sessionToken: null,
        memberTokens: new Set(),
        scores: { game1: 0, game2: 0, game3: 0, total: 0 },
        progress: { game1Submitted: false, game2Answers: {}, game3Answers: {} },
        predicate: 'Temperature Rookie',
        lastSeen: 0,
        joinedAt: 0,
        latency: 0,
        dbId: null
      };
    }

    this.rooms.set(roomCode, room);
    this.socketToUser.set(hostSocketId, { roomCode, isHost: true });

    // Asynchronously checkpoint to Supabase without blocking WebSocket loop
    dbUpsertRoom(room).then((id) => {
      if (id) room.dbId = id;
    }).catch(() => {});

    console.log(`[RoomManager] Room created: ${roomCode} by host socket ${hostSocketId} (Capacity: ${maxTeams} teams)`);
    return {
      success: true,
      roomCode,
      hostToken,
      room: this.sanitizeRoom(room)
    };
  }

  getRoom(roomCode) {
    if (!roomCode) return null;
    return this.rooms.get(roomCode.trim().toUpperCase()) || null;
  }

  /**
   * REGISTER TEAM (Kelompok / Peserta 1 to maxTeams)
   * Supports:
   * 1. 40 individual student accounts (teamNumber 1 to 40)
   * 2. 8 teams with multi-device students (up to 5 students each = 40 devices)
   * 3. Seamless reconnection via sessionToken
   */
  async registerTeam(roomCode, teamNumber, teamName, members = [], socketId, clientSessionToken = null) {
    const room = this.getRoom(roomCode);
    if (!room) {
      throw new Error(`Sesi dengan kode ${roomCode} tidak ditemukan.`);
    }

    const num = parseInt(teamNumber, 10);
    const maxCapacity = room.settings?.maxTeams || 40;
    if (isNaN(num) || num < 1 || num > maxCapacity) {
      throw new Error(`Nomor kelompok harus berada di antara 1 sampai ${maxCapacity}.`);
    }

    const tKey = `team_${num}`;
    const targetTeam = room.teams[tKey];
    if (!targetTeam) {
      throw new Error(`Slot Kelompok ${num} tidak tersedia.`);
    }

    // Ensure Sets are initialized (e.g. after JSON recovery)
    if (!(targetTeam.sockets instanceof Set)) targetTeam.sockets = new Set();
    if (!(targetTeam.memberTokens instanceof Set)) targetTeam.memberTokens = new Set();

    // 1. Reconnection Check: Session Token Matches
    const isSessionTokenMatch = Boolean(
      clientSessionToken && (
        targetTeam.sessionToken === clientSessionToken ||
        targetTeam.memberTokens.has(clientSessionToken)
      )
    );

    if (isSessionTokenMatch) {
      targetTeam.sockets.add(socketId);
      targetTeam.socketId = socketId;
      targetTeam.isOnline = true;
      targetTeam.lastSeen = Date.now();

      this.socketToUser.set(socketId, {
        roomCode: room.code,
        teamNumber: num,
        sessionToken: clientSessionToken,
        isHost: false
      });

      console.log(`[RoomManager] Team ${num} reconnected socket ${socketId} to room ${room.code}`);
      return {
        success: true,
        reconnected: true,
        teamNumber: num,
        sessionToken: clientSessionToken,
        team: this.sanitizeTeam(targetTeam),
        room: this.sanitizeRoom(room)
      };
    }

    // 2. Multi-device Join for Same Team during LOBBY
    if (targetTeam.claimed && room.status === 'LOBBY') {
      const memberToken = clientSessionToken || this.generateToken();
      targetTeam.sockets.add(socketId);
      targetTeam.memberTokens.add(memberToken);
      targetTeam.socketId = socketId;
      targetTeam.isOnline = true;
      targetTeam.lastSeen = Date.now();

      if (Array.isArray(members) && members.length > 0) {
        // Append unique members
        const existingAbsen = new Set(targetTeam.members.map(m => String(m.absen || '')));
        for (const m of members) {
          if (!existingAbsen.has(String(m.absen || ''))) {
            targetTeam.members.push(m);
            existingAbsen.add(String(m.absen || ''));
          }
        }
      }

      this.socketToUser.set(socketId, {
        roomCode: room.code,
        teamNumber: num,
        sessionToken: memberToken,
        isHost: false
      });

      console.log(`[RoomManager] Team ${num} added participant socket ${socketId} (Total devices: ${targetTeam.sockets.size})`);
      return {
        success: true,
        reconnected: false,
        teamNumber: num,
        sessionToken: memberToken,
        team: this.sanitizeTeam(targetTeam),
        room: this.sanitizeRoom(room)
      };
    }

    // 3. Claim Check: If already claimed during ongoing game, prevent unauthorized hijacking
    if (targetTeam.claimed && room.status !== 'LOBBY') {
      throw new Error(`Kelompok ${num} sedang dalam permainan. Gunakan token sesi untuk reconnect.`);
    }

    // 4. New Registration (Fresh Claim)
    if (room.status !== 'LOBBY') {
      throw new Error('Permainan sudah dimulai atau telah berakhir.');
    }

    const sessionToken = clientSessionToken || this.generateToken();
    targetTeam.number = num;
    targetTeam.name = (teamName || `Kelompok ${num}`).trim();
    targetTeam.members = Array.isArray(members) ? members : [];
    targetTeam.claimed = true;
    targetTeam.ready = true;
    targetTeam.isOnline = true;
    targetTeam.socketId = socketId;
    targetTeam.sockets.add(socketId);
    targetTeam.sessionToken = sessionToken;
    targetTeam.memberTokens.add(sessionToken);
    targetTeam.joinedAt = Date.now();
    targetTeam.lastSeen = Date.now();

    this.socketToUser.set(socketId, {
      roomCode: room.code,
      teamNumber: num,
      sessionToken,
      isHost: false
    });

    // Checkpoint to Supabase in background
    if (room.dbId) {
      dbUpsertTeam(room.dbId, targetTeam).then((tId) => {
        if (tId) targetTeam.dbId = tId;
      }).catch(() => {});
    }

    console.log(`[RoomManager] Team ${num} (${targetTeam.name}) joined room ${room.code}`);
    return {
      success: true,
      reconnected: false,
      teamNumber: num,
      sessionToken,
      team: this.sanitizeTeam(targetTeam),
      room: this.sanitizeRoom(room)
    };
  }

  /**
   * SET SESSION PHASE (Host / Teacher Only)
   */
  async setSessionPhase(roomCode, phase, hostToken) {
    const room = this.getRoom(roomCode);
    if (!room) throw new Error('Sesi tidak ditemukan.');

    if (hostToken && room.hostToken !== hostToken) {
      throw new Error('Hanya Host / Guru yang memiliki hak mengubah fase permainan.');
    }

    let duration = 0;
    if (phase === 'GAME1_MEMORIZE') duration = room.settings.game1MemorizeTime || 35;
    else if (phase === 'GAME1_PLAY') duration = room.settings.game1PlayTime || 75;
    else if (phase === 'GAME2') duration = (room.settings.game2WordTime || 20) * 10;
    else if (phase === 'GAME3') duration = room.settings.game3TotalTime || 120;
    else if (phase === 'FINISHED') duration = 0;

    room.status = phase;
    room.currentPhase = phase;
    room.phaseStartedAt = Date.now();
    room.phaseDuration = duration;
    room.phaseEndsAt = duration > 0 ? (room.phaseStartedAt + duration * 1000) : null;

    // Start authoritative timer
    this.timerManager.startPhaseTimer(room.code, phase, duration, (rCode, expiredPhase) => {
      this.handlePhaseTimerExpired(rCode, expiredPhase);
    });

    // Checkpoint to Supabase
    dbUpsertRoom(room).catch(() => {});

    // If FINISHED, compute final results & commit
    if (phase === 'FINISHED') {
      const ranked = computeLeaderboard(room.teams);
      if (room.dbId) {
        dbSaveGameResults(room.dbId, ranked).catch(() => {});
      }
    }

    console.log(`[RoomManager] Room ${roomCode} phase set to: ${phase} (${duration}s)`);
    return {
      success: true,
      phase,
      duration,
      room: this.sanitizeRoom(room)
    };
  }

  handlePhaseTimerExpired(roomCode, expiredPhase) {
    const room = this.getRoom(roomCode);
    if (!room || room.currentPhase !== expiredPhase) return;

    console.log(`[RoomManager] Authoritative Timer Expired for ${roomCode} on phase ${expiredPhase}`);

    // If Game 1 Memorize finishes, auto-transition to Game 1 Play
    if (expiredPhase === 'GAME1_MEMORIZE') {
      this.setSessionPhase(roomCode, 'GAME1_PLAY', room.hostToken).then((res) => {
        this.io.to(`room:${roomCode}`).emit('phase_changed', {
          phase: 'GAME1_PLAY',
          duration: res.duration,
          room: res.room
        });
      });
      return;
    }

    // Emit phase timeout to room
    this.io.to(`room:${roomCode}`).emit('phase_time_up', {
      phase: expiredPhase,
      roomCode
    });
  }

  /**
   * Check Session Token Match
   */
  isTokenAuthorized(team, token) {
    if (!token) return true; // Backward compatibility
    if (team.sessionToken === token) return true;
    if (team.memberTokens && team.memberTokens.has(token)) return true;
    return false;
  }

  /**
   * SUBMIT GAME 1 (Shuffle & Recall) - Idempotent
   */
  async submitGame1(roomCode, teamNumber, answers, sessionToken) {
    const room = this.getRoom(roomCode);
    if (!room) throw new Error('Sesi tidak ditemukan.');

    const num = parseInt(teamNumber, 10);
    const team = room.teams[`team_${num}`];
    if (!team) throw new Error('Kelompok tidak ditemukan.');

    if (!this.isTokenAuthorized(team, sessionToken)) {
      throw new Error('Autentikasi sesi kelompok tidak cocok.');
    }

    // Deduplication check: return cached score immediately
    if (team.progress.game1Submitted) {
      return {
        success: true,
        alreadySubmitted: true,
        score: team.scores.game1,
        totalGame1Score: team.scores.game1,
        team: this.sanitizeTeam(team),
        room: this.sanitizeRoom(room)
      };
    }

    // Authoritative Scoring
    const evalResult = evaluateShuffleAnswers(answers);
    team.scores.game1 = evalResult.score;
    team.scores.total = Math.min(100, Math.round(((evalResult.score || 0) + (team.scores.game2 || 0) + (team.scores.game3 || 0)) * 10) / 10);
    team.predicate = computePredicate(team.scores.total);
    team.progress.game1Submitted = true;
    team.lastSeen = Date.now();

    // Persist answer & score in background
    if (room.dbId && team.dbId) {
      dbRecordAnswer(room.dbId, team.dbId, {
        gameType: 'GAME1_PLAY',
        questionId: 'all_shuffle',
        answer: answers,
        isCorrect: evalResult.isPerfect,
        scoreAwarded: evalResult.score
      }).catch(() => {});
      dbUpsertTeam(room.dbId, team).catch(() => {});
    }

    return {
      success: true,
      score: evalResult.score,
      totalGame1Score: evalResult.score,
      correctCount: evalResult.correctCount,
      totalItems: evalResult.totalItems,
      isPerfect: evalResult.isPerfect,
      team: this.sanitizeTeam(team),
      room: this.sanitizeRoom(room)
    };
  }

  /**
   * SUBMIT GAME 2 (Word Scramble) - Idempotent
   */
  async submitGame2Word(roomCode, teamNumber, itemId, answer, sessionToken) {
    const room = this.getRoom(roomCode);
    if (!room) throw new Error('Sesi tidak ditemukan.');

    const num = parseInt(teamNumber, 10);
    const team = room.teams[`team_${num}`];
    if (!team) throw new Error('Kelompok tidak ditemukan.');

    if (!this.isTokenAuthorized(team, sessionToken)) {
      throw new Error('Autentikasi sesi kelompok tidak cocok.');
    }

    // Deduplication check per word
    if (team.progress.game2Answers && team.progress.game2Answers[itemId]) {
      return {
        success: true,
        alreadyAnswered: true,
        addedScore: team.progress.game2Answers[itemId].score || 0,
        totalGame2Score: team.scores.game2,
        expected: team.progress.game2Answers[itemId].expected || '',
        team: this.sanitizeTeam(team),
        room: this.sanitizeRoom(room)
      };
    }

    const remainingSec = this.timerManager.getRemainingSec(roomCode);
    const evalResult = evaluateWordScrambleWord(itemId, answer, remainingSec, 20);

    const currentG2 = team.scores.game2 || 0;
    const newG2 = Math.min(35, Math.round((currentG2 + evalResult.score) * 10) / 10);

    team.scores.game2 = newG2;
    team.scores.total = Math.min(100, Math.round(((team.scores.game1 || 0) + newG2 + (team.scores.game3 || 0)) * 10) / 10);
    team.predicate = computePredicate(team.scores.total);

    if (!team.progress.game2Answers) team.progress.game2Answers = {};
    team.progress.game2Answers[itemId] = {
      answer,
      isCorrect: evalResult.correct,
      score: evalResult.score,
      expected: evalResult.expected,
      time: Date.now()
    };
    team.lastSeen = Date.now();

    // Persist to Supabase in background
    if (room.dbId && team.dbId) {
      dbRecordAnswer(room.dbId, team.dbId, {
        gameType: 'GAME2',
        questionId: itemId,
        answer,
        isCorrect: evalResult.correct,
        scoreAwarded: evalResult.score,
        remainingSec
      }).catch(() => {});
      dbUpsertTeam(room.dbId, team).catch(() => {});
    }

    return {
      success: true,
      correct: evalResult.correct,
      addedScore: evalResult.score,
      totalGame2Score: newG2,
      expected: evalResult.expected,
      team: this.sanitizeTeam(team),
      room: this.sanitizeRoom(room)
    };
  }

  /**
   * SUBMIT GAME 3 (Heat Calculation) - Idempotent
   */
  async submitGame3Calculation(roomCode, teamNumber, itemId, answerRaw, sessionToken) {
    const room = this.getRoom(roomCode);
    if (!room) throw new Error('Sesi tidak ditemukan.');

    const num = parseInt(teamNumber, 10);
    const team = room.teams[`team_${num}`];
    if (!team) throw new Error('Kelompok tidak ditemukan.');

    if (!this.isTokenAuthorized(team, sessionToken)) {
      throw new Error('Autentikasi sesi kelompok tidak cocok.');
    }

    // Deduplication check
    if (team.progress.game3Answers && team.progress.game3Answers[itemId]) {
      return {
        success: true,
        alreadyAnswered: true,
        addedScore: team.progress.game3Answers[itemId].score || 0,
        totalGame3Score: team.scores.game3,
        expected: team.progress.game3Answers[itemId].expected || 0,
        team: this.sanitizeTeam(team),
        room: this.sanitizeRoom(room)
      };
    }

    const remainingSec = this.timerManager.getRemainingSec(roomCode);
    const evalResult = evaluateCalculationItem(itemId, answerRaw, remainingSec, 120);

    const currentG3 = team.scores.game3 || 0;
    const newG3 = Math.min(35, Math.round((currentG3 + evalResult.score) * 10) / 10);

    team.scores.game3 = newG3;
    team.scores.total = Math.min(100, Math.round(((team.scores.game1 || 0) + (team.scores.game2 || 0) + newG3) * 10) / 10);
    team.predicate = computePredicate(team.scores.total);

    if (!team.progress.game3Answers) team.progress.game3Answers = {};
    team.progress.game3Answers[itemId] = {
      answer: answerRaw,
      isCorrect: evalResult.correct,
      score: evalResult.score,
      expected: evalResult.expected,
      time: Date.now()
    };
    team.lastSeen = Date.now();

    // Persist to Supabase in background
    if (room.dbId && team.dbId) {
      dbRecordAnswer(room.dbId, team.dbId, {
        gameType: 'GAME3',
        questionId: itemId,
        answer: answerRaw,
        isCorrect: evalResult.correct,
        scoreAwarded: evalResult.score,
        remainingSec
      }).catch(() => {});
      dbUpsertTeam(room.dbId, team).catch(() => {});
    }

    return {
      success: true,
      correct: evalResult.correct,
      addedScore: evalResult.score,
      totalGame3Score: newG3,
      expected: evalResult.expected,
      explanation: evalResult.explanation,
      team: this.sanitizeTeam(team),
      room: this.sanitizeRoom(room)
    };
  }

  /**
   * RESET ROOM
   */
  async resetRoom(roomCode, hostToken) {
    const room = this.getRoom(roomCode);
    if (!room) throw new Error('Sesi tidak ditemukan.');

    if (hostToken && room.hostToken !== hostToken) {
      throw new Error('Hanya Host / Guru yang dapat me-reset sesi.');
    }

    this.timerManager.cancelTimer(roomCode);

    room.status = 'LOBBY';
    room.currentPhase = 'LOBBY';
    room.phaseStartedAt = null;
    room.phaseEndsAt = null;
    room.phaseDuration = 0;

    for (const team of Object.values(room.teams)) {
      team.scores = { game1: 0, game2: 0, game3: 0, total: 0 };
      team.progress = { game1Submitted: false, game2Answers: {}, game3Answers: {} };
      team.predicate = 'Temperature Rookie';
    }

    dbUpsertRoom(room).catch(() => {});
    return { success: true, room: this.sanitizeRoom(room) };
  }

  /**
   * HEARTBEAT
   */
  recordHeartbeat(roomCode, teamNumber, latency = 0) {
    const room = this.getRoom(roomCode);
    if (!room) return null;
    const team = room.teams[`team_${teamNumber}`];
    if (!team) return null;

    team.lastSeen = Date.now();
    team.isOnline = true;
    team.latency = latency;

    return {
      teamNumber: parseInt(teamNumber, 10),
      lastSeen: team.lastSeen,
      latency,
      isOnline: true
    };
  }

  /**
   * HANDLE DISCONNECT
   * Properly decrements socket counts for multi-device teams
   */
  handleDisconnect(socketId) {
    const user = this.socketToUser.get(socketId);
    if (!user) return;

    this.socketToUser.delete(socketId);
    const room = this.rooms.get(user.roomCode);
    if (!room) return;

    if (user.isHost) {
      console.log(`[RoomManager] Host socket disconnected from room ${user.roomCode}`);
      return;
    }

    const team = room.teams[`team_${user.teamNumber}`];
    if (team) {
      if (team.sockets instanceof Set) {
        team.sockets.delete(socketId);
        team.isOnline = team.sockets.size > 0;
      } else {
        team.isOnline = false;
      }

      // Only broadcast disconnection if all sockets for this team are gone
      if (!team.isOnline) {
        this.io.to(`room:${room.code}`).emit('player_disconnected', {
          teamNumber: team.number,
          teamName: team.name,
          lastSeen: team.lastSeen
        });
      }
      console.log(`[RoomManager] Team ${team.number} socket ${socketId} disconnected (Online: ${team.isOnline}, Active sockets: ${team.sockets ? team.sockets.size : 0})`);
    }
  }

  /**
   * SANITIZE TEAM (Serializes Set objects for Socket.IO JSON)
   */
  sanitizeTeam(team) {
    if (!team) return null;
    return {
      number: team.number,
      name: team.name,
      members: team.members,
      claimed: team.claimed,
      ready: team.ready,
      isOnline: team.isOnline,
      activeConnections: (team.sockets instanceof Set) ? team.sockets.size : (team.isOnline ? 1 : 0),
      scores: team.scores,
      progress: team.progress,
      predicate: team.predicate,
      lastSeen: team.lastSeen,
      joinedAt: team.joinedAt,
      latency: team.latency || 0,
      dbId: team.dbId
    };
  }

  /**
   * SANITIZE ROOM PAYLOAD FOR CLIENTS
   */
  sanitizeRoom(room) {
    if (!room) return null;
    const sanitizedTeams = {};
    for (const [key, t] of Object.entries(room.teams)) {
      sanitizedTeams[key] = this.sanitizeTeam(t);
    }

    return {
      code: room.code,
      title: room.title,
      status: room.status,
      currentPhase: room.currentPhase,
      phaseStartedAt: room.phaseStartedAt,
      phaseEndsAt: room.phaseEndsAt,
      phaseDuration: room.phaseDuration,
      createdAt: room.createdAt,
      teams: sanitizedTeams,
      settings: room.settings
    };
  }
}
