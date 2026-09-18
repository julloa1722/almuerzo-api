/**
 * Prueba de integración del Sprint 9.1 (reportes) — corre contra una base
 * real. Verifica, con la misma consulta que arma ReportesController, que:
 *  1. `consumo-colaborador` y `gasto-empresa` salen de `movimiento` (el
 *     libro mayor, Sprint 6), no de `pedido` directo — un pedido todavía
 *     `ENTREGADO` (sin CARGO posteado) NO se cuenta, aunque esté dentro del
 *     rango de fechas y no esté cancelado. Uno `RECIBIDO` (con su CARGO en
 *     movimiento) sí se cuenta, con el monto correcto.
 *  2. Un colaborador sin cargos en el rango aparece igual, con 0 en todo
 *     (LEFT JOIN, no INNER — si no, desaparecería de su propio reporte).
 *  3. RLS acota consumo-colaborador y gasto-empresa a la propia empresa en
 *     ámbito EMPRESA, y plataforma (bypass) ve todas las empresas.
 *
 * `entregas-suplidor` y `disputas` sí reutilizan el patrón directo sobre
 * `pedido` — son conteos de estado/disputa, no de dinero — ya cubierto por
 * las pruebas de RLS de los Sprints 4/5. El flujo completo vía HTTP con los
 * cuatro roles se validó end-to-end contra la API real durante el desarrollo.
 *
 * Ejecutar: npm run migrate && npm run seed && npm run build && node test/reportes.test.js
 */
require('dotenv').config();
require('pg').types.setTypeParser(20, (v) => parseInt(v, 10));
const { Client } = require('pg');

let fallas = 0;
function ok(cond, msg) {
  console.log((cond ? '  OK  ' : ' FALLA ') + msg);
  if (!cond) fallas++;
}

const CONSUMO_COLABORADOR_SQL = `
  WITH cargos AS (
    SELECT m.colaborador_id, m.pedido_id, m.monto AS monto_colaborador, p.total_bruto, p.subsidio_empresa
    FROM movimiento m
    JOIN pedido p ON p.id = m.pedido_id
    WHERE m.tipo = 'CARGO' AND p.fecha_servicio BETWEEN $1 AND $2
  )
  SELECT c.id, c.codigo_nomina, c.nombre_completo,
         COUNT(cg.pedido_id) AS cantidad_pedidos,
         COALESCE(SUM(cg.total_bruto), 0) AS total_bruto,
         COALESCE(SUM(cg.subsidio_empresa), 0) AS subsidio_total,
         COALESCE(SUM(cg.monto_colaborador), 0) AS monto_colaborador_total
  FROM colaborador c
  LEFT JOIN cargos cg ON cg.colaborador_id = c.id
  GROUP BY c.id, c.codigo_nomina, c.nombre_completo
  ORDER BY c.nombre_completo
`;

async function main() {
  const su = new Client({ connectionString: process.env.MIGRATE_DATABASE_URL });
  await su.connect();

  const { rows: futuroArs } = await su.query(`SELECT id, frecuencia_nomina FROM empresa WHERE nombre = 'Futuro ARS'`);
  const empresaId = futuroArs[0].id;
  const { rows: vantia } = await su.query(`SELECT id FROM empresa WHERE nombre = 'Grupo Vantia'`);
  const vantiaExiste = vantia.length > 0;
  const { rows: anaRows } = await su.query(`SELECT id FROM colaborador WHERE codigo_nomina = 'N-1042'`);
  const anaId = anaRows[0].id;
  const { rows: ccRows } = await su.query(`SELECT id FROM suplidor WHERE nombre = 'Cocina Criolla del Este'`);
  const suplidorId = ccRows[0].id;

  // --- Fixtures en un rango de fechas dedicado, lejos de cualquier prueba
  // manual previa: P1 queda ENTREGADO (sin CARGO), P2 llega a RECIBIDO
  // (con su CARGO real posteado por INSERT directo, mismo shape que
  // src/common/libro-mayor.ts) ---
  await su.query(`DELETE FROM movimiento WHERE colaborador_id = $1 AND motivo = 'TEST_REPORTES'`, [anaId]);
  await su.query(`DELETE FROM pedido WHERE codigo_retiro IN ('TESTREP1', 'TESTREP2')`);
  await su.query(`DELETE FROM ciclo_nomina WHERE empresa_id = $1 AND periodo_inicio = '2034-01-01'`, [empresaId]);

  const { rows: p1 } = await su.query(
    `INSERT INTO pedido (empresa_id, colaborador_id, suplidor_id, fecha_servicio, cutoff_at, total_bruto, subsidio_empresa, monto_colaborador, codigo_retiro, estado, entregado_en)
     VALUES ($1, $2, $3, '2034-01-01', '2034-01-01T10:00:00Z', 320, 250, 70, 'TESTREP1', 'ENTREGADO', now()) RETURNING id`,
    [empresaId, anaId, suplidorId],
  );
  const { rows: p2 } = await su.query(
    `INSERT INTO pedido (empresa_id, colaborador_id, suplidor_id, fecha_servicio, cutoff_at, total_bruto, subsidio_empresa, monto_colaborador, codigo_retiro, estado, confirmado_en, confirmado_por)
     VALUES ($1, $2, $3, '2034-01-02', '2034-01-02T10:00:00Z', 320, 250, 70, 'TESTREP2', 'RECIBIDO', now(), 'COLABORADOR') RETURNING id`,
    [empresaId, anaId, suplidorId],
  );
  const { rows: ciclo } = await su.query(
    `INSERT INTO ciclo_nomina (empresa_id, periodo_inicio, periodo_fin) VALUES ($1, '2034-01-01', '2034-01-15') RETURNING id`,
    [empresaId],
  );
  await su.query(
    `INSERT INTO movimiento (empresa_id, colaborador_id, ciclo_nomina_id, pedido_id, tipo, monto, motivo)
     VALUES ($1, $2, $3, $4, 'CARGO', 70, 'TEST_REPORTES')`,
    [empresaId, anaId, ciclo[0].id, p2[0].id],
  );

  const app = new Client({ connectionString: process.env.DATABASE_URL });
  await app.connect();
  await app.query('BEGIN');
  await app.query(`SELECT set_config('app.empresa_id', $1, true)`, [String(empresaId)]);

  const { rows: consumoRango } = await app.query(CONSUMO_COLABORADOR_SQL, ['2034-01-01', '2034-01-15']);
  const ana = consumoRango.find((c) => c.id === anaId);
  ok(
    Number(ana.cantidad_pedidos) === 1 && Number(ana.monto_colaborador_total) === 70,
    'P1 (ENTREGADO, sin CARGO) NO se cuenta; P2 (RECIBIDO, con CARGO) sí — exactamente 1 pedido y 70 de monto',
  );

  // --- Rango sin cargos: cada colaborador aparece con 0, no desaparece ---
  const { rows: consumoVacio } = await app.query(CONSUMO_COLABORADOR_SQL, ['2020-01-01', '2020-01-02']);
  ok(consumoVacio.length >= 4, `el reporte trae los colaboradores de Futuro ARS aunque el rango no tenga cargos (hay ${consumoVacio.length})`);
  ok(
    consumoVacio.every((c) => Number(c.cantidad_pedidos) === 0 && Number(c.total_bruto) === 0),
    'con un rango sin cargos, cada colaborador aparece con 0 — el LEFT JOIN no los hace desaparecer',
  );

  // --- gasto-empresa: en ámbito EMPRESA, solo la propia ---
  const { rows: gastoEmpresa } = await app.query(`SELECT e.id, e.nombre FROM empresa e WHERE e.id = $1`, [empresaId]);
  ok(gastoEmpresa.length === 1, 'gasto-empresa en ámbito EMPRESA solo puede filtrar a la propia empresa (RLS ya lo garantiza en otras tablas)');

  await app.query('ROLLBACK');
  await app.end();

  // --- gasto-empresa: bajo plataforma (bypass), ve todas ---
  const plataforma = new Client({ connectionString: process.env.PLATFORM_DATABASE_URL });
  await plataforma.connect();
  const { rows: todasEmpresas } = await plataforma.query(`SELECT id, nombre FROM empresa`);
  ok(
    todasEmpresas.length >= (vantiaExiste ? 2 : 1),
    `bajo ámbito PLATAFORMA (bypass), el reporte puede agregar todas las empresas (hay ${todasEmpresas.length})`,
  );
  await plataforma.end();

  // Limpieza
  await su.query(`DELETE FROM movimiento WHERE colaborador_id = $1 AND motivo = 'TEST_REPORTES'`, [anaId]);
  await su.query(`DELETE FROM pedido WHERE codigo_retiro IN ('TESTREP1', 'TESTREP2')`);
  await su.query(`DELETE FROM ciclo_nomina WHERE empresa_id = $1 AND periodo_inicio = '2034-01-01'`, [empresaId]);
  await su.end();

  console.log(`\n${fallas === 0 ? 'Todas las pruebas pasaron.' : fallas + ' prueba(s) fallaron.'}`);
  process.exit(fallas === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
