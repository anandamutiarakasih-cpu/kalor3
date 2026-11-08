/**
 * THERMO CHAMPIONS: HEAT EDITION
 * Web Audio API Procedural Sound Synthesizer
 */

class AudioService {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem('tc_audio_muted') === 'true';
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  isMuted() {
    return this.muted;
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem('tc_audio_muted', this.muted);
    return this.muted;
  }

  playTone(freq, type = 'sine', duration = 0.15, gainVal = 0.2, decay = 0.1) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(gainVal, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration + decay);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + duration + decay);
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  playClick() {
    this.playTone(800, 'triangle', 0.04, 0.15, 0.02);
  }

  playCardFlip() {
    this.playTone(480, 'sine', 0.06, 0.12, 0.04);
  }

  playCountdownTick() {
    this.playTone(660, 'sine', 0.05, 0.1, 0.03);
  }

  playTickUrgent() {
    this.playTone(950, 'sawtooth', 0.08, 0.18, 0.05);
  }

  playCorrect() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    // Harmonic chord: C5 (523Hz), E5 (659Hz), G5 (784Hz), C6 (1046Hz)
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, 'sine', 0.18, 0.15, 0.1);
      }, idx * 65);
    });
  }

  playWrong() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    this.playTone(220, 'sawtooth', 0.15, 0.2, 0.1);
    setTimeout(() => {
      this.playTone(180, 'sawtooth', 0.25, 0.25, 0.15);
    }, 120);
  }

  playShuffle() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    for (let i = 0; i < 6; i++) {
      setTimeout(() => {
        const freq = 320 + Math.random() * 200;
        this.playTone(freq, 'sine', 0.04, 0.1, 0.02);
      }, i * 65);
    }
  }

  playPhaseTransition() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const notes = [330, 440, 554, 659, 880];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, 'triangle', 0.12, 0.12, 0.08);
      }, idx * 75);
    });
  }

  playFanfare() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    // Victory fanfare notes: C5, C5, C5, G4, A4, B4, C5
    const fanfare = [
      { f: 523, d: 100 },
      { f: 523, d: 100 },
      { f: 523, d: 100 },
      { f: 392, d: 180 },
      { f: 440, d: 180 },
      { f: 493, d: 180 },
      { f: 523, d: 450 }
    ];

    let delay = 0;
    fanfare.forEach((n) => {
      setTimeout(() => {
        this.playTone(n.f, 'triangle', n.d / 1000, 0.2, 0.1);
      }, delay);
      delay += n.d + 60;
    });
  }
}

export const audio = new AudioService();
