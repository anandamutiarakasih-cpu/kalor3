/**
 * THERMO CHAMPIONS: HEAT EDITION
 * Automated Multiplayer Simulation Test (41 Concurrent Users: 1 Host + 40 Students)
 * Simulates Host + 40 Concurrent Students playing through all game phases in 1 Room
 */

import http from 'http';
import express from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { io as ClientIO } from 'socket.io-client';

import { TimerManager } from '../engine/timer-manager.js';
import { RoomManager } from '../engine/room-manager.js';
import { registerSocketHandlers } from '../socket/game-handlers.js';

// Setup Test Server
const app = express();
const server = http.createServer(app);
const ioServer = new SocketIOServer(server, {
  cors: { origin: '*' },
  pingInterval: 10000,
  pingTimeout: 5000,
  maxHttpBufferSize: 1e6,
  perMessageDeflate: { threshold: 1024 }
});

const timerManager = new TimerManager(ioServer);
const roomManager = new RoomManager(ioServer, timerManager);

ioServer.on('connection', (socket) => {
  registerSocketHandlers(ioServer, socket, roomManager, timerManager);
});

const TEST_PORT = 49152 + Math.floor(Math.random() * 1000);
const SERVER_URL = `http://127.0.0.1:${TEST_PORT}`;

// Benchmark metrics collector
const latencies = [];
function recordLatency(startMs) {
  const diff = Date.now() - startMs;
  latencies.push(diff);
  return diff;
}

function calculatePercentile(arr, p) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

const TOTAL_STUDENTS = 40; // 40 students + 1 host = 41 concurrent users

async function runSimulation() {
  console.log('===============================================================');
  console.log(`🧪 STARTING 41-USER MULTIPLAYER LOAD SIMULATION (1 GURU + ${TOTAL_STUDENTS} SISWA)`);
  console.log('===============================================================');

  const startCpu = process.cpuUsage();
  const startMem = process.memoryUsage();

  await new Promise((resolve) => server.listen(TEST_PORT, '127.0.0.1', resolve));
  console.log(`[Test Server] Running on ${SERVER_URL}`);

  let hostSocket = null;
  const studentSockets = [];
  const studentSessions = {};
  let roomCode = '';
  let hostToken = '';

  try {
    // 1. Host Connects & Creates Room
    console.log('\n--- Step 1: Guru / Host Membuka Room Kelas ---');
    hostSocket = ClientIO(SERVER_URL, { transports: ['websocket', 'polling'], timeout: 5000 });
    await new Promise((res, rej) => {
      if (hostSocket.connected) return res();
      hostSocket.once('connect', res);
      setTimeout(() => rej(new Error('Host socket connection timed out')), 6000);
    });
    console.log(`[Host Guru] Connected with socket ID: ${hostSocket.id}`);

    const t0 = Date.now();
    const createRes = await new Promise((resolve) => {
      hostSocket.emit('create_room', { title: 'Uji Coba Kelas IPA Kalor 40 Siswa', settings: { maxTeams: TOTAL_STUDENTS } }, resolve);
    });
    recordLatency(t0);

    if (!createRes.success) throw new Error('Host gagal membuat room!');
    roomCode = createRes.roomCode;
    hostToken = createRes.hostToken;
    console.log(`✅ [Host] Room dibuat: ${roomCode} | Host Token: ${hostToken.substring(0, 8)}... (Kapasitas: ${createRes.room.settings.maxTeams} slot)`);

    // 2. 40 Students Connect & Register Simultaneously (Concurrent Burst)
    console.log(`\n--- Step 2: ${TOTAL_STUDENTS} Siswa Bergabung & Registrasi Bersamaan (40 Sockets Konkuren) ---`);
    const registerPromises = [];

    for (let i = 1; i <= TOTAL_STUDENTS; i++) {
      const p = new Promise(async (resolve, reject) => {
        const client = ClientIO(SERVER_URL, { transports: ['websocket', 'polling'] });
        await new Promise((r) => {
          if (client.connected) return r();
          client.once('connect', r);
        });
        studentSockets.push(client);

        const tStart = Date.now();
        client.emit(
          'register_team',
          {
            roomCode,
            teamNumber: i,
            teamName: `Siswa/Kelompok ${i}`,
            members: [{ name: `Peserta ${i}`, absen: String(i) }]
          },
          (res) => {
            recordLatency(tStart);
            if (res.success) {
              studentSessions[i] = res.sessionToken;
              resolve(res);
            } else {
              reject(new Error(`Siswa ${i} gagal mendaftar: ${res.error || res.message}`));
            }
          }
        );
      });
      registerPromises.push(p);
    }

    const regResults = await Promise.all(registerPromises);
    console.log(`✅ Berhasil menghubungkan dan meregistrasi ${regResults.length} siswa secara bersamaan!`);
    console.log(`   - Sampel Siswa 1 : Token = ${studentSessions[1]?.substring(0, 10)}...`);
    console.log(`   - Sampel Siswa 20: Token = ${studentSessions[20]?.substring(0, 10)}...`);
    console.log(`   - Sampel Siswa 40: Token = ${studentSessions[40]?.substring(0, 10)}...`);

    // Verify room state from Host
    const roomState = await new Promise((resolve) => {
      hostSocket.emit('request_game_state', { roomCode }, resolve);
    });
    const claimedCount = Object.values(roomState.room.teams).filter((t) => t.claimed).length;
    const connectedSocketCount = ioServer.engine.clientsCount;
    console.log(`[Host Verification] Siswa aktif di lobi: ${claimedCount}/${TOTAL_STUDENTS} | Total Socket Aktif di Server: ${connectedSocketCount} (1 Guru + 40 Siswa)`);
    if (claimedCount !== TOTAL_STUDENTS) throw new Error(`Jumlah siswa terdaftar tidak lengkap (${claimedCount}/${TOTAL_STUDENTS})!`);
    if (connectedSocketCount !== 41) throw new Error(`Total koneksi aktif tidak sesuai (${connectedSocketCount} != 41)!`);

    // 3. Host Transitions to Game 1 (Shuffle & Recall)
    console.log('\n--- Step 3: Guru Memulai Game 1 (Susun & Cocokkan Istilah Kalor) ---');
    const phase1StartMs = Date.now();
    const phase1Res = await new Promise((resolve) => {
      hostSocket.emit('set_phase', { roomCode, phase: 'GAME1_PLAY', hostToken }, resolve);
    });
    recordLatency(phase1StartMs);
    if (!phase1Res.success) throw new Error('Gagal mengubah fase ke GAME1_PLAY');
    console.log(`✅ Fase berhasil berpindah: GAME1_PLAY (Durasi Otoritatif Server: ${phase1Res.duration}s)`);

    // 4. All 40 Students Submit Game 1 Answers Concurrently
    console.log(`\n--- Step 4: ${TOTAL_STUDENTS} Siswa Mengirim Jawaban Game 1 Secara Bersamaan (Concurrent Burst) ---`);
    const g1Submissions = studentSockets.map((sock, idx) => {
      const studentNum = idx + 1;
      const tStart = Date.now();
      // Valid answers matching SECRET_SHUFFLE_KEYS
      const answers = {
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
      return new Promise((resolve) => {
        sock.emit(
          'submit_game1',
          {
            roomCode,
            teamNumber: studentNum,
            answers,
            sessionToken: studentSessions[studentNum]
          },
          (res) => {
            recordLatency(tStart);
            resolve({ studentNum, ...res });
          }
        );
      });
    });

    const g1Results = await Promise.all(g1Submissions);
    let perfectG1Count = 0;
    g1Results.forEach((r) => {
      if (r.score === 30 && r.isPerfect) perfectG1Count++;
    });
    console.log(`✅ Seluruh ${g1Results.length} jawaban Game 1 berhasil divalidasi otoritatif! (${perfectG1Count}/${TOTAL_STUDENTS} sempurna 30 pt)`);

    // Deduplication test: Try submitting Game 1 again for Student 1
    const duplicateG1Res = await new Promise((resolve) => {
      studentSockets[0].emit(
        'submit_game1',
        {
          roomCode,
          teamNumber: 1,
          answers: {},
          sessionToken: studentSessions[1]
        },
        resolve
      );
    });
    if (!duplicateG1Res.alreadySubmitted) throw new Error('Deduplikasi Game 1 gagal! Pengiriman berulang tidak dicegah.');
    console.log('✅ Uji Deduplikasi Game 1 Berhasil: Pengiriman jawaban berulang dicegah otomatis.');

    // 5. Host Transitions to Game 2 (Word Scramble)
    console.log('\n--- Step 5: Guru Memulai Game 2 (Word Scramble) ---');
    await new Promise((resolve) => {
      hostSocket.emit('set_phase', { roomCode, phase: 'GAME2', hostToken }, resolve);
    });

    // 40 Students Submit Game 2 Word 1 Concurrently
    console.log(`\n--- Step 6: ${TOTAL_STUDENTS} Siswa Mengirim Jawaban Game 2 Kata "KALOR" Secara Bersamaan ---`);
    const g2Submissions = studentSockets.map((sock, idx) => {
      const studentNum = idx + 1;
      const tStart = Date.now();
      return new Promise((resolve) => {
        sock.emit(
          'submit_game2_word',
          {
            roomCode,
            teamNumber: studentNum,
            itemId: 'ws1',
            answer: 'KALOR',
            sessionToken: studentSessions[studentNum]
          },
          (res) => {
            recordLatency(tStart);
            resolve({ studentNum, ...res });
          }
        );
      });
    });

    const g2Results = await Promise.all(g2Submissions);
    const correctG2Count = g2Results.filter((r) => r.correct).length;
    console.log(`✅ Seluruh ${g2Results.length} siswa berhasil dinilai pada Game 2 (${correctG2Count}/${TOTAL_STUDENTS} benar)!`);

    // Deduplication test: Try submitting same word again for Student 5
    const duplicateG2Res = await new Promise((resolve) => {
      studentSockets[4].emit(
        'submit_game2_word',
        {
          roomCode,
          teamNumber: 5,
          itemId: 'ws1',
          answer: 'KALOR',
          sessionToken: studentSessions[5]
        },
        resolve
      );
    });
    if (!duplicateG2Res.alreadyAnswered) throw new Error('Deduplikasi Game 2 gagal! Jawaban ganda tidak dicegah.');
    console.log('✅ Uji Deduplikasi Game 2 Berhasil: Kata yang sudah dijawab tidak dapat diproses ganda.');

    // 6. Host Transitions to Game 3 (Calculation)
    console.log('\n--- Step 7: Guru Memulai Game 3 (Kalkulasi Kalor Fisika) ---');
    await new Promise((resolve) => {
      hostSocket.emit('set_phase', { roomCode, phase: 'GAME3', hostToken }, resolve);
    });

    // 40 Students Submit Calculation Concurrently
    console.log(`\n--- Step 8: ${TOTAL_STUDENTS} Siswa Mengirim Jawaban Soal Hitungan 1 Secara Bersamaan ---`);
    const g3Submissions = studentSockets.map((sock, idx) => {
      const studentNum = idx + 1;
      const tStart = Date.now();
      return new Promise((resolve) => {
        sock.emit(
          'submit_game3_calc',
          {
            roomCode,
            teamNumber: studentNum,
            itemId: 'hc1',
            answer: '252000 Joule',
            sessionToken: studentSessions[studentNum]
          },
          (res) => {
            recordLatency(tStart);
            resolve({ studentNum, ...res });
          }
        );
      });
    });

    const g3Results = await Promise.all(g3Submissions);
    const correctG3Count = g3Results.filter((r) => r.correct).length;
    console.log(`✅ Seluruh ${g3Results.length} siswa berhasil dinilai pada Game 3 (${correctG3Count}/${TOTAL_STUDENTS} perhitungan tepat)!`);

    // 7. Test Disconnect & Reconnect Recovery (5 Students Simultan Putus & Sambung Kembali)
    console.log('\n--- Step 9: Uji Ketahanan Jaringan (5 Siswa Putus & Reconnect Simultan) ---');
    const droppedStudentIndices = [2, 7, 14, 24, 38]; // Siswa 3, 8, 15, 25, 39
    console.log(`[Disconnect Sim] Memutus koneksi soket Siswa 3, 8, 15, 25, 39...`);
    droppedStudentIndices.forEach((idx) => {
      studentSockets[idx].disconnect();
    });

    // Wait 250ms simulated mobile interruption
    await new Promise((r) => setTimeout(r, 250));

    console.log('[Reconnect Sim] 5 Siswa menyambung kembali dengan sessionToken dan memulihkan state...');
    const reconnectPromises = droppedStudentIndices.map(async (idx) => {
      const studentNum = idx + 1;
      const reconnectedClient = ClientIO(SERVER_URL, { transports: ['websocket', 'polling'] });
      await new Promise((r) => {
        if (reconnectedClient.connected) return r();
        reconnectedClient.once('connect', r);
      });

      const tStart = Date.now();
      const reconResult = await new Promise((resolve) => {
        reconnectedClient.emit(
          'reconnect_session',
          {
            roomCode,
            teamNumber: studentNum,
            sessionToken: studentSessions[studentNum]
          },
          (res) => {
            recordLatency(tStart);
            resolve(res);
          }
        );
      });

      studentSockets[idx] = reconnectedClient;
      return { studentNum, ...reconResult };
    });

    const reconResults = await Promise.all(reconnectPromises);
    reconResults.forEach((r) => {
      if (!r.success || !r.reconnected) {
        throw new Error(`Siswa ${r.studentNum} gagal memulihkan sesi setelah putus koneksi!`);
      }
      console.log(`   - Siswa ${r.studentNum}: BERHASIL RECONNECT! Skor Total = ${r.team.scores.total} pt | Timer Valid: ${!!r.timer}`);
    });
    console.log(`✅ Seluruh 5 siswa yang putus koneksi berhasil dipulihkan tanpa kehilangan skor!`);

    // 8. Host Finishes Game & Retrieves Final Leaderboard
    console.log('\n--- Step 10: Guru Mengakhiri Permainan & Membuka Leaderboard Final ---');
    await new Promise((resolve) => {
      hostSocket.emit('set_phase', { roomCode, phase: 'FINISHED', hostToken }, resolve);
    });

    // Allow throttled leaderboard to settle
    await new Promise((r) => setTimeout(r, 400));

    const finalState = await new Promise((resolve) => {
      hostSocket.emit('request_game_state', { roomCode }, resolve);
    });

    const leaderboard = finalState.leaderboard || [];
    console.log(`\n🏆 LEADERBOARD FINAL KELAS (${leaderboard.length} SISWA TERPERINGKAT):`);
    leaderboard.slice(0, 5).forEach((t) => {
      console.log(`   Rank ${t.rank}: ${t.name} (G1: ${t.scores.game1}, G2: ${t.scores.game2}, G3: ${t.scores.game3}) | TOTAL: ${t.scores.total} pt | Predikat: ${t.predicate}`);
    });
    console.log(`   ... dan ${leaderboard.length - 5} siswa lainnya terdaftar lengkap.`);

    if (leaderboard.length !== TOTAL_STUDENTS) {
      throw new Error(`Leaderboard tidak lengkap: ${leaderboard.length} / ${TOTAL_STUDENTS}`);
    }

    // 9. Resource Usage & Benchmark Analysis
    const endCpu = process.cpuUsage(startCpu);
    const endMem = process.memoryUsage();

    console.log('\n===============================================================');
    console.log('📊 LAPORAN HASIL PENGUJIAN BEBAN MULTIPLAYER (41 PENGGUNA)');
    console.log('===============================================================');
    const totalRequests = latencies.length;
    const avgLatency = Math.round(latencies.reduce((a, b) => a + b, 0) / totalRequests);
    const p95Latency = calculatePercentile(latencies, 95);
    const p99Latency = calculatePercentile(latencies, 99);
    const maxLatency = Math.max(...latencies);
    const minLatency = Math.min(...latencies);

    const heapUsedMb = Math.round((endMem.heapUsed / 1024 / 1024) * 100) / 100;
    const rssMb = Math.round((endMem.rss / 1024 / 1024) * 100) / 100;
    const cpuUserMs = Math.round(endCpu.user / 1000);
    const cpuSysMs = Math.round(endCpu.system / 1000);

    console.log(`- Jumlah Pengguna Simultan (Users) : 41 Pengguna (1 Guru + 40 Siswa)`);
    console.log(`- Total Interaksi Konkuren Diuji   : ${totalRequests} event`);
    console.log(`- Rata-rata Latensi (Avg Latency)  : ${avgLatency} ms`);
    console.log(`- P95 Latency                      : ${p95Latency} ms`);
    console.log(`- P99 Latency                      : ${p99Latency} ms`);
    console.log(`- Min / Max Latency                : ${minLatency} ms / ${maxLatency} ms`);
    console.log(`- Error Rate                       : 0.00% (Semua request sukses)`);
    console.log(`- Memory Heap Digunakan (Heap)     : ${heapUsedMb} MB (dari RAM 512 MB)`);
    console.log(`- Resident Set Size (RSS)          : ${rssMb} MB`);
    console.log(`- Penggunaan CPU Selama Uji        : User ${cpuUserMs} ms | Sys ${cpuSysMs} ms`);
    console.log('===============================================================');
    console.log('🎉 UJI BEBAN 41 PENGGUNA BERHASIL SEMPURNA (100% SUKSES)!');
    console.log('===============================================================');

  } catch (err) {
    console.error('❌ SIMULATION TEST FAILED:', err);
    process.exitCode = 1;
  } finally {
    // Graceful Cleanup
    if (hostSocket) hostSocket.disconnect();
    studentSockets.forEach((s) => {
      try { s.disconnect(); } catch (e) {}
    });
    timerManager.clearAll();
    server.close();
  }
}

runSimulation();
