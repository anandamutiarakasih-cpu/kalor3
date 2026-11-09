/**
 * THERMO CHAMPIONS: HEAT EDITION
 * Server Authoritative Room & State Engine
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
    this.socketToUser = new Map(); // socketId -> { roomCode, teamNumber, isHost }
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
   */
  async createRoom(hostSocketId, title = 'Sesi Pembelajaran Kalor SMP', settings = {}) {
    const roomCode = this.generateRoomCode();
    const hostToken = this.generateToken();

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
      teams: {}, // 1 to 8
      settings: {
        game1MemorizeTime: 35,
        game1PlayTime: 75,
        game2WordTime: 20,
        game3TotalTime: 120,
        maxTeams: 8,
        ...settings
      },
      dbId: null
    };

    // Initialize 8 empty team slots
    for (let i = 1; i <= 8; i++) {
      room.teams[`team_${i}`] = {
        number: i,
        name: `Kelompok ${i}`,
        members: [],
        claimed: false,
        ready: false,
        isOnline: false,
        socketId: null,
        sessionToken: null,
        scores: { game1: 0, game2: 0, game3: 0, total: 0 },
        progress: { game1Submitted: false, game2Answers: {}, game3Answers: {} },
        predicate: 'Temperature Rookie',
        lastSeen: 0,
        joinedAt: 0,
        dbId: null
      };
    }

    this.rooms.set(roomCode, room);
    this.socketToUser.set(hostSocketId, { roomCode, isHost: true });

    // Asynchronously checkpoint to Supabase
    dbUpsertRoom(room).then((id) => {
      if (id) room.dbId = id;
    });

    console.log(`[RoomManager] Room created: ${roomCode} by host socket ${hostSocketId}`);
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
   * REGISTER TEAM (Kelompok 1 - 8)
   */
  async registerTeam(roomCode, teamNumber, teamName, members = [], socketId, clientSessionToken = null) {
    const room = this.getRoom(roomCode);
    if (!room) {
      throw new Error(`Sesi dengan kode ${roomCode} tidak ditemukan.`);
    }

    const num = parseInt(teamNumber, 10);
    if (isNaN(num) || num < 1 || num > 8) {
      throw new Error('Nomor kelompok harus berada di antara 1 sampai 8.');
    }

    const tKey = `team_${num}`;
    const targetTeam = room.teams[tKey];

    // Reconnection check: if already claimed, verify session token
    if (targetTeam.claimed) {
      if (clientSessionToken && targetTeam.sessionToken === clientSessionToken) {
        // Legitimate reconnection!
        targetTeam.socketId = socketId;
        targetTeam.isOnline = true;
        targetTeam.lastSeen = Date.now();
        this.socketToUser.set(socketId, { roomCode: room.code, teamNumber: num, isHost: false });
        console.log(`[RoomManager] Team ${num} reconnected to room ${room.code}`);
        return {
          success: true,
          reconnected: true,
          teamNumber: num,
          sessionToken: targetTeam.sessionToken,
          team: targetTeam,
          room: this.sanitizeRoom(room)
        };
      } else {
        throw new Error(`Kelompok ${num} sudah diambil oleh perangkat lain.`);
      }
    }

    // Only allow new team registrations during LOBBY
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
    targetTeam.sessionToken = sessionToken;
    targetTeam.joinedAt = Date.now();
    targetTeam.lastSeen = Date.now();

    this.socketToUser.set(socketId, { roomCode: room.code, teamNumber: num, isHost: false });

    // Persist to Supabase in background
    if (room.dbId) {
      dbUpsertTeam(room.dbId, targetTeam).then((tId) => {
        if (tId) targetTeam.dbId = tId;
      });
    }

    console.log(`[RoomManager] Team ${num} (${targetTeam.name}) joined room ${room.code}`);
    return {
      success: true,
      reconnected: false,
      teamNumber: num,
      sessionToken,
      team: targetTeam,
      room: this.sanitizeRoom(room)
    };
  }

  /**
   * SET SESSION PHASE (Host Only)
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
    dbUpsertRoom(room);

    // If FINISHED, compute final results & commit
    if (phase === 'FINISHED') {
      const ranked = computeLeaderboard(room.teams);
      if (room.dbId) {
        dbSaveGameResults(room.dbId, ranked);
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
   * SUBMIT GAME 1 (Shuffle & Recall)
   */
  async submitGame1(roomCode, teamNumber, answers, sessionToken) {
    const room = this.getRoom(roomCode);
    if (!room) throw new Error('Sesi tidak ditemukan.');

    const num = parseInt(teamNumber, 10);
    const team = room.teams[`team_${num}`];
    if (!team) throw new Error('Kelompok tidak ditemukan.');

    if (sessionToken && team.sessionToken !== sessionToken) {
      throw new Error('Autentikasi sesi kelompok tidak cocok.');
    }

    // Deduplication check
    if (team.progress.game1Submitted) {
      return {
        success: true,
        alreadySubmitted: true,
        score: team.scores.game1,
        totalGame1Score: team.scores.game1,
        team
      };
    }

    // Authoritative Scoring
    const evalResult = evaluateShuffleAnswers(answers);
    team.scores.game1 = evalResult.score;
    team.scores.total = Math.min(100, Math.round(((evalResult.score || 0) + (team.scores.game2 || 0) + (team.scores.game3 || 0)) * 10) / 10);
    team.predicate = computePredicate(team.scores.total);
    team.progress.game1Submitted = true;
    team.lastSeen = Date.now();

    // Persist answer & score to Supabase
    if (room.dbId && team.dbId) {
      dbRecordAnswer(room.dbId, team.dbId, {
        gameType: 'GAME1_PLAY',
        questionId: 'all_shuffle',
        answer: answers,
        isCorrect: evalResult.isPerfect,
        scoreAwarded: evalResult.score
      });
      dbUpsertTeam(room.dbId, team);
    }

    return {
      success: true,
      score: evalResult.score,
      totalGame1Score: evalResult.score,
      correctCount: evalResult.correctCount,
      totalItems: evalResult.totalItems,
      isPerfect: evalResult.isPerfect,
      team,
      room: this.sanitizeRoom(room)
    };
  }

  /**
   * SUBMIT GAME 2 (Word Scramble)
   */
  async submitGame2Word(roomCode, teamNumber, itemId, answer, sessionToken) {
    const room = this.getRoom(roomCode);
    if (!room) throw new Error('Sesi tidak ditemukan.');

    const num = parseInt(teamNumber, 10);
    const team = room.teams[`team_${num}`];
    if (!team) throw new Error('Kelompok tidak ditemukan.');

    if (sessionToken && team.sessionToken !== sessionToken) {
      throw new Error('Autentikasi sesi kelompok tidak cocok.');
    }

    // Deduplication check per word
    if (team.progress.game2Answers && team.progress.game2Answers[itemId]) {
      return {
        success: true,
        alreadyAnswered: true,
        addedScore: team.progress.game2Answers[itemId].score || 0,
        totalGame2Score: team.scores.game2,
        expected: team.progress.game2Answers[itemId].expected || ''
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

    // Persist to Supabase
    if (room.dbId && team.dbId) {
      dbRecordAnswer(room.dbId, team.dbId, {
        gameType: 'GAME2',
        questionId: itemId,
        answer,
        isCorrect: evalResult.correct,
        scoreAwarded: evalResult.score,
        remainingSec
      });
      dbUpsertTeam(room.dbId, team);
    }

    return {
      success: true,
      correct: evalResult.correct,
      addedScore: evalResult.score,
      totalGame2Score: newG2,
      expected: evalResult.expected,
      team,
      room: this.sanitizeRoom(room)
    };
  }

  /**
   * SUBMIT GAME 3 (Heat Calculation)
   */
  async submitGame3Calculation(roomCode, teamNumber, itemId, answerRaw, sessionToken) {
    const room = this.getRoom(roomCode);
    if (!room) throw new Error('Sesi tidak ditemukan.');

    const num = parseInt(teamNumber, 10);
    const team = room.teams[`team_${num}`];
    if (!team) throw new Error('Kelompok tidak ditemukan.');

    if (sessionToken && team.sessionToken !== sessionToken) {
      throw new Error('Autentikasi sesi kelompok tidak cocok.');
    }

    // Deduplication check
    if (team.progress.game3Answers && team.progress.game3Answers[itemId]) {
      return {
        success: true,
        alreadyAnswered: true,
        addedScore: team.progress.game3Answers[itemId].score || 0,
        totalGame3Score: team.scores.game3,
        expected: team.progress.game3Answers[itemId].expected || 0
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

    // Persist to Supabase
    if (room.dbId && team.dbId) {
      dbRecordAnswer(room.dbId, team.dbId, {
        gameType: 'GAME3',
        questionId: itemId,
        answer: answerRaw,
        isCorrect: evalResult.correct,
        scoreAwarded: evalResult.score,
        remainingSec
      });
      dbUpsertTeam(room.dbId, team);
    }

    return {
      success: true,
      correct: evalResult.correct,
      addedScore: evalResult.score,
      totalGame3Score: newG3,
      expected: evalResult.expected,
      explanation: evalResult.explanation,
      team,
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

    for (let i = 1; i <= 8; i++) {
      const t = room.teams[`team_${i}`];
      t.scores = { game1: 0, game2: 0, game3: 0, total: 0 };
      t.progress = { game1Submitted: false, game2Answers: {}, game3Answers: {} };
      t.predicate = 'Temperature Rookie';
    }

    dbUpsertRoom(room);
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
      latency: latency,
      isOnline: true
    };
  }

  /**
   * HANDLE DISCONNECT
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
      team.isOnline = false;
      this.io.to(`room:${room.code}`).emit('player_disconnected', {
        teamNumber: team.number,
        teamName: team.name,
        lastSeen: team.lastSeen
      });
      console.log(`[RoomManager] Team ${team.number} socket disconnected from room ${room.code}`);
    }
  }

  /**
   * SANITIZE ROOM PAYLOAD FOR CLIENTS
   */
  sanitizeRoom(room) {
    if (!room) return null;
    return {
      code: room.code,
      title: room.title,
      status: room.status,
      currentPhase: room.currentPhase,
      phaseStartedAt: room.phaseStartedAt,
      phaseEndsAt: room.phaseEndsAt,
      phaseDuration: room.phaseDuration,
      createdAt: room.createdAt,
      teams: room.teams,
      settings: room.settings
    };
  }
}
