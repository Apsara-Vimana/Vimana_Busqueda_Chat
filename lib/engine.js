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
  const token
