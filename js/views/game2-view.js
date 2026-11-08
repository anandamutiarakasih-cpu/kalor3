/**
 * THERMO CHAMPIONS: HEAT EDITION
 * Game 2 - Word Scramble View (Interactive Anagram Tiles & Speed Bonus)
 */

import { WORD_SCRAMBLE_ITEMS } from '../data/questions-bank.js';
import { SyncTimer } from '../components/timer.js';
import { firebaseService } from '../services/firebase-service.js';
import { audio } from '../services/audio-service.js';
import { toast } from '../components/notification.js';

export function renderGame2View(container, { sessionCode, teamNumber, onGameCompleted, onPhaseChange }) {
  let currentIndex = 0;
  let timerInstance = null;
  let sessionUnsubscribe = null;
  let currentWordScore = 0;
  let totalScoreG2 = 0;
  let selectedTiles = []; // indices of scrambled letters placed in answer slot
  let isAnswering = false;
  let activeKeyHandler = null;

  // Realtime Session listener to detect phase change from Admin
  sessionUnsubscribe = firebaseService.listenToSession(sessionCode, (session) => {
    if (!session) return;
    if (session.currentPhase && session.currentPhase !== 'GAME2') {
      cleanup();
      if (onPhaseChange) onPhaseChange(session.currentPhase, session);
    }
  });

  renderWord();

  function renderWord() {
    if (currentIndex >= WORD_SCRAMBLE_ITEMS.length) {
      renderGame2Finish();
      return;
    }

    if (timerInstance) timerInstance.destroy();
    selectedTiles = [];
    isAnswering = false;

    const item = WORD_SCRAMBLE_ITEMS[currentIndex];
    const letters = item.scrambled.replace(/\s+/g, '').split('');

    container.innerHTML = `
      <div class="tc-view tc-game2-view">
        <!-- Top HUD -->
        <div class="tc-game-hud">
          <div class="tc-hud-badge">
            <span class="tc-badge-lab">GAME 2 • WORD SCRAMBLE</span>
            <div class="tc-word-progress">Kata ${currentIndex + 1} dari ${WORD_SCRAMBLE_ITEMS.length}</div>
          </div>

          <div class="tc-hud-center">
            <div id="g2-timer-container"></div>
          </div>

          <div class="tc-hud-team">
            <span class="tc-hud-team-tag">KELOMPOK ${teamNumber}</span>
            <div class="tc-g2-score-tag">Skor G2: <strong id="disp-g2-score">${totalScoreG2.toFixed(1)}</strong> / 35</div>
          </div>
        </div>

        <!-- Word Scramble Board Card -->
        <div class="tc-card tc-scramble-board" id="scramble-board-card">
          <div class="tc-board-header">
            <span class="tc-difficulty-badge ${item.difficulty.toLowerCase()}">${item.difficulty}</span>
            <span class="tc-word-category">Kategori: <strong>${item.category}</strong></span>
          </div>

          <!-- Clue / Question Prompt -->
          <div class="tc-scramble-clue-box">
            <span class="tc-clue-icon">💡</span>
            <p class="tc-clue-text">${item.clue}</p>
          </div>

          <!-- Target Answer Slots (Where letters land) -->
          <div class="tc-answer-slot-container" id="answer-slots">
            ${Array.from({ length: item.answer.length }).map((_, i) => `
              <div class="tc-slot-box" data-slot="${i}"></div>
            `).join('')}
          </div>

          <!-- Scrambled Letter Tiles Pool -->
          <div class="tc-tiles-pool" id="tiles-pool">
            ${letters.map((char, idx) => `
              <button type="button" class="tc-letter-tile" data-index="${idx}" data-char="${char}">
                ${char}
              </button>
            `).join('')}
          </div>

          <!-- Controls: Clear, Backspace, Submit -->
          <div class="tc-scramble-actions">
            <button type="button" id="btn-scramble-clear" class="tc-btn tc-btn-secondary tc-btn-sm">
              <span>Hapus Semua</span>
            </button>
            <button type="button" id="btn-scramble-backspace" class="tc-btn tc-btn-secondary tc-btn-sm">
              <span>← Backspace</span>
            </button>
            <button type="button" id="btn-scramble-submit" class="tc-btn tc-btn-primary">
              <span>KIRIM ISTILAH</span>
              <span>⚡</span>
            </button>
          </div>

          <!-- Keyboard helper hint -->
          <div class="tc-keyboard-hint">
            <small>Ketuk huruf di atas atau ketik langsung melalui keyboard perangkat!</small>
          </div>
        </div>
      </div>
    `;

    const tilesPool = container.querySelector('#tiles-pool');
    const answerSlots = container.querySelector('#answer-slots');
    const btnClear = container.querySelector('#btn-scramble-clear');
    const btnBackspace = container.querySelector('#btn-scramble-backspace');
    const btnSubmit = container.querySelector('#btn-scramble-submit');
    const boardCard = container.querySelector('#scramble-board-card');

    // Start Question Timer (18-20s)
    const timerBox = container.querySelector('#g2-timer-container');
    const duration = item.timeLimit || 20;

    timerInstance = new SyncTimer({
      container: timerBox,
      durationSec: duration,
      startTimeMs: Date.now(),
      getServerTime: () => firebaseService.getServerTime(),
      onComplete: () => {
        if (!isAnswering) {
          toast.warning(`Waktu habis untuk kata ke-${currentIndex + 1}!`);
          submitCurrentWord(true); // force submit on timeout
        }
      }
    });

    // Tile Click (Pick letter)
    tilesPool.addEventListener('click', (e) => {
      if (isAnswering) return;
      const tile = e.target.closest('.tc-letter-tile');
      if (!tile || tile.classList.contains('used')) return;
      audio.playClick();

      const tileIdx = parseInt(tile.dataset.index, 10);
      if (selectedTiles.length < item.answer.length) {
        selectedTiles.push(tileIdx);
        tile.classList.add('used');
        updateSlots();
      }
    });

    // Answer Slot Click (Undo letter)
    answerSlots.addEventListener('click', (e) => {
      if (isAnswering) return;
      const slot = e.target.closest('.tc-slot-box');
      if (!slot) return;

      const slotIdx = parseInt(slot.dataset.slot, 10);
      if (slotIdx < selectedTiles.length) {
        audio.playClick();
        const tileIdx = selectedTiles[slotIdx];
        // Remove from selected
        selectedTiles.splice(slotIdx, 1);
        // Unmark tile
        const t = tilesPool.querySelector(`.tc-letter-tile[data-index="${tileIdx}"]`);
        if (t) t.classList.remove('used');
        updateSlots();
      }
    });

    // Clear All
    btnClear.addEventListener('click', () => {
      if (isAnswering) return;
      audio.playClick();
      selectedTiles = [];
      tilesPool.querySelectorAll('.tc-letter-tile').forEach((t) => t.classList.remove('used'));
      updateSlots();
    });

    // Backspace
    btnBackspace.addEventListener('click', () => {
      if (isAnswering) return;
      if (selectedTiles.length > 0) {
        audio.playClick();
        const lastIdx = selectedTiles.pop();
        const t = tilesPool.querySelector(`.tc-letter-tile[data-index="${lastIdx}"]`);
        if (t) t.classList.remove('used');
        updateSlots();
      }
    });

    // Physical Keyboard Input
    if (activeKeyHandler) {
      window.removeEventListener('keydown', activeKeyHandler);
      activeKeyHandler = null;
    }

    const keyHandler = (e) => {
      if (isAnswering) return;
      if (e.key === 'Backspace') {
        btnBackspace.click();
      } else if (e.key === 'Enter') {
        btnSubmit.click();
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        const char = e.key.toUpperCase();
        // Find first unused tile with this char
        const tile = Array.from(tilesPool.querySelectorAll('.tc-letter-tile')).find(
          (t) => t.dataset.char === char && !t.classList.contains('used')
        );
        if (tile && selectedTiles.length < item.answer.length) {
          tile.click();
        }
      }
    };
    activeKeyHandler = keyHandler;
    window.addEventListener('keydown', activeKeyHandler);

    // Update Answer Slots display
    function updateSlots() {
      const slotEls = answerSlots.querySelectorAll('.tc-slot-box');
      slotEls.forEach((slot, idx) => {
        if (idx < selectedTiles.length) {
          const tIdx = selectedTiles[idx];
          const tile = tilesPool.querySelector(`.tc-letter-tile[data-index="${tIdx}"]`);
          slot.textContent = tile ? tile.dataset.char : '';
          slot.classList.add('filled');
        } else {
          slot.textContent = '';
          slot.classList.remove('filled');
        }
      });
    }

    // Submit handler
    btnSubmit.addEventListener('click', () => {
      if (isAnswering) return;
      if (selectedTiles.length < item.answer.length) {
        toast.warning(`Susun seluruh ${item.answer.length} huruf terlebih dahulu!`);
        return;
      }
      submitCurrentWord(false);
    });

    async function submitCurrentWord(isTimeout = false) {
      if (isAnswering) return;
      isAnswering = true;
      if (activeKeyHandler) {
        window.removeEventListener('keydown', activeKeyHandler);
        activeKeyHandler = null;
      }
      if (timerInstance) timerInstance.stop();

      const remainingSec = timerInstance ? timerInstance.getRemainingSeconds() : 0;
      const userWord = selectedTiles
        .map((idx) => {
          const t = tilesPool.querySelector(`.tc-letter-tile[data-index="${idx}"]`);
          return t ? t.dataset.char : '';
        })
        .join('');

      btnSubmit.disabled = true;

      try {
        const res = await firebaseService.submitGame2Word(
          sessionCode,
          teamNumber,
          item.id,
          userWord,
          remainingSec
        );

        totalScoreG2 = res.totalGame2Score;
        const dispG2 = container.querySelector('#disp-g2-score');
        if (dispG2) dispG2.textContent = totalScoreG2.toFixed(1);

        if (res.correct) {
          audio.playCorrect();
          boardCard.classList.add('correct-glow');
          toast.success(`BENAR! "${item.answer}" (+${res.addedScore} pts)`);
        } else {
          audio.playWrong();
          boardCard.classList.add('wrong-shake');
          toast.error(isTimeout ? `Waktu Habis! Jawaban: ${res.expected}` : `Salah! Jawaban: ${res.expected}`);
        }

        setTimeout(() => {
          currentIndex++;
          renderWord();
        }, 1600);
      } catch (err) {
        toast.error('Gagal mengirim jawaban: ' + err.message);
        setTimeout(() => {
          currentIndex++;
          renderWord();
        }, 1500);
      }
    }
  }

  function renderGame2Finish() {
    container.innerHTML = `
      <div class="tc-view tc-game2-view">
        <div class="tc-card tc-finish-card">
          <div class="tc-badge-lab">GAME 2 SELESAI</div>
          <div class="tc-finish-trophy">⚡</div>
          <h2 class="tc-finish-title">Word Scramble Tuntas!</h2>
          <div class="tc-finish-score-box">
            <span>Skor Akhir Game 2:</span>
            <strong>${totalScoreG2.toFixed(1)} / 35 Poin</strong>
          </div>
          <p class="tc-finish-desc">
            Hebat! Kamu telah menyelesaikan 10 tantangan penyusunan istilah kalor. 
            Menunggu instruksi Guru untuk melanjutkan ke <strong>Game 3: Extreme Addition (Kalkulasi Kalor)</strong>...
          </p>
          <div class="tc-radar-spinner"></div>
        </div>
      </div>
    `;

    audio.playFanfare();
    if (onGameCompleted) {
      onGameCompleted({ totalScoreG2 });
    }
  }

  function cleanup() {
    if (timerInstance) timerInstance.destroy();
    if (sessionUnsubscribe) sessionUnsubscribe();
    if (activeKeyHandler) {
      window.removeEventListener('keydown', activeKeyHandler);
      activeKeyHandler = null;
    }
  }

  return {
    destroy: cleanup
  };
}
