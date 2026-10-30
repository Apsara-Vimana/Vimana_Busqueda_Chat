/**
 * Escrituras (Gita, Vedas, Ramayana) — data/ local
 * Sánscrito se conserva. Traducciones EN → ES (MyMemory).
 * Capa 2: temas sagrados antes de la búsqueda web.
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
  // si ya parece español (tildes / palabras comunes), no traducir
  if (/[áéíóúñ¿¡]/i.test(s) && /\b(el|la|de|que|en|los|las|un|una|es|por)\b/i.test(s)) {
    return s;
  }
  try {
    const url =
      'https://api.mymemory.translated.net/get?q=' +
      encodeURIComponent(s.slice(0, 450)) +
      '&langpair=en|es';
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10000);
    const r = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    if (!r.ok) return s;
    const data = await r.json();
    const out = data && data.responseData && data.responseData.translatedText;
    if (out && !/MYMEMORY WARNING/i.test(out)) return out;
  } catch (_) {}
  return s;
}

function readJsonSafe(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function listFiles(dir, re) {
  try {
    return fs
      .readdirSync(dir)
      .filter((f) => re.test(f))
      .map((f) => path.join(dir, f));
  } catch {
    return [];
  }
}

/** Flatten any JSON structure into searchable text chunks */
function extractChunks(data, source, meta) {
  const chunks = [];
  function walk(node, ctx) {
    if (node == null) return;
    if (typeof node === 'string') {
      if (node.trim().length > 15) {
        chunks.push({ text: node, source, ...ctx, ...meta });
      }
      return;
    }
    if (Array.isArray(node)) {
      node.forEach((item, i) => walk(item, { ...ctx, i }));
      return;
    }
    if (typeof node === 'object') {
      const local = { ...ctx };
      if (node.chapter != null) local.chapter = node.chapter;
      if (node.verse != null) local.verse = node.verse;
      if (node.shloka) local.shloka = node.shloka;
      if (node.sanskrit) local.shloka = node.sanskrit;
      const trans =
        node.translation ||
        node.english ||
        node.en ||
        node.meaning ||
        node.transliteration_meaning;
      if (trans) local.translation = trans;
      // prefer structured verse objects
      if (local.shloka || local.translation) {
        chunks.push({
          text: [local.shloka, local.translation].filter(Boolean).join('\n'),
          source,
          ...local,
          ...meta,
        });
      }
      Object.keys(node).forEach((k) => {
        if (['shloka', 'translation', 'english', 'en', 'sanskrit'].includes(k)) return;
        walk(node[k], local);
      });
    }
  }
  walk(data, {});
  return chunks;
}

let gitaCache = null;
function loadGitaChunks() {
  if (gitaCache) return gitaCache;
  const chunks = [];
  // 1) data/gita/bhagavad_gita_chapter_N.json
  const gitaDir = path.join(DATA, 'gita');
  listFiles(gitaDir, /^bhagavad_gita_chapter_\d+\.json$/i).forEach((fp) => {
    const data = readJsonSafe(fp);
    if (!data) return;
    const m = path.basename(fp).match(/chapter_(\d+)/i);
    const ch = m ? parseInt(m[1], 10) : null;
    chunks.push(...extractChunks(data, 'Bhagavad Gita', { chapter: ch }));
  });
  // 2) data/gita_db.json (lista versos)
  const db = readJsonSafe(path.join(DATA, 'gita_db.json'));
  if (Array.isArray(db) && db.length) {
    db.forEach((v) => {
      chunks.push({
        text: [v.shloka, v.translation].filter(Boolean).join('\n'),
        source: 'Bhagavad Gita',
        chapter: v.chapter,
        verse: v.verse,
        shloka: v.shloka,
        translation: v.translation,
        theme: v.theme,
      });
    });
  }
  gitaCache = chunks;
  return chunks;
}

function loadCorpus(folderRel, fileRe, sourceName) {
  const dir = path.join(DATA, folderRel);
  const chunks = [];
  listFiles(dir, fileRe).forEach((fp) => {
    const data = readJsonSafe(fp);
    if (!data) return;
    chunks.push(
      ...extractChunks(data, sourceName, { file: path.basename(fp) })
    );
  });
  // también archivos sueltos en data/ con espacios en el nombre
  return chunks;
}

function loadAllByIntent(intent) {
  if (intent === 'gita') return loadGitaChunks();
  if (intent === 'ramayana') {
    return loadCorpus(
      'ValmikiRamayana',
      /\.json$/i,
      'Valmiki Ramayana'
    );
  }
  if (intent === 'rigveda') {
    return loadCorpus('Rigveda', /rigveda_mandala_.*\.json$/i, 'Rigveda');
  }
  if (intent === 'atharvaveda') {
    // nombres con o sin espacio
    const dir = path.join(DATA, 'AtharvaVeda');
    const files = listFiles(dir, /atharvaveda/i);
    const chunks = [];
    files.forEach((fp) => {
      const data = readJsonSafe(fp);
      if (data) chunks.push(...extractChunks(data, 'Atharvaveda', { file: path.basename(fp) }));
    });
    return chunks;
  }
  if (intent === 'yajurveda') {
    const dir = path.join(DATA, 'Yajurveda');
    const chunks = [];
    listFiles(dir, /\.json$/i).forEach((fp) => {
      const data = readJsonSafe(fp);
      if (data)
        chunks.push(...extractChunks(data, 'Yajurveda', { file: path.basename(fp) }));
    });
    return chunks;
  }
  if (intent === 'samaveda') {
    const dir = path.join(DATA, 'Samaveda');
    const chunks = [];
    listFiles(dir, /samaveda.*\.json$/i).forEach((fp) => {
      const data = readJsonSafe(fp);
      if (data)
        chunks.push(...extractChunks(data, 'Samaveda', { file: path.basename(fp) }));
    });
    return chunks;
  }
  return [];
}

function detectIntent(n) {
  // orden: más específico primero
  if (
    /\b(gita|bhagavad|bhagavadgita|krishna|arjuna|kurukshetra)\b/.test(n) ||
    /\b(karma yoga|bhakti yoga|jnana yoga|moksha|dharma)\b/.test(n)
  ) {
    return 'gita';
  }
  if (
    /\b(ramayana|valmiki|rama\b|sita|lakshmana|hanuman|ayodhya|lanka)\b/.test(n)
  ) {
    return 'ramayana';
  }
  if (/\b(rigveda|rig veda|mandala|nasadiya|indra|agni|varuna)\b/.test(n)) {
    return 'rigveda';
  }
  if (/\b(atharva|atharvaveda|atharva veda)\b/.test(n)) return 'atharvaveda';
  if (/\b(yajur|yajurveda|yajna|yajña)\b/.test(n)) return 'yajurveda';
  if (/\b(samaveda|sama veda)\b/.test(n)) return 'samaveda';
  if (/\b(veda|vedas|vedico|védico|upanishad)\b/.test(n)) {
    return 'rigveda'; // entrada general → Rigveda primero
  }
  return null;
}

function scoreChunk(c, tokens, n) {
  let s = 0;
  const blob = norm(
    [c.text, c.translation, c.theme, c.shloka, String(c.chapter), String(c.verse)].join(' ')
  );
  if (!blob) return 0;
  if (n.length > 4 && blob.includes(n)) s += 15;
  tokens.forEach((t) => {
    if (t.length < 3) return;
    if (blob.includes(t)) s += 4;
  });
  // temas gita
  if (c.theme && tokens.some((t) => norm(c.theme).includes(t))) s += 6;
  return s;
}

async function formatHit(c) {
  let head = `📜 **${c.source || 'Texto'}**`;
  if (c.chapter != null) head += ` · cap. ${c.chapter}`;
  if (c.verse != null) head += `.${c.verse}`;
  if (c.file) head += ` · ${c.file}`;

  let body = '';
  if (c.shloka) {
    body += `\n\n${c.shloka}`;
  }
  const en = c.translation || '';
  if (en) {
    const es = await translateEnEs(en);
    body += `\n\n**ES:** ${es}`;
    if (es !== en) body += `\n_EN:_ ${en}`;
  } else if (c.text && !c.shloka) {
    // texto mixto: intentar traducir solo si es latino
    if (/^[a-zA-Z0-9\s.,;:'"!?()-]+$/.test(c.text.slice(0, 80))) {
      body += `\n\n**ES:** ${await translateEnEs(c.text.slice(0, 500))}`;
    } else {
      body += `\n\n${c.text.slice(0, 600)}`;
    }
  }
  return head + body;
}

/**
 * @returns {null|{reply,links,options}}
 */
async function tryDharmic(pregunta) {
  const n = norm(pregunta);
  if (!n || n.length < 3) return null;

  const intent = detectIntent(n);
  if (!intent) return null;

  const tokens = n.split(' ').filter((t) => t.length > 2);
  // quitar palabras vacías de búsqueda
  const stop = new Set([
    'que', 'qué', 'dice', 'sobre', 'del', 'de', 'la', 'el', 'los', 'las', 'una',
    'uno', 'como', 'cómo', 'por', 'para', 'con', 'en', 'y', 'o', 'the', 'what',
    'about', 'from', 'gita', 'veda', 'vedas', 'bhagavad', 'ramayana',
  ]);
  const keys = tokens.filter((t) => !stop.has(t));

  let chunks = loadAllByIntent(intent);
  if (!chunks.length) {
    return {
      reply:
        `📜 **${intent}**\n\nAún no hay archivos JSON en el servidor para este texto.\n` +
        `Sube los JSON a \`data/\` (gita/, Rigveda/, ValmikiRamayana/, …) y vuelve a desplegar.\n\n` +
        `_Mientras tanto puedes buscar en la web con VIMANA._`,
      links: [],
      options: ['ayuda', 'ayurveda', 'vimana music'],
    };
  }

  // capítulo explícito "capitulo 2" / "chapter 2"
  const chm = n.match(/\b(?:capitulo|capítulo|chapter|cap)\s*(\d{1,2})\b/);
  const chapterWanted = chm ? parseInt(chm[1], 10) : null;

  let ranked = chunks
    .map((c) => ({
      c,
      s:
        scoreChunk(c, keys.length ? keys : tokens, n) +
        (chapterWanted && c.chapter === chapterWanted ? 25 : 0),
    }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s);

  // si piden capítulo y no hay keyword, devolver primeros versos del capítulo
  if (chapterWanted && !ranked.length) {
    ranked = chunks
      .filter((c) => c.chapter === chapterWanted)
      .slice(0, 5)
      .map((c) => ({ c, s: 1 }));
  }

  if (!ranked.length) {
    // fallback: primeros del corpus con aviso
    ranked = chunks.slice(0, 2).map((c) => ({ c, s: 1 }));
  }

  const top = ranked.slice(0, 3);
  const parts = [];
  for (const x of top) {
    parts.push(await formatHit(x.c));
  }

  const reply =
    parts.join('\n\n---\n') +
    `\n\n_Fuente local DharmicData / gita_db · sánscrito sin traducir · EN→ES automático._`;

  return {
    reply,
    links: [],
    options: ['gita karma', 'gita capítulo 2', 'ayurveda', 'ayuda'],
  };
}

module.exports = { tryDharmic, detectIntent, loadGitaChunks };
