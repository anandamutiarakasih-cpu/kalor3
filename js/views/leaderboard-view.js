/**
 * THERMO CHAMPIONS: HEAT EDITION
 * Final Championship Leaderboard View (Podium, 8 Teams Table & Predicates)
 */

import { firebaseService } from '../services/firebase-service.js';
import { audio } from '../services/audio-service.js';
import { particleService } from '../services/particle-service.js';
import { getPredicate } from '../data/predicates.js';
import { exportSessionToCSV } from '../services/export-service.js';

export function renderLeaderboardView(container, { sessionCode, teamNumber, onHome }) {
  let sessionUnsubscribe = null;
  let currentSession = null;

  container.innerHTML = `
    <div class="tc-view tc-leaderboard-view">
      <!-- Header Banner -->
      <header class="tc-lb-header">
        <div class="tc-badge-lab">
          <span class="tc-pulse-dot"></span>
          KLASEMEN AKHIR KOMPETISI
        </div>
        <h1 class="tc-lb-title">
          THERMO <span class="tc-text-gradient">CHAMPIONS</span>
        </h1>
        <div class="tc-session-tag">SESI: <strong>${sessionCode}</strong></div>
      </header>

      <!-- Olympic Style Podium for Top 3 -->
      <div class="tc-podium-container" id="podium-container">
        <!-- Rendered dynamically -->
      </div>

      <!-- Complete 8 Teams Ranking Table -->
      <div class="tc-card tc-lb-table-card">
        <div class="tc-lb-table-header">
          <h3 class="tc-table-title">Rekapitulasi Nilai 8 Kelompok</h3>
          <button id="btn-lb-export-csv" class="tc-btn tc-btn-sm tc-btn-secondary">
            📥 Unduh Rekap (CSV)
          </button>
        </div>

        <div class="tc-table-responsive">
          <table class="tc-lb-table">
            <thead>
              <tr>
                <th>RANK</th>
                <th>KELOMPOK</th>
                <th>ANGGOTA</th>
                <th>G1 (30)</th>
                <th>G2 (35)</th>
                <th>G3 (35)</th>
                <th>TOTAL (100)</th>
                <th>PREDIKAT</th>
              </tr>
            </thead>
            <tbody id="lb-table-body">
              <!-- Dynamically populated -->
            </tbody>
          </table>
        </div>
      </div>

      <!-- Predicate Reference Legend -->
      <div class="tc-predicate-legend-card">
        <h4 class="tc-legend-title">TINGKAT PREDIKAT KELULUSAN KALOR</h4>
        <div class="tc-legend-grid">
          <div class="tc-legend-item champion">
            <span class="tc-leg-badge">🏆</span>
            <div>
              <strong>Thermo Champion</strong>
              <small>86 – 100 Poin</small>
            </div>
          </div>
          <div class="tc-legend-item expert">
            <span class="tc-leg-badge">⚡</span>
            <div>
              <strong>Thermo Expert</strong>
              <small>76 – 85 Poin</small>
            </div>
          </div>
          <div class="tc-legend-item challenger">
            <span class="tc-leg-badge">🔬</span>
            <div>
              <strong>Science Challenger</strong>
              <small>66 – 75 Poin</small>
            </div>
          </div>
          <div class="tc-legend-item explorer">
            <span class="tc-leg-badge">🧭</span>
            <div>
              <strong>Thermo Explorer</strong>
              <small>56 – 65 Poin</small>
            </div>
          </div>
          <div class="tc-legend-item rookie">
            <span class="tc-leg-badge">🧪</span>
            <div>
              <strong>Temperature Rookie</strong>
              <small>0 – 55 Poin</small>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer Action -->
      <div class="tc-lb-footer">
        <button id="btn-lb-home" class="tc-btn tc-btn-primary tc-btn-large">
          <span>KEMBALI KE BERANDA</span>
          <span>🏠</span>
        </button>
      </div>
    </div>
  `;

  // Audio Fanfare & Particle burst
  audio.playFanfare();
  setTimeout(() => {
    particleService.burst(window.innerWidth / 2, window.innerHeight / 3, 40);
  }, 400);

  const podiumEl = container.querySelector('#podium-container');
  const tableBody = container.querySelector('#lb-table-body');
  const btnExport = container.querySelector('#btn-lb-export-csv');
  const btnHome = container.querySelector('#btn-lb-home');

  btnExport.addEventListener('click', () => {
    audio.playClick();
    if (currentSession) {
      exportSessionToCSV(sessionCode, currentSession);
    }
  });

  btnHome.addEventListener('click', () => {
    audio.playClick();
    cleanup();
    if (onHome) onHome();
  });

  sessionUnsubscribe = firebaseService.listenToSession(sessionCode, (session) => {
    if (!session) return;
    currentSession = session;

    const rawTeams = Object.values(session.teams || {});
    // Filter to claimed/active teams or include all 8 teams
    const teams = rawTeams.filter((t) => t && (t.claimed || (t.scores?.total || 0) > 0));
    
    // Sort descending with deterministic multi-tier tie-breakers:
    // 1. Total score desc
    // 2. Game 3 score desc
    // 3. Game 2 score desc
    // 4. Game 1 score desc
    // 5. Team number asc
    teams.sort((a, b) => {
      const totalA = a.scores?.total || 0;
      const totalB = b.scores?.total || 0;
      if (totalB !== totalA) return totalB - totalA;

      const g3A = a.scores?.game3 || 0;
      const g3B = b.scores?.game3 || 0;
      if (g3B !== g3A) return g3B - g3A;

      const g2A = a.scores?.game2 || 0;
      const g2B = b.scores?.game2 || 0;
      if (g2B !== g2A) return g2B - g2A;

      const g1A = a.scores?.game1 || 0;
      const g1B = b.scores?.game1 || 0;
      if (g1B !== g1A) return g1B - g1A;

      return (a.number || 0) - (b.number || 0);
    });

    // Compute competitive rank (tied teams share same rank, e.g. 1, 1, 3)
    let currentRank = 1;
    teams.forEach((t, idx) => {
      if (idx > 0) {
        const prev = teams[idx - 1];
        const prevTotal = prev.scores?.total || 0;
        const curTotal = t.scores?.total || 0;
        if (curTotal < prevTotal) {
          currentRank = idx + 1;
        }
      }
      t.displayRank = currentRank;
    });

    // Render Podium Top 3 (2nd, 1st, 3rd layout)
    const first = teams[0] || null;
    const second = teams[1] || null;
    const third = teams[2] || null;

    podiumEl.innerHTML = `
      <!-- 2nd Place -->
      <div class="tc-podium-spot second">
        <div class="tc-podium-team">
          <div class="tc-podium-medal">🥈</div>
          <div class="tc-podium-name">${second ? (second.name || `Kelompok ${second.number}`) : 'Kelompok -'}</div>
          <div class="tc-podium-score">${second ? (second.scores?.total || 0) : 0} PTS</div>
        </div>
        <div class="tc-podium-pedestal p2">
          <span>2</span>
        </div>
      </div>

      <!-- 1st Place (Champion) -->
      <div class="tc-podium-spot first">
        <div class="tc-podium-team">
          <div class="tc-podium-crown">👑</div>
          <div class="tc-podium-medal gold">🏆</div>
          <div class="tc-podium-name">${first ? (first.name || `Kelompok ${first.number}`) : 'Kelompok -'}</div>
          <div class="tc-podium-score gold">${first ? (first.scores?.total || 0) : 0} PTS</div>
          <div class="tc-podium-predicate">${first ? (first.predicate || 'Thermo Champion') : '-'}</div>
        </div>
        <div class="tc-podium-pedestal p1">
          <span>1</span>
        </div>
      </div>

      <!-- 3rd Place -->
      <div class="tc-podium-spot third">
        <div class="tc-podium-team">
          <div class="tc-podium-medal">🥉</div>
          <div class="tc-podium-name">${third ? (third.name || `Kelompok ${third.number}`) : 'Kelompok -'}</div>
          <div class="tc-podium-score">${third ? (third.scores?.total || 0) : 0} PTS</div>
        </div>
        <div class="tc-podium-pedestal p3">
          <span>3</span>
        </div>
      </div>
    `;

    // Render Table Body
    if (teams.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 2.5rem 1rem; color: #94a3b8; font-size: 0.95rem;">
            ⏳ Belum ada skor kelompok yang masuk. Data nilai akan muncul secara otomatis saat tersinkronisasi.
          </td>
        </tr>
      `;
    } else {
      tableBody.innerHTML = teams.map((t) => {
        const pred = getPredicate(t.scores?.total || 0);
        const isMyTeam = teamNumber && t.number === parseInt(teamNumber, 10);
        const membersStr = (t.members || []).map((m) => `${m.name} (${m.absen})`).join(', ');
        const rankNum = t.displayRank || 1;
        const rankBadge = rankNum === 1 ? '🥇 1' : rankNum === 2 ? '🥈 2' : rankNum === 3 ? '🥉 3' : `${rankNum}`;

        return `
          <tr class="${isMyTeam ? 'highlight-my-team' : ''}">
            <td class="tc-col-rank">
              <span class="tc-rank-badge ${rankNum <= 3 ? `rank-${rankNum}` : ''}">
                ${rankBadge}
              </span>
            </td>
            <td class="tc-col-name">
              <strong>${t.name || `Kelompok ${t.number}`}</strong>
              <small>Kelompok ${t.number}</small>
            </td>
            <td class="tc-col-members">${membersStr || '-'}</td>
            <td class="tc-col-num">${t.scores?.game1 || 0}</td>
            <td class="tc-col-num">${t.scores?.game2 || 0}</td>
            <td class="tc-col-num">${t.scores?.game3 || 0}</td>
            <td class="tc-col-total">
              <strong>${t.scores?.total || 0}</strong>
            </td>
            <td class="tc-col-pred">
              <span class="tc-pred-pill" style="border-color: ${pred.color}; color: ${pred.color};">
                ${pred.badge} ${pred.title}
              </span>
            </td>
          </tr>
        `;
      }).join('');
    }
  });

  function cleanup() {
    if (sessionUnsubscribe) sessionUnsubscribe();
  }

  return {
    destroy: cleanup
  };
}
