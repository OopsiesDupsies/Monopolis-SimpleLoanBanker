import { Hono } from 'hono';
import { cors } from 'hono/cors';

type Bindings = {
  GAME_ROOM: DurableObjectNamespace;
};

interface RoomInfo {
  code: string;
  name: string;
  playerCount: number;
  status: 'lobby' | 'active';
  createdAt: number;
  isPrivate?: boolean;
}

const app = new Hono<{ Bindings: Bindings }>();

app.use('/*', cors());

// Helper to generate IDs
const uid = () => Math.random().toString(36).slice(2, 8).toUpperCase();

// ===== ROOM CREATION/DELETION RATE LIMITER =====
const ROOM_ACTION_COOLDOWN_MS = 10_000; // 10 seconds between create/delete
const roomActionLog = new Map<string, number>(); // IP -> last action timestamp

// Prune stale entries periodically (every 100 checks)
let roomRLCheckCount = 0;
function pruneRoomActionLog() {
  roomRLCheckCount++;
  if (roomRLCheckCount % 100 === 0) {
    const now = Date.now();
    for (const [ip, ts] of roomActionLog) {
      if (now - ts > 60_000) roomActionLog.delete(ip);
    }
  }
}

function checkRoomRateLimit(ip: string): boolean {
  pruneRoomActionLog();
  const now = Date.now();
  const last = roomActionLog.get(ip) || 0;
  if (now - last < ROOM_ACTION_COOLDOWN_MS) {
    return false; // rate limited
  }
  roomActionLog.set(ip, now);
  return true;
}

function getClientIP(c: any): string {
  return c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

// ===== ROOM CLEANUP =====
// Check all registered rooms and remove inactive ones
async function cleanupInactiveRooms(env: Bindings, excludeCode?: string) {
  try {
    const registryId = env.GAME_ROOM.idFromName("__REGISTRY__");
    const registryObj = env.GAME_ROOM.get(registryId);

    const res = await registryObj.fetch(new Request('https://internal/registry/list'));
    const { rooms: roomCodes } = await res.json() as { rooms: string[] };

    if (!roomCodes || roomCodes.length === 0) return;

    const deadRooms: string[] = [];

    // Check each room in parallel (skip the just-created room)
    const checks = roomCodes.filter(c => c !== excludeCode).map(async (code: string) => {
      try {
        const id = env.GAME_ROOM.idFromName(code);
        const obj = env.GAME_ROOM.get(id);
        const infoRes = await obj.fetch(new Request('https://internal/info'));
        const data = await infoRes.json() as { exists: boolean; info?: RoomInfo & { activeSessions?: number; lastActivityAt?: number; pausedUntil?: number } };

        if (!data.exists || !data.info) {
          deadRooms.push(code);
        } else {
          const now = Date.now();
          const NEW_ROOM_GRACE_MS = 10 * 60 * 1000; // 10 minutes for new/empty rooms
          const DEFAULT_GRACE_MS = 2 * 60 * 60 * 1000; // 2 hours for disconnected rooms
          const roomAge = now - (data.info.createdAt || 0);

          // If room is paused and pause hasn't expired, skip cleanup entirely
          if (data.info.pausedUntil && data.info.pausedUntil > now) {
            // Room is actively paused — leave it alone
          } else if (data.info.playerCount === 0 && roomAge > NEW_ROOM_GRACE_MS) {
            // No players and older than 10 min — remove
            deadRooms.push(code);
          } else if (data.info.playerCount > 0 && data.info.activeSessions === 0) {
            // Has players but no active sockets — check 2hr grace period
            const lastActivity = data.info.lastActivityAt || data.info.createdAt || 0;
            const timeSinceActivity = now - lastActivity;
            if (timeSinceActivity > DEFAULT_GRACE_MS) {
              deadRooms.push(code);
            }
          }
          // else: room has active sessions or is new — keep alive
        }
      } catch {
        // If we can't reach the room, consider it dead
        deadRooms.push(code);
      }
    });

    await Promise.all(checks);

    // Remove dead rooms from registry and clear their state
    for (const code of deadRooms) {
      try {
        await registryObj.fetch(new Request('https://internal/registry/remove', {
          method: 'POST',
          body: JSON.stringify({ code }),
          headers: { 'Content-Type': 'application/json' }
        }));
        const roomId = env.GAME_ROOM.idFromName(code);
        const roomObj = env.GAME_ROOM.get(roomId);
        await roomObj.fetch(new Request('https://internal/clear', { method: 'POST' }));
      } catch {
        // Ignore errors during cleanup of individual rooms
      }
    }

    if (deadRooms.length > 0) {
      console.log(`Room cleanup: removed ${deadRooms.length} inactive rooms: ${deadRooms.join(', ')}`);
    }
  } catch (e) {
    console.error('Room cleanup error:', e);
  }
}

// Create Room -> creates DO and marks it as existing
app.post('/api/rooms', async (c) => {
  // Rate limit room creation
  const ip = getClientIP(c);
  if (!checkRoomRateLimit(ip)) {
    return c.json({ error: 'Slow down! Please wait a few seconds before creating another room.' }, 429);
  }

  const body = await c.req.json() as { isPrivate?: boolean; password?: string; roomName?: string };
  const code = uid();
  const id = c.env.GAME_ROOM.idFromName(code);
  const obj = c.env.GAME_ROOM.get(id);
  // Initialize the room with its code (DO can't get its own name from state.id.name)
  await obj.fetch(new Request('https://internal/init', {
    method: 'POST',
    body: JSON.stringify({ code, ...body }),
    headers: { 'Content-Type': 'application/json' }
  }));

  // Also register in the global registry
  const registryId = c.env.GAME_ROOM.idFromName("__REGISTRY__");
  const registryObj = c.env.GAME_ROOM.get(registryId);
  await registryObj.fetch(new Request('https://internal/registry/add', {
    method: 'POST',
    body: JSON.stringify({ code }),
    headers: { 'Content-Type': 'application/json' }
  }));

  // Run room cleanup in background (non-blocking), excluding the room we just created
  c.executionCtx.waitUntil(cleanupInactiveRooms(c.env, code));

  return c.json({ code });
});

// List all rooms
app.get('/api/rooms', async (c) => {
  // Get the registry DO
  const registryId = c.env.GAME_ROOM.idFromName("__REGISTRY__");
  const registryObj = c.env.GAME_ROOM.get(registryId);

  // Get list of room codes from registry
  const registryRes = await registryObj.fetch(new Request('https://internal/registry/list'));
  const { rooms: roomCodes } = await registryRes.json() as { rooms: string[] };

  // Fetch info for each room in parallel
  const roomInfoPromises = roomCodes.map(async (code: string) => {
    try {
      const id = c.env.GAME_ROOM.idFromName(code);
      const obj = c.env.GAME_ROOM.get(id);
      const res = await obj.fetch(new Request('https://internal/info'));
      const data = await res.json() as { exists: boolean; info?: RoomInfo };
      if (data.exists && data.info) {
        return data.info;
      }
      return null;
    } catch (e) {
      return null;
    }
  });

  const roomInfos = await Promise.all(roomInfoPromises);
  // Filter out null rooms AND rooms with 0 players (empty/abandoned)
  const validRooms = roomInfos.filter((r): r is RoomInfo => r !== null && r.playerCount > 0);

  // Sort by createdAt (newest first)
  validRooms.sort((a, b) => b.createdAt - a.createdAt);

  return c.json({ rooms: validRooms });
});

// Check if room exists
app.get('/api/rooms/:code', async (c) => {
  const code = c.req.param('code');
  const id = c.env.GAME_ROOM.idFromName(code);
  const obj = c.env.GAME_ROOM.get(id);
  const response = await obj.fetch(new Request('https://internal/exists'));
  const data = await response.json() as { exists: boolean };
  if (!data.exists) {
    return c.json({ error: 'Room not found' }, 404);
  }
  return c.json({ code, exists: true });
});

// Delete a room (remove from registry and clear DO)
app.delete('/api/rooms/:code', async (c) => {
  // Rate limit room deletion
  const ip = getClientIP(c);
  if (!checkRoomRateLimit(ip)) {
    return c.json({ error: 'Slow down! Please wait a few seconds before deleting another room.' }, 429);
  }

  const code = c.req.param('code').toUpperCase();

  // Remove from registry
  const registryId = c.env.GAME_ROOM.idFromName("__REGISTRY__");
  const registryObj = c.env.GAME_ROOM.get(registryId);
  await registryObj.fetch(new Request('https://internal/registry/remove', {
    method: 'POST',
    body: JSON.stringify({ code }),
    headers: { 'Content-Type': 'application/json' }
  }));

  // Clear the room's internal state
  const roomId = c.env.GAME_ROOM.idFromName(code);
  const roomObj = c.env.GAME_ROOM.get(roomId);
  await roomObj.fetch(new Request('https://internal/clear', { method: 'POST' }));

  return c.json({ success: true, deleted: code });
});

// WebSocket Upgrade Route
app.get('/api/rooms/:code/websocket', async (c) => {
  const code = c.req.param('code');
  const id = c.env.GAME_ROOM.idFromName(code);
  const obj = c.env.GAME_ROOM.get(id);
  return obj.fetch(c.req.raw);
});

// WIPE ENDPOINT: DANGEROUS, clears all rooms
app.get('/api/wipe-database-danger', async (c) => {
  const registryId = c.env.GAME_ROOM.idFromName("__REGISTRY__");
  const registryObj = c.env.GAME_ROOM.get(registryId);
  const res = await registryObj.fetch(new Request('https://internal/registry/list'));
  const { rooms } = await res.json() as { rooms: string[] };

  for (const code of rooms) {
    const roomId = c.env.GAME_ROOM.idFromName(code);
    const roomObj = c.env.GAME_ROOM.get(roomId);
    await roomObj.fetch(new Request('https://internal/clear', { method: 'POST' }));
  }

  // Clear registry
  await registryObj.fetch(new Request('https://internal/clear', { method: 'POST' }));
  return c.json({ success: true, wiped: rooms.length });
});

export default app;
export { GameRoom } from './game_room';
