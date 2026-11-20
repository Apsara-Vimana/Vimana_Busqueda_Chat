/**
 * Acceso por clave + pools A / B / C (tres chats, tres Neon, tres SearXNG).
 *
 * Chats (Render):
 *   A → https://vimana-chat.onrender.com
 *   B → https://apsara-vimana-chat-b-aibp.onrender.com
 *   C → https://apsara-vimana-c.onrender.com
 *
 * SearXNG:
 *   A (actual) → https://apsara-searxng.onrender.com
 *   B (listo)  → https://apsara2-searxng.onrender.com
 *   C (listo)  → https://apsara3-searxng.onrender.com
 *
 * En cada servicio de chat (A, B o C) configura:
 *   DATABASE_URL     = Neon de ESE chat
 *   SEARXNG_URL      = el SearXNG que use por defecto este servicio
 *   SEARXNG_URL_A/B/C = opcionales si un mismo front enruta por clave
 *   ACCESS_CODES     = claves válidas (coma). Vacío = abierto
 *   INSTANCE_POOL    = A | B | C  (identidad de este deploy)
 *
 * Prefijo de clave:
 *   empieza por B → pool B (SEARXNG_URL_B)
 *   empieza por C → pool C (SEARXNG_URL_C)
 *   resto         → pool por defecto (SEARXNG_URL o SEARXNG_URL_A)
 */
function listCodes() {
  const raw = String(process.env.ACCESS_CODES || '').trim();
  if (!raw) return [];
  return raw
    .split(/[,;\s]+/)
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean);
}

function accessRequired() {
  return listCodes().length > 0;
}

function normalizeCode(code) {
  return String(code || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
}

function isValidCode(code) {
  const codes = listCodes();
  if (!codes.length) return true;
  const n = normalizeCode(code);
  if (!n) return false;
  return codes.includes(n);
}

function instancePool() {
  const p = String(process.env.INSTANCE_POOL || '').trim().toUpperCase();
  if (p === 'A' || p === 'B' || p === 'C') return p;
  return 'A';
}

function stripSlash(u) {
  return String(u || '')
    .trim()
    .replace(/\/$/, '');
}

/** URLs documentadas / por defecto si no hay env */
const DEFAULT_SEARX = {
  A: 'https://apsara-searxng.onrender.com',
  B: 'https://apsara2-searxng.onrender.com',
  C: 'https://apsara3-searxng.onrender.com',
};

const DEFAULT_CHAT = {
  A: 'https://vimana-chat.onrender.com',
  B: 'https://apsara-vimana-chat-b-aibp.onrender.com',
  C: 'https://apsara-vimana-c.onrender.com',
};

function poolFromCode(code) {
  const n = normalizeCode(code);
  if (n.startsWith('C')) return 'C';
  if (n.startsWith('B')) return 'B';
  if (n.startsWith('A')) return 'A';
  return instancePool();
}

/**
 * SearXNG para esta petición.
 * Prioridad: env del pool → SEARXNG_URL del servicio → default documentado.
 */
function searxUrlForCode(code) {
  const pool = poolFromCode(code);
  const envA = stripSlash(process.env.SEARXNG_URL_A);
  const envB = stripSlash(process.env.SEARXNG_URL_B);
  const envC = stripSlash(process.env.SEARXNG_URL_C);
  const def = stripSlash(process.env.SEARXNG_URL);

  if (pool === 'B') return envB || def || DEFAULT_SEARX.B;
  if (pool === 'C') return envC || def || DEFAULT_SEARX.C;
  return envA || def || DEFAULT_SEARX.A;
}

function accessInfo(code) {
  const required = accessRequired();
  const ok = isValidCode(code);
  const pool = poolFromCode(code);
  return {
    required,
    ok,
    code: normalizeCode(code),
    pool,
    instance: instancePool(),
    searxUrl: ok ? searxUrlForCode(code) : '',
    chatUrl: DEFAULT_CHAT[pool] || DEFAULT_CHAT.A,
  };
}

function poolsStatus() {
  return {
    instance: instancePool(),
    chats: DEFAULT_CHAT,
    searx: {
      A: stripSlash(process.env.SEARXNG_URL_A) || stripSlash(process.env.SEARXNG_URL) || DEFAULT_SEARX.A,
      B: stripSlash(process.env.SEARXNG_URL_B) || DEFAULT_SEARX.B,
      C: stripSlash(process.env.SEARXNG_URL_C) || DEFAULT_SEARX.C,
    },
    accessRequired: accessRequired(),
  };
}

module.exports = {
  listCodes,
  accessRequired,
  normalizeCode,
  isValidCode,
  instancePool,
  poolFromCode,
  searxUrlForCode,
  accessInfo,
  poolsStatus,
  DEFAULT_SEARX,
  DEFAULT_CHAT,
};
