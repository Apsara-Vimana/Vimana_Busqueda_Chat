/**
 * Apsara Vimana engine v8.1
 * Orden: SearXNG (SEARXNG_URL + respaldo) → Wikipedia → Yahoo (enlace)
 * Más interactivo: fuente visible, chips de seguimiento, comando "estado"
 */
const SEARX_DEFAULT = [
  'https://searx.be',
  'https://sx.xo.st',
  'https://searxng.eshnetwork.space',
  'https://search.ctq.ro',
  'https://priv.au',
  'https://searx.tiekoetter.com',
  'https://search.sapti.me',
  'https://opnxng.com',
];

const TIMEOUT_MS = 6000;

const STOPWORDS_ES = new Set(
  `a al algo algunas algunos ante antes como con contra cual cuando de del desde donde durante e el ella ellas ellos en entre era es esa esas ese eso esos esta estaba estas este esto estos fue fui ha hay la las le les lo los me mi mis mucho muy nada ni no nos o os otra otras otro otros para pero poco por porque que quien se ser si sin sobre son su sus te tiene tengo tu tus un una uno y ya`
    .split(/\s+/)
);

const FILOSOFIA = [
  'india','hindu','samsara','karma','dharma','moksha','vedas','upanishads','gita','bhagavad',
  'vedanta','advaita','yoga','sutras','patanjali','buda','budismo','nirvana','meditacion',
  'atman','brahman','ahimsa','guru','ashram','sanscrito','hinduismo','zen',
];

function getSearxInstances() {
  const env = (process.env.SEARXNG_URL || '').trim().replace(/\/$/, '');
  if (!env) return [...SEARX_DEFAULT];
  return [env, ...SEARX_DEFAULT.filter((u) => u !== env)];
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

async function fetchJson(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; ApsaraVimana/8.1; +https://github.com/Apsara-Vimana)',
      },
    });
    const ct = r.headers.get('content-type') || '';
    if (!r.ok) return null;
    if (!ct.includes('json')) return null;
    return await r.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function searchSearx(query) {
  const q = encodeURIComponent(query);
  const tried = [];
  for (const base of getSearxInstances()) {
    const url = `${base}/search?q=${q}&format=json&language=es-ES&categories=general`;
    const data = await fetchJson(url);
    tried.push(base);
    if (!data || !Array.isArray(data.results) || !data.results.length) continue;
    const results = data.results
      .filter((r) => r.url && (r.title || r.content))
      .slice(0, 6)
      .map((r) => ({
        t: String(r.title || r.url).slice(0, 120),
        u: r.url,
        snippet: String(r.content || '').replace(/\s+/g, ' ').slice(0, 160),
      }));
    if (results.length) return { results, engine: base, tried };
  }
  return { results: [], engine: null, tried };
}

async function searchWiki(query) {
  const api =
    'https://es.wikipedia.org/w/api.php?action=query&list=search&srsearch=' +
    encodeURIComponent(query) +
    '&utf8=1&format=json&origin=*&srlimit=3';
  const search = await fetchJson(api);
  const hits = search && search.query && search.query.search;
  if (!hits || !hits.length) return null;
  const title = hits[0].title;
  const extractUrl =
    'https://es.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&titles=' +
    encodeURIComponent(title) +
    '&format=json&origin=*';
  const detail = await fetchJson(extractUrl);
  const pages = detail && detail.query && detail.query.pages;
  if (!pages) return null;
  const page = Object.values(pages)[0];
  if (!page || !page.extract) return null;
  return {
    title: page.title || title,
    extract: String(page.extract).slice(0, 850),
    url: 'https://es.wikipedia.org/wiki/' + encodeURIComponent(page.title || title),
    related: hits.slice(1).map((h) => h.title),
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

function followUps(query, kind) {
  const n = norm(query);
  const opts = ['ayuda', 'limpiar'];
  if (FILOSOFIA.some((k) => n.includes(k))) {
    opts.unshift('qué es dharma', 'qué es karma', 'qué es yoga');
  }
  if (kind === 'wiki') opts.unshift('buscar más en la web');
  if (kind === 'searx') opts.unshift('resumen wikipedia');
  return opts.slice(0, 5);
}

async function procesar(pregunta) {
  const q = String(pregunta || '').trim();
  if (!q) return respuesta('Escribe un mensaje o una búsqueda.');

  const n = norm(q);

  // estado del sistema
  if (n === 'estado' || n === 'status' || n === 'diagnostico') {
    const instances = getSearxInstances();
    const probe = await searchSearx('test');
    return respuesta(
      `**Estado del motor**\n\n` +
        `• SEARXNG_URL: ${process.env.SEARXNG_URL || '(no definida — usa lista por defecto)'}\n` +
        `• DATABASE_URL (Neon): ${process.env.DATABASE_URL ? 'conectada' : 'no definida'}\n` +
        `• Instancias SearX a probar: ${instances.length}\n` +
        `• SearX respondió ahora: ${probe.engine ? 'sí → ' + probe.engine : 'no (muchas instancias limitan bots/Render)'}\n` +
        `• Probadas: ${(probe.tried || []).slice(0, 5).join(', ') || '—'}\n\n` +
        `Si solo ves Wikipedia, SearXNG está bloqueando la IP de Render. Wikipedia y Yahoo siguen activos.`,
      [
        { t: 'GitHub del proyecto', u: 'https://github.com/Apsara-Vimana/Vimana_Busqueda_Chat' },
        { t: 'Ping API', u: '/api/ping' },
      ],
      ['ayuda', '/buscar yoga']
    );
  }

  if (['limpiar', 'borrar chat', 'reiniciar', 'vaciar'].some((k) => n === k || n.includes(k))) {
    return respuesta('Chat limpio. Namaste 🌺', [], ['ayuda'], { action: 'LIMPIAR' });
  }

  if (['ayuda', 'comandos', 'menu', 'tutorial'].some((k) => n === k || n.startsWith(k))) {
    return respuesta(
      `**Apsara Vimana — ayuda**\n\n` +
        `1. Escribe cualquier tema → busco en la web\n` +
        `2. \`/buscar …\` fuerza búsqueda\n` +
        `3. \`estado\` — ver si SearXNG / Neon responden\n` +
        `4. \`limpiar\` — vaciar el chat\n` +
        `5. \`cuanto es 15*4\` — calculadora\n\n` +
        `**Orden:** SearXNG → Wikipedia → enlace Yahoo\n\n` +
        `Cada respuesta indica la **fuente**. Usa los botones para seguir preguntando.`,
      [
        { t: 'Repo en GitHub', u: 'https://github.com/Apsara-Vimana/Vimana_Busqueda_Chat' },
      ],
      ['estado', '/buscar noticias', 'qué es dharma']
    );
  }

  if (/^(hola|namaste|buenas|hey)\b/.test(n) && n.length < 28) {
    return respuesta(
      'Namaste 🌺\n\nPuedo buscar en la web y citar la fuente. Prueba una pregunta o escribe **estado** para ver la conexión.',
      [],
      ['estado', 'ayuda', 'qué es yoga']
    );
  }

  if (n.includes('github') || n.includes('repositorio')) {
    return respuesta(
      '**Repositorio del chat**\n\nSi el deploy en Render apunta a este repo, los cambios de `engine.js` / `index.html` se publican al hacer push.',
      [
        { t: 'Vimana_Busqueda_Chat', u: 'https://github.com/Apsara-Vimana/Vimana_Busqueda_Chat' },
        { t: 'Org Apsara-Vimana', u: 'https://github.com/Apsara-Vimana' },
      ],
      ['estado', 'ayuda']
    );
  }

  const math = tryMath(q);
  if (math != null) return respuesta(`🔢 Resultado: **${math}**`, [], ['ayuda']);

  let query = q.replace(/^\/?buscar\s+/i, '').trim() || q;
  // atajos interactivos
  if (n === 'resumen wikipedia' || n === 'buscar mas en la web') {
    query = q; // kept
  }
  if (FILOSOFIA.some((k) => n.includes(k))) {
    query = query + (/\b(filosofia|hindu|india)\b/i.test(query) ? '' : ' filosofía');
  }

  // 1) SearXNG
  const searx = await searchSearx(query);
  if (searx.results && searx.results.length) {
    const lines = searx.results.map((r, i) => {
      let s = `${i + 1}. **${r.t}**`;
      if (r.snippet) s += `\n   ${r.snippet}`;
      return s;
    });
    return respuesta(
      `🔍 **SearXNG** (${searx.engine})\nConsulta: ${q}\n\n${lines.join('\n\n')}\n\n_Puedes abrir un enlace o pedir un resumen en Wikipedia._`,
      searx.results.map((r) => ({ t: r.t, u: r.u })).concat([
        { t: 'También en Yahoo', u: yahooUrl(query) },
      ]),
      followUps(query, 'searx')
    );
  }

  // 2) Wikipedia
  const wiki = await searchWiki(query);
  if (wiki) {
    const rel = (wiki.related || []).slice(0, 2);
    return respuesta(
      `📘 **Wikipedia** — ${wiki.title}\n\n${wiki.extract}\n\n` +
        `_SearXNG no devolvió resultados (suele pasar en servidores cloud por límite 429). ` +
        `Yahoo queda como refuerzo._`,
      [
        { t: 'Leer artículo completo', u: wiki.url },
        { t: 'Buscar en Yahoo', u: yahooUrl(query) },
      ],
      followUps(query, 'wiki').concat(rel.map((t) => t.slice(0, 40)))
    );
  }

  // 3) Solo Yahoo
  return respuesta(
    `No hubo resultados en SearXNG ni Wikipedia para «${q}».\n\nContinúa la búsqueda aquí:`,
    [{ t: '🔍 Buscar en Yahoo', u: yahooUrl(query) }],
    ['ayuda', 'estado', 'limpiar']
  );
}

module.exports = { procesar, getSearxInstances };
