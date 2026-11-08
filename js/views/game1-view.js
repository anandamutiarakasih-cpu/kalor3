/**
 * THERMO CHAMPIONS: HEAT EDITION
 * Game 1 - Clash of Champions: Shuffle & Recall
 * Single Unified Session: Intro -> Memorize (15s) -> Shuffle -> Recall (Drag & Drop) -> Result
 * SMP Class VII Physics - Kalor
 */

import { CLASH_SHUFFLE_CARDS } from '../data/questions-bank.js';
import { firebaseService } from '../services/firebase-service.js';
import { audio } from '../services/audio-service.js';
import { particleService } from '../services/particle-service.js';
import { toast } from '../components/notification.js';

export function renderGame1View(container, { sessionCode, teamNumber, onNextGame, onPhaseChange }) {
  let activeCode = sessionCode || '';
  let activeTeam = teamNumber || 1;
  let activeTeamName = `Kelompok ${activeTeam}`;
  let countdownTimer = null;
  let sessionUnsubscribe = null;
  let selectedCardForMove = null;

  // Initial State Check
  const stored = firebaseService.getStoredTeamSession();
  if (stored) {
    if (stored.sessionCode) activeCode = stored.sessionCode;
    if (stored.teamNumber) activeTeam = stored.teamNumber;
    if (stored.teamName) activeTeamName = stored.teamName;
  }

  // Realtime Session Listener (Detects if teacher changes phase)
  if (activeCode) {
    sessionUnsubscribe = firebaseService.listenToSession(activeCode, (session) => {
      if (!session) return;
      if (session.currentPhase && session.currentPhase !== 'GAME1' && session.currentPhase !== 'GAME1_PLAY' && session.currentPhase !== 'GAME1_MEMORIZE') {
        cleanup();
        if (onPhaseChange) onPhaseChange(session.currentPhase, session);
      }
    });
  }

  // Start with Intro & Instructions Stage
  renderIntroStage();

  // =========================================================================
  // 1. HALAMAN AWAL & PETUNJUK PERMAINAN
  // =========================================================================
  function renderIntroStage() {
    container.innerHTML = `
      <div class="tc-view tc-game1-view">
        <div class="tc-g1-intro-card">
          <!-- Hero Header -->
          <div class="tc-g1-hero-header">
            <div class="tc-badge-lab">
              <span class="tc-pulse-dot"></span>
              CLASH OF CHAMPIONS • MISI 1
            </div>
            <h1 class="tc-g1-title">SHUFFLE & RECALL</h1>
            <div class="tc-g1-subtitle">MISI KALOR – SESI 1 (IPA SMP KELAS VII)</div>
          </div>

          <!-- Hero Illustration Banner: Fire, Thermometer, Hot/Cold Objects, Energy -->
          <div class="tc-hero-illustration-banner">
            <svg viewBox="0 0 600 180" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="bgHero" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#080e22"/>
                  <stop offset="50%" stop-color="#111c38"/>
                  <stop offset="100%" stop-color="#080e22"/>
                </linearGradient>
                <linearGradient id="flameGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                  <stop offset="0%" stop-color="#FF3D00"/>
                  <stop offset="60%" stop-color="#FF9100"/>
                  <stop offset="100%" stop-color="#FFEA00"/>
                </linearGradient>
                <linearGradient id="coldBlock" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#0284C7"/>
                  <stop offset="100%" stop-color="#0369A1"/>
                </linearGradient>
                <linearGradient id="hotBlock" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#EA580C"/>
                  <stop offset="100%" stop-color="#C2410C"/>
                </linearGradient>
                <filter id="heroGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="4" result="blur"/>
                  <feComposite in="SourceGraphic" in2="blur" operator="over"/>
                </filter>
              </defs>
              <rect width="600" height="180" fill="url(#bgHero)"/>

              <!-- Lab Grid Lines -->
              <line x1="0" y1="90" x2="600" y2="90" stroke="rgba(255,255,255,0.04)" stroke-dasharray="4 4"/>
              <line x1="150" y1="0" x2="150" y2="180" stroke="rgba(255,255,255,0.04)" stroke-dasharray="4 4"/>
              <line x1="300" y1="0" x2="300" y2="180" stroke="rgba(255,255,255,0.04)" stroke-dasharray="4 4"/>
              <line x1="450" y1="0" x2="450" y2="180" stroke="rgba(255,255,255,0.04)" stroke-dasharray="4 4"/>

              <!-- 1. Flame & Heat Source (Left) -->
              <g transform="translate(60, 45)">
                <circle cx="45" cy="55" r="35" fill="rgba(255, 87, 34, 0.15)" filter="url(#heroGlow)"/>
                <!-- Flame shape -->
                <path d="M45 15 C30 35 20 50 20 68 C20 82 31 92 45 92 C59 92 70 82 70 68 C70 50 60 35 45 15 Z" fill="url(#flameGrad)" filter="url(#heroGlow)"/>
                <path d="M45 40 C38 52 32 60 32 72 C32 80 38 86 45 86 C52 86 58 80 58 72 C58 60 52 52 45 40 Z" fill="#FFF9C4"/>
                <text x="45" y="112" text-anchor="middle" fill="#FFB74D" font-size="10" font-weight="bold" font-family="sans-serif">SUMBER ENERGI</text>
              </g>

              <!-- 2. Transfer Arrow from Hot to Cold (Center-Left) -->
              <g transform="translate(180, 50)">
                <rect x="0" y="20" width="60" height="50" rx="8" fill="url(#hotBlock)" filter="url(#heroGlow)"/>
                <text x="30" y="42" text-anchor="middle" fill="#FFFFFF" font-size="10" font-weight="bold" font-family="sans-serif">BENDA</text>
                <text x="30" y="56" text-anchor="middle" fill="#FFE082" font-size="11" font-weight="900" font-family="sans-serif">PANAS</text>

                <!-- Energy stream arrows -->
                <path d="M70 45 L115 45" stroke="#FACC15" stroke-width="4" stroke-linecap="round"/>
                <polygon points="122,45 112,39 112,51" fill="#FACC15"/>
                <text x="93" y="36" text-anchor="middle" fill="#FACC15" font-size="8.5" font-weight="bold" font-family="sans-serif">Q (KALOR)</text>

                <rect x="130" y="20" width="60" height="50" rx="8" fill="url(#coldBlock)" filter="url(#heroGlow)"/>
                <text x="160" y="42" text-anchor="middle" fill="#FFFFFF" font-size="10" font-weight="bold" font-family="sans-serif">BENDA</text>
                <text x="160" y="56" text-anchor="middle" fill="#BAE6FD" font-size="11" font-weight="900" font-family="sans-serif">DINGIN</text>
                <text x="95" y="105" text-anchor="middle" fill="#94A3B8" font-size="9.5" font-family="sans-serif">Aliran Kalor Alami</text>
              </g>

              <!-- 3. Laboratory Thermometer (Right) -->
              <g transform="translate(450, 25)">
                <rect x="36" y="15" width="14" height="100" rx="7" fill="#1e293b" stroke="#94A3B8" stroke-width="2"/>
                <circle cx="43" cy="120" r="14" fill="#EF4444"/>
                <rect x="40" y="40" width="6" height="80" rx="3" fill="#EF4444"/>
                <!-- Scale marks -->
                <line x1="26" y1="35" x2="32" y2="35" stroke="#94A3B8" stroke-width="2"/>
                <line x1="26" y1="55" x2="32" y2="55" stroke="#94A3B8" stroke-width="2"/>
                <line x1="26" y1="75" x2="32" y2="75" stroke="#94A3B8" stroke-width="2"/>
                <line x1="26" y1="95" x2="32" y2="95" stroke="#94A3B8" stroke-width="2"/>
                <text x="65" y="65" fill="#FACC15" font-size="12" font-weight="900" font-family="sans-serif">ΔT</text>
                <text x="65" y="80" fill="#E2E8F0" font-size="8.5" font-family="sans-serif">Suhu</text>
                <text x="43" y="148" text-anchor="middle" fill="#38BDF8" font-size="9.5" font-weight="bold" font-family="sans-serif">TERMOMETER</text>
              </g>
            </svg>
          </div>

          <!-- Petunjuk Permainan (7 Langkah Sesuai Ketentuan) -->
          <div class="tc-rules-box">
            <h3 class="tc-rules-title">
              <span>📋</span>
              <span>PETUNJUK PERMAINAN</span>
            </h3>
            <ol class="tc-rules-list">
              <li class="tc-rules-item">
                <span class="tc-rules-num">1</span>
                <span>Masukkan nama kelompok, nomor kelompok, dan kode permainan dari guru.</span>
              </li>
              <li class="tc-rules-item">
                <span class="tc-rules-num">2</span>
                <span>Perhatikan seluruh kartu yang ditampilkan pada layar dengan seksama.</span>
              </li>
              <li class="tc-rules-item">
                <span class="tc-rules-num">3</span>
                <span>Ingat isi dan posisi setiap kartu selama waktu pengamatan (15 detik).</span>
              </li>
              <li class="tc-rules-item">
                <span class="tc-rules-num">4</span>
                <span>Setelah waktu habis, kartu akan tertutup otomatis dan posisinya diacak.</span>
              </li>
              <li class="tc-rules-item">
                <span class="tc-rules-num">5</span>
                <span>Buka kartu untuk membaca isinya dan susun kembali sesuai urutan awal (Posisi 1 s.d. 4).</span>
              </li>
              <li class="tc-rules-item">
                <span class="tc-rules-num">6</span>
                <span>Diskusikan susunan jawaban bersama seluruh anggota kelompok.</span>
              </li>
              <li class="tc-rules-item">
                <span class="tc-rules-num">7</span>
                <span>Tekan tombol <strong>CEK JAWABAN</strong> setelah seluruh kartu tersusun pada slot posisi.</span>
              </li>
            </ol>
          </div>

          <!-- Form Identitas Kelompok & Kode Permainan -->
          <form id="form-g1-intro" class="tc-intro-form">
            <div class="tc-form-row">
              <div class="tc-input-group">
                <label for="intro-team-name">NAMA KELOMPOK</label>
                <input 
                  type="text" 
                  id="intro-team-name" 
                  class="tc-input" 
                  placeholder="Contoh: Tim Konduksi Hebat" 
                  value="${activeTeamName}" 
                  required
                />
              </div>

              <div class="tc-input-group">
                <label for="intro-team-number">NOMOR KELOMPOK (1–8)</label>
                <select id="intro-team-number" class="tc-input" required>
                  ${[1, 2, 3, 4, 5, 6, 7, 8].map((n) => `
                    <option value="${n}" ${n === Number(activeTeam) ? 'selected' : ''}>Kelompok ${n}</option>
                  `).join('')}
                </select>
              </div>

              <div class="tc-input-group">
                <label for="intro-session-code">KODE PERMAINAN (DARI GURU)</label>
                <input 
                  type="text" 
                  id="intro-session-code" 
                  class="tc-input" 
                  placeholder="Contoh: TC88" 
                  value="${activeCode}" 
                  maxlength="8" 
                  style="text-transform: uppercase; font-family: var(--font-mono); font-weight: 800;"
                  required
                />
              </div>
            </div>

            <button type="submit" class="tc-btn tc-btn-primary tc-btn-block tc-btn-large">
              <span>MULAI PERMAINAN</span>
              <span>🚀</span>
            </button>
          </form>
        </div>
      </div>
    `;

    const form = container.querySelector('#form-g1-intro');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      audio.playClick();

      const nameInput = container.querySelector('#intro-team-name').value.trim();
      const numInput = parseInt(container.querySelector('#intro-team-number').value, 10);
      const codeInput = container.querySelector('#intro-session-code').value.trim().toUpperCase();

      if (!nameInput) {
        toast.warning('Silakan masukkan nama kelompok.');
        return;
      }
      if (!codeInput) {
        toast.warning('Silakan masukkan kode permainan dari guru.');
        return;
      }

      activeTeamName = nameInput;
      activeTeam = numInput;
      activeCode = codeInput;

      // Ensure team is registered in the session
      try {
        await firebaseService.joinSession(activeCode, activeTeam, activeTeamName, []);
      } catch (err) {
        console.info('Join note:', err.message);
      }

      toast.success(`Selamat datang, ${activeTeamName}! Bersiap mengamati kartu...`);
      startMemorizeStage();
    });
  }

  // =========================================================================
  // 2. TAHAP MEMORIZE (MENGINGAT) - 15 DETIK PENGAMATAN
  // =========================================================================
  function startMemorizeStage() {
    let timeLeft = 15; // 15 detik countdown
    audio.playPhaseTransition();

    container.innerHTML = `
      <div class="tc-view tc-game1-view">
        <!-- Top HUD -->
        <div class="tc-game-hud">
          <div>
            <div class="tc-badge-lab"><span class="tc-pulse-dot"></span> TAHAP 1 DARI 3: MEMORIZE</div>
            <h2 class="tc-hud-title">SHUFFLE & <span>RECALL</span></h2>
          </div>

          <div class="tc-hud-center">
            <div class="tc-memorize-timer-box">
              <span>⏱️ WAKTU:</span>
              <span class="tc-timer-big-num" id="mem-countdown">${timeLeft}s</span>
            </div>
          </div>

          <div class="tc-hud-team">
            <span class="tc-hud-team-tag">KELOMPOK ${activeTeam}</span>
            <span class="tc-hud-score-tag">${activeTeamName}</span>
          </div>
        </div>

        <!-- Banner Instruksi -->
        <div class="tc-memorize-banner">
          <div class="tc-memorize-instruction">
            👁️ <strong>AMATI DAN HAFALKAN!</strong> Ingat isi informasi dan urutan posisi setiap kartu (Kartu 1 s.d. 4) sebelum kartu tertutup!
          </div>
        </div>

        <!-- 4 Kartu Terbuka (Urutan Awal: 1, 2, 3, 4) -->
        <div class="tc-cards-4-grid" id="memorize-cards-grid">
          ${CLASH_SHUFFLE_CARDS.map((card, idx) => `
            <div class="tc-clash-card" id="mem-card-${card.id}">
              <div class="tc-card-inner" id="mem-inner-${card.id}">
                <!-- Front Face (Terbuka) -->
                <div class="tc-card-face tc-card-front">
                  <div class="tc-card-header">
                    <span class="tc-card-pos-badge">POSISI ${idx + 1}</span>
                    <span class="tc-card-cat-badge">${card.category}</span>
                  </div>
                  <div class="tc-card-illustration">
                    ${card.illustrationSvg}
                  </div>
                  <h4 class="tc-card-title">${card.title}</h4>
                  <p class="tc-card-def">${card.definition}</p>
                  <div class="tc-card-tags">${card.keywords}</div>
                </div>

                <!-- Back Face (Tertutup) -->
                <div class="tc-card-face tc-card-back">
                  <div class="tc-card-back-pattern"></div>
                  <div class="tc-card-back-crest">🔥</div>
                  <div class="tc-card-back-title">MISI KALOR</div>
                  <div class="tc-card-back-sub">THERMO CHAMPIONS</div>
                  <div class="tc-card-back-hint">KARTU TERTUTUP</div>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    const countdownEl = container.querySelector('#mem-countdown');

    // Countdown Interval 15s
    countdownTimer = setInterval(() => {
      timeLeft--;
      if (countdownEl) {
        countdownEl.textContent = `${timeLeft}s`;
        if (timeLeft <= 5) {
          countdownEl.style.color = '#EF4444';
          audio.playTickUrgent();
        } else {
          audio.playCountdownTick();
        }
      }

      if (timeLeft <= 0) {
        clearInterval(countdownTimer);
        countdownTimer = null;
        onMemorizeTimeUp();
      }
    }, 1000);

    function onMemorizeTimeUp() {
      toast.warning('Waktu pengamatan habis! Kartu menutup...');
      audio.playCardFlip();

      // Trigger 3D flip animation to close all cards
      const inners = container.querySelectorAll('.tc-card-inner');
      inners.forEach((inner, i) => {
        setTimeout(() => {
          inner.classList.add('flipped');
        }, i * 120);
      });

      // Transition to Shuffle stage after flip completes
      setTimeout(() => {
        startShuffleStage();
      }, 1200);
    }
  }

  // =========================================================================
  // 3. TAHAP SHUFFLE (PENGACAKAN)
  // =========================================================================
  function startShuffleStage() {
    audio.playShuffle();

    container.innerHTML = `
      <div class="tc-view tc-game1-view">
        <div class="tc-shuffle-arena">
          <div class="tc-shuffle-icon">🔀</div>
          <h2 class="tc-shuffle-title">PENGACAKAN KARTU OTOMATIS</h2>
          <div class="tc-shuffle-quote">
            "Ingat kembali informasi dan posisi kartu yang telah kamu amati!"
          </div>
          <p style="color: #94a3b8; font-size: 0.95rem;">
            Sistem sedang mengacak posisi keempat kartu secara dramatis...
          </p>

          <!-- Animated Crossing Shuffling Cards -->
          <div class="tc-shuffle-cards-track">
            <div class="tc-mini-shuffle-card">🔥</div>
            <div class="tc-mini-shuffle-card">⚡</div>
            <div class="tc-mini-shuffle-card">🌡️</div>
            <div class="tc-mini-shuffle-card">🧊</div>
          </div>
        </div>
      </div>
    `;

    // Generate permutation guaranteed to be different from original [c1, c2, c3, c4]
    const originalIds = CLASH_SHUFFLE_CARDS.map((c) => c.id);
    let shuffledDeck = [...CLASH_SHUFFLE_CARDS];

    let attempts = 0;
    while (attempts < 10) {
      shuffledDeck = [...shuffledDeck].sort(() => Math.random() - 0.5);
      const currentIds = shuffledDeck.map((c) => c.id);
      const isIdentical = currentIds.every((id, idx) => id === originalIds[idx]);
      if (!isIdentical) break;
      attempts++;
    }

    // After 2.6s of shuffle animation, transition to Recall stage
    setTimeout(() => {
      renderRecallStage(shuffledDeck);
    }, 2600);
  }

  // =========================================================================
  // 4. TAHAP RECALL (MENGINGAT KEMBALI & MENYUSUN DENGAN DRAG AND DROP)
  // =========================================================================
  function renderRecallStage(initialDeck) {
    audio.playPhaseTransition();

    // State for Recall Stage
    // deckCards: array of card objects currently in the staging deck
    let deckCards = [...initialDeck];
    // targetSlots: array of 4 slots [cardOrNull, cardOrNull, cardOrNull, cardOrNull]
    let targetSlots = [null, null, null, null];
    // flippedState: map of cardId -> boolean (true if flipped face up to peek)
    const cardFlippedState = new Map();
    deckCards.forEach((c) => cardFlippedState.set(c.id, false));

    renderRecallDOM();

    function renderRecallDOM() {
      const filledCount = targetSlots.filter(Boolean).length;
      const canSubmit = filledCount === 4;

      container.innerHTML = `
        <div class="tc-view tc-game1-view tc-recall-container">
          <!-- Top HUD -->
          <div class="tc-game-hud">
            <div>
              <div class="tc-badge-lab"><span class="tc-pulse-dot"></span> TAHAP RECALL • MENYUSUN KARTU</div>
              <h2 class="tc-hud-title">SUSUN KEMBALI <span>URUTAN AWAL</span></h2>
            </div>

            <div class="tc-hud-center">
              <span class="tc-badge-lab" style="border-color: var(--tc-yellow); color: var(--tc-yellow);">
                SLOT TERISI: ${filledCount} / 4
              </span>
            </div>

            <div class="tc-hud-team">
              <span class="tc-hud-team-tag">KELOMPOK ${activeTeam}</span>
              <span class="tc-hud-score-tag">${activeTeamName}</span>
            </div>
          </div>

          <!-- Instruction & Guide Banner -->
          <div class="tc-recall-hud-banner">
            <div class="tc-recall-guide">
              💡 <strong>Petunjuk:</strong> Klik kartu untuk <strong>mengintip isinya</strong>. Geser (Drag & Drop) atau Klik kartu lalu klik slot untuk meletakkan pada <strong>Posisi 1, 2, 3, atau 4</strong> sesuai urutan saat tahap Memorize.
            </div>
          </div>

          <!-- 1. AREA PENYUSUNAN KARTU (4 TARGET SLOTS) -->
          <div class="tc-slots-section">
            <div class="tc-section-title">
              <span>🎯</span>
              <span>AREA PENYUSUNAN KARTU (URUTAN POSISI 1 – 4)</span>
            </div>

            <div class="tc-target-slots-grid" id="target-slots-grid">
              ${[0, 1, 2, 3].map((idx) => {
                const placedCard = targetSlots[idx];
                const isSelectedSlot = selectedCardForMove && !placedCard;
                return `
                  <div 
                    class="tc-drop-slot ${placedCard ? 'filled' : 'empty'} ${isSelectedSlot ? 'slot-highlight' : ''}" 
                    data-slot-index="${idx}"
                    id="slot-${idx}"
                  >
                    <div class="tc-slot-header">
                      <span class="tc-slot-badge">POSISI ${idx + 1}</span>
                      ${placedCard ? `
                        <button 
                          class="tc-btn-remove-card" 
                          data-remove-slot="${idx}" 
                          title="Kembalikan kartu ke Dek"
                        >✕</button>
                      ` : ''}
                    </div>

                    ${placedCard ? `
                      <div 
                        class="tc-clash-card slot-card ${selectedCardForMove?.id === placedCard.id ? 'selected-for-move' : ''}" 
                        draggable="true" 
                        data-card-id="${placedCard.id}"
                        data-from-slot="${idx}"
                      >
                        <div class="tc-card-inner ${cardFlippedState.get(placedCard.id) ? '' : 'flipped'}">
                          <!-- Front Face (Open) -->
                          <div class="tc-card-face tc-card-front">
                            <div class="tc-card-header">
                              <span class="tc-card-pos-badge">Slot ${idx + 1}</span>
                              <span class="tc-card-cat-badge">${placedCard.category}</span>
                            </div>
                            <div class="tc-card-illustration">
                              ${placedCard.illustrationSvg}
                            </div>
                            <h4 class="tc-card-title">${placedCard.title}</h4>
                            <p class="tc-card-def">${placedCard.definition}</p>
                            <div class="tc-card-tags">${placedCard.keywords}</div>
                          </div>

                          <!-- Back Face (Peek View) -->
                          <div class="tc-card-face tc-card-back">
                            <div class="tc-card-back-pattern"></div>
                            <div class="tc-card-back-crest">🔥</div>
                            <div class="tc-card-back-title">MISI KALOR</div>
                            <div class="tc-card-back-sub">THERMO CHAMPIONS</div>
                            <div class="tc-card-back-hint">👁️ Klik untuk Buka / Intip</div>
                          </div>
                        </div>
                      </div>
                    ` : `
                      <div class="tc-slot-placeholder" data-slot-index="${idx}">
                        <div class="tc-slot-icon">📥</div>
                        <div class="tc-slot-txt">Tarik atau Klik ke Sini</div>
                        <small style="color: #64748b; font-size: 0.75rem; margin-top: 4px;">Slot Posisi ${idx + 1}</small>
                      </div>
                    `}
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- 2. AREA DEK KARTU TERSEDIA -->
          <div class="tc-deck-section">
            <div class="tc-deck-header">
              <div class="tc-section-title" style="margin-bottom: 0;">
                <span>🃏</span>
                <span>DEK KARTU TERSEDIA (${deckCards.length} KARTU BELUM DITEMPATKAN)</span>
              </div>
              <small style="color: #94a3b8;">Klik kartu untuk mengintip isi materi atau pilih untuk meletakkan.</small>
            </div>

            <div class="tc-deck-grid" id="deck-cards-grid">
              ${deckCards.length === 0 ? `
                <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: #4ade80;">
                  🎉 Seluruh kartu telah ditempatkan pada 4 slot posisi! Anda dapat menukar posisi kartu atau menekan tombol CEK JAWABAN.
                </div>
              ` : deckCards.map((card) => {
                const isFlipped = cardFlippedState.get(card.id);
                const isSelected = selectedCardForMove?.id === card.id;
                return `
                  <div 
                    class="tc-clash-card deck-card ${isSelected ? 'selected-for-move' : ''}" 
                    draggable="true" 
                    data-card-id="${card.id}"
                    data-from-deck="true"
                  >
                    ${isSelected ? `<span class="tc-card-selected-pill">SIAP DIPINDAHKAN</span>` : ''}
                    <div class="tc-card-inner ${isFlipped ? '' : 'flipped'}">
                      <!-- Front Face -->
                      <div class="tc-card-face tc-card-front">
                        <div class="tc-card-header">
                          <span class="tc-card-pos-badge">Dek</span>
                          <span class="tc-card-cat-badge">${card.category}</span>
                        </div>
                        <div class="tc-card-illustration">
                          ${card.illustrationSvg}
                        </div>
                        <h4 class="tc-card-title">${card.title}</h4>
                        <p class="tc-card-def">${card.definition}</p>
                        <div class="tc-card-tags">${card.keywords}</div>
                      </div>

                      <!-- Back Face -->
                      <div class="tc-card-face tc-card-back">
                        <div class="tc-card-back-pattern"></div>
                        <div class="tc-card-back-crest">🔥</div>
                        <div class="tc-card-back-title">MISI KALOR</div>
                        <div class="tc-card-back-sub">THERMO CHAMPIONS</div>
                        <div class="tc-card-back-hint">👁️ Klik untuk Buka / Intip</div>
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- 3. STICKY BOTTOM SUBMIT BAR -->
          <div class="tc-sticky-submit-bar">
            <div class="tc-submit-status">
              Status Susunan: <strong>${filledCount} dari 4 Posisi Terisi</strong>
              ${!canSubmit ? ' — Lengkapi semua slot sebelum memeriksa jawaban' : ' — Siap diperiksa!'}
            </div>

            <button 
              id="btn-g1-check-answer" 
              class="tc-btn tc-btn-primary tc-btn-large ${!canSubmit ? 'tc-btn-disabled' : ''}" 
              ${!canSubmit ? 'disabled' : ''}
              style="min-width: 200px;"
            >
              <span>CEK JAWABAN</span>
              <span>🔍</span>
            </button>
          </div>
        </div>
      `;

      attachRecallInteractions();
    }

    function attachRecallInteractions() {
      // 1. Click to Flip Card (Peek inside)
      const allCards = container.querySelectorAll('.tc-clash-card');
      allCards.forEach((cardEl) => {
        cardEl.addEventListener('click', (e) => {
          // If clicked the remove button, let remove handler take it
          if (e.target.closest('.tc-btn-remove-card')) return;

          const cardId = cardEl.dataset.cardId;
          const currentFlipped = cardFlippedState.get(cardId);
          cardFlippedState.set(cardId, !currentFlipped);
          audio.playCardFlip();

          const inner = cardEl.querySelector('.tc-card-inner');
          if (inner) {
            inner.classList.toggle('flipped', currentFlipped);
          }
        });
      });

      // 2. Click to Select & Place (Mobile & Tap-friendly)
      // When tapping a card in deck
      const deckCardEls = container.querySelectorAll('.deck-card');
      deckCardEls.forEach((cardEl) => {
        cardEl.addEventListener('dblclick', (e) => {
          e.stopPropagation();
          // Double click moves to first empty slot
          const cardId = cardEl.dataset.cardId;
          const cardObj = deckCards.find((c) => c.id === cardId);
          const firstEmpty = targetSlots.findIndex((s) => s === null);
          if (cardObj && firstEmpty !== -1) {
            deckCards = deckCards.filter((c) => c.id !== cardId);
            targetSlots[firstEmpty] = cardObj;
            selectedCardForMove = null;
            audio.playClick();
            renderRecallDOM();
          }
        });

        // Tap selection
        cardEl.addEventListener('contextmenu', (e) => e.preventDefault());
      });

      // Clicking an empty slot or placeholder
      const slotPlaceholders = container.querySelectorAll('.tc-slot-placeholder, .tc-drop-slot.empty');
      slotPlaceholders.forEach((el) => {
        el.addEventListener('click', () => {
          const slotIdx = parseInt(el.closest('.tc-drop-slot').dataset.slotIndex, 10);
          if (selectedCardForMove) {
            // Move selected card to this slot
            if (selectedCardForMove.fromDeck) {
              deckCards = deckCards.filter((c) => c.id !== selectedCardForMove.id);
            } else if (selectedCardForMove.fromSlot !== undefined) {
              targetSlots[selectedCardForMove.fromSlot] = null;
            }
            targetSlots[slotIdx] = selectedCardForMove.cardObj;
            selectedCardForMove = null;
            audio.playClick();
            renderRecallDOM();
          } else if (deckCards.length > 0) {
            // If no card selected, pick the first deck card into this slot
            const firstCard = deckCards[0];
            deckCards = deckCards.slice(1);
            targetSlots[slotIdx] = firstCard;
            audio.playClick();
            renderRecallDOM();
          }
        });
      });

      // Remove button on placed card
      const removeBtns = container.querySelectorAll('.tc-btn-remove-card');
      removeBtns.forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const slotIdx = parseInt(btn.dataset.removeSlot, 10);
          const removedCard = targetSlots[slotIdx];
          if (removedCard) {
            targetSlots[slotIdx] = null;
            deckCards.push(removedCard);
            audio.playClick();
            renderRecallDOM();
          }
        });
      });

      // 3. HTML5 Drag & Drop Engine
      let draggedCardId = null;
      let draggedFromSlot = null;
      let draggedFromDeck = false;

      allCards.forEach((cardEl) => {
        cardEl.addEventListener('dragstart', (e) => {
          draggedCardId = cardEl.dataset.cardId;
          draggedFromDeck = cardEl.dataset.fromDeck === 'true';
          draggedFromSlot = cardEl.dataset.fromSlot !== undefined ? parseInt(cardEl.dataset.fromSlot, 10) : null;
          e.dataTransfer.setData('text/plain', draggedCardId);
          cardEl.style.opacity = '0.5';
        });

        cardEl.addEventListener('dragend', () => {
          cardEl.style.opacity = '1';
          container.querySelectorAll('.tc-drop-slot').forEach((s) => s.classList.remove('drag-over'));
        });
      });

      const dropSlots = container.querySelectorAll('.tc-drop-slot');
      dropSlots.forEach((slotEl) => {
        slotEl.addEventListener('dragover', (e) => {
          e.preventDefault();
          slotEl.classList.add('drag-over');
        });

        slotEl.addEventListener('dragleave', () => {
          slotEl.classList.remove('drag-over');
        });

        slotEl.addEventListener('drop', (e) => {
          e.preventDefault();
          slotEl.classList.remove('drag-over');
          const targetSlotIdx = parseInt(slotEl.dataset.slotIndex, 10);
          if (!draggedCardId) return;

          // Find the card object
          let cardObj = CLASH_SHUFFLE_CARDS.find((c) => c.id === draggedCardId);
          if (!cardObj) return;

          const existingCardInTarget = targetSlots[targetSlotIdx];

          if (draggedFromDeck) {
            deckCards = deckCards.filter((c) => c.id !== draggedCardId);
            if (existingCardInTarget) {
              deckCards.push(existingCardInTarget);
            }
            targetSlots[targetSlotIdx] = cardObj;
          } else if (draggedFromSlot !== null) {
            // Swap between slots
            targetSlots[draggedFromSlot] = existingCardInTarget;
            targetSlots[targetSlotIdx] = cardObj;
          }

          audio.playClick();
          renderRecallDOM();
        });
      });

      // 4. Tombol Cek Jawaban
      const btnCheck = container.querySelector('#btn-g1-check-answer');
      if (btnCheck) {
        btnCheck.addEventListener('click', async () => {
          audio.playClick();

          const emptyIdx = targetSlots.findIndex((s) => s === null);
          if (emptyIdx !== -1) {
            toast.warning('Pastikan keempat posisi kartu telah terisi!');
            return;
          }

          btnCheck.disabled = true;
          btnCheck.innerHTML = `<span>MEMERIKSA JAWABAN...</span> <span class="tc-radar-spinner"></span>`;

          const submittedOrder = targetSlots.map((s) => s.id);

          try {
            const result = await firebaseService.submitClashShuffle(activeCode, activeTeam, submittedOrder);
            toast.success(`Pemeriksaan Selesai! Skor: ${result.score} Poin`);
            renderResultStage(result, targetSlots);
          } catch (err) {
            toast.error('Gagal mengirimkan jawaban: ' + err.message);
            btnCheck.disabled = false;
            btnCheck.innerHTML = `<span>CEK JAWABAN</span> <span>🔍</span>`;
          }
        });
      }
    }
  }

  // =========================================================================
  // 5. HALAMAN HASIL & PEMBAHASAN
  // =========================================================================
  function renderResultStage(result, placedCards) {
    if (result.score >= 75) {
      audio.playCorrect();
      particleService.burst(window.innerWidth / 2, window.innerHeight / 3, 35);
    } else {
      audio.playWrong();
    }

    // Feedback narrative based on score & tailored to subsequent sessions
    let feedbackNarrative = '';
    let badgeTierClass = '';
    if (result.score === 100) {
      badgeTierClass = 'champion';
      feedbackNarrative = `
        🏆 <strong>LUAR BIASA! SKOR SEMPURNA (100 / 100 POIN)!</strong><br/>
        Kelompok Anda memiliki daya ingat dan ketelitian termal tingkat master! Seluruh 4 kartu berada tepat pada posisinya. Pertahankan keunggulan penuh ini di babak <strong>Game 2 (Word Scramble)</strong> dan <strong>Game 3 (Extreme Addition)</strong>!
      `;
    } else if (result.score === 75) {
      badgeTierClass = 'expert';
      feedbackNarrative = `
        ⚡ <strong>HEBAT SEKALI! (75 / 100 POIN)</strong><br/>
        3 dari 4 kartu berada pada posisi yang tepat! Pemahaman materi kalor kelompok Anda sudah sangat baik. Kejar poin penuh di babak Word Scramble dan Extreme Addition berikutnya!
      `;
    } else if (result.score === 50) {
      badgeTierClass = 'challenger';
      feedbackNarrative = `
        🔬 <strong>BAGUS! (50 / 100 POIN)</strong><br/>
        2 dari 4 kartu tepat pada posisinya. Kerja sama tim sudah mulai terbentuk. Perkuat konsentrasi dan koordinasi untuk mengumpulkan poin maksimal di sesi selanjutnya!
      `;
    } else if (result.score === 25) {
      badgeTierClass = 'explorer';
      feedbackNarrative = `
        🧭 <strong>CUKUP BAIK! (25 / 100 POIN)</strong><br/>
        1 kartu tepat pada posisi awal. Jangan patah semangat, kompetisi masih panjang! Kumpulkan poin berharga di babak <strong>Game 2 (Word Scramble)</strong> dan <strong>Game 3 (Extreme Addition)</strong>!
      `;
    } else {
      badgeTierClass = 'rookie';
      feedbackNarrative = `
        🧪 <strong>TETAP SEMANGAT! (0 / 100 POIN)</strong><br/>
        Belum ada kartu yang tepat pada posisinya. Jangan berkecil hati, jadikan pengalaman ini untuk mempelajari kembali konsep kalor dan bangkit merebut poin di babak permainan berikutnya!
      `;
    }

    container.innerHTML = `
      <div class="tc-view tc-game1-view">
        <div class="tc-result-card">
          <!-- Result Header -->
          <div class="tc-result-header">
            <div class="tc-badge-lab"><span class="tc-pulse-dot"></span> HASIL EVALUASI MISI 1</div>
            <h1 class="tc-g1-title">HASIL SHUFFLE & RECALL</h1>
            <div class="tc-g1-subtitle">KELOMPOK ${activeTeam} — ${activeTeamName}</div>

            <!-- Big Score Hero Display -->
            <div class="tc-score-hero-box">
              <span class="tc-score-big-val">${result.score}</span>
              <span class="tc-score-max-lbl">DARI TOTAL MAKSIMAL 100 POIN</span>
            </div>

            <!-- Accuracy Badges Row -->
            <div class="tc-accuracy-row">
              <div class="tc-acc-badge correct">
                <span>✅</span>
                <span>${result.correctCount} Kartu Benar (+${result.score} Poin)</span>
              </div>
              <div class="tc-acc-badge wrong">
                <span>❌</span>
                <span>${result.wrongCount} Kartu Salah (0 Poin)</span>
              </div>
            </div>
          </div>

          <!-- Educational Feedback Box -->
          <div class="tc-feedback-box">
            ${feedbackNarrative}
          </div>

          <!-- Susunan Jawaban Pemain vs Kunci Jawaban Benar -->
          <div class="tc-comparison-section">
            <h3 class="tc-section-title">
              <span>🔍</span>
              <span>SUSUNAN JAWABAN KELOMPOK VS KUNCI JAWABAN BENAR</span>
            </h3>

            <div class="tc-comparison-grid">
              ${[0, 1, 2, 3].map((slotIdx) => {
                const userCardId = result.submittedOrder[slotIdx];
                const correctCardId = result.correctOrder[slotIdx];
                const isCorrect = userCardId === correctCardId;

                const userCard = CLASH_SHUFFLE_CARDS.find((c) => c.id === userCardId);
                const correctCard = CLASH_SHUFFLE_CARDS.find((c) => c.id === correctCardId);

                return `
                  <div class="tc-comp-card ${isCorrect ? 'is-correct' : 'is-wrong'}">
                    <div class="tc-comp-slot-title">
                      <span>POSISI ${slotIdx + 1}</span>
                      <span class="tc-comp-status-icon">${isCorrect ? '✅ BENAR (+25)' : '❌ SALAH (0)'}</span>
                    </div>

                    <!-- Thumbnail of chosen card -->
                    <div class="tc-comp-thumb">
                      ${userCard?.illustrationSvg || ''}
                    </div>

                    <div class="tc-comp-choice-lbl">Jawaban Kelompok:</div>
                    <div class="tc-comp-choice-val">${userCard?.title || '-'}</div>

                    <!-- Correct Key Reference -->
                    <div class="tc-comp-correct-key">
                      <strong>Kunci Posisi ${slotIdx + 1}:</strong><br/>
                      ${correctCard?.title}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Footer Action Button: Pindah ke Sesi Permainan Berikutnya -->
          <div class="tc-result-footer-actions">
            <button id="btn-g1-next-session" class="tc-btn tc-btn-primary tc-btn-large">
              <span>PINDAH KE SESI BERIKUTNYA (GAME 2: WORD SCRAMBLE)</span>
              <span>➡️</span>
            </button>
          </div>
        </div>
      </div>
    `;

    const btnNext = container.querySelector('#btn-g1-next-session');
    if (btnNext) {
      btnNext.addEventListener('click', () => {
        audio.playClick();
        cleanup();
        if (onNextGame) {
          onNextGame();
        } else if (onPhaseChange) {
          onPhaseChange('GAME2');
        }
      });
    }
  }

  function cleanup() {
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
    if (sessionUnsubscribe) {
      sessionUnsubscribe();
      sessionUnsubscribe = null;
    }
  }

  return {
    destroy: cleanup
  };
}
