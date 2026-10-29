/**
 * Herramientas públicas sin API key — se ejecutan ANTES de SearXNG
 * Fuentes tipo public-apis: Open-Meteo, Frankfurter, CoinGecko, REST Countries,
 * Open Library, Free Dictionary, LibreTranslate, iTunes, MusicBrainz, Nager.Date, Nominatim
 */
async function fetchJson(url, timeoutMs = 14000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'ApsaraVimana/8.5 (community; +https://github.com/Apsara-Vimana)',
      },
    });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function fetchText(url, timeoutMs = 12000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'ApsaraVimana/8.5' },
    });
    if (!r.ok) return null;
    return await r.text();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function norm(t) {
  return String(t || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[¿?¡!]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function pack(reply, links) {
  return { reply, links: links || [] };
}

// ——— Clima (Open-Meteo) ———
async function geocode(place) {
  const url =
    'https://geocoding-api.open-meteo.com/v1/search?name=' +
    encodeURIComponent(place) +
    '&count=1&language=es&format=json';
  const data = await fetchJson(url);
  if (!data || !data.results || !data.results[0]) return null;
  const r = data.results[0];
  return {
    name: r.name,
    country: r.country || '',
    admin: r.admin1 || '',
    lat: r.latitude,
    lon: r.longitude,
  };
}

function weatherCodeEs(code) {
  const map = {
    0: 'Despejado',
    1: 'Principalmente despejado',
    2: 'Parcialmente nublado',
    3: 'Nublado',
    45: 'Niebla',
    48: 'Niebla con escarcha',
    51: 'Llovizna ligera',
    53: 'Llovizna',
    61: 'Lluvia ligera',
    63: 'Lluvia moderada',
    65: 'Lluvia intensa',
    71: 'Nieve ligera',
    80: 'Chubascos',
    95: 'Tormenta',
  };
  return map[code] || `Código ${code}`;
}

async function weatherFor(place) {
  const geo = await geocode(place);
  if (!geo) return null;
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${geo.lat}&longitude=${geo.lon}` +
    '&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m' +
    '&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max' +
    '&timezone=auto&forecast_days=3';
  const data = await fetchJson(url);
  if (!data || !data.current) return null;
  const c = data.current;
  const d = data.daily || {};
  const where = [geo.name, geo.admin, geo.country].filter(Boolean).join(', ');
  let reply =
    `🌤️ **Clima actual — ${where}**\n\n` +
    `• Temperatura: **${c.temperature_2m}°C**\n` +
    `• Condición: ${weatherCodeEs(c.weather_code)}\n` +
    `• Humedad: ${c.relative_humidity_2m}%\n` +
    `• Viento: ${c.wind_speed_10m} km/h\n`;
  if (d.time && d.time[0]) {
    reply += `\n**Próximos días:**\n`;
    for (let i = 0; i < Math.min(3, d.time.length); i++) {
      reply += `• ${d.time[i]}: máx ${d.temperature_2m_max[i]}°C / mín ${d.temperature_2m_min[i]}°C`;
      if (d.precipitation_probability_max)
        reply += ` · lluvia ~${d.precipitation_probability_max[i]}%`;
      reply += `\n`;
    }
  }
  reply += `\n_Fuente: Open-Meteo_`;
  return pack(reply, [
    {
      t: 'Open-Meteo',
      u: `https://open-meteo.com/en/docs#latitude=${geo.lat}&longitude=${geo.lon}`,
    },
  ]);
}

// ——— Divisas (Frankfurter) ———
async function currency(amount, from, to) {
  from = from.toUpperCase();
  to = to.toUpperCase();
  const url = `https://api.frankfurter.app/latest?amount=${amount}&from=${from}&to=${to}`;
  const data = await fetchJson(url);
  if (!data || !data.rates || data.rates[to] == null) return null;
  return pack(
    `💱 **Cambio**\n\n**${amount} ${from}** = **${data.rates[to]} ${to}**\nFecha: ${data.date}\n\n_Frankfurter / BCE_`,
    [{ t: 'Frankfurter', u: 'https://www.frankfurter.app/' }]
  );
}

// ——— Cripto (CoinGecko) ———
async function cryptoPrice(idOrSymbol) {
  const q = norm(idOrSymbol).replace(/\s+/g, '-');
  const map = {
    btc: 'bitcoin',
    bitcoin: 'bitcoin',
    eth: 'ethereum',
    ethereum: 'ethereum',
    sol: 'solana',
    solana: 'solana',
    doge: 'dogecoin',
    xrp: 'ripple',
  };
  const id = map[q] || q;
  const url =
    'https://api.coingecko.com/api/v3/simple/price?ids=' +
    encodeURIComponent(id) +
    '&vs_currencies=usd,eur';
  const data = await fetchJson(url);
  if (!data || !data[id]) return null;
  const p = data[id];
  return pack(
    `🪙 **${id}**\n\n• USD: **$${p.usd}**\n• EUR: **€${p.eur}**\n\n_CoinGecko_`,
    [{ t: 'CoinGecko', u: 'https://www.coingecko.com/' }]
  );
}

// ——— País (REST Countries) ———
async function countryInfo(name) {
  const url =
    'https://restcountries.com/v3.1/name/' +
    encodeURIComponent(name) +
    '?fields=name,capital,region,population,flags,currencies,languages';
  const data = await fetchJson(url);
  if (!Array.isArray(data) || !data[0]) return null;
  const c = data[0];
  const capital = (c.capital && c.capital[0]) || '—';
  const curr = c.currencies ? Object.keys(c.currencies).join(', ') : '—';
  const lang = c.languages ? Object.values(c.languages).join(', ') : '—';
  return pack(
    `🌍 **${c.name.common}**\n\n• Capital: ${capital}\n• Región: ${c.region || '—'}\n• Población: ${
      c.population ? c.population.toLocaleString('es') : '—'
    }\n• Moneda: ${curr}\n• Idiomas: ${lang}`,
    c.flags && c.flags.png ? [{ t: 'Bandera', u: c.flags.png }] : []
  );
}

// ——— Diccionario EN (Free Dictionary) ———
async function defineEn(word) {
  const url = 'https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(word);
  const data = await fetchJson(url);
  if (!Array.isArray(data) || !data[0]) return null;
  const e = data[0];
  const meanings = (e.meanings || []).slice(0, 2);
  let reply = `📖 **${e.word}**`;
  if (e.phonetic) reply += ` · ${e.phonetic}`;
  reply += `\n\n`;
  meanings.forEach((m) => {
    reply += `*${m.partOfSpeech || ''}*\n`;
    (m.definitions || []).slice(0, 2).forEach((d, i) => {
      reply += `${i + 1}. ${d.definition}\n`;
      if (d.example) reply += `   _Ej: ${d.example}_\n`;
    });
    reply += `\n`;
  });
  reply += `_Free Dictionary API_`;
  return pack(reply, [{ t: 'Dictionary API', u: url }]);
}

// ——— Traducción (LibreTranslate instancia pública) ———
async function translate(text, source, target) {
  source = source || 'auto';
  target = target || 'es';
  const endpoints = [
    'https://libretranslate.com/translate',
    'https://translate.argosopentech.com/translate',
  ];
  for (const endpoint of endpoints) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 12000);
      const r = await fetch(endpoint, {
        method: 'POST',
        signal: ctrl.signal,
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ q: text, source, target, format: 'text' }),
      });
      clearTimeout(timer);
      if (!r.ok) continue;
      const data = await r.json();
      if (data && data.translatedText) {
        return pack(
          `🌐 **Traducción** (${source} → ${target})\n\n` +
            `**Original:** ${text}\n\n**Resultado:** ${data.translatedText}\n\n_LibreTranslate_`,
          [{ t: 'LibreTranslate', u: 'https://libretranslate.com' }]
        );
      }
    } catch {
      /* probar siguiente */
    }
  }
  // Fallback MyMemory (GET, sin key)
  const mm =
    'https://api.mymemory.translated.net/get?q=' +
    encodeURIComponent(text.slice(0, 400)) +
    '&langpair=' +
    encodeURIComponent((source === 'auto' ? 'en' : source) + '|' + target);
  const data = await fetchJson(mm);
  const out = data && data.responseData && data.responseData.translatedText;
  if (out && !/MYMEMORY WARNING/i.test(out)) {
    return pack(
      `🌐 **Traducción** → ${target}\n\n**Original:** ${text}\n\n**Resultado:** ${out}\n\n_MyMemory_`,
      [{ t: 'MyMemory', u: 'https://mymemory.translated.net/' }]
    );
  }
  return null;
}

// ——— Libros (Open Library) ———
async function searchBook(q) {
  const url =
    'https://openlibrary.org/search.json?q=' + encodeURIComponent(q) + '&limit=5';
  const data = await fetchJson(url);
  if (!data || !data.docs || !data.docs.length) return null;
  const lines = data.docs.slice(0, 5).map((d, i) => {
    const title = d.title || 'Sin título';
    const author = (d.author_name && d.author_name[0]) || '—';
    const year = d.first_publish_year || '';
    return `${i + 1}. **${title}** — ${author} ${year ? '(' + year + ')' : ''}`;
  });
  const links = data.docs.slice(0, 5).map((d) => ({
    t: d.title || 'Libro',
    u: d.key ? 'https://openlibrary.org' + d.key : 'https://openlibrary.org',
  }));
  return pack(
    `📚 **Open Library**\n\n${lines.join('\n')}\n\n_Open Library_`,
    links
  );
}

// ——— Música (iTunes Search) ———
async function itunesSearch(term) {
  const url =
    'https://itunes.apple.com/search?term=' +
    encodeURIComponent(term) +
    '&media=music&limit=5';
  const data = await fetchJson(url);
  if (!data || !data.results || !data.results.length) return null;
  const lines = data.results.map((r, i) => {
    return `${i + 1}. **${r.trackName || r.collectionName}** — ${r.artistName || ''}`;
  });
  const links = data.results
    .filter((r) => r.trackViewUrl)
    .map((r) => ({
      t: r.trackName || r.collectionName,
      u: r.trackViewUrl,
    }));
  return pack(`🎵 **iTunes / Apple Music (catálogo)**\n\n${lines.join('\n')}`, links);
}

// ——— Festivos (Nager.Date) ———
async function holidays(countryCode, year) {
  year = year || new Date().getFullYear();
  const url = `https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode.toUpperCase()}`;
  const data = await fetchJson(url);
  if (!Array.isArray(data) || !data.length) return null;
  const lines = data.slice(0, 15).map((h) => `• **${h.date}** — ${h.localName || h.name}`);
  return pack(
    `📅 **Festivos ${year} (${countryCode.toUpperCase()})**\n\n${lines.join('\n')}\n\n_Nager.Date_`,
    [{ t: 'Nager.Date', u: 'https://date.nager.at/' }]
  );
}

// ——— IP / geo simple (ipapi.co sin key, límites) ———
async function ipLookup(ip) {
  const url = ip
    ? `https://ipapi.co/${encodeURIComponent(ip)}/json/`
    : 'https://ipapi.co/json/';
  const data = await fetchJson(url);
  if (!data || data.error) return null;
  return pack(
    `📍 **IP / ubicación aproximada**\n\n` +
      `• IP: ${data.ip || '—'}\n` +
      `• Ciudad: ${data.city || '—'}\n` +
      `• Región: ${data.region || '—'}\n` +
      `• País: ${data.country_name || data.country || '—'}\n` +
      `• Zona horaria: ${data.timezone || '—'}`,
    [{ t: 'ipapi.co', u: 'https://ipapi.co/' }]
  );
}

const CURRENCY_CODES =
  'usd|eur|mxn|gtq|hnl|nio|crc|pab|cop|pen|clp|ars|brl|gbp|jpy|cad|chf|cny';

/**
 * Router de intenciones → herramienta o null
 */
async function tryTools(pregunta) {
  const raw = String(pregunta || '').trim();
  const n = norm(raw);
  if (!n) return null;

  // TRADUCIR: "traduce hello al español", "traducir good morning a español"
  if (/\b(traduce|traducir|translate|traduccion)\b/.test(n)) {
    let target = 'es';
    let source = 'auto';
    if (/\bal ingles\b|\ba ingles\b|\bto english\b|\ben ingles\b/.test(n)) target = 'en';
    if (/\bal espanol\b|\ba espanol\b|\ben espanol\b|\bto spanish\b/.test(n)) target = 'es';
    if (/\bal frances\b|\ba frances\b/.test(n)) target = 'fr';
    if (/\bal aleman\b|\ba aleman\b/.test(n)) target = 'de';
    if (/\bal portugues\b|\ba portugues\b/.test(n)) target = 'pt';
    // texto a traducir
    let text = raw
      .replace(/^(traduce|traducir|translate|traducción|traduccion)\s+/i, '')
      .replace(/\s+(al|a|to|en)\s+(inglés|ingles|español|espanol|spanish|english|francés|frances|alemán|aleman|portugués|portugues)\s*$/i, '')
      .trim();
    // comillas
    const qm = raw.match(/["«»“”']([^"«»“”']+)["«»“”']/);
    if (qm) text = qm[1];
    if (!text || text.length < 1) text = 'hello';
    const r = await translate(text, source, target);
    if (r) return r;
  }

  // DEFINIR palabra EN
  if (/\b(define|definicion|definition|que significa la palabra|significado de)\b/.test(n)) {
    const m = n.match(
      /(?:define|definicion|definition|significado de|que significa(?: la palabra)?)\s+([a-z0-9\-']+)/i
    );
    const word = m ? m[1] : n.split(/\s+/).pop();
    const r = await defineEn(word);
    if (r) return r;
  }

  // CLIMA
  if (/\b(clima|temperatura|tiempo|weather|pronostico)\b/.test(n)) {
    let place = 'San Salvador';
    const m = n.match(
      /(?:clima|temperatura|tiempo|pronostico|weather)\s+(?:en|de|para)?\s*(.+)$/
    );
    if (m && m[1]) {
      place = m[1].replace(/\b(hoy|ahora|actual|por favor)\b/g, '').trim();
    }
    if (/\bel salvador\b|\bsalvador\b/.test(n)) place = 'San Salvador';
    const w = await weatherFor(place || 'San Salvador');
    if (w) return w;
  }

  // DIVISA
  const cm = n.match(
    new RegExp(
      `(\\d+(?:[.,]\\d+)?)\\s*(${CURRENCY_CODES})\\s*(?:a|en|to)\\s*(${CURRENCY_CODES})`
    )
  );
  if (cm) {
    const amount = parseFloat(cm[1].replace(',', '.'));
    const r = await currency(amount, cm[2], cm[3]);
    if (r) return r;
  }
  if (/\b(cambio|divisa|tipo de cambio)\b/.test(n)) {
    const m2 = n.match(new RegExp(`(${CURRENCY_CODES})\\s*(?:a|en|to)\\s*(${CURRENCY_CODES})`));
    if (m2) {
      const r = await currency(1, m2[1], m2[2]);
      if (r) return r;
    }
  }

  // CRIPTO
  if (/\b(bitcoin|btc|ethereum|eth|crypto|cripto|precio de)\b/.test(n)) {
    let id = 'bitcoin';
    if (/\beth/.test(n)) id = 'ethereum';
    if (/\bsolana|\bsol\b/.test(n)) id = 'solana';
    if (/\bdoge/.test(n)) id = 'dogecoin';
    const r = await cryptoPrice(id);
    if (r) return r;
  }

  // PAÍS
  const pm = n.match(
    /(?:capital de|datos de|info de|informacion de|pais)\s+(.+)/
  );
  if (pm) {
    const r = await countryInfo(pm[1].trim());
    if (r) return r;
  }

  // LIBROS
  if (/\b(libro|libros|autor|open library|busca el libro)\b/.test(n)) {
    const q = raw
      .replace(/^(busca(r)?\s+(el\s+)?)?(libro|libros)\s*/i, '')
      .replace(/\b(de|del|sobre)\b/gi, ' ')
      .trim() || raw;
    const r = await searchBook(q);
    if (r) return r;
  }

  // MÚSICA catálogo iTunes (no streaming Vimana)
  if (/\b(cancion|canción|artista|album|álbum|itunes|apple music)\b/.test(n) && !/\b(vimana|ananda|radio)\b/.test(n)) {
    const term = raw.replace(/^(busca(r)?\s+)?(la\s+)?(cancion|canción|artista)\s*/i, '').trim();
    const r = await itunesSearch(term || raw);
    if (r) return r;
  }

  // FESTIVOS
  if (/\b(festivo|festivos|feriado|feriados|holiday)\b/.test(n)) {
    let cc = 'SV';
    if (/\bmexico\b|\bmex/.test(n)) cc = 'MX';
    if (/\bespana\b|\bspain\b/.test(n)) cc = 'ES';
    if (/\bguatemala\b/.test(n)) cc = 'GT';
    if (/\bhonduras\b/.test(n)) cc = 'HN';
    if (/\bcosta rica\b/.test(n)) cc = 'CR';
    if (/\busa\b|\bestados unidos\b/.test(n)) cc = 'US';
    if (/\bel salvador\b|\bsalvador\b/.test(n)) cc = 'SV';
    const r = await holidays(cc);
    if (r) return r;
  }

  // IP
  if (/\b(mi ip|que ip|ip publica|geolocaliz)/.test(n)) {
    const r = await ipLookup();
    if (r) return r;
  }

  return null;
}

module.exports = {
  tryTools,
  weatherFor,
  currency,
  countryInfo,
  translate,
  defineEn,
  searchBook,
  cryptoPrice,
  holidays,
};
