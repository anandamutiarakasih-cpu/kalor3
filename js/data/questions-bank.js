/**
 * THERMO CHAMPIONS: HEAT EDITION
 * Client-Side Question Bank & Interactive Data
 */

/**
 * 4 KARTU MATERI KALOR - CLASH OF CHAMPIONS SHUFFLE & RECALL
 * Sesuai silabus IPA SMP Kelas VII
 */
export const CLASH_SHUFFLE_CARDS = [
  {
    id: 'c1',
    cardIndex: 1,
    title: 'Kartu 1 – Pengertian Kalor',
    concept: 'Pengertian Kalor',
    category: 'Konsep Dasar Kalor',
    definition: 'Kalor merupakan energi yang berpindah dari benda bersuhu lebih tinggi ke benda bersuhu lebih rendah karena adanya perbedaan suhu.',
    keywords: 'Energi Berpindah • Perbedaan Suhu • Suhu Tinggi ke Rendah',
    illustrationSvg: `
      <svg viewBox="0 0 240 140" fill="none" xmlns="http://www.w3.org/2000/svg" class="tc-card-svg">
        <defs>
          <linearGradient id="hotGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#FF5722"/>
            <stop offset="100%" stop-color="#F44336"/>
          </linearGradient>
          <linearGradient id="coldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#0288D1"/>
            <stop offset="100%" stop-color="#00BCD4"/>
          </linearGradient>
          <linearGradient id="arrowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#FF9800"/>
            <stop offset="100%" stop-color="#03A9F4"/>
          </linearGradient>
          <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur"/>
            <feComposite in="SourceGraphic" in2="blur" operator="over"/>
          </filter>
        </defs>
        <!-- Background grid -->
        <rect width="240" height="140" rx="10" fill="#0b1329" stroke="rgba(255,255,255,0.08)"/>
        <!-- Hot Object -->
        <rect x="22" y="32" width="60" height="66" rx="8" fill="url(#hotGrad)" filter="url(#glowFilter)"/>
        <text x="52" y="58" text-anchor="middle" fill="#FFFFFF" font-size="11" font-weight="bold" font-family="sans-serif">BENDA</text>
        <text x="52" y="73" text-anchor="middle" fill="#FFE082" font-size="12" font-weight="900" font-family="sans-serif">PANAS</text>
        <text x="52" y="88" text-anchor="middle" fill="#FFFFFF" font-size="9" font-family="monospace">80°C</text>
        <!-- Heat Waves Icon -->
        <path d="M42 22 Q47 16 52 22 T62 22" stroke="#FF9800" stroke-width="2" fill="none" stroke-linecap="round"/>
        
        <!-- Cold Object -->
        <rect x="158" y="32" width="60" height="66" rx="8" fill="url(#coldGrad)" filter="url(#glowFilter)"/>
        <text x="188" y="58" text-anchor="middle" fill="#FFFFFF" font-size="11" font-weight="bold" font-family="sans-serif">BENDA</text>
        <text x="188" y="73" text-anchor="middle" fill="#E1F5FE" font-size="12" font-weight="900" font-family="sans-serif">DINGIN</text>
        <text x="188" y="88" text-anchor="middle" fill="#FFFFFF" font-size="9" font-family="monospace">20°C</text>
        <!-- Ice Sparkle -->
        <circle cx="188" cy="22" r="2.5" fill="#81D4FA"/>

        <!-- Transfer Arrow -->
        <path d="M88 65 L146 65" stroke="url(#arrowGrad)" stroke-width="4" stroke-linecap="round"/>
        <polygon points="152,65 142,59 142,71" fill="#03A9F4"/>
        <rect x="94" y="44" width="52" height="15" rx="3" fill="#1e293b" stroke="#FF9800" stroke-width="0.75"/>
        <text x="120" y="55" text-anchor="middle" fill="#FFB74D" font-size="8" font-weight="bold" font-family="sans-serif">ALIRAN KALOR</text>

        <!-- Sub caption -->
        <text x="120" y="122" text-anchor="middle" fill="#94A3B8" font-size="9" font-family="sans-serif">Perpindahan Energi karena Beda Suhu</text>
      </svg>
    `
  },
  {
    id: 'c2',
    cardIndex: 2,
    title: 'Kartu 2 – Arah Perpindahan Kalor',
    concept: 'Arah Perpindahan Kalor',
    category: 'Hukum Termal',
    definition: 'Kalor berpindah dari benda bersuhu tinggi menuju benda bersuhu rendah hingga tercapai kesetimbangan termal.',
    keywords: 'Arah Alami • Suhu Tinggi → Rendah • Kesetimbangan Termal (T₁ = T₂)',
    illustrationSvg: `
      <svg viewBox="0 0 240 140" fill="none" xmlns="http://www.w3.org/2000/svg" class="tc-card-svg">
        <defs>
          <linearGradient id="t1Grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#FF7043"/>
            <stop offset="100%" stop-color="#D84315"/>
          </linearGradient>
          <linearGradient id="t2Grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#42A5F5"/>
            <stop offset="100%" stop-color="#1565C0"/>
          </linearGradient>
        </defs>
        <rect width="240" height="140" rx="10" fill="#0b1329" stroke="rgba(255,255,255,0.08)"/>
        <!-- Two bodies touching / transfer bar -->
        <g transform="translate(30, 26)">
          <!-- Body 1 (Tinggi) -->
          <rect x="0" y="10" width="75" height="58" rx="6" fill="url(#t1Grad)"/>
          <text x="37" y="32" text-anchor="middle" fill="#FFF" font-size="10" font-weight="bold" font-family="sans-serif">Suhu Tinggi</text>
          <text x="37" y="50" text-anchor="middle" fill="#FFE082" font-size="13" font-weight="900" font-family="monospace">T₁ &gt; T₂</text>

          <!-- Heat Flux Flow -->
          <path d="M78 39 L100 39" stroke="#FFD54F" stroke-width="3" stroke-dasharray="4 2"/>
          <polygon points="103,39 96,34 96,44" fill="#FFD54F"/>

          <!-- Body 2 (Rendah) -->
          <rect x="105" y="10" width="75" height="58" rx="6" fill="url(#t2Grad)"/>
          <text x="142" y="32" text-anchor="middle" fill="#FFF" font-size="10" font-weight="bold" font-family="sans-serif">Suhu Rendah</text>
          <text x="142" y="50" text-anchor="middle" fill="#BBDEFB" font-size="13" font-weight="900" font-family="monospace">T₂</text>
        </g>

        <!-- Thermal Equilibrium Banner -->
        <rect x="36" y="98" width="168" height="24" rx="12" fill="#1e293b" stroke="#38BDF8" stroke-width="1.2"/>
        <circle cx="50" cy="110" r="4" fill="#22C55E"/>
        <text x="124" y="114" text-anchor="middle" fill="#E2E8F0" font-size="9.5" font-weight="bold" font-family="sans-serif">Hingga Kesetimbangan Termal (T₁ = T₂)</text>
      </svg>
    `
  },
  {
    id: 'c3',
    cardIndex: 3,
    title: 'Kartu 3 – Pengaruh Kalor terhadap Suhu',
    concept: 'Pengaruh Kalor terhadap Suhu',
    category: 'Perubahan Suhu (Q = m·c·ΔT)',
    definition: 'Pemberian kalor dapat menyebabkan suhu suatu benda meningkat, sedangkan pelepasan kalor dapat menyebabkan suhu benda menurun.',
    keywords: 'Terima Kalor → Suhu Naik (ΔT &gt; 0) • Lepas Kalor → Suhu Turun',
    illustrationSvg: `
      <svg viewBox="0 0 240 140" fill="none" xmlns="http://www.w3.org/2000/svg" class="tc-card-svg">
        <rect width="240" height="140" rx="10" fill="#0b1329" stroke="rgba(255,255,255,0.08)"/>
        <!-- Beaker with water -->
        <g transform="translate(35, 18)">
          <!-- Glass Beaker -->
          <rect x="10" y="22" width="60" height="62" rx="4" fill="rgba(56, 189, 248, 0.12)" stroke="#38BDF8" stroke-width="2"/>
          <!-- Water inside -->
          <rect x="12" y="44" width="56" height="38" rx="2" fill="rgba(14, 165, 233, 0.35)"/>
          <!-- Bubbles -->
          <circle cx="28" cy="56" r="3" fill="#E0F2FE" opacity="0.8"/>
          <circle cx="48" cy="64" r="2.5" fill="#E0F2FE" opacity="0.8"/>
          <circle cx="38" cy="72" r="2" fill="#E0F2FE" opacity="0.6"/>
          <!-- Bunsen Fire Flame -->
          <path d="M40 88 C32 98, 28 108, 40 114 C52 108, 48 98, 40 88 Z" fill="#FF5722"/>
          <path d="M40 96 C36 102, 34 107, 40 110 C46 107, 44 102, 40 96 Z" fill="#FFEB3B"/>
        </g>

        <!-- Thermometer -->
        <g transform="translate(135, 16)">
          <rect x="18" y="8" width="10" height="85" rx="5" fill="#1e293b" stroke="#94A3B8" stroke-width="1.5"/>
          <circle cx="23" cy="98" r="10" fill="#EF4444"/>
          <!-- Red Mercury Column rising -->
          <rect x="21" y="24" width="4" height="70" rx="2" fill="#EF4444"/>
          <!-- Temperature scale marks -->
          <line x1="12" y1="30" x2="16" y2="30" stroke="#94A3B8" stroke-width="1.5"/>
          <line x1="12" y1="46" x2="16" y2="46" stroke="#94A3B8" stroke-width="1.5"/>
          <line x1="12" y1="62" x2="16" y2="62" stroke="#94A3B8" stroke-width="1.5"/>
          <line x1="12" y1="78" x2="16" y2="78" stroke="#94A3B8" stroke-width="1.5"/>

          <!-- Rise Indicator Arrow -->
          <path d="M40 76 L40 34" stroke="#FACC15" stroke-width="2.5" stroke-linecap="round"/>
          <polygon points="40,28 35,36 45,36" fill="#FACC15"/>
          <text x="48" y="55" fill="#FACC15" font-size="10" font-weight="900" font-family="sans-serif">+ΔT</text>
          <text x="48" y="68" fill="#FFFFFF" font-size="8" font-family="sans-serif">Naik</text>
        </g>

        <!-- Bottom text -->
        <text x="120" y="128" text-anchor="middle" fill="#94A3B8" font-size="8.5" font-family="sans-serif">Diberi Kalor → Suhu Naik | Melepas Kalor → Suhu Turun</text>
      </svg>
    `
  },
  {
    id: 'c4',
    cardIndex: 4,
    title: 'Kartu 4 – Pengaruh Kalor terhadap Wujud Benda',
    concept: 'Pengaruh Kalor terhadap Wujud Benda',
    category: 'Perubahan Wujud (Q = m·L)',
    definition: 'Kalor dapat menyebabkan perubahan wujud benda, seperti es mencair ketika menerima kalor dan air membeku ketika melepaskan kalor.',
    keywords: 'Mencair (+ Kalor) • Membeku (– Kalor) • Suhu Konstan saat Berubah Wujud',
    illustrationSvg: `
      <svg viewBox="0 0 240 140" fill="none" xmlns="http://www.w3.org/2000/svg" class="tc-card-svg">
        <rect width="240" height="140" rx="10" fill="#0b1329" stroke="rgba(255,255,255,0.08)"/>
        
        <!-- Ice Cube (Solid) -->
        <g transform="translate(24, 28)">
          <rect x="6" y="8" width="46" height="46" rx="6" fill="#0284c7" stroke="#38BDF8" stroke-width="2"/>
          <path d="M12 18 L24 30 M38 16 L28 26 M16 42 L30 36" stroke="#BAE6FD" stroke-width="1.5" stroke-linecap="round"/>
          <text x="29" y="68" text-anchor="middle" fill="#BAE6FD" font-size="10" font-weight="bold" font-family="sans-serif">ES BATU</text>
          <text x="29" y="79" text-anchor="middle" fill="#94A3B8" font-size="8" font-family="sans-serif">(Padat)</text>
        </g>

        <!-- Melting & Freezing Arrows -->
        <g transform="translate(90, 28)">
          <!-- Top Arrow: Mencair (+Kalor) -->
          <path d="M0 18 L54 18" stroke="#F97316" stroke-width="2.5" stroke-linecap="round"/>
          <polygon points="58,18 50,14 50,22" fill="#F97316"/>
          <text x="27" y="12" text-anchor="middle" fill="#FB923C" font-size="7.5" font-weight="bold" font-family="sans-serif">Mencair (+Kalor)</text>

          <!-- Bottom Arrow: Membeku (-Kalor) -->
          <path d="M54 44 L0 44" stroke="#38BDF8" stroke-width="2.5" stroke-linecap="round"/>
          <polygon points="-4,44 4,40 4,48" fill="#38BDF8"/>
          <text x="27" y="56" text-anchor="middle" fill="#38BDF8" font-size="7.5" font-weight="bold" font-family="sans-serif">Membeku (-Kalor)</text>
        </g>

        <!-- Water Drops (Liquid) -->
        <g transform="translate(162, 28)">
          <rect x="6" y="8" width="46" height="46" rx="6" fill="rgba(14, 165, 233, 0.2)" stroke="#0284C7" stroke-width="1.5"/>
          <!-- Droplets -->
          <path d="M29 18 C25 24 21 28 21 33 A8 8 0 0 0 37 33 C37 28 33 24 29 18 Z" fill="#0EA5E9"/>
          <text x="29" y="68" text-anchor="middle" fill="#38BDF8" font-size="10" font-weight="bold" font-family="sans-serif">AIR</text>
          <text x="29" y="79" text-anchor="middle" fill="#94A3B8" font-size="8" font-family="sans-serif">(Cair)</text>
        </g>

        <rect x="28" y="110" width="184" height="20" rx="10" fill="#1e293b" stroke="rgba(255,255,255,0.08)"/>
        <text x="120" y="123" text-anchor="middle" fill="#E2E8F0" font-size="8.5" font-family="sans-serif">Perubahan Wujud Zat Terjadi Pada Suhu Konstan</text>
      </svg>
    `
  }
];

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
    scrambled: 'D U K S N I K O N',
    answer: 'KONDUKSI',
    clue: 'Perpindahan kalor pada zat padat tanpa pergerakan partikel (8 huruf)',
    category: 'Perpindahan Kalor',
    timeLimit: 20,
    points: 3.5
  },
  {
    id: 'ws5',
    difficulty: 'MEDIUM',
    scrambled: 'V E K S N I K O N',
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
