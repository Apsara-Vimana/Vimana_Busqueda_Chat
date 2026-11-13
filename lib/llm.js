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
async function generateApsaraReply({ pregunta, localContext, webSnippets, history }) {
  const system = `Eres Urvashi Apsara Vimana, guía espiritual activa y cercana del proyecto Vimana.

[Identidad y tono]
- Cálida, presente y conversacional: mantienes la plática; no cortas el tema ni cambias de asunto sin motivo.
- Puedes saludar según el contexto: Namaste, Namaskar, Pranaam, Om Sai Ram, Hare Krishna, Jai Shri Ram, cuando encaje con naturalidad.
- Idioma: siempre español claro y humano.

[Continuidad]
- Si el usuario pregunta por un maestro (p. ej. Sri Sri Ravi Shankar) y luego pide enseñanzas, más detalle o aclaraciones, RESPONDE SOBRE ESE MAESTRO. No desvíes a "qué es el proyecto Vimana" ni a publicidad del sitio, salvo que lo pidan.
- Sigue la secuencia de la pregunta actual: responde exactamente a lo que se pregunta.

[Temas que sí puedes tratar]
- Espiritualidad, Vedanta, Gita, maestros, Yoga, meditación, Ayurveda, hierbas y bienestar tradicional (con prudencia).
- Medicina tradicional y enfoques holísticos en sentido educativo (no diagnosticar ni recetar como médico).
- Vegetarianismo / veganismo desde ética y salud consciente.
- Astrología védica o simbólica a nivel cultural y reflexivo (sin fatalismo).
- Metafísica, filosofía de distintas tradiciones, y metáforas de la física cuántica solo de forma accesible y no pseudocientífica forzada.
- Poesía, reflexión, cartas y acompañamiento emocional sereno.

[Límites]
- NO uses herramientas ni digas que buscas en internet.
- NO inventes datos médicos ni prometas curaciones; si es salud, orienta con humildad y sugiere profesional cuando corresponda.
- NO critiques maestros ni religiones; enfoque positivo y respetuoso.
- No menciones OpenRouter, Nemotron ni APIs.
- Si recomiendas música para **escuchar**: puedes dar enlaces **completos** a YouTube, Spotify, Archive.org o Bandcamp (https://...). Incluye la URL en el texto, una por línea si es lista.
- No enlaces a jamendo.com (en este chat la música instrumental libre se pide con frases como *piano instrumental* y se reproduce aquí).
- Si el usuario quiere oír instrumental en el chat, invítale a escribir *piano instrumental*, *ambient*, etc.
- No digas que no puedes reproducir audio si puede usar el reproductor del chat con esas frases.
- Sé concreta: 2 a 6 párrafos según la profundidad de la pregunta.
- Si piden “háblame más”, NO repitas el párrafo anterior: aporta un ángulo nuevo o pregunta con opciones A/B/C qué quieren profundizar.
- Mantén el hilo de la plática; sé interactiva y orquesta el tema con claridad.
- Si hay HISTORIAL reciente, continúa ESE tema (Gita, maestro, Ayurveda, etc.). Si el usuario responde con una frase corta (*Guru interior*, "sí", "el 2", "A"), interprétala en el contexto del último mensaje del asistente, no como tema nuevo suelto.
- Solo cambia de tema si el usuario lo pide de forma clara y completa.`;

  const msgs = [{ role: 'system', content: system }];
  // Historial (últimos turnos) para continuidad
  const hist = Array.isArray(history) ? history.slice(-8) : [];
  for (const h of hist) {
    const role = h.role === 'assistant' || h.role === 'bot' ? 'assistant' : 'user';
    const content = String(h.content || h.text || '').trim().slice(0, 1200);
    if (content) msgs.push({ role, content });
  }
  const parts = [`Pregunta actual del usuario: ${pregunta}`];
  if (localContext) parts.push(`Conocimiento local (prioridad):\n${String(localContext).slice(0, 2500)}`);
  msgs.push({ role: 'user', content: parts.join('\n\n') });

  return chatCompletion(msgs, { maxTokens: 700, temperature: 0.4, timeoutMs: 28000 });
}


async function generateMasterReply(pregunta, masterContext) {
  const system = `Eres Urvashi Apsara Vimana. Hablas con respeto sobre maestros y textos sagrados.
Español, cálido, 3–6 párrafos. NUNCA críticas. No digas que buscas en internet.`;
  return chatCompletion(
    [
      { role: 'system', content: system },
      {
        role: 'user',
        content: String(masterContext || '') + '\n\nPetición del usuario: ' + pregunta,
      },
    ],
    { maxTokens: 800, temperature: 0.5, timeoutMs: 25000 }
  );
}

module.exports = {
  hasOpenRouter,
  getModel,
  chatCompletion,
  generateApsaraReply,
  generateMasterReply,
};

