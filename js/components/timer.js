/**
 * THERMO CHAMPIONS: HEAT EDITION
 * Synchronized Circular Countdown Timer Component
 */

import { audio } from '../services/audio-service.js';

export class SyncTimer {
  /**
   * @param {Object} options
   * @param {HTMLElement} options.container
   * @param {number} options.durationSec - Total duration in seconds
   * @param {number} options.startTimeMs - Server start timestamp (ms)
   * @param {Function} options.getServerTime - Function returning current server time (ms)
   * @param {Function} options.onComplete - Callback when timer reaches 0
   * @param {Function} [options.onTick] - Optional tick callback
   */
  constructor({ container, durationSec, startTimeMs, getServerTime, onComplete, onTick }) {
    this.container = container;
    this.durationSec = durationSec;
    this.startTimeMs = startTimeMs || Date.now();
    this.getServerTime = getServerTime || (() => Date.now());
    this.onComplete = onComplete;
    this.onTick = onTick;
    this.timerId = null;
    this.lastSec = null;
    this.hasWarnedUrgent = false;

    this.render();
    this.start();
  }

  render() {
    this.container.innerHTML = `
      <div class="tc-timer-wrap">
        <svg class="tc-timer-svg" viewBox="0 0 100 100">
          <circle class="tc-timer-bg" cx="50" cy="50" r="42"></circle>
          <circle class="tc-timer-bar" cx="50" cy="50" r="42"></circle>
        </svg>
        <div class="tc-timer-content">
          <span class="tc-timer-sec">--</span>
          <span class="tc-timer-label">DETIK</span>
        </div>
      </div>
    `;

    this.barEl = this.container.querySelector('.tc-timer-bar');
    this.secEl = this.container.querySelector('.tc-timer-sec');
    this.wrapEl = this.container.querySelector('.tc-timer-wrap');

    // Circumference = 2 * PI * 42 ~= 263.89
    this.circumference = 2 * Math.PI * 42;
    this.barEl.style.strokeDasharray = `${this.circumference}`;
    this.barEl.style.strokeDashoffset = '0';
  }

  setContainer(newContainer) {
    if (!newContainer) return;
    this.container = newContainer;
    this.render();
    this.update();
  }

  start() {
    this.update();
    this.timerId = setInterval(() => this.update(), 100);
  }

  update() {
    const now = this.getServerTime();
    const elapsedSec = (now - this.startTimeMs) / 1000;
    const remainingSec = Math.max(0, this.durationSec - elapsedSec);
    const wholeSec = Math.ceil(remainingSec);

    // Audio & tick triggers
    if (this.lastSec !== wholeSec) {
      this.lastSec = wholeSec;
      if (wholeSec <= 5 && wholeSec > 0) {
        audio.playTickUrgent();
        this.wrapEl.classList.add('urgent');
      } else if (wholeSec > 5 && wholeSec % 5 === 0) {
        audio.playCountdownTick();
      }
      if (this.onTick) this.onTick(wholeSec, remainingSec);
    }

    // Update SVG stroke
    const fraction = remainingSec / this.durationSec;
    const offset = this.circumference * (1 - fraction);
    this.barEl.style.strokeDashoffset = `${offset}`;

    // Update text
    this.secEl.textContent = wholeSec;

    // Timeout
    if (remainingSec <= 0) {
      this.stop();
      if (this.onComplete) {
        this.onComplete();
      }
    }
  }

  getRemainingSeconds() {
    const now = this.getServerTime();
    const elapsedSec = (now - this.startTimeMs) / 1000;
    return Math.max(0, this.durationSec - elapsedSec);
  }

  stop() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  destroy() {
    this.stop();
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}
