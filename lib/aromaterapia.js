/**
 * Aromaterapia + Flores de Bach (datos locales educativos)
 */
const path = require('path');
const fs = require('fs');

const DATA = path.join(__dirname, '..', 'data');

function norm(t) {
  return String(t || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function readJson(name) {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA, name), 'utf8'));
  } catch {
    return null;
  }
}

function loadOils() {
  const d = readJson('aromaterapia.json');
  return (d && d.aceites) || [];
}

function loadBach() {
  const d = readJson('flores_bach.json');
  return (d && d.flores) || [];
}

function formatOil(o) {
  let r = `🌿 **${o.nombre}**`;
  if (o.cientifico) r += ` · _${o.cientifico}_`;
  r += `\n• Usos orientativos: ${(o.usos || []).join(', ')}`;
  if (o.nota) r += `\n• ${o.nota}`;
  if (o.precauciones) r += `\n• Precauciones: ${o.precauciones}`;
  r += `\n\n_Uso educativo. No ingerir. Diluir en piel. No sustituye consejo médico._`;
  return r;
}

function formatBach(f) {
  let r = `🌸 **${f.nombre}** · _Flores de Bach_`;
  r += `\n• Grupo: ${f.grupo_emocional || '—'}`;
  r += `\n• Estado que equilibra: ${f.estado_negativo || '—'}`;
  r += `\n• Virtud a cultivar: ${f.virtud_a_desarrollar || '—'}`;
  if (f.afirmacion_o_enfoque) r += `\n• Enfoque: «${f.afirmacion_o_enfoque}»`;
  if (f.nota) r += `\n• ${f.nota}`;
  r += `\n\n_Uso educativo / bienestar emocional. No sustituye ayuda profesional._`;
  return r;
}

function scoreName(query, name) {
  const q = norm(query);
  const n = norm(name);
  if (!q || !n) return 0;
  if (q === n) return 100;
  if (q.includes(n) || n.includes(q)) return 80;
  const qw = q.split(' ').filter((w) => w.length > 2);
  let s = 0;
  qw.forEach((w) => {
    if (n.includes(w)) s += 20;
  });
  return s;
}

/**
 * @returns {null|{reply,links,options,_forceAi?}}
 */
function tryAromaterapia(pregunta) {
  const raw = String(pregunta || '').trim();
  const n = norm(raw);
  if (!n) return null;

  const isAroma =
    /\b(aromaterapia|aceite esencial|aceites esenciales|esencial de|aceite de lavanda|tea tree|arbol del te|árbol del té)\b/.test(
      n
    ) ||
    (/\b(lavanda|eucalipto|sándalo|sandalo|incienso|ylang|bergamota|menta piperita)\b/.test(n) &&
      /\b(aceite|aroma|difusor|olor)\b/.test(n));

  const isBach =
    /\b(flores de bach|flor de bach|bach flower|rescue remedy|esencias florales de bach)\b/.test(n) ||
    (/\b(mimulus|agrimony|aspen|centaury|cerato|holly|larch|oak|willow|gentian|gorse)\b/.test(n) &&
      /\b(bach|flor|esencia)\b/.test(n));

  if (!isAroma && !isBach) return null;

  if (isBach) {
    const flores = loadBach();
    if (!flores.length) {
      return {
        reply: 'Las Flores de Bach trabajan estados emocionales. Nombra una flor (ej. *Mimulus*, *Rescue Remedy*) o un sentimiento (miedo, incertidumbre).',
        options: ['Mimulus', 'Rescue Remedy', 'lista flores de bach', 'ayuda'],
      };
    }
    if (/\b(lista|catalogo|catálogo|todas|38)\b/.test(n)) {
      const byGroup = {};
      flores.forEach((f) => {
        const g = f.grupo_emocional || 'Otros';
        if (!byGroup[g]) byGroup[g] = [];
        byGroup[g].push(f.nombre);
      });
      let reply = '🌸 **Flores de Bach** (catálogo educativo)\n\n';
      Object.keys(byGroup).forEach((g) => {
        reply += `**${g}:** ${byGroup[g].join(', ')}\n\n`;
      });
      reply += 'Escribe el nombre de una flor para ver su ficha.\n\n_No sustituye ayuda profesional._';
      return {
        reply,
        options: ['Mimulus', 'Rescue Remedy', 'Agrimony', 'ayuda'],
      };
    }
    let best = null;
    let bestS = 0;
    flores.forEach((f) => {
      const s = scoreName(n, f.nombre);
      if (s > bestS) {
        bestS = s;
        best = f;
      }
    });
    // match por grupo emocional
    if (bestS < 20) {
      const hit = flores.filter((f) => norm(f.grupo_emocional || '').split(' ').some((w) => n.includes(w) && w.length > 4));
      if (hit.length) {
        return {
          reply:
            `🌸 Grupo emocional relacionado:\n\n` +
            hit
              .slice(0, 6)
              .map((f) => `• **${f.nombre}** — ${f.estado_negativo}`)
              .join('\n') +
            `\n\nEscribe el nombre de la flor para la ficha completa.`,
          options: hit.slice(0, 3).map((f) => f.nombre).concat(['ayuda']),
        };
      }
    }
    if (best && bestS >= 20) {
      return {
        reply: formatBach(best),
        options: ['lista flores de bach', 'Rescue Remedy', 'ayuda'],
      };
    }
    return {
      reply:
        '🌸 **Flores de Bach**\n\nPuedo mostrar una ficha por nombre (ej. *Mimulus*, *Oak*, *Rescue Remedy*) o listar por grupo emocional (miedo, incertidumbre, soledad…).\n\n¿Cuál te interesa?',
      options: ['lista flores de bach', 'Mimulus', 'Rescue Remedy', 'ayuda'],
      _forceAi: false,
    };
  }

  // Aromaterapia
  const oils = loadOils();
  if (/\b(lista|catalogo|catálogo|aceites esenciales)\b/.test(n) && !/\bde\s+\w{4,}\b/.test(n.replace(/aceites esenciales/g, ''))) {
    const names = oils.map((o) => o.nombre).join(', ');
    return {
      reply:
        `🌿 **Aromaterapia (base Vimana)**\n\nAceites en catálogo local: ${names}.\n\nEscribe el nombre (ej. *lavanda*, *incienso*) para la ficha.\n\n_Educativo; no ingerir; diluir en piel._`,
      options: ['lavanda', 'incienso', 'árbol del té', 'ayuda'],
    };
  }
  let best = null;
  let bestS = 0;
  oils.forEach((o) => {
    let s = scoreName(n, o.nombre);
    if (o.cientifico) s = Math.max(s, scoreName(n, o.cientifico));
    if (s > bestS) {
      bestS = s;
      best = o;
    }
  });
  if (best && bestS >= 20) {
    return {
      reply: formatOil(best),
      options: ['lista aceites esenciales', 'lavanda', 'flores de bach', 'ayuda'],
    };
  }
  if (isAroma) {
    return {
      reply:
        '🌿 **Aromaterapia**\n\nPuedo dar fichas educativas de aceites (lavanda, incienso, sándalo, eucalipto…).\n\nNombra un aceite o pide *lista aceites esenciales*.\n\n_No sustituye consejo médico; no ingerir._',
      options: ['lista aceites esenciales', 'lavanda', 'incienso', 'ayuda'],
    };
  }
  return null;
}

module.exports = { tryAromaterapia, loadOils, loadBach };
