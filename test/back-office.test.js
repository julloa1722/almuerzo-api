/**
 * Prueba de integración del Sprint 2 — corre contra una base real.
 * Verifica:
 *  1. El pool de plataforma (almuerzo_platform) sí ve filas de todas las
 *     empresas — es BYPASSRLS a propósito, para el back office.
 *  2. El pool de app (almuerzo_app) sigue SIN ver nada sin GUC — el
 *     aislamiento del Sprint 1 no se rompió al agregar el rol nuevo.
 *  3. El motor de validación de CSV detecta los mismos casos que el mockup:
 *     duplicados, cédula inválida, nombre faltante, punto de entrega
 *     desconocido como alerta (no error).
 *
 * Ejecutar: npm run migrate && npm run seed && node test/back-office.test.js
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
  // --- 1 y 2: comparar lo que ve cada rol ---
  const clienteApp = new Client({ connectionString: process.env.DATABASE_URL });
  const clientePlataforma = new Client({ connectionString: process.env.PLATFORM_DATABASE_URL });
  await clienteApp.connect();
  await clientePlataforma.connect();

  await clienteApp.query('BEGIN');
  const { rows: sinGucAppVe } = await clienteApp.query('SELECT * FROM colaborador');
  await clienteApp.query('ROLLBACK');
  ok(sinGucAppVe.length === 0, 'almuerzo_app, sin GUC, sigue sin ver nada (el Sprint 1 no se rompió)');

  const { rows: plataformaVe } = await clientePlataforma.query('SELECT DISTINCT empresa_id FROM colaborador');

  const clienteSuperusuario = new Client({ connectionString: process.env.MIGRATE_DATABASE_URL });
  await clienteSuperusuario.connect();
  const { rows: totalReal } = await clienteSuperusuario.query('SELECT DISTINCT empresa_id FROM colaborador');
  await clienteSuperusuario.end();

  ok(
    plataformaVe.length === totalReal.length && plataformaVe.length > 0,
    `almuerzo_platform ve colaboradores de las ${plataformaVe.length} empresa(s) que realmente tienen datos, sin fijar ningún GUC`,
  );

  await clienteApp.end();
  await clientePlataforma.end();

  // --- 3: motor de validación de CSV (requiere que el proyecto ya esté compilado) ---
  const { validarCsvColaboradores } = require('../dist/back-office/csv-colaboradores');

  const csvDemo = `codigo_nomina,cedula,nombre_completo,email,punto_entrega,salario_neto
N-2001,001-1842306-4,Rosa Guzmán,rosa.guzman@futuroars.com,Torre corporativa,38000
N-2002,402-2019887-1,Miguel Tavárez,miguel.tavarez@futuroars.com,Torre corporativa,26500
N-2003,001-0997451,Elena Duarte,elena.duarte@futuroars.com,Torre corporativa,41200
N-2004,031-0455129-3,,jose.jose@futuroars.com,Torre corporativa,22000
N-2001,224-1187734-5,Pablo Reyes,pablo.reyes@futuroars.com,Los Alcarrizos,29500
N-2006,402-2019887-1,Miguel Tavárez,miguel.duplicado@futuroars.com,Los Alcarrizos,26500
N-2007,001-3341290-8,Yolanda Cruz,yolanda.cruz@futuroars.com,Bávaro (sin sede),33000`;

  const csvDemoEs = `CODIGO;CEDULA;NOMBRE;CORREO ;PUNTO;SALARIO
1;107561441;JUAN CARLOS ULLOA C.;JUAN.ULLOA@ARSFUTURO.COM.DO;JUAN SANCHEZ RAMIREZ NO.19;200000`;

  const puntosValidos = new Set(['Torre corporativa', 'Los Alcarrizos', 'JUAN SANCHEZ RAMIREZ NO.19']);
  const filas = validarCsvColaboradores(csvDemo, puntosValidos);
  const filasEs = validarCsvColaboradores(csvDemoEs, puntosValidos);

  ok(filas.length === 7, 'el parser lee las 7 filas del CSV de prueba');
  ok(
    filas.some((f) => f.datos.codigo_nomina === 'N-2001' && f.errores.some((e) => e.includes('duplicado'))),
    'detecta código de nómina duplicado (N-2001 dos veces)',
  );
  ok(
    filas.some((f) => f.datos.cedula === '402-2019887-1' && f.errores.some((e) => e.includes('Cédula duplicada'))),
    'detecta cédula duplicada (Miguel Tavárez repetido)',
  );
  ok(
    filas.some((f) => f.datos.nombre_completo === '' && f.errores.some((e) => e.includes('nombre'))),
    'detecta nombre faltante',
  );
  ok(
    filas.some((f) => f.datos.cedula === '001-0997451' && f.errores.some((e) => e.includes('inválido'))),
    'detecta cédula con formato inválido',
  );
  ok(
    filas.some((f) => f.datos.punto_entrega === 'Bávaro (sin sede)' && f.alertas.length > 0 && f.errores.length === 0),
    'punto de entrega desconocido es ALERTA, no ERROR — no bloquea la importación',
  );

  console.log(`\n${fallas === 0 ? 'Todas las pruebas pasaron.' : fallas + ' prueba(s) fallaron.'}`);
  process.exit(fallas === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
