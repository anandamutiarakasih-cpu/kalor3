/**
 * THERMO CHAMPIONS: HEAT EDITION
 * Server-Authoritative Secret Question Bank & Verification Keys
 */

export const SECRET_SHUFFLE_KEYS = {
  sc1: 'Perpindahan kalor tanpa perpindahan zat secara keseluruhan',
  sc2: 'Konduksi',
  sc3: 'Konveksi',
  sc4: 'Radiasi',
  sc5: 'Bahan yang sulit / lambat menghantarkan kalor',
  sc6: 'Konduktor Panas',
  sc7: 'Menghitung kalor saat terjadi perubahan suhu',
  sc8: 'Menghitung kalor perubahan wujud (peleburan / pembekuan)',
  sc9: 'Proses yang MEMBUTUHKAN / MENYERAP kalor',
  sc10: 'Perpindahan kalor secara Konveksi alami di udara'
};

export const SECRET_WORD_SCRAMBLE_KEYS = {
  ws1: 'KALOR',
  ws2: 'PANAS',
  ws3: 'SUHU',
  ws4: 'KONDUKSI',
  ws5: 'KONVEKSI',
  ws6: 'RADIASI',
  ws7: 'MENCAIR',
  ws8: 'KONDUKTOR',
  ws9: 'ISOLATOR',
  ws10: 'MENYUBLIM'
};

export const SECRET_CALCULATION_KEYS = {
  hc1: { answer: 252000, tolerance: 0.01, points: 3.0, explanation: 'Q = m × c × ΔT = 2 kg × 4.200 J/kg°C × 30°C = 252.000 Joule.' },
  hc2: { answer: 22500, tolerance: 0.01, points: 3.0, explanation: 'Q = 5 kg × 450 J/kg°C × 10°C = 22.500 Joule.' },
  hc3: { answer: 12500, tolerance: 0.01, points: 3.0, explanation: 'Q = C × ΔT = 500 J/°C × 25°C = 12.500 Joule.' },
  hc4: { answer: 168000, tolerance: 0.01, points: 3.5, explanation: 'Q = 0,5 kg × 336.000 J/kg = 168.000 Joule.' },
  hc5: { answer: 452000, tolerance: 0.01, points: 3.5, explanation: 'Q = 0,2 kg × 2.260.000 J/kg = 452.000 Joule.' },
  hc6: { answer: 450, tolerance: 0.01, points: 3.5, explanation: 'ΔT = 40 - 20 = 20°C. c = 18.000 / (2 × 20) = 450 J/kg°C.' },
  hc7: { answer: 1, tolerance: 0.01, points: 3.5, explanation: 'm = 7.800 / (390 × 20) = 1 kg.' },
  hc8: { answer: 50, tolerance: 0.01, points: 4.0, explanation: 'ΔT = Q / C = 20.000 / 800 = 25°C. Suhu akhir = 25 + 25 = 50°C.' },
  hc9: { answer: 178500, tolerance: 0.02, points: 4.0, explanation: 'Q₁ = 0,5×2.100×10 = 10.500 J. Q₂ = 0,5×336.000 = 168.000 J. Q_total = 178.500 J.' },
  hc10: { answer: 44, tolerance: 0.02, points: 4.5, explanation: 'Q_lepas = Q_terima → 1×4.200×(80-T_c) = 1,5×4.200×(T_c-20) → 80-T_c = 1,5T_c - 30 → 2,5T_c = 110 → T_c = 44°C.' }
};

export const GAME_PHASES = {
  LOBBY: 'LOBBY',
  GAME1_MEMORIZE: 'GAME1_MEMORIZE',
  GAME1_PLAY: 'GAME1_PLAY',
  GAME2: 'GAME2',
  GAME3: 'GAME3',
  FINISHED: 'FINISHED'
};

export const PHASE_DURATIONS = {
  LOBBY: 0,
  GAME1_MEMORIZE: 35,
  GAME1_PLAY: 75,
  GAME2: 200,
  GAME3: 120,
  FINISHED: 0
};
