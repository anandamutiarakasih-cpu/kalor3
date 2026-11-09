/**
 * THERMO CHAMPIONS: HEAT EDITION
 * Server Authoritative Timer Manager
 */

export class TimerManager {
  constructor(io) {
    this.io = io;
    this.activeTimers = new Map(); // roomCode -> { timerId, phase, startedAt, duration, endsAt }
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
        onTimerEnd(roomCode, phase);
      }
    }, durationSeconds * 1000);

    const timerInfo = {
      timerId,
      phase,
      startedAt,
      duration: durationSeconds,
      endsAt
    };

    this.activeTimers.set(roomCode, timerInfo);

    // Broadcast authoritative timer sync to the room
    this.io.to(`room:${roomCode}`).emit('sync_timer', {
      phase,
      startedAt,
      duration: durationSeconds,
      endsAt,
      serverTime: startedAt
    });

    return timerInfo;
  }

  /**
   * Get remaining seconds for a room phase
   */
  getRemainingSec(roomCode) {
    const timer = this.activeTimers.get(roomCode);
    if (!timer || !timer.endsAt) return 0;
    const diff = timer.endsAt - Date.now();
    return Math.max(0, Math.round((diff / 1000) * 10) / 10);
  }

  /**
   * Check if submission is within authoritative time limit
   */
  isExpired(roomCode) {
    const timer = this.activeTimers.get(roomCode);
    if (!timer || !timer.endsAt) return false;
    // Allow 1.5s grace period for cellular network latency
    return Date.now() > (timer.endsAt + 1500);
  }

  /**
   * Get timer info for late joiners / reconnecting players
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
      serverTime: Date.now()
    };
  }

  cancelTimer(roomCode) {
    if (this.activeTimers.has(roomCode)) {
      const { timerId } = this.activeTimers.get(roomCode);
      clearTimeout(timerId);
      this.activeTimers.delete(roomCode);
    }
  }

  clearAll() {
    for (const [roomCode, { timerId }] of this.activeTimers.entries()) {
      clearTimeout(timerId);
    }
    this.activeTimers.clear();
  }
}
