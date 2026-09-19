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
    // El mensaje anterior sugería `docker compose down -v`, pero este proyecto
    // decidió explícitamente no usar Docker (ver CLAUDE.md) — así que ese
    // consejo no se podía seguir en ninguna máquina del proyecto.
    console.error('Para volver atrás, usa el branching / point-in-time restore de Neon:');
    console.error('  crea un branch desde un punto anterior y apunta ahí tus *_DATABASE_URL.');
    console.error('Ojo en producción: restaurar la base NO revierte el código desplegado.');
    process.exit(1);
  }

  const databaseUrl = process.env.MIGRATE_DATABASE_URL;
  if (!databaseUrl) {
    console.error('Falta MIGRATE_DATABASE_URL. Copia .env.example a .env primero.');
    process.exit(1);
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  // Sprint 20: a partir de ahora esto corre en el startCommand de Render, en
  // cada arranque. Eso abre una ventana real de concurrencia que antes no
  // existía: un redeploy que coincide con un arranque en frío, o el usuario
  // corriéndolo a mano desde su máquina mientras Render reinicia. Sin lock,
  // los dos procesos ven la misma lista de pendientes y el segundo revienta
  // contra la PK de schema_migrations — y si eso pasa en el startCommand, el
  // servicio no arranca.
  //
  // `pg_advisory_lock` es a nivel de sesión y se libera solo al cerrar la
  // conexión, incluso si el proceso muere. El segundo proceso espera acá y
  // luego no encuentra nada pendiente, que es exactamente lo que queremos.
  // La constante es arbitraria pero fija: identifica "las migraciones de este
  // proyecto".
  const LOCK_ID = 4120250920;
  console.log('Tomando el lock de migraciones ...');
  await client.query('SELECT pg_advisory_lock($1)', [LOCK_ID]);

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
