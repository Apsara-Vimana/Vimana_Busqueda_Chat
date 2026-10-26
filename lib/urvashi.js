/**
 * Urvashi Apsara — Gita + espiritualidad
 *
 * Fuentes (prioridad):
 * 1) API pública vedicscriptures (GitHub Pages) — sánscrito + traducciones EN/HI
 * 2) data/gita_db.json local
 * 3) Traducción EN→ES gratuita MyMemory (sin clave; límite diario)
 *
 * Sin DeepL / Google de pago. Sánscrito se muestra intacto.
 */
const fs = require('fs');
const path = require('path');

const GITA_PATH = path.join(__dirname, '..', 'data', 'gita_db.json');
const { procesarLibrosGita } = require('./gita_libros');
const REMOTE_SLOK = 'https://vedicscriptures.github.io/slok';
const TIMEOUT = 9000;

let verses = null;
let byTheme = null;
const memCache = new Map(); // "ch:vs" -> payload

function loadGita() {
  if (verses) return;
  try {
    verses = JSON.parse(fs.readFileSync(GITA_PATH, 'utf8'));
  } catch {
    verses = [];
  }
  byTheme = {};
  for (const v of verses) {
    const t = (v.theme || 'default').toLowerCase();
    if (!byTheme[t]) byTheme[t] = [];
    byTheme[t].push(v);
  }
}

function norm(t) {
  return String(t || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

async function httpJson(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: 'application/json', 'User-Agent': 'ApsaraVimana-Urvashi/1.0' },
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

/** Traducción gratuita EN→ES (MyMemory). Corta textos largos. */
async function traducirEs(texto) {
  const src = String(texto || '').trim();
  if (!src) return '';
  // si ya parece español, no llamar API
  if (/[áéíóúñ¿¡]/i.test(src) && !/\b(the|and|your|with|from|that)\b/i.test(src)) {
    return src;
  }
  const chunk = src.length > 450 ? src.slice(0, 450) : src;
  const url =
    'https://api.mymemory.translated.net/get?q=' +
    encodeURIComponent(chunk) +
    '&langpair=en|es';
  try {
    const data = await httpJson(url);
    const out = data && data.responseData && data.responseData.translatedText;
    if (out && !/MYMEMORY WARNING/i.test(out)) return out;
  } catch {
    /* ignore */
  }
  return src; // fallback: inglés
}

async function fetchRemoteSlok(ch, vs) {
  const key = ch + ':' + vs;
  if (memCache.has(key)) return memCache.get(key);
  const data = await httpJson(`${REMOTE_SLOK}/${ch}/${vs}`);
  if (!data || !data.slok) return null;
  const english =
    (data.siva && data.siva.et) ||
    (data.purohit && data.purohit.et) ||
    (data.gambir && data.gambir.et) ||
    '';
  const hindi = (data.tej && data.tej.ht) || '';
  const commentary =
    (data.siva && data.siva.ec) ||
    (data.chinmay && data.chinmay.hc) ||
    '';
  const payload = {
    chapter: data.chapter || ch,
    verse: data.verse || vs,
    shloka: data.slok,
    transliteration: data.transliteration || '',
    english: english.replace(/^\d+\.\d+\s*/, '').trim(),
    hindi: hindi.replace(/^।+[\d.]+\s*।+/g, '').trim(),
    commentary: String(commentary).slice(0, 600),
    source: 'vedicscriptures (API pública)',
  };
  memCache.set(key, payload);
  return payload;
}

function localVerse(ch, vs) {
  loadGita();
  return verses.find((v) => v.chapter === ch && (vs == null || v.verse === vs)) || null;
}

const INTENT_TO_THEMES = {
  grief: ['grief', 'compassion', 'detachment', 'acceptance', 'transience', 'immortality', 'wisdom'],
  fear: ['fear', 'courage', 'steadfastness', 'equanimity', 'duty', 'surrender'],
  doubt: ['doubt', 'discernment', 'wisdom', 'reality', 'surrender', 'divine_guidance'],
  anger: ['anger', 'equanimity', 'detachment', 'steadfastness', 'wisdom'],
  action: ['duty', 'action', 'detached_action', 'perfection_through_duty', 'surrender_to_god', 'path_of_bhakti'],
  soul: ['soul', 'eternality', 'immortality', 'reincarnation', 'invincibility'],
  peace: ['equanimity', 'steadfastness', 'surrender_for_peace', 'state_of_liberation'],
  default: ['wisdom', 'duty', 'soul', 'equanimity', 'divine_guidance', 'detached_action'],
};

const REFLECTIONS = {
  grief: 'Incluso en el sufrimiento, mantente firme en tu dharma. El tiempo sana cuando la fe se mantiene firme.',
  fear: 'Actúa sin miedo: el resultado está en manos de lo divino. Tu derecho es a la acción, no a los frutos.',
  doubt: 'La claridad llega cuando escuchas en silencio a tu ser interior. Pregunta con sinceridad, como Arjuna.',
  anger: 'La ira es un fuego. Dirígela hacia la comprensión, no hacia la destrucción.',
  action: 'Tu derecho es solo a la acción, nunca a sus frutos. Comienza sin vacilar.',
  soul: 'El cuerpo nace y muere; lo que tú eres no nace ni muere. Conoce eso y el miedo se suaviza.',
  peace: 'La paz no es la ausencia de batalla exterior, sino la firmeza interior ante el cambio.',
  default: 'Despréndete del resultado. Actúa con rectitud. Deja que el dharma te guíe.',
};

const QUESTIONS = {
  grief: '¿Qué recuerdo o apego está atado a este dolor?',
  fear: '¿Cuál es la raíz profunda de este temor?',
  doubt: '¿Cómo se vería la claridad absoluta en este momento?',
  anger: '¿Qué herida o expectativa no cumplida se oculta bajo esta ira?',
  action: '¿Qué pequeña acción puedes realizar ahora mismo sin temor al resultado?',
  soul: '¿Puedes sentir, aunque sea un instante, aquello en ti que no cambia?',
  peace: '¿Qué ruido interior podrías soltar hoy, aunque sea un poco?',
  default: '¿Qué es lo que verdaderamente buscas en este momento de tu vida?',
};

function detectIntent(text) {
  const lower = norm(text);
  const rules = [
    ['grief', ['triste', 'tristeza', 'llorar', 'dolor', 'perdida', 'duelo', 'pena']],
    ['fear', ['miedo', 'temor', 'ansiedad', 'preocup', 'incertidumbre']],
    ['doubt', ['confund', 'duda', 'perdido', 'incierto']],
    ['anger', ['enojado', 'molesto', 'rabia', 'furioso', 'ira']],
    ['action', ['que hacer', 'qué hacer', 'atascado', 'bloqueado', 'actuar', 'deber']],
    ['soul', ['alma', 'atman', 'inmortal', 'reencarna', 'quien soy', 'quién soy']],
    ['peace', ['paz', 'calma', 'serenidad', 'tranquil']],
  ];
  for (const [intent, kws] of rules) {
    if (kws.some((k) => lower.includes(k))) return intent;
  }
  return 'default';
}

function parseChapterVerse(userText) {
  const t = norm(userText);
  let m =
    t.match(/(?:cap(?:itulo)?|chapter|gita)\s*(\d+)\s*(?:verso|verse|v|[:.])\s*(\d+)/) ||
    t.match(/\bgita\s*(\d+)\s*[.:\s]+\s*(\d+)/) ||
    t.match(/\b(\d+)\s*[.:]\s*(\d+)\b/);
  if (m) return { ch: parseInt(m[1], 10), vs: parseInt(m[2], 10) };
  m = t.match(/(?:cap(?:itulo)?|chapter)\s*(\d+)/);
  if (m) return { ch: parseInt(m[1], 10), vs: null };
  return null;
}

function pickLocalByIntent(intent, userText) {
  loadGita();
  const themes = INTENT_TO_THEMES[intent] || INTENT_TO_THEMES.default;
  const pool = [];
  for (const th of themes) {
    if (byTheme[th]) pool.push(...byTheme[th]);
  }
  if (!pool.length) return verses[0] || null;
  const idx = Math.abs(userText.length * 7 + intent.length) % pool.length;
  return pool[idx];
}

/**
 * Respuesta completa Urvashi (async por API remota + traducción)
 */
async function procesarUrvashi(mensaje) {
  const libro = procesarLibrosGita(mensaje);
  if (libro) return { ...libro, persona: 'Urvashi Apsara' };

  const intent = detectIntent(mensaje);
  const ref = REFLECTIONS[intent] || REFLECTIONS.default;
  const question = QUESTIONS[intent] || QUESTIONS.default;
  const parsed = parseChapterVerse(mensaje);

  let remote = null;
  let local = null;

  if (parsed && parsed.ch >= 1 && parsed.ch <= 18) {
    const vs = parsed.vs || 1;
    remote = await fetchRemoteSlok(parsed.ch, vs);
    local = localVerse(parsed.ch, parsed.vs);
  } else {
    local = pickLocalByIntent(intent, mensaje);
    if (local) {
      remote = await fetchRemoteSlok(local.chapter, local.verse);
    }
  }

  // Español: preferir traducción de API EN; si no, local
  let espanol = '';
  let sanskrit = '';
  let translit = '';
  let ch = 0;
  let vs = 0;
  let fuente = 'local';

  if (remote) {
    sanskrit = remote.shloka;
    translit = remote.transliteration;
    ch = remote.chapter;
    vs = remote.verse;
    fuente = remote.source;
    espanol = await traducirEs(remote.english);
    if (!espanol && local && local.translation) {
      espanol = await traducirEs(local.translation);
    }
  } else if (local) {
    sanskrit = local.shloka || '';
    ch = local.chapter;
    vs = local.verse;
    espanol = await traducirEs(local.translation || '');
    fuente = 'gita_db.json (local)';
  }

  let reply = `✨ **Urvashi Apsara** — espiritualidad y Bhagavad Gita\n\n`;

  if (ch && vs) {
    reply += `📖 *Capítulo ${ch}, verso ${vs}*\n\n`;
  }
  if (sanskrit) {
    reply += `${sanskrit}\n\n`;
  }
  if (translit) {
    reply += `_${translit}_\n\n`;
  }
  if (espanol) {
    reply += `🇪🇸 **${espanol}**\n\n`;
  }
  if (remote && remote.hindi) {
    reply += `🇮🇳 ${remote.hindi}\n\n`;
  }

  reply += `📿 **Reflexión:** ${ref}\n\n`;
  reply += `💭 ${question}\n\n`;
  reply += `_Fuente: ${fuente}_`;

  return {
    reply,
    persona: 'Urvashi Apsara',
    options: ['Gita 2.47', 'Gita 2.20', 'Gita 18.66', 'paz interior', 'Apsara Vimana'],
    links: ch && vs
      ? [{ t: `Ver sloka ${ch}.${vs} (API)`, u: `${REMOTE_SLOK}/${ch}/${vs}` }]
      : [],
  };
}

function esIntentoUrvashi(mensaje) {
  const t = norm(mensaje);
  if (/\b(urvashi|bhagavad|gita|shloka|upanishad|dharma|atman|karma yoga|tal como es|leer capitulo|leer capítulo)\b/.test(t)) return true;
  if (/\b(triste|miedo|ansiedad|duelo|paz interior|alma|desesper)\b/.test(t)) return true;
  if (/\b(capitulo|capítulo)\s*\d+/.test(t)) return true;
  if (/^\s*gita\s*\d+/.test(t)) return true;
  if (/\b\d+\s*[.:]\s*\d+\b/.test(t) && t.length < 20) return true;
  return false;
}

module.exports = { procesarUrvashi, esIntentoUrvashi, detectIntent, loadGita };
