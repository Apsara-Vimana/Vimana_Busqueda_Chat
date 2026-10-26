/**
 * Biblioteca interactiva — menús por botones (options) + búsqueda difusa
 */
const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, '..', 'data', 'biblioteca.json');
let cache = null;

function load() {
  if (cache) return cache;
  try {
    cache = JSON.parse(fs.readFileSync(DATA, 'utf8'));
  } catch {
    cache = { libros: [], total: 0 };
  }
  return cache;
}

function norm(t) {
  return String(t || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Distancia simple (Levenshtein acotada) */
function lev(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const m = [];
  for (let i = 0; i <= b.length; i++) m[i] = [i];
  for (let j = 0; j <= a.length; j++) m[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      m[i][j] = b.charAt(i - 1) === a.charAt(j - 1)
        ? m[i - 1][j - 1]
        : Math.min(m[i - 1][j - 1] + 1, m[i][j - 1] + 1, m[i - 1][j] + 1);
    }
  }
  return m[b.length][a.length];
}

function scoreTitle(query, title) {
  const q = norm(query);
  const t = norm(title);
  if (!q || !t) return 0;
  if (t === q) return 100;
  if (t.includes(q)) return 80 + Math.min(q.length, 15);
  if (q.includes(t) && t.length >= 5) return 70;
  // fuzzy: token match
  const qt = q.split(' ').filter((w) => w.length > 2);
  const tt = t.split(' ');
  let hits = 0;
  for (const w of qt) {
    if (tt.some((x) => x === w || x.startsWith(w) || lev(x, w) <= 1)) hits++;
  }
  if (hits && hits === qt.length) return 65;
  if (hits >= 2) return 50 + hits * 5;
  if (q.length >= 5 && lev(q, t.slice(0, q.length + 3)) <= 2) return 55;
  return 0;
}

function menuPrincipal() {
  return {
    reply:
      '📚 **Biblioteca digital Vimana**\n\n' +
      'Libros de **Sathya Sai Baba**, autores varios y otros maestros espirituales.\n\n' +
      '¿Cómo te gustaría explorar hoy?',
    options: [
      '🔍 Buscar por título',
      '✍️ Buscar por autor',
      '🗂️ Ver de la A a la Z',
      '🎙️ Discursos y cartas',
      '🌍 Otros maestros',
    ],
    links: [{ t: 'Página biblioteca HTML', u: '/biblioteca.html' }],
  };
}

function menuAZ() {
  return {
    reply: '🗂️ **Ver de la A a la Z**\n\nSelecciona un rango de letras:',
    options: ['A - E', 'F - J', 'K - O', 'P - T', 'U - Z', '📚 Menú biblioteca'],
  };
}

function listByLetterRange(range) {
  const map = {
    'a - e': ['a', 'b', 'c', 'd', 'e'],
    'a e': ['a', 'b', 'c', 'd', 'e'],
    'f - j': ['f', 'g', 'h', 'i', 'j'],
    'f j': ['f', 'g', 'h', 'i', 'j'],
    'k - o': ['k', 'l', 'm', 'n', 'o'],
    'k o': ['k', 'l', 'm', 'n', 'o'],
    'p - t': ['p', 'q', 'r', 's', 't'],
    'p t': ['p', 'q', 'r', 's', 't'],
    'u - z': ['u', 'v', 'w', 'x', 'y', 'z'],
    'u z': ['u', 'v', 'w', 'x', 'y', 'z'],
  };
  const letters = map[norm(range)] || map[String(range).toLowerCase().trim()];
  if (!letters) return menuAZ();
  const { libros } = load();
  const filtered = libros
    .filter((b) => letters.includes(norm(b.titulo).charAt(0)))
    .sort((a, b) => a.titulo.localeCompare(b.titulo, 'es'));
  if (!filtered.length) {
    return { reply: 'No hay títulos en ese rango.', options: ['🗂️ Ver de la A a la Z', '📚 Menú biblioteca'] };
  }
  const slice = filtered.slice(0, 20);
  const lines = slice.map((b) => `📖 **${b.titulo}**\n   _${b.autor}_`);
  const more = filtered.length > 20 ? `\n\n_…y ${filtered.length - 20} más. Escribe parte del título._` : '';
  return {
    reply: `Títulos **${range}** (${filtered.length}):\n\n${lines.join('\n\n')}${more}\n\nToca un título o escríbelo para abrir el enlace.`,
    options: slice.slice(0, 10).map((b) => b.titulo).concat(['🗂️ Ver de la A a la Z', '📚 Menú biblioteca']),
    links: slice.slice(0, 8).map((b) => ({ t: `📥 ${b.titulo}`, u: b.url })),
  };
}

function menuAutor() {
  return {
    reply: '✍️ **Buscar por autor**\n\n¿Qué rama quieres?',
    options: [
      'Escritos Sai Baba (Vahinis)',
      'Autores varios (Sai)',
      'Sadhguru',
      'Ramana Maharshi',
      'Yogananda',
      'Krishnamurti',
      'Otros maestros',
      '📚 Menú biblioteca',
    ],
  };
}

function byAuthorKeyword(key) {
  const n = norm(key);
  const { libros } = load();
  let list = libros.filter((b) => {
    const a = norm(b.autor);
    const c = norm(b.categoria);
    if (n.includes('vahini') || n.includes('escritos sai')) {
      return a.includes('sathya sai') && (b.tipo === 'vahini' || /vahini/i.test(b.titulo));
    }
    if (n.includes('autores varios')) return b.tipo === 'autor_varios' || c.includes('autores varios');
    if (n.includes('sadhguru')) return a.includes('sadhguru');
    if (n.includes('ramana')) return a.includes('ramana');
    if (n.includes('yogananda')) return a.includes('yogananda');
    if (n.includes('krishnamurti')) return a.includes('krishnamurti');
    if (n.includes('osho')) return a.includes('osho');
    if (n.includes('sivananda')) return a.includes('sivananda');
    if (n.includes('aurobindo')) return a.includes('aurobindo');
    if (n.includes('nisargadatta')) return a.includes('nisargadatta');
    if (n.includes('prabhupada')) return a.includes('prabhupada');
    if (n.includes('amma') || n.includes('amritanandamayi')) return a.includes('amrita') || a.includes('amma');
    return a.includes(n) || c.includes(n);
  });
  if (!list.length) {
    return {
      reply: `No encontré libros para «${key}». Prueba otro autor o el menú.`,
      options: ['✍️ Buscar por autor', '📚 Menú biblioteca'],
    };
  }
  list = list.slice(0, 15);
  const lines = list.map((b) => `📖 **${b.titulo}**\n   ${b.autor}`);
  return {
    reply: `Libros — **${key}**\n\n${lines.join('\n\n')}\n\nElige un título o abre el enlace:`,
    options: list.slice(0, 8).map((b) => b.titulo).concat(['📚 Menú biblioteca']),
    links: list.slice(0, 10).map((b) => ({ t: `📥 ${b.titulo}`, u: b.url })),
  };
}

function discursosCartas() {
  const { libros } = load();
  const list = libros.filter((b) => b.tipo === 'discurso' || b.tipo === 'carta' || /discurso|carta/i.test(b.categoria));
  const slice = list.slice(0, 18);
  const lines = slice.map((b) => `🎙️ **${b.titulo}**`);
  return {
    reply: `🎙️ **Discursos y cartas** (${list.length})\n\n${lines.join('\n')}\n\nEscribe el nombre exacto o usa un enlace:`,
    options: slice.slice(0, 8).map((b) => b.titulo).concat(['📚 Menú biblioteca']),
    links: slice.slice(0, 10).map((b) => ({ t: `📥 ${b.titulo}`, u: b.url })),
  };
}

function otrosMaestros() {
  return {
    reply:
      '🌍 **Biblioteca de otros maestros**\n\nElige un maestro para ver libros de acceso abierto / oficial:',
    options: [
      'Sadhguru',
      'Ramana Maharshi',
      'Sri Aurobindo',
      'Yogananda',
      'Krishnamurti',
      'Nisargadatta',
      'Sivananda',
      'Osho',
      'Prabhupada',
      '📚 Menú biblioteca',
    ],
  };
}

function fichaLibro(b) {
  return {
    reply:
      `📖 **${b.titulo}**\n\n` +
      `• **Autor:** ${b.autor}\n` +
      `• **Tipo:** ${b.tipo}\n` +
      `• **Categoría:** ${b.categoria}\n\n` +
      `Usa el botón de descarga / lectura:`,
    links: [{ t: '📥 Abrir / descargar', u: b.url }],
    options: ['📚 Menú biblioteca', '🗂️ Ver de la A a la Z', '✍️ Buscar por autor'],
  };
}

function searchTitle(q) {
  const { libros } = load();
  const scored = libros
    .map((b) => ({ b, s: scoreTitle(q, b.titulo) }))
    .filter((x) => x.s >= 50)
    .sort((a, b) => b.s - a.s);
  if (!scored.length) {
    // fuzzy suggestions
    const soft = libros
      .map((b) => ({ b, s: scoreTitle(q, b.titulo) }))
      .filter((x) => x.s >= 30)
      .sort((a, b) => b.s - a.s)
      .slice(0, 5);
    if (soft.length) {
      return {
        reply: `No hay coincidencia exacta para «${q}». Quizá te interese:`,
        options: soft.map((x) => x.b.titulo).concat(['📚 Menú biblioteca']),
        links: soft.map((x) => ({ t: `📥 ${x.b.titulo}`, u: x.b.url })),
      };
    }
    return {
      reply: `No encontré «${q}». Prueba el menú o otra palabra del título.`,
      options: ['🔍 Buscar por título', '📚 Menú biblioteca'],
    };
  }
  if (scored[0].s >= 80 && (scored.length === 1 || scored[0].s > scored[1].s + 10)) {
    return fichaLibro(scored[0].b);
  }
  const top = scored.slice(0, 8);
  return {
    reply: `Resultados para «${q}»:`,
    options: top.map((x) => x.b.titulo).concat(['📚 Menú biblioteca']),
    links: top.map((x) => ({ t: `📥 ${x.b.titulo}`, u: x.b.url })),
  };
}

function findExactTitle(q) {
  const n = norm(q);
  const { libros } = load();
  return libros.find((b) => norm(b.titulo) === n) || null;
}

/**
 * Punto de entrada biblioteca
 */
function procesarBiblioteca(q) {
  const n = norm(q);
  if (!n) return null;

  // activar biblioteca
  if (
    /^(biblioteca|biblioteca digital|libros sai|libros de sai|menu biblioteca)$/.test(n) ||
    /\b(biblioteca de lectura|biblioteca sai|abrir biblioteca)\b/.test(n)
  ) {
    return menuPrincipal();
  }

  if (n.includes('menu biblioteca') || n === 'menu biblioteca') return menuPrincipal();

  // menú opciones exactas (chips)
  if (n.includes('buscar por titulo') || n === 'buscar por titulo') {
    return {
      reply: '🔍 **Buscar por título**\n\nEscribe parte del nombre (ej. `Sathya Vahini`, `Bhajanavali`, `Gita`).',
      options: ['Bhajanavali', 'Sathya Vahini', 'Geetha Vahini', 'Discursos Vol. 01', '📚 Menú biblioteca'],
    };
  }
  if (n.includes('buscar por autor')) return menuAutor();
  if (n.includes('ver de la a a la z') || n === 'a z' || n.includes('a a la z')) return menuAZ();
  if (n.includes('discursos y cartas') || n === 'discursos') return discursosCartas();
  if (n.includes('otros maestros') || n === 'otros maestros') return otrosMaestros();

  // rangos A-Z
  if (/^[a-z]\s*-?\s*[a-z]$/.test(n) || /^(a\s*-?\s*e|f\s*-?\s*j|k\s*-?\s*o|p\s*-?\s*t|u\s*-?\s*z)$/.test(n)) return listByLetterRange(q);

  // ramas autor
  if (
    n.includes('escritos sai') ||
    n.includes('vahini') && n.includes('sai') ||
    n === 'escritos sai baba (vahinis)' ||
    n.includes('autores varios') ||
    ['sadhguru', 'ramana maharshi', 'yogananda', 'krishnamurti', 'sri aurobindo', 'nisargadatta', 'sivananda', 'osho', 'prabhupada', 'amma'].some((k) => n === k || n.startsWith(k + ' '))
  ) {
    // if only maestro name from otros maestros
    if (n.length < 40) return byAuthorKeyword(q);
  }

  // título exacto desde chip
  const exact = findExactTitle(q);
  if (exact) return fichaLibro(exact);

  // si parece búsqueda de libro
  if (
    /\b(libro|vahini|bhajanavali|discurso vol|descargar|pdf)\b/.test(n) ||
    (n.length >= 4 && n.length < 60 && !/\b(clima|hora|ayurveda|hierba|cuanto es)\b/.test(n))
  ) {
    // only intercept if score is decent
    const trial = searchTitle(q);
    if (trial && !trial.reply.startsWith('No encontré') && !trial.reply.startsWith('No hay coincidencia')) {
      return trial;
    }
    // if user said libro X
    if (/\b(libro|vahini|bhajan)\b/.test(n)) return searchTitle(q.replace(/\b(libro|de|del|la|el)\b/g, ' '));
  }

  return null;
}

module.exports = { procesarBiblioteca, menuPrincipal, searchTitle, load };
