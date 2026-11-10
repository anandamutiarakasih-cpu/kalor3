/**
 * THERMO CHAMPIONS: HEAT EDITION
 * Multiplayer Realtime Unified Engine (Firebase Modular + Realtime Mesh)
 * Provides seamless drop-in parity for all views and legacy imports.
 */

import { firebaseService } from './firebase-service.js';

export { firebaseService };
export const socketService = firebaseService;
export default firebaseService;
