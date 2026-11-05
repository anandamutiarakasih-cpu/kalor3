/**
 * THERMO CHAMPIONS: HEAT EDITION - Cloud Functions
 * Server-Side Secret Question Bank & Validation Keys
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
  hc1: { answer: 252000, tolerance: 0.01, points: 3 },
  hc2: { answer: 22500, tolerance: 0.01, points: 3 },
  hc3: { answer: 12500, tolerance: 0.01, points: 3 },
  hc4: { answer: 168000, tolerance: 0.01, points: 3.5 },
  hc5: { answer: 452000, tolerance: 0.01, points: 3.5 },
  hc6: { answer: 450, tolerance: 0.01, points: 3.5 },
  hc7: { answer: 1, tolerance: 0.01, points: 3.5 },
  hc8: { answer: 50, tolerance: 0.01, points: 4 },
  hc9: { answer: 160000, tolerance: 0.01, points: 4 },
  hc10: { answer: 231000, tolerance: 0.01, points: 4.5 }
};
