/**
 * Prueba de integración del Sprint 9.2 (notificaciones) — corre contra una
 * base real. Verifica `enviarNotificacion` (src/common/notificaciones.ts):
 *  1. Sin destinatario (colaborador sin email) → OMITIDA, nunca lanza.
 *  2. Con destinatario pero sin RESEND_API_KEY configurada → OMITIDA, nunca
 *     lanza — así confirmar/entregar un pedido no debe fallar porque el
 *     proveedor de email no esté configurado todavía.
 *  3. Cada intento queda registrado en notificacion_enviada, con su tipo y
 *     referencia.
 *
 * El envío real (con RESEND_API_KEY configurada) y los tres disparadores
 * (pedido entregado, disputa resuelta, lote pagado) se validaron
 * end-to-end contra la API real durante el desarrollo — ver la conversación.
 *
 * Ejecutar: npm run migrate && npm run build && node test/notificaciones.test.js
 */
require('dotenv').config();
require('pg').types.setTypeParser(20, (v) => parseInt(v, 10));
const { Client } = require('pg');

// A propósito, para probar el camino OMITIDA por falta de configuración,
// sin importar lo que tenga el .env real de quien corre este test.
delete process.env.RESEND_API_KEY;
delete process.env.RESEND_FROM_EMAIL;
const { enviarNotificacion } = require('../dist/common/notificaciones');

let fallas = 0;
function ok(cond, msg) {
  console.log((cond ? '  OK  ' : ' FALLA ') + msg);
  if (!cond) fallas++;
}

async function main() {
  const su = new Client({ connectionString: process.env.MIGRATE_DATABASE_URL });
  await su.connect();
  await su.query(`DELETE FROM notificacion_enviada WHERE tipo = 'TEST_SPRINT9'`);

  let lanzoSinDestinatario = false;
  try {
    await enviarNotificacion(su, {
      tipo: 'TEST_SPRINT9',
      destinatario: null,
      asunto: 'Prueba',
      cuerpo: 'Cuerpo',
      referenciaTipo: 'TEST',
      referenciaId: 1,
    });
  } catch {
    lanzoSinDestinatario = true;
  }
  ok(!lanzoSinDestinatario, 'sin destinatario, enviarNotificacion no lanza');

  const { rows: sinDestino } = await su.query(
    `SELECT estado, detalle_error FROM notificacion_enviada WHERE tipo = 'TEST_SPRINT9' AND referencia_id = 1`,
  );
  ok(sinDestino.length === 1 && sinDestino[0].estado === 'OMITIDA', 'queda registrada como OMITIDA cuando no hay destinatario');

  let lanzoSinApiKey = false;
  try {
    await enviarNotificacion(su, {
      tipo: 'TEST_SPRINT9',
      destinatario: 'alguien@example.com',
      asunto: 'Prueba',
      cuerpo: 'Cuerpo',
      referenciaTipo: 'TEST',
      referenciaId: 2,
    });
  } catch {
    lanzoSinApiKey = true;
  }
  ok(!lanzoSinApiKey, 'con destinatario pero sin RESEND_API_KEY, enviarNotificacion tampoco lanza');

  const { rows: sinApiKey } = await su.query(
    `SELECT estado, destinatario, detalle_error FROM notificacion_enviada WHERE tipo = 'TEST_SPRINT9' AND referencia_id = 2`,
  );
  ok(
    sinApiKey.length === 1 && sinApiKey[0].estado === 'OMITIDA' && sinApiKey[0].destinatario === 'alguien@example.com',
    'queda registrada como OMITIDA (con el destinatario real) cuando falta RESEND_API_KEY',
  );

  await su.query(`DELETE FROM notificacion_enviada WHERE tipo = 'TEST_SPRINT9'`);
  await su.end();

  console.log(`\n${fallas === 0 ? 'Todas las pruebas pasaron.' : fallas + ' prueba(s) fallaron.'}`);
  process.exit(fallas === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
