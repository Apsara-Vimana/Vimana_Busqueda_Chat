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

  // —— RADIO ——
  // 1) Ya eligió Radio Vimana
  if (/^radio vimana\b/.test(n) || n === 'radios vimana' || n === 'nuestras radios') {
    return radioResponse(radios);
  }

  // 2) Género elegido (segunda pantalla de otras radios)
  const genreMatch =
    n.match(/^radio genero:\s*(.+)$/) ||
    n.match(/^radio género:\s*(.+)$/) ||
    n.match(/^radio en idioma\s+(.+)$/);
  if (genreMatch) {
    const genre = genreMatch[1].trim();
    const isLang = /idioma/.test(n) || /^(español|ingles|inglés|aleman|alemán|ruso|frances|francés|italiano|arabe|árabe)$/.test(
      genre.toLowerCase()
    );
    const topic = isLang
      ? `radio online en idioma ${genre} estación streaming live`
      : `radio online ${genre} estación streaming live`;
    return {
      reply:
        `📡 **Radio · ${genre}**\n\n` +
        `Busco emisoras de **${genre}** en internet…\n\n` +
        `_También puedes escribir en la barra el nombre exacto de una estación._`,
      links: [],
      options: ['Radio Vimana', 'buscame radios', 'ayuda'],
      image: '/imagenes/Pensando.jpg',
      imageSize: 'state',
      imageAlt: 'Pensando',
      _forceWeb: true,
      _topic: topic,
    };
  }

  // 3) Otras radios (mostrar géneros)
  if (
    /otras radios|busquedas de otras radios|búsquedas de otras radios|otras emisoras/.test(n)
  ) {
    return {
      reply:
        '📡 **Otras radios**\n\n' +
        '**Escoge el estilo o el idioma** para buscar, o si es algo específico **escribe en la barra** el nombre de la estación.\n\n' +
        '**Escoge o presiona uno de los botones de abajo.**',
      links: [],
      options: [
        'radio género: Clásica',
        'radio género: Jazz',
        'radio género: Pop',
        'radio género: Electrónica',
        'radio género: Country',
        'radio género: Blues',
        'radio género: Folk',
        'radio género: Latina',
        'radio género: R&B / Soul',
        'radio género: Nueva era',
        'radio género: Gregoriano',
        'radio género: Romántico EN',
        'radio género: Romántico ES',
        'radio género: Devocional hindú',
        'radio en idioma español',
        'radio en idioma inglés',
        'radio en idioma alemán',
        'radio en idioma ruso',
        'radio en idioma francés',
        'radio en idioma italiano',
        'radio en idioma árabe',
        'Radio Vimana',
        'ayuda',
      ],
      image: '/imagenes/Pensando.jpg',
      imageSize: 'state',
      imageAlt: 'Pensando',
      _askChoice: true,
    };
  }

  // 4) Petición genérica de radios → elegir
  const wantsRadioAsk =
    /\b(buscame radios|búscame radios|buscar radios|quiero radio|escuchar radio)\b/.test(n) ||
    (/\b(radio|radios)\b/.test(n) &&
      !/\b(album|albun|cancion|pista|disco|grupo|banda|genero|género)\b/.test(n) &&
      !/^radio genero:/.test(n) &&
      !/^radio género:/.test(n));

  // atajos directos a lista Vimana
  if (
    /\b(radio online|radios online|radio sai|streaming)\b/.test(n) ||
    n === 'radio vimana'
  ) {
    return radioResponse(radios);
  }

  if (wantsRadioAsk) {
    return {
      reply:
        '📻 **Radios**\n\n' +
        '¿Qué prefieres?\n\n' +
        '• **Radio Vimana** — estaciones listas en esta página\n' +
        '• **Otras radios** — por género o nombre de estación en internet\n\n' +
        '**Escoge o presiona uno de los botones de abajo.**',
      links: [],
      options: ['Radio Vimana', 'búsquedas de otras radios'],
      image: '/imagenes/Pensando.jpg',
      imageSize: 'state',
      imageAlt: 'Pensando',
      _askChoice: true,
    };
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
