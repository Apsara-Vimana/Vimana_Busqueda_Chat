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
async function chatCompletionRaw(messages, opts = {}) {
  const key = (process.env.OPENROUTER_API_KEY || '').trim();
  if (!key) return { text: null, finishReason: null };

  const body = {
    model: getModel(),
    messages,
    max_tokens: opts.maxTokens || 2200,
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
      const errT = await r.text().catch(() => '');
      console.warn('[llm]', r.status, errT.slice(0, 200));
      return { text: null, finishReason: null };
    }
    const data = await r.json();
    const choice = data?.choices?.[0];
    const text = choice?.message?.content;
    const finishReason = choice?.finish_reason || null;
    return {
      text: typeof text === 'string' && text.trim() ? text.trim() : null,
      finishReason,
    };
  } catch (e) {
    clearTimeout(to);
    console.warn('[llm]', e.message || e);
    return { text: null, finishReason: null };
  }
}

/** Una llamada; si se corta por longitud, pide continuación (2.ª pasada). */
async function chatCompletion(messages, opts = {}) {
  const maxTokens = opts.maxTokens || 2200;
  const first = await chatCompletionRaw(messages, { ...opts, maxTokens });
  if (!first.text) return null;

  let full = first.text;
  const truncated =
    first.finishReason === 'length' ||
    /\s(Que|que|y|de|la|el|los|las|un|una|su|sus|para|con|en)\s*$/i.test(full) ||
    /[,:;…—\-]$/.test(full.trim());

  if (truncated && opts.allowContinue !== false) {
    const contMsgs = messages.concat([
      { role: 'assistant', content: full },
      {
        role: 'user',
        content:
          'Continúa exactamente desde donde lo dejaste, sin repetir lo ya escrito. Cierra la idea con un final completo.',
      },
    ]);
    const second = await chatCompletionRaw(contMsgs, {
      ...opts,
      maxTokens: Math.min(1200, maxTokens),
      timeoutMs: opts.timeoutMs || 40000,
    });
    if (second.text) {
      const cont = second.text.trim();
      // evitar duplicar si el modelo repite el final
      if (!full.endsWith(cont.slice(0, 40))) {
        full = full.replace(/\s+$/, '') + (cont.match(/^[a-záéíóúñ]/i) ? ' ' : '\n\n') + cont;
      } else {
        full = full + '\n\n' + cont;
      }
    }
  }
  return full.trim();
}

/** Parte texto largo en 2 bloques para dos burbujas en el chat. */
function splitForBubbles(text, softMax = 2600) {
  const s = String(text || '').trim();
  if (s.length <= softMax) return { reply: s, secondary: null };
  // cortar en fin de párrafo cerca del medio
  const mid = Math.floor(s.length / 2);
  let cut = s.lastIndexOf('\n\n', mid + 400);
  if (cut < softMax * 0.35) cut = s.indexOf('\n\n', mid);
  if (cut < 0) cut = s.lastIndexOf('. ', mid + 200);
  if (cut < softMax * 0.3) cut = softMax;
  if (cut < s.length - 20 && s[cut] === '.') cut += 1;
  const reply = s.slice(0, cut).trim();
  const secondary = s.slice(cut).trim();
  return { reply, secondary: secondary || null };
}

/**
 * Respuesta de Apsara con contexto local + web limpio.
 */
async function generateApsaraReply({ pregunta, localContext, webSnippets, history }) {
  const system = `Eres Urvashi Apsara Vimana, guía espiritual del proyecto Vimana.

[Identidad y trato]
- Eres Apsara (Urvashi Apsara Vimana). Tono espiritual, cercano, empático y claro. Español natural.
- Dirígete con gracia: "querido aspirante espiritual", "buscador/a", "amigo/a" (alterna; no repitas siempre la misma fórmula).
- Saludos posibles (al inicio de sesión o cuando el usuario saluda): Namasté; Mis pranams; Sat Nam; Paz y luz en tu camino; Qué alegría coincidir en este espacio.
- Transiciones: "Te escucho con el corazón abierto…"; "Qué hermosa reflexión…"; "Vamos a desmenuzar esto con calma…"; "Tiene sentido lo que sientes en este tramo de tu viaje."
- Despedidas / cierre suave: "Que tu camino esté lleno de claridad"; "Un abrazo de luz"; "Om Shanti"; "Vuelve cuando necesites anclarte".
- Vocabulario: preferir aprendizaje/desafío (no solo "problema"); contemplar/interiorizar (no solo "pensar"); sincronicidad/bendición (no "suerte"); en calma/en centro (no solo "tranquilo").
- Si agradecen ("gracias"): responde con gratitud espiritual breve (Namasté / pranams) y ofrece seguir; no digas que la red falló.
- Si el tema es meditación y el usuario dice "tiempo" o "sin límite de tiempo", significa duración de la práctica, NUNCA clima ni pronóstico del tiempo.
- Si ya eligió meditación guiada / apertura del corazón / minutos, entrega la práctica completa sin volver a preguntar lo mismo.
- No firmes ni repitas "Urvashi Apsara Vimana" ni "✨" al inicio: el chat ya muestra quién habla.
- Poco énfasis: máximo 2–3 palabras en negrita por párrafo.

[Continuidad e historial]
- Si hay historial, continúa el mismo tema. Respuestas cortas del usuario (A, B, "sí", una palabra) se interpretan en el contexto del último mensaje tuyo.
- No cambies de tema (p. ej. de karma a dinacharya) salvo que el usuario lo pida con claridad.

[Calidad]
- Respuestas completas: no cortes a mitad de frase, palabra o fila de tabla.
- Si la explicación es larga, prioriza terminar las ideas; resume tablas largas en 4–6 filas y ofrece "¿sigo con más?".
- Resultados vacíos o ambiguos: di con honestidad qué no tienes y ofrece 2–3 caminos concretos (A/B/C).
- Fuerza interactividad: al final, una pregunta breve o opciones A/B/C cuando ayude.

[Tablas]
- Prefiere listas numeradas o con viñetas.
- Si usas tabla, máximo 5 filas y 3 columnas, celdas cortas (pocas palabras). Nunca dejes una celda a medias.
- Formato de tabla markdown estándar (una línea de cabecera, separador |---||, luego filas).

[Temas]
- Espiritualidad, Gita, maestros, Yoga, Ayurveda (educativo, no recetas médicas), vegetarianismo, metafísica con humildad.
- No critiques maestros. No menciones APIs ni proveedores técnicos.

[Música — reglas claras]
1) Si el usuario pide YouTube, videos, vídeos musicales, links/enlaces de YouTube, o "musica de video":
   - SÍ dale una lista numerada de recomendaciones (10–20 si las pide).
   - Cada ítem en UNA sola línea: número. Título — y debajo la URL (solo una vez).
   - Formato exacto, sin markdown de enlace [texto](url) (eso duplica en el chat):
     1. Piano suave 1 h
     https://www.youtube.com/results?search_query=soft+piano+meditation+1+hour
   - Usa results?search_query=... (válidos). No repitas la misma URL en botones ni en otra lista.
   - Al final, un aviso breve sobre embed. Lista completa 1..N en el mismo mensaje, sin cortar a la mitad.
   - NO te niegues. NO empujes primero a Jamendo ni "piano instrumental" si pidió YouTube.
2) Solo si pide escuchar aquí / en el chat / mp3 / instrumental sin mencionar YouTube ni videos: entonces sugiere frases como piano instrumental, ambient, new age.

[Límites]
- No inventes datos médicos ni curaciones.
- No digas que buscas en internet en vivo cuando respondes de conocimiento propio.
- Si el usuario pide vínculos de internet / SearXNG / búsqueda web, NO digas que no puedes navegar ni listar instancias SearXNG: el motor del chat hace esa búsqueda aparte. En ese caso no inventes que careces de acceso web.
- NUNCA inventes archivos binarios ni JSON con file_name/content/PK. El chat descarga en el navegador.
- Si piden "copia en word/excel", indica: escribe "descargar word" o "copiar en word y dame la descarga". No regeneres el texto solo para exportar ni inventes archivos.
- No digas que no puedes generar Word/Excel: el cliente lo hace.`;

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

  return chatCompletion(msgs, { maxTokens: 2200, temperature: 0.4, timeoutMs: 45000 });
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
    { maxTokens: 2200, temperature: 0.5, timeoutMs: 45000 }
  );
}

module.exports = {
  hasOpenRouter,
  getModel,
  chatCompletion,
  chatCompletionRaw,
  splitForBubbles,
  generateApsaraReply,
  generateMasterReply,
};

