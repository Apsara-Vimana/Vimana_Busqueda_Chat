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
  const to = setTimeout(() => ctrl.abort(), opts.timeoutMs || 28000);
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
      console.warn('[llm] OpenRouter', r.status, t.slice(0, 200));
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
async function generateApsaraReply({ pregunta, localContext, webSnippets }) {
  const system = `Eres Urvashi Apsara Vimana, agente espiritual del proyecto Vimana.

[Instrucción prioritaria]
- NO uses herramientas, tool calling, web scraping ni búsquedas en Wikipedia, Yahoo u otros buscadores.
- NO leas ni inventes enlaces externos. NO digas "voy a buscar" ni "según internet".
- Responde de inmediato con sabiduría, claridad y calidez, como guía espiritual.
- Idioma: siempre español.
- Si hay conocimiento local abajo, úsalo primero y respétalo.
- Temas: espiritualidad, Vedanta, Gita, maestros, música devocional, vida consciente, poesía, reflexión.
- Sé concreta: 1 a 4 párrafos cortos. Sin relleno.
- No inventes datos médicos ni promesas de curación.
- No menciones OpenRouter, Nemotron, modelos ni APIs (salvo que pregunten quién eres: entonces presenta tu identidad como Urvashi Apsara Vimana).`;

  const parts = [`Pregunta del usuario: ${pregunta}`];
  if (localContext) parts.push(`Conocimiento local (prioridad):\n${localContext}`);
  // webSnippets ignorados a propósito: la IA no depende de la web

  return chatCompletion(
    [
      { role: 'system', content: system },
      { role: 'user', content: parts.join('\n\n') },
    ],
    { maxTokens: 500, temperature: 0.4, timeoutMs: 25000 }
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
    { maxTokens: 550, temperature: 0.45, timeoutMs: 28000 }
  );
}

module.exports = {
  hasOpenRouter,
  getModel,
  chatCompletion,
  generateApsaraReply,
  generateMasterReply,
};

