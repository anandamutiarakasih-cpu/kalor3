/**
 * THERMO CHAMPIONS: HEAT EDITION
 * Authoritative Multiplayer Game Server
 * Node.js + Express + Socket.IO + Supabase
 */

import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import { TimerManager } from './engine/timer-manager.js';
import { RoomManager } from './engine/room-manager.js';
import { registerSocketHandlers } from './socket/game-handlers.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = parseInt(process.env.PORT, 10) || 3000;
const CLIENT_URL = process.env.CLIENT_URL || '*';

const app = express();
const server = http.createServer(app);

// Configure CORS for Express
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS']
}));

app.use(express.json());

// Configure Socket.IO
const io = new SocketIOServer(server, {
  cors: {
    origin: '*', // Allow Vercel preview URLs, localhost, and custom domains
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingInterval: 10000,
  pingTimeout: 5000,
  transports: ['websocket', 'polling']
});

// Initialize Game Engines
const timerManager = new TimerManager(io);
const roomManager = new RoomManager(io, timerManager);

// REST Health Check & Monitoring Endpoints
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'thermo-champions-multiplayer',
    uptime: Math.round(process.uptime()),
    timestamp: Date.now()
  });
});

app.get('/metrics', (req, res) => {
  const mem = process.memoryUsage();
  res.status(200).json({
    uptimeSeconds: Math.round(process.uptime()),
    activeRooms: roomManager.rooms.size,
    connectedSockets: io.engine.clientsCount,
    memory: {
      rssMb: Math.round(mem.rss / 1024 / 1024),
      heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
      heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024)
    },
    rooms: Array.from(roomManager.rooms.values()).map(r => ({
      code: r.code,
      status: r.status,
      phase: r.currentPhase,
      claimedTeams: Object.values(r.teams).filter(t => t.claimed).length,
      createdAt: r.createdAt
    }))
  });
});

// Root ping
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head><title>Thermo Champions Server</title></head>
      <body style="font-family:sans-serif;background:#0f172a;color:#f8fafc;padding:2rem;">
        <h1>🔥 Thermo Champions: Heat Edition Multiplayer Server</h1>
        <p>Status: <span style="color:#22c55e;font-weight:bold;">ONLINE</span></p>
        <p>Socket.IO endpoint ready. Health check: <a href="/health" style="color:#38bdf8;">/health</a></p>
      </body>
    </html>
  `);
});

// Socket.IO Connection Lifecycle
io.on('connection', (socket) => {
  console.log(`[Socket] New connection established: ${socket.id} (Transport: ${socket.conn.transport.name})`);
  registerSocketHandlers(io, socket, roomManager, timerManager);
});

// Graceful Shutdown
const handleShutdown = (signal) => {
  console.log(`\n[Server] Received ${signal}. Shutting down gracefully...`);
  timerManager.clearAll();
  server.close(() => {
    console.log('[Server] HTTP and Socket.IO server closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

server.listen(PORT, '0.0.0.0', () => {
  console.log('====================================================');
  console.log(`🔥 THERMO CHAMPIONS AUTHORITATIVE SERVER RUNNING`);
  console.log(`📡 Port: ${PORT}`);
  console.log(`🌐 Health: http://localhost:${PORT}/health`);
  console.log(`📊 Metrics: http://localhost:${PORT}/metrics`);
  console.log('====================================================');
});
