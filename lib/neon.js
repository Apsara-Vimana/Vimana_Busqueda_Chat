let pool = null;
let ready = false;

function getPool() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  if (pool) return pool;
  try {
    const { Pool } = require('pg');
    pool = new Pool({
      connectionString: url,
      ssl: url.includes('sslmode=require') || url.includes('neon.tech')
        ? { rejectUnauthorized: false }
        : undefined,
      max: 3,
    });
    pool.on('error', (err) => console.warn('Pool idle error:', err.message));
    return pool;
  } catch (e) {
    console.warn('pg no disponible:', e.message);
    return null;
  }
}

async function ensureTable() {
  const p = getPool();
  if (!p || ready) return !!p;
  try {
    await p.query(`
      CREATE TABLE IF NOT EXISTS mensajes (
        id SERIAL PRIMARY KEY,
        rol TEXT NOT NULL,
        texto TEXT NOT NULL,
        creado TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    // Self-heal: si la tabla ya existía con esquema antiguo, agregar columnas que falten
    await p.query(`ALTER TABLE mensajes ADD COLUMN IF NOT EXISTS rol TEXT`);
    await p.query(`ALTER TABLE mensajes ADD COLUMN IF NOT EXISTS texto TEXT`);
    await p.query(`ALTER TABLE mensajes ADD COLUMN IF NOT EXISTS creado TIMESTAMPTZ DEFAULT NOW()`);
    ready = true;
    return true;
  } catch (e) {
    console.warn('Neon ensureTable:', e.message);
    ready = false; // reintentar en el próximo mensaje
    return false;
  }
}

async function guardarMensaje(rol, texto) {
  try {
    if (!(await ensureTable())) return false;
    const p = getPool();
    await p.query('INSERT INTO mensajes (rol, texto) VALUES ($1, $2)', [
      String(rol || 'user').slice(0, 32),
      String(texto || '').slice(0, 8000),
    ]);
    return true;
  } catch (e) {
    console.warn('Neon guardar:', e.message);
    if (/does not exist/i.test(e.message)) ready = false; // forzar re-creación
    return false;
  }
}

module.exports = { guardarMensaje, ensureTable, getPool };
