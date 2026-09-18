#!/usr/bin/env node
require('pg').types.setTypeParser(20, (v) => parseInt(v, 10)); // ver src/common/pg-tipos.ts
/**
 * Migrador minimalista: aplica los archivos .sql de /migrations en orden alfabético,
 * dentro de una transacción cada uno, y registra cuáles ya corrieron en schema_migrations.
 *
 * Se eligió esto en vez de Prisma/Kysely/node-pg-migrate para el Sprint 1 porque el
 * esquema ya vive como SQL directo (así quedó documentado en el diseño), y porque
 * mantiene el control exacto del DDL que un desarrollador con background de PL/SQL
 * va a preferir. Es reversible: si más adelante se prefiere un ORM con migraciones
 * tipadas, este script se reemplaza sin tocar los archivos .sql ya escritos.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Client } = require('pg');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

async function main() {
  const modo = process.argv[2] === 'down' ? 'down' : 'up';
  if (modo === 'down') {
    console.error('Este runner no soporta rollback automático todavía.');
    console.error('Para revertir en desarrollo: docker compose down -v && docker compose up -d && npm run migrate');
    process.exit(1);
  }

  const databaseUrl = process.env.MIGRATE_DATABASE_URL;
  if (!databaseUrl) {
    console.error('Falta MIGRATE_DATABASE_URL. Copia .env.example a .env primero.');
    process.exit(1);
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      nombre       TEXT PRIMARY KEY,
      checksum     TEXT NOT NULL,
      aplicada_en  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  const archivos = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  const { rows: aplicadas } = await client.query('SELECT nombre FROM schema_migrations');
  const yaAplicadas = new Set(aplicadas.map(r => r.nombre));

  let pendientes = 0;
  for (const archivo of archivos) {
    if (yaAplicadas.has(archivo)) continue;
    pendientes++;
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, archivo), 'utf8');
    const checksum = crypto.createHash('sha256').update(sql).digest('hex');

    console.log(`Aplicando ${archivo} ...`);
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query(
        'INSERT INTO schema_migrations (nombre, checksum) VALUES ($1, $2)',
        [archivo, checksum]
      );
      await client.query('COMMIT');
      console.log(`  OK: ${archivo}`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`  FALLÓ ${archivo}: ${err.message}`);
      await client.end();
      process.exit(1);
    }
  }

  if (pendientes === 0) {
    console.log('Nada que aplicar — el esquema ya está al día.');
  } else {
    console.log(`${pendientes} migración(es) aplicada(s).`);
  }

  await client.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
