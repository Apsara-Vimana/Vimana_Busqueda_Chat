/**
 * Identidad Vimana + glosario sánscrito local (data/glosario.json, identity_vimana.json)
 * Capa prioritaria antes de web.
 */
const path = require('path');
const fs = require('fs');

const DATA = path.join(__dirname, '..', 'data');

let glossary = null;
let identity = null;

function norm(t) {
  return String(t || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const TYPO_MAP = {
  shidi: 'shirdi',
  shiridi: 'shirdi',
  shirdy: 'shirdi',

  darma: 'dharma',
  darmas: 'dharma',
  karma: 'karma',
  atma: 'atman',
  atman: 'atman',
  ahimsa: 'ahimsa',
  bakti: 'bhakti',
  bhakti: 'bhakti',
};

function loadIdentity() {
  if (identity) return identity;
  try {
    identity = JSON.parse(
      fs.readFileSync(path.join(DATA, 'identity_vimana.json'), 'utf8')
    );
  } catch {
    identity = {};
  }
  return identity;
}

function loadGlossary() {
  if (glossary) return glossary;
  try {
    glossary = JSON.parse(fs.readFileSync(path.join(DATA, 'glosario.json'), 'utf8'));
    if (!Array.isArray(glossary)) glossary = [];
  } catch {
    glossary = [];
  }
  return glossary;
}

function tryIdentity(pregunta) {
  const n = norm(pregunta);
  const id = loadIdentity();

  // Agradecimiento explícito al asistente
  if (
    /^(gracias|muchas gracias)(\s+apsara)?[!\.]*$/i.test(pregunta.trim()) ||
    /^gracias apsara\b/i.test(pregunta.trim()) ||
    /^te agradezco\b/i.test(pregunta.trim())
  ) {
    return {
      reply: 'Namasté 🌺\n\nGracias a ti por estar aquí. Cuando quieras, seguimos.',
      links: [],
      options: ['qué es vimana', 'gita karma', 'ayuda'],
      image: '/imagenes/gratitud.jpg',
      imageSize: 'card',
      imageAlt: 'gratitud',
    };
  }

  // Personalidad Urvashi Apsara
  if (
    /\b(quien eres|quién eres|quien sos|quién sos|como te llamas|cómo te llamas|tu nombre|presentate|preséntate)\b/.test(n) ||
    /\b(quien es apsara|quién es apsara|eres apsara)\b/.test(n)
  ) {
    return {
      reply: id.quien_eres || 'Namasté. Soy Urvashi Apsara Vimana.',
      links: [{ t: 'Sitio Vimana', u: 'https://vimana.rf.gd/' }],
      options: ['qué es vimana', 'gita karma', 'vimana music', 'ayuda'],
    };
  }
  if (
    /\b(hablar con apsara|hablar con urvashi|quiero hablar|hola apsara|buenas apsara)\b/.test(n) ||
    /^(hola|namaste|namasté|buenas|hey)$/.test(n)
  ) {
    // saludo simple o pedir hablar
    if (/^(hola|namaste|namasté|buenas|hey)$/.test(n) || /hablar con/.test(n) || /hola apsara/.test(n)) {
      return {
        reply: id.hablar_con_apsara || id.quien_eres,
        links: [{ t: 'Sitio Vimana', u: 'https://vimana.rf.gd/' }],
        options: ['qué es vimana', 'proyecto vimana', 'gita capítulo 1', 'ayuda'],
      };
    }
  }

  // significado de la palabra vimana (término)
  if (
    /\b(que significa|qué significa|significado de|definicion de|definición de)\b/.test(n) &&
    /\bvimana\b/.test(n)
  ) {
    return {
      reply: `📖 **Vimana (término)**\n\n${id.vimana_termino || ''}`,
      links: [{ t: 'Sitio Vimana', u: 'https://vimana.rf.gd/' }],
      options: ['qué es vimana', 'proyecto vimana', 'vimana music', 'ayuda'],
    };
  }

  if (
    /\b(que es proyecto vimana|qué es proyecto vimana|proyecto vimana)\b/.test(n) ||
    (/\bproyecto\b/.test(n) && /\bvimana\b/.test(n))
  ) {
    return {
      reply: id.proyecto_vimana || '',
      links: [
        { t: 'Sitio Vimana', u: 'https://vimana.rf.gd/' },
        {
          t: 'Canal WhatsApp Vimana',
          u: 'https://whatsapp.com/channel/0029Vb7JnG2LtOj4YBb16905',
        },
      ],
      options: ['qué es vimana', 'vimana music', 'gita capítulo 1', 'ayuda'],
    };
  }

  if (
    /\b(que es vimana music|qué es vimana music|vimana music es)\b/.test(n) ||
    (/\bvimana music\b/.test(n) && /\b(que es|qué es|significado)\b/.test(n))
  ) {
    return {
      reply: id.vimana_music || '',
      links: [
        { t: 'Portal Vimana Music', u: 'https://vimana.rf.gd/' },
        { t: 'Catálogo música', u: 'https://vimana.rf.gd/VimanaMusic2.html' },
      ],
      options: ['radio online', 'vimana music', 'álbum ananda', 'ayuda'],
    };
  }

  // qué es vimana (proyecto/espacio) — no confundir con "vimana music" álbumes
  if (
    /^(que es vimana|qué es vimana|que es el vimana|qué es el vimana)$/.test(n) ||
    /\b(que es vimana|qué es vimana)\b/.test(n)
  ) {
    // si también dice music, ya capturado arriba
    if (/\bmusic\b/.test(n)) return null;
    return {
      reply: id.que_es_vimana || '',
      links: [
        { t: 'Sitio Vimana', u: 'https://vimana.rf.gd/' },
        {
          t: 'Canal WhatsApp',
          u: 'https://whatsapp.com/channel/0029Vb7JnG2LtOj4YBb16905',
        },
      ],
      options: ['proyecto vimana', 'vimana music', 'gita karma', 'ayuda'],
    };
  }

  return null;
}




/**
 * YOCO (You Only Catch Once): una sola ficha ganadora, la más específica.
 * Nunca preferir un término corto contenido en un nombre más largo.
 */
function expandTypos(s) {
  return s
    .split(/\s+/)
    .map((w) => TYPO_MAP[w] || w)
    .join(' ')
    .trim();
}

function scoreEntry(e, focus, n, tokens) {
  const term = norm(e.term);
  const aliases = norm(e.alias || '')
    .split(/[;,]/)
    .map((x) => x.trim())
    .filter(Boolean);

  const labels = [term, ...aliases];

  if (focus) {
    const f = expandTypos(focus);

    for (const lab of labels) {
      if (!lab) continue;
      if (f === lab) return 1000 + lab.length; // exacto
    }
    for (const lab of labels) {
      if (lab.length >= 5 && f.includes(lab)) return 500 + lab.length; // bloque completo
    }
    // todas las palabras del término están en el foco (orden libre)
    for (const lab of labels) {
      if (!lab.includes(' ')) continue;
      const parts = lab.split(/\s+/);
      if (parts.every((p) => f.split(/\s+/).includes(p) || f.includes(p))) {
        return 400 + lab.length;
      }
    }
    // foco "shirdi sai baba" vs term "sai baba" → NO (más corto / menos específico)
    for (const lab of labels) {
      if (!lab.includes(' ') && f !== lab) {
        // palabra suelta solo si el foco es exactamente esa palabra
        continue;
      }
    }
    return 0;
  }

  // sin "quien es": consulta directa del término
  let s = 0;
  const nn = expandTypos(n);
  for (const lab of labels) {
    if (nn === lab) s = Math.max(s, 1000 + lab.length);
    else if (tokens.length === 1 && tokens[0] === lab) s = Math.max(s, 900 + lab.length);
  }
  return s;
}

function tryGlossary(pregunta) {
  const n = norm(pregunta);
  if (!n || n.length < 2) return null;
  if (/\b(radio|album|álbum|capitulo|capítulo|clima|weather|gita)\b/.test(n)) return null;

  const list = loadGlossary();
  if (!list.length) return null;

  let focus = null;
  const fm = n.match(
    /^(?:quie[n]? es|quién es|quien fue|quién fue|que es|qué es|que significa|qué significa|definicion de|definición de)\s+(.+)$/
  );
  if (fm) {
    focus = expandTypos(
      norm(fm[1]).replace(/^(el|la|los|las|un|una)\s+/, '').trim()
    );
    // compuestos
    const j = focus.replace(/\s+/g, '');
    if (j === 'tulsidas' || focus === 'tulsi das') focus = 'tulsidas';
    if (focus === 'shirdi baba' || focus === 'shidi baba') focus = 'shirdi sai baba';
    if (focus === 'shiridi sai baba') focus = 'shirdi sai baba';
  }

  const tokens = n.split(/\s+/).filter((t) => t.length > 2);
  const ranked = list
    .map((e) => ({ e, s: scoreEntry(e, focus, n, tokens) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s);

  if (!ranked.length) return null;

  // YOCO: solo el primero
  const best = ranked[0].e;
  let reply = `📖 **${best.term}**`;
  if (best.alias) reply += ` · _${best.alias}_`;
  if (best.category) reply += `\n_Categoría: ${best.category}_`;
  reply += `\n\n${best.definition}`;
  reply += `\n\n_Glosario Apsara Vimana._`;

  return {
    reply,
    links: [],
    options: [best.term, 'ayuda'].slice(0, 4),
  };
}

function tryLocalKnowledge(pregunta) {
  const id = tryIdentity(pregunta);
  if (id) return id;
  return tryGlossary(pregunta);
}

module.exports = { tryLocalKnowledge, tryIdentity, tryGlossary, loadGlossary };
