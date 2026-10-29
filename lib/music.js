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

/**
 * Si la pregunta es de música/radio Vimana, devuelve respuesta prioritaria.
 */
function tryMusic(pregunta) {
  const n = norm(pregunta);
  const data = loadMusica();
  const radios = data.radios || [];
  const tracks = data.tracks || [];

  const wantsRadio =
    /\b(radio|emisoras?|streaming|sintoniz)/.test(n) ||
    /\bradio online\b/.test(n);
  const wantsVimanaMusic =
    /\b(musica|música|cancion|canción|album|álbum|pista|playlist|reproduc|escuchar|pon musica|pon música)\b/.test(
      n
    ) ||
    /\b(ananda|divinaversum|podcast vimana|sadhana|bhajan|soham|so ham)\b/.test(n);
  const wantsVimana =
    /\bvimana\b/.test(n) || wantsVimanaMusic || wantsRadio;

  if (!wantsRadio && !wantsVimanaMusic && !/\bvimana\b/.test(n)) {
    // "pon radio" etc
    if (!wantsRadio) return null;
  }
  if (!wantsRadio && !wantsVimanaMusic) return null;

  // Filtrar álbum
  let albumFilter = null;
  if (/\bananda\b/.test(n)) albumFilter = 'Ananda';
  if (/\bdivinaversum\b/.test(n)) albumFilter = 'Divinaversum';
  if (/\bpodcast\b/.test(n)) albumFilter = 'Podcast';
  if (/\bsadhana\b/.test(n)) albumFilter = 'Sadhana';
  if (/\bbhajan\b/.test(n)) albumFilter = 'Bhajan';

  let listTracks = tracks;
  if (albumFilter) {
    listTracks = tracks.filter(
      (t) => norm(t.album) === norm(albumFilter)
    );
  }

  const links = [];
  let reply = '';

  if (wantsRadio || /\bradio\b/.test(n)) {
    reply += '📻 **Radios online (lista Vimana)**\n\n';
    radios.slice(0, 12).forEach((r, i) => {
      reply += `${i + 1}. **${r.name}**\n`;
      links.push({ t: r.name, u: r.url });
    });
    reply += '\n';
  }

  if (wantsVimanaMusic || albumFilter || /\bvimana\b/.test(n)) {
    const show = listTracks.slice(0, 15);
    if (show.length) {
      reply += albumFilter
        ? `🎧 **Vimana — álbum ${albumFilter}**\n\n`
        : '🎧 **Música Vimana (propia, prioridad)**\n\n';
      show.forEach((t, i) => {
        reply += `${i + 1}. **${t.title}** · ${t.album || ''}\n`;
        links.push({ t: t.title, u: t.url });
      });
      if (listTracks.length > 15) {
        reply += `\n_…y ${listTracks.length - 15} pistas más en el catálogo._\n`;
      }
    }
  }

  if (!reply) return null;

  reply +=
    '\n_Enlaces de arriba = contenido Vimana prioritario. Puedes abrirlos en el navegador o el reproductor del sistema._';

  return {
    reply,
    links,
    options: ['radio online', 'álbum ananda', 'álbum divinaversum', 'podcast vimana', 'ayuda'],
  };
}

module.exports = { tryMusic, loadMusica };
