/**
 * THERMO CHAMPIONS: HEAT EDITION
 * Network Monitor & Connection Reliability Engine
 * Real-time Latency (Ping) Measurement, Lag Detection, Offline Alerts & Heartbeat
 */

import { toast } from '../components/notification.js';
import { audio } from './audio-service.js';

class NetworkMonitorService {
  constructor() {
    this.isOnline = navigator.onLine;
    this.currentPing = 0;
    this.status = 'ONLINE'; // 'ONLINE' | 'LAG' | 'OFFLINE'
    this.consecutiveLagCount = 0;
    this.monitorInterval = null;
    this.sessionCode = null;
    this.teamNumber = null;
    this.getFirebaseService = null;
    this.listeners = new Set();
    this.alertBannerEl = null;
    this.hudPillEl = null;
    this.hasNotifiedLag = false;

    this.initEventListeners();
  }

  init(getFirebaseServiceFn) {
    this.getFirebaseService = getFirebaseServiceFn;
    this.ensureUI();
    this.startPeriodicPing();
  }

  initEventListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.checkLatency(true);
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.setStatus('OFFLINE');
    });

    // Re-check instantly when tab regains focus or visibility
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.checkLatency(true);
      }
    });

    window.addEventListener('focus', () => {
      this.checkLatency(true);
    });
  }

  ensureUI() {
    // 1. Persistent Top Warning Banner (Hidden by default)
    if (!this.alertBannerEl && typeof document !== 'undefined') {
      let banner = document.getElementById('tc-net-alert-banner');
      if (!banner) {
        banner = document.createElement('div');
        banner.id = 'tc-net-alert-banner';
        banner.className = 'tc-net-alert-banner hide';
        document.body.prepend(banner);
      }
      this.alertBannerEl = banner;
    }

    // 2. Floating Top-Right Sci-Fi Connection Pill
    if (!this.hudPillEl && typeof document !== 'undefined') {
      let hud = document.getElementById('tc-floating-hud');
      if (!hud) {
        hud = document.createElement('div');
        hud.id = 'tc-floating-hud';
        hud.className = 'tc-floating-hud';
        hud.innerHTML = `
          <button type="button" class="tc-floating-btn" id="hud-audio-btn" title="Toggle Musik & Efek Suara">
            <span id="hud-audio-icon">🔊</span>
          </button>
          <div class="tc-net-pill online" id="hud-net-pill" title="Status Jaringan Realtime (Ketuk untuk detail)">
            <span class="tc-net-dot"></span>
            <span class="tc-net-ping" id="hud-ping-val">-- ms</span>
          </div>
        `;
        document.body.appendChild(hud);

        // Audio toggle click
        const audioBtn = hud.querySelector('#hud-audio-btn');
        audioBtn.addEventListener('click', () => {
          const isMuted = audio.toggleMute();
          const icon = hud.querySelector('#hud-audio-icon');
          icon.textContent = isMuted ? '🔇' : '🔊';
          audioBtn.classList.toggle('muted', isMuted);
          toast.info(isMuted ? 'Audio dinonaktifkan (Mute).' : 'Audio diaktifkan.');
        });

        // Pill click for diagnostics
        const pill = hud.querySelector('#hud-net-pill');
        pill.addEventListener('click', () => {
          const pingStr = this.currentPing > 0 ? `${this.currentPing} ms` : 'Mengukur...';
          const statStr = this.status === 'OFFLINE' ? '🔴 Terputus' : (this.status === 'LAG' ? '🟡 Lag / Lambat' : '🟢 Sangat Baik (Stabil)');
          toast.info(`📶 Jaringan: ${statStr} | Ping: ${pingStr}`);
        });
      }
      this.hudPillEl = hud;
    }
  }

  setSessionContext(sessionCode, teamNumber) {
    this.sessionCode = sessionCode;
    this.teamNumber = teamNumber;
  }

  startPeriodicPing() {
    if (this.monitorInterval) clearInterval(this.monitorInterval);
    // Ping every 3.5 seconds
    this.monitorInterval = setInterval(() => {
      this.checkLatency();
    }, 3500);

    // Initial check
    setTimeout(() => this.checkLatency(), 600);
  }

  async checkLatency(immediate = false) {
    if (!navigator.onLine) {
      this.setStatus('OFFLINE');
      return;
    }

    const t0 = performance.now();
    let success = false;
    let rtt = 0;

    try {
      // Fast lightweight ping
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2800);

      // Attempt to ping ntfy.sh or public timestamp
      const res = await fetch(`https://ntfy.sh/tc_kalor_ping/json?poll=1&limit=0`, {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      rtt = Math.round(performance.now() - t0);
      success = res.ok || res.status === 404; // 404 from empty topic is still a valid fast response
    } catch (e) {
      // Fallback local calculation
      rtt = Math.round(performance.now() - t0);
      success = false;
    }

    if (!success && rtt >= 2800) {
      this.consecutiveLagCount++;
    } else {
      this.consecutiveLagCount = 0;
      this.currentPing = rtt;
    }

    // Determine status
    if (this.consecutiveLagCount >= 2) {
      this.setStatus('LAG', rtt);
    } else if (rtt >= 1600) {
      this.setStatus('LAG', rtt);
    } else {
      this.setStatus('ONLINE', rtt);
    }

    // Send Heartbeat to Firebase for this team if registered
    if (this.sessionCode && this.teamNumber && this.getFirebaseService) {
      try {
        const fb = this.getFirebaseService();
        if (fb && typeof fb.sendHeartbeat === 'function') {
          fb.sendHeartbeat(this.sessionCode, this.teamNumber, this.currentPing);
        }
      } catch (err) {}
    }
  }

  setStatus(newStatus, ping = 0) {
    const prevStatus = this.status;
    this.status = newStatus;

    this.updateUI(newStatus, ping);

    if (prevStatus !== newStatus) {
      // Trigger notifications on status transition
      if (newStatus === 'OFFLINE') {
        this.showBanner('🔴 KONEKSI INTERNET TERPUTUS! Periksa WiFi atau data seluler. Data permainan tetap aman.');
        toast.error('Koneksi terputus! Sedang menghubungkan kembali...');
        this.hasNotifiedLag = false;
      } else if (newStatus === 'LAG') {
        if (!this.hasNotifiedLag) {
          toast.warning(`⚠️ Jaringan lambat terdeteksi (Ping: ${ping} ms). Sedang menstabilkan data permainan...`);
          this.hasNotifiedLag = true;
        }
        this.showBanner(`⚠️ JARINGAN LAG (${ping} ms) — Respons mungkin sedikit melambat, permainan tetap berlanjut.`);
      } else if (newStatus === 'ONLINE') {
        this.hideBanner();
        if (prevStatus === 'OFFLINE' || prevStatus === 'LAG') {
          toast.success(`🟢 Koneksi kembali stabil (Ping: ${ping} ms)!`);
        }
        this.hasNotifiedLag = false;
      }

      // Notify listeners
      this.listeners.forEach((cb) => cb(newStatus, ping));
    }
  }

  updateUI(status, ping) {
    if (!this.hudPillEl) return;
    const pill = this.hudPillEl.querySelector('#hud-net-pill');
    const pingEl = this.hudPillEl.querySelector('#hud-ping-val');

    if (pill && pingEl) {
      pill.className = `tc-net-pill ${status.toLowerCase()}`;
      if (status === 'OFFLINE') {
        pingEl.textContent = 'OFFLINE';
      } else {
        pingEl.textContent = `${ping || this.currentPing}ms`;
      }
    }
  }

  showBanner(msg) {
    if (!this.alertBannerEl) return;
    this.alertBannerEl.innerHTML = `<span>${msg}</span>`;
    this.alertBannerEl.classList.remove('hide');
    this.alertBannerEl.classList.add('show');
  }

  hideBanner() {
    if (!this.alertBannerEl) return;
    this.alertBannerEl.classList.remove('show');
    this.alertBannerEl.classList.add('hide');
  }

  onStatusChange(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  destroy() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
  }
}

export const networkMonitor = new NetworkMonitorService();
