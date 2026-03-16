/**
 * MonoBank Local WiFi Server — Single Room Mode
 * 
 * One phone creates the game (starts this server).
 * Other phones on the same WiFi join by entering the host's IP.
 * 
 * Usage: npx tsx server/index.ts
 * Then other devices connect to http://<host-ip>:3000
 */

import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import { networkInterfaces } from 'os';
import { URL } from 'url';

import { GameRoom } from './game_room_local.js';

const PORT = 3000;
const ROOM_CODE = 'GAME'; // Single fixed room

// ===== Get local IP addresses =====
function getLocalIPs(): string[] {
    const nets = networkInterfaces();
    const results: string[] = [];
    for (const name of Object.keys(nets)) {
        for (const net of nets[name] || []) {
            if (net.family === 'IPv4' && !net.internal) {
                results.push(net.address);
            }
        }
    }
    return results;
}

// ===== Auto-create the single game room =====
const room = new GameRoom(ROOM_CODE, 'MonoBank Game');

// ===== Express App =====
const app = express();
app.use(cors());
app.use(express.json());

// Health check — clients use this to verify connection
app.get('/api/health', (_req, res) => {
    res.json({
        status: 'ok',
        roomCode: ROOM_CODE,
        playerCount: room.getRoomInfo().playerCount,
        ips: getLocalIPs(),
        uptime: process.uptime()
    });
});

// Check room exists (clients verify before WebSocket connect)
app.get('/api/rooms/:code', (req, res) => {
    const code = req.params.code.toUpperCase();
    if (code !== ROOM_CODE) {
        return res.status(404).json({ error: 'Room not found' });
    }
    res.json({ code: ROOM_CODE, exists: true });
});

// ===== HTTP Server + WebSocket =====
const server = createServer(app);
const wss = new WebSocketServer({ noServer: true });

// Handle WebSocket upgrade
server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    const match = url.pathname.match(/^\/api\/rooms\/([A-Z0-9]+)\/websocket$/i);

    if (!match) {
        socket.destroy();
        return;
    }

    const code = match[1].toUpperCase();
    if (code !== ROOM_CODE) {
        socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
        socket.destroy();
        return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
        room.handleSession(ws);
    });
});

// ===== Start Server =====
server.listen(PORT, '0.0.0.0', () => {
    const ips = getLocalIPs();
    console.log('\n╔══════════════════════════════════════════════╗');
    console.log('║         🏦 MonoBank LAN Server               ║');
    console.log('╠══════════════════════════════════════════════╣');
    console.log(`║  Port: ${PORT}                                 ║`);
    console.log('║                                              ║');
    console.log('║  Share this IP with other players:           ║');
    for (const ip of ips) {
        const padded = `${ip}`.padEnd(38);
        console.log(`║  📱 ${padded}║`);
    }
    console.log('║                                              ║');
    console.log('║  Room auto-created: GAME                     ║');
    console.log('╚══════════════════════════════════════════════╝\n');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down server...');
    room.closeAllSessions();
    server.close();
    process.exit(0);
});
