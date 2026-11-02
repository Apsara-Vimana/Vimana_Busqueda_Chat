/**
 * Apsara Vimana engine v8.9 + Gemini (inyectado desde server.js)
 * Prioridad:
 *   1) Conocimiento local (glosario, música, Gita, Ayurveda, tools)
 *   2) Gemini — función inyectada por server.js (setGemini)
 *   3) SEARXNG (español)
 *   4) Wikipedia ES
 *   5) Yahoo ES
 */

const { hasToken, getEmbedding, cosineSimilarity } = require('./embeddings');
const { tryTools } = require('./tools');
const { tryMusic } = require('./music');
const { tryAyurveda } = require('./ayurveda');
const { tryDharmic } = require('./dharmic');
const { tryLocalKnowledge } = require('./glosario');
const { pickImage } = require('./images');

/** Función Gemini inyectada desde server.js (no hay gemini.js) */
let _llamarGemini = null;
function setGemini(fn) {
  _llamarGemini = typeof fn === 'function' ? fn : null;
}

const SEARX_FALLBACK = [
  'https://paulgo.io',
  'https://searx.be',
];

const TIMEOUT_OWN_MS = 45000;
const TIMEOUT_FAST_MS = 8000;

function getOwnSearx() {
  return (process.env.SEARXNG_URL || '').trim().replace(/\/$/, '');
}

function getSearxInstances() {
  const own = getOwnSearx();
  if (own) return [own, ...SEARX_FALLBACK.filter((u) => u !== own)];
  return [...SEARX_FALLBACK];
}

function isSpamResult(r) {
  const t = ((r && r.t) || '').toLowerCase();
  const s = ((r && r.snippet) || '').toLowerCase();
  const u = ((r && r.u) || '').toLowerCase();
  const text = t + ' ' + s + ' ' + u;

  const spamKeywords = [
    'domino', 'pizza', 'promo', 'cupon', 'casino', 'viagra', 'onlyfans', 'betting',
    'racing', 'f1', 'formula 1', 'team', 'driver', 'car', 'auto',
    'juego', 'game', 'nodebb', 'forum', 'thread', 'reply', 'offline',
    'clickbait', 'ad', 'sponsor', 'download', 'crack', 'pirate',
  ];

  for (const kw of spamKeywords) {
    if (text.includes(kw.toLowerCase())) return true;
  }

  const badDomains = ['nodebb.com', 'reddit.com/r/gaming', 'twitch.tv'];
  for (const domain of badDomains) {
    if (u.includes(domain)) return true;
  }

  return false;
}

/**
 * Mejora consultas para búsquedas en español (evita japonés/otros idiomas).
 */
function enhanceQueryForSearch(query) {
  let q = String(query || '').trim();
  if (!q) return q;

  const spiritualTerms = [
    'dharma', 'karma', 'yoga', 'vedas', 'gita', 'krishna', 'rama', 'shiva', 'vishnu',
    'guru', 'saint', 'saints', 'avatar', 'incarnation', 'mohini', 'prema', 'bhakti',
    'sanskrit', 'sanskrito', 'mantra', 'mudra', 'chakra', 'prana', 'atman', 'brahman',
    'apsara', 'vimana', 'divine', 'spiritual', 'transcendental', 'sai baba', 'swami',
    'maharaj', 'goswami', 'paramahansa',
  ];

  const lower = q.toLowerCase();
  let isSpiritual = false;
  for (const term of spiritualTerms) {
    if (lower.includes(term)) {
      isSpiritual = true;
      break;
    }
  }

  const wantsCourses =
    /\b(curso|cursos|clase|clases|taller|talleres|aprender|practica|práctica|entrenamiento|certificacion|certificación)\b/i.test(
      q
    );

  if (wantsCourses && /\byoga\b/i.test(q)) {
    return q + ' cursos de yoga práctica en español';
  }
  if (wantsCourses) {
    return q + ' en español';
  }
  if (isSpiritual) {
    return q + ' significado espiritual sánscrito en español';
  }
  if (!/\ben español\b/i.test(q) && !/\bespañol\b/i.test(q)) {
    return q + ' en español';
  }
  return q;
}

function enhanceQueryForSpiritualContext(query) {
  return enhanceQueryForSearch(query);
}

function respuesta(reply, links, options, extra) {
  const base = {
    reply: reply || '',
    links: Array.isArray(links) ? links : [],
    options: Array.isArray(options) ? options : [],
    ...(extra || {}),
  };
  if (!base.image) {
    try {
      const qctx = base._q || respuesta._lastQ || '';
      const img = typeof pickImage === 'function' ? pickImage(qctx, '') : null;
      if (img && img.src) {
        base.image = img.src;
        base.imageSize = img.size || 'card';
        base.imageAlt = img.alt || '';
      }
    } catch (_) {}
  }
  delete base._q;
  return base;
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
        'User-Agent': 'ApsaraVimana/8.9 (Render; +https://github.com/Apsara-Vimana)',
        'Accept-Language': 'es-ES,es;q=0.9',
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

async function searchOneSearx(base, query, own) {
  const q = encodeURIComponent(query);
  const url = `${base}/search?q=${q}&format=json&language=es-ES&categories=general`;
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

  if (own) {
    const r = await searchOneSearx(own, query, true);
    tried.push({ base: own, status: r.status, error: r.error });
    if (r.results) return { results: r.results, engine: own, tried };
  }

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
  const q = /\ben español\b/i.test(query) ? query : query + ' en español';
  return 'https://search.yahoo.com/search?p=' + encodeURIComponent(q) + '&fr=yfp-t&ei=UTF-8&lang=es';
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

async function rankGlossaryByEmbedding(query, entries) {
  if (!hasToken()) return entries;

  const vectors = {};
  const promises = entries.map(async (entry) => {
    const key = entry._key || entry.titulo || entry.nombre || entry.termo || entry.key || '';
    if (!key) return;
    try {
      vectors[key] = await getEmbedding(key);
    } catch (_) {
      vectors[key] = null;
    }
  });

  await Promise.all(promises);

  let queryVec;
  try {
    queryVec = await getEmbedding(query);
  } catch (_) {
    queryVec = null;
  }

  if (!queryVec) return entries;

  return entries
    .map((entry) => {
      const key = entry._key || entry.titulo || entry.nombre || entry.termo || entry.key || '';
      const vec = vectors[key] || null;
      const score = vec ? cosineSimilarity(queryVec, vec) : 0;
      return { entry, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.entry);
}

async function attachWebSecondary(base, query) {
  try {
    const improvedQuery = enhanceQueryForSearch(query);
    const searx = await searchSearx(improvedQuery);
    if (searx && searx.results && searx.results.length) {
      const top = searx.results.filter((r) => !isSpamResult(r)).slice(0, 3);
      if (top.length) {
        const lines = top.map((r, i) => {
          let s = `${i + 1}. **${r.t}**`;
          const sn = (r.snippet || '').trim();
          if (sn) s += `\n   ${sn.length > 220 ? sn.slice(0, 220).replace(/\s+\S*$/, '') + '…' : sn}`;
          return s;
        });
        base.secondary_reply = `🔍 **Búsqueda web**\n\n` + lines.join('\n\n');
        base.secondary_links = top.map((r) => ({ t: r.t, u: r.u }));
        return base;
      }
    }
    const wiki = await searchWiki(improvedQuery);
    if (wiki) {
      base.secondary_reply =
        `📘 **Wikipedia** — ${wiki.title}\n\n${(wiki.extract || '').slice(0, 450)}`;
      base.secondary_links = [{ t: 'Leer en Wikipedia', u: wiki.url }];
    }
  } catch (_) {}
  return base;
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
    const geminiOk = !!(
      (process.env.GEMINI_KEY || '').trim() ||
      (process.env.GEMINI_API_KEY || '').trim()
    );
    return respuesta(
      `**Estado del motor**\n\n` +
        `• SEARXNG_URL: ${own || '⚠️ NO DEFINIDA en el servicio del chat'}\n` +
        `• DATABASE_URL (Neon): ${process.env.DATABASE_URL ? 'conectada' : 'no definida'}\n` +
        `• Hugging Face (embeddings): ${hasToken() ? 'token presente' : 'sin token (opcional)'}\n` +
        `• Gemini (IA): ${geminiOk ? 'API key presente (gemini-flash-latest)' : '⚠️ GEMINI_KEY / GEMINI_API_KEY no definida'}\n` +
        `• Prueba a tu SearXNG: ${probeMsg}\n\n` +
        (own
          ? `Si la URL está bien pero falla, el free tier puede estar dormido: espera 1 min y reintenta.`
          : `Pon en Render (servicio del CHAT) la variable:\nSEARXNG_URL=https://apsara-searxng.onrender.com`),
      own ? [{ t: 'Abrir tu SearXNG', u: own }] : [],
      ['ayuda', 'casa', 'dharma']
    );
  }

  if (['limpiar', 'borrar chat', 'reiniciar', 'vaciar'].some((k) => n === k)) {
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
        `**Cómo leer el Gita (fácil)**\n` +
        `1. Escribe: \`gita capítulo 1\` (o 2, 3… hasta 18)\n` +
        `2. Verás 3 versos con significado en español\n` +
        `3. Toca el botón **siguiente** / \`desde 4\` para leer 3 más\n` +
        `4. También puedes preguntar: \`qué dice el gita sobre el karma\` o \`devoción\`\n\n` +
        `**Plantas** — escribe el nombre, ej. \`tulsi\` o \`ashwagandha\`\n\n` +
        `Si en algún momento el chat no responde bien, espera un momento e inténtalo de nuevo. Namaste 🌺`,
      [{ t: 'Sitio Vimana', u: 'https://vimana.rf.gd/' }],
      ['gita capítulo 1', 'vimana music', 'radio online', 'limpiar']
    );
  }

  if (/^(hola|namaste|buenas)\b/.test(n) && n.length < 28) {
    return respuesta(
      'Namaste 🌺\n\nPuedo ayudarte con sabiduría, música de Vimana, búsquedas y consultas generales.',
      [],
      ['estado', 'ayuda', 'casa']
    );
  }

  const math = tryMath(q);
  if (math != null) return respuesta(`🔢 Resultado: **${math}**`, [], ['ayuda']);

  const query = q.replace(/^\/?buscar\s+/i, '').trim() || q;

  // 0) Local
  try {
    const loc = tryLocalKnowledge(q);
    if (loc && loc.reply) {
      let out = respuesta(loc.reply, loc.links || [], loc.options || ['ayuda'], {
        image: loc.image,
        imageSize: loc.imageSize,
        imageAlt: loc.imageAlt,
      });

      if (/maestro|sai baba|tulsidas|quien es|quién es|quale es|significado/i.test(q)) {
        out = await attachWebSecondary(out, q);
      } else if (/prema|krishna|rama|shiva|vishnu|avatar|encarnacion/i.test(q)) {
        out = await attachWebSecondary(out, q);
      }

      return out;
    }
  } catch (e) {}

  try {
    const mus = tryMusic(q);
    if (mus && mus._forceWeb) {
      let out = respuesta(mus.reply, mus.links || [], mus.options || ['ayuda'], {
        image: mus.image || '/imagenes/Pensando.jpg',
        imageSize: mus.imageSize || 'state',
        imageAlt: mus.imageAlt || 'Pensando',
      });
      out = await attachWebSecondary(out, mus._topic || q);
      if (out.secondary_reply) return out;
    } else if (mus && mus.reply) {
      // No capturar "cursos de yoga / práctica" como solo música
      if (
        /\b(curso|cursos|clase|clases|taller|aprender|practica|práctica)\b/i.test(q) &&
        !/\b(musica|música|cancion|canción|album|álbum|radio|playlist|bhajan)\b/i.test(q)
      ) {
        /* dejar pasar a Gemini / web */
      } else {
        return respuesta(mus.reply, mus.links || [], mus.options || ['ayuda'], {
          media: mus.media || [],
          image: mus.image,
          imageSize: mus.imageSize,
          imageAlt: mus.imageAlt,
        });
      }
    }
  } catch (e) {}

  try {
    const dh = await tryDharmic(q);
    if (dh && dh._forceWeb) {
      const webQ = dh._topic || q;
      let out = respuesta(dh.reply || '📚 Buscando el libro en internet…', dh.links || [], dh.options || ['ayuda'], {
        image: '/imagenes/Pensando.jpg',
        imageSize: 'state',
        imageAlt: 'Pensando',
      });
      out = await attachWebSecondary(out, webQ);
      if (out.secondary_reply) return out;
    } else if (dh && dh._askChoice) {
      return respuesta(dh.reply, dh.links || [], dh.options || ['ayuda'], {
        image: dh.image,
        imageSize: dh.imageSize || 'state',
        imageAlt: dh.imageAlt || 'Pensando',
      });
    } else if (dh && dh._versesOnly && dh.reply) {
      return respuesta(dh.reply, dh.links || [], dh.options || ['ayuda']);
    } else if (dh && dh.reply) {
      let out = respuesta(dh.reply, dh.links || [], dh.options || ['ayuda']);
      out = await attachWebSecondary(out, dh._topic || q);
      return out;
    }
  } catch (e) {}

  try {
    const ay = await tryAyurveda(q);
    if (ay && ay._forceWeb) {
      let out = respuesta(ay.reply, ay.links || [], ay.options || ['ayuda'], {
        image: ay.image,
        imageSize: ay.imageSize || 'state',
        imageAlt: ay.imageAlt,
      });
      out = await attachWebSecondary(out, ay._topic || q);
      if (out.secondary_reply) return out;
    } else if (ay && ay.reply) {
      return respuesta(ay.reply, ay.links || [], ay.options || ['ayuda'], {
        image: ay.image,
        imageSize: ay.imageSize,
        imageAlt: ay.imageAlt,
      });
    }
  } catch (e) {}

  try {
    const tool = await tryTools(q);
    if (tool && tool.reply) {
      return respuesta(tool.reply, tool.links || [], ['ayuda', 'estado', 'limpiar']);
    }
  } catch (e) {}

  // ─── Gemini (inyectado desde server.js) ───
  if (_llamarGemini) {
    try {
      const geminiText = await _llamarGemini(q);
      if (geminiText) {
        return respuesta(geminiText, [], ['ayuda', 'limpiar', 'estado'], {
          image: '/imagenes/Pensando.jpg',
          imageSize: 'state',
          imageAlt: 'Apsara pensando',
        });
      }
    } catch (e) {
      console.error('[Gemini] error en procesar:', e.message || e);
    }
  }

  // SearXNG + Wikipedia (español)
  const searchQuery = enhanceQueryForSearch(query);

  let searx = { results: null, tried: [] };
  try {
    searx = (await searchSearx(searchQuery)) || searx;
  } catch (e) {
    searx = { results: null, tried: [{ base: 'searx', error: 'fallo temporal' }] };
  }
  if (searx && searx.results && searx.results.length) {
    const top = searx.results.filter((r) => !isSpamResult(r)).slice(0, 5);
    const lines = top.map((r, i) => {
      let s = `${i + 1}. **${r.t}**`;
      const sn = (r.snippet || '').trim();
      if (sn) {
        const max = 320;
        let body = sn.length > max ? sn.slice(0, max).replace(/\s+\S*$/, '') + '…' : sn;
        s += `\n   ${body}`;
      }
      return s;
    });
    return respuesta(
      `🔍 **VIMANA (Búsqueda:)** ${q}\n\n${lines.join('\n\n')}`,
      top.map((r) => ({ t: r.t, u: r.u })),
      ['ayuda', 'limpiar']
    );
  }

  const failHint = (searx.tried || [])
    .map((t) => `• ${t.base}: ${t.error || t.status}`)
    .join('\n');

  const wiki = await searchWiki(searchQuery);
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

  return respuesta(
    `No hubo resultados en SearXNG ni Wikipedia para «${q}».\n\n${failHint}\n\nContinúa aquí:`,
    [{ t: '🔍 Buscar en Yahoo', u: yahooUrl(query) }],
    ['estado', 'ayuda', 'limpiar']
  );
}

async function procesarSafe(pregunta) {
  try {
    return await procesar(pregunta);
  } catch (e) {
    const q = String(pregunta || '').trim();
    try {
      const wiki = await searchWiki(q);
      if (wiki) {
        return respuesta(
          `📘 **Wikipedia** — ${wiki.title}\n\n${wiki.extract}`,
          [{ t: 'Leer más', u: wiki.url }],
          ['ayuda']
        );
      }
    } catch (_) {}
    return respuesta(
      `Puedes orientarte con el **glosario** (ej. dharma, karma) o el **Gita**. También prueba de nuevo en un momento.`,
      [{ t: 'Sitio Vimana', u: 'https://vimana.rf.gd/' }],
      ['ayuda', 'gita karma', 'qué es vimana']
    );
  }
}

module.exports = {
  procesar: procesarSafe,
  procesarRaw: procesar,
  getSearxInstances,
  getOwnSearx,
  setGemini,
};
