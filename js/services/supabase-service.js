/**
 * THERMO CHAMPIONS: HEAT EDITION
 * Supabase Multiplayer Realtime Mesh Engine
 * Universal Port 443 WSS - Zero blocked ports, ultra-low latency, cross-device sync.
 * Directly synchronizes Teacher (Laptop/Desktop) and Students (Android/iOS) worldwide.
 */

const SUPABASE_URL = 'https://ffdawauotorocorlqgsq.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_h00Bx19fMQCF81Mx2DnRbQ_Osr8mrsP';

class SupabaseMultiplayerService {
  constructor() {
    this.url = SUPABASE_URL;
    this.key = SUPABASE_ANON_KEY;
    this.client = null;
    this.channels = new Map(); // roomCode -> Supabase Realtime Channel
    this.listeners = new Map(); // roomCode -> Set of callbacks
    this.cachedRoomStates = new Map(); // roomCode -> latest room state object
    this.subscribedChannels = new Set();
    this.queuedBroadcasts = new Map(); // roomCode -> Array of pending broadcasts
    this.clientId = 'tc_' + Math.random().toString(36).substring(2, 9);
  }

  /**
   * Returns or initializes the Supabase JS client
   */
  getClient() {
    if (this.client) return this.client;

    const sbLib = (typeof window !== 'undefined' && window.supabase) ? window.supabase : null;
    if (sbLib && typeof sbLib.createClient === 'function') {
      this.client = sbLib.createClient(this.url, this.key, {
        realtime: {
          params: {
            eventsPerSecond: 25
          }
        }
      });
      return this.client;
    }

    return null;
  }

  /**
   * Retrieves or creates a Supabase Realtime Channel for a given Room Code
   */
  getChannel(roomCode) {
    const code = (roomCode || '').trim().toUpperCase();
    if (!code) return null;

    if (this.channels.has(code)) {
      return this.channels.get(code);
    }

    const sb = this.getClient();
    if (!sb) return null;

    const ch = sb.channel(`tc-room-${code}`, {
      config: {
        broadcast: { self: true },
        presence: { key: `${this.clientId}_${Date.now()}` }
      }
    });

    // 1. Full Room State Broadcast
    ch.on('broadcast', { event: 'room_state' }, ({ payload }) => {
      if (payload && payload.code === code) {
        this.mergeAndCache(code, payload);
      }
    });

    // 2. Synchronized Phase Transitions (Teacher -> All Students)
    ch.on('broadcast', { event: 'phase_change' }, ({ payload }) => {
      if (payload && payload.phase) {
        const cur = this.getOrInitRoom(code);
        cur.status = payload.phase;
        cur.currentPhase = payload.phase;
        cur.phaseStartedAt = payload.phaseStartedAt || Date.now();
        cur.phaseDuration = payload.phaseDuration || 0;
        cur.phaseEndsAt = payload.phaseEndsAt || (payload.phaseDuration > 0 ? (cur.phaseStartedAt + payload.phaseDuration * 1000) : null);
        this.mergeAndCache(code, cur);
      }
    });

    // 3. Team Registration (Student -> Teacher)
    ch.on('broadcast', { event: 'team_joined' }, ({ payload }) => {
      if (payload && payload.teamNumber) {
        const cur = this.getOrInitRoom(code);
        if (!cur.teams) cur.teams = {};
        const tKey = `team_${payload.teamNumber}`;
        cur.teams[tKey] = {
          ...(cur.teams[tKey] || {}),
          number: payload.teamNumber,
          name: payload.name || `Kelompok ${payload.teamNumber}`,
          members: payload.members || [],
          joinedAt: payload.joinedAt || Date.now(),
          claimed: true,
          isOnline: true,
          scores: cur.teams[tKey]?.scores || { game1: 0, game2: 0, game3: 0, total: 0 },
          predicate: cur.teams[tKey]?.predicate || 'Temperature Rookie',
          heartbeat: {
            lastSeen: Date.now(),
            latency: payload.latency || 20
          }
        };
        this.mergeAndCache(code, cur);
      }
    });

    // 4. Team Ping / Heartbeat
    ch.on('broadcast', { event: 'team_ping' }, ({ payload }) => {
      if (payload && payload.teamNumber) {
        const cur = this.getOrInitRoom(code);
        const tKey = `team_${payload.teamNumber}`;
        if (cur.teams && cur.teams[tKey]) {
          cur.teams[tKey].isOnline = true;
          cur.teams[tKey].heartbeat = {
            lastSeen: payload.timestamp || Date.now(),
            latency: payload.latency || 20
          };
          this.notify(code, cur);
        }
      }
    });

    // 5. Score Updates
    ch.on('broadcast', { event: 'score_updated' }, ({ payload }) => {
      if (payload && payload.teamNumber) {
        const cur = this.getOrInitRoom(code);
        const tKey = `team_${payload.teamNumber}`;
        if (!cur.teams) cur.teams = {};
        const team = cur.teams[tKey] || { number: payload.teamNumber, scores: {} };
        if (payload.scores) {
          team.scores = { ...(team.scores || {}), ...payload.scores };
        }
        if (payload.predicate) {
          team.predicate = payload.predicate;
        }
        team.isOnline = true;
        if (!team.heartbeat) team.heartbeat = { lastSeen: Date.now(), latency: 20 };
        else team.heartbeat.lastSeen = Date.now();

        cur.teams[tKey] = team;
        this.mergeAndCache(code, cur);
      }
    });

    // 6. Room Reset
    ch.on('broadcast', { event: 'room_reset' }, () => {
      const cur = this.getOrInitRoom(code);
      if (cur.teams) {
        for (let i = 1; i <= 8; i++) {
          const t = cur.teams[`team_${i}`];
          if (t) {
            t.scores = { game1: 0, game2: 0, game3: 0, total: 0 };
            t.predicate = 'Temperature Rookie';
          }
        }
      }
      this.mergeAndCache(code, cur);
    });

    // 7. Request State on Join / Reconnect
    ch.on('broadcast', { event: 'request_state' }, () => {
      const cur = this.cachedRoomStates.get(code);
      if (cur && cur.code === code) {
        this.publish(code, 'room_state', cur);
      }
    });

    // 8. Presence Sync (Realtime Online / Offline Detection)
    ch.on('presence', { event: 'sync' }, () => {
      const state = ch.presenceState();
      const cur = this.cachedRoomStates.get(code);
      if (!cur || !cur.teams) return;

      const onlineTeams = new Set();
      for (const key of Object.keys(state)) {
        const presences = state[key] || [];
        for (const p of presences) {
          if (p.teamNumber) {
            onlineTeams.add(parseInt(p.teamNumber, 10));
          }
        }
      }

      let changed = false;
      for (let i = 1; i <= 8; i++) {
        const tKey = `team_${i}`;
        if (cur.teams[tKey] && cur.teams[tKey].claimed) {
          const isNowOnline = onlineTeams.has(i);
          if (isNowOnline && !cur.teams[tKey].isOnline) {
            cur.teams[tKey].isOnline = true;
            changed = true;
          }
        }
      }
      if (changed) {
        this.notify(code, cur);
      }
    });

    // Channel subscription handler with message flushing
    ch.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        this.subscribedChannels.add(code);
        const queue = this.queuedBroadcasts.get(code) || [];
        while (queue.length > 0) {
          const item = queue.shift();
          ch.send(item).catch(() => {});
        }
      }
    });

    this.channels.set(code, ch);
    return ch;
  }

  getOrInitRoom(code) {
    let cur = this.cachedRoomStates.get(code);
    if (!cur) {
      // Try local storage fallback
      try {
        const raw = localStorage.getItem(`tc_session_${code}`);
        if (raw) cur = JSON.parse(raw);
      } catch (e) {}
    }
    if (!cur) {
      cur = { code, status: 'LOBBY', currentPhase: 'LOBBY', teams: {}, createdAt: Date.now() };
    }
    return cur;
  }

  mergeAndCache(code, incoming) {
    if (!incoming) return;
    const current = this.cachedRoomStates.get(code) || { code, teams: {} };
    const merged = { ...current, ...incoming };
    merged.teams = { ...(current.teams || {}), ...(incoming.teams || {}) };

    for (let i = 1; i <= 8; i++) {
      const tKey = `team_${i}`;
      if (current.teams?.[tKey] && incoming.teams?.[tKey]) {
        const ct = current.teams[tKey];
        const it = incoming.teams[tKey];
        merged.teams[tKey] = {
          ...ct,
          ...it,
          scores: { ...(ct.scores || {}), ...(it.scores || {}) },
          heartbeat: it.heartbeat || ct.heartbeat || { lastSeen: Date.now(), latency: 20 }
        };
      }
    }

    this.cachedRoomStates.set(code, merged);

    try {
      localStorage.setItem(`tc_session_${code}`, JSON.stringify(merged));
    } catch (e) {}

    this.notify(code, merged);
  }

  notify(code, data) {
    const set = this.listeners.get(code);
    if (set) {
      set.forEach((fn) => {
        try { fn(data); } catch (e) {}
      });
    }
  }

  /**
   * Listen to realtime updates for a room
   */
  subscribe(roomCode, callback) {
    const code = (roomCode || '').trim().toUpperCase();
    if (!this.listeners.has(code)) {
      this.listeners.set(code, new Set());
    }
    this.listeners.get(code).add(callback);

    this.getChannel(code);

    // Initial push from cache if available
    const cached = this.cachedRoomStates.get(code);
    if (cached) {
      setTimeout(() => callback(cached), 0);
    } else {
      try {
        const raw = localStorage.getItem(`tc_session_${code}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed) {
            this.cachedRoomStates.set(code, parsed);
            setTimeout(() => callback(parsed), 0);
          }
        }
      } catch (e) {}
    }

    // Request fresh state from active host
    this.publish(code, 'request_state', { clientId: this.clientId });

    return () => {
      const set = this.listeners.get(code);
      if (set) set.delete(callback);
    };
  }

  /**
   * High-speed broadcast to room channel
   */
  publish(roomCode, event, payload) {
    const code = (roomCode || '').trim().toUpperCase();
    const ch = this.getChannel(code);
    const item = { type: 'broadcast', event, payload };

    if (!ch) return;

    if (!this.subscribedChannels.has(code)) {
      if (!this.queuedBroadcasts.has(code)) {
        this.queuedBroadcasts.set(code, []);
      }
      this.queuedBroadcasts.get(code).push(item);
      return;
    }

    ch.send(item).catch(() => {});
  }

  /**
   * Track client presence (keeps card green ONLINE on Teacher screen)
   */
  track(roomCode, presenceData) {
    const code = (roomCode || '').trim().toUpperCase();
    const ch = this.getChannel(code);
    if (ch) {
      ch.track(presenceData).catch(() => {});
    }
  }

  async getSession(roomCode) {
    const code = (roomCode || '').trim().toUpperCase();
    if (this.cachedRoomStates.has(code)) {
      return this.cachedRoomStates.get(code);
    }
    try {
      const raw = localStorage.getItem(`tc_session_${code}`);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
  }
}

export const supabaseRelay = new SupabaseMultiplayerService();
