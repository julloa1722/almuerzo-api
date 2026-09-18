/**
require('pg').types.setTypeParser(20, (v) => parseInt(v, 10)); // ver src/common/pg-tipos.ts
 * Prueba de integración del Sprint 1 — corre contra una base real (docker compose up).
 * Se conecta con DATABASE_URL (el rol almuerzo_app, SIN privilegio BYPASSRLS) a
 * propósito: si esto corriera con el superusuario, pasaría sin haber probado nada,
 * porque los superusuarios de Postgres ignoran RLS por completo.
 *
 * Ejecutar: npm run migrate && npm run seed && node test/tenant-isolation.test.js
 */
require('dotenv').config();
const { Client } = require('pg');

let fallas = 0;
function ok(cond, msg) {
  console.log((cond ? '  OK  ' : ' FALLA ') + msg);
  if (!cond) fallas++;
}

/** Ejecuta `fn(client)` dentro de una transacción con app.empresa_id fijado. */
async function comoEmpresa(client, empresaId, fn) {
  await client.query('BEGIN');
  await client.query(`SELECT set_config('app.empresa_id', $1, true)`, [String(empresaId)]);
  try {
    const resultado = await fn();
    await client.query('COMMIT');
    return resultado;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  }
}

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  // Las dos empresas de prueba no tienen RLS (no son propiedad de sí mismas),
  // así que esto funciona sin ningún GUC fijado.
  await client.query(`DELETE FROM empresa WHERE rnc IN ('999-00001-1','999-00002-2')`);
  const { rows: empA } = await client.query(
    `INSERT INTO empresa (rnc, nombre) VALUES ('999-00001-1', 'Empresa Test A') RETURNING id`,
  );
  const { rows: empB } = await client.query(
    `INSERT INTO empresa (rnc, nombre) VALUES ('999-00002-2', 'Empresa Test B') RETURNING id`,
  );
  const idA = empA[0].id;
  const idB = empB[0].id;

  // Insertar un colaborador en cada empresa SÍ requiere el GUC correcto,
  // porque la política de colaborador aplica también a INSERT (WITH CHECK
  // usa la misma expresión que USING cuando no se especifica aparte).
  await comoEmpresa(client, idA, () =>
    client.query(
      `INSERT INTO colaborador (empresa_id, codigo_nomina, cedula, nombre_completo)
       VALUES ($1, 'TEST-A1', '999-1111111-1', 'Colaborador de A')`,
      [idA],
    ),
  );
  await comoEmpresa(client, idB, () =>
    client.query(
      `INSERT INTO colaborador (empresa_id, codigo_nomina, cedula, nombre_completo)
       VALUES ($1, 'TEST-B1', '999-2222222-2', 'Colaborador de B')`,
      [idB],
    ),
  );

  // --- Intento de fuga: insertar un colaborador de B mientras el GUC dice A ---
  let fugaBloqueada = false;
  try {
    await comoEmpresa(client, idA, () =>
      client.query(
        `INSERT INTO colaborador (empresa_id, codigo_nomina, cedula, nombre_completo)
         VALUES ($1, 'TEST-FUGA', '999-3333333-3', 'Intento de fuga')`,
        [idB], // empresa_id real es B, pero el GUC activo dice A
      ),
    );
  } catch {
    fugaBloqueada = true;
  }
  ok(fugaBloqueada, 'Postgres rechaza insertar una fila de B mientras el GUC activo dice A (WITH CHECK)');

  // --- Prueba 1: con el GUC fijado en A, solo se ve A ---
  const vistosDesdeA = await comoEmpresa(client, idA, async () => {
    const { rows } = await client.query('SELECT nombre_completo FROM colaborador');
    return rows;
  });
  ok(vistosDesdeA.length === 1, 'con app.empresa_id = A, la consulta devuelve exactamente 1 fila');
  ok(vistosDesdeA[0]?.nombre_completo === 'Colaborador de A', 'esa fila es la de la empresa A, no la de B');

  // --- Prueba 2: SELECT * sin WHERE, el caso que RLS existe para prevenir ---
  const selectEstrella = await comoEmpresa(client, idB, async () => {
    const { rows } = await client.query('SELECT * FROM colaborador');
    return rows;
  });
  ok(
    selectEstrella.length > 0 && selectEstrella.every((r) => r.empresa_id === idB),
    'un SELECT * sin WHERE, con app.empresa_id = B, jamás devuelve filas de otra empresa',
  );

  // --- Prueba 3: sin ningún GUC fijado, no se ve nada (falla cerrado) ---
  await client.query('BEGIN');
  const { rows: sinGuc } = await client.query('SELECT * FROM colaborador');
  await client.query('ROLLBACK');
  ok(sinGuc.length === 0, 'sin app.empresa_id fijado, la consulta no devuelve ninguna fila (falla cerrado, no abierto)');

  // Limpieza, cada una en su propio ámbito
  await comoEmpresa(client, idA, () =>
    client.query(`DELETE FROM colaborador WHERE codigo_nomina = 'TEST-A1'`),
  );
  await comoEmpresa(client, idB, () =>
    client.query(`DELETE FROM colaborador WHERE codigo_nomina = 'TEST-B1'`),
  );
  await client.query(`DELETE FROM empresa WHERE rnc IN ('999-00001-1','999-00002-2')`);

  await client.end();

  console.log(`\n${fallas === 0 ? 'Todas las pruebas pasaron.' : fallas + ' prueba(s) fallaron.'}`);
  process.exit(fallas === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
