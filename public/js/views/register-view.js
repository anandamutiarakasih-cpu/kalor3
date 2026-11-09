/**
 * THERMO CHAMPIONS: HEAT EDITION
 * Team Registration View (Kelompok 1 - 8 & Dynamic Roster)
 */

import { firebaseService } from '../services/firebase-service.js';
import { audio } from '../services/audio-service.js';
import { toast } from '../components/notification.js';

export async function renderRegisterView(container, { sessionCode, onRegistered, onBack }) {
  // Show pleasant loading state while connecting to cloud session
  container.innerHTML = `
    <div class="tc-view tc-register-view">
      <div class="tc-card" style="text-align: center; max-width: 480px; margin: 4rem auto; padding: 2.5rem 1.5rem;">
        <div class="tc-radar-spinner" style="margin: 0 auto 1.5rem auto; width: 42px; height: 42px;"></div>
        <h3 style="font-size: 1.3rem; margin-bottom: 0.4rem;">Menghubungkan ke Sesi ${sessionCode}...</h3>
        <p style="color: #94a3b8; font-size: 0.88rem;">Menyinkronkan data ruangan kelas dari server online...</p>
      </div>
    </div>
  `;

  // Fetch session with fast fallback
  let session = await firebaseService.getSession(sessionCode);
  if (!session) {
    await new Promise((r) => setTimeout(r, 600));
    session = await firebaseService.getSession(sessionCode);
  }

  if (!session) {
    session = {
      code: sessionCode,
      title: 'Sesi Pembelajaran Kalor SMP',
      status: 'LOBBY',
      currentPhase: 'LOBBY',
      teams: {}
    };
  }

  const existingTeams = session.teams || {};
  let selectedNumber = 1;

  // Find first unclaimed team number
  for (let i = 1; i <= 8; i++) {
    if (!existingTeams[`team_${i}`] || !existingTeams[`team_${i}`].claimed) {
      selectedNumber = i;
      break;
    }
  }

  container.innerHTML = `
    <div class="tc-view tc-register-view">
      <div class="tc-top-bar">
        <button id="btn-reg-back" class="tc-btn tc-btn-ghost">← Kembali</button>
        <div class="tc-session-tag">SESI: <strong>${sessionCode}</strong></div>
      </div>

      <div class="tc-card tc-reg-card">
        <div class="tc-card-header">
          <div class="tc-badge-lab">REGISTRASI PESERTA DIDIK</div>
          <h2 class="tc-card-title">Pilih Kelompok & Anggota</h2>
          <p class="tc-card-subtitle">Satu kelompok menggunakan 1 perangkat untuk berkompetisi bersama.</p>
        </div>

        <form id="form-team-reg" class="tc-form">
          <!-- Step 1: Pick Team Number 1 - 8 -->
          <div class="tc-form-section">
            <label class="tc-form-label">PILIH NOMOR KELOMPOK (1–8)</label>
            <div class="tc-team-selector" id="team-selector-grid">
              ${[1, 2, 3, 4, 5, 6, 7, 8].map((n) => {
                const isClaimed = existingTeams[`team_${n}`] && existingTeams[`team_${n}`].claimed;
                const isSelected = n === selectedNumber && !isClaimed;
                return `
                  <button 
                    type="button" 
                    class="tc-team-num-btn ${isClaimed ? 'claimed' : ''} ${isSelected ? 'selected' : ''}" 
                    data-team="${n}"
                    ${isClaimed ? 'disabled title="Kelompok ini sudah diambil"' : ''}
                  >
                    <span class="tc-num-val">${n}</span>
                    <span class="tc-num-status">${isClaimed ? 'Terisi' : 'Tersedia'}</span>
                  </button>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Step 2: Team Name -->
          <div class="tc-form-section">
            <label for="input-team-name" class="tc-form-label">NAMA KELOMPOK</label>
            <input 
              type="text" 
              id="input-team-name" 
              class="tc-input" 
              placeholder="Contoh: Kalor Squad / Tim Joule / Al-Jazari" 
              value="Kelompok ${selectedNumber}" 
              required
            />
          </div>

          <!-- Step 3: Members Roster -->
          <div class="tc-form-section">
            <div class="tc-section-header-flex">
              <label class="tc-form-label">DAFTAR ANGGOTA KELOMPOK</label>
              <button type="button" id="btn-add-member" class="tc-btn tc-btn-sm tc-btn-secondary">
                + Tambah Anggota
              </button>
            </div>
            
            <div id="members-list-container" class="tc-members-container">
              <!-- Default member row 1 -->
              <div class="tc-member-row" data-index="0">
                <input type="text" class="tc-input tc-input-member-name" placeholder="Nama Lengkap Siswa" required />
                <input type="number" class="tc-input tc-input-member-absen" placeholder="No. Absen" min="1" max="50" required />
                <button type="button" class="tc-btn-icon tc-btn-remove-member" title="Hapus Anggota" disabled>×</button>
              </div>
            </div>
          </div>

          <!-- Submit Button -->
          <div class="tc-form-actions">
            <button type="submit" class="tc-btn tc-btn-primary tc-btn-large tc-btn-block" id="btn-submit-reg">
              <span>GABUNG KE LOBI PERMAINAN</span>
              <span>⚡</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  const grid = container.querySelector('#team-selector-grid');
  const inputTeamName = container.querySelector('#input-team-name');
  const membersContainer = container.querySelector('#members-list-container');
  const btnAddMember = container.querySelector('#btn-add-member');
  const btnBack = container.querySelector('#btn-reg-back');
  const form = container.querySelector('#form-team-reg');

  // Handle Team Number Selection
  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('.tc-team-num-btn');
    if (!btn || btn.disabled) return;
    audio.playClick();

    grid.querySelectorAll('.tc-team-num-btn').forEach((b) => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedNumber = parseInt(btn.dataset.team, 10);

    // Auto update default name if generic
    if (/^Kelompok\s\d+$/i.test(inputTeamName.value)) {
      inputTeamName.value = `Kelompok ${selectedNumber}`;
    }
  });

  // Add Member Row
  btnAddMember.addEventListener('click', () => {
    audio.playClick();
    const count = membersContainer.querySelectorAll('.tc-member-row').length;
    if (count >= 8) {
      toast.warning('Maksimal 8 anggota per kelompok.');
      return;
    }

    const row = document.createElement('div');
    row.className = 'tc-member-row';
    row.dataset.index = count;
    row.innerHTML = `
      <input type="text" class="tc-input tc-input-member-name" placeholder="Nama Lengkap Siswa" required />
      <input type="number" class="tc-input tc-input-member-absen" placeholder="No. Absen" min="1" max="50" required />
      <button type="button" class="tc-btn-icon tc-btn-remove-member" title="Hapus Anggota">×</button>
    `;
    membersContainer.appendChild(row);
    updateRemoveButtons();
  });

  // Remove Member Row
  membersContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('.tc-btn-remove-member');
    if (!btn || btn.disabled) return;
    audio.playClick();
    const row = btn.closest('.tc-member-row');
    if (row) row.remove();
    updateRemoveButtons();
  });

  function updateRemoveButtons() {
    const rows = membersContainer.querySelectorAll('.tc-member-row');
    rows.forEach((r, idx) => {
      const btn = r.querySelector('.tc-btn-remove-member');
      if (btn) {
        btn.disabled = rows.length === 1;
      }
    });
  }

  // Back button
  btnBack.addEventListener('click', () => {
    audio.playClick();
    if (confirm('Kembali ke menu awal? Pilihan kelompok dan nama anggota akan dibatalkan.')) {
      if (onBack) onBack();
    }
  });

  // Form Submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    audio.playClick();

    const teamName = inputTeamName.value.trim();
    if (!teamName) {
      toast.error('Nama kelompok wajib diisi.');
      return;
    }

    const memberRows = membersContainer.querySelectorAll('.tc-member-row');
    const members = [];
    memberRows.forEach((r) => {
      const name = r.querySelector('.tc-input-member-name').value.trim();
      const absen = r.querySelector('.tc-input-member-absen').value.trim();
      if (name) {
        members.push({ name, absen });
      }
    });

    if (members.length === 0) {
      toast.error('Tambahkan minimal 1 anggota kelompok.');
      return;
    }

    const submitBtn = container.querySelector('#btn-submit-reg');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Mendaftarkan...';

    try {
      await firebaseService.joinSession(sessionCode, selectedNumber, teamName, members);
      toast.success(`Berhasil bergabung sebagai Kelompok ${selectedNumber}!`);
      if (onRegistered) onRegistered(sessionCode, selectedNumber);
    } catch (err) {
      toast.error(err.message || 'Gagal mendaftar ke sesi.');
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<span>GABUNG KE LOBI PERMAINAN</span><span>⚡</span>`;
    }
  });
}
