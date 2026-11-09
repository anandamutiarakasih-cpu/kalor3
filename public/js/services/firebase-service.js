/**
 * THERMO CHAMPIONS: HEAT EDITION
 * Firebase Service Migration Adapter (Socket.IO & Supabase authoritative replacement)
 * 
 * Provides 100% backward-compatible drop-in interface for all existing frontend views,
 * routing all room management, timing, answers validation, scores, and reconnection
 * to the Authoritative Node.js + Express + Socket.IO Server & Supabase PostgreSQL.
 */

import { socketService } from './socket-service.js';

export { socketService };
export const firebaseService = socketService;
export default socketService;
