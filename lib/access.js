/**
 * Acceso por llaves — pools A / B / C
 * ADMIN_KEY y USER_KEYS solo desde Environment en Render (nunca en el cliente).
 *
 * - Admin: válida en A, B y C; sin límite de sesiones.
 * - Invitados: solo el pool de INSTANCE_POOL; máx. 2 sesiones simultáneas por clave.
 * - Sin restricción por IP (dos personas, dos países, misma clave = OK).
 */

const SESSION_TTL_MS = 45 * 60 * 1000; // 45 min sin heartbeat → libera cupo
const MAX_GUEST_SESSIONS = 2;

/** key(upper) -> Map(sessionId -> lastSeenMs) */
const activeSessions = new Map();

function stripSlash(u) {
  return String(u || '')
    .trim()
    .replace(/\/$/, '');
}

function instancePool() {
  const p = String(process.env.INSTANCE_POOL || 'A')
    .trim()
    .toUpperCase();
  if (p === 'B' || p === 'C') return p;
  return 'A';
}

function normalizeCode(code) {
  return String(code || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
}

function adminKey() {
  return normalizeCode(process.env.ADMIN_KEY || '');
}

function userKeysList() {
  const raw =
    process.env.USER_KEYS ||
    process.env.ACCESS_CODES ||
    '';
  if (!String(raw).trim()) return [];
  return String(raw)
    .split(/[,;\s]+/)
    .map((c) => normalizeCode(c))
    .filter(Boolean);
}

function accessRequired() {
  return Boolean(adminKey() || userKeysList().length);
}

function isAdmin(code) {
  const a = adminKey();
  if (!a) return false;
  return normalizeCode(code) === a;
}

function expectedPrefix() {
  return instancePool(); // A | B | C
}

/**
 * ¿La clave pertenece a ESTE servidor?
 * Admin: siempre de este servidor.
 * Invitado: debe empezar por A/B/C según INSTANCE_POOL y estar en USER_KEYS.
 */
function belongsToThisServer(code) {
  const n = normalizeCode(code);
  if (!n) return false;
  if (isAdmin(n)) return true;
  const prefix = expectedPrefix();
  if (!n.startsWith(prefix)) return false;
  const list = userKeysList();
  if (!list.length) return false;
  return list.includes(n);
}

function isValidCode(code) {
  if (!accessRequired()) return true;
  return belongsToThisServer(code);
}

function purgeStale(key) {
  const map = activeSessions.get(key);
  if (!map) return;
  const now = Date.now();
  for (const [sid, ts] of map.entries()) {
    if (now - ts > SESSION_TTL_MS) map.delete(sid);
  }
  if (map.size === 0) activeSessions.delete(key);
}

function countSessions(key) {
  purgeStale(key);
  const map = activeSessions.get(key);
  return map ? map.size : 0;
}

function makeSessionId() {
  return (
    's' +
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 10)
  );
}

/**
 * Intenta abrir o renovar sesión.
 * @returns {{ ok, sessionId?, reason?, reply?, isAdmin? }}
 */
function openSession(code, sessionId) {
  const n = normalizeCode(code);
  if (!accessRequired()) {
    return {
      ok: true,
      sessionId: sessionId || makeSessionId(),
      reply: 'Acceso abierto.',
      isAdmin: false,
    };
  }
  if (!n) {
    return {
      ok: false,
      reason: 'empty',
      reply: 'Escribe tu llave de acceso en la barra y pulsa enviar.',
    };
  }

  // Admin: siempre OK, sin cupo
  if (isAdmin(n)) {
    const sid = sessionId || makeSessionId();
    return {
      ok: true,
      sessionId: sid,
      reply: 'Namaste. Acceso administrador activo.',
      isAdmin: true,
      pool: instancePool(),
    };
  }

  // Prefijo incorrecto para ESTE servidor
  const prefix = expectedPrefix();
  if (!n.startsWith(prefix)) {
    return {
      ok: false,
      reason: 'wrong_server',
      reply: 'Esta clave no pertenece a este servidor.',
    };
  }

  // No está en la lista de este servidor
  if (!userKeysList().includes(n)) {
    return {
      ok: false,
      reason: 'invalid',
      reply:
        'Clave no válida. Pide tu llave a Vimana e inténtalo de nuevo.',
    };
  }

  purgeStale(n);
  if (!activeSessions.has(n)) activeSessions.set(n, new Map());
  const map = activeSessions.get(n);

  // Renovar sesión existente
  if (sessionId && map.has(sessionId)) {
    map.set(sessionId, Date.now());
    return {
      ok: true,
      sessionId,
      reply: 'Namaste. Acceso activo. Ya puedes usar el chat de Apsara Vimana.',
      isAdmin: false,
      pool: instancePool(),
      sessions: map.size,
    };
  }

  // Nueva sesión
  if (map.size >= MAX_GUEST_SESSIONS) {
    return {
      ok: false,
      reason: 'limit',
      reply:
        'Límite alcanzado: esta clave ya está siendo utilizada por 2 usuarios simultáneamente.',
    };
  }

  const sid = makeSessionId();
  map.set(sid, Date.now());
  return {
    ok: true,
    sessionId: sid,
    reply: 'Namaste. Acceso activo. Ya puedes usar el chat de Apsara Vimana.',
    isAdmin: false,
    pool: instancePool(),
    sessions: map.size,
  };
}

function heartbeat(code, sessionId) {
  const n = normalizeCode(code);
  if (isAdmin(n)) return { ok: true };
  if (!n || !sessionId) return { ok: false };
  purgeStale(n);
  const map = activeSessions.get(n);
  if (!map || !map.has(sessionId)) return { ok: false, reason: 'expired' };
  map.set(sessionId, Date.now());
  return { ok: true, sessions: map.size };
}

function releaseSession(code, sessionId) {
  const n = normalizeCode(code);
  const map = activeSessions.get(n);
  if (map && sessionId) {
    map.delete(sessionId);
    if (map.size === 0) activeSessions.delete(n);
  }
  return { ok: true };
}

function sessionOk(code, sessionId) {
  if (!accessRequired()) return true;
  if (isAdmin(code)) return true;
  const n = normalizeCode(code);
  if (!belongsToThisServer(n)) return false;
  if (!sessionId) {
    // compat: si hay clave válida pero sin sesión, permitir si hay cupo
    return countSessions(n) < MAX_GUEST_SESSIONS;
  }
  purgeStale(n);
  const map = activeSessions.get(n);
  return !!(map && map.has(sessionId));
}

function searxUrlForCode(_code) {
  const def = stripSlash(process.env.SEARXNG_URL);
  const a = stripSlash(process.env.SEARXNG_URL_A);
  const b = stripSlash(process.env.SEARXNG_URL_B);
  const c = stripSlash(process.env.SEARXNG_URL_C);
  const pool = instancePool();
  if (pool === 'B') return b || def || '';
  if (pool === 'C') return c || def || '';
  return a || def || '';
}

function accessInfo(code) {
  const n = normalizeCode(code);
  const required = accessRequired();
  if (!required) {
    return { required: false, ok: true, code: n, pool: instancePool(), isAdmin: false };
  }
  const r = openSession(n, null);
  // accessInfo no debe consumir cupo: solo consulta
  // (openSession sin sid crea sesión — usamos belongsToThisServer para "ok")
  return {
    required: true,
    ok: belongsToThisServer(n) || isAdmin(n),
    code: n,
    pool: instancePool(),
    isAdmin: isAdmin(n),
    searxUrl: searxUrlForCode(n),
  };
}

function poolsStatus() {
  return {
    required: accessRequired(),
    instance: instancePool(),
    maxGuestSessions: MAX_GUEST_SESSIONS,
  };
}

// compat exports antiguos
function listCodes() {
  return userKeysList();
}

module.exports = {
  listCodes,
  accessRequired,
  normalizeCode,
  isValidCode,
  isAdmin,
  belongsToThisServer,
  instancePool,
  openSession,
  heartbeat,
  releaseSession,
  sessionOk,
  searxUrlForCode,
  accessInfo,
  poolsStatus,
  MAX_GUEST_SESSIONS,
};
