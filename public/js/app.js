/**
 * THERMO CHAMPIONS: HEAT EDITION
 * Main Controller & View Router
 */

import { particleService } from './services/particle-service.js';
import { firebaseService } from './services/firebase-service.js';
import { toast } from './components/notification.js';
import { renderHomeView } from './views/home-view.js';
import { renderRegisterView } from './views/register-view.js';
import { renderWaitingView } from './views/waiting-view.js';
import { renderAdminView } from './views/admin-view.js';
import { renderGame1View } from './views/game1-view.js';
import { renderGame2View } from './views/game2-view.js';
import { renderGame3View } from './views/game3-view.js';
import { renderLeaderboardView } from './views/leaderboard-view.js';

class ThermoChampionsApp {
  constructor() {
    this.appContainer = document.getElementById('app-main');
    this.canvas = document.getElementById('bg-canvas');
    this.currentViewInstance = null;
    this.currentRoute = null;
    this.state = {
      sessionCode: null,
      teamNumber: null
    };
  }

  init() {
    // Start Thermal Energy Ambient Particles
    if (this.canvas) {
      particleService.init(this.canvas);
    }

    // Confirmation warning on refresh or leaving while inside active session
    window.addEventListener('beforeunload', (e) => {
      if (this.currentRoute && this.currentRoute !== 'home') {
        e.preventDefault();
        const msg = 'Data permainan akan di-reset dan Anda akan kembali ke menu awal jika halaman dimuat ulang.';
        e.returnValue = msg;
        return msg;
      }
    });

    // Detect if page was refreshed/reloaded
    const isReloaded = this.detectReload();
    if (isReloaded) {
      // Clear stored session and reset state as requested
      firebaseService.clearStoredTeamSession();
      this.state.sessionCode = null;
      this.state.teamNumber = null;

      // Clean query string from URL so it doesn't auto-redirect
      try {
        if (window.history && window.history.replaceState) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      } catch (e) {}

      this.navigate('home');
      setTimeout(() => {
        toast.warning('Halaman dimuat ulang: Data sesi telah di-reset dan kembali ke menu awal.');
      }, 400);
      return;
    }

    // Normal non-reload entry: Check for existing saved team session
    const stored = firebaseService.getStoredTeamSession();
    if (stored && stored.sessionCode && stored.teamNumber) {
      this.state.sessionCode = stored.sessionCode;
      this.state.teamNumber = stored.teamNumber;
      this.reconnectSession(stored.sessionCode, stored.teamNumber);
    } else {
      // Check if session code was passed in URL (e.g. ?session=TC1234)
      let urlCode = null;
      try {
        if (typeof window !== 'undefined' && window.location && window.location.search) {
          const urlParams = new URLSearchParams(window.location.search);
          const rawCode = urlParams.get('session');
          if (rawCode) urlCode = rawCode.trim().toUpperCase();
        }
      } catch (e) {}

      if (urlCode) {
        this.state.sessionCode = urlCode;
        this.navigate('register', { sessionCode: urlCode });
      } else {
        this.navigate('home');
      }
    }
  }

  detectReload() {
    try {
      const navEntries = performance.getEntriesByType('navigation');
      if (navEntries && navEntries.length > 0) {
        return navEntries[0].type === 'reload';
      }
      if (window.performance && window.performance.navigation) {
        return window.performance.navigation.type === 1;
      }
    } catch (e) {}
    return false;
  }

  async reconnectSession(sessionCode, teamNumber) {
    try {
      const session = await firebaseService.getSession(sessionCode);
      if (session) {
        this.routeByPhase(session.currentPhase || 'LOBBY');
        return;
      }
    } catch (e) {
      console.warn('Reconnect error:', e);
    }
    // Fallback if session no longer exists
    firebaseService.clearStoredTeamSession();
    this.navigate('home');
  }

  routeByPhase(phase) {
    switch (phase) {
      case 'LOBBY':
        this.navigate('waiting');
        break;
      case 'GAME1':
      case 'GAME1_MEMORIZE':
      case 'GAME1_PLAY':
        this.navigate('game1');
        break;
      case 'GAME2':
        this.navigate('game2');
        break;
      case 'GAME3':
        this.navigate('game3');
        break;
      case 'FINISHED':
        this.navigate('leaderboard');
        break;
      default:
        this.navigate('waiting');
    }
  }

  navigate(route, params = {}) {
    if (this.currentViewInstance && typeof this.currentViewInstance.destroy === 'function') {
      this.currentViewInstance.destroy();
      this.currentViewInstance = null;
    }

    this.currentRoute = route;
    window.scrollTo({ top: 0, behavior: 'smooth' });

    switch (route) {
      case 'home':
        this.currentViewInstance = renderHomeView(this.appContainer, {
          onJoinTeam: (sessionCode) => {
            this.state.sessionCode = sessionCode;
            this.navigate('register', { sessionCode });
          },
          onOpenAdmin: () => {
            this.navigate('admin');
          }
        });
        break;

      case 'register':
        this.currentViewInstance = renderRegisterView(this.appContainer, {
          sessionCode: params.sessionCode || this.state.sessionCode,
          onRegistered: (code, num) => {
            this.state.sessionCode = code;
            this.state.teamNumber = num;
            this.navigate('waiting');
          },
          onBack: () => {
            this.navigate('home');
          }
        });
        break;

      case 'waiting':
        this.currentViewInstance = renderWaitingView(this.appContainer, {
          sessionCode: this.state.sessionCode,
          teamNumber: this.state.teamNumber,
          onPhaseChange: (newPhase) => {
            this.routeByPhase(newPhase);
          }
        });
        break;

      case 'admin':
        this.currentViewInstance = renderAdminView(this.appContainer, {
          onExit: () => {
            this.navigate('home');
          },
          onOpenLeaderboard: (sessionCode) => {
            if (sessionCode) this.state.sessionCode = sessionCode;
            this.navigate('leaderboard');
          }
        });
        break;

      case 'game1':
      case 'game1_memorize':
      case 'game1_play':
        this.currentViewInstance = renderGame1View(this.appContainer, {
          sessionCode: this.state.sessionCode,
          teamNumber: this.state.teamNumber,
          onNextGame: () => {
            this.navigate('game2');
          },
          onPhaseChange: (newPhase) => {
            this.routeByPhase(newPhase);
          }
        });
        break;

      case 'game2':
        this.currentViewInstance = renderGame2View(this.appContainer, {
          sessionCode: this.state.sessionCode,
          teamNumber: this.state.teamNumber,
          onPhaseChange: (newPhase) => {
            this.routeByPhase(newPhase);
          }
        });
        break;

      case 'game3':
        this.currentViewInstance = renderGame3View(this.appContainer, {
          sessionCode: this.state.sessionCode,
          teamNumber: this.state.teamNumber,
          onPhaseChange: (newPhase) => {
            this.routeByPhase(newPhase);
          }
        });
        break;

      case 'leaderboard':
        this.currentViewInstance = renderLeaderboardView(this.appContainer, {
          sessionCode: this.state.sessionCode,
          teamNumber: this.state.teamNumber,
          onHome: () => {
            firebaseService.clearStoredTeamSession();
            this.state.sessionCode = null;
            this.state.teamNumber = null;
            this.navigate('home');
          },
          onOpenAdmin: (sessionCode) => {
            if (sessionCode) this.state.sessionCode = sessionCode;
            this.navigate('admin');
          }
        });
        break;

      default:
        this.navigate('home');
    }
  }
}

// Bootstrap application on DOM load
window.addEventListener('DOMContentLoaded', () => {
  const app = new ThermoChampionsApp();
  app.init();
});
