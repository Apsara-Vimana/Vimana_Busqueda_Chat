/**
 * Escrituras — prioriza gita_db.json (shloka + translation EN)
 * Los chapter_*.json del repo DharmicData solo traen sánscrito → se enriquecen con gita_db
 * EN → ES con MyMemory; sánscrito intacto
 */
const path = require('path');
const fs = require('fs');

const DATA = path.join(__dirname, '..', 'data');

function norm(t) {
  return String(t || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function translateEnEs(text) {
  if (!text || !String(text).trim()) return text;
  const s = String(text).trim();
  if (/[áéíóúñ¿¡]/i.test(s) && /\b(el|la|de|que|los|las|una|es)\b/i.test(s)) {
    return s;
  }
  try {
    const url =
      'https://api.mymemory.translated.net/get?q=' +
      encodeURIComponent(s.slice(0, 450)) +
      '&langpair=en|es';
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12000);
    const r = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!r.ok) return s;
    const data = await r.json();
    const out = data && data.responseData && data.responseData.translatedText;
    if (out && !/MYMEMORY WARNING/i.test(out) && out.length > 5) return out;
  } catch (_) {}
  return s;
}

function readJsonSafe(fp) {
  try {
    return JSON.parse(fs.readFileSync(fp, 'utf8'));
  } catch {
    return null;
  }
}

function listFiles(dir, re) {
  try {
    return fs.readdirSync(dir).filter((f) => re.test(f)).map((f) => path.join(dir, f));
  } catch {
    return [];
  }
}

/** Índice chapter-verse → {shloka, translation, theme} desde gita_db.json */
function loadGitaDbIndex() {
  const db = readJsonSafe(path.join(DATA, 'gita_db.json'));
  const map = new Map();
  if (!Array.isArray(db)) return map;
  db.forEach((v) => {
    const key = `${v.chapter}:${v.verse}`;
    map.set(key, {
      chapter: v.chapter,
      verse: v.verse,
      shloka: v.shloka,
      translation: v.translation,
      theme: v.theme,
      source: 'Bhagavad Gita',
    });
  });
  return map;
}

let gitaVerses = null;
function loadGitaVerses() {
  if (gitaVerses) return gitaVerses;
  const index = loadGitaDbIndex();
  // Base: gita_db (con inglés)
  const list = Array.from(index.values());
  // Complementar shloka desde chapter JSON si falta
  const gitaDir = path.join(DATA, 'gita');
  listFiles(gitaDir, /^bhagavad_gita_chapter_\d+\.json$/i).forEach((fp) => {
    const data = readJsonSafe(fp);
    if (!data) return;
    const arr = data.BhagavadGita || data.verses || data.chapter || data;
    const items = Array.isArray(arr) ? arr : [];
    items.forEach((item) => {
      const ch = item.chapter;
      const ve = item.verse;
      if (ch == null || ve == null) return;
      const key = `${ch}:${ve}`;
      const sans = item.text || item.shloka || item.sanskrit || '';
      if (index.has(key)) {
        const cur = index.get(key);
        if (!cur.shloka && sans) cur.shloka = sans;
      } else {
        index.set(key, {
          chapter: ch,
          verse: ve,
          shloka: sans,
          translation: item.translation || item.english || '',
          theme: item.theme || '',
          source: 'Bhagavad Gita',
        });
      }
    });
  });
  gitaVerses = Array.from(index.values());
  return gitaVerses;
}

function extractGenericChunks(data, source, meta) {
  const chunks = [];
  function walk(node, ctx) {
    if (node == null) return;
    if (typeof node === 'string') {
      if (node.trim().length > 20) chunks.push({ text: node, source, ...ctx, ...meta });
      return;
    }
    if (Array.isArray(node)) {
      node.forEach((x) => walk(x, ctx));
      return;
    }
    if (typeof node === 'object') {
      const local = { ...ctx };
      if (node.chapter != null) local.chapter = node.chapter;
      if (node.verse != null) local.verse = node.verse;
      const sans = node.shloka || node.sanskrit || node.text;
      const trans = node.translation || node.english || node.en || node.meaning;
      if (sans || trans) {
        chunks.push({
          source,
          shloka: sans,
          translation: trans,
          text: [sans, trans].filter(Boolean).join('\n'),
          ...local,
          ...meta,
        });
      }
      Object.keys(node).forEach((k) => {
        if (['shloka', 'sanskrit', 'text', 'translation', 'english'].includes(k)) return;
        walk(node[k], local);
      });
    }
  }
  walk(data, {});
  return chunks;
}

function loadCorpus(folderRel, fileRe, sourceName) {
  const dir = path.join(DATA, folderRel);
  const chunks = [];
  listFiles(dir, fileRe).forEach((fp) => {
    const data = readJsonSafe(fp);
    if (data)
      chunks.push(...extractGenericChunks(data, sourceName, { file: path.basename(fp) }));
  });
  return chunks;
}

function loadByIntent(intent) {
  if (intent === 'gita') return loadGitaVerses();
  if (intent === 'ramayana')
    return loadCorpus('ValmikiRamayana', /\.json$/i, 'Valmiki Ramayana');
  if (intent === 'rigveda')
    return loadCorpus('Rigveda', /rigveda/i, 'Rigveda');
  if (intent === 'atharvaveda')
    return loadCorpus('AtharvaVeda', /atharvaveda/i, 'Atharvaveda');
  if (intent === 'yajurveda')
    return loadCorpus('Yajurveda', /\.json$/i, 'Yajurveda');
  if (intent === 'samaveda')
    return loadCorpus('Samaveda', /samaveda.*\.json$/i, 'Samaveda');
  return [];
}

function detectIntent(n) {
  if (
    /\b(gita|bhagavad|bhagavadgita|krishna|arjuna|kurukshetra)\b/.test(n) ||
    /\b(karma yoga|bhakti yoga|jnana yoga|moksha)\b/.test(n) ||
    (/\bkarma\b/.test(n) && !/\b(ayurveda|planta|hierba)\b/.test(n))
  ) {
    return 'gita';
  }
  if (/\b(ramayana|valmiki|rama\b|sita|lakshmana|hanuman|ayodhya|lanka)\b/.test(n))
    return 'ramayana';
  if (/\b(rigveda|rig veda|mandala|nasadiya|indra|agni|varuna)\b/.test(n))
    return 'rigveda';
  if (/\b(atharva|atharvaveda)\b/.test(n)) return 'atharvaveda';
  if (/\b(yajur|yajurveda|yajna)\b/.test(n)) return 'yajurveda';
  if (/\b(samaveda|sama veda)\b/.test(n)) return 'samaveda';
  if (/\b(veda|vedas|vedico|védico)\b/.test(n)) return 'rigveda';
  return null;
}

function scoreVerse(v, keys, n, chapterWanted) {
  let s = 0;
  const blob = norm(
    [v.translation, v.theme, v.shloka, String(v.chapter), String(v.verse)].join(' ')
  );
  if (chapterWanted && v.chapter === chapterWanted) s += 12;
  if (n.length > 4 && blob.includes(n)) s += 20;
  keys.forEach((t) => {
    if (t.length < 3) return;
    if (norm(v.translation || '').includes(t)) s += 10;
    if (norm(v.theme || '').includes(t)) s += 8;
    if (blob.includes(t)) s += 3;
  });
  // karma explícito en traducción
  if (keys.includes('karma') && /\bkarma\b/i.test(v.translation || '')) s += 15;
  return s;
}

async function formatVerse(v) {
  let head = `📜 **${v.source || 'Bhagavad Gita'}**`;
  if (v.chapter != null && v.verse != null) head += ` · ${v.chapter}.${v.verse}`;
  else if (v.chapter != null) head += ` · cap. ${v.chapter}`;

  let body = '';
  if (v.shloka) {
    // limpiar prefijo "मूल श्लोकः" repetido
    const sh = String(v.shloka).replace(/^मूल\s*श्लोकः\s*/u, '').trim();
    body += `\n\n${sh}`;
  }
  if (v.translation) {
    const es = await translateEnEs(v.translation);
    const same = norm(es) === norm(v.translation);
    if (!same && es && es.length > 10) {
      body += `\n\n**Español:** ${es}`;
      body += `\n_English:_ ${v.translation}`;
    } else {
      body += `\n\n**English:** ${v.translation}`;
      body += `\n_(Traducción al español no disponible en este momento; significado en inglés.)_`;
    }
  } else {
    body += `\n\n_(Este verso solo está en sánscrito en los chapter JSON. Sube data/gita_db.json para el significado.)_`;
  }
  return head + body;
}

async function tryDharmic(pregunta) {
  const n = norm(pregunta);
  if (!n || n.length < 3) return null;

  const intent = detectIntent(n);
  if (!intent) return null;

  const stop = new Set([
    'que', 'qué', 'dice', 'sobre', 'del', 'de', 'la', 'el', 'los', 'las', 'una',
    'como', 'cómo', 'por', 'para', 'con', 'en', 'y', 'the', 'what', 'about',
    'gita', 'veda', 'vedas', 'bhagavad', 'ramayana', 'capitulo', 'capítulo', 'chapter', 'cap',
  ]);
  const keys = n.split(' ').filter((t) => t.length > 2 && !stop.has(t));
  const chm = n.match(/\b(?:capitulo|capítulo|chapter|cap)\s*(\d{1,2})\b/);
  const chapterWanted = chm ? parseInt(chm[1], 10) : null;

  const verses = loadByIntent(intent);
  if (!verses.length) {
    return {
      reply:
        `📜 No hay datos locales para **${intent}**.\n\n` +
        (intent === 'gita'
          ? 'Sube **`data/gita_db.json`** (versos + inglés) además de los chapter_*.json.\n'
          : `Sube JSON en \`data/\` para ${intent}.\n`) +
        'Luego vuelve a desplegar en Render.',
      links: [],
      options: ['ayuda', 'ayurveda'],
    };
  }

  let ranked = verses
    .map((v) => ({ v, s: scoreVerse(v, keys, n, chapterWanted) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s);

  // Solo capítulo sin keyword fuerte → primeros versos del capítulo con traducción
  if (chapterWanted && keys.length === 0) {
    ranked = verses
      .filter((v) => v.chapter === chapterWanted && v.translation)
      .slice(0, 4)
      .map((v) => ({ v, s: 1 }));
  }

  // karma + capítulo 2: priorizar matches de karma en cap 2
  if (keys.includes('karma') && chapterWanted) {
    ranked = ranked.filter((x) => x.v.chapter === chapterWanted || x.s >= 15);
  }

  if (!ranked.length && chapterWanted) {
    ranked = verses
      .filter((v) => v.chapter === chapterWanted)
      .slice(0, 3)
      .map((v) => ({ v, s: 1 }));
  }

  if (!ranked.length) {
    ranked = verses.filter((v) => v.translation).slice(0, 2).map((v) => ({ v, s: 1 }));
  }

  const top = ranked.slice(0, 3);
  const parts = [];
  for (const x of top) {
    parts.push(await formatVerse(x.v));
  }

  const reply =
    parts.join('\n\n---\n') +
    `\n\n_Fuente local · sánscrito sin traducir · inglés→español automático._`;

  return {
    reply,
    links: [],
    options: ['gita karma', 'gita capítulo 2', 'ayurveda', 'ayuda'],
  };
}

module.exports = { tryDharmic, detectIntent, loadGitaVerses };
