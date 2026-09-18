/**
 * Prueba de integración del Sprint 6 — corre contra una base real.
 * Verifica:
 *  1. Las funciones puras del catálogo de campos y el generador de CSV.
 *  2. Que `movimiento` es append-only de verdad: almuerzo_app no puede
 *     hacer UPDATE ni DELETE (REVOKE de la migración 0010), no solo por
 *     convención de código.
 *  3. `postearCargo`/`cicloAbiertoOCrear` (src/common/libro-mayor.ts):
 *     crea el ciclo si falta, reutiliza el mismo ciclo para pedidos del
 *     mismo período, no postea nada si el monto es 0 (cobertura total), y
 *     si el ciclo original ya cerró, postea en el ciclo abierto vigente hoy.
 *
 * El flujo HTTP completo (crear pedido → entregar → confirmar → ver el
 * movimiento generado → bloqueo de cierre con pendientes → cerrar ciclo →
 * descargar el archivo de descuento con una plantilla propia) se validó
 * end-to-end contra la API real durante el desarrollo — ver la conversación.
 *
 * Ejecutar: npm run migrate && npm run seed && npm run build && node test/nomina.test.js
 */
require('dotenv').config();
require('pg').types.setTypeParser(20, (v) => parseInt(v, 10));
const { Client } = require('pg');
const { validarPlantilla, generarCsv, CAMPOS_DISPONIBLES } = require('../dist/nomina/campos-reporte');
const { cicloAbiertoOCrear, postearCargo } = require('../dist/common/libro-mayor');
const { periodoDe } = require('../dist/common/calendario.util');

let fallas = 0;
function ok(cond, msg) {
  console.log((cond ? '  OK  ' : ' FALLA ') + msg);
  if (!cond) fallas++;
}

async function main() {
  // --- 1. Funciones puras ---
  ok(CAMPOS_DISPONIBLES.some((c) => c.clave === 'monto_total'), 'el catálogo incluye monto_total');

  const plantillaValida = validarPlantilla([{ campo: 'codigo_nomina' }, { campo: 'monto_total', etiqueta: 'A descontar' }]);
  ok(plantillaValida.length === 2, 'validarPlantilla acepta una plantilla válida');

  let rechazoCampoDesconocido = false;
  try {
    validarPlantilla([{ campo: 'numero_de_tarjeta_de_credito' }]);
  } catch {
    rechazoCampoDesconocido = true;
  }
  ok(rechazoCampoDesconocido, 'validarPlantilla rechaza un campo fuera del catálogo (no admite SQL/expresiones libres)');

  let rechazoNoArray = false;
  try {
    validarPlantilla({ campo: 'monto_total' });
  } catch {
    rechazoNoArray = true;
  }
  ok(rechazoNoArray, 'validarPlantilla rechaza algo que no es un array');

  const csv = generarCsv(
    [{ campo: 'codigo_nomina' }, { campo: 'nombre_completo', etiqueta: 'Nombre, apellido' }, { campo: 'monto_total' }],
    [{ codigo_nomina: 'N-1042', nombre_completo: 'Ana "La Jefa" Ramírez', monto_total: 70 }],
  );
  const lineas = csv.split('\n');
  ok(
    lineas[0] === 'Código de nómina,"Nombre, apellido",Monto a descontar',
    'generarCsv usa la etiqueta default del catálogo cuando no se personaliza, y escapa la etiqueta con coma que sí se personalizó',
  );
  ok(lineas[1] === 'N-1042,"Ana ""La Jefa"" Ramírez",70', 'generarCsv escapa comillas dobles en un valor');

  // --- 2 y 3: contra la base real ---
  const su = new Client({ connectionString: process.env.MIGRATE_DATABASE_URL });
  await su.connect();

  const { rows: empresas } = await su.query(`SELECT id, frecuencia_nomina FROM empresa WHERE nombre = 'Futuro ARS'`);
  const empresaId = empresas[0].id;
  const frecuencia = empresas[0].frecuencia_nomina;
  const { rows: colabs } = await su.query(`SELECT id FROM colaborador WHERE codigo_nomina = 'N-1042'`);
  const anaId = colabs[0].id;

  // Limpieza de un run anterior
  await su.query(`DELETE FROM movimiento WHERE motivo LIKE 'TESTNOMINA-%'`);
  await su.query(`DELETE FROM ciclo_nomina WHERE empresa_id = $1 AND periodo_inicio = '2030-01-01'`, [empresaId]);

  // --- Append-only de verdad: almuerzo_app no puede UPDATE/DELETE movimiento ---
  const { rows: movFixture } = await su.query(
    `INSERT INTO movimiento (empresa_id, colaborador_id, ciclo_nomina_id, tipo, monto, motivo)
     SELECT $1, $2, id, 'CARGO', 100, 'TESTNOMINA-fixture-revoke' FROM ciclo_nomina
     WHERE empresa_id = $1 LIMIT 1`,
    [empresaId, anaId],
  );
  // Si no había ningún ciclo_nomina todavía, crea uno de prueba para este chequeo puntual.
  let movimientoIdRevoke;
  if (!movFixture.length) {
    const { rows: cicloTmp } = await su.query(
      `INSERT INTO ciclo_nomina (empresa_id, periodo_inicio, periodo_fin) VALUES ($1, '2030-01-01', '2030-01-15') RETURNING id`,
      [empresaId],
    );
    const { rows: movTmp } = await su.query(
      `INSERT INTO movimiento (empresa_id, colaborador_id, ciclo_nomina_id, tipo, monto, motivo)
       VALUES ($1, $2, $3, 'CARGO', 100, 'TESTNOMINA-fixture-revoke') RETURNING id`,
      [empresaId, anaId, cicloTmp[0].id],
    );
    movimientoIdRevoke = movTmp[0].id;
  } else {
    movimientoIdRevoke = movFixture[0].id;
  }

  const app = new Client({ connectionString: process.env.DATABASE_URL });
  await app.connect();
  await app.query('BEGIN');
  await app.query(`SELECT set_config('app.empresa_id', $1, true)`, [String(empresaId)]);
  let updateRechazado = false;
  try {
    await app.query('UPDATE movimiento SET monto = 999 WHERE id = $1', [movimientoIdRevoke]);
  } catch (err) {
    updateRechazado = err.code === '42501'; // insufficient_privilege
  }
  ok(updateRechazado, 'almuerzo_app no puede hacer UPDATE sobre movimiento (REVOKE de la migración 0010)');
  await app.query('ROLLBACK');

  await app.query('BEGIN');
  await app.query(`SELECT set_config('app.empresa_id', $1, true)`, [String(empresaId)]);
  let deleteRechazado = false;
  try {
    await app.query('DELETE FROM movimiento WHERE id = $1', [movimientoIdRevoke]);
  } catch (err) {
    deleteRechazado = err.code === '42501';
  }
  ok(deleteRechazado, 'almuerzo_app no puede hacer DELETE sobre movimiento (REVOKE de la migración 0010)');
  await app.query('ROLLBACK');

  // --- postearCargo / cicloAbiertoOCrear, con el rol de la app ---
  await app.query('BEGIN');
  await app.query(`SELECT set_config('app.empresa_id', $1, true)`, [String(empresaId)]);

  const periodoFuturo = { inicio: '2031-06-01', fin: '2031-06-15' };
  await postearCargo(app, {
    empresaId,
    colaboradorId: anaId,
    fechaServicio: new Date('2031-06-05'),
    frecuenciaNomina: frecuencia,
    pedidoId: null,
    monto: 70,
  });
  const { rows: ciclo1 } = await app.query(
    `SELECT id FROM ciclo_nomina WHERE empresa_id = $1 AND periodo_inicio = $2 AND periodo_fin = $3`,
    [empresaId, periodoFuturo.inicio, periodoFuturo.fin],
  );
  ok(ciclo1.length === 1, 'postearCargo crea el ciclo_nomina del período si no existía');

  await postearCargo(app, {
    empresaId,
    colaboradorId: anaId,
    fechaServicio: new Date('2031-06-06'),
    frecuenciaNomina: frecuencia,
    pedidoId: null,
    monto: 50,
  });
  const { rows: ciclosMismoPeriodo } = await app.query(
    `SELECT id FROM ciclo_nomina WHERE empresa_id = $1 AND periodo_inicio = $2 AND periodo_fin = $3`,
    [empresaId, periodoFuturo.inicio, periodoFuturo.fin],
  );
  ok(ciclosMismoPeriodo.length === 1, 'un segundo cargo del mismo período reutiliza el mismo ciclo, no crea otro');

  const { rows: movimientosDelCiclo } = await app.query('SELECT monto FROM movimiento WHERE ciclo_nomina_id = $1 ORDER BY monto', [
    ciclo1[0].id,
  ]);
  ok(
    movimientosDelCiclo.length === 2 && Number(movimientosDelCiclo[0].monto) === 50 && Number(movimientosDelCiclo[1].monto) === 70,
    'los dos cargos quedaron registrados con sus montos correctos',
  );

  // Monto 0 (cobertura total): no debe insertar nada.
  await postearCargo(app, {
    empresaId,
    colaboradorId: anaId,
    fechaServicio: new Date('2031-06-07'),
    frecuenciaNomina: frecuencia,
    pedidoId: null,
    monto: 0,
  });
  const { rows: sinCargoPorCobertura } = await app.query('SELECT COUNT(*) AS n FROM movimiento WHERE ciclo_nomina_id = $1', [
    ciclo1[0].id,
  ]);
  ok(Number(sinCargoPorCobertura[0].n) === 2, 'con monto 0 (cobertura total) no se inserta ningún movimiento nuevo');

  // Ciclo ya CERRADO: el cargo posterior debe ir al ciclo abierto vigente HOY, no reabrir el cerrado.
  await app.query(`UPDATE ciclo_nomina SET estado = 'CERRADO', cerrado_en = now() WHERE id = $1`, [ciclo1[0].id]);
  await postearCargo(app, {
    empresaId,
    colaboradorId: anaId,
    fechaServicio: new Date('2031-06-08'), // mismo período ya cerrado
    frecuenciaNomina: frecuencia,
    pedidoId: null,
    monto: 30,
  });
  const { rows: cicloCerradoIntacto } = await app.query('SELECT COUNT(*) AS n FROM movimiento WHERE ciclo_nomina_id = $1', [
    ciclo1[0].id,
  ]);
  ok(Number(cicloCerradoIntacto[0].n) === 2, 'el ciclo ya cerrado no recibió el cargo nuevo — sigue con sus 2 movimientos originales');

  const cicloVigenteHoy = periodoDe(new Date(), frecuencia);
  const { rows: cargoTardio } = await app.query(
    `SELECT m.monto FROM movimiento m
     JOIN ciclo_nomina cn ON cn.id = m.ciclo_nomina_id
     WHERE cn.empresa_id = $1 AND cn.periodo_inicio = $2 AND cn.periodo_fin = $3 AND m.monto = 30`,
    [empresaId, cicloVigenteHoy.inicio, cicloVigenteHoy.fin],
  );
  ok(cargoTardio.length === 1, 'el cargo tardío se posteó en el ciclo abierto vigente HOY, no en el que ya cerró');

  await app.query('ROLLBACK');
  await app.end();

  // Limpieza
  await su.query(`DELETE FROM movimiento WHERE motivo LIKE 'TESTNOMINA-%'`);
  await su.query(`DELETE FROM ciclo_nomina WHERE empresa_id = $1 AND periodo_inicio = '2030-01-01'`, [empresaId]);
  await su.end();

  console.log(`\n${fallas === 0 ? 'Todas las pruebas pasaron.' : fallas + ' prueba(s) fallaron.'}`);
  process.exit(fallas === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
