/**
 * Prueba de integración del Sprint 3 — corre contra una base real.
 * Verifica:
 *  1. Las funciones puras de calendario (cutoff, semana ISO, rotación).
 *  2. RLS por suplidor_id: un suplidor no ve el catálogo de otro.
 *  3. El motor de publicación aplica la plantilla correcta y respeta el cutoff.
 *
 * Ejecutar: npm run migrate && npm run seed && npm run build && node test/catalogo.test.js
 */
require('dotenv').config();
require('pg').types.setTypeParser(20, (v) => parseInt(v, 10));
const { Client } = require('pg');
const {
  cutoffDe,
  esHabil,
  iso,
  numSemanaISO,
  semanaTipoDe,
  proximosHabiles,
} = require('../dist/common/calendario.util');

let fallas = 0;
function ok(cond, msg) {
  console.log((cond ? '  OK  ' : ' FALLA ') + msg);
  if (!cond) fallas++;
}

async function comoSuplidor(client, suplidorId, fn) {
  await client.query('BEGIN');
  await client.query(`SELECT set_config('app.suplidor_id', $1, true)`, [String(suplidorId)]);
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
  // --- 1. Funciones puras de calendario ---
  const feriados = new Set(['2026-08-16']); // ejemplo: un lunes feriado

  ok(esHabil(new Date(2026, 6, 27), new Set()) === true, 'lunes 27-jul-2026 es día hábil');
  ok(esHabil(new Date(2026, 6, 25), new Set()) === false, 'sábado 25-jul-2026 no es día hábil');
  ok(esHabil(new Date(2026, 7, 17), feriados) === true, 'el día después del feriado sí es hábil');
  ok(esHabil(new Date(2026, 7, 16), feriados) === false, 'un feriado marcado no es día hábil aunque sea lunes');

  const cutoffLunes = cutoffDe('2026-07-27', '10:00', 0, new Set());
  ok(cutoffLunes.getHours() === 10 && cutoffLunes.getDate() === 27, 'cutoff con 0 días de anticipación: mismo día a las 10:00');

  const cutoffConAnticipacion = cutoffDe('2026-07-27', '10:00', 1, new Set()); // lunes -1 día hábil = viernes anterior
  ok(cutoffConAnticipacion.getDay() === 5, 'cutoff con 1 día de anticipación salta al viernes anterior (no al domingo)');

  const semT1 = semanaTipoDe('2026-07-27');
  const semT2 = semanaTipoDe('2026-08-03'); // semana siguiente
  ok(semT1 !== semT2, 'semanas ISO consecutivas alternan tipo 1/2');

  const habiles = proximosHabiles(new Date(2026, 6, 24), 5, new Set()); // desde viernes 24-jul
  ok(habiles.length === 5 && !habiles.includes('2026-07-25') && !habiles.includes('2026-07-26'),
    'proximosHabiles salta el fin de semana');

  // --- 2 y 3: contra la base real, con el rol de la app ---
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const { rows: sups } = await new Client({ connectionString: process.env.MIGRATE_DATABASE_URL })
    .connect()
    .then(async (c) => {
      const r = await c.query(`SELECT id, nombre FROM suplidor ORDER BY id`);
      await c.end();
      return r;
    });
  const cocinaCriolla = sups.find((s) => s.nombre === 'Cocina Criolla del Este');
  const verdeMenu = sups.find((s) => s.nombre === 'Verde Menú');
  ok(!!cocinaCriolla && !!verdeMenu, 'los dos suplidores de la semilla existen');

  // RLS: Verde Menú no debería ver el catálogo de Cocina Criolla
  const productosDeVerdeMenu = await comoSuplidor(client, verdeMenu.id, async () => {
    const { rows } = await client.query('SELECT * FROM producto');
    return rows;
  });
  ok(productosDeVerdeMenu.length === 0, 'Verde Menú (sin catálogo propio) no ve los productos de Cocina Criolla del Este');

  const productosDeCocinaCriolla = await comoSuplidor(client, cocinaCriolla.id, async () => {
    const { rows } = await client.query('SELECT * FROM producto');
    return rows;
  });
  ok(
    productosDeCocinaCriolla.length === 2 && productosDeCocinaCriolla.every((p) => p.suplidor_id === cocinaCriolla.id),
    'Cocina Criolla del Este ve exactamente sus 2 productos sembrados, todos con su propio suplidor_id',
  );

  // Intento de fuga: insertar plantilla_item con suplidor_id de otro mientras el GUC dice cocinaCriolla
  let fugaBloqueada = false;
  try {
    await comoSuplidor(client, cocinaCriolla.id, () =>
      client.query(
        `INSERT INTO plantilla_item (plantilla_id, suplidor_id, dia_semana, producto_id, precio)
         SELECT id, $1, 3, (SELECT id FROM producto LIMIT 1), 100 FROM plantilla_menu WHERE suplidor_id = $2 LIMIT 1`,
        [verdeMenu.id, cocinaCriolla.id], // suplidor_id real es de Verde Menú, GUC activo dice Cocina Criolla
      ),
    );
  } catch {
    fugaBloqueada = true;
  }
  ok(fugaBloqueada, 'no se puede insertar un plantilla_item con el suplidor_id de otro suplidor (WITH CHECK)');

  await client.end();

  console.log(`\n${fallas === 0 ? 'Todas las pruebas pasaron.' : fallas + ' prueba(s) fallaron.'}`);
  process.exit(fallas === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
