#!/usr/bin/env node
require('pg').types.setTypeParser(20, (v) => parseInt(v, 10)); // ver src/common/pg-tipos.ts
/**
 * Crea el PRIMER usuario SUPERADMIN de ámbito PLATAFORMA — y nada más.
 *
 * Por qué existe (Sprint 20.5): hasta ahora, el único lugar del proyecto que
 * insertaba una `membresia` de plataforma era `scripts/seed.js`, que además
 * siembra la demo completa — Futuro ARS, Cocina Criolla, colaboradores
 * ficticios y cuatro cuentas con contraseñas publicadas en el README. Contra
 * una base de producción eso es inaceptable, pero no había alternativa: el
 * sistema de invitaciones del Sprint 18 exige estar ya autenticado con una
 * membresía para poder invitar a alguien. Huevo y gallina, sin salida dentro
 * de la app.
 *
 * Este script rompe ese ciclo y se detiene ahí. A partir de este usuario, todo
 * lo demás se hace desde la aplicación: este SUPERADMIN invita a RRHH y a
 * suplidores, y RRHH invita a sus colaboradores.
 *
 * Uso:
 *   npm run crear-admin -- --email admin@empresa.com --password "algo largo"
 *
 * O con variables de entorno (útil en un shell de hosting, para que la
 * contraseña no quede en el historial de comandos):
 *   ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run crear-admin
 *
 * Correrlo dos veces con el mismo email no duplica nada: actualiza la
 * contraseña y deja la membresía como estaba. Eso lo vuelve, de paso, la
 * forma de recuperar el acceso si se pierde la contraseña del administrador.
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Client } = require('pg');

function leerArgumentos() {
  const args = process.argv.slice(2);
  const valores = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--email') valores.email = args[++i];
    else if (args[i] === '--password') valores.password = args[++i];
  }
  return {
    email: (valores.email || process.env.ADMIN_EMAIL || '').trim().toLowerCase(),
    password: valores.password || process.env.ADMIN_PASSWORD || '',
  };
}

function validar(email, password) {
  const errores = [];
  // Validación deliberadamente mínima: el objetivo es atajar el dedazo, no
  // reimplementar un validador de correos.
  if (!email) errores.push('Falta el email (--email o ADMIN_EMAIL).');
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errores.push(`"${email}" no parece un email válido.`);

  if (!password) errores.push('Falta la contraseña (--password o ADMIN_PASSWORD).');
  else if (password.length < 12) {
    // Más estricto que el mínimo de la app a propósito: esta cuenta ve todos
    // los tenants de la plataforma y va a estar expuesta a internet.
    errores.push('La contraseña debe tener al menos 12 caracteres (es la cuenta más poderosa del sistema).');
  }
  return errores;
}

async function main() {
  const { email, password } = leerArgumentos();
  const errores = validar(email, password);
  if (errores.length) {
    console.error('No se pudo crear el administrador:');
    for (const e of errores) console.error(`  - ${e}`);
    console.error('');
    console.error('Ejemplo:');
    console.error('  npm run crear-admin -- --email admin@tuempresa.com --password "una frase larga y propia"');
    process.exit(1);
  }

  // Igual que el seed: `membresia` y `usuario` viven bajo RLS, así que un
  // script administrativo corre con el rol de migraciones.
  const connectionString = process.env.MIGRATE_DATABASE_URL;
  if (!connectionString) {
    console.error('Falta MIGRATE_DATABASE_URL. Copia .env.example a .env primero.');
    process.exit(1);
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    await client.query('BEGIN');

    const passwordHash = await bcrypt.hash(password, 10);
    const { rows: usuarioRows } = await client.query(
      `INSERT INTO usuario (email, password_hash)
       VALUES ($1, $2)
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
       RETURNING id, (xmax = 0) AS insertado`,
      [email, passwordHash]
    );
    const usuarioId = usuarioRows[0].id;
    const esNuevo = usuarioRows[0].insertado;

    // `ON CONFLICT (usuario_id, rol) WHERE ambito_tipo = 'PLATAFORMA'` apunta
    // al índice parcial `uq_membresia_plataforma` de migrations/0004. La
    // UNIQUE normal de membresia no sirve para ámbito PLATAFORMA porque
    // ambito_id es NULL y Postgres trata cada NULL como distinto — eso ya se
    // encontró y se resolvió en su momento; ver migrations/0004:48-55.
    const { rowCount: membresiaCreada } = await client.query(
      `INSERT INTO membresia (usuario_id, ambito_tipo, ambito_id, rol)
       VALUES ($1, 'PLATAFORMA', NULL, 'SUPERADMIN')
       ON CONFLICT (usuario_id, rol) WHERE ambito_tipo = 'PLATAFORMA' DO NOTHING`,
      [usuarioId]
    );

    await client.query('COMMIT');

    console.log('');
    if (esNuevo) {
      console.log(`Usuario creado: ${email}`);
    } else {
      console.log(`El usuario ${email} ya existía — se actualizó su contraseña.`);
    }
    console.log(
      membresiaCreada > 0
        ? 'Membresía SUPERADMIN de plataforma creada.'
        : 'Ya tenía la membresía SUPERADMIN de plataforma (sin cambios).'
    );
    console.log('');
    console.log('Ya puedes entrar al frontend con ese email y contraseña.');
    console.log('Desde ahí, invita al resto de los usuarios — no vuelvas a usar este script.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`No se pudo crear el administrador: ${err.message}`);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
