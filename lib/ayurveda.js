/**
 * Ayurveda / plantas — datos locales data/herb.json
 * (origen: sciencewithsaucee-sudo/herb-database, CC BY 4.0)
 * Sánscrito se mantiene; texto descriptivo se muestra en español cuando es posible.
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
    const p = path.join(__dirname, '..', 'data', 'herb.json');
    const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
    cache = Array.isArray(raw) ? raw : raw.herbs || raw.data || [];
  } catch {
    cache = [];
  }
  return cache;
}

/** Glosario mínimo EN/IAST → español (indicaciones frecuentes) */
const IND_ES = {
  kasa: 'tos',
  shwasa: 'dificultad respiratoria / asma',
  jwara: 'fiebre',
  hikka: 'hipo',
  atisara: 'diarrea',
  arsha: 'hemorroides',
  pratishyaya: 'resfriado / rinitis',
  agnimandya: 'digestión débil',
  ajeerna: 'indigestión',
  shotha: 'hinchazón',
  vrana: 'herida',
  kushta: 'afecciones de piel',
  pandu: 'anemia',
  kamala: 'ictericia',
  madhumeha: 'diabetes (trad.)',
  unmada: 'inquietud mental (trad.)',
  apasmara: 'convulsiones (trad.)',
  shirahshula: 'dolor de cabeza',
  netraroga: 'afecciones oculares',
  hridroga: 'soporte cardíaco (trad.)',
  raktapitta: 'sangrado (trad.)',
  amavata: 'dolores articulares (trad.)',
  gridhrasi: 'ciática (trad.)',
  balya: 'tonificante',
  medhya: 'claridad mental (trad.)',
  rasayana: 'rejuvenecedor (rasayana)',
  deepana: 'estimula el agni / digestión',
  pachana: 'ayuda a digerir',
  anulomana: 'regula el tránsito intestinal',
};

function indToEs(list) {
  if (!Array.isArray(list) || !list.length) return '';
  return list
    .map((x) => {
      const k = norm(x).replace(/\s+/g, '');
      const es = IND_ES[k] || IND_ES[norm(x)];
      return es ? `${x} (${es})` : String(x);
    })
    .join(', ');
}

function scoreHerb(h, q) {
  const n = norm(q);
  if (!n || n.length < 2) return 0;
  let s = 0;
  const fields = [
    h.name,
    h.english_name,
    h.botanical_name,
    h.preview,
    ...(h.sanskrit_synonyms || []),
    ...(h.main_indications || []),
  ];
  const blob = norm(fields.filter(Boolean).join(' '));
  if (blob.includes(n)) s += 10;
  const tokens = n.split(' ').filter((t) => t.length > 2);
  tokens.forEach((t) => {
    if (norm(h.name) === t) s += 20;
    if (norm(h.english_name) === t) s += 18;
    if (norm(h.name).includes(t)) s += 8;
    if (norm(h.english_name || '').includes(t)) s += 7;
    if (norm(h.botanical_name || '').includes(t)) s += 9;
    (h.sanskrit_synonyms || []).forEach((sy) => {
      if (norm(sy).includes(t)) s += 12;
    });
    (h.main_indications || []).forEach((ind) => {
      if (norm(ind).includes(t)) s += 6;
      const es = IND_ES[norm(ind).replace(/\s+/g, '')];
      if (es && norm(es).includes(t)) s += 5;
    });
  });
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
  r +=
    `\n_Uso educativo (tradición áyurveda). No sustituye consejo médico profesional._`;
  return r;
}

function isAyurvedaQuery(pregunta) {
  const n = norm(pregunta);
  if (
    /\b(ayurveda|ayurvedic|ayur vedica|hierba|hierbas|planta medicinal|plantas medicinales|herbolaria|dosha|vata|pitta|kapha|rasayana)\b/.test(
      n
    )
  ) {
    return true;
  }
  // nombre de planta conocido en el dataset (match fuerte)
  const herbs = loadHerbs();
  if (!herbs.length) return false;
  const tokens = n.split(' ').filter((t) => t.length > 3);
  for (const h of herbs) {
    const names = [h.name, h.english_name, ...(h.sanskrit_synonyms || [])]
      .filter(Boolean)
      .map(norm);
    for (const nm of names) {
      if (nm.length > 3 && (n === nm || n.includes(nm) || tokens.includes(nm))) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Capa Ayurveda: si hay match, responde; si no, null (sigue el buscador).
 */
async function tryAyurveda(pregunta) {
  const n = norm(pregunta);
  if (!n) return null;

  const herbs = loadHerbs();
  if (!herbs.length) return null;

  // solo actuar si parece consulta de hierbas / ayurveda / nombre de planta
  if (!isAyurvedaQuery(pregunta)) return null;

  const ranked = herbs
    .map((h) => ({ h, s: scoreHerb(h, n) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s);

  if (!ranked.length) {
    // pregunta genérica "qué es ayurveda" / listado
    if (/\b(que es|qué es|ayurveda)\b/.test(n) && !/\b(planta|hierba|tulsi|ashwa)\b/.test(n)) {
      return {
        reply:
          `🌿 **Ayurveda**\n\n` +
          `Sistema de medicina tradicional de la India (“ciencia de la vida”). Busca el equilibrio de **Vata**, **Pitta** y **Kapha** con hábitos, dieta y plantas.\n\n` +
          `En Vimana puedes consultar **plantas del catálogo áyurveda** (p. ej. *tulsi*, *ashwagandha*, *triphala*).\n\n` +
          `_Fuente de datos: Amidha Ayurveda Herb Database (CC BY 4.0)._`,
        links: [
          {
            t: 'Herb database (origen)',
            u: 'https://github.com/sciencewithsaucee-sudo/herb-database',
          },
        ],
        options: ['tulsi', 'ashwagandha', 'ayurveda', 'ayuda'],
      };
    }
    return null;
  }

  const top = ranked.slice(0, 3);
  let reply = formatHerb(top[0].h);
  if (top.length > 1) {
    reply += `\n\n**También relacionadas:** `;
    reply += top
      .slice(1)
      .map((x) => x.h.name || x.h.english_name)
      .join(', ');
  }

  const links = [];
  if (top[0].h.link) {
    links.push({
      t: top[0].h.name || 'Ficha',
      u: top[0].h.link.startsWith('http')
        ? top[0].h.link
        : 'https://www.amidhaayurveda.com' + top[0].h.link,
    });
  }
  links.push({
    t: 'Origen de datos (CC BY)',
    u: 'https://github.com/sciencewithsaucee-sudo/herb-database',
  });

  return {
    reply,
    links,
    options: ['ayurveda', 'tulsi', 'ashwagandha', 'ayuda'],
  };
}

module.exports = { tryAyurveda, loadHerbs, isAyurvedaQuery };
