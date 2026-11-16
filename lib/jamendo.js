/**
 * Jamendo API — música instrumental Creative Commons
 * Requiere JAMENDO_CLIENT_ID en entorno (Render).
 * Variedad: order=random, offset rotativo, géneros dinámicos, filtro de pistas rotas.
 */
const DEFAULT_LIMIT = 8;

/** Pistas/artistas que no cargan bien o se repiten demasiado */
const BLOCK_NAME = /music soothe|meditation music.*stimi|stimibeats/i;
const BLOCK_ARTIST = /stimibeats/i;

/** Rotación simple entre peticiones (offset) */
let rotation = Math.floor(Math.random() * 40);

function hasJamendo() {
  return !!(process.env.JAMENDO_CLIENT_ID || '').trim();
}

function clientId() {
  return (process.env.JAMENDO_CLIENT_ID || '').trim();
}

function nextOffset() {
  rotation = (rotation + 7 + Math.floor(Math.random() * 5)) % 80;
  return rotation;
}

function filterTracks(results) {
  const seen = new Set();
  const out = [];
  for (const t of results || []) {
    const name = String(t.name || '');
    const artist = String(t.artist_name || t.artist || '');
    const key = (name + '|' + artist).toLowerCase();
    if (BLOCK_NAME.test(name) || BLOCK_ARTIST.test(artist)) continue;
    if (!t.audio && !t.audio) continue;
    const audio = t.audio || t.audiodownload;
    if (!audio) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      name: t.name,
      artist: t.artist_name || t.artist,
      audio: t.audio || audio,
      image: t.image || t.album_image,
      duration: t.duration,
      shareurl: t.shareurl,
    });
  }
  return out;
}

/**
 * @param {string} tags - género o término de búsqueda
 * @param {object} opts
 */
async function searchInstrumental(tags, opts = {}) {
  const id = clientId();
  if (!id) return { ok: false, error: 'no_client_id', results: [] };

  const want = Math.min(opts.limit || DEFAULT_LIMIT, 12);
  const q = String(tags || 'instrumental').replace(/\s+/g, ' ').trim();
  const offset = typeof opts.offset === 'number' ? opts.offset : nextOffset();
  // Pedimos más de lo que mostramos para poder filtrar
  const fetchLimit = Math.min(want + 8, 20);

  async function call(params) {
    const url = new URL('https://api.jamendo.com/v3.0/tracks/');
    url.searchParams.set('client_id', id);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', String(params.limit || fetchLimit));
    url.searchParams.set('offset', String(params.offset || 0));
    url.searchParams.set('include', 'musicinfo+licenses');
    url.searchParams.set('order', params.order || 'popularity_week');
    if (params.vocal !== false) {
      url.searchParams.set('vocalinstrumental', 'instrumental');
    }
    if (params.search) url.searchParams.set('search', params.search);
    if (params.fuzzytags) url.searchParams.set('fuzzytags', params.fuzzytags);
    if (params.tags) url.searchParams.set('tags', params.tags);
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), opts.timeoutMs || 14000);
    try {
      const res = await fetch(url.toString(), { signal: ctrl.signal });
      clearTimeout(to);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data.results) ? data.results : [];
    } catch (_) {
      clearTimeout(to);
      return [];
    }
  }

  // 1) random + search del género
  let raw = await call({
    search: q,
    fuzzytags: q.split(/\s+/)[0],
    order: 'popularity_week',
    offset: 0,
  });

  // 2) si pocos, random con tags
  if (filterTracks(raw).length < 3) {
    const more = await call({
      tags: q.split(/\s+/)[0],
      order: 'popularity_week',
      offset: offset % 50,
    });
    raw = raw.concat(more);
  }

  // 3) offset sobre popularity (otra página del catálogo)
  if (filterTracks(raw).length < 3) {
    const more = await call({
      search: q,
      order: 'popularity_total',
      offset,
      vocal: true,
    });
    raw = raw.concat(more);
  }

  // 4) último recurso: instrumental genérico aleatorio
  if (filterTracks(raw).length < 2) {
    const more = await call({
      search: 'instrumental',
      order: 'popularity_week',
      offset: offset % 50,
    });
    raw = raw.concat(more);
  }

  let results = filterTracks(raw);

  // Barajar resultados locales por si la API no randomizó bien
  for (let i = results.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = results[i];
    results[i] = results[j];
    results[j] = tmp;
  }

  results = results.slice(0, want);

  return { ok: true, results, query: q, offset };
}

function formatTracksReply(tag, results) {
  if (!results.length) {
    return {
      reply:
        '🎵 No encontré pistas instrumentales para **' +
        tag +
        '**.\n\nPrueba: *piano*, *ambient*, *jazz*, *guitar*, *flute*, *cinematic*, *lofi*.',
      links: [],
      options: ['piano instrumental', 'ambient', 'jazz instrumental', 'vimana music', 'ayuda'],
      tracks: [],
    };
  }
  let reply =
    '🎵 **Música instrumental (vimana busqueda · Creative Commons)**\n' +
    '_Etiqueta: ' +
    tag +
    '_\n\n';
  results.forEach((t, i) => {
    reply +=
      i +
      1 +
      '. **' +
      t.name +
      '** — ' +
      t.artist +
      (t.duration ? ' · ' + Math.round(t.duration / 60) + ' min' : '') +
      '\n';
  });
  reply +=
    '\nReproduce con los controles de arriba. Licencias abiertas (Creative Commons). ' +
    'Pide otro género o *más ' +
    tag +
    '* para otras pistas.';
  return {
    reply,
    links: [],
    options: [
      'más ' + tag,
      'piano instrumental',
      'ambient',
      'jazz instrumental',
      'vimana music',
      'ayuda',
    ],
    tracks: results,
  };
}

function isListenIntent(x) {
  return /\b(escuchar|quiero escuchar|ponme|ponme a|reproduce|reproducir|play|oir|oír|quiero oir|quiero oír|suena|dale play|reproductor|mas |más )\b/.test(
    x
  );
}

function isNonListenMusicTalk(x) {
  return (
    /\b(tengo un|tengo una|tengo el|tengo la|mi piano|mi guitarra)\b/.test(x) ||
    /\b(arruinado|roto|descompuesto|daniado|dañado|reparar|arreglo|como lo reparo|cómo lo reparo|arreglar)\b/.test(
      x
    ) ||
    /\b(que es un|qué es un|que son los|qué son los|saber mas de|saber más de|historia del|como funciona el|cómo funciona el)\b/.test(
      x
    ) ||
    /\b(recomienda libros|teoria|teoría del piano)\b/.test(x)
  );
}

function isJamendoQuery(n) {
  const x = String(n || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (
    /vimana music|album ananda|divinaversum|radio online|radio sai|podcast vimana|musica vimana/.test(
      x
    )
  ) {
    return false;
  }
  if (isNonListenMusicTalk(x)) return false;

  const genres =
    /\b(piano|instrumental|ambient|jazz|chill|lofi|lo-fi|guitar|guitarra|flute|flauta|violin|violín|cinematic|orquest|electronic|electronica|meditation|meditacion|meditación|relax|relaj|sitar|bansuri|harp|arpa|strings|cuerdas|new age|clasica|clásica|classical)\b/;

  if (isListenIntent(x) && genres.test(x)) return true;
  if (
    /^(piano instrumental|musica instrumental|música instrumental|ambient|chillout|lofi|piano ambient|jazz instrumental|guitar instrumental)$/.test(
      x.trim()
    )
  ) {
    return true;
  }
  if (/\bjamendo\b/.test(x)) return true;
  if (/\b(musica instrumental|música instrumental)\b/.test(x)) return true;
  if (/\bmas (piano|ambient|jazz|relax|instrumental|guitar)/.test(x) || /\bmás (piano|ambient|jazz|relax|instrumental|guitar)/.test(x))
    return true;
  if (
    /\b(musica relajante|música relajante|musica de fondo|música de fondo)\b/.test(x) &&
    (isListenIntent(x) || /^(musica relajante|música relajante)$/.test(x.trim()))
  ) {
    return true;
  }
  return false;
}

function extractTags(n) {
  const x = String(n || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const map = [
    [/piano/, 'piano'],
    [/sitar/, 'sitar'],
    [/bansuri|flute|flauta/, 'flute'],
    [/guitar|guitarra/, 'guitar'],
    [/violin|violín/, 'violin'],
    [/harp|arpa/, 'harp'],
    [/ambient|ambiental/, 'ambient'],
    [/chill|chillout/, 'chillout'],
    [/lofi|lo-fi/, 'lofi'],
    [/jazz/, 'jazz'],
    [/cinematic|epic|orquest/, 'cinematic'],
    [/electronic|electronica/, 'electronic'],
    [/new age/, 'newage'],
    [/clasica|clásica|classical|baroque|bach|mozart/, 'classical'],
    [/meditat|relaj|relax/, 'meditation'],
    [/strings|cuerdas/, 'strings'],
  ];
  for (const [re, tag] of map) {
    if (re.test(x)) return tag;
  }
  if (/\binstrumental\b/.test(x)) return 'instrumental';
  return 'instrumental';
}

async function tryJamendo(pregunta) {
  if (!isJamendoQuery(pregunta)) return null;
  if (!hasJamendo()) {
    return {
      reply:
        '🎵 **Música instrumental** aún no está configurada (falta `JAMENDO_CLIENT_ID` en Render).\n\n' +
        'Mientras tanto puedes usar **vimana music** o **radio online**.',
      links: [],
      options: ['vimana music', 'radio online', 'ayuda'],
    };
  }
  const tags = extractTags(pregunta);
  const data = await searchInstrumental(tags, { limit: 6 });
  if (!data.ok) {
    return {
      reply:
        '🎵 No pude cargar pistas instrumentales ahora. Prueba de nuevo o usa **vimana music**.',
      links: [],
      options: ['vimana music', 'radio online', 'ayuda'],
    };
  }
  return formatTracksReply(tags, data.results);
}

module.exports = {
  hasJamendo,
  searchInstrumental,
  tryJamendo,
  isJamendoQuery,
  isListenIntent,
  isNonListenMusicTalk,
  extractTags,
};
