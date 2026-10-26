/**
 * Libros de lectura de la Gita (español) en public/gita2/
 * - LECTURA_ESPAÑOL_Bhagavad_Gita_Tal.txt  (Tal como es / estilo Prabhupada)
 * - LECTURA_ESPAÑOL_Esencia_Bhagavad_Gita.txt (extraído del PDF)
 * - Esencia_Bhagavad_Gita.pdf
 *
 * No reemplaza gita_db.json ni la API: aporta extractos largos y lectura completa.
 */
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'public', 'gita2');
const FILES = {
  tal: {
    id: 'tal_como_es',
    titulo: 'Bhagavad-gītā Tal Como Es (lectura en español)',
    file: 'LECTURA_ESPAÑOL_Bhagavad_Gita_Tal.txt',
    url: '/gita2/LECTURA_ESPA%C3%91OL_Bhagavad_Gita_Tal.txt',
  },
  esencia: {
    id: 'esencia',
    titulo: 'La esencia de la Bhagavad-gītā (español)',
    file: 'LECTURA_ESPAÑOL_Esencia_Bhagavad_Gita.txt',
    url: '/gita2/LECTURA_ESPA%C3%91OL_Esencia_Bhagavad_Gita.txt',
    pdf: '/gita2/Esencia_Bhagavad_Gita.pdf',
  },
};

const cache = {};

function loadBook(key) {
  if (cache[key]) return cache[key];
  const meta = FILES[key];
  if (!meta) return '';
  const p = path.join(DIR, meta.file);
  try {
    cache[key] = fs.readFileSync(p, 'utf8');
  } catch {
    cache[key] = '';
  }
  return cache[key];
}

function norm(t) {
  return String(t || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** Busca un fragmento temático en un libro (ventana alrededor de la palabra) */
function extractTheme(text, query, maxLen = 900) {
  if (!text) return null;
  const n = norm(query);
  const words = n.split(/\s+/).filter((w) => w.length > 3);
  if (!words.length) return null;
  const lower = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  let best = -1;
  for (const w of words) {
    const i = lower.indexOf(w);
    if (i >= 0 && (best < 0 || i < best)) best = i;
  }
  if (best < 0) return null;
  const start = Math.max(0, best - 120);
  let end = Math.min(text.length, best + maxLen);
  // cortar en fin de frase si se puede
  const slice = text.slice(start, end);
  const cut = slice.lastIndexOf('.');
  const body = (cut > 200 ? slice.slice(0, cut + 1) : slice).trim();
  return (start > 0 ? '…' : '') + body + (end < text.length ? '…' : '');
}

/** Índice simple de capítulos por encabezado CAPITULO / Capítulo */
function chapterSnippet(text, chapterNum) {
  if (!text || !chapterNum) return null;
  const names = {
    1: ['capitulo uno', 'capitulo 1', 'capítulo uno', 'capítulo 1', 'campo de batalla'],
    2: ['capitulo dos', 'capitulo 2', 'capítulo dos', 'resumen del contenido'],
    3: ['capitulo tres', 'capitulo 3', 'karma-yoga'],
    4: ['capitulo cuatro', 'capitulo 4', 'conocimiento trascendental'],
    5: ['capitulo cinco', 'capitulo 5'],
    6: ['capitulo seis', 'capitulo 6'],
    7: ['capitulo siete', 'capitulo 7'],
    8: ['capitulo ocho', 'capitulo 8'],
    9: ['capitulo nueve', 'capitulo 9'],
    10: ['capitulo diez', 'capitulo 10', 'capítulo décimo'],
    11: ['capitulo once', 'capitulo 11'],
    12: ['capitulo doce', 'capitulo 12'],
    13: ['capitulo trece', 'capitulo 13'],
    14: ['capitulo catorce', 'capitulo 14'],
    15: ['capitulo quince', 'capitulo 15'],
    16: ['capitulo dieciseis', 'capitulo 16', 'dieciséis'],
    17: ['capitulo diecisiete', 'capitulo 17'],
    18: ['capitulo dieciocho', 'capitulo 18'],
  };
  const keys = names[chapterNum] || ['capitulo ' + chapterNum];
  const lower = norm(text);
  let pos = -1;
  for (const k of keys) {
    const i = lower.indexOf(norm(k));
    if (i >= 0) {
      pos = i;
      break;
    }
  }
  if (pos < 0) return null;
  return text.slice(pos, pos + 1100).trim() + '…';
}

/**
 * Respuesta de lectura / extracto para Urvashi
 */
function procesarLibrosGita(mensaje) {
  const t = norm(mensaje);
  if (!t) return null;

  const quiereLectura =
    /\b(leer gita|lectura del gita|libro del gita|tal como es|bhagavad gita completo|descargar gita|esencia de la gita|esencia del gita)\b/.test(
      t
    ) ||
    /\b(leer capitulo|leer capítulo)\b/.test(t);

  const mCap = t.match(/(?:leer\s+)?(?:cap(?:itulo)?|capítulo)\s*(\d{1,2})/);
  const cap = mCap ? parseInt(mCap[1], 10) : null;

  if (!quiereLectura && !cap) {
    // extracto temático si menciona karma, moksha, etc. junto a "libro" o "leer"
    if (!/\b(libro|leer|extracto|pasaje)\b/.test(t)) return null;
  }

  const tal = loadBook('tal');
  const esencia = loadBook('esencia');

  if (cap && cap >= 1 && cap <= 18) {
    const snip = chapterSnippet(tal, cap) || chapterSnippet(esencia, cap);
    return {
      reply:
        `📚 **Lectura — Capítulo ${cap}**\n\n` +
        (snip || 'No localicé ese capítulo en el texto OCR; abre el libro completo.') +
        `\n\n---\nLibros completos en el servidor:`,
      links: [
        { t: 'Bhagavad-gītā Tal Como Es (TXT)', u: FILES.tal.url },
        { t: 'Esencia de la Gita (TXT)', u: FILES.esencia.url },
        { t: 'Esencia de la Gita (PDF)', u: FILES.esencia.pdf },
      ],
      options: ['Gita 2.47', 'leer capítulo 2', 'Urvashi', 'Apsara Vimana'],
    };
  }

  if (quiereLectura || /\b(libro|extracto|pasaje)\b/.test(t)) {
    const themeQ = t
      .replace(/\b(leer|libro|extracto|pasaje|gita|bhagavad|completo|tal como es)\b/g, ' ')
      .trim();
    const ex =
      (themeQ.length > 3 && extractTheme(tal, themeQ)) ||
      extractTheme(tal, 'Krishna') ||
      extractTheme(esencia, themeQ || 'devoción');

    return {
      reply:
        `📚 **Biblioteca Gita (español)**\n\n` +
        `Disponible para lectura en el sitio:\n` +
        `• **${FILES.tal.titulo}**\n` +
        `• **${FILES.esencia.titulo}** (+ PDF)\n\n` +
        (ex ? `**Extracto:**\n\n${ex}\n\n` : '') +
        `Di: \`leer capítulo 2\` o \`gita 2.47\` (verso con Urvashi).`,
      links: [
        { t: 'Abrir Tal Como Es (TXT)', u: FILES.tal.url },
        { t: 'Abrir Esencia (TXT)', u: FILES.esencia.url },
        { t: 'Descargar Esencia (PDF)', u: FILES.esencia.pdf },
      ],
      options: ['leer capítulo 1', 'leer capítulo 2', 'Gita 2.47', 'Gita 18.66'],
    };
  }

  return null;
}

module.exports = { procesarLibrosGita, loadBook, FILES };
