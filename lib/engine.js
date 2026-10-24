/**
 * Motor Apsara Vimana (Node) — estilo YOCO + cascada gratis
 * Local → SearXNG opcional → DuckDuckGo → Wikipedia (último) → Yahoo botón
 */
const fs = require('fs');
const path = require('path');

const EXT_TIMEOUT = 4000;
const SEARXNG_FALLBACK = [
  process.env.SEARXNG_URL,
  'https://searx.be',
  'https://priv.au',
].filter(Boolean);

function norm(t) {
  return String(t || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function httpGet(url, ms = EXT_TIMEOUT) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'ApsaraVimana/7.0' },
    });
    if (!r.ok) return null;
    return await r.text();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function respuesta(reply, image = null, links = [], options = []) {
  return {
    ok: true,
    agente: 'Apsara Vimana',
    reply,
    image: image || 'imagenes/estados/apsara_hero.jpg',
    links,
    options,
  };
}

/* ---------- Matemáticas seguras ---------- */
function mathEval(q) {
  let t = q.trim();
  const m = t.match(/(?:cuanto\s+es|cuánto\s+es|calcula|calcular|resuelve|math\s*:?)\s*(.+)$/i);
  if (m) t = m[1].trim();
  t = t.replace(/[×÷−]/g, (c) => ({ '×': '*', '÷': '/', '−': '-' }[c]));
  t = t.replace(/\^/g, '**').replace(/,/g, '.').replace(/\s+/g, '');
  if (!/\d/.test(t)) return null;
  if (!/^[0-9+\-*/().%eE*]+$/.test(t.replace(/\*\*/g, ''))) return null;
  try {
    // eslint-disable-next-line no-new-func
    const val = Function(`"use strict"; return (${t})`)();
    if (typeof val !== 'number' || !Number.isFinite(val)) return null;
    const mostrar = String(Number(val.toPrecision(12))).replace(/\.?0+$/, '') || '0';
    return respuesta(
      `🧮 **Resultado**\n\n\`${t}\` = **${mostrar}**\n\nPuedo sumar, restar, multiplicar, dividir y potencias (\`2**10\`).`,
      'imagenes/estados/apsara_hero.jpg'
    );
  } catch {
    return null;
  }
}


/* ---------- Maestros locales (PERSONAS) ---------- */
const PERSONAS = {
  sathya_sai_baba: {
    nombres: ['sai baba', 'sathya sai', 'sathia sai', 'saibaba', 'shirdi'],
    titulo: 'Sathya Sai Baba',
    texto: 'Sathya Sai Baba (1926–2011) fue un maestro espiritual de la India. Enseñó los valores humanos (Sathya, Dharma, Shanti, Prema, Ahimsa) y el servicio desinteresado. El proyecto Vimana se inspira en esa corriente de sabiduría y unidad.',
  },
  sadhguru: {
    nombres: ['sadhguru', 'sadh guru', 'jaggi vasudev'],
    titulo: 'Sadhguru',
    texto: 'Sadhguru (Jaggi Vasudev) es un yogui y maestro contemporáneo de la India, fundador de Isha Foundation. Habla de interioridad, yoga y bienestar interior con un lenguaje accesible.',
  },
  yogananda: {
    nombres: ['yogananda', 'paramahansa yogananda', 'paramhansa'],
    titulo: 'Paramahansa Yogananda',
    texto: 'Paramahansa Yogananda (1893–1952) llevó el Kriya Yoga a Occidente. Autor de «Autobiografía de un yogui», uno de los textos espirituales más influyentes del siglo XX.',
  },
  ramana: {
    nombres: ['ramana', 'ramana maharshi', 'maharshi'],
    titulo: 'Ramana Maharshi',
    texto: 'Ramana Maharshi (1879–1950) enseñó el autoindagación («¿Quién soy yo?») desde Arunachala, en el sur de la India. Su camino es el de la atención directa al Ser.',
  },
  osho: {
    nombres: ['osho', 'bhagwan', 'rajneesh'],
    titulo: 'Osho',
    texto: 'Osho (1931–1990) fue un maestro contemporáneo conocido por sus discursos sobre meditación, libertad interior y la integración de Oriente y Occidente.',
  },
};

function matchPersona(n) {
  for (const [key, p] of Object.entries(PERSONAS)) {
    for (const alias of p.nombres) {
      if (n.includes(alias)) return p;
    }
  }
  return null;
}

function intMaestro(n) {
  const p = matchPersona(n);
  if (!p) return null;
  return respuesta(`**${p.titulo}**\n\n${p.texto}`, 'imagenes/estados/apsara_hero.jpg');
}

function intListaMaestros(n) {
  if (!/\b(otros maestros|maestros espirituales|lista de maestros|que maestros|maestros de vimana)\b/.test(n)) return null;
  const lista = Object.values(PERSONAS).map((p) => `• **${p.titulo}**`).join('\n');
  return respuesta(`Maestros que puedo presentarte desde la base local:\n\n${lista}\n\nPregunta por uno, por ejemplo: «quién es Sadhguru».`, 'imagenes/estados/apsara_hero.jpg');
}

/* ---------- Local: glosario TXT pipe ---------- */
let glosarioCache = null;
function cargarGlosario() {
  if (glosarioCache) return glosarioCache;
  const dir = path.join(__dirname, '..', 'glosarios');
  const out = [];
  try {
    if (!fs.existsSync(dir)) return (glosarioCache = out);
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.txt'))) {
      const text = fs.readFileSync(path.join(dir, f), 'utf8');
      for (const line of text.split(/\r?\n/)) {
        if (!line.includes('|')) continue;
        const parts = line.split('|').map((p) => p.trim());
        if (parts.length < 2) continue;
        const term = parts[0];
        if (/^quiero\b/i.test(term)) continue;
        out.push({ term, def: parts.slice(1).join(' | '), n: norm(term) });
      }
    }
  } catch (e) {
    console.warn('[glosario]', e.message);
  }
  glosarioCache = out;
  return out;
}

function buscarGlosario(q) {
  const n = norm(q);
  const items = cargarGlosario();
  let best = null;
  for (const it of items) {
    if (n.includes(it.n) || it.n.includes(n.replace(/^(que es|qué es|quien es|quién es)\s+/, ''))) {
      if (!best || it.n.length > best.n.length) best = it;
    }
  }
  if (!best) return null;
  return respuesta(`**${best.term}**\n\n${best.def}`, 'imagenes/estados/apsara_hero.jpg');
}

/* ---------- Búsqueda externa gratis ---------- */
async function buscarSearxng(q) {
  for (const base of SEARXNG_FALLBACK.slice(0, 3)) {
    const url = `${base.replace(/\/$/, '')}/search?q=${encodeURIComponent(q)}&format=json&language=es-ES`;
    const raw = await httpGet(url);
    if (!raw) continue;
    try {
      const d = JSON.parse(raw);
      if (!d.results || !d.results.length) continue;
      const links = [];
      const lines = [];
      let i = 0;
      for (const r of d.results) {
        if (i >= 5) break;
        const title = (r.title || '').trim();
        const href = (r.url || '').trim();
        const snip = (r.content || r.snippet || '').trim().slice(0, 160);
        if (!title || !/^https?:/i.test(href)) continue;
        i++;
        lines.push(`${i}. **${title}**\n   ${snip}\n   🔗 ${href}`);
        links.push({ t: title, u: href });
      }
      if (!lines.length) continue;
      return {
        texto: `🔍 Resultados para «${q}»\n\n${lines.join('\n\n')}`,
        fuente: 'SearXNG',
        links,
      };
    } catch {
      continue;
    }
  }
  return null;
}

async function buscarDDG(q) {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&skip_disambig=1`;
  const raw = await httpGet(url);
  if (!raw) return null;
  try {
    const d = JSON.parse(raw);
    let texto = (d.AbstractText || '').trim();
    let urlRes = (d.AbstractURL || '').trim();
    if (!texto && Array.isArray(d.RelatedTopics)) {
      for (const rt of d.RelatedTopics) {
        if (rt.Text && rt.FirstURL) {
          texto = rt.Text.trim();
          urlRes = rt.FirstURL;
          break;
        }
      }
    }
    if (!texto) return null;
    const links = urlRes
      ? [{ t: 'Ver fuente', u: urlRes }]
      : [{ t: 'DuckDuckGo', u: `https://duckduckgo.com/?q=${encodeURIComponent(q)}` }];
    return { texto: `Encontré esto en DuckDuckGo:\n\n${texto.slice(0, 900)}`, fuente: 'DuckDuckGo', links };
  } catch {
    return null;
  }
}

async function buscarWiki(q) {
  const api = `https://es.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&redirects=1&format=json&titles=${encodeURIComponent(q)}`;
  const raw = await httpGet(api);
  if (!raw) return null;
  try {
    const d = JSON.parse(raw);
    const pages = d.query && d.query.pages;
    if (!pages) return null;
    const page = Object.values(pages)[0];
    if (!page || page.missing != null || !page.extract) return null;
    const title = page.title || q;
    const extract = String(page.extract).slice(0, 900);
    const pageUrl = `https://es.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;
    return {
      texto: `Encontré esto en Wikipedia:\n\n${extract}`,
      fuente: 'Wikipedia',
      links: [{ t: `Leer más en Wikipedia`, u: pageUrl }],
    };
  } catch {
    return null;
  }
}

function esNoWikiPrimero(n) {
  return /\b(noticia|noticias|deportes?|cartelera|clima|tiempo|software|app|aplicacion|medicina|enfermedad|alimento|comida|receta|astrolo|bolsa|cripto|dolar|precio)\b/.test(n);
}

async function buscarExterno(q) {
  const n = norm(q);
  let out = await buscarSearxng(q);
  if (!out) out = await buscarDDG(q);
  if (!out && !esNoWikiPrimero(n)) out = await buscarWiki(q);
  return out;
}

/* ---------- Intenciones simples ---------- */
function intSaludo(n) {
  if (/^(hola|holaa+|buenas|buenos dias|buen dia|buenas tardes|buenas noches|namaste|saludos|hi|hello|hey)\b/.test(n)) {
    return respuesta(
      'Namaste 🌺 Soy **Apsara Vimana**. Puedo ayudarte con sabiduría de Vimana, maestros, música, glosario, matemáticas y búsquedas.\n\n¿En qué te acompaño hoy?',
      'imagenes/estados/apsara_hero.jpg'
    );
  }
  if (/\b(gracias|adios|adiós|chao|hasta luego)\b/.test(n) && n.length < 40) {
    return respuesta('Con gusto. Que la paz te acompañe. 🙏', 'imagenes/estados/apsara_hero.jpg');
  }
  return null;
}

function intIdentidad(n) {
  if (/\b(quien eres|que eres|como te llamas|presentate|quien es apsara|que puedes hacer|ayuda)\b/.test(n)) {
    return respuesta(
      'Soy **Apsara Vimana**, asistente del proyecto Vimana.\n\nPuedo:\n• Responder desde el glosario y maestros locales\n• Calcular expresiones matemáticas\n• Buscar en la web (SearXNG / DuckDuckGo; Wikipedia al final)\n• Orientarte sobre música y contenidos de Vimana\n\nEscribe tu consulta con naturalidad.',
      'imagenes/estados/apsara_hero.jpg'
    );
  }
  return null;
}

/**
 * Punto de entrada del motor
 */
async function procesar(q) {
  const pregunta = String(q || '').trim().slice(0, 600);
  if (!pregunta) {
    return respuesta('Hola 🌺. Escribe tu mensaje para comenzar.', 'imagenes/estados/apsara_hero.jpg');
  }
  const n = norm(pregunta);

  // 0 math
  if (/\b(cuanto es|cuánto es|calcula|calcular|math|matematica|matemática)\b/.test(n) || (/^[\d\s+\-*/().%^×÷]+$/.test(pregunta) && /\d/.test(pregunta))) {
    const m = mathEval(pregunta);
    if (m) return m;
  }

  // 1 saludo / identidad
  const sal = intSaludo(n);
  if (sal) return sal;
  const id = intIdentidad(n);
  if (id) return id;

  // 1b maestros
  const lm = intListaMaestros(n);
  if (lm) return lm;
  const ma = intMaestro(n);
  if (ma) return ma;

  // 2 glosario local
  if (/\b(que es|qué es|quien es|quién es|significado|definicion|definición)\b/.test(n) || n.length < 40) {
    const g = buscarGlosario(pregunta);
    if (g) return g;
  }

  // 3 externa
  const ext = await buscarExterno(pregunta);
  const yahoo = `https://search.yahoo.com/search?p=${encodeURIComponent(pregunta)}`;
  if (ext) {
    const links = [...(ext.links || []), { t: 'Buscar en Yahoo', u: yahoo }];
    const pref =
      ext.fuente === 'SearXNG'
        ? ''
        : `No lo tengo solo en base local; busqué en **${ext.fuente}**:\n\n`;
    return respuesta(pref + ext.texto, 'imagenes/estados/apsara_hero.jpg', links);
  }

  return respuesta(
    'No encontré una respuesta clara en local ni en la web en este momento.\n\nPuedes probar de nuevo o abrir la búsqueda en Yahoo.',
    'imagenes/estados/apsara_hero.jpg',
    [{ t: 'Buscar en Yahoo', u: yahoo }]
  );
}

module.exports = { procesar, respuesta, norm };
