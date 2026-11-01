// ============================================================
//  GEMINI — formato exacto del curl oficial de Google
//  Modelo: gemini-flash-latest
//  Variable de entorno en Render: GEMINI_API_KEY
// ============================================================

const GEMINI_MODEL = 'gemini-flash-latest';
const GEMINI_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const GEMINI_TIMEOUT_MS = 20000;

/**
 * Llama a Gemini con el mismo formato del curl de Google:
 *   - Header: X-goog-api-key
 *   - Body:   { "contents": [ { "parts": [ { "text": "..." } ] } ] }
 * Devuelve el texto o null si falla.
 */
async function llamarGemini(pregunta) {
  const key = (process.env.GEMINI_API_KEY || '').trim();
  if (!key) return null;

  const textoPrompt =
    'Eres Apsara Vimana, asistente del proyecto Vimana (música, arte y sabiduría). ' +
    'Responde SIEMPRE en español, de forma clara, cálida y concisa (máximo 350 palabras). ' +
    'Si no sabes algo, dilo con humildad.\n\n' +
    'Pregunta del usuario: ' + pregunta;

  // Body idéntico al curl oficial
  const payload = {
    contents: [
      {
        parts: [{ text: textoPrompt }],
      },
    ],
  };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), GEMINI_TIMEOUT_MS);

  try {
    // Método 1: header X-goog-api-key (como el curl de Google)
    let r = await fetch(GEMINI_URL, {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': key,
      },
      body: JSON.stringify(payload),
    });

    // Método 2 (respaldo): ?key= en la URL
    if (!r.ok) {
      r = await fetch(GEMINI_URL + '?key=' + encodeURIComponent(key), {
        method: 'POST',
        signal: ctrl.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }

    if (!r.ok) {
      const errText = await r.text().catch(() => '');
      console.error('[Gemini] HTTP', r.status, errText.slice(0, 200));
      return null;
    }

    const data = await r.json();
    if (data && data.error && data.error.message) {
      console.error('[Gemini] API error:', data.error.message);
      return null;
    }

    const texto =
      data &&
      data.candidates &&
      data.candidates[0] &&
      data.candidates[0].content &&
      data.candidates[0].content.parts &&
      data.candidates[0].content.parts[0] &&
      data.candidates[0].content.parts[0].text;

    if (!texto || !String(texto).trim()) return null;
    return String(texto).trim().slice(0, 1800);
  } catch (e) {
    console.error('[Gemini] falló:', e.message || e);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { llamarGemini };
