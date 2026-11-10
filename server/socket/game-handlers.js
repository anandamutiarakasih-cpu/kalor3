/**
 * THERMO CHAMPIONS: HEAT EDITION
 * Socket.IO Game & Room Event Handlers
 * Optimized for High-Concurrency Multiplayer (Up to 41 Concurrent Users in 1 Room)
 */

import { computeLeaderboard } from '../engine/scoring-engine.js';

// Throttled Leaderboard Updates: prevents 40 concurrent computations and emissions per second
const leaderboardThrottles = new Map(); // roomCode -> TimerId

function triggerThrottledLeaderboard(io, roomManager, roomCode, delayMs = 300) {
  if (leaderboardThrottles.has(roomCode)) return;

  const timerId = setTimeout(() => {
    leaderboardThrottles.delete(roomCode);
    const room = roomManager.getRoom(roomCode);
    if (room) {
      const leaderboard = computeLeaderboard(room.teams);
      io.to(`room:${roomCode}`).emit('leaderboard_updated', { leaderboard });
    }
  }, delayMs);

  leaderboardThrottles.set(roomCode, timerId);
}

export function registerSocketHandlers(io, socket, roomManager, timerManager) {
  const logPrefix = `[Socket ${socket.id.substring(0, 6)}]`;

  // Helper to safely emit error back to client
  const emitError = (event, message) => {
    console.warn(`${logPrefix} Error on [${event}]: ${message}`);
    socket.emit('room_error', { event, message, timestamp: Date.now() });
  };

  /**
   * 1. CREATE ROOM (Host / Teacher)
   */
  socket.on('create_room', async (data = {}, callback) => {
    try {
      const title = data.title || 'Sesi Pembelajaran Kalor SMP';
      const settings = data.settings || {};
      const result = await roomManager.createRoom(socket.id, title, settings);

      socket.join(`room:${result.roomCode}`);

      console.log(`${logPrefix} Created room: ${result.roomCode}`);
      if (typeof callback === 'function') {
        callback({ success: true, ...result });
      } else {
        socket.emit('room_created', result);
      }
    } catch (err) {
      emitError('create_room', err.message);
      if (typeof callback === 'function') callback({ success: false, error: err.message });
    }
  });

  /**
   * 2. JOIN ROOM (Spectator / Admin observe / Team before register)
   */
  socket.on('join_room', (data = {}, callback) => {
    try {
      const roomCode = (data.roomCode || '').trim().toUpperCase();
      const room = roomManager.getRoom(roomCode);
      if (!room) {
        throw new Error(`Sesi dengan kode ${roomCode} tidak ditemukan.`);
      }

      socket.join(`room:${roomCode}`);
      const sanitized = roomManager.sanitizeRoom(room);
      const timerInfo = timerManager.getTimerInfo(roomCode);

      const payload = {
        success: true,
        room: sanitized,
        timer: timerInfo,
        serverTime: Date.now()
      };

      if (typeof callback === 'function') {
        callback(payload);
      } else {
        socket.emit('room_joined', payload);
      }
    } catch (err) {
      emitError('join_room', err.message);
      if (typeof callback === 'function') callback({ success: false, error: err.message });
    }
  });

  /**
   * 3. REGISTER TEAM (Kelompok 1 to 40)
   */
  socket.on('register_team', async (data = {}, callback) => {
    try {
      const { roomCode, teamNumber, teamName, members, sessionToken } = data;
      const cleanCode = (roomCode || '').trim().toUpperCase();

      const result = await roomManager.registerTeam(
        cleanCode,
        teamNumber,
        teamName,
        members,
        socket.id,
        sessionToken
      );

      socket.join(`room:${cleanCode}`);

      // Broadcast team joined event
      io.to(`room:${cleanCode}`).emit('team_joined', {
        teamNumber: result.teamNumber,
        team: result.team,
        reconnected: result.reconnected
      });

      // Broadcast room state
      io.to(`room:${cleanCode}`).emit('room_updated', {
        room: result.room
      });

      const timerInfo = timerManager.getTimerInfo(cleanCode);
      const responsePayload = {
        ...result,
        timer: timerInfo,
        serverTime: Date.now()
      };

      if (typeof callback === 'function') {
        callback(responsePayload);
      } else {
        socket.emit('team_registered', responsePayload);
      }
    } catch (err) {
      emitError('register_team', err.message);
      if (typeof callback === 'function') callback({ success: false, error: err.message });
    }
  });

  /**
   * 4. RECONNECT SESSION (Recovery using sessionToken)
   */
  socket.on('reconnect_session', async (data = {}, callback) => {
    try {
      const { roomCode, teamNumber, sessionToken } = data;
      const cleanCode = (roomCode || '').trim().toUpperCase();

      const result = await roomManager.registerTeam(
        cleanCode,
        teamNumber,
        null,
        [],
        socket.id,
        sessionToken
      );

      socket.join(`room:${cleanCode}`);

      io.to(`room:${cleanCode}`).emit('player_reconnected', {
        teamNumber: result.teamNumber,
        team: result.team
      });

      const timerInfo = timerManager.getTimerInfo(cleanCode);
      const responsePayload = {
        ...result,
        timer: timerInfo,
        serverTime: Date.now()
      };

      if (typeof callback === 'function') {
        callback(responsePayload);
      } else {
        socket.emit('session_reconnected', responsePayload);
      }
    } catch (err) {
      emitError('reconnect_session', err.message);
      if (typeof callback === 'function') callback({ success: false, error: err.message });
    }
  });

  /**
   * 5. SET PHASE (Host / Teacher Only)
   */
  socket.on('set_phase', async (data = {}, callback) => {
    try {
      const { roomCode, phase, hostToken } = data;
      const cleanCode = (roomCode || '').trim().toUpperCase();

      const result = await roomManager.setSessionPhase(cleanCode, phase, hostToken);

      // Broadcast phase change to entire room
      io.to(`room:${cleanCode}`).emit('phase_changed', {
        phase: result.phase,
        duration: result.duration,
        room: result.room
      });

      // Synchronize timer for all clients instantly
      io.to(`room:${cleanCode}`).emit('sync_timer', {
        phase: result.phase,
        serverTime: Date.now(),
        startedAt: result.room.phaseStartedAt,
        endsAt: result.room.phaseEndsAt,
        duration: result.duration,
        remainingSec: result.duration
      });

      // Compute and emit updated leaderboard on phase change
      const room = roomManager.getRoom(cleanCode);
      if (room) {
        const leaderboard = computeLeaderboard(room.teams);
        io.to(`room:${cleanCode}`).emit('leaderboard_updated', { leaderboard });
      }

      if (typeof callback === 'function') {
        callback({ success: true, ...result });
      }
    } catch (err) {
      emitError('set_phase', err.message);
      if (typeof callback === 'function') callback({ success: false, error: err.message });
    }
  });

  /**
   * 6. START GAME (Shortcut to GAME1_MEMORIZE)
   */
  socket.on('start_game', async (data = {}, callback) => {
    try {
      const { roomCode, hostToken } = data;
      const cleanCode = (roomCode || '').trim().toUpperCase();

      const result = await roomManager.setSessionPhase(cleanCode, 'GAME1_MEMORIZE', hostToken);

      io.to(`room:${cleanCode}`).emit('game_started', {
        phase: 'GAME1_MEMORIZE',
        duration: result.duration,
        room: result.room
      });

      if (typeof callback === 'function') callback({ success: true, ...result });
    } catch (err) {
      emitError('start_game', err.message);
      if (typeof callback === 'function') callback({ success: false, error: err.message });
    }
  });

  /**
   * 7. SUBMIT GAME 1 (Shuffle & Recall)
   */
  socket.on('submit_game1', async (data = {}, callback) => {
    try {
      const { roomCode, teamNumber, answers, sessionToken } = data;
      const cleanCode = (roomCode || '').trim().toUpperCase();

      const result = await roomManager.submitGame1(cleanCode, teamNumber, answers, sessionToken);

      // Lightweight Delta Score broadcast to room
      io.to(`room:${cleanCode}`).emit('score_updated', {
        teamNumber: parseInt(teamNumber, 10),
        game: 'game1',
        score: result.score,
        totalScore: result.team.scores.total,
        predicate: result.team.predicate
      });

      // Trigger throttled leaderboard broadcast
      triggerThrottledLeaderboard(io, roomManager, cleanCode, 300);

      if (typeof callback === 'function') callback(result);
    } catch (err) {
      emitError('submit_game1', err.message);
      if (typeof callback === 'function') callback({ success: false, error: err.message });
    }
  });

  /**
   * 8. SUBMIT GAME 2 (Word Scramble)
   */
  socket.on('submit_game2_word', async (data = {}, callback) => {
    try {
      const { roomCode, teamNumber, itemId, answer, sessionToken } = data;
      const cleanCode = (roomCode || '').trim().toUpperCase();

      const result = await roomManager.submitGame2Word(cleanCode, teamNumber, itemId, answer, sessionToken);

      // Lightweight Delta Score broadcast to room
      io.to(`room:${cleanCode}`).emit('score_updated', {
        teamNumber: parseInt(teamNumber, 10),
        game: 'game2',
        itemId,
        addedScore: result.addedScore,
        totalScore: result.team.scores.total,
        predicate: result.team.predicate
      });

      // Trigger throttled leaderboard broadcast
      triggerThrottledLeaderboard(io, roomManager, cleanCode, 300);

      if (typeof callback === 'function') callback(result);
    } catch (err) {
      emitError('submit_game2_word', err.message);
      if (typeof callback === 'function') callback({ success: false, error: err.message });
    }
  });

  /**
   * 9. SUBMIT GAME 3 (Heat Calculation)
   */
  socket.on('submit_game3_calc', async (data = {}, callback) => {
    try {
      const { roomCode, teamNumber, itemId, answer, sessionToken } = data;
      const cleanCode = (roomCode || '').trim().toUpperCase();

      const result = await roomManager.submitGame3Calculation(cleanCode, teamNumber, itemId, answer, sessionToken);

      // Lightweight Delta Score broadcast to room
      io.to(`room:${cleanCode}`).emit('score_updated', {
        teamNumber: parseInt(teamNumber, 10),
        game: 'game3',
        itemId,
        addedScore: result.addedScore,
        totalScore: result.team.scores.total,
        predicate: result.team.predicate
      });

      // Trigger throttled leaderboard broadcast
      triggerThrottledLeaderboard(io, roomManager, cleanCode, 300);

      if (typeof callback === 'function') callback(result);
    } catch (err) {
      emitError('submit_game3_calc', err.message);
      if (typeof callback === 'function') callback({ success: false, error: err.message });
    }
  });

  /**
   * 10. GENERIC SUBMIT ANSWER (Router)
   */
  socket.on('submit_answer', async (data = {}, callback) => {
    try {
      const { gameType } = data;
      if (gameType === 'GAME1' || gameType === 'GAME1_PLAY') {
        const res = await roomManager.submitGame1(data.roomCode, data.teamNumber, data.answers || data.answer, data.sessionToken);
        io.to(`room:${(data.roomCode || '').trim().toUpperCase()}`).emit('score_updated', {
          teamNumber: parseInt(data.teamNumber, 10),
          game: 'game1',
          score: res.score,
          totalScore: res.team.scores.total,
          predicate: res.team.predicate
        });
        triggerThrottledLeaderboard(io, roomManager, (data.roomCode || '').trim().toUpperCase(), 300);
        if (typeof callback === 'function') callback(res);
      } else if (gameType === 'GAME2') {
        const res = await roomManager.submitGame2Word(data.roomCode, data.teamNumber, data.itemId, data.answer, data.sessionToken);
        io.to(`room:${(data.roomCode || '').trim().toUpperCase()}`).emit('score_updated', {
          teamNumber: parseInt(data.teamNumber, 10),
          game: 'game2',
          itemId: data.itemId,
          addedScore: res.addedScore,
          totalScore: res.team.scores.total,
          predicate: res.team.predicate
        });
        triggerThrottledLeaderboard(io, roomManager, (data.roomCode || '').trim().toUpperCase(), 300);
        if (typeof callback === 'function') callback(res);
      } else if (gameType === 'GAME3') {
        const res = await roomManager.submitGame3Calculation(data.roomCode, data.teamNumber, data.itemId, data.answer, data.sessionToken);
        io.to(`room:${(data.roomCode || '').trim().toUpperCase()}`).emit('score_updated', {
          teamNumber: parseInt(data.teamNumber, 10),
          game: 'game3',
          itemId: data.itemId,
          addedScore: res.addedScore,
          totalScore: res.team.scores.total,
          predicate: res.team.predicate
        });
        triggerThrottledLeaderboard(io, roomManager, (data.roomCode || '').trim().toUpperCase(), 300);
        if (typeof callback === 'function') callback(res);
      } else {
        throw new Error(`gameType "${gameType}" tidak dikenali.`);
      }
    } catch (err) {
      emitError('submit_answer', err.message);
      if (typeof callback === 'function') callback({ success: false, error: err.message });
    }
  });

  /**
   * 11. REQUEST GAME STATE
   */
  socket.on('request_game_state', (data = {}, callback) => {
    try {
      const roomCode = (data.roomCode || '').trim().toUpperCase();
      const room = roomManager.getRoom(roomCode);
      if (!room) throw new Error('Sesi tidak ditemukan.');

      const sanitized = roomManager.sanitizeRoom(room);
      const remainingSec = timerManager.getRemainingSec(roomCode);
      const timerInfo = timerManager.getTimerInfo(roomCode);
      const leaderboard = computeLeaderboard(room.teams);

      const payload = {
        success: true,
        room: sanitized,
        remainingSec,
        timer: timerInfo,
        serverTime: Date.now(),
        leaderboard
      };

      if (typeof callback === 'function') callback(payload);
      else socket.emit('game_state', payload);
    } catch (err) {
      emitError('request_game_state', err.message);
      if (typeof callback === 'function') callback({ success: false, error: err.message });
    }
  });

  /**
   * 12. SYNC TIMER
   */
  socket.on('sync_timer', (data = {}, callback) => {
    const roomCode = (data.roomCode || '').trim().toUpperCase();
    const room = roomManager.getRoom(roomCode);
    const serverTime = Date.now();
    const remainingSec = timerManager.getRemainingSec(roomCode);
    const timerInfo = timerManager.getTimerInfo(roomCode);

    const payload = {
      serverTime,
      remainingSec,
      phase: room ? room.currentPhase : 'LOBBY',
      startedAt: room ? room.phaseStartedAt : null,
      endsAt: room ? room.phaseEndsAt : null,
      isPaused: timerInfo?.isPaused || false
    };

    if (typeof callback === 'function') callback(payload);
    else socket.emit('sync_timer_ack', payload);
  });

  /**
   * 13. PAUSE TIMER (Host Only)
   */
  socket.on('pause_timer', (data = {}, callback) => {
    try {
      const { roomCode, hostToken } = data;
      const cleanCode = (roomCode || '').trim().toUpperCase();
      const room = roomManager.getRoom(cleanCode);
      if (!room) throw new Error('Sesi tidak ditemukan.');
      if (hostToken && room.hostToken !== hostToken) {
        throw new Error('Hanya Host / Guru yang dapat menjeda timer.');
      }

      const ok = timerManager.pauseTimer(cleanCode);
      if (typeof callback === 'function') callback({ success: ok });
    } catch (err) {
      emitError('pause_timer', err.message);
      if (typeof callback === 'function') callback({ success: false, error: err.message });
    }
  });

  /**
   * 14. RESUME TIMER (Host Only)
   */
  socket.on('resume_timer', (data = {}, callback) => {
    try {
      const { roomCode, hostToken } = data;
      const cleanCode = (roomCode || '').trim().toUpperCase();
      const room = roomManager.getRoom(cleanCode);
      if (!room) throw new Error('Sesi tidak ditemukan.');
      if (hostToken && room.hostToken !== hostToken) {
        throw new Error('Hanya Host / Guru yang dapat melanjutkan timer.');
      }

      const ok = timerManager.resumeTimer(cleanCode);
      if (typeof callback === 'function') callback({ success: ok });
    } catch (err) {
      emitError('resume_timer', err.message);
      if (typeof callback === 'function') callback({ success: false, error: err.message });
    }
  });

  /**
   * 15. HEARTBEAT / PRESENCE
   */
  socket.on('send_heartbeat', (data = {}, callback) => {
    const { roomCode, teamNumber, clientTimestamp } = data;
    const latency = clientTimestamp ? Math.max(0, Date.now() - clientTimestamp) : 0;
    const cleanCode = (roomCode || '').trim().toUpperCase();

    const result = roomManager.recordHeartbeat(cleanCode, teamNumber, latency);
    if (result) {
      socket.to(`room:${cleanCode}`).emit('team_online', result);
    }

    if (typeof callback === 'function') {
      callback({ success: true, serverTime: Date.now(), latency });
    }
  });

  /**
   * 16. RESET ROOM (Host Only)
   */
  socket.on('reset_room', async (data = {}, callback) => {
    try {
      const { roomCode, hostToken } = data;
      const cleanCode = (roomCode || '').trim().toUpperCase();
      const result = await roomManager.resetRoom(cleanCode, hostToken);

      io.to(`room:${cleanCode}`).emit('room_reset', { room: result.room });
      io.to(`room:${cleanCode}`).emit('room_updated', { room: result.room });

      if (typeof callback === 'function') callback({ success: true, ...result });
    } catch (err) {
      emitError('reset_room', err.message);
      if (typeof callback === 'function') callback({ success: false, error: err.message });
    }
  });

  /**
   * 17. DISCONNECT
   */
  socket.on('disconnect', () => {
    roomManager.handleDisconnect(socket.id);
  });
}
