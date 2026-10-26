/**
 * Herramientas gratuitas para Apsara (sin APIs de pago)
 * - Calculadora: en engine (mathEval)
 * - Clima: wttr.in (sin registro)
 * - Hora: worldtimeapi.org
 * - Localizador: ip-api.com (IP) / mensaje para geolocalización del navegador
 * - Notas: se manejan en el cliente (localStorage) vía página /herramientas.html
 */

const TIMEOUT = 8000;

async function httpText(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'ApsaraVimana/7.0', Accept: 'application/json,text/plain' },
    });
    if (!r.ok) return null;
    return await r.text();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function httpJson(url) {
  const raw = await httpText(url);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
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

/** Clima vía wttr.in (texto + JSON ligero) */
async function clima(lugar) {
  const q = (lugar || 'San Salvador').trim() || 'San Salvador';
  const enc = encodeURIComponent(q);
  // formato compacto en español
  const url = `https://wttr.in/${enc}?format=j1&lang=es`;
  const data = await httpJson(url);
  if (!data || !data.current_condition || !data.current_condition[0]) {
    const plain = await httpText(`https://wttr.in/${enc}?format=%l:+%c+%t+(sensacion+%f)+Humedad+%h+Viento+%w&lang=es`);
    if (plain) {
      return {
        reply: `🌤 **Clima — ${q}**\n\n${plain.trim()}\n\nFuente: wttr.in (gratuito)`,
        links: [{ t: `Ver más en wttr.in`, u: `https://wttr.in/${enc}` }],
      };
    }
    return null;
  }
  const c = data.current_condition[0];
  const area = (data.nearest_area && data.nearest_area[0]) || {};
  const name = [area.areaName && area.areaName[0] && area.areaName[0].value, area.country && area.country[0] && area.country[0].value]
    .filter(Boolean)
    .join(', ') || q;
  const desc = (c.lang_es && c.lang_es[0] && c.lang_es[0].value) || (c.weatherDesc && c.weatherDesc[0] && c.weatherDesc[0].value) || '';
  const reply =
    `🌤 **Clima — ${name}**\n\n` +
    `• Condición: ${desc}\n` +
    `• Temperatura: ${c.temp_C} °C (sensación ${c.FeelsLikeC} °C)\n` +
    `• Humedad: ${c.humidity}%\n` +
    `• Viento: ${c.windspeedKmph} km/h\n` +
    `• Precipitación: ${c.precipMM} mm\n\n` +
    `Fuente gratuita: wttr.in`;
  return {
    reply,
    links: [{ t: `Mapa del clima`, u: `https://wttr.in/${enc}` }],
  };
}

/** Hora mundial */
async function horaMundial(zonaOCiudad) {
  let zone = (zonaOCiudad || '').trim();
  const n = norm(zone);
  // aliases comunes
  const map = {
    'san salvador': 'America/El_Salvador',
    salvador: 'America/El_Salvador',
    'el salvador': 'America/El_Salvador',
    mexico: 'America/Mexico_City',
    'ciudad de mexico': 'America/Mexico_City',
    madrid: 'Europe/Madrid',
    espana: 'Europe/Madrid',
    'buenos aires': 'America/Argentina/Buenos_Aires',
    argentina: 'America/Argentina/Buenos_Aires',
    lima: 'America/Lima',
    bogota: 'America/Bogota',
    colombia: 'America/Bogota',
    santiago: 'America/Santiago',
    chile: 'America/Santiago',
    tokyo: 'Asia/Tokyo',
    tokio: 'Asia/Tokyo',
    'nueva york': 'America/New_York',
    london: 'Europe/London',
    londres: 'Europe/London',
    utc: 'Etc/UTC',
  };
  if (map[n]) zone = map[n];
  if (!zone) zone = 'America/El_Salvador';
  // si parece ciudad sin /, intentar America/Nombre
  if (!zone.includes('/')) {
    zone = map[norm(zone)] || `America/${zone.replace(/\s+/g, '_')}`;
  }
  const url = `https://worldtimeapi.org/api/timezone/${encodeURIComponent(zone)}`;
  let data = await httpJson(url);
  if (!data || !data.datetime) {
    // listado fallback: hora local del servidor UTC
    const now = new Date();
    return {
      reply:
        `🕒 **Hora**\n\nNo pude resolver la zona «${zonaOCiudad || zone}».\n` +
        `Hora UTC del servidor: **${now.toISOString()}**\n\n` +
        `Prueba: «hora en San Salvador», «hora Madrid», «hora Tokyo».\n` +
        `O abre herramientas: /herramientas.html`,
      links: [{ t: 'Herramientas', u: '/herramientas.html' }],
    };
  }
  const dt = new Date(data.datetime);
  const legible = dt.toLocaleString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: data.timezone || undefined,
  });
  return {
    reply:
      `🕒 **Hora — ${data.timezone}**\n\n` +
      `• ${legible}\n` +
      `• Desfase UTC: ${data.utc_offset || '—'}\n` +
      `• Día del año: ${data.day_of_year}\n\n` +
      `Fuente: worldtimeapi.org (gratuito)`,
    links: [{ t: 'Más zonas horarias', u: 'https://worldtimeapi.org/api/timezone' }],
  };
}

/** Info por IP (aproximada) */
async function localizadorPorIp() {
  // ip-api.com free, sin key, HTTP en free tier — en Render HTTPS puede fallar; usar ipapi.co
  const data = await httpJson('https://ipapi.co/json/');
  if (!data || data.error) {
    return {
      reply:
        `📍 **Localizador**\n\nNo pude obtener la ubicación por IP en este momento.\n\n` +
        `Desde el navegador puedes permitir geolocalización en **Herramientas**.`,
      links: [{ t: 'Abrir herramientas', u: '/herramientas.html' }],
    };
  }
  return {
    reply:
      `📍 **Ubicación aproximada (por IP)**\n\n` +
      `• Ciudad: ${data.city || '—'}\n` +
      `• Región: ${data.region || data.region_code || '—'}\n` +
      `• País: ${data.country_name || data.country || '—'}\n` +
      `• Coordenadas: ${data.latitude}, ${data.longitude}\n` +
      `• Zona: ${data.timezone || '—'}\n\n` +
      `Nota: es una estimación por IP, no GPS exacto.`,
    links: [
      {
        t: 'Ver en mapa',
        u: `https://www.openstreetmap.org/?mlat=${data.latitude}&mlon=${data.longitude}#map=10/${data.latitude}/${data.longitude}`,
      },
      { t: 'Herramientas (GPS del móvil)', u: '/herramientas.html' },
    ],
  };
}

/**
 * Detecta si el mensaje pide una herramienta y la ejecuta.
 * @returns {Promise<{reply, links}|null>}
 */
async function procesarHerramienta(q) {
  const n = norm(q);
  if (!n) return null;

  // menú herramientas
  if (
    /^(herramientas?|tools?|utilidades)$/.test(n) ||
    /\b(lista de herramientas|que herramientas|abrir herramientas)\b/.test(n)
  ) {
    return {
      reply:
        `🛠 **Herramientas gratuitas de Apsara**\n\n` +
        `• **Calculadora** — escribe: \`cuanto es 25*4\` o \`calcula 12+8\`\n` +
        `• **Clima** — \`clima San Salvador\` / \`tiempo en Madrid\`\n` +
        `• **Hora mundial** — \`hora en Tokyo\` / \`qué hora es en Lima\`\n` +
        `• **Localizador** — \`mi ubicacion\` / \`localizador\`\n` +
        `• **Bloc de notas** — página con guardado local y descarga\n\n` +
        `También puedes abrir el panel completo:`,
      links: [{ t: 'Abrir panel de herramientas', u: '/herramientas.html' }],
    };
  }

  // clima
  if (/\b(clima|tiempo|temperatura|weather)\b/.test(n)) {
    let lugar = q
      .replace(/^(como esta|cómo está|dime|cual es|cuál es)\s+/i, '')
      .replace(/\b(el|la|del|de|en|para)?\s*(clima|tiempo|temperatura|weather)\s*(de|del|en|para)?\s*/i, '')
      .trim();
    if (!lugar || lugar.length < 2) lugar = 'San Salvador';
    return await clima(lugar);
  }

  // hora
  if (/\b(hora mundial|que hora|qué hora|hora en|hora de|world time)\b/.test(n) || /^hora\b/.test(n)) {
    let zona = q
      .replace(/^(dime|cual es|cuál es|que|qué)\s+/i, '')
      .replace(/\b(la\s+)?hora\s*(mundial|actual)?\s*(en|de|para)?\s*/i, '')
      .trim();
    return await horaMundial(zona);
  }

  // localizador
  if (/\b(localizador|mi ubicacion|mi ubicación|donde estoy|dónde estoy|geolocal|ubicacion por ip)\b/.test(n)) {
    return await localizadorPorIp();
  }

  // notas → enlace a panel
  if (/\b(bloc de notas|bloc notas|notas|notepad|anotaciones)\b/.test(n) && n.length < 40) {
    return {
      reply:
        `📝 **Bloc de notas**\n\n` +
        `Se guarda en tu navegador (localStorage). Puedes escribir, descargar en .txt y borrar al descargar.\n\n` +
        `Ábrelo aquí:`,
      links: [{ t: 'Abrir bloc de notas', u: '/herramientas.html#notas' }],
    };
  }

  // calculadora explícita menú
  if (/^(calculadora|calculator)$/.test(n)) {
    return {
      reply:
        `🔢 **Calculadora**\n\nEscribe una operación, por ejemplo:\n` +
        `• \`cuanto es 15*8\`\n` +
        `• \`calcula (20+5)/5\`\n` +
        `• \`sqrt(144)\`\n\n` +
        `También en el panel:`,
      links: [{ t: 'Panel de herramientas', u: '/herramientas.html#calc' }],
    };
  }

  return null;
}

module.exports = { procesarHerramienta, clima, horaMundial, localizadorPorIp };
