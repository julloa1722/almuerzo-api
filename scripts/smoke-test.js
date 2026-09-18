#!/usr/bin/env node
/**
 * Reproduce el flujo de curl ya validado, pero en Node puro (usa el fetch
 * global de Node 20+), para que corra igual en Windows, Mac y Linux sin
 * depender de bash, curl ni python3.
 *
 * Requiere que la API esté corriendo (npm run start / npm run start:dev en
 * otra terminal) y que ya hayas corrido npm run migrate && npm run seed.
 */
require('dotenv').config();

const BASE_URL = process.env.SMOKE_BASE_URL || 'http://localhost:3000';
let fallas = 0;

function ok(cond, msg) {
  console.log((cond ? '  OK  ' : ' FALLA ') + msg);
  if (!cond) fallas++;
}

async function main() {
  console.log('=== 1. Health ===');
  const health = await fetch(`${BASE_URL}/health`).then((r) => r.json());
  console.log(health);
  ok(health.estado === 'ok', 'el servicio responde saludable');

  console.log('\n=== 2. Sin token ===');
  const sinToken = await fetch(`${BASE_URL}/colaboradores`);
  ok(sinToken.status === 401, `sin token, /colaboradores responde 401 (obtuvo ${sinToken.status})`);

  console.log('\n=== 3. Login con credenciales de prueba ===');
  const loginResp = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'rrhh@futuroars.demo', password: 'rrhh123456' }),
  });
  const login = await loginResp.json();
  ok(!!login.accessToken, 'login exitoso, se recibió accessToken');
  const tokenSinAmbito = login.accessToken;
  const membresiaId = login.membresias?.[0]?.membresiaId;

  console.log('\n=== 4. Endpoint protegido sin ambito seleccionado ===');
  const sinAmbito = await fetch(`${BASE_URL}/colaboradores`, {
    headers: { Authorization: `Bearer ${tokenSinAmbito}` },
  });
  ok(sinAmbito.status === 403, `sin ambito, /colaboradores responde 403 (obtuvo ${sinAmbito.status})`);

  console.log('\n=== 5. Seleccionar ambito ===');
  const ambitoResp = await fetch(`${BASE_URL}/auth/seleccionar-ambito`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenSinAmbito}`,
    },
    body: JSON.stringify({ membresiaId }),
  });
  const ambito = await ambitoResp.json();
  ok(!!ambito.accessToken, 'se emitió un token con ambito');
  const token = ambito.accessToken;

  console.log('\n=== 6. Endpoint protegido, ahora con ambito ===');
  const listaResp = await fetch(`${BASE_URL}/colaboradores`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const lista = await listaResp.json();
  console.log(JSON.stringify(lista, null, 2));
  ok(
    Array.isArray(lista.colaboradores) && lista.colaboradores.length === 4,
    `devuelve exactamente los 4 colaboradores de Futuro ARS (obtuvo ${lista.colaboradores?.length})`,
  );

  console.log(`\n${fallas === 0 ? 'Todas las pruebas de humo pasaron.' : fallas + ' prueba(s) fallaron.'}`);
  process.exit(fallas === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('Error inesperado corriendo el smoke test:', err.message);
  console.error('¿Está la API corriendo en', BASE_URL, '? (npm run start en otra terminal)');
  process.exit(1);
});
