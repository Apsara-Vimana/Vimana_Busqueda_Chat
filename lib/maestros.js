/**
 * Maestros espirituales — ficha local positiva + foto (solo lista acordada).
 * Nunca solo bio de una línea: siempre enseñanzas; "más" → IA o texto ampliado.
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
    teachings:
      '**Enseñanzas y enfoque**\n\n' +
      '1. **Prema (Amor divino)** — el amor incondicional como centro de la vida espiritual.\n' +
      '2. **Continuidad de la misión Sai** — valores Sathya, Dharma, Shanti, Prema y Ahimsa.\n' +
      '3. **Unidad** — ver lo divino en todos y vivir con pureza de corazón.\n' +
      '4. **Servicio y transformación interior** — el amor se expresa en el trato cotidiano.',
    official: [
      { t: 'Sitio Sathya Sai (tradición)', u: 'https://www.sathyasai.org/' },
    ],
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
    official: [
      { t: 'Sathya Sai Organization', u: 'https://www.sathyasai.org/' },
      { t: 'Sri Sathya Sai Central Trust', u: 'https://www.srisathyasai.org.in/' },
    ],
  },
  {
    id: 'shirdi-sai',
    names: ['shirdi sai baba', 'shirdi sai', 'sai de shirdi'],
    title: 'Shirdi Sai Baba',
    image: null,
    years: 'Shirdi, Maharashtra',
    summary:
      '**Shirdi Sai Baba** es venerado por hindúes y musulmanes como un santo de la unidad. Su mensaje central fue la fe (*Shraddha*) y la paciencia (*Saburi*).',
    teachings:
      '**Enseñanzas centrales**\n\n' +
      '1. **Shraddha (fe)** — confianza viva en lo divino.\n' +
      '2. **Saburi (paciencia)** — perseverar sin agitación.\n' +
      '3. **Unidad de religiones** — respetado por hindúes y musulmanes; un solo Dios.\n' +
      '4. **Vida sencilla y servicio** — humildad, caridad y presencia del santo en lo cotidiano.',
    official: [
      { t: 'Shri Saibaba Sansthan Trust, Shirdi', u: 'https://www.sai.org.in/' },
    ],
  },
  {
    id: 'yogananda',
    names: ['yogananda', 'paramahansa yogananda', 'paramhansa yogananda'],
    title: 'Paramahansa Yogananda',
    image: '/imagenes/Yogananda.jpg',
    years: '1893–1952',
    summary:
      '**Paramahansa Yogananda** llevó el Kriya Yoga a Occidente. Autor de *Autobiografía de un yogui*, enseñó la unidad de las religiones y la experiencia directa de Dios.',
    teachings:
      '**Enseñanzas centrales**\n\n' +
      '1. **Kriya Yoga** — ciencia de la meditación y el control de la energía vital.\n' +
      '2. **Autobiografía de un yogui** — inspiración para buscar a Dios en la experiencia directa.\n' +
      '3. **Unidad de las religiones** — Cristo y Krishna como expresiones de la misma Verdad.\n' +
      '4. **Vida equilibrada** — meditación, trabajo y servicio en el mundo.',
    official: [
      { t: 'Self-Realization Fellowship (SRF)', u: 'https://yogananda.org/' },
      { t: 'Yogoda Satsanga Society of India', u: 'https://yssofindia.org/' },
    ],
  },
  {
    id: 'prabhupada',
    names: ['prabhupada', 'srila prabhupada', 'prabhupad', 'a.c. bhaktivedanta'],
    title: 'A. C. Bhaktivedanta Swami Prabhupada',
    image: '/imagenes/Prabhupada.jpg',
    years: '1896–1977',
    summary:
      '**Srila Prabhupada** difundió el *bhakti* a Krishna y textos como el *Bhagavad-gītā tal como es*. Enfatizó el canto del santo nombre y la vida centrada en el amor a Dios.',
    teachings:
      '**Enseñanzas centrales**\n\n' +
      '1. **Bhakti** — amor devocional a Krishna como Personalidad Suprema.\n' +
      '2. **Santo nombre** — canto del santo nombre como práctica esencial de la era.\n' +
      '3. **Escrituras** — Bhagavad-gītā y Bhāgavatam como guía de vida.\n' +
      '4. **Comunidad y pureza** — vida centrada en el servicio y la consciencia de Dios.',
    official: [
      { t: 'ISKCON', u: 'https://www.iskcon.org/' },
      { t: 'Bhaktivedanta Book Trust', u: 'https://www.bbt.org/' },
    ],
  },
  {
    id: 'sadhguru',
    names: ['sadhguru', 'sadh guru', 'jaggi vasudev', 'jaggi'],
    title: 'Sadhguru (Jaggi Vasudev)',
    image: '/imagenes/sadhguru.jpg',
    years: 'Contemporáneo · Isha Foundation',
    summary:
      '**Sadhguru** presenta el yoga como tecnología interior para el bienestar y la consciencia, con proyectos ecológicos y meditación.',
    teachings:
      '**Enseñanzas centrales**\n\n' +
      '1. **Yoga como método** — herramientas interiores para bienestar, no solo creencia.\n' +
      '2. **Responsabilidad interior** — la transformación empieza en uno mismo.\n' +
      '3. **Ecología y servicio** — cuidar la tierra como parte del dharma.\n' +
      '4. **Meditación y consciencia** — vivir con atención plena en lo cotidiano.',
    official: [
      { t: 'Isha Foundation / Sadhguru', u: 'https://isha.sadhguru.org/' },
      { t: 'Sadhguru (oficial)', u: 'https://sadhguru.org/' },
    ],
  },
  {
    id: 'ramana',
    names: ['ramana maharshi', 'ramana', 'ramanamaharshi', 'bhagavan ramana'],
    title: 'Bhagavan Ramana Maharshi',
    image: '/imagenes/ramanamaharsh.jpg',
    years: '1879–1950 · Arunachala',
    summary:
      '**Ramana Maharshi** enseñó la autoindagación (*¿Quién soy yo?*). Su silencio orientó a buscadores a reconocer el Ser más allá de la mente.',
    teachings:
      '**Enseñanzas centrales**\n\n' +
      '1. **Autoindagación** — la pregunta «¿Quién soy yo?» para reconocer el Ser.\n' +
      '2. **Silencio** — la enseñanza más profunda a menudo se transmite en quietud.\n' +
      '3. **El Ser (Atman)** — más allá de cuerpo y mente; no nace ni muere.\n' +
      '4. **Rendición** — confiar y soltar el ego en el Ser.',
    official: [
      { t: 'Sri Ramanasramam', u: 'https://www.sriramanamaharshi.org/' },
    ],
  },
  {
    id: 'ramakrishna',
    names: ['ramakrishna', 'rama krishna', 'sri ramakrishna', 'paramahamsa ramakrishna'],
    title: 'Sri Ramakrishna Paramahamsa',
    image: '/imagenes/RamaKrishna.jpg',
    years: '1836–1886 · Dakshineswar',
    summary:
      '**Sri Ramakrishna** afirmó que todos los caminos conducen a la misma Verdad. Inspiró a Vivekananda y el ideal de armonía religiosa.',
    teachings:
      '**Enseñanzas centrales**\n\n' +
      '1. **Todos los caminos llevan a Dios** — armonía entre religiones y senderos.\n' +
      '2. **Devoción intensa** — anhelo sincero del corazón por lo divino.\n' +
      '3. **Renuncia interior** — vivir en el mundo sin apego ciego.\n' +
      '4. **Experiencia directa** — la Verdad se realiza, no solo se discute.',
    official: [
      { t: 'Belur Math / Ramakrishna Mission', u: 'https://belurmath.org/' },
    ],
  },
  {
    id: 'ravi-shankar',
    names: [
      'sri sri ravi shankar',
      'sri sri',
      'art of living',
      'arte de vivir',
      'ravi shankar art of living',
      'ravishankar',
    ],
    title: 'Sri Sri Ravi Shankar',
    image: '/imagenes/ravishankar.jpg',
    years: 'Contemporáneo · Art of Living',
    summary:
      '**Sri Sri Ravi Shankar** es el fundador de **Art of Living** (El Arte de Vivir). Enseña técnicas de respiración, meditación y servicio para reducir el estrés y cultivar paz interior y social.',
    teachings:
      '**Enseñanzas que promueve**\n\n' +
      '1. **Sudarshan Kriya** — ritmo de respiración que calma la mente y libera estrés emocional.\n' +
      '2. **Respiración y meditación diarias** — pocos minutos al día para claridad y equilibrio.\n' +
      '3. **Servicio humanitario** — voluntariado, educación y ayuda en catástrofes.\n' +
      '4. **Valores humanos** — paz, compasión, una sola familia humana.\n' +
      '5. **Vida sin estrés** — vivir con serenidad en medio de las responsabilidades.\n\n' +
      'Sus programas combinan conocimiento védico con un lenguaje accesible a cualquier cultura o religión.',
    official: [
      { t: 'Art of Living (oficial)', u: 'https://www.artofliving.org/' },
      { t: 'Art of Living — España / programas', u: 'https://www.artofliving.org/es-es' },
      { t: 'Sri Sri Ravi Shankar', u: 'https://www.srisriravishankar.org/' },
    ],
  },
  {
    id: 'osho',
    names: ['osho', 'bhagwan shree rajneesh', 'rajneesh'],
    title: 'Osho',
    image: '/imagenes/osho.jpg',
    years: '1931–1990',
    summary:
      '**Osho** ofreció una visión contemporánea de la meditación y la celebración consciente de la vida.',
    teachings:
      '**Enseñanzas centrales**\n\n' +
      '1. **Meditación** — muchas técnicas para distintos temperamentos.\n' +
      '2. **Celebración de la vida** — espiritualidad no es negación seca del mundo.\n' +
      '3. **Consciencia** — observar la mente sin identificarse con ella.\n' +
      '4. **Libertad interior** — soltar condicionamientos que oprimen el ser.',
    official: [
      { t: 'Osho International', u: 'https://www.osho.com/' },
    ],
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
    teachings:
      '**Enseñanzas centrales**\n\n' +
      '1. **Amor y perdón** — amar al prójimo y perdonar de corazón.\n' +
      '2. **Reino interior** — el Reino de Dios está dentro de vosotros.\n' +
      '3. **Humildad y servicio** — el mayor es quien sirve.\n' +
      '4. **Unidad con el Padre** — vivir en comunión con lo divino.',
    official: [],
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
    teachings:
      '**Enseñanzas y enfoque**\n\n' +
      '1. **Llama violeta** — símbolo de transformación y purificación interior.\n' +
      '2. **Libertad y alivio kármico** — elevar la consciencia con responsabilidad.\n' +
      '3. **Hermandad** — ideal de unidad entre seres y naciones.\n' +
      '4. **Maestría personal** — vivir con dignidad, verdad y servicio.',
    official: [],
  },
];

function isAmbiguousRaviShankar(n) {
  if (!/ravi\s*shankar|ravishankar/.test(n)) return false;
  if (/sri\s*sri|art of living|arte de vivir|arte de la vida/.test(n)) return false;
  if (/sitar|musico|músico|musica|música|raga|sitarista|beatles|george harrison/.test(n))
    return false;
  return true;
}

function findMaster(pregunta) {
  const n = norm(pregunta);
  if (!n) return null;

  if (/prema\s*sai/.test(n)) return MASTERS.find((m) => m.id === 'prema-sai') || null;
  if (/shirdi/.test(n)) return MASTERS.find((m) => m.id === 'shirdi-sai') || null;
  if (/sathya\s*sai|sathya\s*narayana/.test(n))
    return MASTERS.find((m) => m.id === 'sathya-sai') || null;

  if (/sri\s*sri\s*ravi|art of living|arte de vivir|arte de la vida/.test(n)) {
    return MASTERS.find((m) => m.id === 'ravi-shankar') || null;
  }
  if (
    /ravi\s*shankar/.test(n) &&
    /sitar|musico|músico|musica|música|raga|sitarista|beatles/.test(n)
  ) {
    return null;
  }

  let best = null;
  let bestScore = 0;
  for (const m of MASTERS) {
    for (const name of m.names) {
      if (n === name) return m;
      if (n.includes(name) && name.length >= 4) {
        let score = name.length;
        if (
          m.id === 'sathya-sai' &&
          /(^|\s)sai baba(\s|$)/.test(n) &&
          !/prema|shirdi/.test(n)
        ) {
          score += 15;
        }
        if (m.id === 'ravi-shankar' && isAmbiguousRaviShankar(n)) continue;
        if (score > bestScore) {
          bestScore = score;
          best = m;
        }
      }
    }
  }
  return best;
}

function isContactQuery(pregunta) {
  const n = norm(pregunta);
  return /contacto|contactos|sitio web|sitios web|pagina oficial|página oficial|web oficial|pagina web|página web|redes del maestro|link oficial|enlace oficial|donde encontrar|dónde encontrar|como contactar|cómo contactar/.test(
    n
  );
}

function isMoreAbout(pregunta) {

  const n = norm(pregunta);
  return (
    /\bmas sobre\b|\bmás sobre\b|\bmas de\b|\bmás de\b|\bconocer mas\b|\bconocer más\b/.test(
      n
    ) ||
    /hablame mas|háblame más|quiero saber mas|quiero saber más|quiero conocer|quiero que me hables|cuentame mas|cuéntame más|interesante/.test(
      n
    ) ||
    /amplia|amplía|profundiza|ense[nñ]anza|promueve|su mision|su misión|obras de|milagros|lilas|prodigios|devotos|libro|libros|discurso|discursos|vahini/.test(
      n
    ) ||
    /avatar sathya|avatar de sai|netamente|aparte de eso|dime mas|dime más|explica mas|explica más/.test(
      n
    )
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

  if (
    /libro|libros|discurso|discursos|escritura|vahini|publicacion|publicación/.test(n) &&
    /sai/.test(norm(m.title))
  ) {
    body +=
      '\n\n**Libros y discursos (orientación)**\n\n' +
      'En la tradición de este maestro existen discursos, cartas y textos devocionales. ' +
      'En el caso de Sri Sathya Sai Baba se conocen series de discursos, las *Vahinis* y compilaciones sobre valores humanos. ' +
      'Prioriza fuentes oficiales o centros reconocidos y orienta la lectura a la práctica diaria.';
  } else if (
    /lila|lilas|leela|milagro|prodigio|vibhuti|manifestacion|manifestación/.test(n)
  ) {
    body +=
      '\n\n**Lilas y signos de amor (tradición de los devotos)**\n\n' +
      'Muchos devotos narran *lilas* vividas como expresión de amor y protección divina. ' +
      'En Vimana se comparten con respeto, como inspiración a la fe y al servicio — no como espectáculo. ' +
      'Lo esencial es transformar el carácter: pureza, servicio y ver lo divino en todos.';
  }

  if (teach) {
    body += '\n\n' + teach;
  }

  body +=
    '\n\n_Canal de reflexiones Vimana:_ https://whatsapp.com/channel/0029Vb7JnG2LtOj4YBb16905';
  return body;
}

function classifyMasterQuery(pregunta) {
  const n = norm(pregunta);
  if (isContactQuery(pregunta)) return 'contact';
  if (
    /^(discursos|libros) de /.test(n) ||
    /discursos de sai|libros de sai|vahini|que libros|qué libros|que discursos|qué discursos/.test(
      n
    )
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
  if (
    /discurso|discursos|libro|libros|vahini/.test(n) &&
    /sobre |acerca |tema |dharma|prema|shanti|ahimsa|karma|lila/.test(n)
  ) {
    return 'topic';
  }
  if (
    /ense[nñ]anza|promueve|filosofia|filosofía|practica|práctica|sudarshan|kriya|meditacion|meditación/.test(
      n
    )
  ) {
    return 'more';
  }
  if (isMoreAbout(pregunta)) return 'more';
  return 'bio';
}

function tryMaestros(pregunta) {
  const n0 = norm(pregunta);

  if (isAmbiguousRaviShankar(n0)) {
    return {
      reply:
        '🕊️ **¿A qué Ravi Shankar te refieres?**\n\n' +
        'Hay dos figuras muy conocidas con ese nombre:\n\n' +
        '1. **Sri Sri Ravi Shankar** — maestro espiritual, fundador de *Art of Living* (El Arte de Vivir). Está en la base de Vimana.\n' +
        '2. **Ravi Shankar** — virtuoso del **sitar**, músico clásico indio (no es la misma persona).\n\n' +
        '**Escoge o escribe** el que buscas.',
      links: [],
      options: [
        'Sri Sri Ravi Shankar (Art of Living)',
        'Ravi Shankar músico del sitar',
      ],
      image: '/imagenes/Pensando.jpg',
      imageSize: 'state',
      imageAlt: 'Pensando',
      _askChoice: true,
    };
  }

  const m = findMaster(pregunta);
  if (!m) return null;

  let kind = classifyMasterQuery(pregunta);
  const nq = norm(pregunta);
  const onlyWho =
    /^(quien es|quién es|quien fue|quién fue|que es|qué es)\s+.+/.test(nq) &&
    nq.split(/\s+/).length <= 8;
  if (kind === 'bio' && !onlyWho) {
    kind = 'more';
  }

  if (kind === 'contact') {
    const links = Array.isArray(m.official) ? m.official.slice() : [];
    let reply =
      '🌐 **Sitios y contactos oficiales — ' +
      m.title +
      '**\n\n' +
      'Para información fiable, prioriza estos canales oficiales o reconocidos:\n\n';
    if (links.length) {
      links.forEach((L, i) => {
        reply += (i + 1) + '. **' + L.t + '**\n';
      });
      reply +=
        '\n_Usa los enlaces de abajo. Evita páginas dudosas o no oficiales._';
    } else {
      reply +=
        'No hay una ficha de enlaces locales para este nombre. Busca el sitio oficial del linaje o la organización reconocida asociada a **' +
        m.title +
        '**.';
    }
    reply +=
      '\n\n_Proyecto Vimana no administra estos sitios; se orienta a fuentes de la tradición del maestro._';
    const out = { reply, links, options: [], master: m };
    if (m.image) {
      out.image = m.image;
      out.imageSize = 'card';
      out.imageAlt = m.title;
    }
    return out;
  }

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

  // Primera ficha: summary + enseñanzas (nunca solo una línea)
  const reply = expandLocal(m, pregunta);
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
  const wantsLilas = /milagro|lila|prodigio|leela|experiencia|devoto|sanacion|sanación/.test(
    n
  );
  const wantsBooks = /libro|discurso|vahini|escritura/.test(n);
  return (
    'Maestro de referencia: ' +
    m.title +
    '.\nFicha Vimana:\n' +
    m.summary +
    '\n\nEnseñanzas locales:\n' +
    (m.teachings || '') +
    '\n\nInstrucciones para Urvashi Apsara Vimana:\n' +
    '- Español, cálido, 4–8 párrafos. NO repitas solo una bio corta.\n' +
    '- Desarrolla enseñanzas concretas, prácticas y valores según lo que pregunte el usuario.\n' +
    '- Si es Sri Sri Ravi Shankar: Sudarshan Kriya, respiración, servicio, Art of Living.\n' +
    (wantsLilas
      ? '- Incluye relatos tradicionales de lilas con respeto, sin polémica.\n'
      : '') +
    (wantsBooks
      ? '- Si piden un tema de discurso, desarrolla ese tema con el espíritu de sus enseñanzas.\n'
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
