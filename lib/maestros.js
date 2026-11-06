/**
 * Maestros espirituales — ficha local positiva + foto (solo lista acordada).
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
    id: 'prema-sai',
    names: [
      'prema sai baba',
      'prema sai',
      'sri prema sai',
      'prema sai avatar',
      'avatar prema sai',
    ],
    title: 'Prema Sai Baba',
    image: null,
    years: 'Tradición Sai · Avatar de Prema (amor)',
    summary:
      '**Prema Sai Baba** es honrado en la tradición Sai como la expresión del **Prema** (Amor divino), anunciada en continuidad con la misión de amor de **Sri Sathya Sai Baba**. ' +
      'Se le asocia con el ideal de un tiempo de unidad, pureza del corazón y el triunfo del amor incondicional. ' +
      'En el proyecto **Vimana** se le menciona con respeto, centrando la atención en el **amor como práctica** y en los valores Sathya, Dharma, Shanti, Prema y Ahimsa.',
  },
  {
    id: 'sathya-sai',
    names: [
      'sathya sai baba',
      'sri sathya sai baba',
      'sathya sai',
      'sai baba',
      'bhagavan sri sathya sai',
    ],
    title: 'Sri Sathya Sai Baba',
    image: '/imagenes/SathyaSaiBaba.jpg',
    years: '1926–2011 · Puttaparthi, India',
    summary:
      '**Sri Sathya Sai Baba** (Sathya Narayana Raju) es recordado por millones de devotos como un maestro de amor universal. Enseñó los valores eternos **Sathya** (Verdad), **Dharma** (Rectitud), **Shanti** (Paz), **Prema** (Amor) y **Ahimsa** (No violencia).\n\n' +
      'Su misión se orientó al servicio desinteresado: hospitales gratuitos, escuelas, proyectos de agua potable y el mensaje de que *«hay un solo Dios y Él es omnipresente»*. Invitaba a ver lo divino en cada ser y a transformar la vida cotidiana en práctica espiritual.\n\n' +
      'Los encuentros con devotos se describen a menudo como momentos de consuelo, orientación ética y un llamado a la pureza del corazón. En el proyecto **Vimana** se le honra como faro de amor y unidad.',
    teachings:
      '**Enseñanzas centrales**\n\n' +
      '1. **Sathya, Dharma, Shanti, Prema, Ahimsa** — vivir la verdad, la rectitud, la paz, el amor y la no violencia en casa, el trabajo y la relación con todos.\n' +
      '2. **Servicio (Seva)** — “Manava seva es Madhava seva”: servir al ser humano es servir a Dios.\n' +
      '3. **Un solo Dios** — unidad de las religiones; el nombre divino y el pure love elevan el corazón.\n' +
      '4. **Transformación interior** — pureza de pensamiento, palabra y obra.',
  },
  {
    id: 'shirdi-sai',
    names: ['shirdi sai baba', 'shirdi sai', 'sai de shirdi'],
    title: 'Shirdi Sai Baba',
    image: null,
    years: 'Shirdi, Maharashtra',
    summary:
      '**Shirdi Sai Baba** es venerado por hindúes y musulmanes como un santo de la unidad. Su mensaje central fue la fe (*Shraddha*) y la paciencia (*Saburi*).',
  },
  {
    id: 'yogananda',
    names: ['yogananda', 'paramahansa yogananda', 'paramhansa yogananda'],
    title: 'Paramahansa Yogananda',
    image: '/imagenes/Yogananda.jpg',
    years: '1893–1952',
    summary:
      '**Paramahansa Yogananda** llevó el Kriya Yoga a Occidente. Autor de *Autobiografía de un yogui*, enseñó la unidad de las religiones y la experiencia directa de Dios.',
  },
  {
    id: 'prabhupada',
    names: ['prabhupada', 'srila prabhupada', 'prabhupad', 'a.c. bhaktivedanta'],
    title: 'A. C. Bhaktivedanta Swami Prabhupada',
    image: '/imagenes/Prabhupada.jpg',
    years: '1896–1977',
    summary:
      '**Srila Prabhupada** difundió el *bhakti* a Krishna y textos como el *Bhagavad-gītā tal como es*. Enfatizó el canto del santo nombre y la vida centrada en el amor a Dios.',
  },
  {
    id: 'sadhguru',
    names: ['sadhguru', 'sadh guru', 'jaggi vasudev', 'jaggi'],
    title: 'Sadhguru (Jaggi Vasudev)',
    image: '/imagenes/sadhguru.jpg',
    years: 'Contemporáneo · Isha Foundation',
    summary:
      '**Sadhguru** presenta el yoga como tecnología interior para el bienestar y la consciencia, con proyectos ecológicos y meditación.',
  },
  {
    id: 'ramana',
    names: ['ramana maharshi', 'ramana', 'ramanamaharshi', 'bhagavan ramana'],
    title: 'Bhagavan Ramana Maharshi',
    image: '/imagenes/ramanamaharsh.jpg',
    years: '1879–1950 · Arunachala',
    summary:
      '**Ramana Maharshi** enseñó la autoindagación (*¿Quién soy yo?*). Su silencio orientó a buscadores a reconocer el Ser más allá de la mente.',
  },
  {
    id: 'ramakrishna',
    names: ['ramakrishna', 'rama krishna', 'sri ramakrishna', 'paramahamsa ramakrishna'],
    title: 'Sri Ramakrishna Paramahamsa',
    image: '/imagenes/RamaKrishna.jpg',
    years: '1836–1886 · Dakshineswar',
    summary:
      '**Sri Ramakrishna** afirmó que todos los caminos conducen a la misma Verdad. Inspiró a Vivekananda y el ideal de armonía religiosa.',
  },
  {
    id: 'ravi-shankar',
    names: ['ravi shankar', 'sri sri ravi shankar', 'ravishankar', 'sri sri'],
    title: 'Sri Sri Ravi Shankar',
    image: '/imagenes/ravishankar.jpg',
    years: 'Contemporáneo · Art of Living',
    summary:
      '**Sri Sri Ravi Shankar** comparte respiración, meditación y servicio humanitario a través de Art of Living.',
  },
  {
    id: 'osho',
    names: ['osho', 'bhagwan shree rajneesh', 'rajneesh'],
    title: 'Osho',
    image: '/imagenes/osho.jpg',
    years: '1931–1990',
    summary:
      '**Osho** ofreció una visión contemporánea de la meditación y la celebración consciente de la vida.',
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
      '**Jesús de Nazaret** es honrado como Maestro de amor, perdón y unidad con el Padre. En Vimana se le reconoce como faro de Prema (amor divino).',
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
      '**Saint Germain** es recordado en corrientes de Maestros Ascendidos en relación con la llama violeta, la transformación y el ideal de hermandad.',
  },
];

function findMaster(pregunta) {
  const n = norm(pregunta);
  if (!n) return null;

  // Prioridad estricta: no confundir avatares Sai
  if (/prema\s*sai/.test(n)) {
    return MASTERS.find((m) => m.id === 'prema-sai') || null;
  }
  if (/shirdi/.test(n)) {
    return MASTERS.find((m) => m.id === 'shirdi-sai') || null;
  }
  if (/sathya\s*sai|sathya\s*narayana/.test(n)) {
    return MASTERS.find((m) => m.id === 'sathya-sai') || null;
  }

  let best = null;
  let bestScore = 0;
  for (const m of MASTERS) {
    for (const name of m.names) {
      if (n === name) return m;
      if (n.includes(name) && name.length >= 4) {
        let score = name.length;
        // "sai baba" solo → Sathya (contexto Vimana), nunca Prema ni Shirdi
        if (m.id === 'sathya-sai' && /(^|\s)sai baba(\s|$)/.test(n) && !/prema|shirdi/.test(n)) {
          score += 15;
        }
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
    /hablame mas|háblame más|quiero saber mas|quiero saber más|quiero que me hables|cuentame mas|cuéntame más/.test(
      n
    ) ||
    /amplia|amplía|profundiza|enseñanzas de|ensenanzas de|su mision|su misión|obras de|milagros|lilas|prodigios|devotos|libro|libros|discurso|discursos|vahini/.test(
      n
    ) ||
    /avatar sathya|avatar de sai|netamente|aparte de eso/.test(n)
  );
}

function expandLocal(m, pregunta) {
  const n = norm(pregunta || '');
  const teach = m.teachings || '';
  let body =
    '🕊️ **' +
    m.title +
    '**\n' +
    (m.years ? '_' + m.years + '_\n\n' : '\n') +
    m.summary;

  if (/libro|libros|discurso|discursos|escritura|vahini|publicacion|publicación/.test(n)) {
    body +=
      '\n\n**Libros y discursos (orientación)**\n\n' +
      'En la tradición de este maestro existen discursos, cartas y textos devocionales. ' +
      'En el caso de Sri Sathya Sai Baba se conocen series de discursos, las *Vahinis* y compilaciones sobre valores humanos. ' +
      'Prioriza fuentes oficiales o centros reconocidos y orienta la lectura a la práctica diaria.';
  } else if (/lila|lilas|leela|milagro|prodigio|vibhuti|manifestacion|manifestación/.test(n)) {
    body +=
      '\n\n**Lilas y signos de amor (tradición de los devotos)**\n\n' +
      'Muchos devotos narran *lilas* vividas como expresión de amor y protección divina. ' +
      'En Vimana se comparten con respeto, como inspiración a la fe y al servicio — no como espectáculo. ' +
      'Lo esencial es transformar el carácter: pureza, servicio y ver lo divino en todos.';
  } else if (teach) {
    body += '\n\n' + teach;
  }

  body +=
    '\n\n_Canal de reflexiones Vimana:_ https://whatsapp.com/channel/0029Vb7JnG2LtOj4YBb16905';
  return body;
}

function classifyMasterQuery(pregunta) {
  const n = norm(pregunta);
  // lista general de libros/discursos
  if (
    /^(discursos|libros) de /.test(n) ||
    /discursos de sai|libros de sai|vahini|que libros|qué libros|que discursos|qué discursos/.test(n)
  ) {
    if (
      /sobre el |sobre la |acerca de |del dharma|de la paz|de prema|del karma|sobre dharma|sobre prema|tema /.test(
        n
      )
    ) {
      return 'topic';
    }
    return 'books';
  }
  if (/discurso|discursos|libro|libros|vahini/.test(n) && /sobre |acerca |tema |dharma|prema|shanti|ahimsa|karma|lila/.test(n)) {
    return 'topic';
  }
  if (isMoreAbout(pregunta)) return 'more';
  return 'bio';
}

function tryMaestros(pregunta) {
  const m = findMaster(pregunta);
  if (!m) return null;

  const kind = classifyMasterQuery(pregunta);

  // Libros / discursos en general → orientación a textos (sin botones, sin IA obligatoria)
  if (kind === 'books') {
    const reply = expandLocal(m, pregunta + ' libros discursos');
    const out = { reply, links: [], options: [], master: m };
    if (m.image) {
      out.image = m.image;
      out.imageSize = 'card';
      out.imageAlt = m.title;
    }
    return out;
  }

  // Tema concreto de discurso / “más sobre” / enseñanzas → IA
  if (kind === 'topic' || kind === 'more') {
    const out = {
      _aiMaster: true,
      master: m,
      reply: expandLocal(m, pregunta),
      options: [],
    };
    if (m.image) {
      out.image = m.image;
      out.imageSize = 'card';
      out.imageAlt = m.title;
    }
    return out;
  }

  // Bio corta
  const reply =
    '🕊️ **' +
    m.title +
    '**\n' +
    (m.years ? '_' + m.years + '_\n\n' : '\n') +
    m.summary +
    '\n\n_Ficha del proyecto Vimana — enfoque en enseñanzas y servicio._';

  const out = { reply, links: [], options: [], master: m };
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
  const wantsBooks = /libro|discurso|vahini|escritura/.test(n);
  return (
    'Maestro de referencia: ' +
    m.title +
    '.\nFicha Vimana:\n' +
    m.summary +
    '\n\nInstrucciones para Urvashi Apsara Vimana:\n' +
    '- Español, cálido, 3–6 párrafos si piden “más”.\n' +
    '- Amplía enseñanzas, valores y misión de servicio.\n' +
    (wantsLilas
      ? '- Incluye relatos tradicionales de lilas con respeto, sin polémica.\n'
      : '') +
    (wantsBooks
      ? '- Si piden un tema de discurso, desarrolla ese tema (dharma, amor, servicio…) con el espíritu de sus enseñanzas, 4–8 párrafos.\n'
      : '') +
    '- NUNCA críticas ni escándalos.\n' +
    '- No digas que buscas en internet.\n'
  );
}

module.exports = {
  tryMaestros,
  findMaster,
  isMoreAbout,
  classifyMasterQuery,
  masterAiContext,
  MASTERS,
};
