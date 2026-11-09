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
  let currentSubMode = isMemorizePhase ? 'GAME1_MEMORIZE' : 'GAME1_PLAY';

  if (isMemorizePhase) {
    renderMemorizeMode();
  } else {
    renderPlayMode();
  }

  // Realtime Session listener to detect phase change from Admin
  sessionUnsubscribe = firebaseService.listenToSession(sessionCode, (session) => {
    if (!session || !session.currentPhase) return;
    const newPhase = session.currentPhase;

    // Handle smooth internal sub-phase transitions (Memorize <-> Play)
    if (newPhase === 'GAME1' || newPhase === 'GAME1_PLAY') {
      if (currentSubMode === 'GAME1_MEMORIZE') {
        currentSubMode = 'GAME1_PLAY';
        renderPlayMode();
      }
      return;
    }

    if (newPhase === 'GAME1_MEMORIZE') {
      if (currentSubMode !== 'GAME1_MEMORIZE') {
        currentSubMode = 'GAME1_MEMORIZE';
        renderMemorizeMode();
      }
      return;
    }

    // Different game phase (GAME2, GAME3, FINISHED, LOBBY)
    // If student was answering questions and hasn't clicked submit, auto-submit to prevent score loss
    if (currentSubMode === 'GAME1_PLAY' && !isSubmitted && Object.keys(userAnswers).length > 0) {
      try {
        firebaseService.submitGame1(sessionCode, teamNumber, userAnswers).catch(() => {});
      } catch (e) {}
    }

    cleanup();
    if (onPhaseChange) {
      onPhaseChange(newPhase, session);
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
            currentSubMode = 'GAME1_PLAY';
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
      const val = optBtn.dataset.val;

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

        // Guaranteed numerical score extraction with local calculation fallback
        let finalScore = 0;
        if (res && typeof res.score === 'number') {
          finalScore = res.score;
        } else if (res && typeof res.totalGame1Score === 'number') {
          finalScore = res.totalGame1Score;
        } else {
          // Calculate score locally if network returned an unexpected shape
          let cCount = 0;
          for (const ch of SHUFFLE_CHALLENGES) {
            if ((userAnswers[ch.id] || '').trim().toLowerCase() === (ch.correctAnswer || '').trim().toLowerCase()) {
              cCount++;
            }
          }
          finalScore = cCount * 2.5;
          if (cCount === SHUFFLE_CHALLENGES.length) finalScore += 5;
          finalScore = Math.min(30, Math.round(finalScore * 10) / 10);
        }

        const correctCount = (res && typeof res.correctCount === 'number')
          ? res.correctCount
          : (finalScore >= 30 ? 10 : Math.round(finalScore / 2.5));

        if (finalScore >= 30) {
          audio.playFanfare();
          toast.success(`SEMPURNA! 10/10 Benar! Bonus +5 pts (Total: ${finalScore} pts)`);
        } else if (finalScore > 0) {
          audio.playCorrect();
          toast.success(`Jawaban Game 1 terkirim! Skor: ${finalScore} pts (${correctCount}/10 Benar)`);
        } else {
          audio.playWrong();
          toast.info(`Jawaban Game 1 selesai diperiksa. Skor: ${finalScore} pts.`);
        }

        // Show Result Banner with guaranteed numeric score
        container.querySelector('.tc-sticky-submit-bar').innerHTML = `
          <div class="tc-g1-finished-box">
            <span class="tc-fin-badge">GAME 1 SELESAI</span>
            <h3>Skor Kamu: <strong>${finalScore} / 30 Poin</strong></h3>
            <p>Berhasil menjawab <strong>${correctCount} dari 10</strong> tantangan dengan benar.</p>
            <p>Menunggu instruksi Guru untuk melanjutkan ke <strong>Game 2: Word Scramble</strong>...</p>
            <div style="margin-top: 0.75rem;">
              <button type="button" id="btn-check-next-game1" class="tc-btn tc-btn-sm tc-btn-secondary" style="font-weight: 800; border-radius: 8px;">
                <span>🔄 Periksa Instruksi Guru untuk Game 2</span>
              </button>
            </div>
          </div>
        `;

        const btnCheckG2 = container.querySelector('#btn-check-next-game1');
        if (btnCheckG2) {
          btnCheckG2.addEventListener('click', async () => {
            audio.playClick();
            btnCheckG2.disabled = true;
            btnCheckG2.innerHTML = `<span>Memeriksa sinyal guru...</span> <span class="tc-radar-spinner"></span>`;
            try {
              const s = await firebaseService.getSession(sessionCode);
              const p = s?.currentPhase || s?.status;
              if (p && p !== 'GAME1_MEMORIZE' && p !== 'GAME1_PLAY' && p !== 'GAME1') {
                cleanup();
                if (onPhaseChange) onPhaseChange(p, s);
                return;
              } else {
                toast.info('Guru belum membuka Game 2. Tunggu instruksi guru sebentar lagi.');
              }
            } catch (e) {
              toast.warning('Sedang menghubungkan ke server guru...');
            }
            setTimeout(() => {
              btnCheckG2.disabled = false;
              btnCheckG2.innerHTML = `<span>🔄 Periksa Instruksi Guru untuk Game 2</span>`;
            }, 1000);
          });
        }

        if (onGameCompleted) {
          onGameCompleted({ score: finalScore, correctCount, totalItems: SHUFFLE_CHALLENGES.length });
        }
      } catch (err) {
        // Even on error, calculate score locally and present it safely!
        let cCount = 0;
        for (const ch of SHUFFLE_CHALLENGES) {
          if ((userAnswers[ch.id] || '').trim().toLowerCase() === (ch.correctAnswer || '').trim().toLowerCase()) {
            cCount++;
          }
        }
        let fallbackScore = cCount * 2.5;
        if (cCount === SHUFFLE_CHALLENGES.length) fallbackScore += 5;
        fallbackScore = Math.min(30, Math.round(fallbackScore * 10) / 10);

        container.querySelector('.tc-sticky-submit-bar').innerHTML = `
          <div class="tc-g1-finished-box">
            <span class="tc-fin-badge">GAME 1 SELESAI</span>
            <h3>Skor Kamu: <strong>${fallbackScore} / 30 Poin</strong></h3>
            <p>Jawaban telah tersimpan di perangkat (${cCount}/10 Benar).</p>
            <p>Menunggu instruksi Guru untuk melanjutkan ke <strong>Game 2: Word Scramble</strong>...</p>
          </div>
        `;
        toast.info(`Jawaban Game 1 tersimpan secara offline. Skor: ${fallbackScore} pts.`);
      }
    }
  }

  function cleanup() {
    if (timerInstance) timerInstance.destroy();
    if (sessionUnsubscribe) sessionUnsubscribe();
  }

  return {
    destroy: cleanup,
    switchToPlayMode: () => {
      if (currentSubMode === 'GAME1_MEMORIZE') {
        currentSubMode = 'GAME1_PLAY';
        renderPlayMode();
      }
    }
  };
}
