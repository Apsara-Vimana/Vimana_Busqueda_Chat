const path = require('path');
const { Readable } = require('stream');
const express = require('express');
const { procesar, setGemini } = require('./lib/engine');
const { guardarMensaje } = require('./lib/neon');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

/* ============================================================================
   GEMINI — configuración y llamada (solo aquí en server.js)
   Variables de entorno en Render (vale cualquiera de las dos):
     GEMINI_KEY=...
     GEMINI_API_KEY=...
   URL oficial:
     https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent
   ============================================================================ */

const GEMINI_MODEL = 'gemini-flash-latest';
const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/' +
  GEMINI_MODEL +
  ':generateContent';
const GEMINI_TIMEOUT_MS = 25000;

function getGeminiKey() {
  return (
    (process.env.GEMINI_KEY || '').trim() ||
    (process.env.GEMINI_API_KEY || '').trim()
  );
}

/**
 * Llama a Gemini con el formato oficial de Google.
 * Respuesta siempre en español. Devuelve texto o null.
 */
async function llamarGemini(pregunta) {
  const key = getGeminiKey();
  if (!key) return null;

  const textoPrompt =
    'Eres Apsara Vimana, asistente del proyecto Vimana (música, arte y sabiduría). ' +
    'Responde SIEMPRE en español, de forma clara, cálida y útil (máximo 350 palabras). ' +
    'Si piden cursos, prácticas, búsquedas o información práctica, responde de forma concreta. ' +
    'Si no sabes algo, dilo con humildad. No inventes fuentes.\n\n' +
    'Pregunta del usuario: ' + String(pregunta || '').trim();

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
    let r = await fetch(GEMINI_URL, {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': key,
      },
      body: JSON.stringify(payload),
    });

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
      console.error('[Gemini] HTTP', r.status, errText.slice(0, 220));
      return null;
    }

    const data = await r.json();
    if (data && data.error && data.error.message) {
      console.error('[Gemini] API:', data.error.message);
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

// El motor usa esta función cuando no hay respuesta local
setGemini(llamarGemini);

function searxBase() {
  return (process.env.SEARXNG_URL || '').trim().replace(/\/$/, '');
}

/** Dominios permitidos para proxy de audio (anti-abuso) */
function isAllowedAudioHost(hostname) {
  const h = String(hostname || '').toLowerCase();
  const allow = [
    'vimana.rf.gd', 'www.vimana.rf.gd',
    'mydoom666.radio.fm', 'icecast.omroep.nl',
    'ec6.yesstreaming.net', 'radio.streemlion.com', 'puma.streemlion.com',
    'kathy.torontocast.com', 'relaxingmusicradio247.com', 'stream.srg-ssr.ch',
    'us2.internet-radio.com', 'listen.011fm.com',
    'ice1.somafm.com', 'ice2.somafm.com', 'ice3.somafm.com', 'ice4.somafm.com',
    'pstnet4.shoutcastnet.com',
    'stream.sssmediacentre.org', 'stream.radiosai.net', 'radiosai.net',
    'radiosahaja.com', 'stream.laut.fm', 'stream.newageradio.gr',
    'streaming.mundoclasicaupa.com', 'dard.out.airtime.pro',
  ];
  if (allow.includes(h)) return true;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(h)) return true;
  if (h.endsWith('.airtime.pro')) return true;
  if (h.endsWith('.yesstreaming.net')) return true;
  if (h.endsWith('.radio.fm')) return true;
  return false;
}

async function wakeSearx() {
  const base = searxBase();
  if (!base) return { ok: false, reason: 'no SEARXNG_URL' };
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 50000);
  try {
    const r = await fetch(base + '/', {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'ApsaraVimana-Wake/1.0' },
    });
    return { ok: r.ok || r.status < 500, status: r.status, url: base };
  } catch (e) {
    return { ok: false, error: e.message || 'timeout', url: base };
  } finally {
    clearTimeout(t);
  }
}

app.get('/api/ping', async (_req, res) => {
  wakeSearx().catch(() => {});
  res.json({
    ok: true,
    t: Date.now(),
    neon: Boolean(process.env.DATABASE_URL),
    searx: searxBase() || null,
    hf: Boolean(process.env.HUGGINGFACE_TOKEN),
    gemini: Boolean(getGeminiKey()),
  });
});

app.get('/api/wake-searx', async (_req, res) => {
  res.json(await wakeSearx());
});

/**
 * Proxy de audio
 */
app.get('/api/audio', async (req, res) => {
  try {
    const raw = String(req.query.u || '').trim();
    if (!raw || raw.length > 800) {
      return res.status(400).send('bad url');
    }
    let target;
    try {
      target = new URL(raw);
    } catch {
      return res.status(400).send('invalid url');
    }
    if (!/^https?:$/.test(target.protocol)) {
      return res.status(400).send('protocol');
    }
    if (!isAllowedAudioHost(target.hostname)) {
      return res.status(403).send('host not allowed');
    }

    const headers = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: '*/*',
      Referer: target.origin + '/',
      Origin: target.origin,
    };
    if (req.headers.range) headers.Range = req.headers.range;

    const upstream = await fetch(target.toString(), {
      headers,
      redirect: 'follow',
    });

    if (!upstream.ok && upstream.status !== 206) {
      return res.status(upstream.status).send('upstream error');
    }

    const ct = upstream.headers.get('content-type') || 'audio/mpeg';
    res.setHeader('Content-Type', ct);
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.setHeader('Accept-Ranges', 'bytes');
    const cl = upstream.headers.get('content-length');
    if (cl) res.setHeader('Content-Length', cl);
    const cr = upstream.headers.get('content-range');
    if (cr) res.setHeader('Content-Range', cr);
    res.status(upstream.status);

    if (!upstream.body) {
      return res.end();
    }
    const nodeStream = Readable.fromWeb(upstream.body);
    nodeStream.on('error', () => {
      try {
        res.end();
      } catch (_) {}
    });
    nodeStream.pipe(res);
  } catch (e) {
    console.error('audio proxy', e.message);
    if (!res.headersSent) res.status(502).send('proxy fail');
  }
});

/**
 * Túnel opcional a Gemini (por si quieres probar la API directa).
 * El chat principal usa /api/chat (no hace falta llamar esto desde el HTML).
 */
app.post('/api/gemini', async (req, res) => {
  try {
    const apiKey = getGeminiKey();
    if (!apiKey) {
      return res.status(500).json({
        error: 'Falta GEMINI_KEY o GEMINI_API_KEY en las variables de Render',
      });
    }

    const body =
      req.body && Object.keys(req.body).length
        ? req.body
        : {
            contents: [
              {
                parts: [
                  {
                    text: String(
                      (req.body && (req.body.mensaje || req.body.q || req.body.text)) || ''
                    ),
                  },
                ],
              },
            ],
          };

    let response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      response = await fetch(GEMINI_URL + '?key=' + encodeURIComponent(apiKey), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    }

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (e) {
    console.error('Error puente Gemini:', e.message);
    res.status(502).json({ error: 'Error de conexión intermediada a Gemini' });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    wakeSearx().catch(() => {});

    const q = (req.body && (req.body.q || req.body.message || req.body.text)) || '';
    const data = await procesar(String(q));

    Promise.resolve()
      .then(async () => {
        if (!process.env.DATABASE_URL) return;
        await guardarMensaje('user', q);
        if (data && data.reply) await guardarMensaje('assistant', data.reply);
      })
      .catch((err) =>
        console.error('Neon guardar:', err && err.message ? err.message : err)
      );

    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({
      reply: 'No pude completar eso ahora. Prueba de nuevo en un momento, por favor.',
      image: 'index_files/2_fBUK.jpg',
      links: [],
      options: [],
    });
  }
});

app.listen(PORT, () => {
  console.log('Apsara Vimana on', PORT);
  console.log('SEARXNG_URL:', searxBase() || '(missing)');
  console.log('Gemini key:', getGeminiKey() ? 'presente' : 'AUSENTE');
  wakeSearx()
    .then((r) => console.log('wake-searx on boot:', r))
    .catch(() => {});
});
