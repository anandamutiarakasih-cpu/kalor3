# 🚀 Thermo Champions - Authoritative Multiplayer Backend

Backend authoritative multiplayer online real-time untuk **THERMO CHAMPIONS: HEAT EDITION** berbasis **Node.js, Express, Socket.IO, dan Supabase PostgreSQL**.

---

## 🛠️ Arsitektur & Keunggulan

1. **Authoritative Game Server**:
   - Status timer, validasi jawaban, rumus skor kalor, deduplikasi jawaban, dan kalkulasi leaderboard sepenuhnya diatur oleh server.
   - Frontend tidak dapat memanipulasi nilai skor atau memperpanjang waktu permainan.
2. **Authoritative Centralized Timer**:
   - Waktu dihitung berdasarkan timestamp server (`startedAt` dan `endsAt`).
   - Klien menghitung countdown secara lokal dari selisih waktu sehingga tidak membebani jaringan atau database dengan sync per detik.
3. **Session Recovery / Reconnection Resilient**:
   - Menggunakan `sessionToken` acak berkekuatan kriptografi yang disimpan di `localStorage` klien (`tc_socket_session`).
   - Jika siswa mengalami gangguan internet / reload browser, siswa langsung terhubung kembali ke tim semula tanpa kehilangan skor atau progress.
4. **Supabase PostgreSQL Persistence**:
   - In-memory state performa tinggi untuk gameplay real-time (latensi < 10ms).
   - Menyimpan checkpoint ruang (`rooms`), profil kelompok (`teams`), log jawaban (`answers`), dan hasil akhir (`game_results`) ke Supabase secara asinkron.

---

## 📦 Setup & Menjalankan Lokal

### 1. Masuk ke folder server & Pasang Dependencies
```bash
cd server
npm install
```

### 2. Atur Environment Variables
Salin berkas `.env.example` menjadi `.env`:
```env
PORT=3000
NODE_ENV=development
CLIENT_URL=*

SUPABASE_URL=https://ffdawauotorocorlqgsq.supabase.co
SUPABASE_KEY=sb_publishable_h00Bx19fMQCF81Mx2DnRbQ_Osr8mrsP
```

### 3. Jalankan Server
```bash
npm start
```
Server akan aktif di `http://localhost:3000`.
- Health check: `http://localhost:3000/health`
- Live Metrics: `http://localhost:3000/metrics`

---

## 🗄️ Setup Database Supabase

1. Buka dashboard Supabase proyek Anda: `https://supabase.com/dashboard/project/ffdawauotorocorlqgsq`
2. Buka menu **SQL Editor**.
3. Jalankan isi berkas [`supabase/schema.sql`](../supabase/schema.sql) untuk membuat tabel, indeks, dan RLS policies.
4. (Opsional) Jalankan isi berkas [`supabase/seed.sql`](../supabase/seed.sql) untuk memasukkan bank soal resmi Kalor SMP.

---

## ☁️ Panduan Deployment (Railway / Render / VPS)

### Deployment ke Railway (Rekomendasi untuk WebSocket Persisten):
1. Buat akun di [Railway.app](https://railway.app).
2. Buat **New Project** -> **Deploy from GitHub repo**.
3. Pilih repository ini dan atur Root Directory ke `/server` (atau gunakan Dockerfile yang sudah tersedia di `/server/Dockerfile`).
4. Tambahkan Environment Variables di Railway Dashboard:
   - `PORT=3000`
   - `SUPABASE_URL=https://ffdawauotorocorlqgsq.supabase.co`
   - `SUPABASE_KEY=sb_publishable_h00Bx19fMQCF81Mx2DnRbQ_Osr8mrsP`
   - `CLIENT_URL=https://alamat-frontend-anda.vercel.app`
5. Railway akan otomatis membangun image dan memberikan domain publik seperti:
   `https://thermo-champions-production.up.railway.app`
6. Masukkan URL Railway tersebut ke frontend Vercel / konfigurasi client.

---

## 🧪 Automated Load & Flow Testing
Jalankan simulasi 1 Host + 8 Kelompok bermain secara bersamaan:
```bash
node tests/multiplayer-simulation.js
```
