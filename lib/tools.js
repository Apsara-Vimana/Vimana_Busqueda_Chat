/**
 * Herramientas gratis (sin API key) — antes de SearXNG
 */
async function fetchJson(url, timeoutMs = 12000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: 'application/json', 'User-Agent': 'ApsaraVimana/8.4' },
    });
    if (!r.ok) return null;
    return await r.json();
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
    .replace(/\s+/g, ' ')
    .trim();
}

/** Geocoding Open-Meteo */
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
  const code = c.weather_code;
  const desc = weatherCodeEs(code);
  const where = [geo.name, geo.admin, geo.country].filter(Boolean).join(', ');
  let reply =
    `🌤️ **Clima actual — ${where}**\n\n` +
    `• Temperatura: **${c.temperature_2m}°C**\n` +
    `• Condición: ${desc}\n` +
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
  reply += `\n_Fuente: Open-Meteo (datos meteorológicos libres)_`;
  return {
    reply,
    links: [
      {
        t: 'Open-Meteo',
        u: `https://open-meteo.com/en/docs#latitude=${geo.lat}&longitude=${geo.lon}`,
      },
    ],
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
    61: 'Lluvia ligera',
    63: 'Lluvia moderada',
    65: 'Lluvia intensa',
    71: 'Nieve ligera',
    80: 'Chubascos',
    95: 'Tormenta',
  };
  return map[code] || `Código ${code}`;
}

async function currency(amount, from, to) {
  from = (from || 'USD').toUpperCase();
  to = (to || 'EUR').toUpperCase();
  const url = `https://api.frankfurter.app/latest?amount=${amount}&from=${from}&to=${to}`;
  const data = await fetchJson(url);
  if (!data || !data.rates || data.rates[to] == null) return null;
  return {
    reply:
      `💱 **Cambio de divisa**\n\n` +
      `**${amount} ${from}** = **${data.rates[to]} ${to}**\n` +
      `Fecha: ${data.date}\n\n_Fuente: Frankfurter (BCE)_`,
    links: [{ t: 'Frankfurter', u: 'https://www.frankfurter.app/' }],
  };
}

async function countryInfo(name) {
  const url = 'https://restcountries.com/v3.1/name/' + encodeURIComponent(name) + '?fields=name,capital,region,population,flags,currencies,languages';
  const data = await fetchJson(url);
  if (!Array.isArray(data) || !data[0]) return null;
  const c = data[0];
  const capital = (c.capital && c.capital[0]) || '—';
  const curr = c.currencies ? Object.keys(c.currencies).join(', ') : '—';
  const lang = c.languages ? Object.values(c.languages).join(', ') : '—';
  return {
    reply:
      `🌍 **${c.name.common}**\n\n` +
      `• Capital: ${capital}\n` +
      `• Región: ${c.region || '—'}\n` +
      `• Población: ${c.population ? c.population.toLocaleString('es') : '—'}\n` +
      `• Moneda: ${curr}\n` +
      `• Idiomas: ${lang}`,
    links: c.flags && c.flags.png ? [{ t: 'Bandera', u: c.flags.png }] : [],
  };
}

/**
 * Intenta resolver con herramienta. null = seguir al buscador.
 */
async function tryTools(pregunta) {
  const n = norm(pregunta);

  // Clima
  if (
    /\b(clima|temperatura|tiempo|weather|pronostico)\b/.test(n) ||
    /\b(hace calor|hace frio|llueve)\b/.test(n)
  ) {
    let place = 'San Salvador';
    const m =
      n.match(
        /(?:clima|temperatura|tiempo|pronostico|weather)\s+(?:en|de|para)?\s*(.+)$/
      ) || n.match(/(?:en|de)\s+([a-záéíóúñ\s]+)$/);
    if (m && m[1]) {
      place = m[1]
        .replace(/\b(hoy|ahora|actual|por favor)\b/g, '')
        .trim();
    }
    if (/\bel salvador\b/.test(n) || /\bsalvador\b/.test(n)) place = 'San Salvador';
    if (/\bcentroamerica\b|\bcentro america\b/.test(n)) place = 'San Salvador';
    const w = await weatherFor(place || 'San Salvador');
    if (w) return w;
  }

  // Divisa: "10 usd a eur" / "cambiar 100 dolares a euros"
  const cm = n.match(
    /(\d+(?:[.,]\d+)?)\s*(usd|eur|mxn|gtq|hnl|nio|crc|pab|cop|pen|clp|ars|brl|gbp)\s*(?:a|en|to)\s*(usd|eur|mxn|gtq|hnl|nio|crc|pab|cop|pen|clp|ars|brl|gbp)/
  );
  if (cm) {
    const amount = parseFloat(cm[1].replace(',', '.'));
    const r = await currency(amount, cm[2], cm[3]);
    if (r) return r;
  }

  // País: "capital de japon" / "datos de costa rica"
  const pm = n.match(
    /(?:capital de|datos de|info de|informacion de|pais)\s+(.+)/
  );
  if (pm) {
    const r = await countryInfo(pm[1].trim());
    if (r) return r;
  }

  return null;
}

module.exports = { tryTools, weatherFor, currency, countryInfo };
