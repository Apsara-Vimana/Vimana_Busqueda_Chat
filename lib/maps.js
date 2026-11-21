/**
 * Mapas Leaflet/OSM + Waze — cualquier lugar del mundo (Nominatim)
 * Lugares locales (data/lugares.json) solo como atajo; si no hay match → geocoding global.
 */
const fs = require('fs');
const path = require('path');

let cache = null;
function loadLugares() {
  if (cache) return cache;
  try {
    const p = path.join(__dirname, '..', 'data', 'lugares.json');
    cache = JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (_) {
    cache = [];
  }
  return cache;
}

function norm(t) {
  return String(t || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[¿?¡!.,;:()[\]{}«»"']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isMapQuery(n) {
  const x = norm(n);
  if (
    /\b(waze|mapa|mapas|ubicacion|ubicacion|coordenadas|donde queda|donde esta|donde se encuentra|muestrame el mapa|ver en el mapa|openstreetmap|leaflet|geolocaliz)\b/.test(
      x
    )
  )
    return true;
  if (/\b(como llegar|ruta a|navegar a|ubicame|ubica)\b/.test(x)) return true;
  return false;
}

function findLocalPlace(n) {
  const x = norm(n);
  const lugares = loadLugares();
  let best = null;
  let bestLen = 0;
  for (const L of lugares) {
    for (const nom of L.nombres || []) {
      const nn = norm(nom);
      if (nn && x.includes(nn) && nn.length >= bestLen) {
        best = L;
        bestLen = nn.length;
      }
    }
  }
  return best;
}

/** Quita palabras de control y deja el nombre del lugar (sin borrar "el" de El Salvador, etc.) */
function extractSearchQuery(raw) {
  let x = String(raw || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[¿?¡!]/g, ' ')
    .trim();

  // Frases enteras primero (orden importa)
  const phrases = [
    'por favor', 'please', 'quiero un mapa de', 'quiero el mapa de', 'quiero mapa de',
    'quisiera un mapa de', 'necesito un mapa de', 'busco el mapa de', 'dame el mapa de',
    'muestrame el mapa de', 'muéstrame el mapa de', 'ver el mapa de', 'mapa de', 'mapas de',
    'ubicacion de', 'ubicación de', 'coordenadas de', 'donde queda', 'dónde queda',
    'donde esta', 'dónde está', 'donde se encuentra', 'como llegar a', 'cómo llegar a',
    'ruta a', 'navegar a', 'como llegar', 'cómo llegar', 'quiero un', 'quiero el',
    'quisiera', 'necesito', 'busco', 'dame', 'muestrame', 'muéstrame',
  ];
  for (const ph of phrases) {
    const re = new RegExp('\\b' + ph.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi');
    x = x.replace(re, ' ');
  }
  x = x
    .replace(/\b(waze|mapas|mapa|ubicacion|ubicación|coordenadas|openstreetmap|leaflet|interactivo)\b/gi, ' ')
    .replace(/[,;:]+/g, ', ')
    .replace(/\s+/g, ' ')
    .replace(/^[,\s]+|[,\s]+$/g, '')
    .trim();

  return x || String(raw || '').trim();
}

function wazeLinks(lat, lon) {
  const ul = `https://waze.com/ul?ll=${lat}%2C${lon}&navigate=yes`;
  const web = `https://www.waze.com/es/live-map/directions?to=ll.${lat}%2C${lon}`;
  return [
    { t: 'Abrir en Waze (app / navegación)', u: ul, kind: 'waze' },
    { t: 'Waze Live Map (web)', u: web, kind: 'waze' },
  ];
}

/** Variantes de búsqueda para Nominatim (mundial) */
function queryVariants(q) {
  const base = String(q || '').trim();
  if (!base) return [];
  const variants = [base];
  // "santa ana el salvador" → "santa ana, el salvador"
  if (/\s+el\s+salvador\s*$/i.test(base)) {
    variants.push(base.replace(/\s+el\s+salvador\s*$/i, ', El Salvador'));
  }
  if (/\s+mexico\s*$/i.test(base) || /\s+méxico\s*$/i.test(base)) {
    variants.push(base.replace(/\s+m[eé]xico\s*$/i, ', Mexico'));
  }
  if (/\s+india\s*$/i.test(base)) {
    variants.push(base.replace(/\s+india\s*$/i, ', India'));
  }
  // con coma genérica si hay 2+ palabras
  const parts = base.split(/\s+/);
  if (parts.length >= 2) {
    variants.push(parts.slice(0, -1).join(' ') + ', ' + parts[parts.length - 1]);
  }
  return [...new Set(variants.filter(Boolean))];
}

async function nominatimOnce(q) {
  const url =
    'https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=3&q=' +
    encodeURIComponent(q);
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'es,en',
        'User-Agent': 'ApsaraVimana-Chat/1.0 (https://github.com/Apsara-Vimana/Vimana_Busqueda_Chat)',
      },
    });
    clearTimeout(to);
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || !data[0]) return null;
    // prefer city/town over huge admin if available
    const hit =
      data.find((h) =>
        /city|town|village|hamlet|suburb|municipality/i.test(h.type || h.addresstype || '')
      ) || data[0];
    return {
      lat: parseFloat(hit.lat),
      lon: parseFloat(hit.lon),
      titulo: hit.display_name ? String(hit.display_name).slice(0, 140) : q,
      zoom: /country|state|region/i.test(hit.type || '') ? 8 : 13,
      nota: 'Ubicación vía OpenStreetMap (Nominatim) — cualquier lugar del mundo',
    };
  } catch (_) {
    clearTimeout(to);
    return null;
  }
}

async function geocodeNominatim(query) {
  const variants = queryVariants(query);
  for (const v of variants) {
    const hit = await nominatimOnce(v);
    if (hit && Number.isFinite(hit.lat) && Number.isFinite(hit.lon)) return hit;
  }
  return null;
}

/**
 * @returns {Promise<object|null>}
 */
async function tryMaps(pregunta) {
  const n = norm(pregunta);
  if (!isMapQuery(n) && !findLocalPlace(n)) return null;

  const local = findLocalPlace(n);
  const wantsMap = isMapQuery(n);

  if (!wantsMap && local) {
    if (
      !/\b(mapa|waze|ubicacion|coordenadas|como llegar|donde queda|donde esta|ruta)\b/.test(n)
    ) {
      return null;
    }
  }
  if (!wantsMap && !local) return null;

  let place = null;
  // Preferir geocoding mundial si el usuario escribió un nombre concreto con "mapa de …"
  // Los atajos locales solo si el texto coincide fuerte con el catálogo
  if (local && wantsMap) {
    const q0 = extractSearchQuery(pregunta);
    const localNames = (local.nombres || []).map(norm);
    const qn = norm(q0);
    const strong = localNames.some((nn) => qn === nn || qn.includes(nn));
    if (strong) place = local;
  } else if (local && !wantsMap) {
    place = local;
  }

  if (!place) {
    const q = extractSearchQuery(pregunta);
    if (!q || q.length < 2) {
      return {
        reply:
          'Indica el lugar: por ejemplo *mapa de Santa Ana, El Salvador*, *mapa de Madrid* o *mapa de Tokyo*.',
        links: [],
        options: ['mapa de Santa Ana El Salvador', 'mapa de Madrid', 'mapa de Puttaparthi', 'ayuda'],
      };
    }
    place = await geocodeNominatim(q);
  }

  if (!place || !Number.isFinite(place.lat) || !Number.isFinite(place.lon)) {
    return {
      reply:
        'No pude ubicar ese lugar ahora. Prueba con ciudad y país, por ejemplo:\n' +
        '• mapa de Santa Ana, El Salvador\n' +
        '• mapa de Buenos Aires, Argentina\n' +
        '• mapa de París, Francia\n' +
        '• mapa de Puttaparthi, India',
      links: [],
      options: [
        'mapa de Santa Ana El Salvador',
        'mapa de San Salvador',
        'mapa de Madrid',
        'ayuda',
      ],
    };
  }

  const zoom = place.zoom || 13;
  const title = place.titulo || extractSearchQuery(pregunta) || 'Ubicación';
  const note = place.nota || '';
  const markers = [{ lat: place.lat, lon: place.lon, label: title, note }];

  const links = wazeLinks(place.lat, place.lon);
  links.push({
    t: 'Abrir en OpenStreetMap',
    u: `https://www.openstreetmap.org/?mlat=${place.lat}&mlon=${place.lon}#map=${zoom}/${place.lat}/${place.lon}`,
    kind: 'osm',
  });

  const reply =
    'Mapa — ' +
    title +
    '\n\n' +
    (note ? note + '\n\n' : '') +
    'Lat: ' +
    place.lat.toFixed(5) +
    ' · Lon: ' +
    place.lon.toFixed(5) +
    '\n\n' +
    'Abajo: mapa interactivo (OpenStreetMap). También puedes abrir la ruta en Waze.';

  return {
    reply,
    links,
    options: ['mapa de Santa Ana El Salvador', 'mapa de Madrid', 'mapa de Tokyo', 'ayuda'],
    map: {
      lat: place.lat,
      lon: place.lon,
      zoom,
      markers,
      title,
    },
  };
}

module.exports = { tryMaps, isMapQuery, loadLugares, geocodeNominatim, extractSearchQuery };
