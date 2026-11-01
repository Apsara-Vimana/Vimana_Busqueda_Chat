/**
 * Hugging Face embeddings (opcional)
 * Modelo: thenlper/gte-small
 *
 * Sin HUGGINGFACE_TOKEN → null (el chat no se rompe).
 * Nunca loguear ni devolver el token.
 */

const HF_URL =
  'https://api-inference.huggingface.co/models/thenlper/gte-small';

let _tokenValid = null; // cachea resultado de whoami

function hasToken() {
  return Boolean(
    process.env.HUGGINGFACE_TOKEN && process.env.HUGGINGFACE_TOKEN.trim()
  );
}

/**
 * Verifica si el token es válido (cachea resultado 1 hora).
 */
async function verifyToken() {
  const now = Date.now();
  const oneHour = 3600000;
  if (_tokenValid !== null && now - (_tokenValid._ts || 0) < oneHour) {
    return _tokenValid.ok;
  }

  const token = (process.env.HUGGINGFACE_TOKEN || '').trim();
  if (!token) {
    _tokenValid = { ok: false };
    return false;
  }

  try {
    const r = await fetch('https://huggingface.co/api/whoami-v2', {
      method: 'GET',
      headers: { Authorization: 'Bearer ' + token },
    });
    _tokenValid = { ok: r.ok, _ts: now };
    return r.ok;
  } catch {
    _tokenValid = { ok: false, _ts: now };
    return false;
  }
}

/**
 * @param {string} text
 * @returns {Promise<number[]|null>} vector o null si no hay token / error
 */
async function getEmbedding(text) {
  const token = (process.env.HUGGINGFACE_TOKEN || '').trim();
  if (!token) return null;

  const input = String(text || '').trim().slice(0, 2000);
  if (!input) return null;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 25000);

  try {
    const res = await fetch(HF_URL, {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: input,
        options: { wait_for_model: true },
      }),
    });

    if (!res.ok) {
      // 503 = modelo cargando; 401 = token mal
      return null;
    }

    const data = await res.json();

    // feature-extraction suele devolver number[][] (tokens) o number[]
    if (Array.isArray(data) && typeof data[0] === 'number') {
      return data;
    }
    if (Array.isArray(data) && Array.isArray(data[0])) {
      // mean pooling simple sobre tokens
      const dim = data[0].length;
      const out = new Array(dim).fill(0);
      for (let i = 0; i < data.length; i++) {
        for (let d = 0; d < dim; d++) out[d] += data[i][d];
      }
      for (let d = 0; d < dim; d++) out[d] /= data.length;
      return out;
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Similitud coseno entre dos vectores */
function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;

  let dot = 0;
  let na = 0;
  let nb = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }

  if (na === 0 || nb === 0) return 0;

  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

module.exports = { getEmbedding, cosineSimilarity, hasToken, verifyToken };
