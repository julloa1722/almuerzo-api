/**
 * Prueba de integración del Sprint 5 — corre contra una base real.
 * Verifica:
 *  1. Las funciones puras de ventana de silencio.
 *  2. RLS nueva: un suplidor solo ve/toca pedidos de empresas con las que
 *     tiene contrato_suplidor activo (0008), no cualquier pedido con su suplidor_id.
 *  3. La resolución perezosa por política de silencio (AUTO_CONFIRMA y
 *     AUTO_DISPUTA), ejecutando el mismo UPDATE que usa
 *     PedidosController.resolverPorSilencio.
 *
 * Los endpoints HTTP (codigo_retiro, confirmar-recibido, disputar,
 * resolver-disputa) se validaron con curl contra la API real durante el
 * desarrollo — ver la conversación para el detalle exacto de cada prueba.
 *
 * Ejecutar: npm run migrate && npm run seed && npm run build && node test/entrega-disputas.test.js
 */
require('dotenv').config();
require('pg').types.setTypeParser(20, (v) => parseInt(v, 10));
const { Client } = require('pg');
const { ventanaSilencioVencida, ventanaSilencioVenceEn } = require('../dist/common/calendario.util');

let fallas = 0;
function ok(cond, msg) {
  console.log((cond ? '  OK  ' : ' FALLA ') + msg);
  if (!cond) fallas++;
}

const RESOLVER_POR_SILENCIO_SQL = `
  UPDATE pedido p
  SET estado = CASE WHEN pb.politica_silencio = 'AUTO_DISPUTA' THEN 'DISPUTA' ELSE 'RECIBIDO' END,
      confirmado_en = CASE WHEN pb.politica_silencio != 'AUTO_DISPUTA' THEN now() ELSE p.confirmado_en END,
      confirmado_por = CASE WHEN pb.politica_silencio != 'AUTO_DISPUTA' THEN 'SILENCIO' ELSE p.confirmado_por END,
      disputado_en = CASE WHEN pb.politica_silencio = 'AUTO_DISPUTA' THEN now() ELSE p.disputado_en END,
      disputado_por = CASE WHEN pb.politica_silencio = 'AUTO_DISPUTA' THEN 'SILENCIO' ELSE p.disputado_por END,
      motivo_disputa = CASE WHEN pb.politica_silencio = 'AUTO_DISPUTA' THEN 'OTRO' ELSE p.motivo_disputa END
  FROM programa_beneficio pb
  WHERE p.programa_id = pb.id
    AND p.estado = 'ENTREGADO'
    AND p.entregado_en IS NOT NULL
    AND p.entregado_en + (pb.horas_ventana_confirmacion || ' hours')::interval <= now()
`;

async function comoAmbito(client, guc, valor, fn) {
  await client.query('BEGIN');
  await client.query(`SELECT set_config($1, $2, true)`, [guc, String(valor)]);
  try {
    const r = await fn();
    await client.query('COMMIT');
    return r;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  }
}

async function main() {
  // --- 1. Funciones puras de ventana de silencio ---
  const entregadoEn = new Date('2026-07-20T12:00:00Z');
  ok(
    ventanaSilencioVencida(entregadoEn, 24, new Date('2026-07-21T11:00:00Z')) === false,
    'a las 23h de entregado, con ventana de 24h, todavía no venció',
  );
  ok(
    ventanaSilencioVencida(entregadoEn, 24, new Date('2026-07-21T13:00:00Z')) === true,
    'a las 25h de entregado, con ventana de 24h, ya venció',
  );
  const venceEn = ventanaSilencioVenceEn(entregadoEn, 24);
  ok(venceEn.toISOString() === '2026-07-21T12:00:00.000Z', 'ventanaSilencioVenceEn suma las horas exactas');

  // --- 2 y 3: contra la base real ---
  const su = new Client({ connectionString: process.env.MIGRATE_DATABASE_URL });
  await su.connect();

  const { rows: empresas } = await su.query(`SELECT id FROM empresa WHERE nombre = 'Futuro ARS'`);
  const empresaId = empresas[0].id;
  const { rows: sups } = await su.query(`SELECT id, nombre FROM suplidor ORDER BY id`);
  const cocinaCriolla = sups.find((s) => s.nombre === 'Cocina Criolla del Este');
  const verdeMenu = sups.find((s) => s.nombre === 'Verde Menú');
  const { rows: colabs } = await su.query(`SELECT id FROM colaborador WHERE codigo_nomina = 'N-1042'`);
  const anaId = colabs[0].id;
  const { rows: progs } = await su.query(
    `SELECT id, politica_silencio, horas_ventana_confirmacion FROM programa_beneficio WHERE empresa_id = $1 AND tipo = 'ALMUERZO'`,
    [empresaId],
  );
  const programaAutoConfirma = progs[0];
  ok(
    programaAutoConfirma.politica_silencio === 'AUTO_CONFIRMA' && programaAutoConfirma.horas_ventana_confirmacion === 24,
    'el programa sembrado en el Sprint 4 tiene los defaults de silencio de la migración 0008 (AUTO_CONFIRMA, 24h)',
  );

  // Limpieza de un run anterior interrumpido, ANTES de tocar menu_dia (FK
  // desde pedido_linea impide borrar un menu_dia todavía referenciado).
  await su.query(`DELETE FROM pedido_linea WHERE pedido_id IN (SELECT id FROM pedido WHERE codigo_retiro LIKE 'TESTS5-%')`);
  await su.query(`DELETE FROM pedido WHERE codigo_retiro LIKE 'TESTS5-%'`);

  // Producto y menu_dia de prueba (fecha lejana, para no chocar con datos reales)
  const { rows: productos } = await su.query(
    `SELECT id FROM producto WHERE suplidor_id = $1 AND sku = 'BAND-001'`,
    [cocinaCriolla.id],
  );
  await su.query(`DELETE FROM menu_dia WHERE suplidor_id = $1 AND fecha = '2099-01-15'`, [cocinaCriolla.id]);
  const { rows: menuRows } = await su.query(
    `INSERT INTO menu_dia (suplidor_id, producto_id, fecha, precio, cupo_max, cupo_usado)
     VALUES ($1, $2, '2099-01-15', 320, 8, 1) RETURNING id`,
    [cocinaCriolla.id, productos[0].id],
  );
  const menuDiaId = menuRows[0].id;

  // Segundo programa de prueba: AUTO_DISPUTA, ventana de 1 hora
  await su.query(`DELETE FROM programa_beneficio WHERE nombre = 'Almuerzo AUTO_DISPUTA (test Sprint 5)'`);
  const { rows: prog2Rows } = await su.query(
    `INSERT INTO programa_beneficio
       (empresa_id, tipo, nombre, tipo_subsidio, valor_subsidio, permite_excedente, politica_silencio, horas_ventana_confirmacion)
     VALUES ($1, 'ALMUERZO', 'Almuerzo AUTO_DISPUTA (test Sprint 5)', 'MONTO_FIJO', 250, true, 'AUTO_DISPUTA', 1)
     RETURNING id`,
    [empresaId],
  );
  const programaAutoDisputa = prog2Rows[0].id;

  // Limpia y crea 3 pedidos de prueba directo por SQL (fixture, no vía HTTP):
  //  P1: CONFIRMADO, para probar RLS de lectura/escritura del suplidor.
  //  P2: ENTREGADO hace 30h, programa AUTO_CONFIRMA (24h) -> debe resolver a RECIBIDO.
  //  P3: ENTREGADO hace 2h, programa AUTO_DISPUTA (1h) -> debe resolver a DISPUTA.
  //  P4: ENTREGADO hace 1h, programa AUTO_CONFIRMA (24h) -> NO debe resolver todavía.

  // Fechas de servicio distintas por fixture: pedido tiene UNIQUE
  // (colaborador_id, fecha_servicio, suplidor_id) — todas referencian el
  // mismo menu_dia de prueba vía pedido_linea, eso no exige que coincida
  // con fecha_servicio (esa relación la impone el código de la app, no un FK).
  async function crearPedidoFixture(codigo, fechaServicio, estado, programaId, entregadoEn) {
    const { rows } = await su.query(
      `INSERT INTO pedido (empresa_id, colaborador_id, suplidor_id, fecha_servicio, cutoff_at, total_bruto, subsidio_empresa, monto_colaborador, codigo_retiro, programa_id, estado, entregado_en)
       VALUES ($1, $2, $3, $4, '2099-01-14T10:00:00Z', 320, 250, 70, $5, $6, $7, $8)
       RETURNING id`,
      [empresaId, anaId, cocinaCriolla.id, fechaServicio, `TESTS5-${codigo}`, programaId, estado, entregadoEn],
    );
    const pedidoId = rows[0].id;
    await su.query(
      `INSERT INTO pedido_linea (pedido_id, empresa_id, menu_dia_id, cantidad, precio_unit, subtotal)
       VALUES ($1, $2, $3, 1, 320, 320)`,
      [pedidoId, empresaId, menuDiaId],
    );
    return pedidoId;
  }

  const p1 = await crearPedidoFixture('P1', '2099-01-15', 'CONFIRMADO', programaAutoConfirma.id, null);
  const p2 = await crearPedidoFixture('P2', '2099-01-16', 'ENTREGADO', programaAutoConfirma.id, new Date(Date.now() - 30 * 3_600_000));
  const p3 = await crearPedidoFixture('P3', '2099-01-17', 'ENTREGADO', programaAutoDisputa, new Date(Date.now() - 2 * 3_600_000));
  const p4 = await crearPedidoFixture('P4', '2099-01-18', 'ENTREGADO', programaAutoConfirma.id, new Date(Date.now() - 1 * 3_600_000));

  // --- RLS: Cocina Criolla (con contrato activo con Futuro ARS) ve y puede tocar P1 ---
  const app = new Client({ connectionString: process.env.DATABASE_URL });
  await app.connect();

  const vistoConContrato = await comoAmbito(app, 'app.suplidor_id', cocinaCriolla.id, async () => {
    const { rows } = await app.query('SELECT id FROM pedido WHERE id = $1', [p1]);
    return rows;
  });
  ok(vistoConContrato.length === 1, 'Cocina Criolla (con contrato activo) ve el pedido P1 vía RLS nueva de 0008');

  const vistoSinContrato = await comoAmbito(app, 'app.suplidor_id', verdeMenu.id, async () => {
    const { rows } = await app.query('SELECT id FROM pedido WHERE id = $1', [p1]);
    return rows;
  });
  ok(vistoSinContrato.length === 0, 'Verde Menú (sin contrato con Futuro ARS) NO ve el pedido P1, aunque conociera su id');

  const lineaVistaSinContrato = await comoAmbito(app, 'app.suplidor_id', verdeMenu.id, async () => {
    const { rows } = await app.query('SELECT id FROM pedido_linea WHERE pedido_id = $1', [p1]);
    return rows;
  });
  ok(lineaVistaSinContrato.length === 0, 'Verde Menú tampoco ve las líneas de un pedido que no es suyo');

  const updateSinContrato = await comoAmbito(app, 'app.suplidor_id', verdeMenu.id, async () => {
    const r = await app.query(`UPDATE pedido SET estado = 'EN_PREPARACION' WHERE id = $1`, [p1]);
    return r.rowCount;
  });
  ok(updateSinContrato === 0, 'Verde Menú no puede pasar a EN_PREPARACION un pedido que no le pertenece (WITH CHECK)');

  const updateConContrato = await comoAmbito(app, 'app.suplidor_id', cocinaCriolla.id, async () => {
    const r = await app.query(`UPDATE pedido SET estado = 'EN_PREPARACION' WHERE id = $1 AND estado = 'CONFIRMADO'`, [p1]);
    return r.rowCount;
  });
  ok(updateConContrato === 1, 'Cocina Criolla sí puede pasar su propio pedido CONFIRMADO a EN_PREPARACION');

  // --- Resolución perezosa por política de silencio, en ámbito EMPRESA ---
  await comoAmbito(app, 'app.empresa_id', empresaId, async () => {
    await app.query(RESOLVER_POR_SILENCIO_SQL);
  });

  const { rows: estadoP2 } = await su.query('SELECT estado, confirmado_por FROM pedido WHERE id = $1', [p2]);
  ok(
    estadoP2[0].estado === 'RECIBIDO' && estadoP2[0].confirmado_por === 'SILENCIO',
    'P2 (AUTO_CONFIRMA, entregado hace 30h, ventana 24h) se resolvió a RECIBIDO por silencio',
  );

  const { rows: estadoP3 } = await su.query(
    'SELECT estado, disputado_por, motivo_disputa FROM pedido WHERE id = $1',
    [p3],
  );
  ok(
    estadoP3[0].estado === 'DISPUTA' && estadoP3[0].disputado_por === 'SILENCIO' && estadoP3[0].motivo_disputa === 'OTRO',
    'P3 (AUTO_DISPUTA, entregado hace 2h, ventana 1h) se resolvió a DISPUTA por silencio',
  );

  const { rows: estadoP4 } = await su.query('SELECT estado FROM pedido WHERE id = $1', [p4]);
  ok(
    estadoP4[0].estado === 'ENTREGADO',
    'P4 (AUTO_CONFIRMA, entregado hace 1h, ventana 24h) sigue ENTREGADO — la ventana no ha vencido',
  );

  await app.end();

  // Limpieza de fixtures
  await su.query(`DELETE FROM pedido_linea WHERE pedido_id IN (SELECT id FROM pedido WHERE codigo_retiro LIKE 'TESTS5-%')`);
  await su.query(`DELETE FROM pedido WHERE codigo_retiro LIKE 'TESTS5-%'`);
  await su.query(`DELETE FROM menu_dia WHERE suplidor_id = $1 AND fecha = '2099-01-15'`, [cocinaCriolla.id]);
  await su.query(`DELETE FROM programa_beneficio WHERE nombre = 'Almuerzo AUTO_DISPUTA (test Sprint 5)'`);
  await su.end();

  console.log(`\n${fallas === 0 ? 'Todas las pruebas pasaron.' : fallas + ' prueba(s) fallaron.'}`);
  process.exit(fallas === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
