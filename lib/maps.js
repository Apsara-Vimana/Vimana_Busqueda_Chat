/**
 * Mapas Leaflet/OSM + enlaces Waze (gratis, sin API key de mapas de pago)
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
  if (/\b(waze|mapa|mapas|ubicacion|ubicación|coordenadas|donde queda|dónde queda|donde esta|dónde está|donde se encuentra|muéstrame el mapa|muestrame el mapa|ver en el mapa|openstreetmap|leaflet)\b/.test(x))
    return true;
  if (/\b(como llegar|cómo llegar|ruta a|navegar a)\b/.test(x)) return true;
  // lugar conocido solo
  const lugares = loadLugares();
  for (const L of lugares) {
    for (const nom of L.nombres || []) {
      if (x.includes(norm(nom)) && x.length < 80) return true;
    }
  }
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

function extractSearchQuery(n) {
  let x = norm(n);
  x = x
    .replace(/\b(waze|mapa|mapas|ubicacion|ubicación|coordenadas|openstreetmap|leaflet|por favor|please)\b/g, ' ')
    .replace(/\b(donde queda|dónde queda|donde esta|dónde está|donde se encuentra|como llegar a|cómo llegar a|ruta a|navegar a|muéstrame|muestrame|ver en el mapa|el mapa de|mapa de)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return x || norm(n);
}

function wazeLinks(lat, lon, label) {
  const ul = `https://waze.com/ul?ll=${lat}%2C${lon}&navigate=yes`;
  const web = `https://www.waze.com/es/live-map/directions?to=ll.${lat}%2C${lon}`;
  return [
    { t: 'Abrir en Waze (app / navegación)', u: ul, kind: 'waze' },
    { t: 'Waze Live Map (web)', u: web, kind: 'waze' },
  ];
}

async function geocodeNominatim(query) {
  const q = String(query || '').trim();
  if (!q || q.length < 2) return null;
  const url =
    'https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' +
    encodeURIComponent(q);
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'ApsaraVimana/1.0 (community; +https://github.com/Apsara-Vimana)',
      },
    });
    clearTimeout(to);
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || !data[0]) return null;
    const hit = data[0];
    return {
      lat: parseFloat(hit.lat),
      lon: parseFloat(hit.lon),
      titulo: hit.display_name ? String(hit.display_name).slice(0, 120) : q,
      zoom: 13,
      nota: 'Ubicación aproximada (OpenStreetMap / Nominatim)',
    };
  } catch (_) {
    clearTimeout(to);
    return null;
  }
}

/**
 * @returns {Promise<object|null>} respuesta tipo engine
 */
async function tryMaps(pregunta) {
  const n = norm(pregunta);
  if (!isMapQuery(n) && !findLocalPlace(n)) return null;

  // Si solo menciona un lugar conocido sin verbo de mapa, aún así mapa si es muy claro
  const local = findLocalPlace(n);
  const wantsMap =
    isMapQuery(n) ||
    (local &&
      /\b(mapa|waze|ubicacion|ubicación|donde|dónde|llegar|ruta)\b/.test(n));

  if (!wantsMap && !local) return null;
  if (!wantsMap && local && !/\b(mapa|waze|ubicacion|ubicación|donde queda|dónde queda|donde esta|dónde está|como llegar|cómo llegar)\b/.test(n)) {
    // no forzar mapa solo por decir "Puttaparthi" en otro contexto espiritual
    if (!/\b(mapa|waze|ubicacion|ubicación|coordenadas|como llegar|cómo llegar|donde queda|dónde queda)\b/.test(n))
      return null;
  }

  let place = local;
  if (!place) {
    const q = extractSearchQuery(n);
    place = await geocodeNominatim(q);
  }
  if (!place || !Number.isFinite(place.lat) || !Number.isFinite(place.lon)) {
    return {
      reply:
        'No pude ubicar ese lugar en el mapa. Prueba con un nombre más concreto (ciudad, ashram o país), por ejemplo: mapa de Puttaparthi, o mapa de San Salvador.',
      links: [],
      options: ['mapa de Puttaparthi', 'mapa de San Salvador', 'ayuda'],
    };
  }

  const zoom = place.zoom || 13;
  const title = place.titulo || extractSearchQuery(n) || 'Ubicación';
  const note = place.nota || '';
  const markers = [
    {
      lat: place.lat,
      lon: place.lon,
      label: title,
      note: note,
    },
  ];

  const links = wazeLinks(place.lat, place.lon, title);
  // OSM view
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
    options: ['mapa de Puttaparthi', 'mapa de San Salvador', 'ayuda'],
    map: {
      lat: place.lat,
      lon: place.lon,
      zoom,
      markers,
      title,
    },
  };
}

module.exports = { tryMaps, isMapQuery, loadLugares };
