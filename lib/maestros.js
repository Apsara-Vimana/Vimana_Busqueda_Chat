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
    image: '/imagenes/SathyaSaiBaba.jpg',
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
    /mas (sobre|de)|más (sobre|de)|hablame mas|háblame más|quiero saber mas|quiero que me hables|cuentame mas|cuéntame más|amplia|profundiza|enseñanzas de|su mision|su misión|obras de|devotos/.test(
      n
    ) || /^(mas|más)$/.test(n)
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

  return {
    reply,
    links: [],
    options: [
      `más sobre ${m.title}`,
      'enseñanzas de este maestro',
      'ayuda',
    ],
    image: m.image,
    imageSize: 'card',
    imageAlt: m.title,
    master: m,
  };
}

function masterAiContext(m) {
  return (
    `Maestro de referencia: ${m.title}.\n` +
    `Contexto positivo (úsalo y amplía solo en tono respetuoso y elevado):\n${m.summary}\n\n` +
    `Instrucciones estrictas:\n` +
    `- Háblale al usuario como **Urvashi Apsara Vimana**.\n` +
    `- Solo enseñanzas, misión de servicio, valores, anécdotas edificantes de devoción y unidad.\n` +
    `- NUNCA críticas, escándalos, polémicas, ni “noticias negativas”.\n` +
    `- Si no sabes un detalle histórico, habla de los valores universales que inspiró.\n` +
    `- Español, cálido, 2–4 párrafos.`
  );
}

module.exports = {
  tryMaestros,
  findMaster,
  isMoreAbout,
  masterAiContext,
  MASTERS,
};
