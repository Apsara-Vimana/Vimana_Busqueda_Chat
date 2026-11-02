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
   GEMINI — todo aquí en server.js
   Variables: GEMINI_KEY o GEMINI_API_KEY
   ============================================================================ */

const GEMINI_MODELS = [
  'gemini-flash-latest',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-2.5-flash',
];
const GEMINI_TIMEOUT_MS = 28000;

function getGeminiKey() {
  return (
    (process.env.GEMINI_KEY || '').trim() ||
    (process.env.GEMINI_API_KEY || '').trim()
  );
}

function geminiUrl(model) {
  return (
    'https://generativelanguage.googleapis.com/v1beta/models/' +
    model +
    ':generateContent'
  );
}

/**
 * Llama a Gemini (formato oficial Google).
 * Prueba varios nombres de modelo por si "gemini-flash-latest" no está activo en la key.
 * Siempre pide respuesta en español.
 */
async function llamarGemini(pregunta) {
  const key = getGeminiKey();
  if (!key) {
    console.error('[Gemini] sin API key');
    return null;
  }

  const textoPrompt =
    'Eres Apsara Vimana, asistente del proyecto Vimana (música, arte y sabiduría). ' +
    'Responde SIEMPRE en español, claro, cálido y útil (máximo 400 palabras). ' +
    'Si piden un poema, una explicación, cursos o información práctica, responde el contenido directamente. ' +
    'No digas que vas a buscar en internet: responde tú. ' +
    'Si no sabes algo, dilo con humildad.\n\n' +
    'Pregunta del usuario: ' + String(pregunta || '').trim();

  const payload = {
    contents: [
      {
        parts: [{ text: textoPrompt }],
      },
    ],
  };

  for (const model of GEMINI_MODELS) {
    const url = geminiUrl(model);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), GEMINI_TIMEOUT_MS);

    try {
      // Header oficial
      let r = await fetch(url, {
        method: 'POST',
        signal: ctrl.signal,
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': key,
        },
        body: JSON.stringify(payload),
      });

      // Respaldo ?key=
      if (!r.ok) {
        r = await fetch(url + '?key=' + encodeURIComponent(key), {
          method: 'POST',
          signal: ctrl.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const raw = await r.text();
      let data = null;
      try {
        data = JSON.parse(raw);
      } catch (_) {
        data = null;
      }

      if (!r.ok) {
        const msg =
          (data && data.error && data.error.message) || raw.slice(0, 180);
        console.error('[Gemini]', model, 'HTTP', r.status, msg);
        clearTimeout(timer);
        continue; // probar siguiente modelo
      }

      if (data && data.error && data.error.message) {
        console.error('[Gemini]', model, 'API:', data.error.message);
        clearTimeout(timer);
        continue;
      }

      const texto =
        data &&
        data.candidates &&
        data.candidates[0] &&
        data.candidates[0].content &&
        data.candidates[0].content.parts &&
        data.candidates[0].content.parts[0] &&
        data.candidates[0].content.parts[0].text;

      clearTimeout(timer);

      if (texto && String(texto).trim()) {
        console.log('[Gemini] OK con modelo', model);
        return String(texto).trim().slice(0, 1800);
      }

      console.error('[Gemini]', model, 'respuesta vacía');
    } catch (e) {
      clearTimeout(timer);
      console.error('[Gemini]', model, 'falló:', e.message || e);
    }
  }

  return null;
}

setGemini(llamarGemini);

function searxBase() {
  return (process.env.SEARXNG_URL || '').trim().replace(/\/$/, '');
}

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

function pareceSoloBusquedaWeb(data) {
  const r = (data && data.reply) || '';
  return (
    r.includes('VIMANA (Búsqueda') ||
    r.includes('📘 **Wikipedia**') ||
    r.includes('No hubo resultados en SearXNG') ||
    r.includes('Buscar en Yahoo')
  );
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

app.post('/api/gemini', async (req, res) => {
  try {
    const apiKey = getGeminiKey();
    if (!apiKey) {
      return res.status(500).json({
        error: 'Falta GEMINI_KEY o GEMINI_API_KEY en las variables de Render',
      });
    }

    const text =
      (req.body &&
        (req.body.mensaje ||
          req.body.q ||
          req.body.text ||
          (req.body.contents &&
            req.body.contents[0] &&
            req.body.contents[0].parts &&
            req.body.contents[0].parts[0] &&
            req.body.contents[0].parts[0].text))) ||
      '';

    const out = await llamarGemini(String(text));
    if (!out) {
      return res.status(502).json({ error: 'Gemini no respondió' });
    }
    res.json({
      candidates: [{ content: { parts: [{ text: out }] } }],
      reply: out,
    });
  } catch (e) {
    console.error('Error puente Gemini:', e.message);
    res.status(502).json({ error: 'Error de conexión intermediada a Gemini' });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    wakeSearx().catch(() => {});

    const q = (req.body && (req.body.q || req.body.message || req.body.text)) || '';
    let data = await procesar(String(q));

    // Si el motor solo devolvió búsqueda web / wiki, forzar Gemini otra vez
    if (pareceSoloBusquedaWeb(data)) {
      const g = await llamarGemini(String(q));
      if (g) {
        data = {
          reply: g,
          links: [],
          options: ['ayuda', 'limpiar', 'estado'],
          image: '/imagenes/Pensando.jpg',
          imageSize: 'state',
          imageAlt: 'Apsara pensando',
        };
      }
    }

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
