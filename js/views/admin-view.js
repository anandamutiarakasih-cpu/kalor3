/**
 * THERMO CHAMPIONS: HEAT EDITION
 * Teacher / Admin Mission Control View
 */

import { firebaseService } from '../services/firebase-service.js';
import { audio } from '../services/audio-service.js';
import { toast } from '../components/notification.js';
import { exportSessionToCSV } from '../services/export-service.js';
import { firebaseConfig, ADMIN_CREDENTIALS } from '../config/firebase-config.js';

export function renderAdminView(container, { onExit }) {
  let activeSessionCode = null;
  let unsubscribe = null;
  let currentSessionData = null;

  // Initial State: Admin Passcode Login
  container.innerHTML = `
    <div class="tc-view tc-admin-view">
      <div class="tc-top-bar">
        <button id="btn-admin-exit" class="tc-btn tc-btn-ghost">← Keluar</button>
        <div class="tc-badge-lab">ADMIN CONSOLE</div>
      </div>

      <div class="tc-card tc-admin-login-card" id="admin-auth-card">
        <div class="tc-role-icon">🔬</div>
        <h2 class="tc-card-title">Pusat Otoritas Guru Fisika</h2>
        <p class="tc-card-subtitle">Masukkan kode otentikasi instruktur untuk membuka kontrol sesi.</p>

        <form id="form-admin-login" class="tc-form">
          <div class="tc-input-group">
            <label for="admin-pass">KODE AKSES INSTRUKTUR</label>
            <input 
              type="password" 
              id="admin-pass" 
              class="tc-input" 
              placeholder="Masukkan kode akses guru" 
              value="THERMO2026"
              required 
            />
            <small class="tc-hint">Default Classroom Passcode: <code>THERMO2026</code></small>
          </div>
          <button type="submit" class="tc-btn tc-btn-primary tc-btn-block">
            <span>BUKA PUSAT KENDALI</span>
            <span>🔐</span>
          </button>
        </form>
      </div>

      <div id="admin-dashboard-container" style="display: none;"></div>
    </div>
  `;

  const btnExit = container.querySelector('#btn-admin-exit');
  btnExit.addEventListener('click', () => {
    audio.playClick();
    if (unsubscribe) unsubscribe();
    if (onExit) onExit();
  });

  const formLogin = container.querySelector('#form-admin-login');
  formLogin.addEventListener('submit', (e) => {
    e.preventDefault();
    audio.playClick();
    const pass = container.querySelector('#admin-pass').value.trim();
    if (pass === ADMIN_CREDENTIALS.passcode) {
      toast.success('Otentikasi Berhasil. Selamat bertugas!');
      container.querySelector('#admin-auth-card').style.display = 'none';
      renderDashboard();
    } else {
      toast.error('Kode akses salah. Coba periksa kembali.');
    }
  });

  function renderDashboard() {
    const dashEl = container.querySelector('#admin-dashboard-container');
    dashEl.style.display = 'block';

    dashEl.innerHTML = `
      <div class="tc-admin-cockpit">
        <!-- Dashboard Top Header -->
        <div class="tc-cockpit-header">
          <div>
            <div class="tc-badge-lab"><span class="tc-pulse-dot"></span> PUSAT KOMANDO REALTIME</div>
            <h2 class="tc-cockpit-title">Kontrol Sesi & Pemantauan 8 Kelompok</h2>
          </div>
          
          <div class="tc-cockpit-session-box" id="session-box-controls">
            <div class="tc-code-display">
              <span class="tc-code-lbl">KODE SESI SISWA</span>
              <span class="tc-code-val" id="disp-session-code">BELUM DIBUAT</span>
            </div>
            <div class="tc-code-btn-group">
              <button id="btn-copy-code" class="tc-btn tc-btn-sm tc-btn-outline" title="Salin Kode">📋 Salin</button>
              <button id="btn-copy-link" class="tc-btn tc-btn-sm tc-btn-secondary" title="Salin Link HP Siswa">🔗 Salin Link HP</button>
              <button id="btn-create-new-session" class="tc-btn tc-btn-sm tc-btn-primary">+ Sesi Baru</button>
            </div>
          </div>
        </div>

        <!-- Master Phase Controller Bar -->
        <div class="tc-card tc-phase-bar-card">
          <div class="tc-phase-bar-title">KENDALI FASE PERMAINAN (TERSYNCHRONIZE KE SEMUA KELOMPOK)</div>
          <div class="tc-phase-btn-row">
            <button class="tc-btn tc-btn-phase" data-phase="LOBBY" id="phase-btn-lobby">
              <span class="tc-phase-num">0</span>
              <span>Lobi Persiapan</span>
            </button>
            <button class="tc-btn tc-btn-phase" data-phase="GAME1_MEMORIZE" id="phase-btn-g1-mem">
              <span class="tc-phase-num">1A</span>
              <span>Game 1: Menghafal (35s)</span>
            </button>
            <button class="tc-btn tc-btn-phase" data-phase="GAME1_PLAY" id="phase-btn-g1-play">
              <span class="tc-phase-num">1B</span>
              <span>Game 1: Susun & Cocokkan (75s)</span>
            </button>
            <button class="tc-btn tc-btn-phase" data-phase="GAME2" id="phase-btn-g2">
              <span class="tc-phase-num">2</span>
              <span>Game 2: Word Scramble</span>
            </button>
            <button class="tc-btn tc-btn-phase" data-phase="GAME3" id="phase-btn-g3">
              <span class="tc-phase-num">3</span>
              <span>Game 3: Extreme Addition (120s)</span>
            </button>
            <button class="tc-btn tc-btn-phase gold" data-phase="FINISHED" id="phase-btn-finish">
              <span class="tc-phase-num">🏆</span>
              <span>Buka Leaderboard</span>
            </button>
          </div>
        </div>

        <!-- Quick Tools Bar -->
        <div class="tc-admin-tools-row">
          <button id="btn-export-csv" class="tc-btn tc-btn-secondary">
            <span>📥 Unduh Rekap Hasil (CSV)</span>
          </button>
          <button id="btn-simulate-teams" class="tc-btn tc-btn-outline" title="Isi otomatis 8 kelompok contoh untuk simulasi kelas cepat">
            <span>⚡ Simulasi 8 Kelompok Uji</span>
          </button>
          <button id="btn-reset-session" class="tc-btn tc-btn-ghost danger">
            <span>🔄 Reset Nilai Sesi</span>
          </button>
        </div>

        <!-- Live Teams Monitoring Grid (8 Teams) -->
        <div class="tc-admin-monitor-section">
          <div class="tc-monitor-header-row">
            <h3 class="tc-monitor-title">Live Scoreboard 8 Kelompok</h3>
            <span class="tc-live-indicator"><span class="tc-pulse-dot"></span> PEMBARUAN OTOMATIS</span>
          </div>

          <div class="tc-admin-teams-grid" id="admin-teams-grid">
            ${[1, 2, 3, 4, 5, 6, 7, 8].map((n) => `
              <div class="tc-card tc-admin-team-card" id="admin-team-card-${n}">
                <div class="tc-atc-top">
                  <div class="tc-atc-num">KELOMPOK ${n}</div>
                  <span class="tc-atc-badge offline" id="atc-badge-${n}">Belum Masuk</span>
                </div>
                <h4 class="tc-atc-name" id="atc-name-${n}">-</h4>
                <div class="tc-atc-members" id="atc-members-${n}">-</div>

                <div class="tc-atc-scores">
                  <div class="tc-score-col">
                    <span class="tc-sc-lbl">G1 (30)</span>
                    <strong class="tc-sc-val" id="atc-g1-${n}">0</strong>
                  </div>
                  <div class="tc-score-col">
                    <span class="tc-sc-lbl">G2 (35)</span>
                    <strong class="tc-sc-val" id="atc-g2-${n}">0</strong>
                  </div>
                  <div class="tc-score-col">
                    <span class="tc-sc-lbl">G3 (35)</span>
                    <strong class="tc-sc-val" id="atc-g3-${n}">0</strong>
                  </div>
                  <div class="tc-score-col total">
                    <span class="tc-sc-lbl">TOTAL (100)</span>
                    <strong class="tc-sc-val" id="atc-total-${n}">0</strong>
                  </div>
                </div>

                <div class="tc-atc-footer">
                  <span class="tc-atc-predicate" id="atc-pred-${n}">Temperature Rookie</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    // Hook buttons
    const btnCreateSession = dashEl.querySelector('#btn-create-new-session');
    const btnCopyCode = dashEl.querySelector('#btn-copy-code');
    const btnCopyLink = dashEl.querySelector('#btn-copy-link');
    const btnExportCSV = dashEl.querySelector('#btn-export-csv');
    const btnSimulate = dashEl.querySelector('#btn-simulate-teams');
    const btnReset = dashEl.querySelector('#btn-reset-session');
    const dispCode = dashEl.querySelector('#disp-session-code');

    // Create Session
    btnCreateSession.addEventListener('click', async () => {
      audio.playClick();
      try {
        const session = await firebaseService.createSession();
        activeSessionCode = session.code;
        dispCode.textContent = activeSessionCode;
        toast.success(`Sesi ${activeSessionCode} aktif.`);
        attachSessionListener(activeSessionCode);
      } catch (err) {
        toast.error('Gagal membuat sesi: ' + err.message);
      }
    });

    // Copy Code
    btnCopyCode.addEventListener('click', () => {
      audio.playClick();
      if (!activeSessionCode) {
        toast.warning('Buat sesi terlebih dahulu.');
        return;
      }
      navigator.clipboard.writeText(activeSessionCode).then(() => {
        toast.success(`Kode ${activeSessionCode} disalin ke clipboard!`);
      }).catch(() => {
        toast.info(`Kode Sesi: ${activeSessionCode}`);
      });
    });

    // Copy Direct Student Link
    if (btnCopyLink) {
      btnCopyLink.addEventListener('click', () => {
        audio.playClick();
        if (!activeSessionCode) {
          toast.warning('Buat sesi terlebih dahulu.');
          return;
        }
        const studentUrl = new URL(window.location.origin + window.location.pathname);
        studentUrl.searchParams.set('session', activeSessionCode);
        if (firebaseConfig && firebaseConfig.databaseURL) {
          studentUrl.searchParams.set('db', firebaseConfig.databaseURL);
        }
        navigator.clipboard.writeText(studentUrl.toString()).then(() => {
          toast.success('Link HP Siswa disalin! Bagikan ke grup WhatsApp/kelas.');
        }).catch(() => {
          toast.info(studentUrl.toString());
        });
      });
    }

    // Phase Switch Buttons
    const phaseButtons = dashEl.querySelectorAll('.tc-btn-phase');
    phaseButtons.forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!activeSessionCode) {
          toast.warning('Buat sesi baru terlebih dahulu.');
          return;
        }
        audio.playClick();
        const targetPhase = btn.dataset.phase;
        try {
          await firebaseService.setSessionPhase(activeSessionCode, targetPhase);
          toast.success(`Fase sesi dialihkan ke: ${targetPhase}`);
        } catch (e) {
          toast.error('Gagal mengalihkan fase: ' + e.message);
        }
      });
    });

    // Export CSV
    btnExportCSV.addEventListener('click', () => {
      audio.playClick();
      if (!currentSessionData || !activeSessionCode) {
        toast.warning('Belum ada data sesi untuk diekspor.');
        return;
      }
      exportSessionToCSV(activeSessionCode, currentSessionData);
    });

    // Simulate 8 Teams (Great for evaluation/testing)
    btnSimulate.addEventListener('click', async () => {
      if (!activeSessionCode) {
        toast.warning('Buat sesi terlebih dahulu sebelum simulasi.');
        return;
      }
      audio.playClick();
      const mockNames = [
        { name: 'Tim Joule', members: [{ name: 'Ahmad Faiz', absen: '1' }, { name: 'Bella Safira', absen: '4' }] },
        { name: 'Sains Kalori', members: [{ name: 'Citra Kirana', absen: '7' }, { name: 'Dimas Anggara', absen: '10' }] },
        { name: 'Konduksi Squad', members: [{ name: 'Eka Pratama', absen: '12' }, { name: 'Fani Amelia', absen: '15' }] },
        { name: 'Radiasi Termal', members: [{ name: 'Galih Wicaksono', absen: '18' }, { name: 'Hani Rahma', absen: '21' }] },
        { name: 'Konveksi Flow', members: [{ name: 'Indra Lesmana', absen: '24' }, { name: 'Jessica Mila', absen: '27' }] },
        { name: 'Kelompok Kalor Lebur', members: [{ name: 'Kevin Julio', absen: '30' }, { name: 'Lia Ananta', absen: '33' }] },
        { name: 'Thermal Isolator', members: [{ name: 'Muhammad Rizki', absen: '35' }, { name: 'Nadia Vega', absen: '38' }] },
        { name: 'Clash of Heat', members: [{ name: 'Oki Setiana', absen: '40' }, { name: 'Putri Marino', absen: '42' }] }
      ];

      toast.info('Menyiapkan 8 kelompok simulasi...');
      for (let i = 1; i <= 8; i++) {
        const item = mockNames[i - 1];
        await firebaseService.joinSession(activeSessionCode, i, item.name, item.members);
      }
      toast.success('8 kelompok berhasil didaftarkan ke sesi!');
    });

    // Reset Session
    btnReset.addEventListener('click', async () => {
      if (!activeSessionCode) return;
      if (confirm('Apakah Anda yakin ingin me-reset seluruh skor dan progres pada sesi ini?')) {
        audio.playClick();
        await firebaseService.resetSession(activeSessionCode);
        toast.success('Sesi berhasil di-reset.');
      }
    });

    // Auto-create initial session if none exists
    btnCreateSession.click();
  }

  function attachSessionListener(sessionCode) {
    if (unsubscribe) unsubscribe();
    unsubscribe = firebaseService.listenToSession(sessionCode, (session) => {
      if (!session) return;
      currentSessionData = session;

      // Update Phase Buttons active state
      const curPhase = session.currentPhase || 'LOBBY';
      container.querySelectorAll('.tc-btn-phase').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.phase === curPhase);
      });

      // Update 8 Teams Cards
      const teams = session.teams || {};
      for (let i = 1; i <= 8; i++) {
        const t = teams[`team_${i}`];
        const card = container.querySelector(`#admin-team-card-${i}`);
        if (!card) continue;

        const badgeEl = container.querySelector(`#atc-badge-${i}`);
        const nameEl = container.querySelector(`#atc-name-${i}`);
        const membersEl = container.querySelector(`#atc-members-${i}`);
        const g1El = container.querySelector(`#atc-g1-${i}`);
        const g2El = container.querySelector(`#atc-g2-${i}`);
        const g3El = container.querySelector(`#atc-g3-${i}`);
        const totalEl = container.querySelector(`#atc-total-${i}`);
        const predEl = container.querySelector(`#atc-pred-${i}`);

        if (t && t.claimed) {
          card.classList.add('active-team');
          badgeEl.className = 'tc-atc-badge online';
          badgeEl.textContent = 'ONLINE';
          nameEl.textContent = t.name || `Kelompok ${i}`;

          const mList = (t.members || []).map((m) => `${m.name} (${m.absen})`).join(', ');
          membersEl.textContent = mList || 'Tanpa anggota';

          g1El.textContent = t.scores?.game1 || 0;
          g2El.textContent = t.scores?.game2 || 0;
          g3El.textContent = t.scores?.game3 || 0;
          totalEl.textContent = t.scores?.total || 0;
          predEl.textContent = t.predicate || 'Temperature Rookie';
        } else {
          card.classList.remove('active-team');
          badgeEl.className = 'tc-atc-badge offline';
          badgeEl.textContent = 'Belum Masuk';
          nameEl.textContent = `Kelompok ${i}`;
          membersEl.textContent = 'Menunggu pendaftaran siswa...';
          g1El.textContent = '0';
          g2El.textContent = '0';
          g3El.textContent = '0';
          totalEl.textContent = '0';
          predEl.textContent = 'Belum Aktif';
        }
      }
    });
  }

  return {
    destroy: () => {
      if (unsubscribe) unsubscribe();
    }
  };
}
