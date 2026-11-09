/**
 * THERMO CHAMPIONS: HEAT EDITION
 * Real-Time Sync Status Bar & Network Diagnostics Banner
 * Provides instant visual feedback on internet connection, latency, and teacher commands
 */

import { firebaseService } from '../services/firebase-service.js';
import { audio } from '../services/audio-service.js';

export function initSyncStatusBar(parentContainer) {
  let statusBarEl = document.getElementById('tc-global-sync-bar');
  if (!statusBarEl) {
    statusBarEl = document.createElement('div');
    statusBarEl.id = 'tc-global-sync-bar';
    statusBarEl.className = 'tc-sync-bar-wrapper';
    statusBarEl.innerHTML = `
      <div class="tc-sync-pill online" id="tc-sync-pill" title="Status koneksi ke guru">
        <span class="tc-sync-dot"></span>
        <span class="tc-sync-text" id="tc-sync-pill-text">Sinyal Stabil</span>
      </div>
      <div class="tc-offline-warning-banner" id="tc-offline-banner" style="display: none;">
        <span class="tc-warn-icon">⚠️</span>
        <span class="tc-warn-text">Koneksi internet lambat / terputus. Data mungkin belum tersinkronisasi.</span>
        <button type="button" class="tc-btn-reconnect" id="tc-btn-reconnect">
          🔄 Hubungkan Ulang
        </button>
      </div>
    `;
    document.body.appendChild(statusBarEl);
  }

  const pill = statusBarEl.querySelector('#tc-sync-pill');
  const pillText = statusBarEl.querySelector('#tc-sync-pill-text');
  const banner = statusBarEl.querySelector('#tc-offline-banner');
  const btnReconnect = statusBarEl.querySelector('#tc-btn-reconnect');

  if (btnReconnect) {
    btnReconnect.addEventListener('click', async () => {
      audio.playClick();
      pill.className = 'tc-sync-pill checking';
      pillText.textContent = 'Menghubungkan...';
      btnReconnect.disabled = true;
      btnReconnect.textContent = 'Memeriksa...';

      const saved = firebaseService.getStoredTeamSession();
      const code = saved?.sessionCode;
      if (code) {
        try {
          await firebaseService.getSession(code);
        } catch (e) {}
      }

      setTimeout(() => {
        btnReconnect.disabled = false;
        btnReconnect.textContent = '🔄 Hubungkan Ulang';
      }, 1000);
    });
  }

  // Subscribe to connection health
  firebaseService.onConnectionChange((state) => {
    if (!pill || !pillText || !banner) return;

    if (!state.online || state.consecutiveFailures >= 2) {
      pill.className = 'tc-sync-pill offline';
      pillText.textContent = 'Offline / Terputus';
      banner.style.display = 'flex';
    } else if (state.latencyMs > 2000) {
      pill.className = 'tc-sync-pill slow';
      pillText.textContent = `Sinyal Lemah (${Math.round(state.latencyMs / 1000)}s)`;
      banner.style.display = 'flex';
    } else {
      pill.className = 'tc-sync-pill online';
      const latStr = state.latencyMs > 0 ? ` (${state.latencyMs}ms)` : '';
      pillText.textContent = `Sinyal Stabil${latStr}`;
      banner.style.display = 'none';
    }
  });

  return {
    showTransitionNotice: (phaseName) => {
      let noticeEl = document.getElementById('tc-phase-transition-overlay');
      if (!noticeEl) {
        noticeEl = document.createElement('div');
        noticeEl.id = 'tc-phase-transition-overlay';
        noticeEl.className = 'tc-phase-splash-overlay';
        document.body.appendChild(noticeEl);
      }

      let label = 'Memuat permainan...';
      let icon = '⚡';
      if (phaseName === 'GAME1_MEMORIZE') {
        label = 'Fase 1A: Hafalan Dimulai! (35 Detik)';
        icon = '🔥';
      } else if (phaseName === 'GAME1_PLAY') {
        label = 'Fase 1B: Susun & Cocokkan! (75 Detik)';
        icon = '🎯';
      } else if (phaseName === 'GAME2') {
        label = 'Game 2: Word Scramble Dimulai!';
        icon = '🧩';
      } else if (phaseName === 'GAME3') {
        label = 'Game 3: Extreme Addition Dimulai!';
        icon = '🔬';
      } else if (phaseName === 'FINISHED') {
        label = 'Sesi Selesai! Membuka Papan Juara...';
        icon = '🏆';
      } else if (phaseName === 'LOBBY') {
        label = 'Kembali ke Ruang Lobi Persiapan...';
        icon = '🏠';
      }

      noticeEl.innerHTML = `
        <div class="tc-splash-card">
          <div class="tc-splash-icon">${icon}</div>
          <div class="tc-splash-badge">INSTRUKSI GURU DITERIMA</div>
          <h2 class="tc-splash-title">${label}</h2>
          <div class="tc-splash-loader"><span class="tc-radar-spinner"></span> Mempersiapkan layar...</div>
        </div>
      `;
      noticeEl.style.display = 'flex';
      noticeEl.classList.remove('fade-out');

      setTimeout(() => {
        noticeEl.classList.add('fade-out');
        setTimeout(() => {
          noticeEl.style.display = 'none';
        }, 300);
      }, 700);
    }
  };
}
