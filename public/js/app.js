/**
 * THERMO CHAMPIONS: HEAT EDITION
 * Main Controller & View Router
 */

import { particleService } from './services/particle-service.js';
import { firebaseService } from './services/firebase-service.js';
import { networkMonitor } from './services/network-monitor.js';
import { audio } from './services/audio-service.js';
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

    // Initialize Network & Latency Monitor
    networkMonitor.init(() => firebaseService);

    // Confirmation warning on refresh or leaving while inside active session
    window.addEventListener('beforeunload', (e) => {
      if (this.currentRoute && this.currentRoute !== 'home') {
        e.preventDefault();
        const msg = 'Data permainan akan di-reset dan Anda akan kembali ke menu awal jika halaman dimuat ulang.';
        e.returnValue = msg;
        return msg;
      }
    });

    // Session Recovery: Check for existing saved team session on startup or page reload
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
    // Play transition sound effect
    try {
      audio.playPhaseTransition();
    } catch (e) {}

    switch (phase) {
      case 'LOBBY':
        this.navigate('waiting');
        break;
      case 'GAME1_MEMORIZE':
        this.navigate('game1_memorize');
        break;
      case 'GAME1_PLAY':
        this.navigate('game1_play');
        break;
      case 'GAME2':
        toast.info('Babak 2 Dimulai: Game Word Scramble!');
        this.navigate('game2');
        break;
      case 'GAME3':
        toast.info('Babak 3 Dimulai: Extreme Addition (Kalkulasi Kalor)!');
        this.navigate('game3');
        break;
      case 'FINISHED':
        toast.success('Seluruh Babak Selesai! Membuka Leaderboard...');
        this.navigate('leaderboard');
        break;
      default:
        this.navigate('waiting');
    }
  }

  navigate(route, params = {}) {
    // 1. If already on the exact same active game route, prevent destructive unmount
    if (this.currentRoute === route && (route === 'game1_play' || route === 'game2' || route === 'game3' || route === 'waiting')) {
      return;
    }

    // 2. If student is in Game 1 Memorize and route shifts to Game 1 Play:
    // Do NOT destroy view instance. Smoothly switch to play mode while preserving state!
    if (this.currentRoute === 'game1_memorize' && route === 'game1_play') {
      if (this.currentViewInstance && typeof this.currentViewInstance.switchToPlayMode === 'function') {
        this.currentViewInstance.switchToPlayMode();
        this.currentRoute = 'game1_play';
        return;
      }
    }

    if (this.currentViewInstance && typeof this.currentViewInstance.destroy === 'function') {
      this.currentViewInstance.destroy();
      this.currentViewInstance = null;
    }

    this.currentRoute = route;
    networkMonitor.setSessionContext(this.state.sessionCode, this.state.teamNumber);
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
          }
        });
        break;

      case 'game1_memorize':
        this.currentViewInstance = renderGame1View(this.appContainer, {
          sessionCode: this.state.sessionCode,
          teamNumber: this.state.teamNumber,
          isMemorizePhase: true,
          onPhaseChange: (newPhase) => {
            this.routeByPhase(newPhase);
          }
        });
        break;

      case 'game1_play':
        this.currentViewInstance = renderGame1View(this.appContainer, {
          sessionCode: this.state.sessionCode,
          teamNumber: this.state.teamNumber,
          isMemorizePhase: false,
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
