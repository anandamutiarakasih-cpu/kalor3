/**
 * THERMO CHAMPIONS: HEAT EDITION
 * Sci-Fi HUD Notifications & Toast System
 */

class NotificationService {
  constructor() {
    this.container = null;
  }

  ensureContainer() {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'tc-toast-container';
      document.body.appendChild(this.container);
    }
  }

  show(message, type = 'info', duration = 3200) {
    this.ensureContainer();

    const toast = document.createElement('div');
    toast.className = `tc-toast tc-toast-${type}`;

    let icon = '⚡';
    if (type === 'success') icon = '✅';
    else if (type === 'error') icon = '⚠️';
    else if (type === 'warning') icon = '🔥';

    toast.innerHTML = `
      <span class="tc-toast-icon">${icon}</span>
      <span class="tc-toast-msg">${message}</span>
    `;

    this.container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('hide');
      setTimeout(() => toast.remove(), 350);
    }, duration);
  }

  success(msg) { this.show(msg, 'success'); }
  error(msg) { this.show(msg, 'error', 4000); }
  warning(msg) { this.show(msg, 'warning'); }
  info(msg) { this.show(msg, 'info'); }
}

export const toast = new NotificationService();
