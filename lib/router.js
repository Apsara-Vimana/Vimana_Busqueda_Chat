/**
 * Orquestador polimórfico — elige Apsara según intención
 * Apsara Vimana (núcleo) | Urvashi | Menaka | Rambha | Tilottama | Ghritachi
 */
const { esIntentoUrvashi, procesarUrvashi } = require('./urvashi');

function norm(t) {
  return String(t || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Detecta persona (sin ejecutar aún).
 * @returns {{ name: string, id: string }}
 */
function detectarApsara(mensaje) {
  const texto = norm(mensaje);

  // Forzar nombre explícito
  if (/\burvashi\b/.test(texto)) return { name: 'Urvashi Apsara', id: 'urvashi' };
  if (/\bmenaka\b/.test(texto)) return { name: 'Menaka', id: 'menaka' };
  if (/\brambha\b/.test(texto)) return { name: 'Rambha', id: 'rambha' };
  if (/\btilottama\b/.test(texto)) return { name: 'Tilottama', id: 'tilottama' };
  if (/\bghritachi\b/.test(texto)) return { name: 'Ghritachi', id: 'ghritachi' };
  if (/\bapsara vimana\b/.test(texto) && texto.length < 40) return { name: 'Apsara Vimana', id: 'vimana' };

  if (esIntentoUrvashi(mensaje)) return { name: 'Urvashi Apsara', id: 'urvashi' };

  // Menaka — tech
  if (/\b(codigo|código|javascript|node\.?js|typescript|bug|error de|servidor|render\.com|github|dockerfile|api\/|sql|neon\.tech)\b/.test(texto)) {
    return { name: 'Menaka', id: 'menaka' };
  }

  // Rambha — noticias / actualidad (el motor general ya hace web search)
  if (/\b(noticias|actualidad|titulares|que paso|qué pasó|eventos espirituales|cartelera)\b/.test(texto)) {
    return { name: 'Rambha', id: 'rambha' };
  }

  // Tilottama — marketing / Essentia
  if (/\b(essentia|marketing|copywriting|publicidad|prompt para|krea\.ai|slogan)\b/.test(texto)) {
    return { name: 'Tilottama', id: 'tilottama' };
  }

  // Ghritachi — organización
  if (/\b(organizar|lista de tareas|planificar|productividad|cronograma|checklist)\b/.test(texto)) {
    return { name: 'Ghritachi', id: 'ghritachi' };
  }

  return { name: 'Apsara Vimana', id: 'vimana' };
}

/**
 * Si la persona tiene motor propio, responde aquí.
 * Si no, null → sigue el pipeline general de engine.js
 */
async function procesarPersona(mensaje) {
  const who = detectarApsara(mensaje);

  if (who.id === 'urvashi') {
    // procesarUrvashi es async (API Gita + traducción ES)
    return procesarUrvashi(mensaje).then((r) => ({ ...r, persona: who.name }));
  }

  if (who.id === 'menaka') {
    return {
      persona: 'Menaka',
      reply:
        `⚙️ **Menaka** — tecnología y código\n\n` +
        `Puedo orientarte sobre Node.js, Render, Neon, GitHub y estructura del proyecto Vimana.\n\n` +
        `Describe el error o pega el fragmento de código. Para el asistente general (biblioteca, hierbas, clima) escribe sin palabras técnicas o di **Apsara Vimana**.`,
      options: ['estructura del proyecto', 'error en engine.js', 'Apsara Vimana'],
      links: [],
    };
  }

  if (who.id === 'tilottama') {
    return {
      persona: 'Tilottama',
      reply:
        `🎨 **Tilottama** — creatividad y contenido\n\n` +
        `Dime qué necesitas: copy para Essentia, un slogan, un prompt de imagen o un tono de marca.\n` +
        `Ejemplo: «copy para aceite de ashwagandha» o «prompt estilo krea para apsara».`,
      options: ['copy Essentia', 'slogan natural', 'Apsara Vimana'],
      links: [],
    };
  }

  if (who.id === 'ghritachi') {
    return {
      persona: 'Ghritachi',
      reply:
        `📋 **Ghritachi** — organización\n\n` +
        `Cuéntame el proyecto o la meta y te propongo pasos claros, checklist o orden de archivos.\n` +
        `Ejemplo: «organiza el deploy de Render» o «checklist para subir la biblioteca».`,
      options: ['checklist deploy', 'ordenar carpetas public', 'Apsara Vimana'],
      links: [],
    };
  }

  // Rambha y Vimana: null → engine general (búsqueda, glosario, etc.)
  // pero etiquetamos Rambha en el caller si hace falta
  if (who.id === 'rambha') {
    return { persona: 'Rambha', passthrough: true };
  }

  return { persona: who.name, passthrough: true };
}

module.exports = { detectarApsara, procesarPersona };
