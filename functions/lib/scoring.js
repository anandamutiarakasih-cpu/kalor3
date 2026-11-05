/**
 * THERMO CHAMPIONS: HEAT EDITION - Cloud Functions
 * Secure Scoring & Validation Engine
 */

import {
  SECRET_SHUFFLE_KEYS,
  SECRET_WORD_SCRAMBLE_KEYS,
  SECRET_CALCULATION_KEYS
} from '../data/question-bank.js';

export function evaluateShuffleAnswers(answers = {}) {
  let correctCount = 0;
  const totalItems = Object.keys(SECRET_SHUFFLE_KEYS).length;

  for (const [key, expected] of Object.entries(SECRET_SHUFFLE_KEYS)) {
    const userAns = (answers[key] || '').trim();
    if (userAns.toLowerCase() === expected.trim().toLowerCase()) {
      correctCount++;
    }
  }

  // Base score: 2.5 pts per correct answer (max 25 pts)
  let score = correctCount * 2.5;

  // Perfect bonus: 5 pts if all 10 are correct
  if (correctCount === totalItems) {
    score += 5;
  }

  // Capped at 30
  score = Math.min(30, Math.round(score * 10) / 10);

  return {
    score,
    correctCount,
    totalItems,
    isPerfect: correctCount === totalItems
  };
}

export function evaluateWordScrambleWord(itemId, answer = '', remainingSec = 0, totalTimeSec = 20) {
  const expected = SECRET_WORD_SCRAMBLE_KEYS[itemId];
  if (!expected) return { correct: false, score: 0 };

  const cleanUser = answer.replace(/\s+/g, '').toUpperCase();
  const cleanExp = expected.replace(/\s+/g, '').toUpperCase();
  const isCorrect = cleanUser === cleanExp;

  if (!isCorrect) {
    return { correct: false, score: 0, expected };
  }

  // Base points: 3.0 pts
  let itemScore = 3.0;

  // Speed bonus up to 0.5 pts based on remaining time fraction
  if (remainingSec > 0 && totalTimeSec > 0) {
    const fraction = Math.min(1, Math.max(0, remainingSec / totalTimeSec));
    itemScore += fraction * 0.5;
  }

  return {
    correct: true,
    score: Math.round(itemScore * 10) / 10,
    expected
  };
}

export function evaluateCalculationItem(itemId, answerRaw, remainingSec = 0, totalTimeSec = 120) {
  const target = SECRET_CALCULATION_KEYS[itemId];
  if (!target) return { correct: false, score: 0 };

  // Parse numeric answer from user (supports "252.000", "252000", "252,000", "252 000")
  let clean = String(answerRaw || '').trim();
  // Remove spaces
  clean = clean.replace(/\s+/g, '');

  // Handle Indonesian thousand separator (dots) vs comma for decimal
  // If dot is followed by exactly 3 digits and no other dots, or multiple dots
  if (/^\d{1,3}(\.\d{3})+$/.test(clean)) {
    // Indonesian formatted thousand like 252.000
    clean = clean.replace(/\./g, '');
  } else if (/^\d+,\d+$/.test(clean)) {
    // Indonesian decimal comma like 0,5
    clean = clean.replace(',', '.');
  } else {
    // Standard cleanup
    clean = clean.replace(/,/g, '');
  }

  const num = parseFloat(clean);
  if (isNaN(num)) {
    return { correct: false, score: 0, reason: 'Invalid number format' };
  }

  const expected = target.answer;
  const tolerance = target.tolerance || 0.01;
  const diff = Math.abs(num - expected);
  const isCorrect = diff <= Math.max(0.001, expected * tolerance);

  if (!isCorrect) {
    return { correct: false, score: 0, expected };
  }

  let itemScore = target.points || 3.5;
  // Speed bonus up to 0.5 pts
  if (remainingSec > 0 && totalTimeSec > 0) {
    const fraction = Math.min(1, Math.max(0, remainingSec / totalTimeSec));
    itemScore += fraction * 0.5;
  }

  return {
    correct: true,
    score: Math.round(itemScore * 10) / 10,
    expected
  };
}

export function computePredicate(totalScore) {
  const s = Math.round(totalScore || 0);
  if (s >= 86) return 'Thermo Champion';
  if (s >= 76) return 'Thermo Expert';
  if (s >= 66) return 'Science Challenger';
  if (s >= 56) return 'Thermo Explorer';
  return 'Temperature Rookie';
}
