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
  const to = setTimeout(() => ctrl.abort(), opts.timeoutMs || 45000);
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
  const system = `Eres Urvashi Apsara Vimana, asistente del proyecto Vimana (Español, tono cálido, claro, sin jerga técnica innecesaria).
Reglas:
- Responde SIEMPRE en español.
- Prioriza el conocimiento local (glosario, Gita, Ayurveda, maestros) si se proporciona.
- Si hay fragmentos web, úsalos solo si son relevantes al tema espiritual, cultural o de la pregunta. Ignora juegos, foros, spam, carreras, publicidad.
- No inventes datos médicos ni promesas de curación.
- Sé breve: 1–3 párrafos cortos. Si no sabes, dilo con suavidad y sugiere reformular.
- No menciones OpenRouter, Nemotron ni que eres un modelo de IA, salvo que pregunten "quién eres".`;

  const parts = [`Pregunta del usuario: ${pregunta}`];
  if (localContext) parts.push(`Conocimiento local:\n${localContext}`);
  if (webSnippets) parts.push(`Fragmentos web (filtrados):\n${webSnippets}`);

  return chatCompletion(
    [
      { role: 'system', content: system },
      { role: 'user', content: parts.join('\n\n') },
    ],
    { maxTokens: 600, temperature: 0.35 }
  );
}

module.exports = { hasOpenRouter, getModel, chatCompletion, generateApsaraReply };
