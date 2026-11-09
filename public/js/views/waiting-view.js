/**
 * THERMO CHAMPIONS: HEAT EDITION
 * Synchronized Waiting Lounge View (Kelompok Menunggu Permainan)
 */

import { firebaseService } from '../services/firebase-service.js';
import { audio } from '../services/audio-service.js';

export function renderWaitingView(container, { sessionCode, teamNumber, onPhaseChange }) {
  let unsubscribe = null;

  container.innerHTML = `
    <div class="tc-view tc-waiting-view">
      <!-- Top Status Banner -->
      <header class="tc-waiting-header">
        <div class="tc-badge-lab">
          <span class="tc-pulse-dot"></span>
          LOBI TERMAL • SINKRONISASI AKTIF
        </div>
        <h2 class="tc-waiting-title">Ruang Persiapan Kelompok</h2>
        <div class="tc-session-tag">KODE SESI: <strong>${sessionCode}</strong></div>
      </header>

      <!-- Active Team Profile Box -->
      <div class="tc-card tc-my-team-card" id="my-team-box">
        <div class="tc-team-avatar">⚡</div>
        <div class="tc-my-team-info">
          <div class="tc-my-team-number">KELOMPOK ${teamNumber}</div>
          <h3 class="tc-my-team-name" id="my-team-name-display">Memuat nama...</h3>
          <div class="tc-my-team-members" id="my-team-members-display"></div>
        </div>
        <div class="tc-team-status-badge ready">SIAP BERTANDING</div>
      </div>

      <!-- Sync Status Notice -->
      <div class="tc-sync-notice">
        <div class="tc-radar-spinner"></div>
        <div class="tc-sync-text">
          <strong>Menunggu Instruksi Guru / Admin...</strong>
          <span>Tetap berada di halaman ini. Layar akan beralih secara otomatis saat permainan dimulai!</span>
        </div>
      </div>

      <!-- 8 Teams Grid Status -->
      <div class="tc-all-teams-section">
        <h4 class="tc-section-title">STATUS 8 KELOMPOK DALAM SESI</h4>
        <div class="tc-lobby-grid" id="lobby-teams-grid">
          ${[1, 2, 3, 4, 5, 6, 7, 8].map((n) => `
            <div class="tc-lobby-team-card" id="lobby-team-${n}">
              <div class="tc-lobby-team-num">${n}</div>
              <div class="tc-lobby-team-details">
                <div class="tc-lobby-team-name">Kelompok ${n}</div>
                <div class="tc-lobby-team-status">Menunggu...</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  // Start Realtime Session Listener
  unsubscribe = firebaseService.listenToSession(sessionCode, (session) => {
    if (!session) return;

    // Check Phase Change
    if (session.currentPhase && session.currentPhase !== 'LOBBY') {
      audio.playPhaseTransition();
      if (unsubscribe) unsubscribe();
      if (onPhaseChange) {
        onPhaseChange(session.currentPhase, session);
      }
      return;
    }

    // Update My Team Profile
    const myTeam = session.teams ? session.teams[`team_${teamNumber}`] : null;
    if (myTeam) {
      const nameEl = container.querySelector('#my-team-name-display');
      const membersEl = container.querySelector('#my-team-members-display');
      if (nameEl) nameEl.textContent = myTeam.name || `Kelompok ${teamNumber}`;
      if (membersEl) {
        const listStr = (myTeam.members || [])
          .map((m) => `${m.name} (${m.absen})`)
          .join(' • ');
        membersEl.textContent = listStr || 'Belum ada anggota terdaftar';
      }
    }

    // Update 8 Teams Grid
    const teams = session.teams || {};
    const now = firebaseService.getServerTime();

    for (let i = 1; i <= 8; i++) {
      const card = container.querySelector(`#lobby-team-${i}`);
      if (!card) continue;
      const t = teams[`team_${i}`];

      if (t && t.claimed) {
        card.classList.add('joined');
        card.querySelector('.tc-lobby-team-name').textContent = t.name || `Kelompok ${i}`;

        const lastSeen = t.heartbeat?.lastSeen || t.joinedAt || 0;
        const diffSec = Math.max(0, Math.floor((now - lastSeen) / 1000));
        let statusBadge = `<span class="tc-dot-green"></span> Siap (${(t.members || []).length} siswa)`;
        if (diffSec > 60) {
          statusBadge = `<span class="tc-dot-yellow"></span> Menghubungkan ulang...`;
        }

        card.querySelector('.tc-lobby-team-status').innerHTML = statusBadge;
      } else {
        card.classList.remove('joined');
        card.querySelector('.tc-lobby-team-name').textContent = `Kelompok ${i}`;
        card.querySelector('.tc-lobby-team-status').textContent = 'Belum Bergabung';
      }
    }
  });

  return {
    destroy: () => {
      if (unsubscribe) unsubscribe();
    }
  };
}
