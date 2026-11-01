/**
 * Música y radio Vimana — estrategia de botones (como Ramayana)
 */
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

function radioResponse(radios) {
  return {
    reply:
      '📻 **Radios online (Vimana)**\n\n' +
      'Toca una estación → se reproduce **en esta página**.\n\n' +
      '_Si buscas otra radio de internet, escribe el nombre (ej. “radio jazz”) y se buscará fuera._',
    links: [],
    media: (radios || []).map((r) => ({ t: r.name, u: r.url, kind: 'radio' })),
    options: ['vimana music', 'álbum ananda', 'ayuda'],
    image: '/imagenes/R1.png',
    imageSize: 'state',
    imageAlt: 'Radio en vivo',
  };
}

function tryMusic(pregunta) {
  const n = norm(pregunta);
  const data = loadMusica();
  const radios = data.radios || [];
  const tracks = data.tracks || [];

  // —— RADIO: lista local siempre (sin preguntar) ——
  const wantsRadio =
    /\b(radio online|online radio|radios online|emisoras?|streaming)\b/.test(n) ||
    /\b(radio sai|radio nueva era|nueva era|musica instrumental|música instrumental)\b/.test(n) ||
    (/\b(radio|radios)\b/.test(n) &&
      !/\b(album|albun|cancion|pista|disco|grupo|banda)\b/.test(n));

  if (wantsRadio) {
    return radioResponse(radios);
  }

  // —— Otras bandas llamadas Vimana → web ——
  if (
    /otras bandas llamadas vimana/.test(n) ||
    (/\b(banda|band|grupo|rock|prog|progresivo)\b/.test(n) &&
      /\bvimana\b/.test(n) &&
      !/\b(nuestro|proyecto|catalogo|álbum ananda|divinaversum|del proyecto)\b/.test(n))
  ) {
    return {
      reply:
        '🎸 Entendido: buscas **otras bandas o artistas** llamados Vimana (no el catálogo del proyecto).\n\nVoy a la búsqueda en internet…',
      links: [],
      options: ['vimana music', 'radio online', 'ayuda'],
      _forceWeb: true,
      _topic: 'Vimana banda rock progresivo música',
    };
  }

  // —— Ambiguo "vimana music" / "música vimana" sin álbum concreto → elegir ——
  const ambiguousMusic =
    /^(vimana music|vimana musica|musica vimana|music vimana|musica de vimana|música de vimana)$/.test(
      n
    ) || n === 'vimana';

  if (ambiguousMusic) {
    return {
      reply:
        '🎧 **Música y el nombre “Vimana”**\n\n' +
        '¿Qué prefieres?\n\n' +
        '• **Música Vimana (proyecto)** — Ananda, Divinaversum, podcast, catálogo propio\n' +
        '• **Otras bandas “Vimana”** — búsqueda en internet (grupos ajenos al proyecto)\n\n' +
        '**Escoge o presiona uno de los botones de abajo.**',
      links: [],
      options: ['Música Vimana del proyecto', 'Otras bandas llamadas Vimana'],
      image: '/imagenes/Pensando.jpg',
      imageSize: 'state',
      imageAlt: 'Pensando',
      _askChoice: true,
    };
  }

  // —— Catálogo propio (explícito) ——
  const wantsOwn =
    /\b(musica vimana del proyecto|música vimana del proyecto|vimana music|catalogo vimana|ananda|divinaversum|podcast vimana|sadhana|soham|so ham)\b/.test(
      n
    ) ||
    (/\bvimana\b/.test(n) &&
      /\b(musica|music|album|albumes|albun|disco|cancion|catalogo|repertorio|bhajan)\b/.test(n) &&
      !/\b(banda|band|rock|otras)\b/.test(n));

  if (wantsOwn) {
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
      `Prioridad del **proyecto Vimana**.\n\n` +
      (lista ? lista + '\n\n' : '') +
      `Para escuchar, entra al sitio o al catálogo:`;

    return {
      reply,
      links: [
        { t: 'Sitio Vimana', u: VIMANA_HOME },
        { t: 'Catálogo Vimana Music', u: VIMANA_MUSIC_PAGE },
      ],
      media: [],
      options: ['radio online', 'álbum ananda', 'álbum divinaversum', 'ayuda'],
      image: '/imagenes/apsaravimana2.png',
      imageSize: 'card',
      imageAlt: 'Vimana music',
    };
  }

  return null;
}

module.exports = { tryMusic, loadMusica };
