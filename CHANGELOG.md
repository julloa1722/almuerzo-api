# CHANGELOG

## Control de versiones real: el proyecto pasa a git y GitHub (16 de septiembre de 2026)

Git sí está instalado en esta máquina ahora
(`C:\Users\juan.ulloa\AppData\Local\MinGit`, versión 2.55.0) — el
bloqueo documentado en el Sprint 9 y repetido en `CLAUDE.md` ya no
aplica. El proyecto se inicializó como repositorio git (rama `main`,
commit inicial con 169 archivos) con destino
`https://github.com/julloa1722/almuerzo-api`.

**Bug real encontrado al preparar la subida:** el snapshot
`versiones/sprint-19-2026-08-06.zip` contenía un `.env` real —
cadenas de conexión de Neon y `JWT_SECRET` — pese a que
`versiones/README.md` dice desde siempre que los snapshots se toman
"sin `node_modules`, `dist`, ni `.env`". Los otros 6 snapshots están
limpios; fue un fallo del armado a mano de ese `.zip` en particular
(no hay script de snapshot en `scripts/`, se hacían con
`Compress-Archive` ad hoc). Se eliminó esa entrada del `.zip` **antes**
del primer commit, así que las credenciales nunca llegaron al historial
de git ni a GitHub y no hace falta rotarlas. El `.zip` sigue sirviendo
para restaurar: el paso de crear `.env` a partir de `.env.example` ya
era parte del procedimiento documentado.

`.gitignore` endurecido en el mismo paso: se agregaron
`.claude/settings.local.json` (permisos locales de esta máquina),
`*.tsbuildinfo` y `.env.*.local`. Verificado antes de commitear que
ningún `node_modules`, `dist` ni `.env` quedara dentro, y que los dos
`.env.example` no compartan ningún valor real con el `.env` (la única
coincidencia es `NODE_ENV=development`).

De aquí en adelante el historial vive en git. Los snapshots de
`versiones/` se conservan como archivo histórico, pero ya no hace falta
generar uno nuevo por sprint.

## Limpieza de datos de prueba del Sprint 15 (6 de agosto de 2026)

A pedido explícito del usuario: se borraron de la base real (Neon) los
artefactos que había dejado el recorrido de verificación en vivo del
Sprint 15 (`RECORRIDO-FINAL.md`) — pedidos 152 y 153 (diciembre 2026,
con sus líneas y sus 9 eventos de trazabilidad), el movimiento de
nómina asociado, el ciclo_nomina 75 (cerrado), la liquidación
(lote_pago_suplidor) 31 (pagada), y 4 registros de
`notificacion_enviada` ligados a ellos. Un solo `DELETE` en transacción
(`BEGIN`/`COMMIT`), verificado fila por fila antes y después de correr.
Suite de regresión completa sin romperse tras el borrado. Ver
`plan-sprints.md`, Sprint 15, para el detalle.

## Sprint 19 — Recuperación de contraseña y resumen por rol ✅ CONFIRMADO (6 de agosto de 2026)

Dos piezas pedidas juntas: la otra mitad del gap del Sprint 18
(recuperación de contraseña), y una pestaña "Resumen" para RRHH y
suplidor más una sección de resumen para el colaborador. Detalle
completo en `plan-sprints.md`, Sprint 19.

**Backend:** migración `0018_recuperacion_password.sql` — tabla
`recuperacion_password`, sin RLS (mismo criterio que `invitacion`).
`POST /auth/olvide-password` y `POST /auth/restablecer-password/:token`
(`src/auth/auth.service.ts`/`auth.controller.ts`) — respuesta idéntica
exista o no el email, mensaje único de error para no filtrar el estado
exacto de un token ajeno. `GET /nomina/resumen`
(`src/nomina/nomina.controller.ts`): disputas pendientes, colaboradores
activos/sin programa vigente, ciclo del período actual. `GET
/catalogo/resumen` (`src/catalogo/catalogo.controller.ts`): pedidos de
hoy por estado, cobertura de menú propia, contratos activos, última
liquidación.

**Frontend nuevo:** `OlvidePasswordPage.tsx`,
`RestablecerPasswordPage.tsx` (públicas), link en `LoginPage`. Pestaña
"Resumen" (primera) en `RrhhPage` y `SuplidorPage`. Sección
`ResumenColaborador.tsx` arriba de `AppPage` — sin backend nuevo, reusa
los `queryKey` ya existentes de `pedidos-mios`/`consumo-ciclo`.

**Verificado:** migración aplicada sobre Neon real, build/typecheck
limpios, los 10 archivos de test de regresión en verde, y los dos flujos
de recuperación de contraseña probados en vivo (mensaje idéntico exista
o no el email, restablecimiento real, reintento de token rechazado) —
`rrhh@futuroars.demo` quedó con su contraseña original al terminar.
`GET /nomina/resumen` y `GET /catalogo/resumen` probados con datos
reales. Falta la confirmación del usuario con clics reales en
`localhost:5176`.

**Extensión (mismo día, subsprints 19.7/19.8):** pedido del usuario tras
ver el resto del sprint — "que se pueda tambien cargar por el csv el
correo del colaborador, ademas que se pueda hacer una invitacion
masiva". **Hallazgo real:** el correo del CSV ya se guardaba en
`colaborador.email` desde el Sprint 2 — `GET /colaboradores` nunca lo
devolvía, así que RRHH tenía que volver a escribirlo a mano al invitar.
`GET /colaboradores` ahora también trae `email`. `POST
/invitaciones/masiva` (`RRHH`/`ADMIN_EMPRESA`, `src/invitaciones/
invitaciones.controller.ts`) invita de una vez a todos los
colaboradores activos sin `usuario_id` que sí tienen `email` (o a una
selección puntual vía `colaboradorIds`), reutilizando la misma
inserción que `POST /invitaciones` (factorizada a
`crearInvitacionInterna`). Responde tres listas: invitados, omitidos
por no tener correo, y los que ya tenían invitación pendiente.
Frontend: `InvitarColaboradoresSeccion.tsx` prellena el correo de cada
fila con el del CSV (editable) y agrega el botón "Invitar a todos los
que tienen correo".

**Verificado:** build/typecheck limpios (backend y frontend), los 10
archivos de test de regresión en verde. Probado en vivo contra Neon:
`GET /colaboradores` expone `email`; `POST /invitaciones/masiva` sin
body invitó correctamente a los colaboradores con correo, omitió al que
no tenía, y una segunda corrida los reconoció como ya invitados;
`colaboradorIds` acotó la selección correctamente. Los colaboradores de
prueba (Carla Peña, Héctor Objío) y sus invitaciones de prueba se
revirtieron al estado original (`email = NULL`, sin invitaciones) al
terminar.

**Confirmado por el usuario el 6 de agosto de 2026**, con clics reales
en `localhost:5176`.


## Sprint 18 — Invitación de usuarios ✅ CONFIRMADO (6 de agosto de 2026)

Cierra el gap real confirmado al construir el Sprint 15: no existía
ningún endpoint que creara una `membresia` — solo `scripts/seed.js`, a
mano. Detalle completo en `plan-sprints.md`, Sprint 18.

**Backend:** migración `0017_invitaciones.sql` — tabla `invitacion`, sin
RLS (mismo criterio que `usuario`/`membresia`). Módulo nuevo
`src/invitaciones/` — `POST`/`GET /invitaciones`, `PATCH
/invitaciones/:id/revocar` (autenticado — plataforma invita cualquier
rol/ámbito, RRHH/`ADMIN_EMPRESA` invita dentro de su empresa incluidos
colaboradores ya cargados, `SUPLIDOR_ADMIN` dentro de su suplidor), `GET
/invitaciones/:token` y `POST /invitaciones/:token/aceptar` (público,
sin JWT, usa `PG_POOL_PLATAFORMA` directo). `GET /colaboradores` ahora
expone `usuario_id`, para que el frontend sepa a quién ofrecer invitar.

**Frontend nuevo:** página pública `/invitacion/:token`
(`AceptarInvitacionPage.tsx`), pestaña "Usuarios" en `BackOfficePage`
(`UsuariosTab.tsx`), y sección "Invitar colaboradores" en la pestaña de
RRHH (`InvitarColaboradoresSeccion.tsx`).

**Verificado:** migración aplicada sobre Neon real, build/typecheck
limpios, los 10 archivos de test de regresión en verde, y los dos
caminos probados en vivo de punta a punta (back office invita RRHH →
acepta → login funcional con RLS correcto; RRHH invita a un colaborador
real del seed sin cuenta → acepta → puede usar `GET
/pedidos/menu-disponible`) — datos de prueba limpiados después.
**Confirmado por el usuario con clics reales en `localhost:5176`.**


## Sprint 15 — Recorrido de extremo a extremo ✅ CONFIRMADO (6 de agosto de 2026)

`RECORRIDO-FINAL.md` nuevo — una sola historia de negocio de principio a
fin (no fragmentada por sprint como `PLAN-PRUEBAS.md`): alta de empresa
→ período completo (colaboradores, programa, menú, pedidos, entrega,
disputa, resolución, cierre de ciclo, liquidación al suplidor) →
dashboard reflejando todo. Detalle completo en `plan-sprints.md`,
Sprint 15.

**Hallazgo real:** no existe ningún endpoint que cree un usuario con
membresía para una empresa nueva (`POST /auth/registro` solo crea un
usuario suelto) — gap ya documentado, pero confirmado como bloqueo
concreto al intentar armar este recorrido. El documento separa la
demostración de "alta de empresa" (aislada) del período recurrente (que
usa Futuro ARS, con logins reales) por esta razón, explicada ahí mismo.

**Verificado:** la cadena completa corrida en vivo contra la API real,
encadenada de punta a punta (2 pedidos → entrega → confirmar/disputar →
resolver → cerrar ciclo → archivo de descuento → calcular y pagar
liquidación → dashboard actualizado → trazabilidad completa con las 9
transiciones). Datos de prueba (2 pedidos, 1 ciclo cerrado, 1 liquidación
pagada, todos en diciembre 2026) **no se limpiaron** — representan un
ciclo financiero completo, y desenredarlo a mano es más riesgoso que
dejarlo; pendiente de decisión del usuario. **Confirmado por el usuario
recorriéndolo en `localhost:5176`.**


## Sprint 14 — Dashboard de plataforma ✅ CONFIRMADO (6 de agosto de 2026)

Panel de métricas de plataforma y trazabilidad de pedidos. Dos decisiones
de negocio reales resueltas con el usuario antes de construir (comisión
de plataforma solo para la métrica informativa "ingreso propio", sin
tocar la liquidación real a suplidores del Sprint 7; `pedido_evento`
nuevo, log paralelo de estado, no de dinero). Detalle completo en
`plan-sprints.md`, Sprint 14.

**Backend:** migración `0016_dashboard_plataforma.sql` — tabla
`configuracion_plataforma` (fila única, RLS sin políticas, solo
plataforma) y tabla `pedido_evento` (RLS para ámbito EMPRESA y SUPLIDOR,
mismo patrón `EXISTS` contra `contrato_suplidor` de la migración 0008).
`GET`/`PUT /back-office/configuracion`
(`src/back-office/back-office.controller.ts`). Instrumentadas las 9
transiciones de estado de pedido en `src/pedidos/pedidos.controller.ts`
vía el helper nuevo `src/pedidos/pedido-evento.ts`. `GET
/reportes/dashboard-plataforma` y `GET /reportes/trazabilidad`
(`src/reportes/reportes.controller.ts`).

**Frontend nuevo:** pestañas "Panel de plataforma"
(`DashboardTab.tsx`) y "Trazabilidad" (`TrazabilidadTab.tsx`) en
`BackOfficePage`.

**Verificado:** migración aplicada sobre Neon real, `npm run
build`/`npm run typecheck` limpios en backend y frontend, los 10
archivos de test de regresión en verde, y flujo completo probado en vivo
(configuración editada y restaurada, un pedido real recorrido
preparar→entregar→confirmar-recibido con las 3 transiciones exactas en
`GET /reportes/trazabilidad`). Nota real encontrada al verificar (no un
bug de este sprint): el programa de beneficio de Futuro ARS había
quedado `INACTIVO` por pruebas anteriores del usuario (Sprint 12) —
reactivado para completar la verificación. **Confirmado por el usuario
con clics reales en `localhost:5176`.**


## Sprint 17 — Relación comercial suplidor-empresa ✅ CONFIRMADO (6 de agosto de 2026)

El suplidor propone, back office decide — nunca al revés (decisión 3 de
`nuevo_contrato.md`, confirmada, no reabierta). Detalle completo en
`plan-sprints.md`, Sprint 17.

**Backend:** migración `0015_relacion_comercial.sql` — `contrato_suplidor.estado`
admite 2 valores nuevos (`PENDIENTE`, `RECHAZADA`), RLS de escritura para
el suplidor (antes solo lectura), tabla nueva `lead_comercial` con RLS
propia. Endpoints nuevos: `POST /catalogo/contratos/solicitar`,
`GET /catalogo/contratos`, `POST`/`GET /catalogo/leads`
(`src/catalogo/catalogo.controller.ts`, `SUPLIDOR_ADMIN`); `GET
/back-office/solicitudes-contrato`, `PATCH /back-office/contratos/:id/aprobar`,
`PATCH .../rechazar`, `GET /back-office/leads`, `PATCH
/back-office/leads/:id/convertido` (`src/back-office/back-office.controller.ts`,
`SUPERADMIN`/`SOPORTE`).

**Frontend nuevo:** pestaña "Relación comercial" en `SuplidorPage`
(`ComercialTab.tsx`) y pestaña "Solicitudes y leads" en `BackOfficePage`
(`SolicitudesTab.tsx`). `OnboardingWizard` (Sprint 13) gana props
opcionales (`nombreInicial`, `rncInicial`, `leadId`) para prellenarse
desde "Crear empresa desde este lead" y convertir el lead automáticamente
al confirmar la importación.

**Verificado:** migración aplicada sobre Neon real, `npm run
build`/`npm run typecheck` limpios en backend y frontend, los 10 archivos
de test de regresión en verde, y cada endpoint nuevo probado en vivo
contra la API real (solicitar con sus 3 rechazos, aprobar, rechazar,
crear/listar leads, bandeja, convertir) — datos de prueba limpiados y
contratos de prueba restaurados a su estado original después.
**Confirmado por el usuario con clics reales en `localhost:5176`.**

**Bug real corregido tras la prueba del usuario:** `solicitarContrato`
comparaba el RNC como texto exacto — `130552117` (sin guiones) no
encontraba la empresa guardada como `130-55211-7`, aunque fuera el mismo
número. Corregido comparando solo dígitos en la consulta SQL. Verificado
con el RNC real reportado; suite de regresión sin romperse.

**Bug de proceso real en `versiones/`:** el script de snapshots copiaba
`frontend/` completo antes de poder excluir `node_modules`/`dist` —
los 4 snapshots previos de esta sesión (`sprint-10-11`, `sprint-12`,
`sprint-13`, `sprint-16`) tenían ~97% de bloat (`frontend/node_modules`),
contradiciendo `versiones/README.md`. Corregido excluyendo `frontend`
también del bucle principal. Los 4 inflados se borraron (decisión del
usuario, no reconstruibles limpios sin git); `sprint-17-2026-08-06.zip`
los reemplaza, verificado con 0 entradas de `node_modules`/`dist`.


## Sprint 16 — Autoservicio de RRHH: carga de colaboradores ✅ CONFIRMADO (5 de agosto de 2026)

RRHH puede subir su propio CSV de colaboradores desde su panel
(`localhost:5176`, pestaña "Cargar colaboradores"), sin depender de back
office. Detalle completo en `plan-sprints.md`, Sprint 16.

**Backend:** refactor — el motor de importación (antes métodos privados
de `BackOfficeController`) se movió a `src/back-office/importar-colaboradores.ts`
(funciones puras: `obtenerContenidoCsv`, `puntosValidosDe`, `mapaPuntosDe`,
`parsearCsvOFallar`, `resumenDeFilas`, `importarFilas`). Nuevo:
`POST /colaboradores/preview` y `POST /colaboradores/importar`
(`src/identidad/identidad.controller.ts`, `RRHH`/`ADMIN_EMPRESA`, ámbito
EMPRESA) — mismo motor, sin `:empresaId` en la URL (se toma del ámbito
del token). Sin migración nueva.

**Frontend nuevo:** `frontend/src/components/rrhh/ColaboradoresTab.tsx`,
pestaña nueva en `RrhhPage`.

**Verificado:** `npm run build`/`npm run typecheck` limpios en backend y
frontend, los 10 archivos de test de regresión en verde (incluido
`back-office.test.js`, que ejercita el motor ahora compartido, sin
romperse por el refactor), y el flujo nuevo probado en vivo (preview +
importar reales, colaborador confirmado en `GET /colaboradores`, dato de
prueba limpiado después). **Confirmado por el usuario con clics reales en
`localhost:5176`**, con dos rondas más de bugs reales encontrados y
corregidos usando su archivo real (ver abajo).

**Motor de CSV endurecido de nuevo, el mismo día, con un archivo real:**
detección de delimitador + normalización de encabezados (cambio del
usuario, conservado) y `normalizarMonto()` nueva (Claude) — `salario_neto`
con formato español (`35.000,00`) o símbolo de moneda ya no rompe la
validación ni el `INSERT`. Cédula de 9 dígitos y punto de entrega
desconocido se revisaron y **no son bugs** (dato real inválido / alerta
no bloqueante ya diseñada así). `test/back-office.test.js` sigue en
verde.


## Roadmap ampliado: 6 decisiones de negocio de `nuevo_contrato.md` (5 de agosto de 2026)

Documentación únicamente — sin código nuevo, por instrucción explícita del
usuario ("antes de construir cualquier código nuevo"). Se verificó el
estado real de 6 decisiones de negocio contra el código actual (ninguna
existía) y se confirmó que nada de lo ya construido en los Sprints 11/13
necesita cambiar antes de que el usuario confirme el Sprint 13 — todo lo
nuevo es aditivo.

Se documentaron dos sprints nuevos en `plan-sprints.md`:
- **Sprint 16** — autoservicio de RRHH para cargar su propio CSV de
  colaboradores (hoy exclusivo de back office).
- **Sprint 17** — relación comercial suplidor-empresa: el suplidor puede
  solicitar un contrato con una empresa ya existente (queda `PENDIENTE`
  hasta que back office lo apruebe/rechace) y registrar un "lead"
  comercial de una empresa que no está en la plataforma (nota simple,
  sin crear nada automático — confirmado: el suplidor nunca crea una
  empresa, ni siquiera por esta vía).

También se corrigió la sección de gaps: el de `programa_beneficio` seguía
marcado como sin resolver pese a haberse cerrado en el Sprint 12, y se
agregaron dos gaps nuevos (centro de costo/departamento/turno por
colaborador; límite de subsidio por colaborador individual) — ambos
anotados para no perseguirlos sin un caso de negocio real, no
construidos.

**Archivos modificados:** `plan-sprints.md`.


## Sprint 13 — bug real corregido tras la prueba del usuario (5 de agosto de 2026)

Subir un CSV real y pedir la revisión de filas devolvía `500 Internal
server error` — `csv-parse` lanza una excepción sin capturar ante un CSV
mal formado (ej. comilla sin cerrar), que NestJS convertía en `500`
genérico sin mensaje útil. No apareció en pruebas anteriores porque todos
los CSV de prueba usados hasta ahora estaban bien formados. Corregido en
`src/back-office/csv-colaboradores.ts` (captura y relanza con mensaje
legible, línea incluida) y `src/back-office/back-office.controller.ts`
(nuevo helper `parsearOFallar`, traduce a `400` en los dos endpoints).
Verificado con el mismo tipo de archivo malformado (`400` con mensaje
real) y con un CSV válido (sigue funcionando igual);
`test/back-office.test.js` sigue en verde.

**Segundo bug real, mismo día:** con el mensaje ya legible, apareció uno
real de verdad — el archivo del usuario usa `;` como separador (Excel en
español exporta así, `,` es el separador decimal), pero el parser solo
aceptaba `,`. Corregido con `delimiter: [',', ';']` en `csv-parse`
(auto-detección) — verificado con un CSV real por `;` y con la suite de
regresión.


## Sprint 13 — Frontend: panel de back office ✅ CONFIRMADO (5 de agosto de 2026)

Cuarto cliente real de la API, mismo stack que los Sprints 10/11/12,
dentro del mismo `frontend/`: `BackOfficePage` con lista de empresas,
wizard de alta en 3 pasos (con subida real de CSV, no simulada), y
detalle de empresa con gestión de contratos. Detalle completo, incluidas
las 4 discrepancias reales contra `portal-backoffice-onboarding.html`, en
`plan-sprints.md`, Sprint 13.

**Backend tocado** (documentado antes de construirse): `GET
/back-office/suplidores` (`src/back-office/back-office.controller.ts`) —
no existía ningún endpoint para listar suplidores desde ningún ámbito;
sin él, la pantalla de "agregar suplidor" no podía ofrecer opciones. Sin
migración nueva.

**Frontend nuevo:** `frontend/src/pages/BackOfficePage.tsx`,
`frontend/src/components/backoffice/{EmpresasLista,OnboardingWizard,DetalleEmpresa}.tsx`.
`RolRouter` gana la rama de ámbito `PLATAFORMA` (`SUPERADMIN`/`SOPORTE`).

**Verificado:** `npm run build`/`npm run typecheck` limpios en backend y
frontend, los 10 archivos de test de regresión en verde, y el flujo
completo probado en vivo contra la API real con un CSV real
(`multipart/form-data`, no simulado): preview con error/alerta
correctos, importación, contratación de suplidor, edición de
`ajuste_pct`, desactivación — datos de prueba limpiados después.
**Confirmado por el usuario con clics reales en `localhost:5176`**, con
dos bugs reales encontrados y corregidos durante la prueba (ver entradas
siguientes: `500` genérico en CSV mal formado, y separador `;` no
soportado).


## Sprint 12 — Frontend: panel de RRHH ✅ CONFIRMADO (4 de agosto de 2026)

Tercer cliente real de la API, mismo stack que los Sprints 10/11, dentro
del mismo `frontend/`: `RrhhPage` con 3 pestañas (Disputas y pedidos,
Ciclos y libro mayor, Programas de beneficio). Detalle completo, incluidas
las 4 discrepancias reales contra `mockup-plataforma-almuerzo.html`
(pestaña `vRRHH`), en `plan-sprints.md`, Sprint 12.

**Backend tocado** (documentado antes de construirse, no nuevo sin
avisar):
- `GET /nomina/movimientos` (`src/nomina/nomina.controller.ts`) — no
  existía forma de listar el libro mayor en crudo, solo el CSV agregado.
- `src/nomina/programas.controller.ts` (nuevo) — CRUD de
  `programa_beneficio` y `asignacion_programa`
  (`GET`/`POST /programas`, `PATCH /programas/:id`,
  `GET`/`POST /programas/:id/asignaciones`,
  `PATCH /programas/:programaId/asignaciones/:asignacionId`). Cierra el
  gap documentado desde el Sprint 9: una empresa nueva no tenía forma de
  que sus colaboradores pudieran pedir. Sin migración nueva.

**Frontend nuevo:** `frontend/src/pages/RrhhPage.tsx`,
`frontend/src/components/rrhh/{DisputasTab,CiclosTab,ProgramasTab}.tsx`.
`RolRouter` gana la rama `RRHH`/`ADMIN_EMPRESA`.

**Verificado:** `npm run build`/`npm run typecheck` limpios en backend y
frontend, los 10 archivos de test de regresión en verde, y el backend
nuevo probado en vivo contra la API real (crear programa, solape
rechazado con `400`, finalizar/reasignar, editar/desactivar, descarga
real del CSV de archivo de descuento) — datos de prueba limpiados después
para no contaminar el seed. **Confirmado por el usuario con clics reales
en `localhost:5176`.**

## Roadmap ampliado (4 de agosto de 2026)

`plan-sprints.md` gana el Sprint 12 (RRHH, detallado arriba) y dos sprints
reservados sin desglosar: Sprint 13 (dashboard de plataforma — el mockup
ya tiene diseñado un panel, pestaña `vPlat`, ámbito plataforma/back
office) y Sprint 14 (recorrido de extremo a extremo del sistema
terminado, sprint final). `PLAN-PRUEBAS.md` también gana el tramo del
Sprint 11 (suplidor) que había quedado pendiente desde su confirmación —
hueco de proceso real, corregido.


## Sprint 11 — Frontend: portal del suplidor ✅ CONFIRMADO (3 de agosto de 2026)

Segundo cliente real de la API, mismo stack que el Sprint 10, dentro del
mismo `frontend/`: `SuplidorPage` con 3 pestañas (Catálogo, Plantilla
semanal, Calendario y preparación/entrega), enrutadas por rol desde
`RolRouter` (`COLABORADOR` → pantalla existente, `SUPLIDOR_ADMIN` → esta
nueva). Detalle completo, incluidas las 5 discrepancias reales encontradas
contra `portal-suplidor-menu.html`, en `plan-sprints.md`, Sprint 11.

**Backend tocado** (chico, documentado, no nuevo sin avisar): `DELETE
/catalogo/plantillas/:plantillaId/items/:itemId`
(`src/catalogo/catalogo.controller.ts`) — no existía forma de quitar un
plato ya agregado a un día de la plantilla; caso de negocio real
(discrepancia 2 del Sprint 11). Sin migración nueva — RLS ya cubre el
aislamiento por `suplidor_id` denormalizado en `plantilla_item`.

**Frontend nuevo:** `frontend/src/pages/RolRouter.tsx`,
`frontend/src/pages/SuplidorPage.tsx`,
`frontend/src/components/suplidor/{CatalogoTab,PlantillaTab,CalendarioTab,PreparacionSeccion}.tsx`.

**Verificado:** `npm run migrate` (nada que aplicar),
`npm run build`/`npm run typecheck` limpios en backend y frontend, los 10
archivos de test de regresión en verde, y el `DELETE` nuevo probado en
vivo contra la API real (crear item → borrar → repetir el borrado da
`404`). **Confirmado por el usuario con clics reales en `localhost:5176`.**


Registro de cambios por sprint, mientras el proyecto no tiene control de
versiones real (git) — ver la nota en `plan-sprints.md`, Sprint 9. Cada
entrada resume qué cambió a nivel de archivo; el detalle de diseño,
decisiones y bugs reales está en `plan-sprints.md`.

Cada sprint confirmado tiene un snapshot restaurable en `versiones/` — ver
`versiones/README.md` para cómo volver a un estado anterior.

---

## Sprint 10 — Frontend: app del colaborador ✅ CONFIRMADO (31 de julio de 2026, probado en navegador por el usuario)

Primer cliente real de la API: `frontend/` (Vite + React 18 + TypeScript +
Tailwind + TanStack Query + React Router), rol colaborador únicamente, tal
como se documentó. Dos discrepancias reales más encontradas al construir
(sin ampliar el backend en silencio): no hay endpoint para previsualizar un
pedido antes de crearlo (la pantalla de pedir muestra el bruto conocido y
el desglose real llega al confirmar), y no hay endpoint `/me` para el
colaborador (el encabezado muestra el correo de sesión, no el nombre
completo). Detalle completo en `plan-sprints.md`, Sprint 10.

**Backend tocado** (documentado en el plan, no nuevo sin avisar):
`src/main.ts` (+CORS), `src/pedidos/consumo-ciclo.ts` (nuevo — factoriza el
cálculo que antes vivía duplicado en `crearPedido`), `src/pedidos/pedidos.controller.ts`
(+`GET /pedidos/consumo-ciclo`, usa la función factorizada), `.env.example`
(+`CORS_ORIGENES`).

**Frontend nuevo:** `frontend/` completo — scaffold, cliente de API
tipado, contexto de autenticación (login → selección de ámbito →
localStorage), pantallas de pedir/mis pedidos/disputa, medidor de consumo
del ciclo.

**Verificado:** `npm run typecheck`/`npm run build` limpios (backend y
frontend), toda la suite de regresión del backend sigue pasando (10
archivos), `GET /pedidos/consumo-ciclo` y CORS probados en vivo, y
confirmado por el usuario con clics reales en su navegador.

## Criterio de EXPERTO.md cargado (31 de julio de 2026)

`EXPERTO.md` tenía contenido real (mismo retraso de sincronización que
`plan-sprints.md`) pero `CLAUDE.md` nunca lo importaba. Agregado el import
`@EXPERTO.md`. Por su propia regla de cobertura funcional, se documentó una
sección nueva de gaps en `plan-sprints.md` (recuperación de contraseña/
invitación por correo, cumplimiento fiscal dominicano NCF/ITBIS/606-607,
Ley 172-13) — identificados, no construidos.

**Archivos modificados:** `CLAUDE.md`, `plan-sprints.md`.

## PLAN-PRUEBAS.md creado, retroactivo a Sprints 1–9 (31 de julio de 2026)

Cumple la otra obligación de `EXPERTO.md` que faltaba: el recorrido de
extremo a extremo, en orden narrativo (empresa → colaboradores → contrato →
menú → pedido → entrega → confirmación/disputa → cierre de ciclo →
liquidación → ayuda → reportes), con comandos `curl.exe`/PowerShell reales
y su resultado esperado — no bash/python3, para que el usuario lo corra tal
cual en su máquina. Reconstruido contra los controladores y `scripts/seed.js`
reales, no inventado de memoria.

**Bug real de diseño encontrado al escribirlo:** no existe ningún endpoint
para crear/editar `programa_beneficio` — solo `seed.js` lo inserta. Una
empresa nueva dada de alta por el back office no tiene forma de que sus
colaboradores pidan almuerzo. Documentado en `plan-sprints.md`, sección de
gaps — no corregido aquí, fuera del alcance de escribir el plan de pruebas.

**Archivos nuevos:** `PLAN-PRUEBAS.md`.
**Archivos modificados:** `plan-sprints.md` (+gap de `programa_beneficio`).

## Herramienta para correr PLAN-PRUEBAS.md de un solo golpe (31 de julio de 2026)

`scripts/prueba-e2e.js` — automatiza las secciones 2 a 9 de `PLAN-PRUEBAS.md`
(back office → catálogo → pedidos → entrega/disputa → nómina → liquidación →
ayuda → reportes) con el fetch nativo de Node, mismo enfoque que
`scripts/smoke-test.js`. Corrido de verdad contra la base real dos veces
seguidas para confirmar que es idempotente (`npm run prueba-e2e`).

**Bug real de la primera corrida (no del backend, del script):** este
dev-branch de Neon ya acumuló meses de pruebas manuales — Ana ya tenía
pedidos hasta octubre 2026. El script original buscaba fechas libres de
menú solo dentro de los próximos 14 días (default de
`GET /pedidos/menu-disponible`) y no encontraba ninguna. Corregido: publica
~6 meses hábiles de menú y busca fechas libres en esa ventana completa. Una
vez las fechas de prueba cayeron varios meses en el futuro, los reportes y
`POST /liquidaciones/calcular` (que por default filtran "los últimos 30
días"/"el período vigente hoy") tampoco encontraban los pedidos de prueba —
corregido pasándoles explícitamente el rango de fechas real que se usó.

**Archivos nuevos:** `scripts/prueba-e2e.js`.
**Archivos modificados:** `package.json` (+script `prueba-e2e`).

## Sprint 10 — Frontend: app del colaborador (documentado, sin construir)

Solo planificación — sin cambios de código. Se leyeron los tres mockups
HTML (que el usuario colocó en la raíz del proyecto: `mockup-plataforma-
almuerzo.html`, `portal-suplidor-menu.html`, `portal-backoffice-
onboarding.html`) y se escribió el desglose completo en `plan-sprints.md`:
5 subsprints, stack propuesto (React + TS + Vite + Tailwind + TanStack
Query + React Router, con razonamiento), y 3 discrepancias reales
encontradas entre el diseño validado y el backend ya construido (el botón
"Reclamar" sobre `RECIBIDO` que el backend no soporta, el medidor de
consumo de ciclo que necesita un endpoint nuevo, y CORS nunca configurado).

**Archivos modificados:** `plan-sprints.md` únicamente.

## Corrección post-cierre (31 de julio de 2026) — reportes de dinero ahora salen del libro mayor

Bug real, encontrado al revisar con el usuario si `plan-sprints.md`/`README.md`
decían de qué tabla salían los números de `GET /reportes/gasto-empresa`. No
lo decían, y la respuesta real era inconsistente con el Sprint 6: contaban
`pedido` directo (incluidos pedidos `ENTREGADO`/`DISPUTA` sin resolver), no
`movimiento` (el libro mayor, la fuente de verdad declarada en el Sprint 6).

**Archivos modificados:** `src/reportes/reportes.controller.ts`
(`consumo-colaborador` y `gasto-empresa` reescritos sobre `movimiento`),
`test/reportes.test.js` (+ prueba: un `ENTREGADO` sin `CARGO` no se cuenta),
`plan-sprints.md`, `README.md`. También se corrigieron 5 líneas obsoletas
"Falta: confirmación..." en `plan-sprints.md` que quedaron sin actualizar
al marcar los Sprints 5–9 como confirmados.

## Cierre de roadmap (30 de julio de 2026) — Sprint 4 confirmado + hueco de descubrimiento de menú resuelto

Sin sprint propio: al preguntar "qué falta para concluir el proyecto" se
cerraron los dos pendientes que quedaban abiertos.

**Archivos modificados:** `src/pedidos/pedidos.controller.ts` (+`GET
/pedidos/menu-disponible`), `plan-sprints.md` (Sprint 4 → ✅ CONFIRMADO; nota
de alcance del Sprint 5 marcada como resuelta), `README.md`.

## Sprint 9 — Operación y lanzamiento (subsprints 9.1–9.3 ✅ CONFIRMADOS; 9.4 preparado sin ejecutar — bloqueado por falta de git)

**Migraciones:** `migrations/0014_notificaciones.sql` (`suplidor.email_contacto`, tabla `notificacion_enviada`).

**Archivos nuevos:**
- `src/reportes/` (`reportes.controller.ts`, `reportes.module.ts`)
- `src/notificaciones/` (`notificaciones.controller.ts`, `notificaciones.module.ts`)
- `src/common/notificaciones.ts`, `src/common/request-logging.interceptor.ts`, `src/common/validar-entorno.ts`
- `render.yaml`, `.gitignore`
- `test/reportes.test.js`, `test/notificaciones.test.js`

**Archivos modificados:** `src/app.module.ts`, `src/main.ts`, `src/auth/auth.module.ts`, `src/auth/auth.controller.ts`, `src/pedidos/pedidos.controller.ts` (disparadores de notificación en `entregarPedido`/`resolverDisputa`), `src/liquidaciones/liquidaciones.controller.ts` (disparador en `marcarPagado`), `.env.example`, `README.md`, `CLAUDE.md`, `package.json` (+`helmet`, `+@nestjs/throttler`).

## Sprint 8 — Sistema de ayuda (solo backend) ✅ CONFIRMADO

**Migraciones:** `migrations/0012_ayuda_contenido.sql`, `migrations/0013_ayuda_contenido_solo_lectura_app.sql`.

**Archivos nuevos:** `src/ayuda/` (`ayuda.controller.ts`, `ayuda.module.ts`, `dto.ts`), `test/ayuda.test.js`.

**Archivos modificados:** `src/app.module.ts`, `scripts/seed.js` (5 fichas de ayuda reales), `README.md`, `CLAUDE.md`.

## Sprint 7 — Liquidación a suplidores ✅ CONFIRMADO

**Migraciones:** `migrations/0011_liquidacion_suplidores.sql`.

**Archivos nuevos:** `src/liquidaciones/` (`liquidaciones.controller.ts`, `liquidaciones.module.ts`, `dto.ts`), `test/liquidaciones.test.js`.

**Archivos modificados:** `src/pedidos/pedidos.controller.ts` (aplica `ajuste_pct` en `crearPedido` — bug real corregido, existía desde el Sprint 2 sin usarse), `src/pedidos/elegibilidad.util.ts` (+`aplicarAjustePct`), `src/app.module.ts`, `README.md`, `CLAUDE.md`.

## Sprint 6 — Nómina y libro mayor ✅ CONFIRMADO

**Migraciones:** `migrations/0010_libro_mayor_y_ciclos.sql`.

**Archivos nuevos:** `src/nomina/` (`nomina.controller.ts`, `nomina.module.ts`, `dto.ts`, `campos-reporte.ts`), `src/common/libro-mayor.ts`, `test/nomina.test.js`.

**Archivos modificados:** `src/pedidos/pedidos.controller.ts` (postea `CARGO` al libro mayor en los 3 puntos donde un pedido llega a `RECIBIDO`), `src/app.module.ts`, `README.md`, `CLAUDE.md`.

## Sprint 5 — Entrega, disputas y política de silencio ✅ CONFIRMADO

**Migraciones:** `migrations/0008_entrega_disputas_silencio.sql`, `migrations/0009_contrato_suplidor_visible_para_suplidor.sql` (bug real: RLS de `contrato_suplidor` bloqueaba la propia subconsulta de la política del suplidor).

**Archivos nuevos:** `test/entrega-disputas.test.js`.

**Archivos modificados:** `src/pedidos/pedidos.controller.ts` (endpoints de suplidor y colaborador para el ciclo de entrega/disputa, resolución perezosa por silencio), `src/pedidos/dto.ts`, `src/common/calendario.util.ts` (+`ventanaSilencioVencida`/`ventanaSilencioVenceEn`), `README.md`, `CLAUDE.md`. Borrado: `src/catalogo/calendario.util.ts` (código muerto, duplicado sin uso).

## Sprint 4 — Motor de pedidos (construido y probado, pendiente de confirmación del usuario)

**Migraciones:** `migrations/0006_programa_y_pedidos.sql`, `migrations/0007_lectura_cruzada_contrato.sql` (bug real: RLS por suplidor bloqueaba la lectura del menú para colaboradores).

**Archivos nuevos:** `src/pedidos/` completo, `test/pedidos.test.js`.

**Archivos modificados:** `src/app.module.ts`, `README.md`.

## Sprint 3 — Catálogo y menú del suplidor ✅ CONFIRMADO

**Migraciones:** `migrations/0005_catalogo_y_menu.sql`.

**Archivos nuevos:** `src/catalogo/` completo, `src/common/calendario.util.ts`, `test/catalogo.test.js`.

## Sprint 2 — Back office: empresas, colaboradores y contratos ✅ CONFIRMADO

**Migraciones:** `migrations/0004_contratos_y_rol_plataforma.sql`.

**Archivos nuevos:** `src/back-office/` completo, `test/back-office.test.js`.

## Sprint 1 — Fundación técnica e identidad ✅ CONFIRMADO

**Migraciones:** `migrations/0001_extensiones.sql`, `0002_identidad.sql`, `0003_rls.sql`.

Base del proyecto: NestJS, `scripts/migrate.js`, `src/auth/`, `src/identidad/`, `src/common/` (guards, interceptor de tenant, tipos de pg), `src/db/`, `test/tenant-isolation.test.js`, `scripts/smoke-test.js`, `scripts/seed.js`.
