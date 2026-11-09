-- ============================================================================
-- THERMO CHAMPIONS: HEAT EDITION — SUPABASE SEED QUESTIONS
-- Bank Soal Resmi Materi Kalor IPA SMP Kelas VII
-- ============================================================================

INSERT INTO questions (id, game_type, sequence_order, term, category, definition, question_text, correct_answer, points, tolerance) VALUES
-- GAME 1: MEMORIZE CARDS
('m1', 'GAME1_MEMORIZE', 1, 'Konduksi', 'Perpindahan Kalor', 'Perpindahan kalor melalui zat tanpa disertai perpindahan partikel zat tersebut.', 'Sendok logam terasa panas saat dicelupkan ke teh mendidih.', 'Konduksi', 0, 0),
('m2', 'GAME1_MEMORIZE', 2, 'Konveksi', 'Perpindahan Kalor', 'Perpindahan kalor yang disertai dengan perpindahan partikel zat perantaranya.', 'Air berputar naik-turun saat direbus; terjadinya angin laut & darat.', 'Konveksi', 0, 0),
('m3', 'GAME1_MEMORIZE', 3, 'Radiasi', 'Perpindahan Kalor', 'Perpindahan kalor berupa gelombang elektromagnetik tanpa memerlukan zat perantara.', 'Pancaran panas Matahari ke Bumi; hangatnya tubuh dekat api unggun.', 'Radiasi', 0, 0),
('m4', 'GAME1_MEMORIZE', 4, 'Konduktor', 'Sifat Bahan', 'Benda atau bahan yang sangat mudah dan cepat menghantarkan kalor.', 'Tembaga, aluminium, besi, baja (dasar wajan & panci).', 'Konduktor', 0, 0),
('m5', 'GAME1_MEMORIZE', 5, 'Isolator', 'Sifat Bahan', 'Benda atau bahan yang sangat lambat atau sukar menghantarkan kalor.', 'Kayu, plastik, ebonit, karet, kain wol (pegangan panci).', 'Isolator', 0, 0),
('m6', 'GAME1_MEMORIZE', 6, 'Kalor Jenis (c)', 'Kapasitas Termal', 'Banyaknya kalor yang diperlukan untuk menaikkan suhu 1 kg zat sebesar 1°C atau 1 K.', 'Kalor jenis air adalah 4.200 J/kg°C (sangat tinggi, penyerap panas baik).', 'Kalor Jenis', 0, 0),
('m7', 'GAME1_MEMORIZE', 7, 'Kalor Lebur (L)', 'Perubahan Wujud', 'Banyaknya kalor yang diperlukan oleh 1 kg zat padat untuk melebur menjadi cair pada titik leburnya.', 'Kalor lebur es = 336.000 J/kg.', 'Kalor Lebur', 0, 0),
('m8', 'GAME1_MEMORIZE', 8, 'Kalor Uap (U)', 'Perubahan Wujud', 'Banyaknya kalor yang diperlukan oleh 1 kg zat cair untuk menguap pada titik didihnya.', 'Kalor uap air = 2.260.000 J/kg.', 'Kalor Uap', 0, 0),
('m9', 'GAME1_MEMORIZE', 9, 'Asas Black', 'Hukum Fisika Termal', 'Hukum kekekalan energi panas: Kalor yang dilepas oleh zat bersuhu tinggi sama dengan kalor yang diserap oleh zat bersuhu rendah (Q_lepas = Q_serap).', 'Pencampuran air panas dan air dingin mencapai suhu akhir kesetimbangan termal.', 'Asas Black', 0, 0),
('m10', 'GAME1_MEMORIZE', 10, 'Termometer', 'Alat Ukur Suhu', 'Alat pengukur derajat panas zat dengan memanfaatkan pemuaian termometrik cairan (raksa/alkohol).', 'Skala Celcius (0°-100°C), Fahrenheit, Reamur, dan Kelvin (SI).', 'Termometer', 0, 0),

-- GAME 1: SHUFFLE & RECALL CHALLENGES
('sc1', 'GAME1_PLAY', 1, 'Konduksi Deskripsi', 'Konsep Dasar', NULL, 'Perpindahan kalor tanpa perpindahan zat secara keseluruhan', 'Perpindahan kalor tanpa perpindahan zat secara keseluruhan', 2.5, 0),
('sc2', 'GAME1_PLAY', 2, 'Knalpot Panas', 'Contoh Nyata', NULL, 'Knalpot sepeda motor menjadi panas saat mesin dinyalakan termasuk peristiwa...', 'Konduksi', 2.5, 0),
('sc3', 'GAME1_PLAY', 3, 'Rebus Air', 'Contoh Nyata', NULL, 'Gerakan sirkulasi air naik dan turun saat dipanaskan di panci merupakan peristiwa...', 'Konveksi', 2.5, 0),
('sc4', 'GAME1_PLAY', 4, 'Sinar Matahari', 'Contoh Nyata', NULL, 'Panas matahari dapat sampai ke bumi melalui ruang hampa udara secara...', 'Radiasi', 2.5, 0),
('sc5', 'GAME1_PLAY', 5, 'Bahan Isolator', 'Karakteristik', NULL, 'Bahan yang sulit / lambat menghantarkan kalor', 'Bahan yang sulit / lambat menghantarkan kalor', 2.5, 0),
('sc6', 'GAME1_PLAY', 6, 'Aluminium & Tembaga', 'Karakteristik', NULL, 'Aluminium dan tembaga banyak digunakan pada alat dapur karena bersifat...', 'Konduktor Panas', 2.5, 0),
('sc7', 'GAME1_PLAY', 7, 'Rumus Q=m.c.ΔT', 'Rumus Kalor', NULL, 'Rumus Q = m × c × ΔT digunakan untuk...', 'Menghitung kalor saat terjadi perubahan suhu', 2.5, 0),
('sc8', 'GAME1_PLAY', 8, 'Rumus Q=m.L', 'Rumus Kalor', NULL, 'Rumus Q = m × L digunakan untuk...', 'Menghitung kalor perubahan wujud (peleburan / pembekuan)', 2.5, 0),
('sc9', 'GAME1_PLAY', 9, 'Mencair & Menguap', 'Perubahan Wujud', NULL, 'Peristiwa perubahan wujud zat mencair dan menguap merupakan proses yang...', 'Proses yang MEMBUTUHKAN / MENYERAP kalor', 2.5, 0),
('sc10', 'GAME1_PLAY', 10, 'Angin Laut & Darat', 'Fenomena Alam', NULL, 'Terjadinya angin laut pada siang hari dan angin darat pada malam hari akibat...', 'Perpindahan kalor secara Konveksi alami di udara', 2.5, 0),

-- GAME 2: WORD SCRAMBLE ITEMS
('ws1', 'GAME2', 1, 'Bentuk Energi Panas', 'Energi', NULL, 'Bentuk energi yang berpindah dari benda bersuhu lebih tinggi ke benda bersuhu lebih rendah', 'KALOR', 3.0, 0),
('ws2', 'GAME2', 2, 'Energi Termal', 'Karakteristik', NULL, 'Energi termal atau rasa hangat yang dihasilkan dari getaran partikel materi', 'PANAS', 3.0, 0),
('ws3', 'GAME2', 3, 'Derajat Panas', 'Besaran Fisika', NULL, 'Derajat atau tingkat panas dinginnya suatu zat atau benda (diukur dalam Celcius atau Kelvin)', 'SUHU', 3.0, 0),
('ws4', 'GAME2', 4, 'Perpindahan Zat Padat', 'Mekanisme', NULL, 'Perpindahan panas melalui medium zat padat tanpa disertai perpindahan partikel zatnya', 'KONDUKSI', 3.0, 0),
('ws5', 'GAME2', 5, 'Perpindahan Fluida', 'Mekanisme', NULL, 'Perpindahan kalor pada zat cair atau gas yang disertai perpindahan fisik partikel fluida', 'KONVEKSI', 3.0, 0),
('ws6', 'GAME2', 6, 'Pancaran Gelombang', 'Mekanisme', NULL, 'Pancaran kalor melalui gelombang elektromagnetik tanpa memerlukan medium perantara apapun', 'RADIASI', 3.0, 0),
('ws7', 'GAME2', 7, 'Padat Jadi Cair', 'Fase Zat', NULL, 'Perubahan wujud benda dari padat menjadi cair karena menyerap sejumlah energi kalor lebur', 'MENCAIR', 3.0, 0),
('ws8', 'GAME2', 8, 'Penghantar Baik', 'Bahan', NULL, 'Bahan atau materi yang sangat mudah dan cepat mengalirkan panas (seperti logam tembaga dan besi)', 'KONDUKTOR', 3.0, 0),
('ws9', 'GAME2', 9, 'Penyekat Panas', 'Bahan', NULL, 'Bahan yang memiliki daya hantar kalor sangat buruk sehingga digunakan sebagai penyekat panas', 'ISOLATOR', 3.0, 0),
('ws10', 'GAME2', 10, 'Padat Jadi Gas', 'Fase Zat', NULL, 'Perubahan wujud zat dari fase padat langsung menjadi gas dengan menyerap kalor (contoh: kapur barus)', 'MENYUBLIM', 3.0, 0),

-- GAME 3: EXTREME ADDITION (HEAT CALCULATIONS)
('hc1', 'GAME3', 1, 'Pemanasan Air 2 kg', 'Perubahan Suhu', NULL, 'Hitunglah kalor (Q) yang dibutuhkan untuk memanaskan 2 kg air dari 30°C menjadi 60°C! (c air = 4.200 J/kg°C)', '252000', 3.0, 0.01),
('hc2', 'GAME3', 2, 'Pemanasan Aluminium 500 g', 'Perubahan Suhu', NULL, 'Berapa kalor yang dibutuhkan untuk menaikkan suhu 0,5 kg aluminium sebesar 50°C jika kalor jenis aluminium 900 J/kg°C?', '22500', 3.0, 0.01),
('hc3', 'GAME3', 3, 'Pemanasan Minyak 1 kg', 'Perubahan Suhu', NULL, 'Minyak goreng bermassa 1 kg dinaikkan suhunya dari 25°C ke 75°C. Jika c minyak = 250 J/kg°C, hitung energi kalornya!', '12500', 3.0, 0.01),
('hc4', 'GAME3', 4, 'Meleburkan Es 0,5 kg', 'Kalor Laten', NULL, 'Hitunglah kalor lebur yang diserap 500 gram es pada suhu 0°C untuk melebur seluruhnya menjadi air! (L es = 336.000 J/kg)', '168000', 3.5, 0.01),
('hc5', 'GAME3', 5, 'Menguapkan Air 200 g', 'Kalor Laten', NULL, 'Sebanyak 200 gram air pada titik didih 100°C diubah seluruhnya menjadi uap. Kalor uap air U = 2.260.000 J/kg. Hitung kalornya!', '452000', 3.5, 0.01),
('hc6', 'GAME3', 6, 'Mencari Kalor Jenis Besi', 'Kapasitas Termal', NULL, 'Logam besi bermassa 2 kg memerlukan kalor 18.000 Joule untuk menaikkan suhunya dari 20°C menjadi 40°C. Berapakah kalor jenis besi tersebut?', '450', 3.5, 0.01),
('hc7', 'GAME3', 7, 'Mencari Massa Tembaga', 'Perubahan Suhu', NULL, 'Kalor sebesar 7.800 J digunakan untuk memanaskan sepotong tembaga (c = 390 J/kg°C) sehingga suhunya naik 20°C. Berapakah massa tembaga (dalam kg)?', '1', 3.5, 0.01),
('hc8', 'GAME3', 8, 'Mencari Kenaikan Suhu Kaca', 'Perubahan Suhu', NULL, 'Sepotong kaca 2 kg diberi kalor 67.000 Joule. Jika kalor jenis kaca 670 J/kg°C, berapakah kenaikan suhunya (ΔT dalam °C)?', '50', 4.0, 0.01),
('hc9', 'GAME3', 9, 'Pemanasan & Peleburan Es', 'Kombinasi Kalor', NULL, 'Berapakah kalor total untuk mengubah 0,5 kg es bersuhu -10°C menjadi air seluruhnya bersuhu 0°C? (c es = 2.100 J/kg°C, L es = 336.000 J/kg)', '178500', 4.0, 0.02),
('hc10', 'GAME3', 10, 'Asas Black Pencampuran Air', 'Asas Black', NULL, 'Sebanyak 200 g air bersuhu 80°C dicampur dengan 300 g air bersuhu 20°C dalam bejana terisolasi. Berapakah suhu akhir campuran (°C)?', '44', 4.5, 0.02)
ON CONFLICT (id) DO UPDATE SET
  term = EXCLUDED.term,
  category = EXCLUDED.category,
  definition = EXCLUDED.definition,
  question_text = EXCLUDED.question_text,
  correct_answer = EXCLUDED.correct_answer,
  points = EXCLUDED.points,
  tolerance = EXCLUDED.tolerance;
