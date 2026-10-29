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

  const wantsRadio =
    /\b(radio|emisoras?|streaming|sintoniz)/.test(n) || /\bradio online\b/.test(n);
  const wantsVimanaMusic =
    /\b(musica|música|cancion|canción|album|álbum|pista|playlist|reproduc|escuchar|pon musica|pon música)\b/.test(n) ||
    /\b(ananda|divinaversum|podcast vimana|sadhana|bhajan|soham|so ham)\b/.test(n);

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

  if (wantsRadio || /\bradio\b/.test(n)) {
    reply += '📻 **Radios online (Vimana)**\n\nToca una estación para escucharla **aquí en el chat** (sin salir de la página).\n\n';
    radios.slice(0, 12).forEach((r, i) => {
      reply += `${i + 1}. ${r.name}\n`;
      media.push({ t: r.name, u: r.url, kind: 'radio' });
    });
    reply += '\n';
  }

  if (wantsVimanaMusic || albumFilter) {
    const show = listTracks.slice(0, 15);
    if (show.length) {
      reply += albumFilter
        ? `🎧 **Álbum ${albumFilter}**\n\nToca una pista para reproducirla en el chat.\n\n`
        : '🎧 **Música Vimana**\n\nToca una pista para reproducirla en el chat.\n\n';
      show.forEach((t, i) => {
        reply += `${i + 1}. ${t.title}\n`;
        media.push({ t: t.title, u: t.url, kind: 'track' });
      });
      if (listTracks.length > 15) {
        reply += `\n_…${listTracks.length - 15} pistas más en el catálogo._\n`;
      }
    }
  }

  if (!media.length) return null;

  return {
    reply,
    links: [], // no mostrar URLs
    media,
    options: ['radio online', 'álbum ananda', 'álbum divinaversum', 'podcast vimana', 'ayuda'],
  };
}

module.exports = { tryMusic, loadMusica };
