/**
 * Apsara Vimana — servidor Express
 * Sin Gemini. IA opcional: OpenRouter Nemotron (lib/llm.js + lib/engine.js).
 * Variable Render: OPENROUTER_API_KEY
 */
const path = require('path');
const { Readable } = require('stream');
const express = require('express');
const { procesar } = require('./lib/engine');
const access = require('./lib/access');
const { guardarMensaje } = require('./lib/neon');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

function searxBase() {
  return (process.env.SEARXNG_URL || '').trim().replace(/\/$/, '');
}

function isAllowedAudioHost(hostname) {
  const h = String(hostname || '').toLowerCase();
  const allow = [
    'vimana.rf.gd',
    'www.vimana.rf.gd',
    'mydoom666.radio.fm',
    'icecast.omroep.nl',
    'ec6.yesstreaming.net',
    'radio.streemlion.com',
    'puma.streemlion.com',
    'kathy.torontocast.com',
    'relaxingmusicradio247.com',
    'stream.srg-ssr.ch',
    'us2.internet-radio.com',
    'listen.011fm.com',
    'ice1.somafm.com',
    'ice2.somafm.com',
    'ice3.somafm.com',
    'ice4.somafm.com',
    'pstnet4.shoutcastnet.com',
    'stream.sssmediacentre.org',
    'stream.radiosai.net',
    'radiosai.net',
    'radiosahaja.com',
    'stream.laut.fm',
    'stream.newageradio.gr',
    'streaming.mundoclasicaupa.com',
    'dard.out.airtime.pro',
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
  const t = setTimeout(() => ctrl.abort(), 4000);
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
    openrouter: Boolean(process.env.OPENROUTER_API_KEY),
    llm: Boolean(process.env.OPENROUTER_API_KEY || process.env.LLM_API_KEY),
  });
});

app.get('/api/wake-searx', async (_req, res) => {
  res.json(await wakeSearx());
});

app.get('/api/audio', async (req, res) => {
  try {
    const raw = String(req.query.u || req.query.url || '').trim();
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

    if (!upstream.body) return res.end();
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

app.get('/api/access/status', (req, res) => {
  try {
    const st = typeof access.poolsStatus === 'function' ? access.poolsStatus() : null;
    res.json(
      st || {
        required: access.accessRequired(),
        instance: process.env.INSTANCE_POOL || 'A',
        pools: { A: true, B: true, C: true },
      }
    );
  } catch (e) {
    res.json({ required: false, error: String(e && e.message) });
  }
});

app.post('/api/access', (req, res) => {
  const code = (req.body && (req.body.code || req.body.clave || req.body.q)) || '';
  const sessionId = (req.body && req.body.sessionId) || '';
  if (!access.accessRequired()) {
    return res.json({
      ok: true,
      reply: 'Acceso abierto (no hay claves configuradas en el servidor).',
      pool: access.instancePool ? access.instancePool() : 'A',
      sessionId: sessionId || ('open-' + Date.now()),
    });
  }
  const result = access.openSession(code, sessionId || null);
  if (!result.ok) {
    const status = result.reason === 'limit' ? 429 : 401;
    return res.status(status).json({
      ok: false,
      reason: result.reason || 'invalid',
      reply: result.reply,
    });
  }
  return res.json({
    ok: true,
    reply: result.reply,
    pool: result.pool || (access.instancePool && access.instancePool()),
    sessionId: result.sessionId,
    isAdmin: !!result.isAdmin,
  });
});

app.post('/api/access/heartbeat', (req, res) => {
  const code = (req.body && (req.body.code || req.body.clave)) || '';
  const sessionId = (req.body && req.body.sessionId) || '';
  if (!access.accessRequired() || (access.isAdmin && access.isAdmin(code))) {
    return res.json({ ok: true });
  }
  const r = access.heartbeat(code, sessionId);
  if (!r.ok) return res.status(401).json({ ok: false, reason: r.reason || 'expired' });
  return res.json({ ok: true, sessions: r.sessions });
});

app.post('/api/access/release', (req, res) => {
  const code = (req.body && (req.body.code || req.body.clave)) || '';
  const sessionId = (req.body && req.body.sessionId) || '';
  if (access.releaseSession) access.releaseSession(code, sessionId);
  return res.json({ ok: true });
});

app.post('/api/chat', async (req, res) => {
  try {
    wakeSearx().catch(() => {});

    const q =
      (req.body && (req.body.q || req.body.message || req.body.text)) || '';
    const accessCode =
      (req.body && (req.body.accessCode || req.body.code || req.body.clave)) || '';
    const adminMode = !!(req.body && (req.body.adminMode || req.body.admin));
    const history = (req.body && Array.isArray(req.body.history)) ? req.body.history : [];

    const sessionId =
      (req.body && (req.body.sessionId || req.body.session)) || '';
    if (access.accessRequired()) {
      if (!access.isValidCode(accessCode)) {
        const wrong =
          access.belongsToThisServer &&
          !access.belongsToThisServer(accessCode) &&
          access.normalizeCode(accessCode) &&
          !access.isAdmin(accessCode);
        return res.status(401).json({
          reply: wrong
            ? 'Esta clave no pertenece a este servidor.'
            : 'Introduce tu llave de acceso en la barra y envía. Sin llave válida el servicio no responde.',
          links: [],
          options: [],
          access: false,
        });
      }
      if (access.sessionOk && !access.sessionOk(accessCode, sessionId) && !access.isAdmin(accessCode)) {
        // intentar abrir sesión si hay cupo
        const opened = access.openSession(accessCode, sessionId || null);
        if (!opened.ok) {
          return res.status(opened.reason === 'limit' ? 429 : 401).json({
            reply: opened.reply || 'Sesión no válida. Vuelve a escribir tu llave.',
            links: [],
            options: [],
            access: false,
          });
        }
        // ok — sesión creada/renovada
      } else if (access.heartbeat && sessionId) {
        access.heartbeat(accessCode, sessionId);
      }
    }

    const searxUrl = access.searxUrlForCode(accessCode);
    const data = await procesar(String(q), { adminMode, history, searxUrl, accessCode });

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
      reply:
        'No pude completar eso ahora. Prueba de nuevo en un momento, por favor.',
      image: 'index_files/2_fBUK.jpg',
      links: [],
      options: [],
    });
  }
});

app.listen(PORT, () => {
  console.log('Apsara Vimana on', PORT);
  console.log('SEARXNG_URL:', searxBase() || '(missing)');
  console.log(
    'LLM:',
    process.env.OPENROUTER_API_KEY || process.env.LLM_API_KEY ? 'key set' : 'no key'
  );
  console.log('INSTANCE_POOL:', process.env.INSTANCE_POOL || 'A');
  console.log('ACCESS:', access.accessRequired() ? 'keys required' : 'open');
  wakeSearx()
    .then((r) => console.log('wake-searx on boot:', r))
    .catch(() => {});
});
