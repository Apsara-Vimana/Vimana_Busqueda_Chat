/**
 * Plantas Ayurveda — data/herb.json
 * Solo si preguntan por planta / herbolaria / usos, no por "ayurveda" suelto en otros temas.
 */
const path = require('path');
const fs = require('fs');

let cache = null;

function norm(t) {
  return String(t || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function loadHerbs() {
  if (cache) return cache;
  try {
    const raw = JSON.parse(
      fs.readFileSync(path.join(__dirname, '..', 'data', 'herb.json'), 'utf8')
    );
    cache = Array.isArray(raw) ? raw : raw.herbs || raw.data || [];
  } catch {
    cache = [];
  }
  return cache;
}

const IND_ES = {
  kasa: 'tos',
  shwasa: 'dificultad respiratoria / asma',
  jwara: 'fiebre',
  hikka: 'hipo',
  atisara: 'diarrea',
  arsha: 'hemorroides',
  pratishyaya: 'resfriado',
  agnimandya: 'digestión débil',
  ajeerna: 'indigestión',
  shotha: 'hinchazón',
  kushta: 'piel',
  pandu: 'anemia',
  madhumeha: 'azúcar en sangre (trad.)',
  shirahshula: 'dolor de cabeza',
  balya: 'tonificante',
  medhya: 'claridad mental (trad.)',
  rasayana: 'rejuvenecedor',
};

function indToEs(list) {
  if (!Array.isArray(list) || !list.length) return '';
  return list
    .map((x) => {
      const k = norm(x).replace(/\s+/g, '');
      const es = IND_ES[k];
      return es ? `${x} (${es})` : String(x);
    })
    .join(', ');
}

function scoreHerb(h, q) {
  const n = norm(q);
  if (!n || n.length < 2) return 0;
  let s = 0;
  const names = [h.name, h.english_name, h.botanical_name, ...(h.sanskrit_synonyms || [])]
    .filter(Boolean)
    .map(norm);
  names.forEach((nm) => {
    if (nm === n) s += 30;
    if (n.includes(nm) && nm.length > 3) s += 18;
    if (nm.includes(n) && n.length > 3) s += 14;
  });
  const tokens = n.split(' ').filter((t) => t.length > 2);
  tokens.forEach((t) => {
    names.forEach((nm) => {
      if (nm === t) s += 20;
      if (nm.includes(t)) s += 8;
    });
    (h.main_indications || []).forEach((ind) => {
      if (norm(ind).includes(t)) s += 5;
      const es = IND_ES[norm(ind).replace(/\s+/g, '')];
      if (es && norm(es).includes(t)) s += 6;
    });
  });
  if (h.preview && norm(h.preview).includes(n)) s += 4;
  return s;
}

function formatHerb(h) {
  let r = `🌿 **${h.name || h.english_name || 'Planta'}**`;
  if (h.english_name && h.english_name !== h.name) r += ` · ${h.english_name}`;
  r += `\n\n`;
  if (h.botanical_name) r += `• Científico: *${h.botanical_name}*\n`;
  if (h.family) r += `• Familia: ${h.family}\n`;
  if (h.sanskrit_synonyms && h.sanskrit_synonyms.length) {
    r += `• Sánscrito: ${h.sanskrit_synonyms.slice(0, 6).join(', ')}\n`;
  }
  if (h.part_used && h.part_used.length) {
    r += `• Partes usadas: ${h.part_used.join(', ')}\n`;
  }
  if (h.main_indications && h.main_indications.length) {
    r += `• Indicaciones (Áyurveda): ${indToEs(h.main_indications)}\n`;
  }
  if (h.pacify && h.pacify.length) r += `• Pacifica: ${h.pacify.join(', ')}\n`;
  if (h.aggravate && h.aggravate.length) r += `• Puede aumentar: ${h.aggravate.join(', ')}\n`;
  if (h.rasa && h.rasa.length) r += `• Rasa: ${h.rasa.join(', ')}\n`;
  if (h.virya) r += `• Virya: ${h.virya}\n`;
  if (h.preview) r += `\n${h.preview}\n`;
  r += `\n_Uso educativo (tradición áyurveda). No sustituye consejo médico profesional._`;
  return r;
}

/** ¿Es consulta de plantas/herbolaria? (no "ayurveda" solo en chips ajenos) */
function isPlantQuery(pregunta) {
  const n = norm(pregunta);
  if (
    /\b(planta medicinal|plantas medicinales|hierba|hierbas|herbolaria|herbolario|uso de plantas|usos de plantas|para que sirve|para qué sirve)\b/.test(
      n
    )
  ) {
    return true;
  }
  if (/\b(ayurveda|ayurvedic)\b/.test(n) && /\b(planta|hierba|herba|tulsi|ashwagandha|catalogo|catálogo)\b/.test(n)) {
    return true;
  }
  // nombre de planta concreto (match en base)
  const herbs = loadHerbs();
  const tokens = n.split(' ').filter((t) => t.length > 3);
  for (const h of herbs) {
    for (const nm of [h.name, h.english_name, ...(h.sanskrit_synonyms || [])].filter(Boolean)) {
      const nn = norm(nm);
      if (nn.length > 3 && (n === nn || tokens.includes(nn) || n.includes(nn))) return true;
    }
  }
  // "ayurveda" solo → explicación breve, no tulsi
  if (/^ayurveda$/.test(n) || n === 'que es ayurveda' || n === 'qué es ayurveda') {
    return 'define';
  }
  return false;
}

async function tryAyurveda(pregunta) {
  const n = norm(pregunta);
  if (!n) return null;

  const kind = isPlantQuery(pregunta);
  if (!kind) return null;

  const herbs = loadHerbs();

  if (kind === 'define') {
    return {
      reply:
        `🌿 **¿Qué es el Ayurveda?**\n\n` +
        `Es la medicina tradicional de la India (“ciencia de la vida”). Busca el equilibrio del cuerpo y la mente con hábitos, comida y plantas.\n\n` +
        `Para ver una planta, escribe su **nombre** (ej. *tulsi*, *ashwagandha*) o *plantas medicinales*.`,
      links: [],
      options: ['tulsi', 'ashwagandha', 'plantas medicinales', 'ayuda'],
    };
  }

  if (!herbs.length) return null;

  const ranked = herbs
    .map((h) => ({ h, s: scoreHerb(h, n) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s);

  if (!ranked.length) {
    // no match → null para que siga a internet
    return null;
  }

  const top = ranked[0];
  // umbral bajo pero si la query es genérica "plantas medicinales" listar sugerencias
  if (/\b(plantas medicinales|hierbas|herbolaria|catalogo|catálogo)\b/.test(n) && top.s < 20) {
    const sample = herbs
      .slice(0, 8)
      .map((h) => h.name)
      .join(', ');
    return {
      reply:
        `🌿 **Catálogo de plantas (Áyurveda)**\n\n` +
        `Hay cientos de fichas. Escribe el **nombre** de la planta.\n\n` +
        `Ejemplos: ${sample}…`,
      links: [],
      options: herbs.slice(0, 4).map((h) => h.name),
    };
  }

  let reply = formatHerb(top.h);
  const related = ranked.slice(1, 4).map((x) => x.h.name || x.h.english_name);
  if (related.length) {
    reply += `\n\n**Otras cercanas:** ${related.join(', ')}`;
  }
  reply += `\n\nSi buscas otra planta, escribe su nombre. Si no está aquí, la buscaremos en internet.`;

  const opts = related.slice(0, 3);
  opts.push('plantas medicinales', 'ayuda');

  const links = [];
  if (top.h.link && String(top.h.link).startsWith('http')) {
    links.push({ t: top.h.name || 'Ficha', u: top.h.link });
  }

  return { reply, links, options: opts };
}

module.exports = { tryAyurveda, loadHerbs, isPlantQuery };
