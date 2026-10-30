/**
 * Apsara Vimana engine v8.7
 * Prioridad: SEARXNG_URL (tu instancia Render) → respaldo → Wikipedia → Yahoo
 * Timeout largo para cold start de Render free.
 */
const { hasToken, getEmbedding } = require('./embeddings');
const { tryTools } = require('./tools');
const { tryMusic } = require('./music');

const SEARX_FALLBACK = [
  'https://paulgo.io',
  'https://searx.be',
];

const TIMEOUT_OWN_MS = 45000; // cold start Render
const TIMEOUT_FAST_MS = 8000;

function getOwnSearx() {
  return (process.env.SEARXNG_URL || '').trim().replace(/\/$/, '');
}

function getSearxInstances() {
  const own = getOwnSearx();
  if (own) return [own, ...SEARX_FALLBACK.filter((u) => u !== own)];
  return [...SEARX_FALLBACK];
}

function respuesta(reply, links, options, extra) {
  return {
    reply: reply || '',
    image: 'index_files/2_fBUK.jpg',
    links: Array.isArray(links) ? links : [],
    options: Array.isArray(options) ? options : [],
    ...(extra || {}),
  };
}

function norm(t) {
  return String(t || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[¿?¡!.,;:()[\]{}«»"']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchText(url, timeoutMs) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: {
        Accept: 'application/json, text/plain, */*',
        'User-Agent': 'ApsaraVimana/8.2 (Render; +https://github.com/Apsara-Vimana)',
      },
    });
    const text = await r.text();
    return { ok: r.ok, status: r.status, text, contentType: r.headers.get('content-type') || '' };
  } catch (e) {
    return { ok: false, status: 0, text: '', error: e.message || 'abort' };
  } finally {
    clearTimeout(t);
  }
}

function parseSearxJson(text) {
  if (!text || !text.trim()) return null;
  try {
    const data = JSON.parse(text);
    if (!data || !Array.isArray(data.results)) return null;
    const results = data.results
      .filter((r) => r && r.url && (r.title || r.content))
      .slice(0, 8)
      .map((r) => ({
        t: String(r.title || r.url).slice(0, 140),
        u: r.url,
        snippet: String(r.content || r.pretty_url || '')
          .replace(/\s+/g, ' ')
          .slice(0, 200),
      }));
    return results.length ? results : null;
  } catch {
    return null;
  }
}

/**
 * Busca en una instancia. own=true → más tiempo de espera.
 */
async function searchOneSearx(base, query, own) {
  const q = encodeURIComponent(query);
  const url = `${base}/search?q=${q}&format=json&language=es-ES`;
  const timeout = own ? TIMEOUT_OWN_MS : TIMEOUT_FAST_MS;
  const res = await fetchText(url, timeout);
  if (!res.ok) {
    return { results: null, status: res.status, error: res.error || 'http ' + res.status };
  }
  const results = parseSearxJson(res.text);
  if (!results) {
    return {
      results: null,
      status: res.status,
      error: res.text.trim().startsWith('<') ? 'HTML en vez de JSON' : 'JSON vacío o inválido',
    };
  }
  return { results, status: 200, error: null };
}

async function searchSearx(query) {
  const own = getOwnSearx();
  const tried = [];

  // 1) Siempre primero tu instancia
  if (own) {
    const r = await searchOneSearx(own, query, true);
    tried.push({ base: own, status: r.status, error: r.error });
    if (r.results) return { results: r.results, engine: own, tried };
  }

  // 2) Fallbacks públicos (rápidos)
  for (const base of SEARX_FALLBACK) {
    if (base === own) continue;
    const r = await searchOneSearx(base, query, false);
    tried.push({ base, status: r.status, error: r.error });
    if (r.results) return { results: r.results, engine: base, tried };
  }

  return { results: [], engine: null, tried };
}

async function searchWiki(query) {
  const api =
    'https://es.wikipedia.org/w/api.php?action=query&list=search&srsearch=' +
    encodeURIComponent(query) +
    '&utf8=1&format=json&origin=*&srlimit=3';
  const res = await fetchText(api, TIMEOUT_FAST_MS);
  if (!res.ok) return null;
  let search;
  try {
    search = JSON.parse(res.text);
  } catch {
    return null;
  }
  const hits = search && search.query && search.query.search;
  if (!hits || !hits.length) return null;
  const title = hits[0].title;
  const extractUrl =
    'https://es.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&titles=' +
    encodeURIComponent(title) +
    '&format=json&origin=*';
  const detailRes = await fetchText(extractUrl, TIMEOUT_FAST_MS);
  if (!detailRes.ok) return null;
  let detail;
  try {
    detail = JSON.parse(detailRes.text);
  } catch {
    return null;
  }
  const pages = detail && detail.query && detail.query.pages;
  if (!pages) return null;
  const page = Object.values(pages)[0];
  if (!page || !page.extract) return null;
  return {
    title: page.title || title,
    extract: String(page.extract).slice(0, 850),
    url: 'https://es.wikipedia.org/wiki/' + encodeURIComponent(page.title || title),
  };
}

function yahooUrl(query) {
  return 'https://search.yahoo.com/search?p=' + encodeURIComponent(query);
}

function tryMath(q) {
  const n = norm(q);
  const m =
    n.match(/(?:cuanto es|calcula|calc)\s*([0-9+\-*/().%\s]+)/i) ||
    n.match(/^([0-9+\-*/().%]+)$/);
  if (!m) return null;
  const expr = m[1].replace(/\s+/g, '');
  if (!/^[\d+\-*/().%]+$/.test(expr) || expr.length < 3) return null;
  try {
    const v = new Function('return (' + expr + ')')();
    if (typeof v !== 'number' || !isFinite(v)) return null;
    return String(Math.round(v * 1e10) / 1e10);
  } catch {
    return null;
  }
}

async function procesar(pregunta) {
  const q = String(pregunta || '').trim();
  if (!q) return respuesta('Escribe un mensaje o una búsqueda.');

  const n = norm(q);
  const own = getOwnSearx();

  if (n === 'estado' || n === 'status' || n === 'diagnostico') {
    let probeMsg = 'no probado';
    if (own) {
      const probe = await searchOneSearx(own, 'test', true);
      probeMsg = probe.results
        ? `OK (${probe.results.length} resultados de prueba)`
        : `falló: ${probe.error || probe.status}`;
    }
    return respuesta(
      `**Estado del motor**\n\n` +
        `• SEARXNG_URL: ${own || '⚠️ NO DEFINIDA en el servicio del chat'}\n` +
        `• DATABASE_URL (Neon): ${process.env.DATABASE_URL ? 'conectada' : 'no definida'}\n` +
        `• Hugging Face (embeddings): ${hasToken() ? 'token presente' : 'sin token (opcional)'}\n` +
        `• Prueba a tu SearXNG: ${probeMsg}\n\n` +
        (own
          ? `Si la URL está bien pero falla, el free tier puede estar dormido: espera 1 min y reintenta.`
          : `Pon en Render (servicio del CHAT) la variable:\nSEARXNG_URL=https://apsara-searxng.onrender.com`),
      own ? [{ t: 'Abrir tu SearXNG', u: own }] : [],
      ['ayuda', 'casa', 'dharma']
    );
  }

  if (['limpiar', 'borrar chat', 'reiniciar', 'vaciar'].some((k) => n === k || n.includes(k))) {
    return respuesta('Chat limpio. Namaste 🌺', [], ['ayuda'], { action: 'LIMPIAR' });
  }

  if (['ayuda', 'comandos', 'menu'].some((k) => n === k || n.startsWith(k))) {
    return respuesta(
      `**Ayuda — Apsara Vimana**\n\n` +
        `• Escribe un tema y te respondemos con lo que haya disponible\n` +
        `• \`vimana music\` / \`radio online\` — música del proyecto\n` +
        `• \`clima en …\` — tiempo actual\n` +
        `• \`limpiar\` — vaciar el chat\n` +
        `• \`cuanto es 12*5\` — calculadora\n\n` +
        `Si en algún momento el chat no responde bien, espera un momento e inténtalo de nuevo. Namaste 🌺`,
      [{ t: 'Sitio Vimana', u: 'https://vimana.rf.gd/' }],
      ['vimana music', 'radio online', 'limpiar']
    );
  }

  if (/^(hola|namaste|buenas)\b/.test(n) && n.length < 28) {
    return respuesta(
      'Namaste 🌺\n\nBusco con tu SearXNG y te muestro resultados en el chat.',
      [],
      ['estado', 'ayuda', 'casa']
    );
  }

  const math = tryMath(q);
  if (math != null) return respuesta(`🔢 Resultado: **${math}**`, [], ['ayuda']);

  const query = q.replace(/^\/?buscar\s+/i, '').trim() || q;

  

  // Música / radio Vimana (prioridad propia)
  try {
    const mus = tryMusic(q);
    if (mus && mus.reply) {
      return respuesta(mus.reply, mus.links || [], mus.options || ['ayuda'], { media: mus.media || [] });
    }
  } catch (e) { /* seguir */ }

  // Herramientas exactas (clima, divisa, país) — antes de la web
  try {
    const tool = await tryTools(q);
    if (tool && tool.reply) {
      return respuesta(tool.reply, tool.links || [], ['ayuda', 'estado', 'limpiar']);
    }
  } catch (e) { /* seguir búsqueda */ }

  // 1) SearXNG
  const searx = await searchSearx(query);
  if (searx.results && searx.results.length) {
    const lines = searx.results.map((r, i) => {
      let s = `${i + 1}. **${r.t}**`;
      if (r.snippet) s += `\n   ${r.snippet}`;
      return s;
    });
    return respuesta(
      `🔍 **VIMANA (Búsqueda:)** ${q}\n\n${lines.join('\n\n')}`,
      searx.results.map((r) => ({ t: r.t, u: r.u })),
      ['ayuda', 'limpiar', 'estado']
    );
  }

  // detalle del fallo para no confundir con "429 genérico"
  const failHint = (searx.tried || [])
    .map((t) => `• ${t.base}: ${t.error || t.status}`)
    .join('\n');

  // 2) Wikipedia
  const wiki = await searchWiki(query);
  if (wiki) {
    return respuesta(
      `📘 **Wikipedia** — ${wiki.title}\n\n${wiki.extract}\n\n` +
        `_Si necesitas más detalle, prueba de nuevo en un momento._`,
      [
        { t: 'Leer artículo completo', u: wiki.url },
        { t: 'Buscar en Yahoo', u: yahooUrl(query) },
        ...(own ? [{ t: 'Sitio Vimana', u: 'https://vimana.rf.gd/' }] : []),
      ],
      ['estado', 'ayuda', 'limpiar']
    );
  }

  // 3) Yahoo
  return respuesta(
    `No hubo resultados en SearXNG ni Wikipedia para «${q}».\n\n${failHint}\n\nContinúa aquí:`,
    [{ t: '🔍 Buscar en Yahoo', u: yahooUrl(query) }],
    ['estado', 'ayuda', 'limpiar']
  );
}

module.exports = { procesar, getSearxInstances, getOwnSearx };
