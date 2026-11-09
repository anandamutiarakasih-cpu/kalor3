/**
 * THERMO CHAMPIONS: HEAT EDITION
 * Server Authoritative Scoring Engine & Validation Logic
 */

import {
  SECRET_SHUFFLE_KEYS,
  SECRET_WORD_SCRAMBLE_KEYS,
  SECRET_CALCULATION_KEYS
} from '../data/secret-questions.js';

/**
 * Evaluate Game 1: Shuffle & Recall
 * 10 items, 2.5 pts each (max 25 pts).
 * Perfect 10/10 bonus = +5 pts -> Total Max 30 pts.
 */
export function evaluateShuffleAnswers(answers = {}) {
  let correctCount = 0;
  const totalItems = Object.keys(SECRET_SHUFFLE_KEYS).length;
  const resultsDetail = {};

  for (const [key, expected] of Object.entries(SECRET_SHUFFLE_KEYS)) {
    const userAns = (answers[key] || '').trim();
    const isCorrect = userAns.toLowerCase() === expected.trim().toLowerCase();
    if (isCorrect) {
      correctCount++;
    }
    resultsDetail[key] = {
      isCorrect,
      expected: expected
    };
  }

  let score = correctCount * 2.5;
  if (correctCount === totalItems) {
    score += 5; // Perfect 10/10 bonus
  }
  score = Math.min(30, Math.round(score * 10) / 10);

  return {
    score,
    correctCount,
    totalItems,
    isPerfect: correctCount === totalItems,
    resultsDetail
  };
}

/**
 * Evaluate Game 2: Word Scramble
 * 10 items, 3.0 pts base each.
 * Speed bonus: up to +0.5 pts based on remaining time fraction.
 * Max Total = 35 pts.
 */
export function evaluateWordScrambleWord(itemId, answer = '', remainingSec = 0, totalTimeSec = 20) {
  const expected = SECRET_WORD_SCRAMBLE_KEYS[itemId];
  if (!expected) {
    return { correct: false, score: 0, expected: '' };
  }

  const cleanUser = String(answer || '').replace(/\s+/g, '').toUpperCase();
  const cleanExp = expected.replace(/\s+/g, '').toUpperCase();
  const isCorrect = cleanUser === cleanExp;

  if (!isCorrect) {
    return {
      correct: false,
      score: 0,
      expected
    };
  }

  let itemScore = 3.0;
  if (remainingSec > 0 && totalTimeSec > 0) {
    const fraction = Math.min(1, Math.max(0, remainingSec / totalTimeSec));
    itemScore += fraction * 0.5;
  }
  itemScore = Math.round(itemScore * 10) / 10;

  return {
    correct: true,
    score: itemScore,
    expected
  };
}

/**
 * Evaluate Game 3: Extreme Addition (Heat Calculation)
 * 10 items, 3.0 - 4.5 pts base.
 * Speed bonus: up to +0.5 pts based on remaining time fraction.
 * Max Total = 35 pts.
 */
export function evaluateCalculationItem(itemId, rawAnswer, remainingSec = 0, totalTimeSec = 120) {
  const target = SECRET_CALCULATION_KEYS[itemId];
  if (!target) {
    return { correct: false, score: 0, expected: 0 };
  }

  // Parse scientific / Indonesian number formats (e.g. "252.000", "252,000", "0,5", "252000 J")
  let clean = String(rawAnswer || '').trim();
  clean = clean.replace(/(joule|j\/kg°c|j\/°c|j|°c|kg)/gi, '').trim();
  clean = clean.replace(/\s+/g, '');

  if (/^\d{1,3}(\.\d{3})+$/.test(clean)) {
    // Indonesian thousand separator
    clean = clean.replace(/\./g, '');
  } else if (/^\d+,\d+$/.test(clean)) {
    // Indonesian decimal comma
    clean = clean.replace(',', '.');
  } else {
    clean = clean.replace(/,/g, '');
  }

  const num = parseFloat(clean);
  if (isNaN(num)) {
    return { correct: false, score: 0, expected: target.answer, reason: 'Format angka tidak valid' };
  }

  const expected = target.answer;
  const tolerance = target.tolerance || 0.01;
  const diff = Math.abs(num - expected);
  const isCorrect = diff <= Math.max(0.001, expected * tolerance);

  if (!isCorrect) {
    return {
      correct: false,
      score: 0,
      expected,
      explanation: target.explanation || ''
    };
  }

  let itemScore = target.points || 3.5;
  if (remainingSec > 0 && totalTimeSec > 0) {
    const fraction = Math.min(1, Math.max(0, remainingSec / totalTimeSec));
    itemScore += fraction * 0.5;
  }
  itemScore = Math.round(itemScore * 10) / 10;

  return {
    correct: true,
    score: itemScore,
    expected,
    explanation: target.explanation || ''
  };
}

/**
 * Predicate based on final total score (0 - 100)
 */
export function computePredicate(totalScore) {
  const s = Math.round(totalScore || 0);
  if (s >= 86) return 'Thermo Champion';
  if (s >= 76) return 'Thermo Expert';
  if (s >= 66) return 'Science Challenger';
  if (s >= 56) return 'Thermo Explorer';
  return 'Temperature Rookie';
}

/**
 * Deterministic Leaderboard Ranking with multi-tier tie breakers
 */
export function computeLeaderboard(teamsObj = {}) {
  const teams = Object.values(teamsObj).filter((t) => t && (t.claimed || (t.scores?.total || 0) > 0));

  teams.sort((a, b) => {
    const totalA = a.scores?.total || 0;
    const totalB = b.scores?.total || 0;
    if (totalB !== totalA) return totalB - totalA;

    const g3A = a.scores?.game3 || 0;
    const g3B = b.scores?.game3 || 0;
    if (g3B !== g3A) return g3B - g3A;

    const g2A = a.scores?.game2 || 0;
    const g2B = b.scores?.game2 || 0;
    if (g2B !== g2A) return g2B - g2A;

    const g1A = a.scores?.game1 || 0;
    const g1B = b.scores?.game1 || 0;
    if (g1B !== g1A) return g1B - g1A;

    return (a.number || 0) - (b.number || 0);
  });

  // Assign competitive ranks (tied teams share same rank)
  let currentRank = 1;
  teams.forEach((t, idx) => {
    if (idx > 0) {
      const prev = teams[idx - 1];
      const prevTotal = prev.scores?.total || 0;
      const curTotal = t.scores?.total || 0;
      if (curTotal < prevTotal) {
        currentRank = idx + 1;
      }
    }
    t.rank = currentRank;
  });

  return teams;
}
