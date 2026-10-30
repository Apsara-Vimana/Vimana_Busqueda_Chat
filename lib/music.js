const path = require('path');
const fs = require('fs');

let cache = null;
const VIMANA_MUSIC_PAGE = 'https://vimana.rf.gd/VimanaMusic2.html';

function loadMusica() {
  if (cache) return cache;
  try {
    cache = JSON.parse(
      fs.readFileSync(path.join(__dirname, '..', 'data', 'musica.json'), 'utf8')
    );
  } catch {
    cache = { radios: [], tracks: [] };
  }
  return cache;
}

function norm(t) {
  return String(t || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function tryMusic(pregunta) {
  const n = norm(pregunta);
  const data = loadMusica();
  const radios = data.radios || [];

  // Radio (segmento aparte)
  const wantsRadio =
    /\b(radio online|online radio|radios online|emisoras?)\b/.test(n) ||
    (/\b(radio|radios)\b/.test(n) &&
      !/\b(album|albun|musica|music|cancion|pista|disco)\b/.test(n));

  // Música / álbumes Vimana (incluye typos: albunes, albumes)
  const wantsVimanaMusic =
    /\b(vimana music|vimana musica|musica vimana|music vimana)\b/.test(n) ||
    /\b(ananda|divinaversum|podcast vimana|sadhana|soham|so ham)\b/.test(n) ||
    (/\bvimana\b/.test(n) &&
      /\b(musica|music|album|albumes|albun|albunes|disco|discos|cancion|canciones|pista|catalogo|repertorio|bhajan)\b/.test(
        n
      )) ||
    /\b(album|albumes|albun|albunes)\s+(de\s+)?vimana\b/.test(n) ||
    /\b(musica|music)\s+(de\s+)?vimana\b/.test(n);

  if (wantsRadio) {
    return {
      reply:
        '📻 **Radios online (Vimana)**\n\nToca una estación → se reproduce **en esta página**.',
      links: [],
      media: radios.map((r) => ({
        t: r.name,
        u: r.url,
        kind: 'radio',
      })),
      options: ['vimana music', 'álbum ananda', 'ayuda'],
    };
  }

  if (wantsVimanaMusic) {
    let title = 'Música y álbumes Vimana';
    if (/\bananda\b/.test(n)) title = 'Álbum Ananda — Vimana';
    else if (/\bdivinaversum\b/.test(n)) title = 'Álbum Divinaversum — Vimana';
    else if (/\bpodcast\b/.test(n)) title = 'Podcast Vimana';

    return {
      reply:
        `🎧 **${title}**\n\n` +
        `Prioridad del proyecto Vimana (Ananda, Divinaversum, podcasts y más).\n\n` +
        `Abre el catálogo oficial con reproductor:`,
      links: [{ t: 'Catálogo Vimana Music', u: VIMANA_MUSIC_PAGE }],
      media: [], // NUNCA botones MP3
      options: ['radio online', 'vimana music', 'ayuda'],
    };
  }

  return null;
}

module.exports = { tryMusic, loadMusica };
