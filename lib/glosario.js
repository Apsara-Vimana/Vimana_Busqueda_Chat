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

function scoreEntry(e, n, tokens) {
  let s = 0;
  const term = norm(e.term);
  const alias = norm(e.alias || '');
  const aliases = alias.split(/[;,]/).map((x) => norm(x)).filter(Boolean);
  function matchWord(w) {
    if (!w || w.length < 2) return false;
    const tw = TYPO_MAP[w] || w;
    if (term === w || term === tw) return true;
    if (aliases.includes(w) || aliases.includes(tw)) return true;
    if (term === TYPO_MAP[w]) return true;
    return false;
  }
  if (matchWord(n)) s += 50;
  tokens.forEach((tok) => {
    if (tok.length < 2) return;
    if (matchWord(tok)) s += 35;
    if (term.startsWith(tok) && tok.length >= 4) s += 12;
  });
  const m = n.match(/\b(?:que es|qué es|que significa|qué significa|definicion de|definición de|habla sobre|sobre)\s+(.+)$/);
  if (m) {
    let q = norm(m[1]).replace(/\b(el|la|los|las|un|una)\b/g, '').replace(/\s+/g, ' ').trim();
    q = TYPO_MAP[q] || q;
    if (matchWord(q) || term === q || aliases.includes(q)) s += 50;
    // multi-word skip for long phrases (limpiar el corazon) unless exact term
    if (q.split(' ').length > 3) s = Math.min(s, 10);
  }
  return s;
}

function tryGlossary(pregunta) {
  const n = norm(pregunta);
  if (!n || n.length < 2) return null;

  // no interceptar música / radio / clima / gita capítulos aquí
  if (/\b(radio|album|álbum|capitulo|capítulo|clima|weather)\b/.test(n)) return null;

  const list = loadGlossary();
  if (!list.length) return null;

  const tokens = n.split(' ').filter((t) => t.length > 2);
  const ranked = list
    .map((e) => ({ e, s: scoreEntry(e, n, tokens) }))
    .filter((x) => x.s >= 30)
    .sort((a, b) => b.s - a.s);

  if (!ranked.length) return null;

  const top = ranked.slice(0, 3);
  const best = top[0].e;
  let reply = `📖 **${best.term}**`;
  if (best.alias) reply += ` · _${best.alias}_`;
  if (best.category) reply += `\n_Categoría: ${best.category}_`;
  reply += `\n\n${best.definition}`;

  if (top.length > 1) {
    reply += `\n\n**También:** `;
    reply += top
      .slice(1)
      .map((x) => x.e.term)
      .join(', ');
  }

  reply += `\n\n_Glosario Apsara Vimana._`;

  return {
    reply,
    links: [],
    options: top.map((x) => x.e.term).concat(['ayuda']).slice(0, 5),
  };
}

/**
 * Identidad primero, luego glosario.
 */
function tryLocalKnowledge(pregunta) {
  const id = tryIdentity(pregunta);
  if (id) return id;
  return tryGlossary(pregunta);
}

module.exports = { tryLocalKnowledge, tryIdentity, tryGlossary, loadGlossary };
