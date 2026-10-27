const path = require('path');
const express = require('express');
const { procesar } = require('./lib/engine');
const { guardarMensaje } = require('./lib/neon');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/ping', (_req, res) => {
  res.json({
    ok: true,
    t: Date.now(),
    neon: Boolean(process.env.DATABASE_URL),
    searx: process.env.SEARXNG_URL || null,
  });
});

app.post('/api/chat', async (req, res) => {
  try {
    const q = (req.body && (req.body.q || req.body.message || req.body.text)) || '';
    const data = await procesar(String(q));

    // Guardar en Neon si hay DATABASE_URL (no bloquea la respuesta si falla)
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
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'set' : 'missing');
  console.log('SEARXNG_URL:', process.env.SEARXNG_URL || '(default list)');
});
