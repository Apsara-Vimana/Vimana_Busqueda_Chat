/**
 * Jamendo API — música instrumental Creative Commons
 * Requiere JAMENDO_CLIENT_ID en entorno (Render).
 */
const DEFAULT_LIMIT = 5;

function hasJamendo() {
  return !!(process.env.JAMENDO_CLIENT_ID || '').trim();
}

function clientId() {
  return (process.env.JAMENDO_CLIENT_ID || '').trim();
}

/**
 * @param {string} tags - ej. "piano", "ambient", "relaxing"
 * @param {object} opts
 */
async function searchInstrumental(tags, opts = {}) {
  const id = clientId();
  if (!id) return { ok: false, error: 'no_client_id', results: [] };

  const limit = Math.min(opts.limit || DEFAULT_LIMIT, 10);
  const url = new URL('https://api.jamendo.com/v3.0/tracks/');
  url.searchParams.set('client_id', id);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('vocalinstrumental', 'instrumental');
  url.searchParams.set('include', 'musicinfo+licenses');
  url.searchParams.set('order', opts.order || 'popularity_total');
  if (tags) url.searchParams.set('tags', String(tags).replace(/\s+/g, '+'));
  if (opts.speed) url.searchParams.set('speed', opts.speed);
  if (opts.audioformat) url.searchParams.set('audioformat', opts.audioformat);

  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), opts.timeoutMs || 12000);
  try {
    const res = await fetch(url.toString(), { signal: ctrl.signal });
    clearTimeout(to);
    if (!res.ok) return { ok: false, error: 'http_' + res.status, results: [] };
    const data = await res.json();
    const results = Array.isArray(data.results) ? data.results : [];
    return {
      ok: true,
      results: results.map((t) => ({
        name: t.name,
        artist: t.artist_name,
        audio: t.audio,
        image: t.image,
        duration: t.duration,
        shareurl: t.shareurl,
      })),
    };
  } catch (e) {
    clearTimeout(to);
    return { ok: false, error: String(e.message || e), results: [] };
  }
}

function formatTracksReply(tag, results) {
  if (!results.length) {
    return {
      reply:
        '🎵 No encontré pistas instrumentales para **' +
        tag +
        '** en Jamendo.\n\nPrueba otras etiquetas: *piano*, *ambient*, *relax*, *meditation*, *flute*.',
      links: [],
      options: ['piano instrumental', 'ambient', 'vimana music', 'ayuda'],
      tracks: [],
    };
  }
  let reply =
    '🎵 **Música instrumental (Jamendo · Creative Commons)**\n' +
    '_Etiqueta: ' +
    tag +
    '_\n\n';
  results.forEach((t, i) => {
    reply +=
      (i + 1) +
      '. **' +
      t.name +
      '** — ' +
      t.artist +
      (t.duration ? ' · ' + Math.round(t.duration / 60) + ' min' : '') +
      '\n';
  });
  reply +=
    '\nReproduce abajo en el chat (HTML5). Licencias abiertas Jamendo; respeta los términos de cada pista.';
  return {
    reply,
    links: results.filter((t) => t.shareurl).map((t) => ({ t: t.name, u: t.shareurl })),
    options: ['piano instrumental', 'ambient', 'vimana music', 'radio online', 'ayuda'],
    tracks: results,
  };
}

/** Detecta si la consulta pide música instrumental / Jamendo (no álbum Vimana) */
function isJamendoQuery(n) {
  const x = String(n || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (/vimana music|album ananda|álbum ananda|divinaversum|radio online|radio sai/.test(x))
    return false;
  return (
    /\bjamendo\b/.test(x) ||
    /\b(instrumental|musica instrumental|música instrumental)\b/.test(x) ||
    /\b(piano|ambient|chillout|lofi|lo-fi|meditation music|musica para meditar|música para meditar|soundtrack|cinematic)\b/.test(
      x
    ) ||
    /\b(musica relajante|música relajante|musica de fondo|música de fondo)\b/.test(x)
  );
}

function extractTags(n) {
  const x = String(n || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const map = [
    [/piano/, 'piano'],
    [/ambient|ambiental/, 'ambient'],
    [/chill|chillout/, 'chillout'],
    [/lofi|lo-fi/, 'lofi'],
    [/meditat|relaj/, 'meditation'],
    [/flute|flauta/, 'flute'],
    [/guitar|guitarra/, 'guitar'],
    [/cinematic|epic|orquest/, 'cinematic'],
    [/jazz/, 'jazz'],
    [/electronic|electronica/, 'electronic'],
  ];
  for (const [re, tag] of map) {
    if (re.test(x)) return tag;
  }
  return 'relaxing';
}

async function tryJamendo(pregunta) {
  if (!isJamendoQuery(pregunta)) return null;
  if (!hasJamendo()) {
    return {
      reply:
        '🎵 **Jamendo** aún no está configurado (falta `JAMENDO_CLIENT_ID` en Render).\n\n' +
        'Mientras tanto puedes usar **vimana music** o **radio online**.',
      links: [],
      options: ['vimana music', 'radio online', 'ayuda'],
    };
  }
  const tags = extractTags(pregunta);
  const data = await searchInstrumental(tags, { limit: 5 });
  if (!data.ok) {
    return {
      reply:
        '🎵 No pude consultar Jamendo ahora. Prueba de nuevo o usa **vimana music**.\n' +
        '_(' +
        (data.error || 'error') +
        ')_',
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
  extractTags,
};
