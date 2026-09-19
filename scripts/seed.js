#!/usr/bin/env node
require('pg').types.setTypeParser(20, (v) => parseInt(v, 10)); // ver src/common/pg-tipos.ts
/**
 * Carga las mismas empresas, colaboradores y suplidores que ya existen en los
 * mockups (mockup-plataforma-almuerzo.html, portal-backoffice-onboarding.html),
 * para que backend real y prototipos hablen de las mismas personas cuando se comparen.
 *
 * Seguro de correr varias veces: usa ON CONFLICT para no duplicar.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { Client } = require('pg');

/**
 * Sprint 20: guarda contra sembrar la demo en producción.
 *
 * Este script crea `admin@plataforma.demo` con la contraseña `admin123456`,
 * que está escrita en el README y en CLAUDE.md, o sea publicada en GitHub.
 * Mientras todo corría en localhost eso daba igual; con la API expuesta en
 * internet, correrlo por error contra la base de producción deja un
 * SUPERADMIN con contraseña pública — acceso total a todos los tenants.
 *
 * El error realista no es teclear mal el comando: es tener el `.env` apuntando
 * a producción (después de haber desplegado) y correr `npm run seed` por
 * costumbre. Por eso la guarda mira el entorno, no los argumentos.
 *
 * Para poblar una base de producción de verdad: `npm run crear-admin`, que
 * crea el primer SUPERADMIN y nada más.
 */
function abortar(motivo, detalle) {
  console.error('');
  console.error(`ABORTADO: ${motivo}`);
  console.error('');
  console.error('Este script siembra datos de DEMO, incluido un SUPERADMIN con la');
  console.error('contraseña "admin123456", que está publicada en el repositorio.');
  if (detalle) {
    console.error('');
    console.error(detalle);
  }
  console.error('');
  console.error('Para una base real usa:  npm run crear-admin');
  console.error('Si de verdad quieres sembrar la demo aquí: npm run seed -- --forzar');
  console.error('');
  process.exit(1);
}

/**
 * Decide si es seguro sembrar, mirando A QUÉ BASE apunta la conexión.
 *
 * Esta guarda se escribió tres veces. Vale la pena dejar por qué, porque las
 * dos primeras parecían razonables:
 *
 * 1. **Mirando `NODE_ENV`.** La revisión de pre-vuelo encontró que no cubría
 *    el caso que ella misma describía: el error realista no es teclear mal el
 *    comando, es tener el `.env` apuntando a producción y correr
 *    `npm run seed` por costumbre — y ahí `NODE_ENV` sigue diciendo
 *    `development`. Miraba el entorno cuando el peligro está en el destino.
 *
 * 2. **Mirando el contenido: "aborta si hay usuarios que no son `.demo`".**
 *    La idea era no obligar a configurar nada. Murió contra la realidad en la
 *    primera prueba: la base de desarrollo de este proyecto contiene
 *    `juan.ulloa@arsfuturo.com.do`, el correo real del usuario, que usó
 *    probando la app. Una base de desarrollo **acumula correos reales de
 *    forma natural**, así que la heurística daba falso positivo justo en el
 *    caso que quería no molestar.
 *
 * La conclusión es que no hay forma fiable de distinguir desarrollo de
 * producción por el contenido: cualquier heurística o estorba o no protege.
 * Hay que declararlo una vez, explícitamente. Eso cuesta una línea en el
 * `.env`, y el mensaje de error de abajo la da ya escrita para copiar.
 */
/**
 * Lee el host de `MIGRATE_DATABASE_URL` tal como está escrito en el ARCHIVO
 * `.env`, sin pasar por `process.env`.
 *
 * Hace falta porque `dotenv` no sobrescribe variables que ya existan en el
 * entorno. Si alguien hizo `$env:MIGRATE_DATABASE_URL = "...produccion..."`
 * en su ventana de PowerShell, el archivo dice una cosa y el proceso usa
 * otra — y esa diferencia es exactamente la señal de peligro.
 */
function hostSegunArchivoEnv() {
  try {
    const texto = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
    const linea = texto.split('\n').find((l) => /^\s*MIGRATE_DATABASE_URL\s*=/.test(l));
    if (!linea) return null;
    const valor = linea.slice(linea.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '');
    return new URL(valor).hostname;
  } catch {
    return null;
  }
}

function abortarSiNoEsBaseDeDesarrollo() {
  if (process.argv.includes('--forzar')) return;

  if (process.env.NODE_ENV === 'production') {
    abortar('NODE_ENV=production.');
  }

  let host = '';
  try {
    host = new URL(process.env.MIGRATE_DATABASE_URL || '').hostname;
  } catch {
    // Si la URL ni siquiera parsea, que falle más adelante con su propio
    // mensaje, que será más claro que cualquier cosa que digamos aquí.
    return;
  }

  // Esta comprobación va PRIMERO, antes que cualquier permiso, porque detecta
  // una trampa real que la propia guía de despliegue tendía:
  //
  // El paso 6 hace `$env:MIGRATE_DATABASE_URL = "...produccion..."` para crear
  // el primer administrador. En PowerShell eso vive el resto de la sesión, y
  // `dotenv` no lo sobrescribe. Si en esa misma ventana corres `npm run seed`
  // por costumbre, apunta a PRODUCCIÓN — el escenario exacto que esta guarda
  // existe para impedir.
  //
  // Peor: la versión anterior abortaba sugiriendo
  // `SEED_HOST_PERMITIDO=<host>` con el host de producción interpolado, bajo
  // el texto "si ese ES tu host de desarrollo, declaralo". Pegar esa línea
  // desactivaba la protección contra producción para siempre. La guarda
  // guiaba al usuario hacia el desastre que debía evitar.
  const hostDelArchivo = hostSegunArchivoEnv();
  if (hostDelArchivo && hostDelArchivo !== host) {
    abortar(
      'tu ventana está apuntando a una base distinta a la de tu .env.',
      `  .env dice:        ${hostDelArchivo}\n` +
        `  esta ventana usa: ${host}\n\n` +
        'Alguien fijó MIGRATE_DATABASE_URL como variable de entorno (el paso 6\n' +
        'de GUIA-DESPLIEGUE.md lo hace, para crear el administrador de\n' +
        'producción) y dotenv no la sobrescribe.\n\n' +
        'Si ese segundo host es tu base de PRODUCCIÓN, NO sigas: cierra esta\n' +
        'ventana, o limpia la variable, y vuelve a intentarlo.\n' +
        '  Remove-Item Env:MIGRATE_DATABASE_URL',
    );
  }

  if (host === 'localhost' || host === '127.0.0.1') return;
  if (host && host === (process.env.SEED_HOST_PERMITIDO || '').trim()) return;

  abortar(
    `la base destino no es local (${host}).`,
    'Si ese host es el de TU RAMA DE DESARROLLO, agrega esta línea a tu .env:\n\n' +
      `  SEED_HOST_PERMITIDO=${host}\n\n` +
      'y este aviso no vuelve a salir.\n\n' +
      'Si es el de producción, no la agregues: estarías desactivando esta\n' +
      'protección justo donde más hace falta.',
  );
}

async function main() {
  abortarSiNoEsBaseDeDesarrollo();

  // Sembrar inserta filas en `colaborador`, que tiene FORCE ROW LEVEL SECURITY.
  // Con el rol de la app (sin BYPASSRLS) cada insert necesitaría el GUC
  // app.empresa_id fijado fila por fila. Para un script administrativo de
  // datos semilla, es más simple correr con el superusuario de migraciones.
  const client = new Client({ connectionString: process.env.MIGRATE_DATABASE_URL });
  await client.connect();

  await client.query('BEGIN');

  // --- Empresas ---
  const empresas = [
    { rnc: '101-88452-3', nombre: 'Futuro ARS', frecuencia: 'QUINCENAL' },
    { rnc: '130-55211-7', nombre: 'Grupo Vantia', frecuencia: 'MENSUAL' }
  ];
  const empresaIds = {};
  for (const e of empresas) {
    const { rows } = await client.query(
      `INSERT INTO empresa (rnc, nombre, frecuencia_nomina)
       VALUES ($1, $2, $3)
       ON CONFLICT (rnc) DO UPDATE SET nombre = EXCLUDED.nombre
       RETURNING id`,
      [e.rnc, e.nombre, e.frecuencia]
    );
    empresaIds[e.nombre] = rows[0].id;
  }

  // --- Puntos de entrega ---
  const puntos = [
    { empresa: 'Futuro ARS', nombre: 'Torre corporativa · piso 4' },
    { empresa: 'Futuro ARS', nombre: 'Centro de operaciones · Los Alcarrizos' }
  ];
  const puntoIds = {};
  for (const p of puntos) {
    const existente = await client.query(
      `SELECT id FROM punto_entrega WHERE empresa_id = $1 AND nombre = $2`,
      [empresaIds[p.empresa], p.nombre],
    );
    if (existente.rows[0]) {
      puntoIds[p.nombre] = existente.rows[0].id;
    } else {
      const { rows } = await client.query(
        `INSERT INTO punto_entrega (empresa_id, nombre) VALUES ($1, $2) RETURNING id`,
        [empresaIds[p.empresa], p.nombre],
      );
      puntoIds[p.nombre] = rows[0].id;
    }
  }

  // --- Suplidores ---
  const suplidores = [
    { rnc: '131-45872-1', nombre: 'Cocina Criolla del Este' },
    { rnc: '130-99114-6', nombre: 'Verde Menú' }
  ];
  const suplidorIds = {};
  for (const s of suplidores) {
    const { rows } = await client.query(
      `INSERT INTO suplidor (rnc, nombre)
       VALUES ($1, $2)
       ON CONFLICT (rnc) DO UPDATE SET nombre = EXCLUDED.nombre
       RETURNING id`,
      [s.rnc, s.nombre]
    );
    suplidorIds[s.nombre] = rows[0].id;
  }

  // --- Colaboradores (mismos 4 de los mockups) ---
  const colaboradores = [
    { empresa: 'Futuro ARS', cod: 'N-1042', cedula: '001-1842306-4', nombre: 'Ana Ramírez',   punto: 'Torre corporativa · piso 4', salario: 42000 },
    { empresa: 'Futuro ARS', cod: 'N-1187', cedula: '402-2019887-1', nombre: 'Luis Fermín',    punto: 'Torre corporativa · piso 4', salario: 28500 },
    { empresa: 'Futuro ARS', cod: 'N-1203', cedula: '001-0997451-8', nombre: 'Carla Peña',     punto: 'Centro de operaciones · Los Alcarrizos', salario: 65000 },
    { empresa: 'Futuro ARS', cod: 'N-1290', cedula: '031-0455129-3', nombre: 'Héctor Objío',   punto: 'Centro de operaciones · Los Alcarrizos', salario: 21000 }
  ];
  for (const c of colaboradores) {
    await client.query(
      `INSERT INTO colaborador (empresa_id, codigo_nomina, cedula, nombre_completo, punto_entrega_id, salario_neto_ref, fecha_ingreso)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE)
       ON CONFLICT (empresa_id, codigo_nomina) DO UPDATE SET nombre_completo = EXCLUDED.nombre_completo`,
      [empresaIds[c.empresa], c.cod, c.cedula, c.nombre, puntoIds[c.punto], c.salario]
    );
  }

  // --- Usuario de prueba para RRHH (empresa Futuro ARS) ---
  const passwordHash = await bcrypt.hash('rrhh123456', 10);
  const { rows: usuarioRows } = await client.query(
    `INSERT INTO usuario (email, password_hash)
     VALUES ($1, $2)
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
     RETURNING id`,
    ['rrhh@futuroars.demo', passwordHash]
  );
  const usuarioRrhhId = usuarioRows[0].id;

  await client.query(
    `INSERT INTO membresia (usuario_id, ambito_tipo, ambito_id, rol)
     VALUES ($1, 'EMPRESA', $2, 'RRHH')
     ON CONFLICT (usuario_id, ambito_tipo, ambito_id, rol) DO NOTHING`,
    [usuarioRrhhId, empresaIds['Futuro ARS']]
  );

  // --- Usuario de prueba para el back office (ámbito PLATAFORMA) ---
  const passwordHashAdmin = await bcrypt.hash('admin123456', 10);
  const { rows: usuarioAdminRows } = await client.query(
    `INSERT INTO usuario (email, password_hash)
     VALUES ($1, $2)
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
     RETURNING id`,
    ['admin@plataforma.demo', passwordHashAdmin]
  );
  const usuarioAdminId = usuarioAdminRows[0].id;

  await client.query(
    `INSERT INTO membresia (usuario_id, ambito_tipo, ambito_id, rol)
     VALUES ($1, 'PLATAFORMA', NULL, 'SUPERADMIN')
     ON CONFLICT (usuario_id, rol) WHERE ambito_tipo = 'PLATAFORMA' DO NOTHING`,
    [usuarioAdminId]
  );

  // --- Sprint 3: catálogo, ruta y plantilla del suplidor "Cocina Criolla del Este" ---
  const supId = suplidorIds['Cocina Criolla del Este'];

  // Contrato activo con Futuro ARS — sin esto, ningún colaborador de Futuro ARS
  // puede ver ni pedir del menú de este suplidor (ver migrations/0007).
  await client.query(
    `INSERT INTO contrato_suplidor (empresa_id, suplidor_id, ajuste_pct)
     VALUES ($1, $2, 0)
     ON CONFLICT (empresa_id, suplidor_id) DO NOTHING`,
    [empresaIds['Futuro ARS'], supId]
  );

  await client.query(
    `INSERT INTO ruta_servicio (suplidor_id, punto_entrega_id, hora_cutoff, dias_anticipacion, hora_entrega_est, cupo_max_dia)
     VALUES ($1, $2, '10:00', 0, '12:30', 8)
     ON CONFLICT (suplidor_id, punto_entrega_id) DO NOTHING`,
    [supId, puntoIds['Torre corporativa · piso 4']]
  );

  const productosDemo = [
    { sku: 'BAND-001', nombre: 'Bandeja del día', descripcion: 'Arroz, habichuelas, carne guisada, ensalada', categoria: 'Plato fuerte', precio: 320, cupo: 8 },
    { sku: 'PECH-001', nombre: 'Pechuga a la plancha', descripcion: 'Puré de auyama y vegetales al vapor', categoria: 'Plato fuerte', precio: 350, cupo: 8 }
  ];
  const productoIds = {};
  for (const p of productosDemo) {
    const { rows } = await client.query(
      `INSERT INTO producto (suplidor_id, sku, nombre, descripcion, categoria)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (suplidor_id, sku) DO UPDATE SET nombre = EXCLUDED.nombre
       RETURNING id`,
      [supId, p.sku, p.nombre, p.descripcion, p.categoria]
    );
    productoIds[p.sku] = rows[0].id;
  }

  const { rows: plantillaRows } = await client.query(
    `SELECT id FROM plantilla_menu WHERE suplidor_id = $1 AND semana_tipo = 1`,
    [supId]
  );
  let plantillaId = plantillaRows[0]?.id;
  if (!plantillaId) {
    const { rows } = await client.query(
      `INSERT INTO plantilla_menu (suplidor_id, nombre, semana_tipo) VALUES ($1, 'Semana 1', 1) RETURNING id`,
      [supId]
    );
    plantillaId = rows[0].id;
  }

  // Lunes: bandeja + pechuga. Martes: solo pechuga. (dia_semana 1=lunes ... 5=viernes)
  const itemsPlantilla = [
    { dia: 1, sku: 'BAND-001', precio: 320, cupo: 8 },
    { dia: 1, sku: 'PECH-001', precio: 350, cupo: 8 },
    { dia: 2, sku: 'PECH-001', precio: 350, cupo: 8 }
  ];
  for (const it of itemsPlantilla) {
    await client.query(
      `INSERT INTO plantilla_item (plantilla_id, suplidor_id, dia_semana, producto_id, precio, cupo)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (plantilla_id, dia_semana, producto_id) DO UPDATE SET precio = EXCLUDED.precio, cupo = EXCLUDED.cupo`,
      [plantillaId, supId, it.dia, productoIds[it.sku], it.precio, it.cupo]
    );
  }

  const passwordHashSuplidor = await bcrypt.hash('suplidor123456', 10);
  const { rows: usuarioSupRows } = await client.query(
    `INSERT INTO usuario (email, password_hash)
     VALUES ($1, $2)
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
     RETURNING id`,
    ['suplidor@cocinacriolla.demo', passwordHashSuplidor]
  );
  const usuarioSupId = usuarioSupRows[0].id;

  await client.query(
    `INSERT INTO membresia (usuario_id, ambito_tipo, ambito_id, rol)
     VALUES ($1, 'SUPLIDOR', $2, 'SUPLIDOR_ADMIN')
     ON CONFLICT (usuario_id, ambito_tipo, ambito_id, rol) DO NOTHING`,
    [usuarioSupId, supId]
  );

  // --- Sprint 4: programa de beneficio, asignación, y usuario colaborador ---
  const empresaFuturoId = empresaIds['Futuro ARS'];

  const { rows: progRows } = await client.query(
    `SELECT id FROM programa_beneficio WHERE empresa_id = $1 AND tipo = 'ALMUERZO'`,
    [empresaFuturoId]
  );
  let programaId = progRows[0]?.id;
  if (!programaId) {
    const { rows } = await client.query(
      `INSERT INTO programa_beneficio
         (empresa_id, tipo, nombre, tipo_subsidio, valor_subsidio, tope_diario_subsidio, tope_ciclo_colaborador, permite_excedente, pct_max_salario)
       VALUES ($1, 'ALMUERZO', 'Almuerzo Futuro ARS', 'MONTO_FIJO', 250, 300, 3000, true, 15)
       RETURNING id`,
      [empresaFuturoId]
    );
    programaId = rows[0].id;
  }

  const { rows: colabRows } = await client.query(
    `SELECT id, codigo_nomina FROM colaborador WHERE empresa_id = $1`,
    [empresaFuturoId]
  );
  for (const c of colabRows) {
    await client.query(
      `INSERT INTO asignacion_programa (empresa_id, colaborador_id, programa_id, vigente_desde)
       SELECT $1, $2, $3, '2026-01-01'
       WHERE NOT EXISTS (SELECT 1 FROM asignacion_programa WHERE colaborador_id = $2)`,
      [empresaFuturoId, c.id, programaId]
    );
  }

  // Usuario de prueba para Ana Ramírez (N-1042), para probar el flujo de pedidos
  const anaId = colabRows.find((c) => c.codigo_nomina === 'N-1042')?.id;
  if (anaId) {
    const passwordHashAna = await bcrypt.hash('colaborador123456', 10);
    const { rows: usuarioAnaRows } = await client.query(
      `INSERT INTO usuario (email, password_hash)
       VALUES ($1, $2)
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
       RETURNING id`,
      ['ana.ramirez@futuroars.demo', passwordHashAna]
    );
    const usuarioAnaId = usuarioAnaRows[0].id;
    await client.query(`UPDATE colaborador SET usuario_id = $1 WHERE id = $2`, [usuarioAnaId, anaId]);
    await client.query(
      `INSERT INTO membresia (usuario_id, ambito_tipo, ambito_id, rol)
       VALUES ($1, 'EMPRESA', $2, 'COLABORADOR')
       ON CONFLICT (usuario_id, ambito_tipo, ambito_id, rol) DO NOTHING`,
      [usuarioAnaId, empresaFuturoId]
    );
  }

  // --- Sprint 8: contenido de ayuda real (no un CRUD vacío) ---
  const fichasAyuda = [
    {
      titulo: 'Política de silencio: ¿qué pasa si no confirmo mi pedido?',
      cuerpo:
        'Cuando el suplidor marca tu pedido como ENTREGADO, tienes una ventana de tiempo (definida por tu empresa) ' +
        'para confirmarlo o disputarlo. Si no haces nada, el programa decide automáticamente: la mayoría confirma el ' +
        'pedido como RECIBIDO por ti (silencio = conformidad); algunos programas, en cambio, abren una disputa ' +
        'automática para que RRHH lo revise. Puedes ver cuánto tiempo te queda en tus pedidos.',
      rol: 'COLABORADOR',
      pantalla: 'pedidos.confirmar',
      orden: 1,
    },
    {
      titulo: 'Tope de endeudamiento: por qué un pedido se rechaza sin que se te acabe el cupo',
      cuerpo:
        'Además del tope diario y de ciclo de tu programa de beneficio, el sistema no te deja acumular pedidos por ' +
        'encima de un porcentaje de tu salario neto de referencia — protección contra el sobreendeudamiento vía el ' +
        'descuento de nómina. Si un pedido se rechaza por esto, verás el límite exacto en el mensaje de error.',
      rol: 'COLABORADOR',
      pantalla: 'pedidos.crear',
      orden: 2,
    },
    {
      titulo: 'Nota de crédito tras el cierre de un ciclo',
      cuerpo:
        'Un ciclo de nómina cerrado nunca se reabre ni se edita — el libro mayor es de solo escritura hacia ' +
        'adelante. Si hace falta corregir algo después de cerrar (una disputa que se resolvió tarde, un error de ' +
        'digitación), la corrección es un movimiento nuevo (CARGO o NOTA_CREDITO) que se postea en el ciclo ' +
        'abierto vigente en ese momento, nunca en el que ya cerró.',
      rol: 'RRHH',
      pantalla: 'nomina.cerrar-ciclo',
      orden: 1,
    },
    {
      titulo: 'Cómo se calcula lo que se le paga a un suplidor',
      cuerpo:
        'Un suplidor cobra por cada pedido que llegó a RECIBIDO, agregado entre todas las empresas que lo ' +
        'contrataron en el período — la plataforma actúa como intermediaria, no se liquida empresa por empresa. El ' +
        'precio de cada pedido ya incluye el ajuste (descuento o recargo) negociado en el contrato con esa empresa ' +
        'específica.',
      rol: 'SUPLIDOR_ADMIN',
      pantalla: 'liquidaciones.calcular',
      orden: 1,
    },
    {
      titulo: 'Por qué un menú se congela al vencer el cutoff',
      cuerpo:
        'El estado PUBLICADO/CONGELADO de un día nunca se guarda en una columna — se calcula al vuelo comparando ' +
        'la fecha contra el cutoff real de cada ruta, para que nunca quede desincronizado por un job que no corrió. ' +
        'Una vez congelado, el precio y el cupo de ese día dejan de poder editarse.',
      rol: 'TODOS',
      pantalla: 'catalogo.menu',
      orden: 1,
    },
  ];
  for (const f of fichasAyuda) {
    const existe = await client.query(
      `SELECT 1 FROM ayuda_contenido WHERE pantalla_id = $1 AND titulo = $2`,
      [f.pantalla, f.titulo],
    );
    if (!existe.rows.length) {
      await client.query(
        `INSERT INTO ayuda_contenido (titulo, cuerpo, rol_objetivo, pantalla_id, orden)
         VALUES ($1, $2, $3, $4, $5)`,
        [f.titulo, f.cuerpo, f.rol, f.pantalla, f.orden],
      );
    }
  }

  await client.query('COMMIT');
  console.log('Semilla aplicada.');
  console.log('Usuario de prueba: rrhh@futuroars.demo / rrhh123456 (rol RRHH en Futuro ARS)');
  console.log('Usuario de prueba: admin@plataforma.demo / admin123456 (rol SUPERADMIN, ambito PLATAFORMA)');
  console.log('Usuario de prueba: suplidor@cocinacriolla.demo / suplidor123456 (rol SUPLIDOR_ADMIN, Cocina Criolla del Este)');
  console.log('Usuario de prueba: ana.ramirez@futuroars.demo / colaborador123456 (rol COLABORADOR, Ana Ramírez)');
  await client.end();
}

main().catch(async (err) => {
  console.error('Error al sembrar datos:', err.message);
  process.exit(1);
});
