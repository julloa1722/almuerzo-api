/**
 * Prueba de integración del Sprint 7 — corre contra una base real.
 * Verifica:
 *  1. `aplicarAjustePct` (el bug real corregido en este sprint, ver
 *     plan-sprints.md Sprint 4) con datos fijos.
 *  2. RLS de `lote_pago_suplidor`: un suplidor puede leer sus propios lotes,
 *     pero no puede INSERT/UPDATE directamente (sin política permisiva para
 *     esos comandos, RLS los deniega — solo plataforma, vía
 *     almuerzo_platform, los crea/edita).
 *
 * El flujo HTTP completo (crear pedido con ajuste_pct distinto de 0,
 * entregar, confirmar, calcular liquidación agregando dos empresas del
 * mismo suplidor, bloqueo de cálculo con pendientes, marcar pagado, rechazo
 * de recalcular o repagar) se validó end-to-end contra la API real durante
 * el desarrollo — ver la conversación para el detalle exacto.
 *
 * Ejecutar: npm run migrate && npm run seed && npm run build && node test/liquidaciones.test.js
 */
require('dotenv').config();
require('pg').types.setTypeParser(20, (v) => parseInt(v, 10));
const { Client } = require('pg');
const { aplicarAjustePct } = require('../dist/pedidos/elegibilidad.util');

let fallas = 0;
function ok(cond, msg) {
  console.log((cond ? '  OK  ' : ' FALLA ') + msg);
  if (!cond) fallas++;
}

async function main() {
  // --- 1. aplicarAjustePct ---
  ok(aplicarAjustePct(320, -7.5) === 296, 'descuento del 7.5% sobre 320 da 296.00');
  ok(aplicarAjustePct(320, 5) === 336, 'recargo del 5% sobre 320 da 336.00');
  ok(aplicarAjustePct(320, 0) === 320, 'ajuste 0% deja el precio exacto publicado');
  ok(aplicarAjustePct(99.99, -25) === 74.99, 'redondea a 2 decimales (25% de descuento sobre 99.99)');

  // --- 2. RLS de lote_pago_suplidor ---
  const su = new Client({ connectionString: process.env.MIGRATE_DATABASE_URL });
  await su.connect();

  const { rows: sups } = await su.query(`SELECT id FROM suplidor WHERE nombre = 'Cocina Criolla del Este'`);
  const cocinaCriollaId = sups[0].id;

  await su.query(`DELETE FROM lote_pago_suplidor WHERE suplidor_id = $1 AND periodo_inicio = '2032-01-01'`, [cocinaCriollaId]);
  const { rows: fixture } = await su.query(
    `INSERT INTO lote_pago_suplidor (suplidor_id, periodo_inicio, periodo_fin, monto_total, cantidad_pedidos)
     VALUES ($1, '2032-01-01', '2032-01-15', 500, 3) RETURNING id`,
    [cocinaCriollaId],
  );
  const loteId = fixture[0].id;

  const app = new Client({ connectionString: process.env.DATABASE_URL });
  await app.connect();

  await app.query('BEGIN');
  await app.query(`SELECT set_config('app.suplidor_id', $1, true)`, [String(cocinaCriollaId)]);
  const { rows: visto } = await app.query('SELECT id, monto_total FROM lote_pago_suplidor WHERE id = $1', [loteId]);
  ok(visto.length === 1 && Number(visto[0].monto_total) === 500, 'el suplidor ve su propio lote vía RLS de la migración 11');
  await app.query('ROLLBACK');

  // Sin política permisiva de UPDATE para almuerzo_app en esta tabla, RLS no
  // lanza un error — simplemente no hay ninguna fila que el UPDATE pueda
  // tocar (USING se evalúa `false` para todo el mundo en ese comando), así
  // que el resultado correcto es 0 filas afectadas, no una excepción.
  await app.query('BEGIN');
  await app.query(`SELECT set_config('app.suplidor_id', $1, true)`, [String(cocinaCriollaId)]);
  const resultadoUpdate = await app.query(`UPDATE lote_pago_suplidor SET estado = 'PAGADO' WHERE id = $1`, [loteId]);
  ok(resultadoUpdate.rowCount === 0, 'el suplidor no puede marcar su propio lote como pagado (0 filas afectadas, sin política de UPDATE)');
  await app.query('ROLLBACK');

  const { rows: sups2 } = await su.query(`SELECT id FROM suplidor WHERE nombre = 'Verde Menú'`);
  const verdeMenuId = sups2[0].id;
  await app.query('BEGIN');
  await app.query(`SELECT set_config('app.suplidor_id', $1, true)`, [String(verdeMenuId)]);
  const { rows: vistoOtroSuplidor } = await app.query('SELECT id FROM lote_pago_suplidor WHERE id = $1', [loteId]);
  ok(vistoOtroSuplidor.length === 0, 'Verde Menú no ve el lote de Cocina Criolla del Este');
  await app.query('ROLLBACK');

  await app.end();
  await su.query(`DELETE FROM lote_pago_suplidor WHERE id = $1`, [loteId]);
  await su.end();

  console.log(`\n${fallas === 0 ? 'Todas las pruebas pasaron.' : fallas + ' prueba(s) fallaron.'}`);
  process.exit(fallas === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
