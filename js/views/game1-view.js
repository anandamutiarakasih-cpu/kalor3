/**
 * THERMO CHAMPIONS: HEAT EDITION
 * Game 1 - Shuffle and Recall View (Memorize -> Recall & Match)
 */

import { SHUFFLE_MEMORIZE_CARDS, SHUFFLE_CHALLENGES } from '../data/questions-bank.js';
import { SyncTimer } from '../components/timer.js';
import { firebaseService } from '../services/firebase-service.js';
import { audio } from '../services/audio-service.js';
import { toast } from '../components/notification.js';

export function renderGame1View(container, { sessionCode, teamNumber, isMemorizePhase, onGameCompleted, onPhaseChange }) {
  let timerInstance = null;
  let sessionUnsubscribe = null;
  let userAnswers = {};
  let isSubmitted = false;

  if (isMemorizePhase) {
    renderMemorizeMode();
  } else {
    renderPlayMode();
  }

  // Realtime Session listener to detect phase change from Admin
  sessionUnsubscribe = firebaseService.listenToSession(sessionCode, (session) => {
    if (!session) return;
    if (session.currentPhase && session.currentPhase !== (isMemorizePhase ? 'GAME1_MEMORIZE' : 'GAME1_PLAY')) {
      cleanup();
      if (onPhaseChange) onPhaseChange(session.currentPhase, session);
    }
  });

  // ==========================================
  // FASE 1: MEMORIZE (MENGHAFAL KARTU MATERI)
  // ==========================================
  function renderMemorizeMode() {
    container.innerHTML = `
      <div class="tc-view tc-game1-view tc-g1-memorize">
        <!-- Top HUD -->
        <div class="tc-game-hud">
          <div class="tc-hud-badge">
            <span class="tc-badge-lab">GAME 1 • BABAK 1 DARI 3</span>
            <h2 class="tc-hud-title">SHUFFLE AND RECALL: FASE HAFALAN</h2>
          </div>

          <div class="tc-hud-center">
            <div id="g1-mem-timer-container"></div>
          </div>

          <div class="tc-hud-team">
            <span class="tc-hud-team-tag">KELOMPOK ${teamNumber}</span>
            <span class="tc-hud-score-tag">TARGET: 30 PTS</span>
          </div>
        </div>

        <div class="tc-banner-instruction">
          <span class="tc-fire-icon">🔥</span>
          <span>Amati dan hafalkan konsep, rumus, dan contoh perpindahan kalor di bawah ini sebelum waktu habis!</span>
        </div>

        <!-- 10 Memorize Cards Grid -->
        <div class="tc-memorize-grid">
          ${SHUFFLE_MEMORIZE_CARDS.map((card, idx) => `
            <div class="tc-mem-card" style="animation-delay: ${idx * 0.05}s">
              <div class="tc-mem-card-top">
                <span class="tc-mem-cat">${card.category}</span>
                <span class="tc-mem-icon">${card.icon}</span>
              </div>
              <h3 class="tc-mem-term">${card.term}</h3>
              <div class="tc-mem-tag">${card.tag}</div>
              <p class="tc-mem-def">${card.definition}</p>
              <div class="tc-mem-example">
                <strong>Contoh / Rumus:</strong>
                <span>${card.example}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    // Start 35s Synchronized Timer
    const timerBox = container.querySelector('#g1-mem-timer-container');
    firebaseService.getSession(sessionCode).then((session) => {
      const startTime = session?.phaseStartTime || Date.now();
      const duration = session?.settings?.game1MemorizeTime || 35;

      timerInstance = new SyncTimer({
        container: timerBox,
        durationSec: duration,
        startTimeMs: startTime,
        getServerTime: () => firebaseService.getServerTime(),
        onComplete: () => {
          toast.warning('Waktu menghafal selesai! Bersiap menyusun informasi...');
          audio.playPhaseTransition();
          setTimeout(() => {
            renderPlayMode();
          }, 800);
        }
      });
    });
  }

  // ==========================================
  // FASE 2: PLAY / RECALL & SHUFFLE
  // ==========================================
  function renderPlayMode() {
    if (timerInstance) timerInstance.destroy();
    userAnswers = {};
    isSubmitted = false;

    // Shuffle questions order for fairness
    const shuffledChallenges = [...SHUFFLE_CHALLENGES].sort(() => Math.random() - 0.5);

    container.innerHTML = `
      <div class="tc-view tc-game1-view tc-g1-play">
        <!-- Top HUD -->
        <div class="tc-game-hud">
          <div class="tc-hud-badge">
            <span class="tc-badge-lab">GAME 1 • FASE MENYUSUN</span>
            <h2 class="tc-hud-title">SHUFFLE & RECALL: UJI DAYA INGAT</h2>
          </div>

          <div class="tc-hud-center">
            <div id="g1-play-timer-container"></div>
          </div>

          <div class="tc-hud-team">
            <span class="tc-hud-team-tag">KELOMPOK ${teamNumber}</span>
            <div class="tc-progress-counter" id="g1-progress-counter">0 / 10 Terjawab</div>
          </div>
        </div>

        <div class="tc-banner-instruction pulse">
          <span>🧠</span>
          <span>Cocokkan setiap istilah, fenomena, atau rumus kalor dengan pasangan yang tepat!</span>
        </div>

        <!-- Challenges Interactive List -->
        <div class="tc-challenges-list" id="g1-challenges-container">
          ${shuffledChallenges.map((item, index) => {
            // Shuffle options for this item
            const opts = [...item.options].sort(() => Math.random() - 0.5);
            return `
              <div class="tc-card tc-challenge-card" data-id="${item.id}">
                <div class="tc-ch-header">
                  <span class="tc-ch-num">TANTANGAN ${index + 1}</span>
                  <span class="tc-ch-cat">${item.category}</span>
                </div>
                
                <p class="tc-ch-prompt">${item.prompt}</p>
                <div class="tc-ch-target-box">
                  <span class="tc-target-icon">🎯</span>
                  <strong class="tc-ch-target-text">${item.leftItem}</strong>
                </div>

                <div class="tc-ch-options-grid">
                  ${opts.map((opt) => `
                    <button type="button" class="tc-opt-btn" data-val="${opt.replace(/"/g, '&quot;')}">
                      <span class="tc-opt-indicator"></span>
                      <span class="tc-opt-text">${opt}</span>
                    </button>
                  `).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Sticky Submit Bar -->
        <div class="tc-sticky-submit-bar">
          <div class="tc-submit-info">
            <span id="g1-unanswered-notice">Pastikan seluruh 10 tantangan sudah dipilih!</span>
          </div>
          <button type="button" id="btn-submit-g1" class="tc-btn tc-btn-primary tc-btn-large">
            <span>KIRIM JAWABAN GAME 1</span>
            <span>⚡</span>
          </button>
        </div>
      </div>
    `;

    const challengesContainer = container.querySelector('#g1-challenges-container');
    const counterEl = container.querySelector('#g1-progress-counter');
    const submitBtn = container.querySelector('#btn-submit-g1');

    // Option Selection Handler
    challengesContainer.addEventListener('click', (e) => {
      if (isSubmitted) return;
      const optBtn = e.target.closest('.tc-opt-btn');
      if (!optBtn) return;
      audio.playClick();

      const card = optBtn.closest('.tc-challenge-card');
      const qId = card.dataset.id;
      const textSpan = optBtn.querySelector('.tc-opt-text');
      const val = textSpan ? textSpan.textContent.trim() : (optBtn.dataset.val || '');

      // Deselect siblings
      card.querySelectorAll('.tc-opt-btn').forEach((b) => b.classList.remove('selected'));
      optBtn.classList.add('selected');

      userAnswers[qId] = val;

      // Update counter
      const answeredCount = Object.keys(userAnswers).length;
      counterEl.textContent = `${answeredCount} / 10 Terjawab`;
      if (answeredCount === 10) {
        counterEl.classList.add('complete');
      }
    });

    // Start 75s Synchronized Timer
    const timerBox = container.querySelector('#g1-play-timer-container');
    firebaseService.getSession(sessionCode).then((session) => {
      const startTime = session?.phaseStartTime || Date.now();
      const duration = session?.settings?.game1PlayTime || 75;

      timerInstance = new SyncTimer({
        container: timerBox,
        durationSec: duration,
        startTimeMs: startTime,
        getServerTime: () => firebaseService.getServerTime(),
        onComplete: () => {
          if (!isSubmitted) {
            toast.warning('Waktu Game 1 habis! Mengirimkan jawaban secara otomatis...');
            doSubmit();
          }
        }
      });
    });

    // Submit Button
    submitBtn.addEventListener('click', () => {
      if (isSubmitted) return;
      audio.playClick();
      const count = Object.keys(userAnswers).length;
      if (count < 10) {
        if (!confirm(`Kamu baru menjawab ${count} dari 10 soal. Yakin ingin mengirim sekarang?`)) {
          return;
        }
      }
      doSubmit();
    });

    async function doSubmit() {
      if (isSubmitted) return;
      isSubmitted = true;
      if (timerInstance) timerInstance.stop();

      submitBtn.disabled = true;
      submitBtn.textContent = 'Memvalidasi jawaban...';

      try {
        const res = await firebaseService.submitGame1(sessionCode, teamNumber, userAnswers);
        if (res.isPerfect) {
          audio.playFanfare();
          toast.success(`SEMPURNA! 10/10 Benar! Bonus +5 pts (Total: ${res.score} pts)`);
        } else if (res.score > 0) {
          audio.playCorrect();
          toast.success(`Jawaban Game 1 terkirim! Skor: ${res.score} pts (${res.correctCount}/10 Benar)`);
        } else {
          audio.playWrong();
          toast.warning(`Jawaban Game 1 selesai diperiksa.`);
        }

        // Show Result Banner
        container.querySelector('.tc-sticky-submit-bar').innerHTML = `
          <div class="tc-g1-finished-box">
            <span class="tc-fin-badge">GAME 1 SELESAI</span>
            <h3>Skor Kamu: <strong>${res.score} / 30 Poin</strong></h3>
            <p>Menunggu instruksi Guru untuk melanjutkan ke <strong>Game 2: Word Scramble</strong>...</p>
          </div>
        `;

        if (onGameCompleted) {
          onGameCompleted(res);
        }
      } catch (err) {
        toast.error('Gagal mengirimkan jawaban: ' + err.message);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Coba Kirim Ulang';
        isSubmitted = false;
      }
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
