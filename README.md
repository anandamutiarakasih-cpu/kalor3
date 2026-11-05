# THERMO CHAMPIONS: HEAT EDITION
> **Permainan Pembelajaran IPA Fisika Materi KALOR untuk Siswa SMP**  
> *Format Kompetisi Akademik Terinspirasi dari Clash of Champions*

---

## 1. Tentang Aplikasi

**THERMO CHAMPIONS: HEAT EDITION** adalah aplikasi web edukasi interaktif multiplayer yang dirancang khusus untuk pembelajaran materi **KALOR** tingkat Sekolah Menengah Pertama (SMP). Aplikasi ini memungkinkan hingga **8 kelompok siswa** bertanding secara serentak menggunakan perangkat masing-masing (1 perangkat per kelompok) dengan sinkronisasi waktu dan papan skor (leaderboard) secara *realtime*.

### Tujuan Pembelajaran:
- Memahami konsep dasar kalor sebagai energi yang berpindah akibat perbedaan suhu.
- Menguasai macam-macam perpindahan kalor: **Konduksi**, **Konveksi**, dan **Radiasi**.
- Mengklasifikasikan bahan **Konduktor** dan **Isolator** panas.
- Memahami 6 perubahan wujud zat yang menyerap atau melepas kalor.
- Mahir menghitung kalor dengan rumus:
  - $Q = m \times c \times \Delta T$ (Kalor kenaikan suhu)
  - $Q = C \times \Delta T$ (Kapasitas kalor)
  - $Q = m \times L$ (Kalor lebur/laten)
  - $Q = m \times U$ (Kalor penguapan)
  - Menentukan variabel yang belum diketahui ($c = \frac{Q}{m \times \Delta T}$, $m = \frac{Q}{c \times \Delta T}$)
  - Kalkulasi bertahap (*heat chain* & peleburan es + pemanasan air).

---

## 2. Struktur 3 Game & Sistem Penilaian

Total skor maksimal yang dapat diperoleh kelompok adalah **100 Poin**.

| No | Babak Permainan | Konsep & Mekanisme | Skor Maksimal |
|:---:|---|---|:---:|
| **1** | **Shuffle and Recall** | Uji memori termal: Fase Menghafal 10 kartu konsep (35s) dilanjutkan dengan Fase Menyusun & Mencocokkan 10 tantangan (75s). Dilengkapi bonus penyelesaian sempurna (+5 pts). | **30 Pts** |
| **2** | **Word Scramble** | Susun huruf acak magnetis menjadi istilah fisika kalor dengan tingkatan *Easy*, *Medium*, dan *Extreme*. Dilengkapi batas waktu per kata (18–20s) dan *speed bonus*. | **35 Pts** |
| **3** | **Extreme Addition: Heat Calculation** | Stasiun laboratorium perhitungan fisika kalor: 10 soal kuantitatif bertingkat dengan bantuan rumus, parameter terstruktur, validasi desimal/ribuan, serta pembahasan ilmiah instan. | **35 Pts** |
| | **TOTAL KESELURUHAN** | | **100 Pts** |

### Predikat Akhir:
- **86 – 100 Poin**: 🏆 **Thermo Champion**
- **76 – 85 Poin**: ⚡ **Thermo Expert**
- **66 – 75 Poin**: 🔬 **Science Challenger**
- **56 – 65 Poin**: 🧭 **Thermo Explorer**
- **0 – 55 Poin**: 🧪 **Temperature Rookie**

---

## 3. Teknologi yang Digunakan

- **Frontend**:
  - HTML5 & CSS3 modern (CSS Grid, Flexbox, CSS Variables, Glassmorphism).
  - Vanilla JavaScript (ES Modules).
  - Web Audio API (procedural audio synthesizer tanpa dependensi file eksternal).
  - HTML5 Canvas (animasi partikel konveksi energi termal).
  - *Bebas dari React, Vue, Angular, TypeScript, Tailwind, atau Bootstrap sesuai instruksi ketat.*
- **Backend & Database**:
  - **Firebase Authentication** (Anonymous auth & Admin token).
  - **Firebase Realtime Database (RTDB)** untuk sinkronisasi state 8 kelompok dan server timer.
  - **Firebase Cloud Functions** (`/functions`) untuk validasi jawaban aman dari kecurangan (*anti-cheat*), kalkulasi skor, dan speed bonus.
  - **Firebase Security Rules** (`database.rules.json`).
- **Resilient Hybrid Architecture**:
  - Aplikasi dilengkapi dengan mesin sinkronisasi dual-engine (Firebase RTDB + BroadcastChannel/LocalStorage). Aplikasi dapat langsung diuji coba secara multi-tab lokal tanpa hambatan, serta langsung terkoneksi ke Firebase RTDB saat *online*.

---

## 4. Panduan Menjalankan Secara Lokal

Untuk menjalankan frontend secara lokal:

1. Buka terminal di folder project:
   ```bash
   cd d:\Kalor3
   ```
2. Jalankan server statis menggunakan Node.js:
   ```bash
   npx serve public
   ```
   *Atau gunakan ekstensi Live Server di VS Code mengarah ke folder `public/`.*
3. Buka browser pada alamat yang diberikan (misalnya `http://localhost:3000`).
4. Buka tab baru untuk menguji peran kelompok siswa dan peran Guru/Admin!

---

## 5. Panduan Penggunaan Guru / Admin

1. Di halaman utama, pilih kartu **"Login Admin"**.
2. Masukkan kode akses guru:
   - **Passcode Default**: `THERMO2026`
3. Klik tombol **"+ Sesi Baru"** untuk menghasilkan Kode Sesi 6 karakter (misal: `TC8492`).
4. Bagikan kode tersebut ke 8 kelompok siswa di kelas.
5. Guru dapat mengontrol jalannya permainan serentak menggunakan tombol fase:
   - `Lobi Persiapan`: Tempat kelompok mendaftar dan menunggu.
   - `Game 1: Menghafal (35s)`: Layar semua kelompok otomatis menampilkan 10 kartu konsep.
   - `Game 1: Susun & Cocokkan (75s)`: Layar beralih ke kuis pencocokan.
   - `Game 2: Word Scramble`: Memulai babak susun huruf acak.
   - `Game 3: Extreme Addition`: Memulai babak kalkulasi kalor laboratorium.
   - `Buka Leaderboard`: Menampilkan podium 3 besar dan klasemen akhir 8 kelompok.
6. Klik **"📥 Unduh Rekap Hasil (CSV)"** untuk mengunduh rekap nilai kelompok lengkap dengan nama anggota dan nomor absen.
7. Terdapat juga tombol **"⚡ Simulasi 8 Kelompok Uji"** untuk demonstrasi cepat langsung dengan 8 kelompok tiruan tanpa perlu membuka 8 perangkat berbeda.

---

## 6. Panduan Deployment

### A. Hosting Frontend ke Vercel
Project telah menyertakan konfigurasi `vercel.json`.
1. Install Vercel CLI (jika belum):
   ```bash
   npm i -g vercel
   ```
2. Deploy langsung:
   ```bash
   vercel
   ```
   Atau hubungkan repositori Git ke dashboard [Vercel](https://vercel.com) dan tentukan root directory ke folder project ini.

### B. Deployment Firebase (Cloud Functions & Database Rules)
1. Masuk ke folder functions dan install dependensi:
   ```bash
   cd functions
   npm install
   cd ..
   ```
2. Deploy aturan database dan Cloud Functions menggunakan Firebase CLI:
   ```bash
   firebase deploy --only database,functions
   ```

---

## 7. Struktur Direktori Proyek

```
d:\Kalor3\
├── public/                     # Frontend Vanilla JS ES Modules
│   ├── index.html              # Entry point utama web
│   ├── css/
│   │   ├── main.css            # Desain sistem & variabel CSS
│   │   ├── components.css      # Komponen tombol, kartu, input, timer
│   │   ├── lobby.css           # Tampilan lobi, registrasi & panel admin
│   │   ├── game1.css           # Gaya Game 1 (Shuffle & Recall)
│   │   ├── game2.css           # Gaya Game 2 (Word Scramble)
│   │   ├── game3.css           # Gaya Game 3 (Extreme Addition Lab)
│   │   ├── leaderboard.css     # Podium juara & tabel klasemen
│   │   └── responsive.css      # Responsivitas HP, tablet, laptop
│   └── js/
│       ├── app.js              # Router utama dan bootstrap aplikasi
│       ├── config/
│       │   └── firebase-config.js # Konfigurasi Firebase SDK
│       ├── services/
│       │   ├── firebase-service.js# Mesin sinkronisasi RTDB & time offset
│       │   ├── audio-service.js   # Synthesizer audio prosedural Web Audio
│       │   ├── particle-service.js# Animasi partikel konveksi termal canvas
│       │   └── export-service.js  # Generator unduh file CSV guru
│       ├── data/
│       │   ├── predicates.js      # Threshold skor dan lencana predikat
│       │   └── questions-bank.js  # Bank soal & petunjuk rumus lengkap
│       ├── components/
│       │   ├── timer.js           # Countdown timer sinkron SVG
│       │   ├── modal.js           # Modal dialog futuristik
│       │   └── notification.js    # Sistem toast notifikasi
│       └── views/
│           ├── home-view.js       # Halaman awal pemilihan peran
│           ├── register-view.js   # Form registrasi kelompok & anggota
│           ├── waiting-view.js    # Ruang tunggu tersinkronisasi
│           ├── admin-view.js      # Pusat kendali instruktur/guru
│           ├── game1-view.js      # Game 1: Shuffle and Recall
│           ├── game2-view.js      # Game 2: Word Scramble
│           ├── game3-view.js      # Game 3: Extreme Addition
│           └── leaderboard-view.js# Klasemen podium & penganugerahan
├── functions/                  # Firebase Cloud Functions (Node.js)
│   ├── package.json
│   ├── index.js                # Cloud Functions endpoints (createSession, submit, dll.)
│   ├── data/
│   │   └── question-bank.js    # Kunci jawaban rahasia aman di server
│   └── lib/
│       └── scoring.js          # Mesin evaluasi skor & anti-cheat
├── database.rules.json         # Aturan keamanan Firebase RTDB
├── firebase.json               # Konfigurasi deployment Firebase
├── vercel.json                 # Konfigurasi deployment Vercel
└── README.md                   # Dokumentasi lengkap
```
