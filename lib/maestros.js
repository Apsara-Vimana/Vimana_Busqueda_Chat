/**
 * Maestros espirituales — ficha local positiva + foto.
 * Nunca críticas ni polarización; solo enseñanzas y servicio.
 */
function norm(t) {
  return String(t || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[¿?¡!.,;:()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const MASTERS = [
  {
    id: 'sathya-sai',
    names: ['sathya sai baba', 'sri sathya sai baba', 'sathya sai', 'sai baba', 'bhagavan sri sathya sai'],
    preferExact: true,
    title: 'Sri Sathya Sai Baba',
    image: '/imagenes/SathyaSaiBaba.jpg',
    years: '1926–2011 · Puttaparthi, India',
    summary:
      '**Sri Sathya Sai Baba** (Sathya Narayana Raju) es recordado por millones de devotos como un maestro de amor universal. Enseñó los valores eternos **Sathya** (Verdad), **Dharma** (Rectitud), **Shanti** (Paz), **Prema** (Amor) y **Ahimsa** (No violencia).\n\n' +
      'Su misión se orientó al servicio desinteresado: hospitales gratuitos, escuelas, proyectos de agua potable y el mensaje de que *«hay un solo Dios y Él es omnipresente»*. Invitaba a ver lo divino en cada ser y a transformar la vida cotidiana en práctica espiritual.\n\n' +
      'Los encuentros con devotos se describen a menudo como momentos de consuelo, orientación ética y un llamado a la pureza del corazón. En el proyecto **Vimana** se le honra como faro de amor y unidad.',
  },
  {
    id: 'shirdi-sai',
    names: ['shirdi sai baba', 'shirdi sai', 'sai de shirdi'],
    title: 'Shirdi Sai Baba',
    image: null,
    years: 'Shirdi, Maharashtra',
    summary:
      '**Shirdi Sai Baba** es venerado por hindúes y musulmanes como un santo de la unidad. Su mensaje central fue la fe (*Shraddha*) y la paciencia (*Saburi*), y la convivencia más allá de las diferencias de culto. Su vida en Shirdi inspiró servicio, humildad y confianza en lo divino.',
  },
  {
    id: 'yogananda',
    names: ['yogananda', 'paramahansa yogananda', 'paramhansa yogananda'],
    title: 'Paramahansa Yogananda',
    image: '/imagenes/Yogananda.jpg',
    years: '1893–1952',
    summary:
      '**Paramahansa Yogananda** llevó el Kriya Yoga y la meditación profunda a Occidente. Autor de *Autobiografía de un yogui*, enseñó la unidad de las religiones y la experiencia directa de Dios a través de la práctica interior, la disciplina amorosa y el servicio.',
  },
  {
    id: 'prabhupada',
    names: ['prabhupada', 'srila prabhupada', 'prabhupad', 'a.c. bhaktivedanta'],
    title: 'A. C. Bhaktivedanta Swami Prabhupada',
    image: '/imagenes/Prabhupada.jpg',
    years: '1896–1977',
    summary:
      '**Srila Prabhupada** difundió el *bhakti* (devoción a Krishna) y tradujo y comentó textos sagrados como el *Bhagavad-gītā tal como es*. Fundó ISKCON y enfatizó el canto del santo nombre, la pureza, el vegetarianismo consciente y la vida centrada en el amor a Dios.',
  },
  {
    id: 'sadhguru',
    names: ['sadhguru', 'sadh guru', 'jaggi vasudev', 'jaggi'],
    title: 'Sadhguru (Jaggi Vasudev)',
    image: '/imagenes/sadhguru.jpg',
    years: 'Contemporáneo · Isha Foundation',
    summary:
      '**Sadhguru** presenta el yoga como una tecnología interior para el bienestar y la consciencia. A través de Isha Foundation promueve prácticas meditativas, cuidado del planeta (proyectos ecológicos) y una mirada práctica hacia la transformación de uno mismo.',
  },
  {
    id: 'ramana',
    names: ['ramana maharshi', 'ramana', 'ramanamaharshi', 'bhagavan ramana'],
    title: 'Bhagavan Ramana Maharshi',
    image: '/imagenes/ramanamaharsh.jpg',
    years: '1879–1950 · Arunachala',
    summary:
      '**Ramana Maharshi** enseñó el camino de la autoindagación (*¿Quién soy yo?*). Desde la quietud de Arunachala, orientó a buscadores a reconocer el Ser más allá de la mente. Su silencio y su presencia son recordados como enseñanza viva de paz y claridad.',
  },
  {
    id: 'ramakrishna',
    names: ['ramakrishna', 'rama krishna', 'sri ramakrishna', 'paramahamsa ramakrishna'],
    title: 'Sri Ramakrishna Paramahamsa',
    image: '/imagenes/RamaKrishna.jpg',
    years: '1836–1886 · Dakshineswar',
    summary:
      '**Sri Ramakrishna** vivió una intensa devoción y experimentó diversos caminos espirituales, afirmando que todos conducen a la misma Verdad. Su vida inspiró a Swami Vivekananda y el ideal de armonía religiosa, pureza y amor a la Madre Divina.',
  },
  {
    id: 'ravi-shankar',
    names: ['ravi shankar', 'sri sri ravi shankar', 'ravishankar', 'sri sri'],
    title: 'Sri Sri Ravi Shankar',
    image: '/imagenes/ravishankar.jpg',
    years: 'Contemporáneo · Art of Living',
    summary:
      '**Sri Sri Ravi Shankar**, a través de *Art of Living*, comparte respiración, meditación y servicio humanitario. Su mensaje destaca la paz interior, el alivio del estrés y la construcción de comunidades basadas en valores humanos universales.',
  },
  {
    id: 'osho',
    names: ['osho', 'bhagwan shree rajneesh', 'rajneesh'],
    title: 'Osho',
    image: '/imagenes/osho.jpg',
    years: '1931–1990',
    summary:
      '**Osho** ofreció una visión contemporánea de la meditación, la celebración de la vida y la libertad interior. Sus discursos invitan a observar la mente, vivir con consciencia y descubrir la meditación en lo cotidiano, más allá de dogmas rígidos.',
  },
  {
    id: 'jesus',
    names: [
      'jesus',
      'jesús',
      'jesus de nazaret',
      'jesús de nazaret',
      'cristo',
      'jesucristo',
      'jesus cristo',
      'maestro jesus',
      'maestro jesús',
    ],
    title: 'Jesús de Nazaret',
    image: null,
    years: 'Tradición cristiana y mística universal',
    summary:
      '**Jesús de Nazaret** es honrado como Maestro de amor, perdón y unidad con el Padre. Sus enseñanzas —el Sermón del Monte, el amor al prójimo, la fe y la compasión— inspiran a devotos de muchas sendas. En la visión de Vimana se le reconoce como faro de **Prema** (amor divino) y ejemplo de servicio humilde.',
  },
  {
    id: 'saint-germain',
    names: [
      'saint germain',
      'san german',
      'san germán',
      'conde de saint germain',
      'maestro saint germain',
      'st germain',
      'st. germain',
    ],
    title: 'Saint Germain',
    image: null,
    years: 'Tradición de Maestros Ascendidos',
    summary:
      '**Saint Germain** es recordado en corrientes esotéricas y de Maestros Ascendidos como guardián de la llama violeta, la transformación y la libertad interior. Se le asocia con el mensaje de pureza, dominio del yo superior y el ideal de una Edad Dorada de hermandad. En Vimana se le menciona con respeto, centrando la atención en la elevación de la conciencia y el servicio.',
  },
];

function findMaster(pregunta) {
  const n = norm(pregunta);
  if (!n) return null;

  // Shirdi vs Sathya: preferir el más específico
  if (/shirdi/.test(n)) {
    return MASTERS.find((m) => m.id === 'shirdi-sai') || null;
  }

  let best = null;
  let bestScore = 0;
  for (const m of MASTERS) {
    for (const name of m.names) {
      if (n === name) return m;
      if (n.includes(name) && name.length >= 4) {
        const score = name.length + (m.id === 'sathya-sai' && /sai baba/.test(n) && !/shirdi/.test(n) ? 20 : 0);
        if (score > bestScore) {
          bestScore = score;
          best = m;
        }
      }
    }
  }
  return best;
}

function isMoreAbout(pregunta) {
  const n = norm(pregunta);
  return (
    /\bmas sobre\b|\bmás sobre\b|\bmas de\b|\bmás de\b/.test(n) ||
    /hablame mas|háblame más|quiero saber mas|quiero saber más|quiero que me hables|cuentame mas|cuéntame más/.test(n) ||
    /amplia|amplía|profundiza|enseñanzas de|su mision|su misión|obras de|milagros|lilas|prodigios|devotos/.test(n) ||
    /avatar sathya|avatar de sai/.test(n)
  );
}

function tryMaestros(pregunta) {
  const m = findMaster(pregunta);
  if (!m) return null;

  const n = norm(pregunta);
  const more = isMoreAbout(pregunta);

  // Solo "más sobre…" sin nombre claro → no aquí
  if (more && !m) return null;

  if (more) {
    return {
      _aiMaster: true,
      master: m,
      reply: null,
    };
  }

  const reply =
    `🕊️ **${m.title}**\n` +
    (m.years ? `_${m.years}_\n\n` : '\n') +
    m.summary +
    `\n\n_Ficha del proyecto Vimana — enfoque en enseñanzas y servicio._`;

  const out = {
    reply,
    links: [],
    options: [
      `más sobre ${m.title}`,
      'enseñanzas de este maestro',
      'Mensajes de Vimana',
      'ayuda',
    ],
    master: m,
  };
  if (m.image) {
    out.image = m.image;
    out.imageSize = 'card';
    out.imageAlt = m.title;
  }
  return out;
}

function masterAiContext(m, pregunta) {
  const n = norm(pregunta || '');
  const wantsLilas = /milagro|lila|prodigio|leela|experiencia|devoto|sanacion|sanación/.test(n);
  return (
    `Maestro de referencia: ${m.title}.\n` +
    `Ficha Vimana (base positiva):\n${m.summary}\n\n` +
    `Instrucciones estrictas para Urvashi Apsara Vimana:\n` +
    `- Responde en español, tono cálido, 3–6 párrafos si el usuario pide “más”.\n` +
    `- Amplía: enseñanzas, valores, misión de servicio, hospitales/escuelas/servicio si aplica, mensaje de unidad.\n` +
    (wantsLilas
      ? `- El usuario pide milagros/lilas/prodigios: puedes narrar relatos tradicionales de devotos de forma respetuosa (como tradición de fe), sin sensacionalismo ni polémica.\n`
      : `- Si encaja, menciona brevemente el impacto amoroso en la vida de los devotos.\n`) +
    `- Fuentes mentales de estilo: tradición oficial de enseñanzas y servicio (ej. valores Sai: Sathya, Dharma, Shanti, Prema, Ahimsa); nunca tabloides ni críticas.\n` +
    `- NUNCA críticas, escándalos, ataques ni “noticias negativas”.\n` +
    `- No digas que buscas en internet; habla como guía espiritual informada.\n` +
    `- Cierra invitando a vivir un valor (amor, verdad, servicio) en lo cotidiano.`
  );
}

module.exports = {
  tryMaestros,
  findMaster,
  isMoreAbout,
  masterAiContext,
  MASTERS,
};
