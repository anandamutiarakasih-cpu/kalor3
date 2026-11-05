/**
 * THERMO CHAMPIONS: HEAT EDITION
 * Game 3 - Extreme Addition: Heat Calculation View (Thermal Physics Lab)
 */

import { HEAT_CALCULATION_ITEMS } from '../data/questions-bank.js';
import { SyncTimer } from '../components/timer.js';
import { firebaseService } from '../services/firebase-service.js';
import { audio } from '../services/audio-service.js';
import { toast } from '../components/notification.js';

export function renderGame3View(container, { sessionCode, teamNumber, onGameCompleted, onPhaseChange }) {
  let currentIndex = 0;
  let timerInstance = null;
  let sessionUnsubscribe = null;
  let totalScoreG3 = 0;
  let isSubmitting = false;

  // Realtime Session listener to detect phase change from Admin
  sessionUnsubscribe = firebaseService.listenToSession(sessionCode, (session) => {
    if (!session) return;
    if (session.currentPhase && session.currentPhase !== 'GAME3') {
      cleanup();
      if (onPhaseChange) onPhaseChange(session.currentPhase, session);
    }
  });

  renderProblem();

  function renderProblem() {
    if (currentIndex >= HEAT_CALCULATION_ITEMS.length) {
      renderGame3Finish();
      return;
    }

    const item = HEAT_CALCULATION_ITEMS[currentIndex];
    isSubmitting = false;

    container.innerHTML = `
      <div class="tc-view tc-game3-view">
        <!-- Top HUD -->
        <div class="tc-game-hud">
          <div class="tc-hud-badge">
            <span class="tc-badge-lab">GAME 3 • EXTREME ADDITION: HEAT CALCULATION</span>
            <div class="tc-word-progress">Soal ${currentIndex + 1} dari ${HEAT_CALCULATION_ITEMS.length}</div>
          </div>

          <div class="tc-hud-center">
            <div id="g3-timer-container"></div>
          </div>

          <div class="tc-hud-team">
            <span class="tc-hud-team-tag">KELOMPOK ${teamNumber}</span>
            <div class="tc-g3-score-tag">Skor G3: <strong id="disp-g3-score">${totalScoreG3.toFixed(1)}</strong> / 35</div>
          </div>
        </div>

        <!-- Science Lab Station Main Card -->
        <div class="tc-card tc-lab-station-card" id="lab-station-card">
          <!-- Station Header -->
          <div class="tc-station-header">
            <div class="tc-station-badge-wrap">
              <span class="tc-difficulty-badge ${item.level.toLowerCase()}">LEVEL ${item.level}</span>
              <span class="tc-station-type-tag">${item.type}</span>
            </div>
            <div class="tc-formula-badge">${item.badge}</div>
          </div>

          <!-- Problem Story Prompt -->
          <div class="tc-problem-box">
            <p class="tc-problem-text">${item.story}</p>
          </div>

          <!-- Given Parameters Laboratory Grid -->
          <div class="tc-parameters-grid">
            ${item.given.map((g) => `
              <div class="tc-param-card">
                <span class="tc-param-lbl">${g.label}</span>
                <strong class="tc-param-val">${g.value}</strong>
              </div>
            `).join('')}
          </div>

          <!-- Formula Assistant HUD -->
          <div class="tc-formula-hint-box">
            <span class="tc-hint-icon">📐</span>
            <div class="tc-hint-content">
              <strong>Rumus Petunjuk:</strong>
              <span>${item.formulaHint}</span>
            </div>
          </div>

          <!-- Numeric Input & Unit Interface -->
          <form id="form-heat-calc" class="tc-calc-form">
            <div class="tc-calc-input-row">
              <div class="tc-calc-input-wrap">
                <label for="input-heat-ans">MASUKKAN HASIL PERHITUNGAN NUMERIK:</label>
                <div class="tc-input-with-unit">
                  <input 
                    type="text" 
                    id="input-heat-ans" 
                    class="tc-input tc-input-calc" 
                    placeholder="Contoh: ${item.correctAnswer.toLocaleString('id-ID')}" 
                    autocomplete="off" 
                    required 
                  />
                  <span class="tc-unit-addon">${item.unit}</span>
                </div>
                <small class="tc-input-note">Bisa menggunakan format angka langsung (misal: <code>252000</code>) atau dengan pemisah ribuan (<code>252.000</code>).</small>
              </div>

              <div class="tc-calc-btn-wrap">
                <button type="submit" id="btn-submit-calc" class="tc-btn tc-btn-primary tc-btn-large">
                  <span>VALIDASI & KIRIM</span>
                  <span>⚡</span>
                </button>
              </div>
            </div>
          </form>

          <!-- Explanation Container (Appears after submission) -->
          <div class="tc-explanation-card" id="explanation-container" style="display: none;">
            <div class="tc-exp-header">
              <span class="tc-exp-tag">PEMBAHASAN FISIKA TERMAL</span>
              <span class="tc-exp-result-badge" id="exp-badge">-</span>
            </div>
            <p class="tc-exp-text" id="exp-text"></p>
            <button type="button" id="btn-next-calc" class="tc-btn tc-btn-outline tc-btn-block">
              <span>Lanjut ke Soal Berikutnya →</span>
            </button>
          </div>
        </div>
      </div>
    `;

    // Initialize Timer (120s total or synchronized)
    if (!timerInstance) {
      const timerBox = container.querySelector('#g3-timer-container');
      firebaseService.getSession(sessionCode).then((session) => {
        const startTime = session?.phaseStartTime || Date.now();
        const duration = session?.settings?.game3TotalTime || 120;

        timerInstance = new SyncTimer({
          container: timerBox,
          durationSec: duration,
          startTimeMs: startTime,
          getServerTime: () => firebaseService.getServerTime(),
          onComplete: () => {
            toast.warning('Waktu Game 3 selesai!');
            renderGame3Finish();
          }
        });
      });
    }

    const form = container.querySelector('#form-heat-calc');
    const inputAns = container.querySelector('#input-heat-ans');
    const submitBtn = container.querySelector('#btn-submit-calc');
    const expCard = container.querySelector('#explanation-container');
    const expBadge = container.querySelector('#exp-badge');
    const expText = container.querySelector('#exp-text');
    const btnNext = container.querySelector('#btn-next-calc');
    const stationCard = container.querySelector('#lab-station-card');

    inputAns.focus();

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (isSubmitting) return;

      const rawVal = inputAns.value.trim();
      if (!rawVal) {
        toast.warning('Masukkan angka hasil perhitungan.');
        return;
      }

      isSubmitting = true;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Memvalidasi...';

      const remainingSec = timerInstance ? timerInstance.getRemainingSeconds() : 0;

      try {
        const res = await firebaseService.submitGame3Calculation(
          sessionCode,
          teamNumber,
          item.id,
          rawVal,
          remainingSec
        );

        totalScoreG3 = res.totalGame3Score;
        const dispG3 = container.querySelector('#disp-g3-score');
        if (dispG3) dispG3.textContent = totalScoreG3.toFixed(1);

        // Show Explanation Box
        expCard.style.display = 'block';
        expText.textContent = res.explanation;

        if (res.correct) {
          audio.playCorrect();
          stationCard.classList.add('correct-glow');
          expBadge.className = 'tc-exp-result-badge success';
          expBadge.textContent = `BENAR (+${res.addedScore} pts)`;
          toast.success(`Tepat sekali! +${res.addedScore} poin.`);
        } else {
          audio.playWrong();
          stationCard.classList.add('wrong-shake');
          expBadge.className = 'tc-exp-result-badge danger';
          expBadge.textContent = `SALAH (Kunci: ${item.correctAnswer.toLocaleString('id-ID')} ${item.unit})`;
          toast.error(`Perhitungan belum tepat. Simak langkah di bawah!`);
        }

        // Hide form, show next button
        form.style.display = 'none';

        btnNext.addEventListener('click', () => {
          audio.playClick();
          currentIndex++;
          renderProblem();
        });
      } catch (err) {
        toast.error('Gagal memvalidasi kalkulasi: ' + err.message);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Coba Lagi';
        isSubmitting = false;
      }
    });
  }

  function renderGame3Finish() {
    if (timerInstance) timerInstance.destroy();

    container.innerHTML = `
      <div class="tc-view tc-game3-view">
        <div class="tc-card tc-finish-card">
          <div class="tc-badge-lab">GAME 3 SELESAI</div>
          <div class="tc-finish-trophy">🏆</div>
          <h2 class="tc-finish-title">Seluruh Babak Kompetisi Selesai!</h2>
          <div class="tc-finish-score-box">
            <span>Skor Akhir Game 3:</span>
            <strong>${totalScoreG3.toFixed(1)} / 35 Poin</strong>
          </div>
          <p class="tc-finish-desc">
            Luar biasa! Kelompok ${teamNumber} telah berjuang di seluruh 3 game fisika kalor. 
            Menunggu Guru untuk membuka <strong>Leaderboard & Pengumuman Juara Thermo Champions</strong>...
          </p>
          <div class="tc-radar-spinner"></div>
        </div>
      </div>
    `;

    audio.playFanfare();
    if (onGameCompleted) {
      onGameCompleted({ totalScoreG3 });
    }
  }

  function cleanup() {
    if (timerInstance) timerInstance.destroy();
    if (sessionUnsubscribe) sessionUnsubscribe();
  }

  return {
    destroy: cleanup
  };
}
