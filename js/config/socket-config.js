/**
 * THERMO CHAMPIONS: HEAT EDITION
 * Socket.IO Multiplayer Client Configuration
 */

export const SOCKET_CONFIG = {
  /**
   * Resolves the authoritative backend URL:
   * 1. URL search parameter (?backend=... or ?socket_url=...)
   * 2. LocalStorage override ('tc_backend_url')
   * 3. Global window.TC_BACKEND_URL
   * 4. Localhost detection (defaults to http://localhost:3000 during local testing)
   * 5. Production Railway / Cloud deployment
   */
  getBackendUrl() {
    try {
      if (typeof window !== 'undefined') {
        if (window.location && window.location.search) {
          const urlParams = new URLSearchParams(window.location.search);
          const override = urlParams.get('backend') || urlParams.get('socket_url');
          if (override) {
            const cleanUrl = override.trim().replace(/\/+$/, '');
            localStorage.setItem('tc_backend_url', cleanUrl);
            return cleanUrl;
          }
        }

        const saved = localStorage.getItem('tc_backend_url');
        if (saved) return saved.trim().replace(/\/+$/, '');

        if (window.TC_BACKEND_URL) {
          return window.TC_BACKEND_URL.trim().replace(/\/+$/, '');
        }

        const hostname = window.location.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0') {
          return 'http://localhost:3000';
        }
      }
    } catch (e) {
      console.warn('[SocketConfig] Error resolving backend URL:', e);
    }

    // If no custom backend URL is configured yet on production, return empty to enable instant Fail-Safe
    return '';
  }
};
