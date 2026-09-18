/**
 * Prueba de integración del Sprint 8 (alcance recortado a backend — ver
 * plan-sprints.md) — corre contra una base real. Verifica:
 *  1. El contenido sembrado por rol existe (política de silencio, tope de
 *     endeudamiento, nota de crédito, liquidación, congelamiento).
 *  2. La lógica de filtro por rol (rol_objetivo = rol propio O 'TODOS'),
 *     replicando la misma consulta que arma AyudaController.listar.
 *  3. `almuerzo_app` no puede escribir en `ayuda_contenido` — ni siquiera
 *     sin ningún GUC fijado, porque es un REVOKE de permisos (migración
 *     13), no una regla de RLS. Solo `almuerzo_platform` puede.
 *
 * El filtro por rol vía HTTP (GET /ayuda con distintos tokens) y el CRUD
 * restringido a plataforma se validaron end-to-end contra la API real
 * durante el desarrollo — ver la conversación.
 *
 * Ejecutar: npm run migrate && npm run seed && npm run build && node test/ayuda.test.js
 */
require('dotenv').config();
require('pg').types.setTypeParser(20, (v) => parseInt(v, 10));
const { Client } = require('pg');

let fallas = 0;
function ok(cond, msg) {
  console.log((cond ? '  OK  ' : ' FALLA ') + msg);
  if (!cond) fallas++;
}

async function main() {
  const su = new Client({ connectionString: process.env.MIGRATE_DATABASE_URL });
  await su.connect();

  const { rows: todas } = await su.query('SELECT titulo, rol_objetivo, pantalla_id FROM ayuda_contenido');
  ok(todas.length >= 5, `el seed cargó al menos 5 fichas de ayuda (hay ${todas.length})`);
  ok(
    todas.some((f) => f.pantalla_id === 'pedidos.confirmar' && f.rol_objetivo === 'COLABORADOR'),
    'existe la ficha de política de silencio para COLABORADOR',
  );
  ok(
    todas.some((f) => f.pantalla_id === 'nomina.cerrar-ciclo' && f.rol_objetivo === 'RRHH'),
    'existe la ficha de nota de crédito para RRHH',
  );
  ok(
    todas.some((f) => f.pantalla_id === 'liquidaciones.calcular' && f.rol_objetivo === 'SUPLIDOR_ADMIN'),
    'existe la ficha de liquidación para SUPLIDOR_ADMIN',
  );
  ok(
    todas.some((f) => f.rol_objetivo === 'TODOS'),
    'existe al menos una ficha visible para TODOS los roles',
  );

  // --- Filtro por rol: misma consulta que arma AyudaController.listar ---
  const { rows: paraColaborador } = await su.query(
    `SELECT titulo FROM ayuda_contenido WHERE (rol_objetivo = $1 OR rol_objetivo = 'TODOS')`,
    ['COLABORADOR'],
  );
  ok(
    paraColaborador.some((f) => f.titulo.includes('silencio')) && !paraColaborador.some((f) => f.titulo.includes('suplidor')),
    'un colaborador ve su propia ficha y la de TODOS, pero no la de liquidación a suplidores',
  );

  const { rows: paraSuplidor } = await su.query(
    `SELECT titulo FROM ayuda_contenido WHERE (rol_objetivo = $1 OR rol_objetivo = 'TODOS')`,
    ['SUPLIDOR_ADMIN'],
  );
  ok(
    paraSuplidor.some((f) => f.titulo.toLowerCase().includes('paga a un suplidor')) &&
      !paraSuplidor.some((f) => f.titulo.includes('silencio')),
    'un suplidor ve su propia ficha, pero no la de política de silencio (es de COLABORADOR)',
  );

  // --- Buscador (ILIKE) ---
  const { rows: buscado } = await su.query(
    `SELECT titulo FROM ayuda_contenido WHERE (titulo ILIKE $1 OR cuerpo ILIKE $1)`,
    ['%endeudamiento%'],
  );
  ok(buscado.length >= 1, 'el buscador por texto encuentra la ficha de tope de endeudamiento');

  // --- REVOKE: almuerzo_app no puede escribir, ni siquiera sin GUC ---
  const app = new Client({ connectionString: process.env.DATABASE_URL });
  await app.connect();

  let insertRechazado = false;
  try {
    await app.query(
      `INSERT INTO ayuda_contenido (titulo, cuerpo, rol_objetivo, pantalla_id) VALUES ('x','x','TODOS','x.test')`,
    );
  } catch (err) {
    insertRechazado = err.code === '42501';
  }
  ok(insertRechazado, 'almuerzo_app no puede hacer INSERT en ayuda_contenido (REVOKE de la migración 13)');

  const { rows: algunaFicha } = await su.query('SELECT id FROM ayuda_contenido LIMIT 1');
  let updateRechazado = false;
  try {
    await app.query(`UPDATE ayuda_contenido SET titulo = 'hackeado' WHERE id = $1`, [algunaFicha[0].id]);
  } catch (err) {
    updateRechazado = err.code === '42501';
  }
  ok(updateRechazado, 'almuerzo_app no puede hacer UPDATE en ayuda_contenido (REVOKE de la migración 13)');

  const { rows: siPuedeLeer } = await app.query('SELECT id FROM ayuda_contenido');
  ok(siPuedeLeer.length === todas.length, 'almuerzo_app sí puede leer ayuda_contenido (solo se le quitó la escritura)');

  await app.end();
  await su.end();

  console.log(`\n${fallas === 0 ? 'Todas las pruebas pasaron.' : fallas + ' prueba(s) fallaron.'}`);
  process.exit(fallas === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
