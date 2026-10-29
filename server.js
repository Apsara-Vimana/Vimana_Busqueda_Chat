const path = require('path');
const express = require('express');
const { procesar } = require('./lib/engine');
const { guardarMensaje } = require('./lib/neon');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

function searxBase() {
  return (process.env.SEARXNG_URL || '').trim().replace(/\/$/, '');
}

/** Despierta SearXNG en segundo plano (Render free). No bloquea al usuario. */
async function wakeSearx() {
  const base = searxBase();
  if (!base) return { ok: false, reason: 'no SEARXNG_URL' };
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 50000);
  try {
    // GET a la home basta para sacar el servicio del sueño
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
  // Mantener chat despierto y empujar SearXNG
  wakeSearx().catch(() => {});
  res.json({
    ok: true,
    t: Date.now(),
    neon: Boolean(process.env.DATABASE_URL),
    searx: searxBase() || null,
    hf: Boolean(process.env.HUGGINGFACE_TOKEN),
  });
});

app.get('/api/wake-searx', async (_req, res) => {
  const result = await wakeSearx();
  res.json(result);
});

app.post('/api/chat', async (req, res) => {
  try {
    // Al primer mensaje también intentamos despertar (por si entró directo al chat)
    wakeSearx().catch(() => {});

    const q = (req.body && (req.body.q || req.body.message || req.body.text)) || '';
    const data = await procesar(String(q));

    Promise.resolve()
      .then(async () => {
        if (!process.env.DATABASE_URL) return;
        await guardarMensaje('user', q);
        if (data && data.reply) await guardarMensaje('assistant', data.reply);
      })
      .catch(() => {});

    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({
      reply: 'Error interno. Intenta de nuevo.',
      image: 'index_files/2_fBUK.jpg',
      links: [],
      options: [],
    });
  }
});

app.listen(PORT, () => {
  console.log('Apsara Vimana on', PORT);
  console.log('SEARXNG_URL:', searxBase() || '(missing)');
  // Despertar al arrancar el chat
  wakeSearx().then((r) => console.log('wake-searx on boot:', r)).catch(() => {});
});
