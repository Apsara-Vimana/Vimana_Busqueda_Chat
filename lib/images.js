/**
 * Mapear consulta → imagen en public/imagenes/
 * Solo en contextos claros (maestros, álbumes, identidad, gracias explícitas).
 * size: hero | card | state
 */
function norm(t) {
  return String(t || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const BASE = '/imagenes/';

const RULES = [
  [/sathya\s*sai|sai\s*baba/, 'SathyaSaiBaba.jpg', 'card'],
  [/prabhupada|prabhupad/, 'Prabhupada.jpg', 'card'],
  [/sadhguru|sadh\s*guru|jaggi/, 'sadhguru.jpg', 'card'],
  [/yogananda|paramahansa/, 'Yogananda.jpg', 'card'],
  [/ramana\s*maharshi|ramanamaharsh|maharshi/, 'ramanamaharsh.jpg', 'card'],
  [/ravi\s*shankar|ravishankar/, 'ravishankar.jpg', 'card'],
  [/ramakrishna|rama\s*krishna/, 'RamaKrishna.jpg', 'card'],
  [/\bosho\b/, 'osho.jpg', 'card'],
  [/divinaversum/, 'divinaversum.png', 'card'],
  [/sat\s*chit\s*ananda|album ananda|álbum ananda/, 'SatChitAnanda.png', 'card'],
  [/\bsoham\b|\bsohan\b|\bso ham\b/, 'sohan.jpg', 'card'],
  [/\bsadhana\b/, 'sadhana.png', 'card'],
  [/\bpodcast vimana\b|\bpodcast\b/, 'podcast.png', 'card'],
  [/radio online|radios online/, 'R1.png', 'card'],
  [/proyecto vimana/, 'apsaravimana3.png', 'hero'],
  [/que es vimana music|qué es vimana music|vimana music es/, 'apsaravimana2.png', 'hero'],
  [/quien eres|quién eres|hablar con apsara|hola apsara/, 'apsaravimana2.png', 'hero'],
  [/^(que es vimana|qué es vimana)$/, 'apsaravimana3.png', 'hero'],
];

function isExplicitThanks(n) {
  // solo agradecimiento al asistente, no "gracia divina"
  if (/\bgracia divina\b|\bgracias a dios\b|\bpor la gracia\b/.test(n)) return false;
  return (
    /^(gracias|muchas gracias)(\s+apsara)?[!\.]*$/.test(n) ||
    /^gracias apsara\b/.test(n) ||
    /^te agradezco\b/.test(n) ||
    /^thank you\b/.test(n)
  );
}

function pickImage(pregunta) {
  const n = norm(pregunta);
  if (!n) return null;

  if (isExplicitThanks(n)) {
    return { src: BASE + 'gratitud.jpg', size: 'card', alt: 'gratitud' };
  }

  for (const [pat, file, size] of RULES) {
    if (pat.test(n)) {
      return { src: BASE + file, size, alt: file.replace(/\.[^.]+$/, '') };
    }
  }
  return null;
}

function stateImage(name) {
  const STATES = {
    atento: 'Atento.jpg',
    pensando: 'Pensando.jpg',
    reconectando: 'Reconectando.jpg',
    restablecido: 'Restablecido.jpg',
    sorprendido: 'Sorprendido.jpg',
    suspendido: 'suspendido.jpg',
  };
  const key = norm(name).replace(/\s+/g, '');
  const file = STATES[key];
  if (!file) return null;
  return { src: BASE + file, size: 'state', alt: name };
}

module.exports = { pickImage, stateImage };
