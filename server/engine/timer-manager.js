/**
 * THERMO CHAMPIONS: HEAT EDITION
 * Server Authoritative Timer Manager
 */

export class TimerManager {
  constructor(io) {
    this.io = io;
    this.activeTimers = new Map(); // roomCode -> Timer Object
  }

  /**
   * Start authoritative timer for a room phase
   */
  startPhaseTimer(roomCode, phase, durationSeconds, onTimerEnd) {
    this.cancelTimer(roomCode);

    if (!durationSeconds || durationSeconds <= 0) {
      return null;
    }

    const startedAt = Date.now();
    const endsAt = startedAt + (durationSeconds * 1000);

    const timerId = setTimeout(() => {
      this.activeTimers.delete(roomCode);
      if (typeof onTimerEnd === 'function') {
        try {
          onTimerEnd(roomCode, phase);
        } catch (e) {
          console.error(`[TimerManager] Error in onTimerEnd for ${roomCode}:`, e);
        }
      }
    }, durationSeconds * 1000);

    const timerInfo = {
      timerId,
      phase,
      startedAt,
      duration: durationSeconds,
      endsAt,
      isPaused: false,
      remainingAtPause: null,
      onTimerEnd
    };

    this.activeTimers.set(roomCode, timerInfo);

    // Broadcast authoritative timer sync to the room
    this.io.to(`room:${roomCode}`).emit('sync_timer', {
      phase,
      startedAt,
      duration: durationSeconds,
      endsAt,
      remainingSec: durationSeconds,
      serverTime: startedAt
    });

    return timerInfo;
  }

  /**
   * Pause timer (Teacher / Host control)
   */
  pauseTimer(roomCode) {
    const timer = this.activeTimers.get(roomCode);
    if (!timer || timer.isPaused) return false;

    clearTimeout(timer.timerId);
    timer.isPaused = true;
    timer.remainingAtPause = Math.max(0, timer.endsAt - Date.now());

    this.io.to(`room:${roomCode}`).emit('timer_paused', {
      phase: timer.phase,
      remainingSec: Math.round((timer.remainingAtPause / 1000) * 10) / 10,
      serverTime: Date.now()
    });

    return true;
  }

  /**
   * Resume paused timer
   */
  resumeTimer(roomCode) {
    const timer = this.activeTimers.get(roomCode);
    if (!timer || !timer.isPaused || !timer.remainingAtPause) return false;

    const startedAt = Date.now();
    const endsAt = startedAt + timer.remainingAtPause;
    const remainingSec = Math.round((timer.remainingAtPause / 1000) * 10) / 10;

    timer.isPaused = false;
    timer.endsAt = endsAt;
    timer.timerId = setTimeout(() => {
      this.activeTimers.delete(roomCode);
      if (typeof timer.onTimerEnd === 'function') {
        try {
          timer.onTimerEnd(roomCode, timer.phase);
        } catch (e) {
          console.error(`[TimerManager] Error in resumed onTimerEnd for ${roomCode}:`, e);
        }
      }
    }, timer.remainingAtPause);

    this.io.to(`room:${roomCode}`).emit('timer_resumed', {
      phase: timer.phase,
      startedAt,
      endsAt,
      remainingSec,
      serverTime: startedAt
    });

    return true;
  }

  /**
   * Get remaining seconds for a room phase
   */
  getRemainingSec(roomCode) {
    const timer = this.activeTimers.get(roomCode);
    if (!timer) return 0;
    if (timer.isPaused && timer.remainingAtPause) {
      return Math.max(0, Math.round((timer.remainingAtPause / 1000) * 10) / 10);
    }
    if (!timer.endsAt) return 0;
    const diff = timer.endsAt - Date.now();
    return Math.max(0, Math.round((diff / 1000) * 10) / 10);
  }

  /**
   * Check if submission is within authoritative time limit
   */
  isExpired(roomCode) {
    const timer = this.activeTimers.get(roomCode);
    if (!timer || !timer.endsAt) return false;
    if (timer.isPaused) return false;
    // Allow 2.0s grace period for mobile cellular network latency
    return Date.now() > (timer.endsAt + 2000);
  }

  /**
   * Get complete timer info for late joiners / reconnecting players
   */
  getTimerInfo(roomCode) {
    const timer = this.activeTimers.get(roomCode);
    if (!timer) return null;
    return {
      phase: timer.phase,
      startedAt: timer.startedAt,
      duration: timer.duration,
      endsAt: timer.endsAt,
      remainingSec: this.getRemainingSec(roomCode),
      isPaused: !!timer.isPaused,
      serverTime: Date.now()
    };
  }

  cancelTimer(roomCode) {
    if (this.activeTimers.has(roomCode)) {
      const { timerId } = this.activeTimers.get(roomCode);
      if (timerId) clearTimeout(timerId);
      this.activeTimers.delete(roomCode);
    }
  }

  clearAll() {
    for (const [roomCode, { timerId }] of this.activeTimers.entries()) {
      if (timerId) clearTimeout(timerId);
    }
    this.activeTimers.clear();
  }
}
