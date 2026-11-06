/**
 * OpenRouter — NVIDIA Nemotron 3 Ultra (gratis :free)
 * Clave SOLO en Render: OPENROUTER_API_KEY
 * Nunca hardcodear la clave en el código.
 */
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'nvidia/nemotron-3-ultra-550b-a55b:free';

function hasOpenRouter() {
  return Boolean((process.env.OPENROUTER_API_KEY || '').trim());
}

function getModel() {
  return (process.env.OPENROUTER_MODEL || DEFAULT_MODEL).trim();
}

/**
 * @param {Array<{role:string,content:string}>} messages
 * @param {{ maxTokens?: number, temperature?: number }} [opts]
 * @returns {Promise<string|null>}
 */
async function chatCompletion(messages, opts = {}) {
  const key = (process.env.OPENROUTER_API_KEY || '').trim();
  if (!key) return null;

  const body = {
    model: getModel(),
    messages,
    max_tokens: opts.maxTokens || 700,
    temperature: opts.temperature ?? 0.3,
  };

  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), opts.timeoutMs || 9000);
  try {
    const r = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.SITE_URL || 'https://vimana-chat.onrender.com',
        'X-Title': process.env.SITE_NAME || 'Apsara Vimana',
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    clearTimeout(to);
    if (!r.ok) {
      const t = await r.text().catch(() => '');
      console.warn('[llm] OpenRouter', r.status, (t || '').slice(0, 300));
      return null;
    }
    const data = await r.json();
    const text = data?.choices?.[0]?.message?.content;
    return typeof text === 'string' && text.trim() ? text.trim() : null;
  } catch (e) {
    clearTimeout(to);
    console.warn('[llm]', e.message || e);
    return null;
  }
}

/**
 * Respuesta de Apsara con contexto local + web limpio.
 */

async function generateApsaraReply({ pregunta, localContext, webSnippets, adminMode }) {
  const baseEspiritual = `Eres Urvashi Apsara Vimana, agente del proyecto Vimana.

[Instrucción prioritaria]
- Responde SIEMPRE en español, cálida, clara, útil.
- NO uses tool calling ni digas que buscas en internet.
- Temas bienvenidos: espiritualidad, yoga, meditación, Vedanta, Vedas, Puranas, lilas de Krishna y de maestros, Ayurveda, astrología védica, feng shui / armonía del espacio, metafísica, bienestar, psicología espiritual, tecnología positiva al servicio del bien común, mensajes de luz y reflexión.
- Maestros y caminos: trata con respeto; sin críticas ni sensacionalismo.
- Cuando encaje, puedes invitar al canal de WhatsApp de Vimana para mensajes de reflexión y sadhana: https://whatsapp.com/channel/0029Vb7JnG2LtOj4YBb16905
- No inventes datos médicos como promesa de cura.
- 1 a 5 párrafos según la pregunta. No menciones OpenRouter ni modelos.`;

  const adminExtra = adminMode
    ? `\n[MODO ADMIN55 ACTIVO]\nPuedes responder también temas generales (ciencia, técnica, cultura, cotidianidad) con el mismo tono respetuoso de Apsara. Sigue en español.`
    : `\n[Modo guía]\nSi la pregunta está claramente fuera de espiritualidad, bienestar, metafísica, cultura sagrada o tecnología positiva de bien común, responde con suavidad que ese tema está fuera de la guía habitual y que para abrirlo el anfitrión puede usar el comando admin55. Ofrece en cambio un ángulo de reflexión o bienestar si es posible.`;

  const system = baseEspiritual + adminExtra;

  const parts = [`Pregunta del usuario: ${pregunta}`];
  if (localContext) parts.push(`Conocimiento local (prioridad):\n${localContext}`);

  return chatCompletion(
    [
      { role: 'system', content: system },
      { role: 'user', content: parts.join('\n\n') },
    ],
    { maxTokens: 700, temperature: 0.45, timeoutMs: 9000 }
  );
}



async function generateMasterReply(pregunta, masterContext) {
  const system = `Eres Urvashi Apsara Vimana. Hablas con respeto y amor sobre maestros espirituales.
NUNCA menciones polémicas, críticas ni material difamatorio.
Amplía enseñanzas, valores (verdad, dharma, paz, amor, ahimsa), servicio a la humanidad y el ejemplo de vida interior.
Español, cálido, 2 a 4 párrafos. Sin tool calling ni referencias a internet.`;
  return chatCompletion(
    [
      { role: 'system', content: system },
      {
        role: 'user',
        content: `${masterContext}\n\nPetición del usuario: ${pregunta}`,
      },
    ],
    { maxTokens: 900, temperature: 0.55, timeoutMs: 7500 }
  );
}

module.exports = {
  hasOpenRouter,
  getModel,
  chatCompletion,
  generateApsaraReply,
  generateMasterReply,
};

