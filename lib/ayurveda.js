/**
 * Plantas Ayurveda — data/herb.json
 * Solo consultas claras de plantas. Nunca intercepta libros/escrituras (Ramayana, Gita…).
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


function isAyurvedaDefine(n) {
  const x = norm(n).replace(/\s+/g, ' ');
  // variantes: ayur veda, ayrveda, ayurvedica, medicina ayurvedica...
  if (/^(que es|qué es|que significa|qué significa|define|definicion|definición)\s+/.test(x)) {
    if (/ayur\s*veda|ayurveda|ayrveda|ayurvedic|ayurvedica|ayurv[eé]dica/.test(x)) return true;
    if (/medicina\s+ayur/.test(x)) return true;
  }
  if (/^(ayur\s*veda|ayurveda|ayrveda)$/.test(x)) return true;
  if (/\b(que es|qué es)\b/.test(x) && /medicina\s+(tradicional\s+)?(india|ayur)/.test(x)) return true;
  if (/\bque es la medicina ayur|\bqué es la medicina ayur/.test(x)) return true;
  return false;
}

const AYURVEDA_DEFINITION =
  '🌿 **¿Qué es el Ayurveda?**\n\n' +
  'El **Ayurveda** es el sistema de medicina tradicional de la India, con raíces de más de 5.000 años. ' +
  'Su nombre en sánscrito significa literalmente *«la ciencia de la vida»* (Ayus = vida, Veda = conocimiento).\n\n' +
  'Se concibe como un enfoque **holístico**: busca el equilibrio de cuerpo, mente y espíritu, con énfasis en la prevención, ' +
  'la dieta, hábitos diarios, hierbas, yoga y meditación.\n\n' +
  'Según la tradición, la salud depende del equilibrio de tres energías o **doshas**:\n' +
  '• **Vata** — aire y éter\n' +
  '• **Pitta** — fuego y agua\n' +
  '• **Kapha** — tierra y agua\n\n' +
  'La enfermedad se entiende como desequilibrio de estas fuerzas; los cuidados se orientan a restaurar la armonía natural.\n\n' +
  '_Uso educativo. No sustituye consejo médico profesional._\n\n' +
  '¿Deseas conocer la **base de plantas** y sus usos tradicionales?';

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

/** Temas que NUNCA son búsqueda de plantas */
function isBlockedTopic(n) {
  // No bloquear Ayurveda / medicina ayurvédica
  if (/ayur\s*veda|ayurveda|ayurvedic|ayurvedica|ayurv[eé]dica|medicina ayur/.test(n)) return false;
  return /\b(ramayana|ramayan|valmiki|ramcharitmanas|mahabharata|bhagavad|gita|upanishad|purana|libro|libros|capitulo|capítulo|capitulos|capítulos|temas del|buscar libro|quien es|quién es|sai baba|tulsidas|maestro|glosario)\b/.test(
    n
  );
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

function herbNames(h) {
  return [h.name, h.english_name, h.botanical_name, ...(h.sanskrit_synonyms || [])]
    .filter(Boolean)
    .map(norm)
    .filter((nm) => nm.length >= 4);
}

/**
 * Solo coincidencia por token completo o igualdad, NUNCA subcadena suelta
 * (evita "rama" dentro de "ramayana", etc.)
 */
function scoreHerb(h, q) {
  const n = norm(q);
  if (!n || n.length < 3) return 0;
  const tokens = n.split(/\s+/).filter((t) => t.length >= 4);
  let s = 0;
  for (const nm of herbNames(h)) {
    if (n === nm) s += 100;
    if (tokens.includes(nm)) s += 80;
    // nombre multi-palabra del herb contenido como bloque en la query
    if (nm.includes(' ') && n.includes(nm)) s += 70;
  }
  // indicaciones solo si ya hay señal de planta en la query
  if (s >= 70) {
    tokens.forEach((t) => {
      (h.main_indications || []).forEach((ind) => {
        if (norm(ind) === t) s += 5;
      });
    });
  }
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

function isPlantQuery(pregunta) {
  const n = norm(pregunta);
  if (!n) return false;
  if (isBlockedTopic(n)) return false;

  if (
    /\b(planta medicinal|plantas medicinales|hierba|hierbas|herbolaria|herbolario|uso de plantas|usos de plantas|para que sirve|para qué sirve)\b/.test(
      n
    )
  ) {
    return true;
  }
  if (
    /\b(ayurveda|ayurvedic)\b/.test(n) &&
    /\b(planta|hierba|herba|tulsi|ashwagandha|catalogo|catálogo)\b/.test(n)
  ) {
    return true;
  }
  if (isAyurvedaDefine(n)) return 'define';

  // nombre de planta = token exacto (mín. 4 letras)
  const herbs = loadHerbs();
  const tokens = n.split(/\s+/).filter((t) => t.length >= 4);
  for (const h of herbs) {
    for (const nm of herbNames(h)) {
      if (n === nm || tokens.includes(nm)) return true;
    }
  }
  return false;
}

async function tryAyurveda(pregunta) {
  const n = norm(pregunta);
  if (!n) return null;


  // Definición de Ayurveda (antes de plantas / bloqueos confusos)
  if (isAyurvedaDefine(n)) {
    return {
      reply: AYURVEDA_DEFINITION,
      links: [
        { t: 'Ayurveda (Wikipedia)', u: 'https://es.wikipedia.org/wiki/Ayurveda' },
      ],
      options: ['Plantas Ayurveda', 'tulsi', 'ashwagandha', 'ayuda'],
      image: '/imagenes/Restablecido.jpg',
      imageSize: 'state',
      imageAlt: 'Ayurveda',
      _aiEnrich: true, // motor puede ampliar con IA si quiere
    };
  }

  if (isBlockedTopic(n)) return null;

  // Estrategia de botones: plantas medicinales (genérico)
  if (
    /^(plantas medicinales|hierbas medicinales|plantas|hierbas|flores medicinales)$/.test(n) ||
    /\b(buscar plantas|buscame plantas|búscame plantas|quiero plantas)\b/.test(n)
  ) {
    return {
      reply:
        '🌿 **Plantas y remedios**\n\n' +
        '¿Qué prefieres?\n\n' +
        '• **Plantas Ayurveda** — base local (nombres, usos tradicionales)\n' +
        '• **Plantas conocidas** — búsqueda en internet (remedios y usos)\n' +
        '• O **escribe el nombre** de la planta en la barra (ej. *tulsi*, *manzanilla*)\n\n' +
        '**Escoge o presiona uno de los botones de abajo.**',
      links: [],
      options: ['Plantas Ayurveda', 'Plantas conocidas', 'ayuda'],
      image: '/imagenes/Restablecido.jpg',
      imageSize: 'state',
      imageAlt: 'Restablecido',
      _askChoice: true,
    };
  }

  if (/^plantas conocidas$/.test(n) || /plantas conocidas/.test(n) && /\b(remedio|internet|buscar)\b/.test(n) === false && n === 'plantas conocidas') {
    return {
      reply:
        '🌱 **Plantas conocidas**\n\n' +
        'Escribe el **nombre** de la planta o el uso (ej. *manzanilla para dormir*, *aloe vera piel*).\n' +
        'Buscaré en internet referencias útiles.\n\n' +
        '_Uso educativo; no sustituye consejo médico._',
      links: [],
      options: ['Plantas Ayurveda', 'manzanilla', 'aloe vera', 'ayuda'],
      image: '/imagenes/Restablecido.jpg',
      imageSize: 'state',
      imageAlt: 'Restablecido',
      _forceWeb: true,
      _topic: 'plantas medicinales remedios usos tradicionales',
    };
  }

  if (n === 'plantas conocidas') {
    return {
      reply:
        '🌱 **Plantas conocidas**\n\nEscribe el nombre o el uso en la barra, o elige un ejemplo.',
      links: [],
      options: ['manzanilla', 'aloe vera', 'romero', 'Plantas Ayurveda', 'ayuda'],
      image: '/imagenes/Restablecido.jpg',
      imageSize: 'state',
      imageAlt: 'Restablecido',
      _forceWeb: true,
      _topic: 'plantas medicinales conocidas remedios caseros',
    };
  }

  if (n === 'plantas ayurveda' || n === 'plantas ayur veda') {
    // catalogo local
    const herbs = loadHerbs();
    const sample = herbs.slice(0, 8).map((h) => h.name).join(', ');
    return {
      reply:
        '🌿 **Plantas Ayurveda (base local)**\n\n' +
        'Escribe el **nombre** de la planta (ej. *tulsi*, *ashwagandha*).\n\n' +
        (sample ? `Ejemplos: ${sample}…` : ''),
      links: [],
      options: herbs.slice(0, 4).map((h) => h.name).concat(['plantas medicinales', 'ayuda']),
      image: '/imagenes/Restablecido.jpg',
      imageSize: 'state',
      imageAlt: 'Restablecido',
    };
  }

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
    .filter((x) => x.s >= 70)
    .sort((a, b) => b.s - a.s);

  if (!ranked.length) return null;

  const top = ranked[0];
  if (/\b(plantas medicinales|hierbas|herbolaria|catalogo|catálogo)\b/.test(n) && top.s < 80) {
    const sample = herbs
      .slice(0, 8)
      .map((h) => h.name)
      .join(', ');
    return {
      reply:
        `🌿 **Catálogo de plantas (Áyurveda)**\n\n` +
        `Escribe el **nombre** de la planta.\n\nEjemplos: ${sample}…`,
      links: [],
      options: herbs.slice(0, 4).map((h) => h.name),
    };
  }

  let reply = formatHerb(top.h);
  const related = ranked.slice(1, 3).map((x) => x.h.name || x.h.english_name);
  if (related.length) reply += `\n\n**Otras cercanas:** ${related.join(', ')}`;
  reply += `\n\nSi buscas otra planta, escribe su nombre.`;

  return {
    reply,
    links: [],
    options: [...related.slice(0, 2), 'plantas medicinales', 'ayuda'],
  };
}

module.exports = { tryAyurveda, loadHerbs, isPlantQuery };
