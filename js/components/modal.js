/**
 * THERMO CHAMPIONS: HEAT EDITION
 * Sci-Fi Laboratory Modal Dialog Component
 */

import { audio } from '../services/audio-service.js';

export function showLabModal({ title, contentHtml, confirmText = 'Lanjutkan', cancelText = null, onConfirm, onCancel }) {
  const overlay = document.createElement('div');
  overlay.className = 'tc-modal-overlay';

  overlay.innerHTML = `
    <div class="tc-modal-card">
      <div class="tc-modal-header">
        <div class="tc-modal-tag">SYSTEM PROTOCOL</div>
        <h3 class="tc-modal-title">${title}</h3>
      </div>
      <div class="tc-modal-body">
        ${contentHtml}
      </div>
      <div class="tc-modal-footer">
        ${cancelText ? `<button class="tc-btn tc-btn-secondary tc-modal-cancel">${cancelText}</button>` : ''}
        <button class="tc-btn tc-btn-primary tc-modal-confirm">${confirmText}</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  audio.playCardFlip();

  const close = () => {
    overlay.classList.add('closing');
    setTimeout(() => overlay.remove(), 250);
  };

  const confirmBtn = overlay.querySelector('.tc-modal-confirm');
  confirmBtn.addEventListener('click', () => {
    audio.playClick();
    close();
    if (onConfirm) onConfirm();
  });

  const cancelBtn = overlay.querySelector('.tc-modal-cancel');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      audio.playClick();
      close();
      if (onCancel) onCancel();
    });
  }

  return { close };
}
