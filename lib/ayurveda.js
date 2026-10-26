/**
 * Base dinámica Ayurveda + hierbas (Dravyaguna)
 * No confundir Ayurveda con “los Vedas”.
 */
const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', 'data', 'ayurveda_hierbas.json');
let cache = null;

function load() {
  if (cache) return cache;
  try {
    cache = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  } catch {
    cache = { hierbas: [], total: 0, aviso: '' };
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

const QUE_ES_AYURVEDA = `**¿Qué es el Ayurveda?**

El Ayurveda es el sistema de medicina tradicional de la India, originado hace más de 5,000 años. Su nombre en sánscrito significa literalmente **"la ciencia de la vida"**.

Como disciplina ancestral fundamentada en las autoridades védicas, se concibe como una ciencia exacta y estructurada, no como un saber empírico o improvisado. Ofrece un enfoque holístico que busca el equilibrio integral del cuerpo, la mente y el espíritu, priorizando la prevención de enfermedades y la promoción de la salud a través de hábitos diarios, dieta, yoga y meditación.

De acuerdo con los textos y preceptos védicos, la salud óptima depende del equilibrio de tres energías vitales fundamentales o **doshas**:

• **Vata**: aire y éter.
• **Pitta**: fuego y agua.
• **Kapha**: tierra y agua.

La enfermedad se comprende como el resultado de un desequilibrio en estas fuerzas. Por ello, los tratamientos son rigurosamente personalizados y emplean remedios herbarios, terapias corporales, ajustes en la alimentación y técnicas de purificación orientadas a restaurar la armonía natural del organismo.

---
¿Deseas conocer la **base de plantas** y sus usos?`;

function formatHerb(h) {
  const lines = [
    `🌿 **${h.nombre}**`,
    h.comun ? `${h.comun}` : '',
    h.cientifico ? `*${h.cientifico}*${h.familia ? ' · ' + h.familia : ''}` : '',
    '',
    h.resumen || '',
  ];
  const chip = (label, arr) => {
    if (!arr || !arr.length) return null;
    return `• **${label}:** ${arr.join(', ')}`;
  };
  const meta = [
    chip('Rasa (sabor)', h.rasa),
    chip('Guna', h.guna),
    chip('Virya', h.virya),
    chip('Vipaka', h.vipaka),
    chip('Calma doshas', h.calma),
    chip('Agrava doshas', h.agrava),
    chip('Partes', h.partes),
    chip('Indicaciones (trad.)', h.indicaciones),
    chip('Karma / Prabhava', h.karma),
  ].filter(Boolean);
  if (meta.length) {
    lines.push('');
    lines.push(...meta);
  }
  lines.push('');
  lines.push(`_${h.aviso || load().aviso || ''}_`);
  return lines.filter((x, i, a) => !(x === '' && a[i - 1] === '')).join('\n');
}

function findHerb(q) {
  const n = norm(q);
  const { hierbas } = load();
  let best = null;
  let score = 0;
  for (const h of hierbas) {
    const names = [h.nombre, h.comun, h.cientifico, h.id].map(norm);
    let s = 0;
    for (const nm of names) {
      if (!nm) continue;
      if (n === nm) s = Math.max(s, 100);
      else if (n.includes(nm) && nm.length >= 4) s = Math.max(s, 70 + Math.min(nm.length, 20));
      else if (nm.includes(n) && n.length >= 4) s = Math.max(s, 50);
    }
    // "hierba tulsi" / "planta ashwagandha"
    const bare = n.replace(/^(hierba|planta|que es|qué es|info de|informacion de|información de|acerca de)\s+/i, '').trim();
    for (const nm of names) {
      if (bare && nm && (bare === nm || nm.startsWith(bare) || bare.startsWith(nm))) s = Math.max(s, 90);
    }
    if (s > score) {
      score = s;
      best = h;
    }
  }
  if (score < 50) return null;
  return best;
}

function listSample(limit = 12) {
  const { hierbas, total } = load();
  const top = hierbas.slice(0, limit);
  const lines = top.map((h) => `• **${h.nombre}** — ${h.comun || h.cientifico}`);
  return {
    reply:
      `🌿 **Base de hierbas de Ayurveda** (Dravyaguna)\n\n` +
      `${total} registros en el catálogo. Ejemplos:\n\n` +
      lines.join('\n') +
      `\n\nEscribe el **nombre** de una planta (ej. \`Ashwagandha\`, \`Tulsi\`, \`Amla\`) para ver su ficha en el chat.\n` +
      `O di: \`buscar hierba brahmi\`.`,
    options: top.map((h) => h.nombre),
  };
}

/**
 * Intent Ayurveda / hierbas
 */
function procesarAyurveda(q) {
  const n = norm(q);
  if (!n) return null;

  // Qué es Ayurveda (no “los Vedas”)
  if (
    /^(que es|qué es|que significa|qué significa)\s+ayur\s*veda\??$/.test(n) ||
    /^(que es|qué es)\s+el\s+ayur\s*veda\??$/.test(n) ||
    /^ayur\s*veda\??$/.test(n) ||
    /\b(que es ayurveda|qué es ayurveda|que es el ayurveda|definición de ayurveda|definicion de ayurveda)\b/.test(n)
  ) {
    return {
      reply: QUE_ES_AYURVEDA,
      options: ['Base de plantas Ayurveda', 'Ashwagandha', 'Tulsi', 'Amla', 'Triphala'],
    };
  }

  // Lista / base de plantas
  if (
    /\b(base de plantas|plantas ayurvedicas|plantas ayurvédicas|hierbas ayurvedicas|hierbas ayurvédicas|catalogo de hierbas|catálogo de hierbas|dravyaguna|base de hierbas)\b/.test(n) ||
    /^(plantas|hierbas)\s*(de\s*)?ayur\s*veda\??$/.test(n)
  ) {
    return listSample(15);
  }

  // Buscar hierba concreta
  if (/\b(hierba|planta)\b/.test(n) || /\b(tulsi|amla|ashwagandha|giloy|shatavari|brahmi|haritaki|neem|haridra|shunthi|bhringraj|jatamansi)\b/.test(n)) {
    const h = findHerb(q);
    if (h) {
      return {
        reply: formatHerb(h),
        options: ['Base de plantas Ayurveda', 'Qué es Ayurveda'],
      };
    }
  }

  // match solo nombre de planta (consulta corta)
  if (n.length >= 3 && n.length < 48 && !/\b(quien|cómo|como|donde|busca|clima|hora)\b/.test(n)) {
    const h = findHerb(q);
    if (h && (norm(h.nombre) === n || norm(h.comun) === n || n.includes(norm(h.nombre)))) {
      return {
        reply: formatHerb(h),
        options: ['Base de plantas Ayurveda', 'Qué es Ayurveda'],
      };
    }
  }

  return null;
}

module.exports = { procesarAyurveda, findHerb, formatHerb, load, QUE_ES_AYURVEDA };
