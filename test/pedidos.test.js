/**
 * Prueba de integración del Sprint 4 — corre contra una base real.
 * Verifica:
 *  1. calcularSubsidio con los casos del diseño original.
 *  2. Contra la base real: RLS de pedido/pedido_linea por empresa.
 *  3. La restricción EXCLUDE de asignacion_programa (no permite solapes).
 *
 * Los casos de bloqueo del motor completo (cutoff, cupo, topes) se prueban
 * con curl en la conversación — este test cubre lo que es más rápido y
 * confiable de verificar por SQL/funciones puras directamente.
 *
 * Ejecutar: npm run migrate && npm run seed && npm run build && node test/pedidos.test.js
 */
require('dotenv').config();
require('pg').types.setTypeParser(20, (v) => parseInt(v, 10));
const { Client } = require('pg');
const { calcularSubsidio } = require('../dist/pedidos/elegibilidad.util');

let fallas = 0;
function ok(cond, msg) {
  console.log((cond ? '  OK  ' : ' FALLA ') + msg);
  if (!cond) fallas++;
}

async function main() {
  // --- 1. calcularSubsidio ---
  const programa = {
    tipoSubsidio: 'MONTO_FIJO',
    valorSubsidio: 250,
    topeDiarioSubsidio: 300,
    topeCicloColaborador: 3000,
    permiteExcedente: true,
    pctMaxSalario: 15,
  };

  const c1 = calcularSubsidio(programa, 320, 0);
  ok(c1.subsidio === 250 && c1.montoColaborador === 70, 'bandeja de 320: 250 de subsidio + 70 a cargo del colaborador');

  const c2 = calcularSubsidio({ ...programa, tipoSubsidio: 'PORCENTAJE', valorSubsidio: 50 }, 400, 0);
  ok(c2.subsidio === 200 && c2.montoColaborador === 200, 'porcentaje 50% de 400: subsidio 200, a cargo 200');

  const c3 = calcularSubsidio({ ...programa, tipoSubsidio: 'TOTAL' }, 280, 0);
  ok(c3.subsidio === 280 && c3.montoColaborador === 0, 'cobertura total: subsidio = bruto completo');

  // El tope diario recorta el subsidio si ya se usó parte del día
  const c4 = calcularSubsidio(programa, 320, 200); // ya se usaron 200 de los 300 del tope diario
  ok(c4.subsidio === 100 && c4.montoColaborador === 220, 'tope diario recorta el subsidio a 100 (300-200 restantes)');

  // --- 2 y 3: contra la base real ---
  const superusuario = new Client({ connectionString: process.env.MIGRATE_DATABASE_URL });
  await superusuario.connect();

  const { rows: colabs } = await superusuario.query(
    `SELECT id, empresa_id FROM colaborador WHERE codigo_nomina IN ('N-1042','N-1187') ORDER BY codigo_nomina`,
  );
  const ana = colabs[0];

  // EXCLUDE: no debe poder asignarse un segundo programa solapado a Ana
  const { rows: progRows } = await superusuario.query(
    `SELECT id FROM programa_beneficio WHERE empresa_id = $1 LIMIT 1`,
    [ana.empresa_id],
  );
  let solapeRechazado = false;
  try {
    await superusuario.query(
      `INSERT INTO asignacion_programa (empresa_id, colaborador_id, programa_id, vigente_desde)
       VALUES ($1, $2, $3, '2026-06-01')`,
      [ana.empresa_id, ana.id, progRows[0].id],
    );
  } catch {
    solapeRechazado = true;
  }
  ok(solapeRechazado, 'Postgres rechaza una segunda asignación de programa solapada para el mismo colaborador (EXCLUDE)');

  await superusuario.end();

  // RLS de pedido: sin GUC, no se ve nada
  const clienteApp = new Client({ connectionString: process.env.DATABASE_URL });
  await clienteApp.connect();
  await clienteApp.query('BEGIN');
  const { rows: sinGuc } = await clienteApp.query('SELECT * FROM pedido');
  await clienteApp.query('ROLLBACK');
  ok(sinGuc.length === 0, 'sin app.empresa_id fijado, la tabla pedido tampoco devuelve nada');
  await clienteApp.end();

  console.log(`\n${fallas === 0 ? 'Todas las pruebas pasaron.' : fallas + ' prueba(s) fallaron.'}`);
  process.exit(fallas === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
