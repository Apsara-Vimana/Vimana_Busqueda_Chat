/**
 * Escrituras + FAQ Gita (español) + gita_db (EN→ES por verso)
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

/** Traduce EN→ES; reintenta varias rutas gratuitas */
async function translateEnEs(text) {
  const s = String(text || '').trim();
  if (!s) return s;
  if (/[áéíóúñ¿¡]/i.test(s) && /\b(el|la|de|que|los|las|una|es|por|con)\b/i.test(s)) {
    return s; // ya español
  }

  // 1) MyMemory
  try {
    const url =
      'https://api.mymemory.translated.net/get?q=' +
      encodeURIComponent(s.slice(0, 480)) +
      '&langpair=en|es';
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10000);
    const r = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    if (r.ok) {
      const data = await r.json();
      const out = data && data.responseData && data.responseData.translatedText;
      if (out && !/MYMEMORY WARNING/i.test(out) && out.length > 8) {
        // si sigue igual en inglés, seguir
        if (norm(out) !== norm(s)) return out;
      }
    }
  } catch (_) {}

  // 2) LibreTranslate (instancias públicas)
  for (const endpoint of [
    'https://libretranslate.com/translate',
    'https://translate.argosopentech.com/translate',
  ]) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 10000);
      const r = await fetch(endpoint, {
        method: 'POST',
        signal: ctrl.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: s.slice(0, 480), source: 'en', target: 'es', format: 'text' }),
      });
      clearTimeout(t);
      if (!r.ok) continue;
      const data = await r.json();
      if (data && data.translatedText && norm(data.translatedText) !== norm(s)) {
        return data.translatedText;
      }
    } catch (_) {}
  }

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

let faqCache = null;
function loadFaq() {
  if (faqCache) return faqCache;
  faqCache = readJsonSafe(path.join(DATA, 'gita_faq.json')) || [];
  return faqCache;
}

let gitaVerses = null;
function loadGitaVerses() {
  if (gitaVerses) return gitaVerses;
  const db = readJsonSafe(path.join(DATA, 'gita_db.json'));
  const map = new Map();
  if (Array.isArray(db)) {
    db.forEach((v) => {
      map.set(`${v.chapter}:${v.verse}`, {
        chapter: v.chapter,
        verse: v.verse,
        shloka: v.shloka,
        translation: v.translation,
        theme: v.theme,
        source: 'Bhagavad Gita',
      });
    });
  }
  // enriquecer shloka desde chapter files
  listFiles(path.join(DATA, 'gita'), /^bhagavad_gita_chapter_\d+\.json$/i).forEach((fp) => {
    const data = readJsonSafe(fp);
    if (!data) return;
    const arr = data.BhagavadGita || data.verses || [];
    if (!Array.isArray(arr)) return;
    arr.forEach((item) => {
      const key = `${item.chapter}:${item.verse}`;
      const sans = (item.text || item.shloka || '').replace(/^मूल\s*श्लोकः\s*/u, '');
      if (map.has(key)) {
        const cur = map.get(key);
        if (sans && (!cur.shloka || cur.shloka.length < sans.length)) cur.shloka = sans;
      } else if (item.chapter != null) {
        map.set(key, {
          chapter: item.chapter,
          verse: item.verse,
          shloka: sans,
          translation: item.translation || '',
          theme: '',
          source: 'Bhagavad Gita',
        });
      }
    });
  });
  gitaVerses = Array.from(map.values());
  return gitaVerses;
}

function getVerse(ch, ve) {
  return loadGitaVerses().find((v) => v.chapter === ch && v.verse === ve) || null;
}

/** Sinónimos tema → palabras a buscar */
const THEME_ALIASES = {
  devocion: ['devocion', 'devoción', 'bhakti', 'devoto', 'ofrenda', 'refugio', 'entrega', 'amor a dios', 'bhakti yoga'],
  karma: ['karma', 'accion', 'acción', 'frutos', 'ecuanimidad', 'trabajo', 'karma yoga'],
  dharma: ['dharma', 'deber', 'svadharma', 'rectitud', 'avatar'],
  alma: ['alma', 'atman', 'reencarnacion', 'reencarnación', 'inmortal', 'cuerpo', 'muerte'],
  deseo: ['deseo', 'kama', 'ira', 'apego', 'pasion', 'pasión'],
  renuncia: ['renuncia', 'sannyasa', 'tyaga'],
};

function expandKeys(n) {
  const keys = new Set(n.split(' ').filter((t) => t.length > 2));
  for (const [theme, aliases] of Object.entries(THEME_ALIASES)) {
    if (aliases.some((a) => n.includes(norm(a))) || keys.has(theme)) {
      aliases.forEach((a) => keys.add(norm(a)));
      keys.add(theme);
    }
  }
  // quitar ruido
  ['que', 'dice', 'sobre', 'gita', 'bhagavad', 'el', 'la', 'los', 'las', 'del', 'de', 'una', 'como'].forEach(
    (w) => keys.delete(w)
  );
  return Array.from(keys);
}

function scoreFaq(item, keys, n) {
  let s = 0;
  const qn = norm(item.question);
  const an = norm(item.answer);
  const kw = (item.keywords || []).map(norm);
  keys.forEach((k) => {
    if (k.length < 3) return;
    if (qn.includes(k)) s += 12;
    if (an.includes(k)) s += 6;
    if (kw.includes(k)) s += 14;
  });
  if (n.includes('devoc') && kw.includes('devocion')) s += 20;
  if (n.includes('bhakti') && kw.includes('bhakti')) s += 20;
  if (n.includes('karma') && kw.includes('karma')) s += 20;
  if (n.includes('reencarn') && (qn.includes('reencarn') || qn.includes('alma'))) s += 20;
  return s;
}

async function formatVerse(v) {
  let head = `📜 **Bhagavad Gita** · ${v.chapter}.${v.verse}`;
  let body = '';
  if (v.shloka) {
    body += `\n\n${String(v.shloka).replace(/^मूल\s*श्लोकः\s*/u, '').trim()}`;
  }
  if (v.translation) {
    const es = await translateEnEs(v.translation);
    body += `\n\n**Español:** ${es}`;
    if (norm(es) !== norm(v.translation)) {
      body += `\n_English:_ ${v.translation}`;
    }
  }
  return head + body;
}

function extractGenericChunks(data, source, meta) {
  const chunks = [];
  function walk(node, ctx) {
    if (node == null) return;
    if (typeof node === 'string') {
      if (node.trim().length > 25)
        chunks.push({ text: node, source, translation: '', ...ctx, ...meta });
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
      const trans = node.translation || node.english || node.en;
      if (sans || trans) {
        chunks.push({
          source,
          shloka: sans,
          translation: trans || '',
          chapter: local.chapter,
          verse: local.verse,
          ...meta,
        });
      }
      Object.keys(node).forEach((k) => {
        if (['shloka', 'text', 'translation', 'english'].includes(k)) return;
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
    if (data) chunks.push(...extractGenericChunks(data, sourceName, { file: path.basename(fp) }));
  });
  return chunks;
}

function detectIntent(n) {
  if (
    /\b(gita|bhagavad|krishna|arjuna|kurukshetra)\b/.test(n) ||
    /\b(karma|bhakti|devocion|devoción|moksha|dharma|atman|reencarnacion|reencarnación|svadharma)\b/.test(n) ||
    /\b(sannyasa|tyaga|avatar)\b/.test(n)
  ) {
    return 'gita';
  }
  if (/\b(ramayana|valmiki|rama\b|sita|hanuman|ayodhya|lanka)\b/.test(n)) return 'ramayana';
  if (/\b(rigveda|rig veda|mandala|nasadiya|indra|agni)\b/.test(n)) return 'rigveda';
  if (/\b(atharva|atharvaveda)\b/.test(n)) return 'atharvaveda';
  if (/\b(yajur|yajurveda|yajna)\b/.test(n)) return 'yajurveda';
  if (/\b(samaveda)\b/.test(n)) return 'samaveda';
  if (/\b(veda|vedas)\b/.test(n)) return 'rigveda';
  return null;
}

async function tryDharmic(pregunta) {
  const n = norm(pregunta);
  if (!n || n.length < 3) return null;
  const intent = detectIntent(n);
  if (!intent) return null;

  const keys = expandKeys(n);
  const chm = n.match(/\b(?:capitulo|capítulo|chapter|cap)\s*(\d{1,2})\b/) || n.match(/\bcap(?:itulo)?\s*(\d{1,2})\b/) || n.match(/\b(\d{1,2})\s*(?:del|de la|de el)?\s*gita\b/);
  const chapterWanted = chm ? parseInt(chm[1], 10) : null;

  // ——— GITA: FAQ temático primero (español nativo) ———
  if (intent === 'gita') {
    const faq = loadFaq();
    const faqRanked = faq
      .map((item) => ({ item, s: scoreFaq(item, keys, n) }))
      .filter((x) => x.s >= 10)
      .sort((a, b) => b.s - a.s);

    if (faqRanked.length && !chapterWanted) {
      const best = faqRanked[0].item;
      let reply = `📜 **Bhagavad Gita** (guía temática)\n\n`;
      reply += `**Pregunta:** ${best.question}\n\n`;
      reply += `**Respuesta:** ${best.answer}\n\n`;
      reply += `_${best.reference}_`;

      // añadir 1–2 versos literales con traducción
      const verseParts = [];
      for (const ref of (best.verses || []).slice(0, 2)) {
        const v = getVerse(ref.chapter, ref.verse);
        if (v) verseParts.push(await formatVerse(v));
      }
      if (verseParts.length) {
        reply += `\n\n---\n` + verseParts.join('\n\n---\n');
      }
      reply += `\n\n_Fuente: guía FAQ Gita + gita_db · sánscrito sin alterar._`;
      return {
        reply,
        links: [],
        options: ['gita karma', 'gita devoción', 'gita dharma', 'ayurveda', 'ayuda'],
      };
    }

    // búsqueda por versos / lectura de capítulo (páginas de 3)
    const verses = loadGitaVerses();
    if (!verses.length) {
      return {
        reply:
          '📜 Falta **data/gita_db.json** en el servidor. Súbelo al repo y redespliega.',
        links: [],
        options: ['ayuda'],
      };
    }

    // "desde 4" / "verso 10" / "siguiente" con capítulo
    const desdeM = n.match(/\bdesde\s+(\d{1,2})\b/) || n.match(/\bverso\s+(\d{1,2})\b/);
    let startVerse = desdeM ? parseInt(desdeM[1], 10) : 1;
    if (/\bsiguiente\b/.test(n) && !desdeM) {
      // si solo dice siguiente + capítulo, no sabemos offset → empezar en 1
      startVerse = 1;
    }

    const thematicKeys = keys.filter(
      (k) =>
        !/^\d+$/.test(k) &&
        !['capitulo', 'capitulo', 'chapter', 'cap', 'gita', 'verso', 'desde', 'siguiente', 'mas', 'más'].includes(k)
    );

    // Lectura secuencial del capítulo (sin tema fuerte, o con "desde" / "siguiente")
    const readChapter =
      chapterWanted &&
      (thematicKeys.length === 0 ||
        /\bdesde\b/.test(n) ||
        /\bsiguiente\b/.test(n) ||
        /\bleer\b/.test(n) ||
        /\bcompleto\b/.test(n) ||
        /\btodo el capitulo\b/.test(n));

    if (readChapter && chapterWanted) {
      const PAGE = 3;
      const chapterVerses = verses
        .filter((v) => v.chapter === chapterWanted)
        .sort((a, b) => a.verse - b.verse);
      const slice = chapterVerses.filter((v) => v.verse >= startVerse).slice(0, PAGE);
      if (!slice.length) {
        return {
          reply:
            `📜 **Bhagavad Gita — capítulo ${chapterWanted}**\n\n` +
            `No hay más versos desde el ${startVerse}. El capítulo termina antes o ya lo leíste completo.`,
          links: [],
          options: [
            `gita capítulo ${chapterWanted}`,
            chapterWanted < 18 ? `gita capítulo ${chapterWanted + 1}` : 'gita karma',
            'ayuda',
          ],
        };
      }
      const parts = [];
      for (const v of slice) {
        parts.push(await formatVerse(v));
      }
      const last = slice[slice.length - 1].verse;
      const nextStart = last + 1;
      const remaining = chapterVerses.filter((v) => v.verse >= nextStart).length;
      const total = chapterVerses.length;
      let footer =
        `\n\n_Capítulo ${chapterWanted}: versos ${slice[0].verse}–${last} · ${total} versos en total._`;
      const opts = [];
      if (remaining > 0) {
        footer += `\nQuedan **${remaining}** versos. Pulsa **siguiente** para ver 3 más.`;
        opts.push(`gita capítulo ${chapterWanted} desde ${nextStart}`);
        opts.push(`siguiente gita capítulo ${chapterWanted} desde ${nextStart}`);
      } else {
        footer += `\n**Fin del capítulo ${chapterWanted}.**`;
        if (chapterWanted < 18) opts.push(`gita capítulo ${chapterWanted + 1}`);
      }
      opts.push('gita karma', 'gita devoción', 'ayuda');
      return {
        reply: parts.join('\n\n---\n') + footer,
        links: [],
        options: opts,
      };
    }

    let ranked = verses
      .map((v) => {
        let s = 0;
        const blob = norm([v.translation, v.theme, String(v.chapter)].join(' '));
        if (chapterWanted && v.chapter === chapterWanted) s += 15;
        thematicKeys.forEach((k) => {
          if (k.length < 3) return;
          if (blob.includes(k)) s += 8;
          if (norm(v.translation || '').includes(k)) s += 6;
        });
        return { v, s };
      })
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s);

    if (!ranked.length && chapterWanted) {
      // fallback: primera página del capítulo
      const PAGE = 3;
      const chapterVerses = verses
        .filter((v) => v.chapter === chapterWanted)
        .sort((a, b) => a.verse - b.verse);
      const slice = chapterVerses.slice(0, PAGE);
      const parts = [];
      for (const v of slice) parts.push(await formatVerse(v));
      const nextStart = slice.length ? slice[slice.length - 1].verse + 1 : 1;
      const remaining = chapterVerses.filter((v) => v.verse >= nextStart).length;
      const opts = [];
      if (remaining > 0) opts.push(`gita capítulo ${chapterWanted} desde ${nextStart}`);
      opts.push('gita karma', 'ayuda');
      return {
        reply:
          parts.join('\n\n---\n') +
          `\n\n_Capítulo ${chapterWanted} · más versos con el botón siguiente._`,
        links: [],
        options: opts,
      };
    }

    if (!ranked.length) {
      ranked = verses.slice(0, 2).map((v) => ({ v, s: 1 }));
    }

    const parts = [];
    for (const x of ranked.slice(0, 3)) {
      parts.push(await formatVerse(x.v));
    }
    return {
      reply: parts.join('\n\n---\n') + `\n\n_Fuente local · cada verso traducido al español._`,
      links: [],
      options: ['gita karma', 'gita devoción', 'gita capítulo 2', 'ayuda'],
    };
  }

  // ——— Otros textos ———
  let corpus = [];
  if (intent === 'ramayana') corpus = loadCorpus('ValmikiRamayana', /\.json$/i, 'Valmiki Ramayana');
  else if (intent === 'rigveda') corpus = loadCorpus('Rigveda', /rigveda/i, 'Rigveda');
  else if (intent === 'atharvaveda') corpus = loadCorpus('AtharvaVeda', /atharvaveda/i, 'Atharvaveda');
  else if (intent === 'yajurveda') corpus = loadCorpus('Yajurveda', /\.json$/i, 'Yajurveda');
  else if (intent === 'samaveda') corpus = loadCorpus('Samaveda', /samaveda.*\.json$/i, 'Samaveda');

  if (!corpus.length) {
    return {
      reply: `📜 No hay JSON local para **${intent}** en data/. Sube los archivos y redespliega.`,
      links: [],
      options: ['gita karma', 'ayuda'],
    };
  }

  const ranked = corpus
    .map((c) => {
      let s = 0;
      const blob = norm([c.text, c.translation, c.shloka].join(' '));
      keys.forEach((k) => {
        if (k.length > 2 && blob.includes(k)) s += 5;
      });
      return { c, s };
    })
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, 3);

  if (!ranked.length) {
    return {
      reply: `📜 No encontré coincidencias en **${intent}** para esa consulta. Prueba otras palabras o un capítulo.`,
      links: [],
      options: ['ayuda', 'gita karma'],
    };
  }

  const parts = [];
  for (const x of ranked) {
    let block = `📜 **${x.c.source}**`;
    if (x.c.file) block += ` · ${x.c.file}`;
    if (x.c.shloka) block += `\n\n${x.c.shloka}`;
    if (x.c.translation) {
      const es = await translateEnEs(x.c.translation);
      block += `\n\n**Español:** ${es}`;
    } else if (x.c.text && /^[a-zA-Z]/.test(x.c.text)) {
      block += `\n\n**Español:** ${await translateEnEs(x.c.text.slice(0, 500))}`;
    } else if (x.c.text) {
      block += `\n\n${x.c.text.slice(0, 500)}`;
    }
    parts.push(block);
  }

  return {
    reply: parts.join('\n\n---\n') + `\n\n_Fuente local · traducción EN→ES cuando aplica._`,
    links: [],
    options: ['gita karma', 'ayuda'],
  };
}

module.exports = { tryDharmic, detectIntent, loadGitaVerses };
