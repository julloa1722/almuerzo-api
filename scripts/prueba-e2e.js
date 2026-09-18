#!/usr/bin/env node
/**
 * Corre en una sola pasada el recorrido narrativo completo de
 * PLAN-PRUEBAS.md (secciones 2 a 9: back office -> catálogo -> pedidos ->
 * entrega/disputa -> nómina -> liquidación -> ayuda -> reportes), contra la
 * API real corriendo, con el fetch nativo de Node (mismo enfoque que
 * scripts/smoke-test.js, sin depender de curl/bash/python3).
 *
 * Requiere: npm run migrate && npm run seed, y la API corriendo aparte
 * (npm run start o npm run start:dev).
 *
 * Seguro de correr varias veces sobre la misma base: reutiliza lo que ya
 * existe (empresa "Textiles del Caribe", contrato, ciclo/lote ya
 * cerrado/calculado del período vigente) en vez de fallar, y cada corrida
 * usa la próxima fecha de menú que Ana todavía no haya pedido, en vez de
 * repetir siempre la primera. Excepción: la prueba de rate limiting del
 * final (Sección 9.3) consume la cuota de 5 intentos/minuto de
 * POST /auth/login — si corres este script dos veces seguidas en menos de
 * ~60 segundos, la segunda corrida puede fallar el login inicial con 429.
 * Espera un minuto entre corridas si eso pasa.
 */
require('dotenv').config();

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
let fallas = 0;
let numSeccion = 0;

function ok(cond, msg) {
  console.log((cond ? '  OK  ' : ' FALLA ') + msg);
  if (!cond) fallas++;
  return cond;
}

function seccion(titulo) {
  numSeccion++;
  console.log(`\n=== ${numSeccion}. ${titulo} ===`);
}

async function api(method, path, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const resp = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const texto = await resp.text();
  let json;
  try {
    json = texto ? JSON.parse(texto) : {};
  } catch {
    json = { raw: texto };
  }
  return { status: resp.status, json };
}

async function loginYAmbito(email, password) {
  const { json: login } = await api('POST', '/auth/login', { body: { email, password } });
  if (!login.accessToken) throw new Error(`Login falló para ${email}: ${JSON.stringify(login)}`);
  const membresiaId = login.membresias[0].membresiaId;
  const nombreAmbito = login.membresias[0].nombre;
  const { json: ambito } = await api('POST', '/auth/seleccionar-ambito', {
    token: login.accessToken,
    body: { membresiaId },
  });
  return { token: ambito.accessToken, ambito: ambito.ambito, nombreAmbito };
}

async function main() {
  seccion('Health');
  const { json: health } = await api('GET', '/health');
  ok(health.estado === 'ok', 'el servicio responde saludable');

  seccion('Login de los 4 usuarios de prueba (Sprint 1)');
  const rrhh = await loginYAmbito('rrhh@futuroars.demo', 'rrhh123456');
  const admin = await loginYAmbito('admin@plataforma.demo', 'admin123456');
  const suplidor = await loginYAmbito('suplidor@cocinacriolla.demo', 'suplidor123456');
  const ana = await loginYAmbito('ana.ramirez@futuroars.demo', 'colaborador123456');
  ok(
    !!rrhh.token && !!admin.token && !!suplidor.token && !!ana.token,
    'los 4 usuarios de prueba iniciaron sesión y seleccionaron ámbito',
  );
  const suplidorId = suplidor.ambito.id;

  // ---------- Sprint 2: back office ----------
  seccion('Sprint 2 — back office: empresa, colaboradores, contrato');
  const { json: empresas } = await api('GET', '/back-office/empresas', { token: admin.token });
  let empresaNueva = empresas.empresas.find((e) => e.nombre === 'Textiles del Caribe');
  if (!empresaNueva) {
    const { json: creada } = await api('POST', '/back-office/empresas', {
      token: admin.token,
      body: { rnc: '101-77003-9', nombre: 'Textiles del Caribe', frecuenciaNomina: 'QUINCENAL' },
    });
    empresaNueva = creada;
  }
  ok(!!empresaNueva.id, `empresa "Textiles del Caribe" existe (id ${empresaNueva.id})`);

  const csv =
    'codigo_nomina,cedula,nombre_completo,punto_entrega,salario_neto\n' +
    'T-001,001-2233445-6,Rosa Diaz,Bodega principal,32000';

  const { json: preview } = await api('POST', `/back-office/empresas/${empresaNueva.id}/colaboradores/preview`, {
    token: admin.token,
    body: { csv },
  });
  ok(
    preview.conAlerta === 1 && preview.conError === 0,
    'preview del CSV: 1 fila con alerta (punto de entrega nuevo), 0 errores',
  );

  const { json: importado } = await api('POST', `/back-office/empresas/${empresaNueva.id}/colaboradores/importar`, {
    token: admin.token,
    body: { csv },
  });
  ok(importado.importados === 1, 'colaborador importado de verdad (idempotente: upsert por código de nómina)');

  const { json: contrato } = await api('POST', `/back-office/empresas/${empresaNueva.id}/contratos`, {
    token: admin.token,
    body: { suplidorId, ajustePct: -5 },
  });
  ok(
    contrato.estado === 'ACTIVA',
    'contrato Textiles del Caribe <-> Cocina Criolla del Este creado (ajuste -5%)',
  );

  // ---------- Sprint 3: catálogo y menú ----------
  seccion('Sprint 3 — catálogo y menú del suplidor');
  const { json: productos } = await api('GET', '/catalogo/productos', { token: suplidor.token });
  ok(productos.productos.length >= 2, `catálogo sembrado presente (${productos.productos.length} producto(s))`);

  // Publica un tramo generoso (~6 meses hábiles) — este dev-branch de Neon
  // lleva meses de pruebas manuales acumuladas (Sprints 4-9), así que Ana ya
  // tiene pedidos en casi cualquier fecha cercana; hace falta mirar bien
  // lejos para encontrar dos fechas todavía libres. /pedidos/menu-disponible
  // por defecto solo mira 14 días, así que hay que pedirle explícitamente el
  // mismo rango que se acaba de publicar.
  const DIAS_HABILES_A_PUBLICAR = 120;
  const RANGO_CALENDARIO_DIAS = 200;
  const { json: publicado } = await api('POST', '/catalogo/menu/publicar', {
    token: suplidor.token,
    body: { dias: DIAS_HABILES_A_PUBLICAR },
  });
  ok(publicado.diasPublicados >= 0, `menú publicado (${publicado.diasPublicados} día(s) nuevo(s) esta corrida)`);

  // ---------- Sprint 4: Ana descubre el menú y pide ----------
  seccion('Sprint 4 — Ana descubre el menú y pide (motor de elegibilidad)');
  const { json: misPedidosPrevios } = await api('GET', '/pedidos/mios', { token: ana.token });
  const usadas = new Set(
    (misPedidosPrevios.pedidos ?? [])
      .filter((p) => p.estado !== 'CANCELADO' && p.suplidor_nombre === suplidor.nombreAmbito)
      .map((p) => String(p.fecha_servicio).slice(0, 10)),
  );

  const isoLocal = (d) =>
    d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const hastaBusqueda = isoLocal(new Date(Date.now() + RANGO_CALENDARIO_DIAS * 86400000));

  const { json: disponible } = await api('GET', `/pedidos/menu-disponible?hasta=${hastaBusqueda}`, { token: ana.token });
  const fechas = Object.keys(disponible.menu ?? {}).sort();

  function primeraFechaDisponible(nombreProducto, evitarFecha) {
    for (const fecha of fechas) {
      if (usadas.has(fecha) || fecha === evitarFecha) continue;
      const item = (disponible.menu[fecha] ?? []).find((i) => i.productoNombre === nombreProducto && i.disponible);
      if (item) return { fecha, item };
    }
    return null;
  }

  const bandeja = primeraFechaDisponible('Bandeja del día');
  const pechuga = primeraFechaDisponible('Pechuga a la plancha', bandeja?.fecha);
  ok(!!bandeja, 'hay una fecha con "Bandeja del día" todavía no pedida por Ana');
  ok(!!pechuga, 'hay una fecha distinta con "Pechuga a la plancha" todavía no pedida por Ana');

  if (!bandeja || !pechuga) {
    throw new Error(
      `No hay suficientes fechas de menú libres dentro de los próximos ${RANGO_CALENDARIO_DIAS} días. ` +
        'Este dev-branch de Neon ya acumuló mucho historial de pruebas de Ana. Sube RANGO_CALENDARIO_DIAS ' +
        'y DIAS_HABILES_A_PUBLICAR en este script, o resetea la rama "dev" de Neon y corre npm run migrate && npm run seed.',
    );
  }

  // Los reportes y la liquidación filtran por fecha con default "los últimos
  // 30 días" — pero como este dev-branch ya tiene historial acumulado, las
  // fechas libres que se acaban de encontrar pueden caer bien lejos de hoy.
  // De aquí en adelante, todo lo que filtre por rango usa este mismo rango
  // (con un día de margen a cada lado), no el default.
  const [rangoDesde, rangoHasta] = [bandeja.fecha, pechuga.fecha].sort();

  const { status: st1, json: pedido1 } = await api('POST', '/pedidos', {
    token: ana.token,
    body: { fecha: bandeja.fecha, suplidorId, lineas: [{ menuDiaId: bandeja.item.menuDiaId, cantidad: 1 }] },
  });
  ok(
    st1 === 201 && pedido1.estado === 'CONFIRMADO',
    `pedido 1 creado (bandeja, ${bandeja.fecha}), a cargo de Ana: RD$${pedido1.monto_colaborador}`,
  );

  const { status: stDup } = await api('POST', '/pedidos', {
    token: ana.token,
    body: { fecha: bandeja.fecha, suplidorId, lineas: [{ menuDiaId: bandeja.item.menuDiaId, cantidad: 1 }] },
  });
  ok(stDup === 403, 'pedido duplicado (misma fecha y suplidor) rechazado con 403');

  const { status: st2, json: pedido2 } = await api('POST', '/pedidos', {
    token: ana.token,
    body: { fecha: pechuga.fecha, suplidorId, lineas: [{ menuDiaId: pechuga.item.menuDiaId, cantidad: 1 }] },
  });
  ok(
    st2 === 201 && pedido2.estado === 'CONFIRMADO',
    `pedido 2 creado (pechuga, ${pechuga.fecha}), a cargo de Ana: RD$${pedido2.monto_colaborador}`,
  );

  // ---------- Sprint 5: entrega, confirmación, disputa ----------
  seccion('Sprint 5 — entrega, confirmación y disputa');
  await api('PATCH', `/pedidos/${pedido1.id}/preparar`, { token: suplidor.token });
  const { status: stEnt1 } = await api('PATCH', `/pedidos/${pedido1.id}/entregar`, {
    token: suplidor.token,
    body: { codigoRetiro: pedido1.codigo_retiro },
  });
  ok(stEnt1 === 200, 'pedido 1 entregado con el código de retiro correcto');

  const { status: stEntMal } = await api('PATCH', `/pedidos/${pedido2.id}/entregar`, {
    token: suplidor.token,
    body: { codigoRetiro: 'XXXXXX' },
  });
  ok(stEntMal === 400, 'entrega con código de retiro incorrecto rechazada con 400');

  const { status: stConf } = await api('PATCH', `/pedidos/${pedido1.id}/confirmar-recibido`, { token: ana.token });
  ok(stConf === 200, 'Ana confirma el pedido 1 como recibido (postea CARGO al libro mayor)');

  await api('PATCH', `/pedidos/${pedido2.id}/preparar`, { token: suplidor.token });
  const { status: stEnt2 } = await api('PATCH', `/pedidos/${pedido2.id}/entregar`, {
    token: suplidor.token,
    body: { codigoRetiro: pedido2.codigo_retiro },
  });
  ok(stEnt2 === 200, 'pedido 2 entregado con el código de retiro correcto');

  const { status: stDisp } = await api('PATCH', `/pedidos/${pedido2.id}/disputar`, {
    token: ana.token,
    body: { motivo: 'INCOMPLETO', nota: 'Faltó la ensalada' },
  });
  ok(stDisp === 200, 'Ana disputa el pedido 2 (INCOMPLETO)');

  const { json: disputas } = await api('GET', '/pedidos/disputas', { token: rrhh.token });
  ok((disputas.disputas ?? []).some((d) => d.id === pedido2.id), 'RRHH ve la disputa del pedido 2 en la lista');

  const { status: stRes } = await api('PATCH', `/pedidos/${pedido2.id}/resolver-disputa`, {
    token: rrhh.token,
    body: { aFavorColaborador: true, nota: 'Confirmado con el suplidor, faltó la ensalada' },
  });
  ok(stRes === 200, 'RRHH resuelve la disputa a favor de Ana (pedido 2 -> NO_ENTREGADO, no se le cobra)');

  // ---------- Sprint 6: nómina y libro mayor ----------
  seccion('Sprint 6 — nómina y libro mayor');
  const { json: colaboradores } = await api('GET', '/colaboradores', { token: rrhh.token });
  const anaColab = (colaboradores.colaboradores ?? []).find((c) => c.codigo_nomina === 'N-1042');
  ok(!!anaColab, 'Ana encontrada en el padrón de colaboradores (para el ajuste manual)');

  const { json: plantillaPrevia } = await api('GET', '/nomina/plantilla-descuento', { token: rrhh.token });
  ok(
    Array.isArray(plantillaPrevia.catalogoDisponible) && plantillaPrevia.catalogoDisponible.length === 9,
    'catálogo de campos disponibles del archivo de descuento trae los 9 campos fijos',
  );

  const { json: plantillaGuardada } = await api('PUT', '/nomina/plantilla-descuento', {
    token: rrhh.token,
    body: {
      campos: [
        { campo: 'codigo_nomina', etiqueta: 'Código' },
        { campo: 'nombre_completo' },
        { campo: 'monto_total', etiqueta: 'Descuento RD$' },
      ],
    },
  });
  ok(plantillaGuardada.campos?.length === 3, 'plantilla del archivo de descuento guardada con 3 campos');

  if (anaColab) {
    const { status: stAjuste } = await api('POST', '/nomina/movimientos/ajuste', {
      token: rrhh.token,
      body: { colaboradorId: anaColab.id, tipo: 'NOTA_CREDITO', monto: 20, motivo: 'Cortesía por demora (prueba e2e)' },
    });
    ok(stAjuste === 201, 'ajuste manual (nota de crédito RD$20) posteado al ciclo abierto vigente');
  }

  let cicloId;
  const { status: stCierre, json: cierre } = await api('POST', '/nomina/ciclos/cerrar', { token: rrhh.token, body: {} });
  if (stCierre === 201) {
    cicloId = cierre.id;
    ok(true, `ciclo cerrado (id ${cicloId})`);
  } else if (stCierre === 403 && /ya está cerrado/.test(cierre.message ?? '')) {
    const { json: ciclos } = await api('GET', '/nomina/ciclos', { token: rrhh.token });
    cicloId = (ciclos.ciclos ?? []).find((c) => c.estado === 'CERRADO')?.id;
    ok(!!cicloId, 'el ciclo del período vigente ya estaba cerrado de una corrida anterior — reutilizado');
  } else {
    ok(false, `cierre de ciclo falló de forma inesperada: ${stCierre} ${JSON.stringify(cierre)}`);
  }

  if (cicloId) {
    const { status: stCsv, json: csvResp } = await api('GET', `/nomina/ciclos/${cicloId}/archivo-descuento`, {
      token: rrhh.token,
    });
    const cuerpoCsv = typeof csvResp === 'string' ? csvResp : csvResp.raw;
    ok(
      stCsv === 200 && typeof cuerpoCsv === 'string' && cuerpoCsv.includes('Ana Ramírez'),
      'archivo de descuento CSV descargado, incluye a Ana Ramírez',
    );
  }

  // ---------- Sprint 7: liquidación a suplidores ----------
  seccion('Sprint 7 — liquidación a suplidores');
  let lote;
  const { status: stCalc, json: calc } = await api('POST', '/liquidaciones/calcular', {
    token: admin.token,
    // periodoInicio/Fin explícitos: el pedido RECIBIDO (pedido1) puede caer
    // lejos de "hoy" (ver nota sobre rangoDesde/rangoHasta más arriba) — sin
    // esto, el default (período vigente hoy) no lo encontraría.
    body: { suplidorId, periodoInicio: rangoDesde, periodoFin: rangoHasta },
  });
  if (stCalc === 201) {
    lote = calc;
    ok(true, `liquidación calculada (${rangoDesde} a ${rangoHasta}): RD$${lote.monto_total}, ${lote.cantidad_pedidos} pedido(s)`);
  } else if (stCalc === 403 && /Ya existe un lote/.test(calc.message ?? '')) {
    const { json: lotes } = await api('GET', '/liquidaciones', { token: admin.token });
    lote = (lotes.lotes ?? []).find(
      (l) =>
        l.suplidor_id === suplidorId &&
        String(l.periodo_inicio).slice(0, 10) === rangoDesde &&
        String(l.periodo_fin).slice(0, 10) === rangoHasta,
    );
    ok(!!lote, 'ya existía un lote para este suplidor y este mismo período — reutilizado');
  } else {
    ok(false, `cálculo de liquidación falló de forma inesperada: ${stCalc} ${JSON.stringify(calc)}`);
  }

  if (lote) {
    const { json: detalle } = await api('GET', `/liquidaciones/${lote.id}`, { token: admin.token });
    ok(
      Array.isArray(detalle.pedidos),
      'detalle del lote trae el desglose de pedidos (por empresa, no por colaborador)',
    );

    if (lote.estado !== 'PAGADO') {
      const { status: stPago } = await api('PATCH', `/liquidaciones/${lote.id}/marcar-pagado`, {
        token: admin.token,
        body: { referenciaPago: 'TRANSF-E2E-' + lote.id },
      });
      ok(stPago === 200, 'lote marcado como pagado');
    } else {
      ok(true, 'lote ya estaba marcado como pagado de una corrida anterior');
    }
  }

  // ---------- Sprint 8: ayuda ----------
  seccion('Sprint 8 — ayuda');
  const { json: ayudaAna } = await api('GET', '/ayuda', { token: ana.token });
  ok(
    (ayudaAna.fichas ?? []).every((f) => ['COLABORADOR', 'TODOS'].includes(f.rol_objetivo)),
    'Ana (COLABORADOR) solo ve fichas de su propio rol o de TODOS',
  );

  const { json: ayudaBuscar } = await api('GET', '/ayuda?buscar=silencio', { token: ana.token });
  ok((ayudaBuscar.fichas ?? []).length >= 1, 'el buscador de ayuda encuentra la ficha de política de silencio');

  const { json: ayudaExistente } = await api('GET', '/ayuda?pantallaId=back-office.importar', {
    token: admin.token,
  });
  if (!(ayudaExistente.fichas ?? []).length) {
    const { status: stAyuda } = await api('POST', '/ayuda', {
      token: admin.token,
      body: {
        titulo: 'Cómo importar colaboradores por CSV',
        cuerpo: 'Ficha de prueba, creada por scripts/prueba-e2e.js.',
        rolObjetivo: 'SOPORTE',
        pantallaId: 'back-office.importar',
        orden: 1,
      },
    });
    ok(stAyuda === 201, 'ficha de ayuda nueva creada por plataforma');
  } else {
    ok(true, 'ficha de ayuda de prueba ya existía de una corrida anterior');
  }

  const { status: stAyudaRrhh } = await api('POST', '/ayuda', {
    token: rrhh.token,
    body: { titulo: 'No debería crearse', cuerpo: 'x', rolObjetivo: 'TODOS', pantallaId: 'x' },
  });
  ok(stAyudaRrhh === 403, 'RRHH no puede crear contenido de ayuda (REVOKE de Postgres, no solo el chequeo de rol)');

  // ---------- Sprint 9: reportes, notificaciones, endurecimiento ----------
  seccion('Sprint 9 — reportes, notificaciones y endurecimiento');
  // Todos con ?desde=&hasta= explícitos, no el default de "últimos 30 días"
  // — nuestros pedidos de prueba pueden caer lejos de "hoy" (ver rangoDesde
  // /rangoHasta más arriba).
  const rango = `?desde=${rangoDesde}&hasta=${rangoHasta}`;

  const { json: consumo } = await api('GET', `/reportes/consumo-colaborador${rango}`, { token: rrhh.token });
  const filaAna = (consumo.colaboradores ?? []).find((c) => c.codigo_nomina === 'N-1042');
  ok(
    !!filaAna && Number(filaAna.cantidad_pedidos) >= 1,
    'reporte de consumo por colaborador incluye a Ana con al menos 1 pedido RECIBIDO (sale de movimiento, no de pedido directo)',
  );

  const { json: gasto } = await api('GET', `/reportes/gasto-empresa${rango}`, { token: rrhh.token });
  ok((gasto.empresas ?? []).some((e) => e.nombre === 'Futuro ARS'), 'reporte de gasto por empresa incluye Futuro ARS');

  const { json: entregas } = await api('GET', `/reportes/entregas-suplidor${rango}`, { token: suplidor.token });
  ok(
    (entregas.suplidores ?? []).some((s) => s.id === suplidorId),
    'reporte de entregas por suplidor incluye a Cocina Criolla del Este',
  );

  const { json: repDisputas } = await api('GET', `/reportes/disputas${rango}`, { token: rrhh.token });
  ok((repDisputas.disputas ?? []).length >= 1, 'reporte de disputas trae al menos 1 fila (la del pedido 2)');

  const { status: stNotif, json: notif } = await api('GET', '/notificaciones', { token: admin.token });
  ok(
    stNotif === 200 && Array.isArray(notif.notificaciones),
    'auditoría de notificaciones responde (revisa RESEND_API_KEY/RESEND_FROM_EMAIL en .env si esperabas ENVIADA en vez de OMITIDA)',
  );

  const healthConHeaders = await fetch(`${BASE_URL}/health`);
  ok(!!healthConHeaders.headers.get('x-content-type-options'), 'headers de seguridad de helmet presentes');

  console.log('  (probando el rate limit de /auth/login: 5 intentos por minuto por IP — 6 intentos seguidos)');
  let vio429 = false;
  for (let i = 0; i < 6; i++) {
    const { status } = await api('POST', '/auth/login', { body: { email: 'nadie@nada.demo', password: 'lo-que-sea' } });
    if (status === 429) vio429 = true;
  }
  ok(vio429, 'al menos uno de los intentos seguidos respondió 429 (límite de 5/min por IP)');

  console.log(`\n${fallas === 0 ? 'Todo el recorrido de punta a punta pasó.' : fallas + ' verificación(es) fallaron.'}`);
  console.log(
    'Nota: la prueba de rate limiting que acaba de correr consumió la cuota de /auth/login — ' +
      'esperá ~1 minuto antes de volver a correr este script o de hacer login a mano.',
  );
  process.exit(fallas === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('Error inesperado corriendo la prueba de punta a punta:', err.message);
  console.error('¿Está la API corriendo en', BASE_URL, '? (npm run start:dev en otra terminal, después de npm run migrate && npm run seed)');
  process.exit(1);
});
