/**
 * THERMO CHAMPIONS: HEAT EDITION
 * Home View - Role & Session Gateway
 */

import { audio } from '../services/audio-service.js';
import { toast } from '../components/notification.js';

export function renderHomeView(container, { onJoinTeam, onOpenAdmin }) {
  const isMuted = audio.isMuted();

  container.innerHTML = `
    <div class="tc-view tc-home-view">
      <!-- Audio Toggle Button -->
      <button class="tc-audio-btn ${isMuted ? 'muted' : ''}" id="btn-audio-toggle" title="Toggle Suara">
        <span class="tc-audio-icon">${isMuted ? '🔇' : '🔊'}</span>
      </button>

      <!-- Thermal Lab Branding -->
      <header class="tc-home-header">
        <div class="tc-badge-lab">
          <span class="tc-pulse-dot"></span>
          LABORATORIUM FISIKA TERMAL SMP
        </div>
        <h1 class="tc-main-title">
          THERMO <span class="tc-text-gradient">CHAMPIONS</span>
        </h1>
        <div class="tc-sub-title">HEAT EDITION • CLASH OF ACADEMICS</div>
        <p class="tc-home-desc">
          Kompetisi sains materi Kalor untuk 8 kelompok siswa SMP secara realtime. 
          Uji daya ingat, kecepatan susun istilah, dan kalkulasi energi panas laboratorium!
        </p>
      </header>

      <!-- Role Selection Cards -->
      <div class="tc-role-grid">
        <!-- Student Team Card -->
        <div class="tc-card tc-role-card tc-role-student">
          <div class="tc-role-badge">PESERTA DIDIK</div>
          <div class="tc-role-icon">⚡</div>
          <h2 class="tc-role-name">Kelompok Siswa</h2>
          <p class="tc-role-info">
            Masuk bersama kelompokmu (1–8), registrasi anggota, dan bersiap mengikuti 3 babak kompetisi kalor.
          </p>

          <form id="form-quick-join" class="tc-join-form">
            <div class="tc-input-group">
              <label for="input-session-code">KODE SESI GURU</label>
              <input 
                type="text" 
                id="input-session-code" 
                class="tc-input" 
                placeholder="Contoh: TC4829" 
                maxlength="8" 
                required 
                autocomplete="off"
              />
            </div>
            <button type="submit" class="tc-btn tc-btn-primary tc-btn-block">
              <span>MASUK PERMAINAN</span>
              <span class="tc-btn-arrow">→</span>
            </button>
          </form>
        </div>

        <!-- Teacher / Admin Card -->
        <div class="tc-card tc-role-card tc-role-admin">
          <div class="tc-role-badge admin">GURU / INSTRUKTUR</div>
          <div class="tc-role-icon">🔬</div>
          <h2 class="tc-role-name">Pusat Kendali Guru</h2>
          <p class="tc-role-info">
            Buat sesi baru, pantau 8 kelompok secara live, kendalikan timer & babak permainan, serta unduh rekap skor CSV.
          </p>
          <div class="tc-admin-action-wrap">
            <button id="btn-goto-admin" class="tc-btn tc-btn-outline tc-btn-block">
              <span>LOGIN ADMIN</span>
              <span class="tc-btn-arrow">⚙️</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 3 Challenge Showcase Overview -->
      <div class="tc-preview-bar">
        <div class="tc-preview-item">
          <span class="tc-item-num">01</span>
          <div class="tc-item-content">
            <strong>Shuffle and Recall</strong>
            <span>Hafal & Cocokkan Konsep Kalor (Maks 30 Pts)</span>
          </div>
        </div>
        <div class="tc-preview-item">
          <span class="tc-item-num">02</span>
          <div class="tc-item-content">
            <strong>Word Scramble</strong>
            <span>Susun Huruf Istilah Kalor Cepat (Maks 35 Pts)</span>
          </div>
        </div>
        <div class="tc-preview-item">
          <span class="tc-item-num">03</span>
          <div class="tc-item-content">
            <strong>Extreme Addition</strong>
            <span>Kalkulasi Rumus Kalor Laboratorium (Maks 35 Pts)</span>
          </div>
        </div>
      </div>
    </div>
  `;

  // Audio button toggle listener
  const audioBtn = container.querySelector('#btn-audio-toggle');
  audioBtn.addEventListener('click', () => {
    const muted = audio.toggleMute();
    audioBtn.classList.toggle('muted', muted);
    audioBtn.querySelector('.tc-audio-icon').textContent = muted ? '🔇' : '🔊';
    toast.info(muted ? 'Suara dinonaktifkan' : 'Suara diaktifkan');
  });

  // Quick Join Form
  const formJoin = container.querySelector('#form-quick-join');
  formJoin.addEventListener('submit', (e) => {
    e.preventDefault();
    audio.playClick();
    let raw = container.querySelector('#input-session-code').value || '';
    let code = raw.replace(/\s+/g, '').toUpperCase();
    if (!code) {
      toast.error('Masukkan kode sesi terlebih dahulu.');
      return;
    }
    // Auto-normalize 4-digit code if user omitted TC prefix
    if (!code.startsWith('TC') && code.length === 4) {
      code = 'TC' + code;
    }
    if (onJoinTeam) onJoinTeam(code);
  });

  // Admin Portal Button
  const btnAdmin = container.querySelector('#btn-goto-admin');
  btnAdmin.addEventListener('click', () => {
    audio.playClick();
    if (onOpenAdmin) onOpenAdmin();
  });
}
