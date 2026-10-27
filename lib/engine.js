/**
 * Apsara Vimana engine v8 — reinicio
 * Orden de búsqueda:
 *   1) SearXNG (cadena de instancias)
 *   2) Wikipedia ES
 *   3) Yahoo (enlace de búsqueda)
 * Local / glosario: futuro (penúltimo)
 */
const SEARX_DEFAULT = [
  'https://sx.xo.st',
  'https://searxng.eshnetwork.space',
  'https://search.ctq.ro',
  'https://priv.au',
  'https://searx.tiekoetter.com',
];

/** Prioriza SEARXNG_URL del entorno (Render), p.ej. https://searx.be */
function getSearxInstances() {
  const env = (process.env.SEARXNG_URL || '').trim().replace(/\/$/, '');
  const list = env ? [env, ...SEARX_DEFAULT.filter((u) => u !== env)] : [...SEARX_DEFAULT];
  return list;
}

const TIMEOUT_MS = 8000;

// ——— Stopwords ES mínimas (estilo stopwords-iso; se puede ampliar) ———
const STOPWORDS_ES = new Set(
  `a al algo algunas algunos ante antes como con contra cual cuando de del desde donde durante e el ella ellas ellos en entre era es esa esas ese eso esos esta estaba estas este esto estos fue fui ha hay la las le les lo los me mi mis mucho muy nada ni no nos o os otra otras otro otros para pero poco por porque que quien se ser si sin sobre son su sus te tenia tiene tengo tu tus un una uno y ya`
    .split(/\s+/)
);

const FILOSOFIA_INDIA = [
  'india','hindu','oriental','samsara','karma','dharma','moksha','vedas','upanishads',
  'gita','bhagavad','puranas','vedanta','advaita','yoga','sutras','patanjali','buda',
  'budismo','nirvana','meditacion','atman','brahman','ahimsa','guru','ashram','sanscrito',
  'sanskrit','hinduismo','zen','theravada','mahayana','jainismo',
];

const CMD_LIMPIAR = ['limpiar','borrar chat','reiniciar','resetear','nueva busqueda','desde cero','pantalla limpia','vaciar'];
const CMD_AYUDA = ['ayuda','comandos','como busco','no entiendo','opciones','guia','manual','instrucciones','menu','tutorial','soporte'];
const CMD_REPO = ['github','repositorio','codigo fuente','ver codigo','clonar','readme','apsara-vimana'];

function respuesta(reply, image, links, options, extra) {
  return {
    reply: reply || '',
    image: image || 'index_files/2_fBUK.jpg',
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

function tokens(q) {
  return norm(q)
    .split(' ')
    .filter((w) => w.length > 1 && !STOPWORDS_ES.has(w));
}

async function fetchJson(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: 'application/json', 'User-Agent': 'ApsaraVimana/8.0' },
      redirect: 'follow',
    });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/** Traducción EN→ES gratuita (MyMemory) */
async function traducirEs(texto) {
  const src = String(texto || '').trim();
  if (!src || src.length < 3) return src;
  if (/[áéíóúñ¿¡]/i.test(src) && !/\b(the|and|with|from|that|this)\b/i.test(src)) return src;
  const q = src.length > 400 ? src.slice(0, 400) : src;
  const url =
    'https://api.mymemory.translated.net/get?q=' +
    encodeURIComponent(q) +
    '&langpair=en|es';
  try {
    const data = await fetchJson(url);
    const out = data && data.responseData && data.responseData.translatedText;
    if (out && !/MYMEMORY WARNING/i.test(out)) return out;
  } catch { /* */ }
  return src;
}

async function searchSearx(query) {
  const q = encodeURIComponent(query);
  for (const base of getSearxInstances()) {
    const url = `${base.replace(/\/$/, '')}/search?q=${q}&format=json&language=es-ES`;
    const data = await fetchJson(url);
    if (!data || !Array.isArray(data.results) || !data.results.length) continue;
    const results = data.results
      .filter((r) => r.url && (r.title || r.content))
      .slice(0, 6)
      .map((r) => ({
        t: String(r.title || r.url).slice(0, 120),
        u: r.url,
        snippet: String(r.content || '').slice(0, 180),
      }));
    if (results.length) return { results, engine: base };
  }
  return null;
}

async function searchWiki(query) {
  const api =
    'https://es.wikipedia.org/w/api.php?action=query&list=search&srsearch=' +
    encodeURIComponent(query) +
    '&utf8=1&format=json&origin=*';
  const search = await fetchJson(api);
  const hit = search && search.query && search.query.search && search.query.search[0];
  if (!hit) return null;
  const title = hit.title;
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
    extract: String(page.extract).slice(0, 900),
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

function detectCommand(n) {
  if (CMD_LIMPIAR.some((k) => n === k || n.includes(k))) return 'LIMPIAR';
  if (CMD_AYUDA.some((k) => n === k || n.startsWith(k))) return 'AYUDA';
  if (CMD_REPO.some((k) => n.includes(k))) return 'REPO';
  return null;
}

function hasFilosofia(n) {
  return FILOSOFIA_INDIA.some((k) => n.includes(k));
}

function boostQuery(query) {
  const n = norm(query);
  if (hasFilosofia(n)) {
    return query + ' filosofía india';
  }
  return query;
}

async function procesar(pregunta) {
  const q = String(pregunta || '').trim();
  if (!q) {
    return respuesta('Escribe un mensaje o una búsqueda.');
  }
  const n = norm(q);

  // Comandos de interfaz
  const cmd = detectCommand(n);
  if (cmd === 'LIMPIAR') {
    return respuesta('Chat limpio. Namaste 🌺', 'index_files/2_fBUK.jpg', [], ['ayuda', '/buscar noticias'], {
      action: 'LIMPIAR',
    });
  }
  if (cmd === 'AYUDA') {
    return respuesta(
      '**Comandos útiles**\n\n' +
        '• Escribe cualquier tema para buscar en la web\n' +
        '• `/buscar …` fuerza búsqueda\n' +
        '• `limpiar` — vacía el chat\n' +
        '• `cuanto es 12*8` — calculadora\n' +
        '• Temas de filosofía india (karma, dharma, gita…) se priorizan en la búsqueda\n\n' +
        'Orden: **SearXNG → Wikipedia → Yahoo**',
      'index_files/2_fBUK.jpg',
      [
        { t: 'GitHub Apsara-Vimana', u: 'https://github.com/Apsara-Vimana' },
        { t: 'Repo chat', u: 'https://github.com/Apsara-Vimana/Vimana_Busqueda_Chat' },
      ],
      ['/buscar noticias', 'qué es dharma', 'limpiar']
    );
  }
  if (cmd === 'REPO') {
    return respuesta(
      '**Repositorios Vimana**\n\nEnlaces oficiales del proyecto:',
      'index_files/2_fBUK.jpg',
      [
        { t: 'Org Apsara-Vimana', u: 'https://github.com/Apsara-Vimana' },
        { t: 'Vimana_Busqueda_Chat', u: 'https://github.com/Apsara-Vimana/Vimana_Busqueda_Chat' },
        { t: 'stopwords-es (referencia)', u: 'https://github.com/stopwords-iso/stopwords-es' },
      ],
      ['ayuda']
    );
  }

  if (/^(hola|namaste|buenas|hey|hi)\b/.test(n) && n.length < 28) {
    return respuesta(
      'Namaste 🌺\n\nSoy **Apsara Vimana**. Busco en la web y te muestro resultados claros.\n\nPrueba una pregunta o `/buscar …`',
      'index_files/2_fBUK.jpg',
      [],
      ['ayuda', '/buscar noticias', 'qué es yoga']
    );
  }

  const math = tryMath(q);
  if (math != null) {
    return respuesta(`🔢 Resultado: **${math}**`);
  }

  let query = q.replace(/^\/?buscar\s+/i, '').trim() || q;
  query = boostQuery(query);

  // 1) SearXNG
  const searx = await searchSearx(query);
  if (searx && searx.results.length) {
    const lines = searx.results.map((r, i) => {
      let s = `${i + 1}. **${r.t}**`;
      if (r.snippet) s += `\n   ${r.snippet}`;
      return s;
    });
    return respuesta(
      `🔍 **Búsqueda:** ${q}\n\n${lines.join('\n\n')}\n\n_SearXNG_`,
      'index_files/2_fBUK.jpg',
      searx.results.map((r) => ({ t: r.t, u: r.u })),
      ['ayuda', 'limpiar']
    );
  }

  // 2) Wikipedia
  const wiki = await searchWiki(query);
  if (wiki) {
    return respuesta(
      `📘 **Wikipedia** — ${wiki.title}\n\n${wiki.extract}`,
      'index_files/2_fBUK.jpg',
      [
        { t: 'Leer en Wikipedia', u: wiki.url },
        { t: 'Buscar en Yahoo', u: yahooUrl(query) },
      ],
      ['ayuda']
    );
  }

  // 3) Yahoo (enlace siempre disponible)
  return respuesta(
    `No hubo resultados útiles en SearXNG ni Wikipedia para «${q}».\n\nPuedes continuar en Yahoo:`,
    'index_files/2_fBUK.jpg',
    [{ t: '🔍 Buscar en Yahoo', u: yahooUrl(query) }],
    ['ayuda', 'limpiar']
  );
}

module.exports = { procesar, getSearxInstances, traducirEs, tokens };
