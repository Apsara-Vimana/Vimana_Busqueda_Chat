const path = require('path');
const fs = require('fs');

let cache = null;

function loadMusica() {
  if (cache) return cache;
  try {
    const p = path.join(__dirname, '..', 'data', 'musica.json');
    cache = JSON.parse(fs.readFileSync(p, 'utf8'));
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
  const tracks = data.tracks || [];

  // ES + EN
  const wantsRadio =
    /\b(radio|radios|emisoras?|streaming|sintoniz|radio online|online radio|vimana radio|radios de vimana|vimana radios)\b/.test(n);
  const wantsVimanaMusic =
    /\b(musica|música|music|song|songs|cancion|canción|album|álbum|pista|playlist|play|listen|escuchar|reproduc|pon musica|pon música|vimana music|music vimana)\b/.test(n) ||
    /\b(ananda|divinaversum|podcast vimana|sadhana|bhajan|soham|so ham)\b/.test(n) ||
    /\bvimana\b/.test(n) && /\b(music|musica|música|radio|album|álbum|song)\b/.test(n);

  if (!wantsRadio && !wantsVimanaMusic) return null;

  let albumFilter = null;
  if (/\bananda\b/.test(n)) albumFilter = 'Ananda';
  if (/\bdivinaversum\b/.test(n)) albumFilter = 'Divinaversum';
  if (/\bpodcast\b/.test(n)) albumFilter = 'Podcast';
  if (/\bsadhana\b/.test(n)) albumFilter = 'Sadhana';
  if (/\bbhajan\b/.test(n)) albumFilter = 'Bhajan';

  let listTracks = tracks;
  if (albumFilter) {
    listTracks = tracks.filter((t) => norm(t.album) === norm(albumFilter));
  }

  const media = [];
  let reply = '';

  if (wantsRadio) {
    reply += '📻 **Radios online (Vimana)**\n\nToca una estación → se reproduce **en esta página**.\n\n';
    radios.forEach((r, i) => {
      reply += `${i + 1}. ${r.name}\n`;
      media.push({ t: r.name, u: r.url, kind: 'radio' });
    });
    reply += '\n';
  }

  if (wantsVimanaMusic || albumFilter) {
    const show = (albumFilter ? listTracks : tracks).slice(0, 15);
    if (show.length) {
      reply += albumFilter
        ? `🎧 **${albumFilter}**\n\nToca una pista → reproductor abajo en el chat.\n\n`
        : '🎧 **Vimana music**\n\nToca una pista → reproductor abajo en el chat.\n\n';
      show.forEach((t, i) => {
        reply += `${i + 1}. ${t.title}\n`;
        media.push({ t: t.title, u: t.url, kind: 'track' });
      });
    }
  }

  if (!media.length) return null;

  return {
    reply,
    links: [],
    media,
    options: [
      'radio online',
      'vimana music',
      'álbum ananda',
      'álbum divinaversum',
      'podcast vimana',
      'ayuda',
    ],
  };
}

module.exports = { tryMusic, loadMusica };
