require('dotenv').config();
const { Client } = require('pg');
(async () => {
  const c = new Client({ connectionString: process.env.MIGRATE_DATABASE_URL });
  await c.connect();
  const r = await c.query(
    "UPDATE contrato_suplidor SET estado = 'INACTIVA' WHERE id = 11 RETURNING id, empresa_id, suplidor_id, ajuste_pct, estado",
  );
  console.log('contrato 11 puesto INACTIVA para la prueba:', r.rows[0]);
  await c.end();
})();
