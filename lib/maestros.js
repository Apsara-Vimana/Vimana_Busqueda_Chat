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
  if (/shirdi/.test(n)) {
    return MASTERS.find((m) => m.id === 'shirdi-sai') || null;
  }
  let best = null;
  let bestScore = 0;
  for (const m of MASTERS) {
    for (const name of m.names) {
      if (n === name) return m;
      if (n.includes(name) && name.length >= 4) {
        const score =
          name.length +
          (m.id === 'sathya-sai' && /sai baba/.test(n) && !/shirdi/.test(n) ? 20 : 0);
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

function tryMaestros(pregunta) {
  const m = findMaster(pregunta);
  if (!m) return null;

  const more = isMoreAbout(pregunta);

  if (more) {
    const out = {
      _aiMaster: true,
      master: m,
      reply: expandLocal(m, pregunta),
    };
    if (m.image) {
      out.image = m.image;
      out.imageSize = 'card';
      out.imageAlt = m.title;
    }
    return out;
  }

  const reply =
    '🕊️ **' +
    m.title +
    '**\n' +
    (m.years ? '_' + m.years + '_\n\n' : '\n') +
    m.summary +
    '\n\n_Ficha del proyecto Vimana — enfoque en enseñanzas y servicio._';

  const out = {
    reply,
    links: [],
    options: [
      'más sobre ' + m.title,
      'enseñanzas de ' + m.title,
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
      ? '- Orientación sobre discursos/libros y cómo estudiarlos con el corazón.\n'
      : '') +
    '- NUNCA críticas ni escándalos.\n' +
    '- No digas que buscas en internet.\n'
  );
}

module.exports = {
  tryMaestros,
  findMaster,
  isMoreAbout,
  masterAiContext,
  MASTERS,
};
