/**
 * THERMO CHAMPIONS: HEAT EDITION
 * Game 2 - Word Scramble View (Interactive Anagram Tiles & Speed Bonus)
 * Fitur Unggulan: Drag & Drop (Desktop & Touch Mobile), Tukar Posisi (Swap),
 * Geser Huruf, Acak Pilihan, & Responsif Total
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
  let currentKeyHandler = null;
  let totalScoreG2 = 0;
  let isAnswering = false;

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
    isAnswering = false;

    const item = WORD_SCRAMBLE_ITEMS[currentIndex];
    // Pool letters
    const letters = item.scrambled.replace(/\s+/g, '').split('');
    const poolLetters = letters.map((char, index) => ({
      id: index,
      char,
      used: false
    }));

    // Slots array for answer, length matches answer length
    // Value: null | { tileId: number, char: string }
    const answerSlotsState = new Array(item.answer.length).fill(null);
    let selectedSlotIdx = null;

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
              <div class="tc-slot-box" data-slot="${i}" draggable="false" title="Kotak ke-${i + 1}"></div>
            `).join('')}
          </div>

          <!-- Reorder & Shift Toolbar -->
          <div class="tc-reorder-toolbar" id="reorder-toolbar">
            <button type="button" id="btn-reorder-left" class="tc-btn tc-btn-secondary tc-btn-xs" title="Geser Huruf Terpilih ke Kiri" disabled>
              <span>◀ Geser Kiri</span>
            </button>
            <button type="button" id="btn-reorder-remove" class="tc-btn tc-btn-outline tc-btn-xs" title="Kembalikan Huruf Terpilih ke Pilihan" disabled>
              <span>✕ Lepas Huruf</span>
            </button>
            <button type="button" id="btn-reorder-right" class="tc-btn tc-btn-secondary tc-btn-xs" title="Geser Huruf Terpilih ke Kanan" disabled>
              <span>Geser Kanan ▶</span>
            </button>
          </div>

          <!-- Scrambled Letter Tiles Pool -->
          <div class="tc-tiles-pool" id="tiles-pool">
            ${poolLetters.map((p) => `
              <button type="button" class="tc-letter-tile" data-id="${p.id}" data-char="${p.char}" draggable="true">
                ${p.char}
              </button>
            `).join('')}
          </div>

          <!-- Controls: Shuffle, Clear, Backspace, Submit -->
          <div class="tc-scramble-actions">
            <button type="button" id="btn-scramble-shuffle" class="tc-btn tc-btn-secondary tc-btn-sm" title="Acak ulang urutan pilihan huruf">
              <span>🔀 Acak Pilihan</span>
            </button>
            <button type="button" id="btn-scramble-clear" class="tc-btn tc-btn-secondary tc-btn-sm" title="Kembalikan seluruh huruf ke pilihan">
              <span>↺ Hapus Semua</span>
            </button>
            <button type="button" id="btn-scramble-backspace" class="tc-btn tc-btn-secondary tc-btn-sm" title="Hapus huruf terakhir">
              <span>← Backspace</span>
            </button>
            <button type="button" id="btn-scramble-submit" class="tc-btn tc-btn-primary">
              <span>KIRIM ISTILAH</span>
              <span>⚡</span>
            </button>
          </div>

          <!-- Helper hint -->
          <div class="tc-keyboard-hint">
            <small>💡 <strong>Tips Mengurutkan:</strong> Tarik (drag) huruf ke kotak, atau ketuk kotak untuk menukar posisi (swap), atau gunakan tombol <strong>Geser Kiri/Kanan</strong>!</small>
          </div>
        </div>
      </div>
    `;

    const tilesPool = container.querySelector('#tiles-pool');
    const answerSlots = container.querySelector('#answer-slots');
    const btnClear = container.querySelector('#btn-scramble-clear');
    const btnBackspace = container.querySelector('#btn-scramble-backspace');
    const btnShuffle = container.querySelector('#btn-scramble-shuffle');
    const btnSubmit = container.querySelector('#btn-scramble-submit');
    const btnShiftLeft = container.querySelector('#btn-reorder-left');
    const btnShiftRight = container.querySelector('#btn-reorder-right');
    const btnRemoveSelected = container.querySelector('#btn-reorder-remove');
    const boardCard = container.querySelector('#scramble-board-card');

    // Start Timer
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
          submitCurrentWord(true);
        }
      }
    });

    // Render Answer Slots UI
    function updateSlotsUI() {
      const slotEls = answerSlots.querySelectorAll('.tc-slot-box');
      slotEls.forEach((slot, idx) => {
        const itemInSlot = answerSlotsState[idx];
        if (itemInSlot) {
          slot.textContent = itemInSlot.char;
          slot.classList.add('filled');
          slot.setAttribute('draggable', 'true');
        } else {
          slot.textContent = '';
          slot.classList.remove('filled');
          slot.setAttribute('draggable', 'false');
        }

        if (idx === selectedSlotIdx) {
          slot.classList.add('selected');
        } else {
          slot.classList.remove('selected');
        }
      });

      // Update Pool Buttons
      tilesPool.querySelectorAll('.tc-letter-tile').forEach((btn) => {
        const id = parseInt(btn.dataset.id, 10);
        const isUsed = answerSlotsState.some((s) => s && s.tileId === id);
        btn.classList.toggle('used', isUsed);
        btn.disabled = isUsed;
        btn.setAttribute('draggable', isUsed ? 'false' : 'true');
      });

      // Update Toolbar buttons
      if (selectedSlotIdx !== null && answerSlotsState[selectedSlotIdx]) {
        btnShiftLeft.disabled = (selectedSlotIdx <= 0);
        btnShiftRight.disabled = (selectedSlotIdx >= item.answer.length - 1);
        btnRemoveSelected.disabled = false;
      } else {
        btnShiftLeft.disabled = true;
        btnShiftRight.disabled = true;
        btnRemoveSelected.disabled = true;
      }
    }

    // Place letter into a slot
    function placeLetter(tileId, char, targetSlot = null) {
      if (targetSlot === null) {
        if (selectedSlotIdx !== null) {
          targetSlot = selectedSlotIdx;
        } else {
          targetSlot = answerSlotsState.findIndex((s) => s === null);
        }
      }

      if (targetSlot === -1 || targetSlot === null || targetSlot >= item.answer.length) {
        toast.warning('Seluruh kotak jawaban sudah terisi. Ketuk huruf untuk menukar atau gunakan Backspace.');
        return false;
      }

      // If slot already had a letter, placing new letter overwrites it and frees the old one
      answerSlotsState[targetSlot] = { tileId, char };
      selectedSlotIdx = null;
      updateSlotsUI();
      return true;
    }

    // Tile Click (Pick letter from pool)
    tilesPool.addEventListener('click', (e) => {
      if (isAnswering) return;
      const tile = e.target.closest('.tc-letter-tile');
      if (!tile || tile.disabled) return;
      audio.playClick();

      const tileId = parseInt(tile.dataset.id, 10);
      const char = tile.dataset.char;

      placeLetter(tileId, char);
    });

    // Answer Slot Click (Select / Swap / Move / Remove)
    answerSlots.addEventListener('click', (e) => {
      if (isAnswering) return;
      const slot = e.target.closest('.tc-slot-box');
      if (!slot) return;

      const slotIdx = parseInt(slot.dataset.slot, 10);
      audio.playClick();

      if (selectedSlotIdx === null) {
        // First selection (either filled or empty slot)
        selectedSlotIdx = slotIdx;
      } else if (selectedSlotIdx === slotIdx) {
        // Tapped same slot: if filled, return it to pool; if empty, deselect
        if (answerSlotsState[slotIdx]) {
          answerSlotsState[slotIdx] = null;
        }
        selectedSlotIdx = null;
      } else {
        // Different slot tapped: SWAP or MOVE
        const temp = answerSlotsState[selectedSlotIdx];
        answerSlotsState[selectedSlotIdx] = answerSlotsState[slotIdx];
        answerSlotsState[slotIdx] = temp;
        selectedSlotIdx = null;
      }
      updateSlotsUI();
    });

    // Geser Kiri button
    btnShiftLeft.addEventListener('click', () => {
      if (isAnswering || selectedSlotIdx === null || selectedSlotIdx <= 0) return;
      audio.playClick();
      const prev = selectedSlotIdx - 1;
      const temp = answerSlotsState[selectedSlotIdx];
      answerSlotsState[selectedSlotIdx] = answerSlotsState[prev];
      answerSlotsState[prev] = temp;
      selectedSlotIdx = prev;
      updateSlotsUI();
    });

    // Geser Kanan button
    btnShiftRight.addEventListener('click', () => {
      if (isAnswering || selectedSlotIdx === null || selectedSlotIdx >= item.answer.length - 1) return;
      audio.playClick();
      const next = selectedSlotIdx + 1;
      const temp = answerSlotsState[selectedSlotIdx];
      answerSlotsState[selectedSlotIdx] = answerSlotsState[next];
      answerSlotsState[next] = temp;
      selectedSlotIdx = next;
      updateSlotsUI();
    });

    // Remove Selected letter
    btnRemoveSelected.addEventListener('click', () => {
      if (isAnswering || selectedSlotIdx === null) return;
      audio.playClick();
      answerSlotsState[selectedSlotIdx] = null;
      selectedSlotIdx = null;
      updateSlotsUI();
    });

    // Shuffle pool buttons
    btnShuffle.addEventListener('click', () => {
      if (isAnswering) return;
      audio.playClick();
      const tiles = Array.from(tilesPool.children);
      for (let i = tiles.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        tilesPool.appendChild(tiles[j]);
      }
      toast.info('Pilihan huruf diacak ulang.');
    });

    // Clear All
    btnClear.addEventListener('click', () => {
      if (isAnswering) return;
      audio.playClick();
      answerSlotsState.fill(null);
      selectedSlotIdx = null;
      updateSlotsUI();
    });

    // Backspace
    btnBackspace.addEventListener('click', () => {
      if (isAnswering) return;
      audio.playClick();
      if (selectedSlotIdx !== null && answerSlotsState[selectedSlotIdx]) {
        answerSlotsState[selectedSlotIdx] = null;
        selectedSlotIdx = null;
        updateSlotsUI();
        return;
      }
      for (let i = answerSlotsState.length - 1; i >= 0; i--) {
        if (answerSlotsState[i] !== null) {
          answerSlotsState[i] = null;
          break;
        }
      }
      selectedSlotIdx = null;
      updateSlotsUI();
    });

    // ==========================================
    // DRAG AND DROP (DESKTOP HTML5 + TOUCH MOBILE)
    // ==========================================
    let draggedData = null; // { source: 'pool'|'slot', tileId, char, slotIdx }

    // HTML5 Drag (Desktop)
    container.addEventListener('dragstart', (e) => {
      if (isAnswering) return;
      const poolTile = e.target.closest('.tc-letter-tile');
      const slotBox = e.target.closest('.tc-slot-box');

      if (poolTile && !poolTile.disabled) {
        draggedData = {
          source: 'pool',
          tileId: parseInt(poolTile.dataset.id, 10),
          char: poolTile.dataset.char
        };
        e.dataTransfer.setData('text/plain', poolTile.dataset.char);
        poolTile.classList.add('dragging');
      } else if (slotBox && slotBox.classList.contains('filled')) {
        const sIdx = parseInt(slotBox.dataset.slot, 10);
        const itemInSlot = answerSlotsState[sIdx];
        if (itemInSlot) {
          draggedData = {
            source: 'slot',
            tileId: itemInSlot.tileId,
            char: itemInSlot.char,
            slotIdx: sIdx
          };
          e.dataTransfer.setData('text/plain', itemInSlot.char);
          slotBox.classList.add('dragging');
        }
      }
    });

    container.addEventListener('dragend', (e) => {
      draggedData = null;
      container.querySelectorAll('.dragging').forEach((el) => el.classList.remove('dragging'));
      container.querySelectorAll('.drag-over').forEach((el) => el.classList.remove('drag-over'));
    });

    answerSlots.addEventListener('dragover', (e) => {
      e.preventDefault();
      const slot = e.target.closest('.tc-slot-box');
      if (slot) {
        slot.classList.add('drag-over');
      }
    });

    answerSlots.addEventListener('dragleave', (e) => {
      const slot = e.target.closest('.tc-slot-box');
      if (slot) {
        slot.classList.remove('drag-over');
      }
    });

    answerSlots.addEventListener('drop', (e) => {
      e.preventDefault();
      const slot = e.target.closest('.tc-slot-box');
      if (!slot || !draggedData) return;
      slot.classList.remove('drag-over');
      const targetSlot = parseInt(slot.dataset.slot, 10);

      audio.playClick();
      if (draggedData.source === 'pool') {
        placeLetter(draggedData.tileId, draggedData.char, targetSlot);
      } else if (draggedData.source === 'slot') {
        // Swap slots
        const originSlot = draggedData.slotIdx;
        const temp = answerSlotsState[originSlot];
        answerSlotsState[originSlot] = answerSlotsState[targetSlot];
        answerSlotsState[targetSlot] = temp;
        selectedSlotIdx = null;
        updateSlotsUI();
      }
      draggedData = null;
    });

    // Touch Drag (Mobile Support)
    let touchGhost = null;
    let touchOrigin = null;

    function handleTouchStart(e) {
      if (isAnswering) return;
      const touch = e.touches[0];
      const poolTile = e.target.closest('.tc-letter-tile');
      const slotBox = e.target.closest('.tc-slot-box');

      if (poolTile && !poolTile.disabled) {
        touchOrigin = {
          source: 'pool',
          tileId: parseInt(poolTile.dataset.id, 10),
          char: poolTile.dataset.char
        };
        createTouchGhost(touch.clientX, touch.clientY, poolTile.dataset.char);
      } else if (slotBox && slotBox.classList.contains('filled')) {
        const sIdx = parseInt(slotBox.dataset.slot, 10);
        const itemInSlot = answerSlotsState[sIdx];
        if (itemInSlot) {
          touchOrigin = {
            source: 'slot',
            tileId: itemInSlot.tileId,
            char: itemInSlot.char,
            slotIdx: sIdx
          };
          createTouchGhost(touch.clientX, touch.clientY, itemInSlot.char);
        }
      }
    }

    function createTouchGhost(x, y, char) {
      if (touchGhost) touchGhost.remove();
      touchGhost = document.createElement('div');
      touchGhost.className = 'tc-touch-ghost';
      touchGhost.textContent = char;
      touchGhost.style.left = `${x}px`;
      touchGhost.style.top = `${y}px`;
      document.body.appendChild(touchGhost);
    }

    function handleTouchMove(e) {
      if (!touchGhost || !touchOrigin) return;
      const touch = e.touches[0];
      touchGhost.style.left = `${touch.clientX}px`;
      touchGhost.style.top = `${touch.clientY}px`;

      const targetEl = document.elementFromPoint(touch.clientX, touch.clientY);
      const slot = targetEl?.closest('.tc-slot-box');
      answerSlots.querySelectorAll('.tc-slot-box').forEach((s) => s.classList.remove('drag-over'));
      if (slot) {
        slot.classList.add('drag-over');
      }
      // Prevent browser default pull-to-refresh while dragging letter
      if (e.cancelable) e.preventDefault();
    }

    function handleTouchEnd(e) {
      if (!touchGhost || !touchOrigin) {
        cleanTouch();
        return;
      }
      const touch = e.changedTouches[0];
      const targetEl = document.elementFromPoint(touch.clientX, touch.clientY);
      const slot = targetEl?.closest('.tc-slot-box');

      if (slot) {
        const targetSlot = parseInt(slot.dataset.slot, 10);
        audio.playClick();
        if (touchOrigin.source === 'pool') {
          placeLetter(touchOrigin.tileId, touchOrigin.char, targetSlot);
        } else if (touchOrigin.source === 'slot') {
          const originSlot = touchOrigin.slotIdx;
          const temp = answerSlotsState[originSlot];
          answerSlotsState[originSlot] = answerSlotsState[targetSlot];
          answerSlotsState[targetSlot] = temp;
          selectedSlotIdx = null;
          updateSlotsUI();
        }
      }
      cleanTouch();
    }

    function cleanTouch() {
      if (touchGhost) {
        touchGhost.remove();
        touchGhost = null;
      }
      touchOrigin = null;
      answerSlots.querySelectorAll('.tc-slot-box').forEach((s) => s.classList.remove('drag-over'));
    }

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
    container.addEventListener('touchcancel', cleanTouch, { passive: true });

    // Physical Keyboard Input
    const keyHandler = (e) => {
      if (isAnswering) return;
      if (e.key === 'Backspace') {
        btnBackspace.click();
      } else if (e.key === 'Enter') {
        btnSubmit.click();
      } else if (e.key === 'ArrowLeft') {
        if (selectedSlotIdx !== null && selectedSlotIdx > 0) {
          btnShiftLeft.click();
        }
      } else if (e.key === 'ArrowRight') {
        if (selectedSlotIdx !== null && selectedSlotIdx < item.answer.length - 1) {
          btnShiftRight.click();
        }
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        const char = e.key.toUpperCase();
        const unusedBtn = Array.from(tilesPool.querySelectorAll('.tc-letter-tile')).find(
          (t) => t.dataset.char === char && !t.disabled
        );
        if (unusedBtn) {
          unusedBtn.click();
        }
      }
    };

    if (currentKeyHandler) {
      window.removeEventListener('keydown', currentKeyHandler);
    }
    currentKeyHandler = keyHandler;
    window.addEventListener('keydown', keyHandler);

    // Initial Slots UI
    updateSlotsUI();

    // Submit handler
    btnSubmit.addEventListener('click', () => {
      if (isAnswering) return;
      const filledCount = answerSlotsState.filter((s) => s !== null).length;
      if (filledCount < item.answer.length) {
        toast.warning(`Susun seluruh ${item.answer.length} huruf terlebih dahulu! (${filledCount}/${item.answer.length} terisi)`);
        return;
      }
      submitCurrentWord(false);
    });

    async function submitCurrentWord(isTimeout = false) {
      if (isAnswering) return;
      isAnswering = true;
      if (currentKeyHandler) {
        window.removeEventListener('keydown', currentKeyHandler);
        currentKeyHandler = null;
      }
      if (timerInstance) timerInstance.stop();

      const remainingSec = timerInstance ? timerInstance.getRemainingSeconds() : 0;
      const userWord = answerSlotsState.map((s) => (s ? s.char : '')).join('');

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
    if (currentKeyHandler) {
      window.removeEventListener('keydown', currentKeyHandler);
      currentKeyHandler = null;
    }
    if (timerInstance) timerInstance.destroy();
    if (sessionUnsubscribe) sessionUnsubscribe();
  }

  return {
    destroy: cleanup
  };
}
