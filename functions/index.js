/**
 * THERMO CHAMPIONS: HEAT EDITION
 * Firebase Cloud Functions
 */

import { initializeApp } from 'firebase-admin/app';
import { getDatabase, ServerValue } from 'firebase-admin/database';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import {
  evaluateShuffleAnswers,
  evaluateWordScrambleWord,
  evaluateCalculationItem,
  computePredicate
} from './lib/scoring.js';

initializeApp();
const db = getDatabase();

/**
 * Generate 6-digit alphanumeric session code (e.g. TC8492)
 */
function generateSessionCode() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = 'TC';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Cloud Function: Create Game Session
 */
export const createSession = onCall(async (request) => {
  const { title = 'Sesi Pembelajaran Kalor SMP' } = request.data || {};
  const sessionCode = generateSessionCode();
  const sessionRef = db.ref(`sessions/${sessionCode}`);

  const initialData = {
    code: sessionCode,
    title,
    createdAt: ServerValue.TIMESTAMP,
    status: 'LOBBY', // LOBBY, GAME1_MEMORIZE, GAME1_PLAY, GAME2, GAME3, FINISHED
    currentPhase: 'LOBBY',
    phaseStartTime: null,
    phaseDuration: 0,
    teams: {},
    leaderboard: {},
    settings: {
      game1MemorizeTime: 35,
      game1PlayTime: 75,
      game2WordTime: 20,
      game3TotalTime: 120,
      maxTeams: 8
    }
  };

  await sessionRef.set(initialData);

  return {
    success: true,
    sessionCode,
    message: `Sesi berhasil dibuat dengan kode ${sessionCode}`
  };
});

/**
 * Cloud Function: Join Session & Register Team (1-8)
 */
export const joinSession = onCall(async (request) => {
  const { sessionCode, teamNumber, teamName, members } = request.data || {};

  if (!sessionCode || !teamNumber || !teamName) {
    throw new HttpsError('invalid-argument', 'Data pendaftaran kelompok tidak lengkap.');
  }

  const num = parseInt(teamNumber, 10);
  if (isNaN(num) || num < 1 || num > 8) {
    throw new HttpsError('invalid-argument', 'Nomor kelompok harus berada di antara 1 sampai 8.');
  }

  const sessionSnap = await db.ref(`sessions/${sessionCode}`).once('value');
  if (!sessionSnap.exists()) {
    throw new HttpsError('not-found', 'Kode sesi tidak ditemukan. Periksa kembali kode sesi dari Guru/Admin.');
  }

  const sessionData = sessionSnap.val();
  if (sessionData.status !== 'LOBBY') {
    throw new HttpsError('failed-precondition', 'Permainan sudah dimulai atau telah berakhir.');
  }

  const teamRef = db.ref(`sessions/${sessionCode}/teams/team_${num}`);
  const existingTeam = (await teamRef.once('value')).val();

  // If already taken by someone else and has different token
  if (existingTeam && existingTeam.claimed) {
    throw new HttpsError('already-exists', `Kelompok ${num} sudah diambil oleh perangkat lain.`);
  }

  const teamData = {
    number: num,
    name: teamName.trim(),
    members: Array.isArray(members) ? members : [],
    claimed: true,
    ready: true,
    joinedAt: ServerValue.TIMESTAMP,
    scores: {
      game1: 0,
      game2: 0,
      game3: 0,
      total: 0
    },
    progress: {
      game1Submitted: false,
      game2Index: 0,
      game3Index: 0
    },
    predicate: 'Temperature Rookie'
  };

  await teamRef.set(teamData);

  return {
    success: true,
    teamNumber: num,
    sessionCode,
    message: `Berhasil bergabung sebagai Kelompok ${num}: ${teamName}`
  };
});

/**
 * Cloud Function: Admin Controls Phase / Start Game
 */
export const setSessionPhase = onCall(async (request) => {
  const { sessionCode, phase } = request.data || {};
  if (!sessionCode || !phase) {
    throw new HttpsError('invalid-argument', 'Parameter sessionCode dan phase wajib diisi.');
  }

  const sessionRef = db.ref(`sessions/${sessionCode}`);
  const sessionSnap = await sessionRef.once('value');
  if (!sessionSnap.exists()) {
    throw new HttpsError('not-found', 'Sesi tidak ditemukan.');
  }

  let duration = 0;
  if (phase === 'GAME1_MEMORIZE') duration = 35;
  else if (phase === 'GAME1_PLAY') duration = 75;
  else if (phase === 'GAME2') duration = 200; // 10 words total flow
  else if (phase === 'GAME3') duration = 120; // 120 seconds for extreme addition
  else if (phase === 'FINISHED') duration = 0;

  await sessionRef.update({
    status: phase,
    currentPhase: phase,
    phaseStartTime: ServerValue.TIMESTAMP,
    phaseDuration: duration
  });

  return { success: true, phase, duration };
});

/**
 * Cloud Function: Submit Game 1 (Shuffle & Recall)
 */
export const submitGame1 = onCall(async (request) => {
  const { sessionCode, teamNumber, answers } = request.data || {};
  if (!sessionCode || !teamNumber) {
    throw new HttpsError('invalid-argument', 'Data tidak lengkap.');
  }

  const teamRef = db.ref(`sessions/${sessionCode}/teams/team_${teamNumber}`);
  const teamSnap = await teamRef.once('value');
  if (!teamSnap.exists()) {
    throw new HttpsError('not-found', 'Data kelompok tidak ditemukan.');
  }

  const teamData = teamSnap.val();
  if (teamData.progress?.game1Submitted) {
    return {
      success: false,
      message: 'Game 1 sudah pernah dikirimkan sebelumnya.'
    };
  }

  const result = evaluateShuffleAnswers(answers);

  const newScores = {
    ...teamData.scores,
    game1: result.score,
    total: Math.min(100, (result.score || 0) + (teamData.scores.game2 || 0) + (teamData.scores.game3 || 0))
  };

  const predicate = computePredicate(newScores.total);

  await teamRef.update({
    'scores/game1': result.score,
    'scores/total': newScores.total,
    'progress/game1Submitted': true,
    predicate
  });

  return {
    success: true,
    score: result.score,
    correctCount: result.correctCount,
    totalItems: result.totalItems,
    isPerfect: result.isPerfect
  };
});

/**
 * Cloud Function: Submit Game 2 Single Word
 */
export const submitGame2Word = onCall(async (request) => {
  const { sessionCode, teamNumber, itemId, answer, remainingSec } = request.data || {};
  if (!sessionCode || !teamNumber || !itemId) {
    throw new HttpsError('invalid-argument', 'Data jawaban tidak valid.');
  }

  const evalResult = evaluateWordScrambleWord(itemId, answer, remainingSec, 20);

  const teamRef = db.ref(`sessions/${sessionCode}/teams/team_${teamNumber}`);
  const teamSnap = await teamRef.once('value');
  if (!teamSnap.exists()) {
    throw new HttpsError('not-found', 'Kelompok tidak ditemukan.');
  }

  const teamData = teamSnap.val();
  const currentG2 = teamData.scores?.game2 || 0;
  const newG2 = Math.min(35, Math.round((currentG2 + evalResult.score) * 10) / 10);
  const newTotal = Math.min(100, Math.round(((teamData.scores?.game1 || 0) + newG2 + (teamData.scores?.game3 || 0)) * 10) / 10);
  const predicate = computePredicate(newTotal);

  await teamRef.update({
    'scores/game2': newG2,
    'scores/total': newTotal,
    predicate
  });

  return {
    success: true,
    correct: evalResult.correct,
    addedScore: evalResult.score,
    totalGame2Score: newG2,
    expected: evalResult.expected
  };
});

/**
 * Cloud Function: Submit Game 3 Single Calculation
 */
export const submitGame3Calculation = onCall(async (request) => {
  const { sessionCode, teamNumber, itemId, answerRaw, remainingSec } = request.data || {};
  if (!sessionCode || !teamNumber || !itemId) {
    throw new HttpsError('invalid-argument', 'Data kalkulasi tidak valid.');
  }

  const evalResult = evaluateCalculationItem(itemId, answerRaw, remainingSec, 120);

  const teamRef = db.ref(`sessions/${sessionCode}/teams/team_${teamNumber}`);
  const teamSnap = await teamRef.once('value');
  if (!teamSnap.exists()) {
    throw new HttpsError('not-found', 'Kelompok tidak ditemukan.');
  }

  const teamData = teamSnap.val();
  const currentG3 = teamData.scores?.game3 || 0;
  const newG3 = Math.min(35, Math.round((currentG3 + evalResult.score) * 10) / 10);
  const newTotal = Math.min(100, Math.round(((teamData.scores?.game1 || 0) + (teamData.scores?.game2 || 0) + newG3) * 10) / 10);
  const predicate = computePredicate(newTotal);

  await teamRef.update({
    'scores/game3': newG3,
    'scores/total': newTotal,
    predicate
  });

  return {
    success: true,
    correct: evalResult.correct,
    addedScore: evalResult.score,
    totalGame3Score: newG3,
    expected: evalResult.expected
  };
});
