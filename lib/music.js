const path = require('path');
const fs = require('fs');

let cache = null;
const VIMANA_HOME = 'https://vimana.rf.gd/';
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

/** Lista en texto por álbum (sin URLs de mp3, sin botones) */
function textoCatalogo(tracks, albumFilter) {
  const by = {};
  (tracks || []).forEach((t) => {
    const al = t.album || 'Otros';
    if (albumFilter && norm(al) !== norm(albumFilter)) return;
    if (!by[al]) by[al] = [];
    by[al].push(t.title || 'Pista');
  });
  const keys = Object.keys(by);
  if (!keys.length) return '';
  let s = '';
  keys.forEach((al) => {
    s += `**${al}**\n`;
    by[al].slice(0, 12).forEach((title, i) => {
      s += `${i + 1}. ${title}\n`;
    });
    if (by[al].length > 12) s += `… +${by[al].length - 12} más\n`;
    s += '\n';
  });
  return s.trim();
}

function tryMusic(pregunta) {
  const n = norm(pregunta);
  const data = loadMusica();
  const radios = data.radios || [];
  const tracks = data.tracks || [];

  const wantsRadio =
    /\b(radio online|online radio|radios online|emisoras?)\b/.test(n) ||
    (/\b(radio|radios)\b/.test(n) &&
      !/\b(album|albun|musica|music|cancion|pista|disco|grupo)\b/.test(n));

  const wantsVimanaMusic =
    /\b(vimana music|vimana musica|musica vimana|music vimana|grupo vimana)\b/.test(n) ||
    /\b(ananda|divinaversum|podcast vimana|sadhana|soham|so ham)\b/.test(n) ||
    (/\bvimana\b/.test(n) &&
      /\b(musica|music|album|albumes|albun|albunes|disco|discos|cancion|canciones|pista|catalogo|repertorio|bhajan|grupo)\b/.test(
        n
      )) ||
    /\b(album|albumes|albun|albunes)\s+(de\s+)?vimana\b/.test(n) ||
    /\b(musica|music)\s+(de\s+)?vimana\b/.test(n);

  if (wantsRadio) {
    return {
      reply:
        '📻 **Radios online (Vimana)**\n\nToca una estación → se reproduce **en esta página**.',
      links: [],
      media: radios.map((r) => ({ t: r.name, u: r.url, kind: 'radio' })),
      options: ['vimana music', 'álbum ananda', 'ayuda'],
    };
  }

  if (wantsVimanaMusic) {
    let albumFilter = null;
    let title = 'Música y álbumes Vimana';
    if (/\bananda\b/.test(n)) {
      albumFilter = 'Ananda';
      title = 'Álbum Ananda — Vimana';
    } else if (/\bdivinaversum\b/.test(n)) {
      albumFilter = 'Divinaversum';
      title = 'Álbum Divinaversum — Vimana';
    } else if (/\bpodcast\b/.test(n)) {
      albumFilter = 'Podcast';
      title = 'Podcast Vimana';
    }

    const lista = textoCatalogo(tracks, albumFilter);
    const reply =
      `🎧 **${title}**\n\n` +
      `Prioridad del **proyecto Vimana** (no bandas ajenas con el mismo nombre).\n\n` +
      (lista ? lista + '\n\n' : '') +
      `Para escuchar, entra al sitio o al catálogo:`;

    return {
      reply,
      links: [
        { t: 'Sitio Vimana', u: VIMANA_HOME },
        { t: 'Catálogo Vimana Music', u: VIMANA_MUSIC_PAGE },
      ],
      media: [],
      options: ['radio online', 'vimana music', 'álbum ananda', 'álbum divinaversum', 'ayuda'],
    };
  }

  return null;
}

module.exports = { tryMusic, loadMusica };
