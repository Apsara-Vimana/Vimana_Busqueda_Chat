/**
 * Neon Postgres (opcional). Si no hay DATABASE_URL, no hace nada.
 */
const { neon } = require('@neondatabase/serverless');

let sql = null;

function getSql() {
  if (sql) return sql;
  const url = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || '';
  if (!url) return null;
  try {
    sql = neon(url);
    return sql;
  } catch (e) {
    console.warn('[neon] no disponible:', e.message);
    return null;
  }
}

async function initSchema() {
  const db = getSql();
  if (!db) return false;
  try {
    await db`
      CREATE TABLE IF NOT EXISTS mensajes (
        id SERIAL PRIMARY KEY,
        rol TEXT NOT NULL,
        contenido TEXT NOT NULL,
        meta JSONB DEFAULT '{}',
        creado_en TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    return true;
  } catch (e) {
    console.warn('[neon] schema:', e.message);
    return false;
  }
}

async function guardarMensaje(rol, contenido, meta = {}) {
  const db = getSql();
  if (!db) return null;
  try {
    const rows = await db`
      INSERT INTO mensajes (rol, contenido, meta)
      VALUES (${rol}, ${contenido}, ${JSON.stringify(meta)})
      RETURNING id, creado_en
    `;
    return rows[0] || null;
  } catch (e) {
    console.warn('[neon] guardar:', e.message);
    return null;
  }
}

module.exports = { getSql, initSchema, guardarMensaje };
