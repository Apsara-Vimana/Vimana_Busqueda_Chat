/**
 * Apsara Vimana — servidor Node (Render)
 * Sirve la UI y /api/chat → motor local + búsqueda gratis + Neon opcional
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { procesar } = require('./lib/engine');
const { initSchema, guardarMensaje } = require('./lib/neon');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Estáticos (UI + imágenes)
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/ping', (_req, res) => {
  res.json({ ok: true, t: Date.now(), servicio: 'Apsara Vimana Node' });
});

app.post('/api/chat', async (req, res) => {
  try {
    const q = String(req.body.q || req.body.pregunta || req.body.message || '').trim();
    if (q) await guardarMensaje('user', q);
    const out = await procesar(q);
    if (out && out.reply) await guardarMensaje('assistant', out.reply, { fuente: out.agente });
    res.json(out);
  } catch (e) {
    console.error('[chat]', e);
    res.json({
      ok: true,
      agente: 'Apsara Vimana',
      reply: 'Hubo un problema interno. Inténtalo de nuevo en unos segundos.',
      image: 'imagenes/estados/apsara_hero.jpg',
      links: [],
      options: [],
    });
  }
});

// Compatibilidad con el front antiguo (FormData a engine.php)
app.post('/api/engine.php', async (req, res) => {
  req.url = '/api/chat';
  return app._router.handle(req, res, () => {});
});

// SPA fallback
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

initSchema().then((ok) => {
  if (ok) console.log('[neon] listo');
  else console.log('[neon] sin DATABASE_URL — chat sin historial en DB');
  app.listen(PORT, () => console.log(`Apsara Vimana en :${PORT}`));
});