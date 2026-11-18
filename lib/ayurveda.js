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


function isAyurvedaTopic(n) {
  const x = norm(n).replace(/\s+/g, ' ');
  return /ayur\s*veda|ayurveda|ayrveda|ayurvedic|ayurvedica|ayurv[eé]dica|medicina\s+ayur/.test(x);
}

function isAyurvedaDefine(n) {
  const x = norm(n).replace(/\s+/g, ' ');
  if (!isAyurvedaTopic(x)) return false;
  // definición / presentación
  if (/^(que es|qué es|que significa|qué significa|define|definicion|definición)\b/.test(x)) return true;
  if (/^(ayur\s*veda|ayurveda|ayrveda)$/.test(x)) return true;
  if (/\b(que es|qué es)\b/.test(x) && /medicina/.test(x)) return true;
  return false;
}

/** “háblame más”, ampliar, profundizar sobre Ayurveda */
function isAyurvedaMore(n) {
  const x = norm(n).replace(/\s+/g, ' ');
  if (!isAyurvedaTopic(x)) return false;
  return (
    /hablame|háblame|cuentame|cuéntame|explica|explícame|profundiza|amplia|amplía|mas sobre|más sobre|mas del tema|más del tema|quiero saber mas|quiero saber más|continúa|continua|sigue hablando|desarrolla/.test(
      x
    ) ||
    (/tema/.test(x) && /mas|más|ampl/.test(x))
  );
}


/** Capas para no repetir la misma intro al pedir “más” */
const AYURVEDA_DEEPEN = [
  {
    id: 'doshas',
    title: 'Los tres doshas',
    text:
      '🌿 **Ayurveda en profundidad — Los tres doshas**\n\n' +
      'En la tradición áyurveda, **Vata**, **Pitta** y **Kapha** describen tendencias de la naturaleza en el cuerpo y la mente:\n\n' +
      '• **Vata** (aire–éter): movimiento, sequedad, creatividad; en exceso puede dar inquietud o irregularidad.\n' +
      '• **Pitta** (fuego–agua): transformación, agudeza, calor; en exceso, irritabilidad o acidez.\n' +
      '• **Kapha** (tierra–agua): estructura, calma, lubricación; en exceso, pesadez o lentitud.\n\n' +
      'El cuidado no busca “eliminar” un dosha, sino **equilibrar** según la persona, la estación y el momento de la vida.\n\n' +
      '_Educativo; no es diagnóstico médico._',
  },
  {
    id: 'dinacharya',
    title: 'Rutina diaria (dinacharya)',
    text:
      '🌿 **Ayurveda en profundidad — Dinacharya**\n\n' +
      'La **dinacharya** es la rutina diaria orientada a alinearse con los ritmos naturales:\n\n' +
      '• Levantarse con calma, higiene suave (incluye tradiciones como limpieza de lengua, según cada escuela).\n' +
      '• Comidas a horas regulares, evitando excesos y comidas muy pesadas por la noche.\n' +
      '• Movimiento o yoga suave y momentos de quietud o meditación.\n' +
      '• Descanso suficiente; el sueño se valora como medicina del equilibrio.\n\n' +
      'No es una lista rígida: se adapta a la constitución y al clima de cada región.',
  },
  {
    id: 'alimentacion',
    title: 'Alimentación consciente',
    text:
      '🌿 **Ayurveda en profundidad — Alimentación**\n\n' +
      'La comida se entiende como **medicina cotidiana**:\n\n' +
      '• Preferir lo fresco, cocinado con atención y comido sin prisas.\n' +
      '• Sabores (dulce, ácido, salado, picante, amargo, astringente) en equilibrio, no un solo extremo.\n' +
      '• Ajustar según el dosha predominante y la estación (p. ej. más calor en frío, más frescura en calor).\n' +
      '• Digestión (*agni*): mejor una comida que se digiera bien que un exceso que debilite el fuego digestivo.\n\n' +
      '_Orientación cultural y de bienestar; consulta profesional si hay enfermedad._',
  },
];

function deepenAyurveda(n) {
  const x = norm(n);
  if (/dosha|vata|pitta|kapha/.test(x)) return AYURVEDA_DEEPEN[0];
  if (/dinacharya|rutina|habito|hábito|diario|mañana|sueno|sueño/.test(x)) return AYURVEDA_DEEPEN[1];
  if (/aliment|comida|dieta|nutrition|comida/.test(x)) return AYURVEDA_DEEPEN[2];
  // “más sobre el tema” genérico: rotar por hash simple de la frase para no repetir siempre el mismo
  let h = 0;
  for (let i = 0; i < x.length; i++) h = (h + x.charCodeAt(i) * (i + 1)) % 3;
  return AYURVEDA_DEEPEN[h];
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


/** Nombres comunes → claves para localizar en catálogo o ficha sintética */
const PLANT_ALIASES = {
  neem: ['nimba', 'neem', 'nim', 'margosa', 'lila india', 'azadirachta'],
  nim: ['nimba', 'neem', 'nim'],
  nimba: ['nimba', 'neem', 'nim'],
  margosa: ['nimba', 'neem'],
  tulsi: ['tulsi', 'tulasi', 'holy basil'],
  ashwagandha: ['ashwagandha', 'asvagandha', 'withania'],
  triphala: ['triphala', 'triphala'],
  amla: ['amla', 'amalaki', 'emblic'],
  haritaki: ['haritaki', 'harad'],
  bibhitaki: ['bibhitaki', 'bihitaki'],
  brahmi: ['brahmi', 'bacopa'],
  shankhapushpi: ['shankhapushpi', 'shankhpushpi'],
  turmeric: ['haridra', 'turmeric', 'curcuma', 'curcuma longa'],
  curcuma: ['haridra', 'turmeric', 'curcuma'],
  ginger: ['shunthi', 'ginger', 'adrak', 'zingiber'],
  jengibre: ['shunthi', 'ginger', 'adrak'],
  manzanilla: ['chamomile', 'manzanilla'],
};

/** Fichas mínimas si el catálogo no trae el nombre común (ej. Neem) */
const SYNTHETIC_HERBS = [
  {
    name: 'Nimba',
    english_name: 'Neem',
    botanical_name: 'Azadirachta indica',
    family: 'Meliaceae',
    sanskrit_synonyms: ['Nimba', 'Arishta', 'Picumarda'],
    part_used: ['Patra', 'Beeja', 'Twak'],
    main_indications: ['Kushta', 'Krimi', 'Prameha', 'Vrana'],
    pacify: ['Kapha', 'Pitta'],
    aggravate: ['Vata'],
    rasa: ['Tikta', 'Kashaya'],
    virya: 'Sheeta',
    preview:
      'El Neem (Nimba) es muy valorado en la tradición índica por su uso en piel, higiene y como árbol de usos múltiples. En Áyurveda se asocia a cualidades amargas y a pacificar Kapha-Pitta en contextos tradicionales.',
  },
];

function expandPlantTokens(n) {
  const tokens = new Set(n.split(/\s+/).filter(Boolean));
  tokens.add(n);
  for (const [k, arr] of Object.entries(PLANT_ALIASES)) {
    if (n === k || tokens.has(k) || arr.some((a) => n === norm(a) || tokens.has(norm(a)))) {
      arr.forEach((a) => tokens.add(norm(a)));
      tokens.add(k);
    }
  }
  return [...tokens];
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
  const base = [h.name, h.english_name, h.botanical_name, ...(h.sanskrit_synonyms || [])]
    .filter(Boolean)
    .map(norm);
  const extra = [];
  for (const nm of base) {
    for (const [k, arr] of Object.entries(PLANT_ALIASES)) {
      if (nm === k || arr.map(norm).includes(nm) || nm.includes('azadirachta')) {
        arr.forEach((a) => extra.push(norm(a)));
        extra.push(k);
      }
    }
  }
  // Solo Azadirachta indica / ficha Nimba exacta → alias neem
  if (/azadirachta\s*indica/.test(base.join(' ')) || base.includes('nimba') && (h.name && norm(h.name) === 'nimba')) {
    ['neem', 'nim', 'nimba', 'margosa'].forEach((x) => extra.push(x));
  }
  return [...new Set([...base, ...extra])].filter((nm) => nm.length >= 3);
}

/**
 * Solo coincidencia por token completo o igualdad, NUNCA subcadena suelta
 * (evita "rama" dentro de "ramayana", etc.)
 */
function scoreHerb(h, q) {
  const n = norm(q);
  if (!n || n.length < 2) return 0;
  const tokens = expandPlantTokens(n).filter((t) => t.length >= 3);
  let s = 0;
  const names = herbNames(h);
  for (const nm of names) {
    if (n === nm) s = Math.max(s, 100);
    else if (tokens.includes(nm) && nm.length >= 3) s = Math.max(s, 90);
    else if (nm.length >= 5 && n.length >= 5 && (nm.startsWith(n) || n.startsWith(nm))) s = Math.max(s, 75);
  }
  // Evitar que "neem" gane Bhunimba solo por contener "nimba" como subcadena
  // (solo igualdad de token cuenta arriba)
  if (s >= 70 && (h.main_indications || []).length) {
    tokens.forEach((t) => {
      (h.main_indications || []).forEach((ind) => {
        if (norm(ind) === t) s += 3;
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

  // nombre de planta / alias (mín. 3 letras)
  if (PLANT_ALIASES[n] || Object.values(PLANT_ALIASES).some((arr) => arr.map(norm).includes(n))) {
    return true;
  }
  const herbs = [...loadHerbs(), ...SYNTHETIC_HERBS];
  const tokens = expandPlantTokens(n).filter((t) => t.length >= 3);
  for (const h of herbs) {
    for (const nm of herbNames(h)) {
      if (n === nm || tokens.includes(nm)) return true;
    }
  }
  // una sola palabra corta tipo nombre de planta (evita ir a SearXNG en seco)
  if (/^[a-záéíóúñ]{3,20}$/.test(n) && !/^(hola|casa|ayuda|limpiar|estado|gita|veda)$/.test(n)) {
    return 'maybe';
  }
  return false;
}

async function tryAyurveda(pregunta) {
  const n = norm(pregunta);
  if (!n) return null;


  // Botones post "no en catálogo"
  if (/^buscar (esta )?planta en internet$/.test(n) || /^buscar .+ en internet$/.test(n)) {
    const topic = n.replace(/^buscar\s+/i, '').replace(/\s+en internet$/, '').trim() || 'planta medicinal ayurveda';
    return {
      reply: '🌐 Buscaré referencias en internet sobre **' + topic + '**.',
      links: [],
      options: ['Plantas Ayurveda', 'ayuda'],
      _forceWeb: true,
      _topic: topic + ' planta medicinal ayurveda usos',
    };
  }
  if (/explicame esta planta|explícame esta planta|con ia$/.test(n)) {
    return {
      reply: 'Te orientaré sobre la planta con el conocimiento disponible (educativo, no médico).',
      links: [],
      options: ['Plantas Ayurveda', 'ayuda'],
      _forceAi: true,
      _aiEnrich: true,
    };
  }

  // Definición de Ayurveda
  if (isAyurvedaDefine(n)) {
    return {
      reply: AYURVEDA_DEFINITION,
      links: [
        { t: 'Ayurveda (Wikipedia)', u: 'https://es.wikipedia.org/wiki/Ayurveda' },
      ],
      options: ['háblame más sobre Ayurveda', 'Plantas Ayurveda', 'tulsi', 'ayuda'],
      image: '/imagenes/Restablecido.jpg',
      imageSize: 'state',
      imageAlt: 'Ayurveda',
      _aiEnrich: true,
    };
  }

  // Ampliar / “háblame más” → capa distinta (no repetir la intro) + opciones A/B/C
  if (isAyurvedaMore(n) || (isAyurvedaTopic(n) && /dosha|vata|pitta|kapha|dinacharya|principios|aliment/.test(n))) {
    const deep = deepenAyurveda(n);
    const menu =
      '\n\n---\n**¿Por dónde seguimos?** Elige o escribe:\n' +
      '**A)** Los tres doshas (Vata, Pitta, Kapha)\n' +
      '**B)** Rutina diaria (dinacharya)\n' +
      '**C)** Alimentación consciente\n' +
      '**D)** Plantas de la base Ayurveda\n\n' +
      'También puedes preguntar con tus palabras (ej. *háblame de Pitta* o *hierbas para la digestión*).';
    return {
      reply: deep.text + menu,
      links: [
        { t: 'Ayurveda (Wikipedia)', u: 'https://es.wikipedia.org/wiki/Ayurveda' },
      ],
      options: [
        'Los tres doshas en Ayurveda',
        'Rutina diaria dinacharya',
        'Alimentación según Ayurveda',
        'Plantas Ayurveda',
      ],
      image: '/imagenes/Restablecido.jpg',
      imageSize: 'state',
      imageAlt: 'Ayurveda',
      _aiEnrich: true,
      _forceAi: true,
      _deepTopic: deep.id,
    };
  }

  // Letras A/B/C/D o texto de opciones del menú (sin ir a búsqueda)
  {
    const letter = n.match(/^(?:opcion|opción)?\s*([abcd])\s*\)?$/) || n.match(/^([abcd])\s*[).:\-]/);
    const isA =
      (letter && letter[1] === 'a') ||
      /^(los tres doshas|tres doshas|doshas en ayurveda|vata pitta kapha)$/.test(n) ||
      (/dosha/.test(n) && !/planta/.test(n));
    const isB =
      (letter && letter[1] === 'b') ||
      /^(rutina diaria|dinacharya|rutina diaria dinacharya)$/.test(n) ||
      (/\bdinacharya\b|\brutina diaria\b/.test(n) && !/planta/.test(n));
    const isC =
      (letter && letter[1] === 'c') ||
      /^(alimentacion segun ayurveda|alimentación según ayurveda|alimentacion consciente|alimentación consciente)$/.test(
        n
      ) ||
      (/\baliment/.test(n) && /ayur|consciente/.test(n));
    const isD =
      (letter && letter[1] === 'd') ||
      /plantas de la base|base ayurveda|plantas ayurveda|catalogo de plantas|catálogo de plantas/.test(n) ||
      n === 'plantas ayurveda' ||
      n === 'd) plantas de la base ayurveda';

    if (isD) {
      // mismo destino que “Plantas Ayurveda”
      return {
        reply:
          '🌿 **Plantas Ayurveda**\n\n' +
          'Escribe el **nombre** de una planta (ej. *tulsi*, *ashwagandha*, *triphala*) y te muestro la ficha de la base local.\n\n' +
          'También puedes pedir *Plantas Ayurveda* para ver orientación general.\n\n' +
          '_Uso educativo; no sustituye consejo médico._',
        links: [],
        options: ['tulsi', 'ashwagandha', 'neem', 'Plantas Ayurveda', 'ayuda'],
        image: '/imagenes/Restablecido.jpg',
        imageSize: 'state',
        imageAlt: 'Plantas',
      };
    }

    let pick = null;
    if (isA) pick = AYURVEDA_DEEPEN[0];
    else if (isB) pick = AYURVEDA_DEEPEN[1];
    else if (isC) pick = AYURVEDA_DEEPEN[2];

    if (pick) {
      const menu =
        '\n\n---\n**¿Por dónde seguimos?** Elige letra o escribe el tema:\n' +
        '**A)** Doshas  **B)** Dinacharya  **C)** Alimentación  **D)** Plantas de la base Ayurveda';
      return {
        reply: pick.text + menu,
        links: [],
        options: [
          'Los tres doshas en Ayurveda',
          'Rutina diaria dinacharya',
          'Alimentación según Ayurveda',
          'Plantas Ayurveda',
        ],
        _aiEnrich: true,
        _forceAi: true,
        _deepTopic: pick.id,
      };
    }
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
  if (!kind || kind === 'define') {
    if (kind === 'define') {
      return {
        reply: AYURVEDA_DEFINITION,
        links: [{ t: 'Ayurveda (Wikipedia)', u: 'https://es.wikipedia.org/wiki/Ayurveda' }],
        options: ['Plantas Ayurveda', 'tulsi', 'ashwagandha', 'ayuda'],
      };
    }
    return null;
  }

  const herbs = [...loadHerbs(), ...SYNTHETIC_HERBS];
  if (!herbs.length) return null;

  const ranked = herbs
    .map((h) => ({ h, s: scoreHerb(h, n) }))
    .filter((x) => x.s >= 70)
    .sort((a, b) => b.s - a.s);

  // No hay ficha local → IA + botones de internet (sin volcar SearXNG solo)
  if (!ranked.length) {
    return {
      reply:
        '🌿 **Planta no encontrada en la base local**\n\n' +
        'No hallé **«' +
        (pregunta || n) +
        '»** entre las ~360 fichas áyurveda del catálogo Vimana.\n\n' +
        'Puedo orientarte con la **IA** o puedes abrir una **búsqueda en internet**.\n\n' +
        '_Uso educativo; no sustituye consejo médico._',
      links: [],
      options: [
        'Explícame esta planta con IA',
        'Buscar esta planta en internet',
        'Plantas Ayurveda',
        'tulsi',
        'ayuda',
      ],
      _plantMissing: n,
      _forceAi: true,
      _aiEnrich: true,
    };
  }

  const top = ranked[0];
  if (/\b(plantas medicinales|hierbas|herbolaria|catalogo|catálogo)\b/.test(n) && top.s < 80) {
    const sample = loadHerbs()
      .slice(0, 8)
      .map((h) => h.name)
      .join(', ');
    return {
      reply:
        '🌿 **Catálogo de plantas (Áyurveda)**\n\n' +
        'Escribe el **nombre** de la planta.\n\nEjemplos: ' +
        sample +
        '…',
      links: [],
      options: loadHerbs().slice(0, 4).map((h) => h.name),
    };
  }

  let reply = formatHerb(top.h);
  const related = ranked.slice(1, 3).map((x) => x.h.name || x.h.english_name);
  if (related.length) reply += '\n\n**Otras cercanas:** ' + related.join(', ');
  reply +=
    '\n\nSi buscas otra planta, escribe su nombre. Debajo puedes abrir búsqueda en internet si quieres más referencias.';

  return {
    reply,
    links: top.h.link ? [{ t: 'Ficha / referencia', u: top.h.link }] : [],
    options: [
      ...related.slice(0, 2),
      'Buscar ' + (top.h.english_name || top.h.name) + ' en internet',
      'Plantas Ayurveda',
      'ayuda',
    ],
  };
}

module.exports = { tryAyurveda, loadHerbs, isPlantQuery };
