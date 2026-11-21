/**
 * Pañcāṅga (cálculo Vimana) — tithi, nakṣatra, yoga, karaṇa, vāra
 * Implementación propia en JS (fórmulas astronómicas estándar).
 * En el chat se presenta como: VIMANA (Búsqueda:)
 * No mencionar librerías externas al usuario.
 */

const TITHI_NAMES = [
  'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami',
  'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami',
  'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Purnima/Amavasya',
];

const NAKSHATRA_NAMES = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra', 'Punarvasu',
  'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni', 'Hasta',
  'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha', 'Mula', 'Purva Ashadha',
  'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha', 'Purva Bhadrapada',
  'Uttara Bhadrapada', 'Revati',
];

const YOGA_NAMES = [
  'Vishkambha', 'Priti', 'Ayushman', 'Saubhagya', 'Shobhana', 'Atiganda', 'Sukarma',
  'Dhriti', 'Shula', 'Ganda', 'Vriddhi', 'Dhruva', 'Vyaghata', 'Harshana', 'Vajra',
  'Siddhi', 'Vyatipata', 'Variyan', 'Parigha', 'Shiva', 'Siddha', 'Sadhya', 'Shubha',
  'Shukla', 'Brahma', 'Indra', 'Vaidhriti',
];

const KARANA_NAMES = [
  'Bava', 'Balava', 'Kaulava', 'Taitila', 'Garija', 'Vanija', 'Vishti (Bhadra)',
  'Shakuni', 'Chatushpada', 'Naga', 'Kimstughna',
];

const VAARA_NAMES = [
  'Domingo (Ravivāra)',
  'Lunes (Somavāra)',
  'Martes (Maṅgalavāra)',
  'Miércoles (Budhavāra)',
  'Jueves (Guruvāra)',
  'Viernes (Shukravāra)',
  'Sábado (Shanivāra)',
];

/** Lugares frecuentes (lat, lon, tz offset horas aprox. sin DST fino) */
const PLACES = {
  'san salvador': { lat: 13.6929, lon: -89.2182, tz: -6, label: 'San Salvador' },
  'el salvador': { lat: 13.6929, lon: -89.2182, tz: -6, label: 'El Salvador' },
  'santa ana': { lat: 13.9946, lon: -89.5597, tz: -6, label: 'Santa Ana, El Salvador' },
  puttaparthi: { lat: 14.1652, lon: 77.8111, tz: 5.5, label: 'Puttaparthi' },
  'prasanthi nilayam': { lat: 14.1652, lon: 77.8111, tz: 5.5, label: 'Prasanthi Nilayam' },
  delhi: { lat: 28.6139, lon: 77.209, tz: 5.5, label: 'Delhi' },
  mumbai: { lat: 19.076, lon: 72.8777, tz: 5.5, label: 'Mumbai' },
  chennai: { lat: 13.0827, lon: 80.2707, tz: 5.5, label: 'Chennai' },
  rishikesh: { lat: 30.0869, lon: 78.2676, tz: 5.5, label: 'Rishikesh' },
  varanasi: { lat: 25.3176, lon: 82.9739, tz: 5.5, label: 'Varanasi' },
  madrid: { lat: 40.4168, lon: -3.7038, tz: 1, label: 'Madrid' },
  'ciudad de mexico': { lat: 19.4326, lon: -99.1332, tz: -6, label: 'Ciudad de México' },
  mexico: { lat: 19.4326, lon: -99.1332, tz: -6, label: 'México' },
};

function norm(t) {
  return String(t || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[¿?¡!.,;:()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isPanchangaQuery(n) {
  const x = norm(n);
  return /\b(panchanga|pancanga|pañcanga|pañcāṅga|panchang|tithi|nakshatra|naksatra|nakṣatra|yoga hindu|karana|karaṇa|vaara|vara lunar|calendario lunar|calendario vedico|calendario védico|calendario hindu|amanecer vedico|hora solar hindu|muhurta|muhūrta)\b/.test(
    x
  );
}

function detectPlace(n) {
  const x = norm(n);
  let best = null;
  let bestLen = 0;
  for (const [key, val] of Object.entries(PLACES)) {
    if (x.includes(key) && key.length >= bestLen) {
      best = val;
      bestLen = key.length;
    }
  }
  return best || PLACES['san salvador'];
}

function parseDateFromQuery(n) {
  // DD/MM/YYYY o YYYY-MM-DD
  let m = String(n).match(/\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})\b/);
  if (m) {
    const d = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10);
    const y = parseInt(m[3], 10);
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) return new Date(Date.UTC(y, mo - 1, d, 12, 0, 0));
  }
  m = String(n).match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (m) {
    return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 12, 0, 0));
  }
  if (/\bhoy\b/.test(norm(n)) || !/\b\d{4}\b/.test(n)) {
    const now = new Date();
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0));
  }
  return new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate(), 12, 0, 0));
}

function toJulianDay(date) {
  // date as UTC noon-ish
  const y = date.getUTCFullYear();
  let m = date.getUTCMonth() + 1;
  const d =
    date.getUTCDate() +
    date.getUTCHours() / 24 +
    date.getUTCMinutes() / 1440 +
    date.getUTCSeconds() / 86400;
  let yy = y;
  let mm = m;
  if (mm <= 2) {
    yy -= 1;
    mm += 12;
  }
  const A = Math.floor(yy / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (yy + 4716)) + Math.floor(30.6001 * (mm + 1)) + d + B - 1524.5;
}

function norm360(x) {
  let r = x % 360;
  if (r < 0) r += 360;
  return r;
}

/** Longitud eclíptica aparente del Sol (aprox. Meeus, grados) */
function sunLongitude(jd) {
  const T = (jd - 2451545.0) / 36525;
  const L0 = norm360(280.46646 + 36000.76983 * T + 0.0003032 * T * T);
  const M = norm360(357.52911 + 35999.05029 * T - 0.0001537 * T * T);
  const Mr = (M * Math.PI) / 180;
  const C =
    (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mr) +
    (0.019993 - 0.000101 * T) * Math.sin(2 * Mr) +
    0.000289 * Math.sin(3 * Mr);
  return norm360(L0 + C);
}

/** Longitud eclíptica de la Luna (aprox. simplificada, grados) */
function moonLongitude(jd) {
  const T = (jd - 2451545.0) / 36525;
  const Lp = norm360(218.3164477 + 481267.88123421 * T - 0.0015786 * T * T);
  const D = norm360(297.8501921 + 445267.1114034 * T - 0.0018819 * T * T);
  const M = norm360(357.5291092 + 35999.0502909 * T - 0.0001536 * T * T);
  const Mp = norm360(134.9633964 + 477198.8675055 * T + 0.0087414 * T * T);
  const F = norm360(93.272095 + 483202.0175233 * T - 0.0036539 * T * T);
  const toR = (d) => (d * Math.PI) / 180;
  let lon =
    Lp +
    6.289 * Math.sin(toR(Mp)) +
    1.274 * Math.sin(toR(2 * D - Mp)) +
    0.658 * Math.sin(toR(2 * D)) +
    0.214 * Math.sin(toR(2 * Mp)) -
    0.186 * Math.sin(toR(M)) -
    0.114 * Math.sin(toR(2 * F));
  return norm360(lon);
}

function computePanchanga(date, place) {
  const jd = toJulianDay(date);
  const sun = sunLongitude(jd);
  const moon = moonLongitude(jd);
  const elong = norm360(moon - sun);

  // Tithi: 0..29 (15 shukla + 15 krishna)
  const tithiIndex = Math.floor(elong / 12); // 0..29
  const paksha = tithiIndex < 15 ? 'Śukla (creciente)' : 'Kṛṣṇa (menguante)';
  const tithiNum = (tithiIndex % 15) + 1;
  let tithiName = TITHI_NAMES[Math.min(tithiNum - 1, 14)];
  if (tithiNum === 15) {
    tithiName = tithiIndex < 15 ? 'Pūrṇimā (Luna llena)' : 'Amāvāsyā (Luna nueva)';
  }

  // Nakshatra 0..26
  const nakIndex = Math.floor(moon / (360 / 27)) % 27;
  // Yoga
  const yogaIndex = Math.floor(norm360(sun + moon) / (360 / 27)) % 27;
  // Karana: 60 half-tithis; simplified fixed sequence after first
  const karanaHalf = Math.floor(elong / 6) % 60;
  let karanaName;
  if (karanaHalf === 0) karanaName = KARANA_NAMES[10];
  else if (karanaHalf >= 57) karanaName = KARANA_NAMES[7 + (karanaHalf - 57)];
  else karanaName = KARANA_NAMES[(karanaHalf - 1) % 7];

  // Vaara: JS getUTCDay with local offset approx
  const localMs = date.getTime() + (place.tz || 0) * 3600 * 1000;
  const local = new Date(localMs);
  const vaara = VAARA_NAMES[local.getUTCDay()];

  const y = date.getUTCFullYear();
  const mo = String(date.getUTCMonth() + 1).padStart(2, '0');
  const da = String(date.getUTCDate()).padStart(2, '0');

  return {
    dateLabel: `${da}/${mo}/${y}`,
    placeLabel: place.label,
    lat: place.lat,
    lon: place.lon,
    tithi: `${tithiName} · ${paksha}`,
    tithiNum,
    paksha,
    nakshatra: NAKSHATRA_NAMES[nakIndex],
    yoga: YOGA_NAMES[yogaIndex],
    karana: karanaName,
    vaara,
    sunLon: sun.toFixed(2),
    moonLon: moon.toFixed(2),
  };
}

function formatReply(p) {
  return (
    '**VIMANA (Búsqueda:)** Pañcāṅga\n\n' +
    `Lugar: **${p.placeLabel}**\n` +
    `Fecha: **${p.dateLabel}**\n\n` +
    `• Vāra (día): ${p.vaara}\n` +
    `• Tithi: ${p.tithi}\n` +
    `• Nakṣatra: ${p.nakshatra}\n` +
    `• Yoga: ${p.yoga}\n` +
    `• Karaṇa: ${p.karana}\n\n` +
    '_Cálculo orientativo para sadhana y calendario lunar. No sustituye un pañcāṅga oficial de tu tradición local._\n\n' +
    'Puedes pedir: *explica esta tithi*, *significado del nakshatra*, o *pañcāṅga en Puttaparthi*.'
  );
}

/**
 * @returns {Promise<object|null>}
 */
async function tryPanchanga(pregunta, opts = {}) {
  const n = norm(pregunta);
  if (!isPanchangaQuery(n)) return null;

  const place = detectPlace(n);
  const date = parseDateFromQuery(pregunta);
  const p = computePanchanga(date, place);
  const reply = formatReply(p);

  const extra = {
    _panchanga: p,
    _aiEnrich: /\b(explica|significado|que significa|qué significa|como se interpreta|cómo se interpreta|para que sirve|para qué sirve|hablame|háblame)\b/.test(
      n
    ),
  };

  // Si pide explicación, dejar que el engine pase a IA con contexto
  if (extra._aiEnrich && opts.allowAi !== false) {
    return {
      reply,
      links: [],
      options: ['pañcāṅga hoy', 'tithi hoy', 'nakshatra hoy', 'ayuda'],
      _forceAi: true,
      _panchanga: p,
      localContext:
        'Datos de pañcāṅga ya calculados (preséntalos como VIMANA, sin nombrar software externo):\n' +
        JSON.stringify(p, null, 0) +
        '\nExplica en tono espiritual y claro el significado práctico de tithi y nakṣatra para el día a día / sadhana. No inventes fechas distintas.',
    };
  }

  return {
    reply,
    links: [],
    options: [
      'explica esta tithi',
      'significado del nakshatra',
      'pañcāṅga en Puttaparthi',
      'pañcāṅga hoy San Salvador',
      'ayuda',
    ],
    _panchanga: p,
  };
}

module.exports = {
  tryPanchanga,
  isPanchangaQuery,
  computePanchanga,
  detectPlace,
  PLACES,
};
