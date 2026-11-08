/**
 * THERMO CHAMPIONS: HEAT EDITION
 * Client-Side Question Bank & Interactive Data
 */

export const SHUFFLE_MEMORIZE_CARDS = [
  {
    id: 'm1',
    category: 'Perpindahan Kalor',
    term: 'Konduksi',
    tag: 'Zat Padat',
    definition: 'Perpindahan kalor melalui zat tanpa disertai perpindahan partikel zat tersebut.',
    example: 'Sendok logam terasa panas saat dicelupkan ke teh mendidih.',
    icon: '🥄'
  },
  {
    id: 'm2',
    category: 'Perpindahan Kalor',
    term: 'Konveksi',
    tag: 'Fluida (Cair/Gas)',
    definition: 'Perpindahan kalor yang disertai dengan perpindahan partikel zat perantaranya.',
    example: 'Air berputar naik-turun saat direbus; terjadinya angin laut & darat.',
    icon: '🌊'
  },
  {
    id: 'm3',
    category: 'Perpindahan Kalor',
    term: 'Radiasi',
    tag: 'Gelombang',
    definition: 'Perpindahan kalor berupa gelombang elektromagnetik tanpa memerlukan zat perantara.',
    example: 'Pancaran panas Matahari ke Bumi; hangatnya tubuh dekat api unggun.',
    icon: '☀️'
  },
  {
    id: 'm4',
    category: 'Sifat Bahan',
    term: 'Konduktor',
    tag: 'Daya Hantar Tinggi',
    definition: 'Benda atau bahan yang sangat mudah dan cepat menghantarkan kalor.',
    example: 'Tembaga, aluminium, besi, baja (dasar wajan & panci).',
    icon: '⚡'
  },
  {
    id: 'm5',
    category: 'Sifat Bahan',
    term: 'Isolator',
    tag: 'Daya Hantar Rendah',
    definition: 'Benda atau bahan yang sangat lambat atau sukar menghantarkan kalor.',
    example: 'Kayu, plastik, ebonit, karet, kain wol (pegangan panci).',
    icon: '🛡️'
  },
  {
    id: 'm6',
    category: 'Rumus Fisika',
    term: 'Kalor Jenis (c)',
    tag: 'J/kg°C',
    definition: 'Kalor yang diperlukan 1 kg zat untuk menaikkan suhunya sebesar 1°C.',
    example: 'Rumus: Q = m × c × ΔT',
    icon: '📐'
  },
  {
    id: 'm7',
    category: 'Rumus Fisika',
    term: 'Kapasitas Kalor (C)',
    tag: 'J/°C',
    definition: 'Jumlah kalor yang dibutuhkan seluruh benda untuk menaikkan suhunya 1°C.',
    example: 'Rumus: Q = C × ΔT (C = m × c)',
    icon: '🎚️'
  },
  {
    id: 'm8',
    category: 'Perubahan Wujud',
    term: 'Kalor Laten (L / U)',
    tag: 'Suhu Tetap',
    definition: 'Kalor yang dibutuhkan atau dilepaskan untuk mengubah wujud zat pada suhu konstan.',
    example: 'Rumus: Q = m × L (lebur/beku) atau Q = m × U (uap/embun)',
    icon: '🧊'
  },
  {
    id: 'm9',
    category: 'Termodinamika',
    term: 'Menyerap Kalor',
    tag: '+ Kalor (Endoterm)',
    definition: 'Proses perubahan wujud yang membutuhkan pasokan energi kalor dari lingkungan.',
    example: 'Mencair (es jadi air), Menguap (air jadi uap), Menyublim (kapur barus).',
    icon: '🔥'
  },
  {
    id: 'm10',
    category: 'Termodinamika',
    term: 'Melepas Kalor',
    tag: '- Kalor (Eksoterm)',
    definition: 'Proses perubahan wujud yang melepaskan energi panas ke lingkungan sekitar.',
    example: 'Membeku (air jadi es), Mengembun (titik air di daun), Mengkristal (salju).',
    icon: '❄️'
  }
];

export const SHUFFLE_CHALLENGES = [
  {
    id: 'sc1',
    prompt: 'Pasangkan jenis perpindahan kalor dengan definisinya:',
    leftItem: 'Konduksi',
    category: 'Definisi',
    options: [
      'Perpindahan kalor tanpa perpindahan zat secara keseluruhan',
      'Perpindahan kalor disertai aliran partikel zat perantara',
      'Perpindahan kalor melalui pancaran gelombang elektromagnetik',
      'Zat yang sangat lambat menghantarkan kalor'
    ],
    correctAnswer: 'Perpindahan kalor tanpa perpindahan zat secara keseluruhan'
  },
  {
    id: 'sc2',
    prompt: 'Pasangkan fenomena dengan jenis perpindahan kalor yang terjadi:',
    leftItem: 'Sendok logam menjadi panas ketika dicelupkan ke air teh panas',
    category: 'Fenomena',
    options: ['Konduksi', 'Konveksi', 'Radiasi', 'Kondensasi'],
    correctAnswer: 'Konduksi'
  },
  {
    id: 'sc3',
    prompt: 'Pasangkan fenomena dengan jenis perpindahan kalor yang terjadi:',
    leftItem: 'Air di dalam panci bergolak naik dan turun saat dimasak hingga mendidih',
    category: 'Fenomena',
    options: ['Konveksi', 'Konduksi', 'Radiasi', 'Evaporasi'],
    correctAnswer: 'Konveksi'
  },
  {
    id: 'sc4',
    prompt: 'Pasangkan fenomena dengan jenis perpindahan kalor yang terjadi:',
    leftItem: 'Pancaran sinar matahari menghangatkan permukaan Bumi tanpa medium zat perantara',
    category: 'Fenomena',
    options: ['Radiasi', 'Konveksi', 'Konduksi', 'Sublimasi'],
    correctAnswer: 'Radiasi'
  },
  {
    id: 'sc5',
    prompt: 'Pasangkan sifat bahan dengan definisinya:',
    leftItem: 'Isolator Termal',
    category: 'Sifat Bahan',
    options: [
      'Bahan yang sulit / lambat menghantarkan kalor',
      'Bahan yang sangat mudah menghantarkan kalor',
      'Bahan yang dapat meledak jika dipanaskan',
      'Zat yang tidak memiliki kalor jenis'
    ],
    correctAnswer: 'Bahan yang sulit / lambat menghantarkan kalor'
  },
  {
    id: 'sc6',
    prompt: 'Pasangkan kelompok bahan dengan klasifikasi daya hantar kalornya:',
    leftItem: 'Aluminium, Tembaga, dan Besi',
    category: 'Klasifikasi',
    options: ['Konduktor Panas', 'Isolator Panas', 'Semikonduktor Murni', 'Fluida Statis'],
    correctAnswer: 'Konduktor Panas'
  },
  {
    id: 'sc7',
    prompt: 'Pasangkan rumus fisika kalor dengan penggunaannya:',
    leftItem: 'Q = m × c × ΔT',
    category: 'Rumus',
    options: [
      'Menghitung kalor saat terjadi perubahan suhu',
      'Menghitung kalor saat zat melebur pada suhu tetap',
      'Menghitung kapasitas kalor tanpa massa',
      'Menghitung kalor jenis uap air'
    ],
    correctAnswer: 'Menghitung kalor saat terjadi perubahan suhu'
  },
  {
    id: 'sc8',
    prompt: 'Pasangkan rumus fisika dengan keterangannya:',
    leftItem: 'Q = m × L',
    category: 'Rumus',
    options: [
      'Menghitung kalor perubahan wujud (peleburan / pembekuan)',
      'Menghitung perubahan suhu benda bersuhu tinggi',
      'Menghitung kecepatan kalor jenis',
      'Menghitung perpindahan kalor radiasi'
    ],
    correctAnswer: 'Menghitung kalor perubahan wujud (peleburan / pembekuan)'
  },
  {
    id: 'sc9',
    prompt: 'Pasangkan kelompok proses perubahan wujud dengan sifat energinya:',
    leftItem: 'Mencair, Menguap, dan Menyublim',
    category: 'Perubahan Wujud',
    options: [
      'Proses yang MEMBUTUHKAN / MENYERAP kalor',
      'Proses yang MELEPASKAN energi kalor ke lingkungan',
      'Proses yang tidak memerlukan energi apa pun',
      'Proses yang hanya terjadi di ruang hampa'
    ],
    correctAnswer: 'Proses yang MEMBUTUHKAN / MENYERAP kalor'
  },
  {
    id: 'sc10',
    prompt: 'Pasangkan fenomena perpindahan udara di pantai dengan mekanismenya:',
    leftItem: 'Terjadinya Angin Darat dan Angin Laut',
    category: 'Fenomena Alam',
    options: [
      'Perpindahan kalor secara Konveksi alami di udara',
      'Perpindahan kalor secara Konduksi antar pasir pantai',
      'Perpindahan kalor secara Radiasi murni tanpa udara',
      'Perubahan wujud mengkristal pada air laut'
    ],
    correctAnswer: 'Perpindahan kalor secara Konveksi alami di udara'
  }
];

export const WORD_SCRAMBLE_ITEMS = [
  {
    id: 'ws1',
    difficulty: 'EASY',
    scrambled: 'L O K A R',
    answer: 'KALOR',
    clue: 'Bentuk energi yang berpindah akibat perbedaan suhu (5 huruf)',
    category: 'Energi Panas',
    timeLimit: 18,
    points: 3
  },
  {
    id: 'ws2',
    difficulty: 'EASY',
    scrambled: 'S A P A N',
    answer: 'PANAS',
    clue: 'Sensasi tingkat energi termal yang tinggi (5 huruf)',
    category: 'Istilah Fisika',
    timeLimit: 18,
    points: 3
  },
  {
    id: 'ws3',
    difficulty: 'EASY',
    scrambled: 'U H U S',
    answer: 'SUHU',
    clue: 'Derajat panas atau dinginnya suatu benda yang diukur termometer (4 huruf)',
    category: 'Besaran Pokok',
    timeLimit: 18,
    points: 3
  },
  {
    id: 'ws4',
    difficulty: 'MEDIUM',
    scrambled: 'D U K S I K O N',
    answer: 'KONDUKSI',
    clue: 'Perpindahan kalor pada zat padat tanpa pergerakan partikel (8 huruf)',
    category: 'Perpindahan Kalor',
    timeLimit: 20,
    points: 3.5
  },
  {
    id: 'ws5',
    difficulty: 'MEDIUM',
    scrambled: 'V E K S I K O N',
    answer: 'KONVEKSI',
    clue: 'Perpindahan panas disertai aliran partikel zat cair atau gas (8 huruf)',
    category: 'Perpindahan Kalor',
    timeLimit: 20,
    points: 3.5
  },
  {
    id: 'ws6',
    difficulty: 'MEDIUM',
    scrambled: 'A D I R A S I',
    answer: 'RADIASI',
    clue: 'Pancaran energi panas melalui gelombang elektromagnetik (7 huruf)',
    category: 'Perpindahan Kalor',
    timeLimit: 20,
    points: 3.5
  },
  {
    id: 'ws7',
    difficulty: 'MEDIUM',
    scrambled: 'A R I N E C M',
    answer: 'MENCAIR',
    clue: 'Perubahan wujud zat dari padat menjadi cair karena menyerap kalor (7 huruf)',
    category: 'Perubahan Wujud',
    timeLimit: 20,
    points: 3.5
  },
  {
    id: 'ws8',
    difficulty: 'EXTREME',
    scrambled: 'K U D R O K T O N',
    answer: 'KONDUKTOR',
    clue: 'Zat atau bahan yang sangat mudah menghantarkan energi panas (9 huruf)',
    category: 'Sifat Bahan',
    timeLimit: 20,
    points: 4
  },
  {
    id: 'ws9',
    difficulty: 'EXTREME',
    scrambled: 'T O L A R O S I',
    answer: 'ISOLATOR',
    clue: 'Bahan penghambat yang sangat lambat menghantarkan kalor (8 huruf)',
    category: 'Sifat Bahan',
    timeLimit: 20,
    points: 4
  },
  {
    id: 'ws10',
    difficulty: 'EXTREME',
    scrambled: 'B I L M N Y U E M',
    answer: 'MENYUBLIM',
    clue: 'Perubahan wujud zat padat langsung menjadi gas tanpa mencair (8 huruf)',
    category: 'Perubahan Wujud',
    timeLimit: 20,
    points: 4.5
  }
];

export const HEAT_CALCULATION_ITEMS = [
  {
    id: 'hc1',
    level: 'EASY',
    type: 'Heat Formula',
    badge: 'Q = m × c × ΔT',
    story: 'Air bermassa 2 kg dengan kalor jenis 4.200 J/kg°C dipanaskan dari suhu 20°C hingga 50°C. Berapakah jumlah kalor (Q) yang dibutuhkan air tersebut?',
    given: [
      { label: 'Massa (m)', value: '2 kg' },
      { label: 'Kalor Jenis (c)', value: '4.200 J/kg°C' },
      { label: 'Suhu Awal (T₁)', value: '20°C' },
      { label: 'Suhu Akhir (T₂)', value: '50°C' }
    ],
    formulaHint: 'ΔT = T₂ - T₁ lalu Q = m × c × ΔT',
    unit: 'Joule (J)',
    correctAnswer: 252000,
    tolerance: 0,
    explanation: 'ΔT = 50°C - 20°C = 30°C. Q = 2 kg × 4.200 J/kg°C × 30°C = 252.000 Joule.',
    points: 3
  },
  {
    id: 'hc2',
    level: 'EASY',
    type: 'Heat Formula',
    badge: 'Q = m × c × ΔT',
    story: 'Sebuah balok besi bermassa 5 kg memiliki kalor jenis 450 J/kg°C. Balok tersebut mengalami kenaikan suhu sebesar 10°C. Berapakah kalor yang diserap balok besi?',
    given: [
      { label: 'Massa (m)', value: '5 kg' },
      { label: 'Kalor Jenis (c)', value: '450 J/kg°C' },
      { label: 'Perubahan Suhu (ΔT)', value: '10°C' }
    ],
    formulaHint: 'Q = m × c × ΔT',
    unit: 'Joule (J)',
    correctAnswer: 22500,
    tolerance: 0,
    explanation: 'Q = 5 kg × 450 J/kg°C × 10°C = 22.500 Joule.',
    points: 3
  },
  {
    id: 'hc3',
    level: 'EASY',
    type: 'Heat Capacity',
    badge: 'Q = C × ΔT',
    story: 'Sebuah teko pemanas aluminium memiliki kapasitas kalor (C) sebesar 500 J/°C. Jika suhunya dinaikkan sebesar 25°C, berapakah kalor yang diterima teko tersebut?',
    given: [
      { label: 'Kapasitas Kalor (C)', value: '500 J/°C' },
      { label: 'Perubahan Suhu (ΔT)', value: '25°C' }
    ],
    formulaHint: 'Q = C × ΔT',
    unit: 'Joule (J)',
    correctAnswer: 12500,
    tolerance: 0,
    explanation: 'Q = C × ΔT = 500 J/°C × 25°C = 12.500 Joule.',
    points: 3
  },
  {
    id: 'hc4',
    level: 'MEDIUM',
    type: 'Latent Heat',
    badge: 'Q = m × L',
    story: 'Sebanyak 0,5 kg es bersuhu 0°C hendak dileburkan seluruhnya menjadi air 0°C. Diketahui kalor lebur es (L) adalah 336.000 J/kg. Berapakah kalor lebur yang dibutuhkan?',
    given: [
      { label: 'Massa Es (m)', value: '0,5 kg' },
      { label: 'Kalor Lebur (L)', value: '336.000 J/kg' },
      { label: 'Suhu Konstan', value: '0°C' }
    ],
    formulaHint: 'Q = m × L (suhu tidak berubah selama peleburan)',
    unit: 'Joule (J)',
    correctAnswer: 168000,
    tolerance: 0,
    explanation: 'Q = 0,5 kg × 336.000 J/kg = 168.000 Joule.',
    points: 3.5
  },
  {
    id: 'hc5',
    level: 'MEDIUM',
    type: 'Latent Heat',
    badge: 'Q = m × U',
    story: 'Sebanyak 0,2 kg air bersuhu 100°C diubah seluruhnya menjadi uap air bersuhu 100°C. Jika kalor uap air (U) adalah 2.260.000 J/kg, hitunglah kalor penguapan yang dibutuhkan!',
    given: [
      { label: 'Massa Air (m)', value: '0,2 kg' },
      { label: 'Kalor Uap (U)', value: '2.260.000 J/kg' },
      { label: 'Suhu Penguapan', value: '100°C' }
    ],
    formulaHint: 'Q = m × U',
    unit: 'Joule (J)',
    correctAnswer: 452000,
    tolerance: 0,
    explanation: 'Q = 0,2 kg × 2.260.000 J/kg = 452.000 Joule.',
    points: 3.5
  },
  {
    id: 'hc6',
    level: 'MEDIUM',
    type: 'Missing Variable',
    badge: 'c = Q / (m × ΔT)',
    story: 'Sebongkah logam bermassa 2 kg memerlukan kalor sebesar 18.000 J untuk menaikkan suhunya dari 20°C menjadi 40°C. Berapakah kalor jenis logam tersebut dalam J/kg°C?',
    given: [
      { label: 'Kalor Diterima (Q)', value: '18.000 J' },
      { label: 'Massa Logam (m)', value: '2 kg' },
      { label: 'Suhu Awal (T₁)', value: '20°C' },
      { label: 'Suhu Akhir (T₂)', value: '40°C' }
    ],
    formulaHint: 'ΔT = T₂ - T₁ lalu c = Q / (m × ΔT)',
    unit: 'J/kg°C',
    correctAnswer: 450,
    tolerance: 0,
    explanation: 'ΔT = 40 - 20 = 20°C. c = 18.000 / (2 × 20) = 18.000 / 40 = 450 J/kg°C.',
    points: 3.5
  },
  {
    id: 'hc7',
    level: 'MEDIUM',
    type: 'Missing Variable',
    badge: 'm = Q / (c × ΔT)',
    story: 'Sebatang tembaga berkalor jenis c = 390 J/kg°C mengalami kenaikan suhu sebesar 20°C saat menyerap kalor 7.800 J. Hitunglah massa batang tembaga tersebut dalam kg!',
    given: [
      { label: 'Kalor Diterima (Q)', value: '7.800 J' },
      { label: 'Kalor Jenis (c)', value: '390 J/kg°C' },
      { label: 'Perubahan Suhu (ΔT)', value: '20°C' }
    ],
    formulaHint: 'm = Q / (c × ΔT)',
    unit: 'kg',
    correctAnswer: 1,
    tolerance: 0,
    explanation: 'm = 7.800 / (390 × 20) = 7.800 / 7.800 = 1 kg.',
    points: 3.5
  },
  {
    id: 'hc8',
    level: 'EXTREME',
    type: 'Missing Variable',
    badge: 'ΔT = Q / C',
    story: 'Sebuah kalorimeter memiliki kapasitas kalor C = 800 J/°C. Jika kalorimeter tersebut diberi kalor sebesar 20.000 J dan suhu awalnya adalah 25°C, berapakah suhu AKHIR kalorimeter dalam °C?',
    given: [
      { label: 'Kapasitas Kalor (C)', value: '800 J/°C' },
      { label: 'Kalor Diterima (Q)', value: '20.000 J' },
      { label: 'Suhu Awal (T₁)', value: '25°C' }
    ],
    formulaHint: 'Cari ΔT = Q / C, lalu T₂ = T₁ + ΔT',
    unit: '°C',
    correctAnswer: 50,
    tolerance: 0,
    explanation: 'ΔT = 20.000 / 800 = 25°C. Suhu akhir T₂ = 25°C + 25°C = 50°C.',
    points: 4
  },
  {
    id: 'hc9',
    level: 'EXTREME',
    type: 'Heat Chain',
    badge: 'Multi-Step Heating',
    story: 'Minyak goreng bermassa 2 kg (c = 2.000 J/kg°C) dipanaskan dalam dua tahap. Tahap 1: suhu naik 15°C. Tahap 2: suhu dinaikkan lagi 25°C. Berapakah TOTAL kalor yang diserap minyak selama kedua tahap tersebut (dalam Joule)?',
    given: [
      { label: 'Massa Minyak (m)', value: '2 kg' },
      { label: 'Kalor Jenis (c)', value: '2.000 J/kg°C' },
      { label: 'Kenaikan Tahap 1 (ΔT₁)', value: '15°C' },
      { label: 'Kenaikan Tahap 2 (ΔT₂)', value: '25°C' }
    ],
    formulaHint: 'Q_total = m × c × (ΔT₁ + ΔT₂)',
    unit: 'Joule (J)',
    correctAnswer: 160000,
    tolerance: 0,
    explanation: 'Total ΔT = 15°C + 25°C = 40°C. Q_total = 2 × 2.000 × 40 = 160.000 Joule. (Tahap 1 = 60.000 J, Tahap 2 = 100.000 J).',
    points: 4
  },
  {
    id: 'hc10',
    level: 'EXTREME',
    type: 'Combined Phase Change',
    badge: 'Q_total = Q_lebur + Q_naik',
    story: 'Sebanyak 0,5 kg es bersuhu 0°C dileburkan seluruhnya menjadi air 0°C, kemudian air tersebut dipanaskan hingga suhunya mencapai 30°C. Diketahui L_es = 336.000 J/kg dan c_air = 4.200 J/kg°C. Hitunglah total kalor yang dibutuhkan!',
    given: [
      { label: 'Massa Es & Air (m)', value: '0,5 kg' },
      { label: 'Kalor Lebur Es (L)', value: '336.000 J/kg' },
      { label: 'Kalor Jenis Air (c)', value: '4.200 J/kg°C' },
      { label: 'Kenaikan Suhu Air (ΔT)', value: '30°C (0°C ke 30°C)' }
    ],
    formulaHint: 'Q₁ = m × L; Q₂ = m × c × ΔT; Q_total = Q₁ + Q₂',
    unit: 'Joule (J)',
    correctAnswer: 231000,
    tolerance: 0,
    explanation: 'Q₁ (lebur) = 0,5 × 336.000 = 168.000 J. Q₂ (pemanasan) = 0,5 × 4.200 × 30 = 63.000 J. Q_total = 168.000 + 63.000 = 231.000 Joule.',
    points: 4.5
  }
];
