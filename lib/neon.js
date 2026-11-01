const { neon } = require('@neondatabase/serverless');

let _sql = null;
function getSql() {
  if (!process.env.DATABASE_URL) return null;
  if (!_sql) _sql = neon(process.env.DATABASE_URL);
  return _sql;
}

async function guardarMensaje(rol, contenido) {
  const sql = getSql();
  if (!sql) return;

  const r = String(rol || '').trim();
  const c = String(contenido ?? '').trim();

  // Evita inserts vacíos -> eso era lo que disparaba el NOT NULL
  if (!r || !c) return;

  await sql`
    INSERT INTO mensajes (rol, contenido)
    VALUES (${r}, ${c})
  `;
}

module.exports = { guardarMensaje };
