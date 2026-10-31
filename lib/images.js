/**
 * Mapear consulta → imagen en public/imagenes/
 * size: 'hero' (~1/4) | 'card' (<1/4) | 'state' (redondo pequeño)
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

/** [patrones regex o string, archivo, size] — orden importa (más específico primero) */
const RULES = [
  [/sathya\s*sai|sai\s*baba|sathya sai baba/, 'SathyaSaiBaba.jpg', 'card'],
  [/prabhupada|prabhupad/, 'Prabhupada.jpg', 'card'],
  [/sadhguru|sadh\s*guru|jaggi/, 'sadhguru.jpg', 'card'],
  [/yogananda|paramahansa/, 'Yogananda.jpg', 'card'],
  [/ramana\s*maharshi|ramanamaharsh|maharshi/, 'ramanamaharsh.jpg', 'card'],
  [/ravi\s*shankar|ravishankar/, 'ravishankar.jpg', 'card'],
  [/ramakrishna|rama\s*krishna/, 'RamaKrishna.jpg', 'card'],
  [/\bosho\b/, 'osho.jpg', 'card'],
  [/divinaversum/, 'divinaversum.png', 'card'],
  [/sat\s*chit\s*ananda|album ananda|álbum ananda|\bananda\b/, 'SatChitAnanda.png', 'card'],
  [/\bsoham\b|\bsohan\b|\bso ham\b/, 'sohan.jpg', 'card'],
  [/\bsadhana\b/, 'sadhana.png', 'card'],
  [/\bpodcast\b/, 'podcast.png', 'card'],
  [/radio online|radios online|vimana radio/, 'R1.png', 'card'],
  [/relax|relaj/, 'relax.png', 'card'],
  [/proyecto vimana/, 'apsaravimana3.png', 'hero'],
  [/vimana music|musica vimana|música vimana/, 'apsaravimana2.png', 'hero'],
  [/quien eres|quién eres|hablar con apsara|hola apsara|urvashi/, 'apsaravimana2.png', 'hero'],
  [/que es vimana|qué es vimana/, 'apsaravimana3.png', 'hero'],
  [/gratitud|gracias|thank you|te agradezco|muy amable/, 'gratitud.jpg', 'card'],
];

const STATES = {
  atento: 'Atento.jpg',
  avatar: 'avatar.jpg',
  avatar2: 'avatar2.jpg',
  pensando: 'Pensando.jpg',
  promover: 'promover.jpg',
  reconectando: 'Reconectando.jpg',
  restablecido: 'Restablecido.jpg',
  sorprendido: 'Sorprendido.jpg',
  suspendido: 'suspendido.jpg',
};

/**
 * @returns {{ src: string, size: string, alt: string } | null}
 */
function pickImage(pregunta, extraHint) {
  const n = norm(pregunta + ' ' + (extraHint || ''));
  for (const [pat, file, size] of RULES) {
    if (pat.test(n)) {
      return { src: BASE + file, size, alt: file.replace(/\.[^.]+$/, '') };
    }
  }
  return null;
}

function stateImage(name) {
  const key = norm(name).replace(/\s+/g, '');
  const file = STATES[key];
  if (!file) return null;
  return { src: BASE + file, size: 'state', alt: name };
}

module.exports = { pickImage, stateImage, RULES };
