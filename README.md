# almuerzo-api — Sprint 1: Fundación técnica e identidad

Backend real de la plataforma de almuerzo corporativo. Este es el Sprint 1 del
`plan-sprints.md`: sin pantallas de negocio todavía, solo la base — repo,
infraestructura, identidad, y RLS.

Todo lo que hay aquí fue probado contra una base de datos PostgreSQL real
(no simulada) antes de entregarte esto, incluido un test que intenta insertar
datos de una empresa "haciéndose pasar" por otra, y confirma que Postgres lo
rechaza. Ver la sección "Qué se verificó" al final.

---

## 1. Requisitos

- Node.js 20+
- Docker y Docker Compose

## 2. Conseguir una base de datos de desarrollo

**Recomendado — Neon (sin instalar nada):**

1. Crea una cuenta gratuita en [neon.tech](https://neon.tech) si no tienes una — es la misma que usarás en producción.
2. Crea un proyecto (o usa el que ya tengas) y dentro de él, una rama llamada `dev`.
   Las ramas de Neon son copias aisladas de la base; puedes borrar y recrear `dev`
   cuando quieras sin tocar nada más.
3. Copia el connection string que te da Neon para esa rama — lo usarás en el paso 3.

Con esto no necesitas Docker ni instalar Postgres en tu máquina. Es el mismo motor
que usarás en producción, así que no hay sorpresas de versión entre ambos.

**Alternativa — Postgres instalado directo en tu máquina**, si prefieres desarrollar
sin depender de internet:

- macOS: `brew install postgresql@16 && brew services start postgresql@16`
- Ubuntu/Debian: `sudo apt install postgresql postgresql-contrib`
- Windows: instalador oficial desde postgresql.org

**Alternativa — Docker Compose**, si ya usas Docker por otra razón (por ejemplo,
si quieres correr Redis localmente para el sprint de pedidos):

```bash
docker compose up -d
```

Cualquiera de las tres te da lo mismo: una cadena de conexión que pegar en `.env`
en el siguiente paso. El resto de esta guía no cambia según cuál elijas.

## 3. Configurar variables de entorno

```bash
cp .env.example .env
```

Genera un `JWT_SECRET` propio en vez de usar el de ejemplo:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Pega el resultado en `.env`.

**Importante — dos cadenas de conexión distintas, a propósito:**
- `DATABASE_URL` conecta como `almuerzo_app`, un rol **sin** privilegio `BYPASSRLS`.
  La usan la aplicación y los tests. Es la que de verdad respeta Row Level Security.
- `MIGRATE_DATABASE_URL` conecta como superusuario. La usan solo `scripts/migrate.js`
  y `scripts/seed.js`, porque necesitan crear tablas, políticas y el propio rol
  `almuerzo_app`. **Nunca** debe usarla la aplicación en tiempo de ejecución —
  los superusuarios de Postgres ignoran RLS sin importar `FORCE ROW LEVEL SECURITY`,
  así que si la app se conectara con ese rol, el aislamiento por empresa dejaría
  de existir sin que ningún test lo detectara.

## 4. Instalar dependencias y migrar

```bash
npm install
npm run migrate
```

Deberías ver las 3 migraciones aplicarse en orden: extensiones, tablas de identidad,
y RLS (esta última es la que crea el rol `almuerzo_app`).

## 5. Sembrar datos de prueba

```bash
npm run seed
```

Carga las mismas 2 empresas, 4 colaboradores y 2 suplidores que ya conoces de los
mockups (`mockup-plataforma-almuerzo.html`, `portal-backoffice-onboarding.html`),
más un usuario de prueba:

```
rrhh@futuroars.demo / rrhh123456   (rol RRHH en Futuro ARS)
```

## 6. Levantar la API

```bash
npm run build
npm run start
```

O en modo desarrollo, con recarga automática:

```bash
npm run start:dev
```

Deberías ver `almuerzo-api escuchando en http://localhost:3000`.

---

## 7. Entregable a confirmar (esto es lo que definimos en el plan de sprints)

Con la API corriendo en una terminal, en otra corre:

```bash
npm run smoke
```

Esto ejecuta `scripts/smoke-test.sh`, que reproduce con `curl` el flujo completo:
health check → rechazo sin token → login → rechazo sin ámbito seleccionado →
selección de ámbito → el endpoint protegido devolviendo únicamente los 4
colaboradores de Futuro ARS.

Y por separado, el test que de verdad importa para este sprint:

```bash
npm run test
```

(Corre `test/tenant-isolation.test.js` — crea dos empresas de prueba, un
colaborador en cada una, e intenta leer y escribir datos de una mientras el
sistema "cree" estar en la otra. Las 5 pruebas deben pasar.)

**El sprint queda confirmado cuando:**
1. `npm run migrate` corre sin errores sobre una base nueva.
2. `npm run smoke` pasa sus 6 verificaciones.
3. `npm run test` pasa sus 5 verificaciones de aislamiento.

Si algo de esto falla en tu máquina y no en la mía, dímelo con el error exacto —
es información real sobre una diferencia de entorno que vale la pena resolver
antes de seguir al Sprint 2.

---

## 8. Decisiones tomadas en este sprint (y por qué)

- **SQL directo en vez de Prisma/Kysely/TypeORM.** El diseño completo del sistema
  ya está expresado en SQL (ver `diseno-plataforma-almuerzo-corporativo.md`), y
  mantener ese SQL como fuente de verdad, con un migrador mínimo propio
  (`scripts/migrate.js`), da control total sobre el DDL sin la curva de aprendizaje
  de un ORM. Es reversible sin perder nada: los archivos `.sql` no dependen de
  ninguna herramienta en particular.
- **bcryptjs en vez de argon2** para el hash de contraseñas. Argon2 requiere
  compilar un binario nativo, lo cual puede fallar según el entorno de hosting.
  bcrypt es JavaScript puro, ampliamente usado en producción, y elimina esa fuente
  de fricción — relevante para un proyecto personal donde tú administras el deploy.
- **NestJS 11**, no 10. Se detectó una vulnerabilidad moderada real en la versión
  10 durante `npm audit`; se corrigió antes de entregar, no después.
- **BIGINT como number en JavaScript, no string.** node-postgres devuelve BIGINT
  como string por defecto (para no perder precisión en valores gigantes). Se
  configuró globalmente lo contrario (`src/common/pg-tipos.ts`) porque el volumen
  de este sistema nunca se acerca al límite donde eso importa, y comparar
  string contra number en cada endpoint es una fuente de bugs silenciosos —
  de hecho, causó uno real durante el desarrollo de este mismo sprint (ver historial).

## 9. Fuera de alcance del Sprint 1 (a propósito)

Ninguna pantalla de negocio, notificaciones, pagos, ni multi-beneficio.

## 10. Sprint 2 — Back office: empresas, colaboradores y contratos

Agrega el rol `almuerzo_platform` (ver `migrations/0004`), que **sí** tiene
`BYPASSRLS` a propósito — el back office gestiona todas las empresas, así que
necesita ver a través del aislamiento por tenant, no quedar bloqueado por él.
Su uso queda restringido en código a requests con rol `SUPERADMIN` o `SOPORTE`
en ámbito `PLATAFORMA` (`RolesGuard` + `TenantContextInterceptor`).

Después de `npm run migrate`, agrega a tu `.env` la variable
`PLATFORM_DATABASE_URL` (mismo host/base, usuario `almuerzo_platform`).
Vuelve a correr `npm run seed` — ahora también crea un usuario de plataforma:

```
admin@plataforma.demo / admin123456   (rol SUPERADMIN, ámbito PLATAFORMA)
```

**Endpoints nuevos:**
- `GET /back-office/empresas` — lista con conteo de colaboradores y suplidores activos.
- `POST /back-office/empresas` — alta de empresa.
- `POST /back-office/empresas/:id/colaboradores/preview` — valida un CSV sin escribir nada.
- `POST /back-office/empresas/:id/colaboradores/importar` — valida e inserta las filas sin error.
- `GET/POST /back-office/empresas/:id/contratos` y `PATCH /back-office/contratos/:id` — contratos con suplidores.

**Sobre la carga de CSV**, soporta las dos formas que se definieron para este sprint:
- Archivo real: `multipart/form-data`, campo `file`.
- Texto plano: `application/json`, campo `{ "csv": "..." }`.

Las reglas de validación son las mismas que se probaron visualmente en
`portal-backoffice-onboarding.html`: código de nómina y cédula obligatorios y
únicos dentro del archivo, cédula con formato válido, nombre obligatorio, y un
punto de entrega que no coincide con ninguno configurado se marca como
**alerta** (se importa igual) y no como error.

**Test de este sprint:** `node test/back-office.test.js` (requiere haber
compilado con `npm run build`, porque importa el motor de validación desde `dist/`).

## 11. Fuera de alcance del Sprint 2 (a propósito)

Ninguna pantalla — estos son solo endpoints. El portal visual del back office
(equivalente real a `portal-backoffice-onboarding.html`) se construye cuando
el proyecto tenga un frontend, que no es parte de estos sprints de backend.

## 12. Sprint 3 — Catálogo y menú del suplidor

Agrega catálogo (`producto`), rutas de servicio con cutoff, plantilla semanal
de rotación, y publicación de `menu_dia` con congelamiento automático — todo
con RLS por `suplidor_id`, reutilizando el mismo rol `almuerzo_app` y el mismo
interceptor del Sprint 1 (ya sabía fijar `app.suplidor_id`, solo que ninguna
tabla lo usaba hasta ahora).

Después de `npm run migrate` y `npm run seed`, tienes un usuario de prueba nuevo:

```
suplidor@cocinacriolla.demo / suplidor123456   (rol SUPLIDOR_ADMIN)
```

**Endpoints nuevos**, todos bajo `/catalogo`:
- `GET/POST /catalogo/productos`, `PATCH /catalogo/productos/:id`
- `GET/POST /catalogo/rutas` — cutoff y hora de entrega por punto de entrega
- `GET/POST /catalogo/plantillas`, `POST /catalogo/plantillas/:id/items`
- `POST /catalogo/menu/publicar` — aplica la plantilla a los próximos días hábiles
- `GET /catalogo/menu?desde=&hasta=` — calendario, con `estado` (PUBLICADO/CONGELADO)
  calculado al vuelo contra el cutoff real, no guardado en una columna
- `PATCH /catalogo/menu/:id` — edita precio/cupo/disponibilidad; rechaza con
  403 si el cutoff de esa fecha ya venció

**Decisión de alcance** documentada en `plan-sprints.md`: el cutoff que congela
un día es el más temprano entre todas las rutas activas del suplidor (conservador
— se congela en cuanto la primera ruta lo requiere). Si en el futuro un
suplidor necesita cutoffs realmente independientes por punto de entrega, esto
se revisita entonces.

**Test de este sprint:** `node test/catalogo.test.js` (requiere `npm run build`
primero) — prueba las funciones de calendario con datos fijos, y contra la
base real: que un suplidor no ve el catálogo de otro, y que Postgres rechaza
un intento de insertar un `plantilla_item` con el `suplidor_id` de otro
mientras el GUC activo dice el propio (`WITH CHECK`, el mismo mecanismo del
Sprint 1).

## 13. Fuera de alcance del Sprint 3 (a propósito)

Fotos reales de los platos (`producto.imagen_url` es solo texto por ahora, sin
CDN ni recorte), aprobación del menú por la empresa, y que el colaborador vea
este menú — eso último es el Sprint 4.

## 14. Sprint 4 — Motor de pedidos

Agrega `programa_beneficio`, `asignacion_programa` (con la restricción `EXCLUDE`
que impide vigencias solapadas), y `pedido`/`pedido_linea` — el flujo completo
de la vista Colaborador de `mockup-plataforma-almuerzo.html`.

**Bug de arquitectura real, encontrado al probar el flujo completo (no al
diseñarlo):** un colaborador pide bajo ámbito `EMPRESA`, así que su transacción
nunca fija `app.suplidor_id` — la política de RLS del Sprint 3 (por suplidor)
bloqueaba por completo la lectura del menú, para cualquier colaborador, de
cualquier suplidor. La migración 7 agrega políticas permisivas adicionales
(Postgres las combina con OR) que habilitan lectura — y el descuento de
cupo — solo para empresas con un `contrato_suplidor` **activo** con ese
suplidor. Sin contrato, sigue sin ver nada.

Después de `npm run migrate` y `npm run seed`, tienes un colaborador de prueba real:

```
ana.ramirez@futuroars.demo / colaborador123456   (rol COLABORADOR)
```

**Endpoints nuevos:**
- `GET /pedidos/menu-disponible?desde=&hasta=` — descubre qué puede pedir
  el colaborador sin conocer nada de antemano: solo suplidores con ruta
  activa a su punto de entrega **y** contrato activo con su empresa, precio
  ya ajustado por `ajuste_pct` (Sprint 7), y si todavía se puede pedir
  (`disponible`, antes del cutoff, con cupo). Agregado al cerrar el
  roadmap (Sprint 9) — hueco real anotado desde el Sprint 5, ver
  `plan-sprints.md`.
- `POST /pedidos` — crea un pedido, corriendo las 6 validaciones del motor de
  elegibilidad dentro de una transacción con `SELECT ... FOR UPDATE` sobre
  `menu_dia` (evita que dos colaboradores tomen el mismo último cupo a la vez).
- `GET /pedidos/mios`, `PATCH /pedidos/:id/cancelar` — ámbito del colaborador.
- `GET /pedidos` — todos los de la empresa, para RRHH/ADMIN_EMPRESA.

**Decisión de secuencia:** el tope de ciclo se calcula sumando `monto_colaborador`
directo de `pedido` para el período actual (según `frecuencia_nomina` de la
empresa) — todavía no existe el libro mayor formal, que es el Sprint 6.

**Test de este sprint:** `node test/pedidos.test.js` — cubre `calcularSubsidio`
con los 4 casos del diseño original, la restricción `EXCLUDE` de
`asignacion_programa`, y RLS de `pedido`. Los casos de rechazo del motor
completo (duplicado, cutoff, cupo) se validaron con `curl` durante el
desarrollo — ver la conversación para el detalle exacto de cada prueba.

## 15. Fuera de alcance del Sprint 4 (a propósito)

Confirmación de entrega, disputas, política de silencio (Sprint 5); libro
mayor y cierre de ciclo (Sprint 6); que el suplidor vea la lista de
preparación derivada de estos pedidos (Sprint 5).

## 16. Sprint 5 — Entrega, disputas y política de silencio

Cierra el ciclo de vida del pedido más allá de `CONFIRMADO`: el suplidor
prepara y entrega (validando el `codigo_retiro` que el colaborador presenta
en el punto de entrega), el colaborador confirma o disputa lo recibido, y si
no dice nada, la política de silencio del programa de beneficio decide qué
pasa — sin ningún job en segundo plano, mismo principio que el congelamiento
de `menu_dia` del Sprint 3: se resuelve la primera vez que un endpoint
relevante toca esos pedidos, con un único `UPDATE ... FROM ... WHERE`, no un
cron.

**Política de silencio, configurable por programa de beneficio**
(`programa_beneficio.politica_silencio` + `horas_ventana_confirmacion`,
migración 8):
- `AUTO_CONFIRMA` (default, 24h): si el colaborador no dice nada dentro de la
  ventana, el pedido pasa a `RECIBIDO` como si hubiera confirmado.
- `AUTO_DISPUTA`: si no dice nada, se abre una `DISPUTA` automática (motivo
  `OTRO`) para que RRHH la revise — útil para programas donde el silencio no
  debe interpretarse como conformidad.

**Endpoints nuevos, todos bajo `/pedidos`:**
- `GET /pedidos/preparacion?fecha=` (suplidor) — lista agrupada por punto de
  entrega, con el consolidado de platos a preparar. **No** incluye el
  `codigo_retiro` de cada pedido a propósito: si el suplidor pudiera leerlo
  desde aquí, pedírselo al colaborador en la entrega dejaría de probar nada.
- `PATCH /pedidos/:id/preparar` (suplidor) — `CONFIRMADO` → `EN_PREPARACION`.
- `PATCH /pedidos/:id/entregar` (suplidor) — `{ "codigoRetiro": "..." }`,
  valida contra el código real del pedido; si no coincide, 400. Si coincide,
  → `ENTREGADO`.
- `PATCH /pedidos/:id/no-entregado` (suplidor) — el colaborador no se
  presentó; libera el cupo, igual que cancelar.
- `PATCH /pedidos/:id/confirmar-recibido` (colaborador) — `ENTREGADO` →
  `RECIBIDO`, solo dentro de la ventana de silencio.
- `PATCH /pedidos/:id/disputar` (colaborador) — `{ "motivo": "NO_LLEGO" |
  "INCOMPLETO" | "EQUIVOCADO" | "CALIDAD" | "OTRO", "nota"? }` → `DISPUTA`.
- `GET /pedidos/disputas` y `PATCH /pedidos/:id/resolver-disputa` (RRHH) —
  `{ "aFavorColaborador": boolean, "nota"? }`. A favor del colaborador →
  `NO_ENTREGADO` (libera cupo). A favor del suplidor → `RECIBIDO`.

`GET /pedidos/mios` ahora también devuelve `puedeConfirmar` y
`ventanaConfirmacionVenceEn` por pedido, calculados al vuelo.

**Bug real encontrado durante este sprint:** las políticas RLS nuevas que
dejan al suplidor tocar sus propios pedidos dependen de un `EXISTS` contra
`contrato_suplidor` — pero esa tabla tenía su propia RLS que solo permitía
verla en ámbito EMPRESA, así que el `EXISTS` fallaba siempre en ámbito
SUPLIDOR, aunque el contrato existiera de verdad. Corregido en la migración
9. Ver `plan-sprints.md`, Sprint 5, para el detalle completo.

**Test de este sprint:** `node test/entrega-disputas.test.js` (requiere
`npm run build` primero) — funciones puras de ventana de silencio, RLS del
suplidor sobre `pedido`/`pedido_linea` con y sin contrato activo, y
resolución perezosa por silencio en sus dos modos. El flujo completo
(código de retiro correcto/incorrecto, `confirmar-recibido`, `disputar`,
`resolver-disputa`) se validó end-to-end contra la API real corriendo
durante el desarrollo — ver la conversación para el detalle exacto.

## 17. Fuera de alcance del Sprint 5 (a propósito)

- Notificaciones reales (push/SMS/email) cuando cambia el estado de un
  pedido — el colaborador debe consultar `GET /pedidos/mios`.
- Que la resolución de una disputa ajuste el libro mayor — no existe
  todavía (Sprint 6); por ahora solo cambia `estado` y libera cupo si aplica.
- Un endpoint de catálogo navegable por el colaborador (para descubrir
  `suplidorId`/`menuDiaId` sin conocerlos de antemano) — hueco heredado del
  Sprint 3/4, anotado en `plan-sprints.md` para retomar en un sprint futuro,
  no corregido aquí para no ampliar el alcance de este sprint.

## 18. Sprint 6 — Nómina y libro mayor

Registro formal e inmutable de lo que le corresponde descontar a cada
colaborador. Un pedido llega a `RECIBIDO` (por confirmación, silencio, o
resolución de disputa a favor del suplidor) y automáticamente postea un
`CARGO` al libro mayor (`movimiento`), dentro de la misma transacción.
Ningún endpoint puede editar ni borrar un `movimiento` — ni siquiera a nivel
de permisos de Postgres (`REVOKE UPDATE, DELETE ... FROM almuerzo_app`,
migración 10): toda corrección es una fila nueva.

**Endpoints nuevos, todos bajo `/nomina` (RRHH/ADMIN_EMPRESA):**
- `GET /nomina/ciclos` — lista los ciclos de nómina de la empresa.
- `POST /nomina/ciclos/cerrar` — `{ periodoInicio?, periodoFin? }` (si se
  omiten, usa el período vigente hoy según `frecuencia_nomina`). Se bloquea
  con 403 si hay pedidos `ENTREGADO`/`DISPUTA` sin resolver en ese rango,
  salvo que `empresa.permite_cierre_con_pendientes` esté activo. Cerrar un
  ciclo ya cerrado también se rechaza — nunca se reabre uno.
- `POST /nomina/movimientos/ajuste` — `{ colaboradorId, tipo: 'CARGO' |
  'NOTA_CREDITO', monto, motivo }`. Corrección manual, siempre contra el
  ciclo abierto vigente en el momento de la corrección, nunca contra uno ya
  cerrado.
- `GET /nomina/plantilla-descuento` / `PUT /nomina/plantilla-descuento` —
  ver/editar qué columnas quiere la empresa en su archivo de descuento, y en
  qué orden, con etiqueta personalizada opcional por columna. Catálogo fijo
  de campos disponibles (`codigo_nomina`, `cedula`, `nombre_completo`,
  `punto_entrega`, `cantidad_pedidos`, `monto_total`,
  `subsidio_total_empresa`, `periodo_inicio`, `periodo_fin`) — nada de
  expresiones ni SQL libre desde el cliente.
- `GET /nomina/ciclos/:id/archivo-descuento` — descarga un CSV (`text/csv`)
  con exactamente esas columnas, agregando `movimiento` por colaborador
  dentro de ese ciclo.

**Decisiones de producto, resueltas con el usuario antes de construir (no
hay mockup para esta parte en este repo):** cierre bloqueado por defecto con
pendientes (configurable por empresa), cierra RRHH/ADMIN_EMPRESA, y archivo
de descuento configurable en vez de un CSV de forma fija. Ver
`plan-sprints.md`, Sprint 6, para el detalle completo — incluida la
reconciliación con el chequeo de tope de ciclo del Sprint 4 (sigue sumando
pedidos no cancelados/no-entregados en tiempo real, con un propósito
distinto al del libro mayor, que es la fuente de verdad de lo ya asentado).

**Test de este sprint:** `node test/nomina.test.js` (requiere `npm run
build` primero) — funciones puras del catálogo/CSV, que `movimiento` es
append-only de verdad (Postgres rechaza `UPDATE`/`DELETE` con
`insufficient_privilege`, no solo por convención de código), y el
comportamiento de `postearCargo` en sus tres casos (crear/reutilizar ciclo,
cobertura total sin cargo, y ciclo ya cerrado postea en el vigente hoy). El
flujo completo (bloqueo de cierre con pendientes, cierre real, plantilla
personalizada, archivo de descuento, ajuste manual) se validó end-to-end
contra la API real corriendo durante el desarrollo.

## 19. Fuera de alcance del Sprint 6 (a propósito)

- Integración directa con un sistema de nómina real — el archivo es un CSV
  para pegar a mano, no una API de otro sistema.
- Múltiples plantillas con nombre por empresa — una activa por empresa
  alcanza por ahora.
- Reapertura de un ciclo cerrado — a propósito nunca existe.
- Liquidación a suplidores (cuánto se le paga a cada suplidor, la otra mitad
  del dinero) — Sprint 7.

## 20. Sprint 7 — Liquidación a suplidores

Calcula cuánto le corresponde cobrar a cada suplidor por lo que de verdad se
entregó (`RECIBIDO`), agregando pedidos de **todas** las empresas que lo
contrataron en el período (modelo de plataforma como intermediaria) — y dos
bugs reales corregidos en el camino:

- **`contrato_suplidor.ajuste_pct` existía desde el Sprint 2 pero nunca se
  aplicaba.** `POST /pedidos` ahora consulta el contrato activo entre la
  empresa y el suplidor del pedido y ajusta cada línea antes de calcular el
  total — negativo es un descuento por volumen que el suplidor le dio a esa
  empresa; el colaborador paga ese % de menos (o de más) sobre el precio
  publicado. Pedidos ya creados no se recalculan retroactivamente.
- Un suplidor sirve a empresas con `frecuencia_nomina` distinta, así que no
  puede depender de la de ninguna en particular: `suplidor` ahora tiene su
  propia `frecuencia_liquidacion`.

**Endpoints nuevos, todos bajo `/liquidaciones`:**
- `POST /liquidaciones/calcular` (plataforma) — `{ suplidorId,
  periodoInicio?, periodoFin? }`. Se bloquea con 403 si hay pedidos
  `ENTREGADO`/`DISPUTA` de ese suplidor en el rango, salvo que
  `suplidor.permite_liquidacion_con_pendientes` esté activo. Calcula y
  congela el total — no hace falta un libro mayor separado del lado
  suplidor: un pedido `RECIBIDO` ya es terminal e inmutable, así que sumar
  en el momento del cálculo es correcto y completo.
- `GET /liquidaciones` / `GET /liquidaciones/:id` (plataforma: todos; el
  propio suplidor: los suyos, vía RLS) — lista y detalle con el desglose de
  pedidos que explican el monto (por empresa, no por colaborador — PII que
  no le corresponde ver al suplidor).
- `PATCH /liquidaciones/:id/marcar-pagado` (plataforma) — `{
  referenciaPago }`. Sin integración bancaria real: el pago ocurre fuera
  del sistema, esto solo lo registra. Un lote ya `PAGADO` no se recalcula
  ni se vuelve a pagar.

**Bugs reales encontrados y corregidos durante la verificación end-to-end**
(ver `plan-sprints.md`, Sprint 7, para el detalle completo):
1. El desglose de `GET /liquidaciones/:id` hacía `JOIN colaborador` para
   mostrar el nombre — pero esa tabla tiene RLS por `empresa_id`, invisible
   en ámbito SUPLIDOR, así que el `JOIN` vaciaba el desglose entero (mismo
   patrón que el bug de `contrato_suplidor` del Sprint 5). Corregido usando
   `empresa` en su lugar — más seguro y es la información correcta.
2. Comparar fechas `Date` de Postgres tal cual, sin pasarlas por `iso()`,
   desplazaba el rango por zona horaria y excluía pedidos que sí
   correspondían.

**Test de este sprint:** `node test/liquidaciones.test.js` (requiere `npm
run build` primero) — `aplicarAjustePct` con datos fijos, y RLS de
`lote_pago_suplidor`. El flujo completo (ajuste real de precio, agregación
cruzando empresas, bloqueo por pendientes, desglose, marcar pagado) se
validó end-to-end contra la API real corriendo durante el desarrollo.

## 21. Fuera de alcance del Sprint 7 (a propósito)

- Ajustes manuales sobre un lote ya calculado — extensión futura del mismo
  patrón que `POST /nomina/movimientos/ajuste` del Sprint 6, no se construye
  aquí sin que alguien lo pida primero.
- Integración bancaria o de pagos real.
- Recalcular retroactivamente pedidos creados antes del fix de `ajuste_pct`.

## 22. Sprint 8 — Sistema de ayuda (solo backend)

**Ajuste de alcance importante:** el plan original de este sprint (escrito
antes del Sprint 1) describía un tour visual con overlay sobre la interfaz y
una pantalla dedicada de centro de ayuda — pero este proyecto es puramente
backend, sin ningún cliente visual en este repo. Se construyó solo la API de
contenido; el tour y la pantalla quedan diferidos hasta que exista un
frontend real que los consuma. Ver `plan-sprints.md`, Sprint 8, para el
detalle de esta decisión.

**Endpoints nuevos, todos bajo `/ayuda`:**
- `GET /ayuda` (cualquier rol autenticado) — devuelve solo fichas de
  `rol_objetivo` = el rol propio, o `TODOS`. Acepta `?pantallaId=` (filtro
  exacto) y `?buscar=` (texto libre, sobre título y cuerpo).
- `POST /ayuda`, `PATCH /ayuda/:id`, `DELETE /ayuda/:id` (`SUPERADMIN`/`SOPORTE`) —
  CRUD administrativo. Editar sube `version` automáticamente.

`ayuda_contenido` no tiene RLS — es contenido de plataforma, igual para
cualquiera que comparta rol, no un dato propio de una empresa o suplidor.
En su lugar, `almuerzo_app` (el rol que usan RRHH/colaborador/suplidor)
tiene revocado `INSERT`/`UPDATE`/`DELETE` sobre esta tabla a nivel de
Postgres — solo `almuerzo_platform` (ámbito PLATAFORMA) puede escribir,
garantía real, no solo el chequeo de rol en el controlador.

`npm run seed` ahora también carga 5 fichas de ayuda reales, explicando
reglas de negocio que ya existen en el sistema: política de silencio, tope
de endeudamiento, nota de crédito tras cierre de ciclo, cómo se calcula la
liquidación a un suplidor, y por qué un menú se congela al vencer el cutoff.

**Test de este sprint:** `node test/ayuda.test.js` (requiere `npm run build`
primero) — contenido sembrado, filtro por rol, buscador, y el `REVOKE` de
permisos. El filtro por rol vía HTTP y el CRUD restringido a plataforma se
validaron end-to-end contra la API real corriendo durante el desarrollo —
sin bugs reales encontrados en este sprint.

## 23. Fuera de alcance del Sprint 8 (a propósito)

- El tour guiado con overlay y la pantalla de centro de ayuda (subsprints
  8.2/8.3 del plan original) — requieren un frontend que no existe todavía.
- Múltiples idiomas, ayuda en video, o un asistente conversacional.

## 24. Sprint 9 — Operación y lanzamiento

El roadmap original marcaba este sprint como "a definir con RRHH" — nunca
se definió hasta ahora. Decisiones resueltas con el usuario antes de
construir en `plan-sprints.md`, Sprint 9.

**Reportes nuevos, todos bajo `/reportes` (`?desde=&hasta=`, YYYY-MM-DD,
default los últimos 30 días):**
- `GET /reportes/consumo-colaborador` (RRHH/ADMIN_EMPRESA) — por
  colaborador de la propia empresa: pedidos, bruto, subsidio, a su cargo.
  **Sale de `movimiento` (el libro mayor, Sprint 6), no de `pedido`
  directo** — solo cuenta pedidos que llegaron a `RECIBIDO` (con su `CARGO`
  posteado); uno todavía `ENTREGADO`/`DISPUTA`/sin resolver no aparece
  hasta que se resuelva. Bug real corregido el 31 de julio de 2026 — la
  primera versión sí salía de `pedido` directo, contando también pedidos
  sin resolver.
- `GET /reportes/gasto-empresa` (RRHH/ADMIN_EMPRESA: la propia; plataforma:
  todas) — subsidio total, colaboradores activos, cantidad de pedidos.
  Misma fuente (`movimiento`) y misma corrección que `consumo-colaborador`.
- `GET /reportes/entregas-suplidor` (SUPLIDOR_ADMIN: lo propio; plataforma:
  todos) — pedidos por estado y tasa de disputas. Este sí sale de `pedido`
  directo (es sobre estado/disputa, no dinero).
- `GET /reportes/disputas` (RRHH/ADMIN_EMPRESA; plataforma) — por motivo y
  por a favor de quién se resolvió. También sobre `pedido` directo.

**Notificaciones por email real**, vía la API HTTP de
[Resend](https://resend.com) directa (sin SDK) — configúrala en `.env`
(`RESEND_API_KEY`, `RESEND_FROM_EMAIL`; sin esas dos, cada intento queda
registrado como `OMITIDA` en `notificacion_enviada` sin romper el request
que lo disparó). Tres disparadores: pedido `ENTREGADO`, disputa resuelta, y
lote de liquidación marcado `PAGADO` (se agregó `suplidor.email_contacto`
para poder notificarlo). `GET /notificaciones` (solo plataforma) audita
cada intento.

**Observabilidad y endurecimiento básico, sin servicios de pago:**
- `helmet` — headers de seguridad estándar en todas las respuestas.
- `@nestjs/throttler` en `/auth/login` únicamente — 5 intentos por minuto
  por IP, responde `429` al superarlo.
- Logging estructurado de cada request (método, ruta, status, duración) a
  stdout — Render lo captura por defecto, sin servicio externo.
- La API falla rápido al arrancar, con un mensaje claro, si falta
  `DATABASE_URL`, `MIGRATE_DATABASE_URL`, `PLATFORM_DATABASE_URL` o
  `JWT_SECRET` — en vez de fallar a medias en el primer request que las
  necesite.

**Test de este sprint:** `node test/reportes.test.js` y `node
test/notificaciones.test.js` (requieren `npm run build` primero). El flujo
completo — los cuatro reportes con datos reales, el disparador de
notificación al entregar un pedido, los headers de `helmet`, y el `429`
del rate limiting — se validó end-to-end contra la API real corriendo
durante el desarrollo.

### Desplegar a Render

**La guía completa, paso a paso, está en [`GUIA-DESPLIEGUE.md`](GUIA-DESPLIEGUE.md).**
Se separó de este README en el Sprint 20, cuando el despliegue dejó de ser
una nota pendiente y pasó a ser un procedimiento real: dos servicios (API y
frontend), migraciones automáticas en cada arranque, y una forma de crear el
primer administrador sin sembrar datos de demo.

Lo que hay que saber en una línea: el proyecto ya está en GitHub
(`https://github.com/julloa1722/almuerzo-api`), `render.yaml` describe los dos
servicios, y Render los levanta desde un solo blueprint. Las credenciales
reales se cargan en el dashboard de Render, nunca en el repositorio.

> La versión anterior de esta sección decía que el despliegue estaba bloqueado
> porque el proyecto no era un repositorio git. Eso se resolvió el 16 de
> septiembre de 2026.

## 25. Fuera de alcance del Sprint 9 (a propósito)

- Notificaciones por SMS o push — solo email, por presupuesto.
- Reintentos automáticos de notificaciones fallidas — se registran para
  revisión manual, sin cola ni cron.
- Dashboards de observabilidad o servicios de pago (Sentry, New Relic,
  Grafana) — logging básico a stdout.
- CI/CD con tests automáticos en cada push.
- El despliegue real a Render en sí — preparado (`render.yaml` + esta
  guía), pendiente de que confirmes el prerrequisito de git/GitHub.

## 26. Sprint 10 — Frontend: app del colaborador

Primer cliente real de esta API, no otro mockup — vive en `frontend/`
(Vite + React 18 + TypeScript + Tailwind + TanStack Query + React Router).
Empieza por el rol colaborador; suplidor/RRHH/back office quedan para
sprints de frontend futuros, mismo stack. Detalle completo, incluidas las
5 discrepancias reales encontradas contra el mockup original, en
`plan-sprints.md`, Sprint 10.

**Para correrlo, con la API ya corriendo** (`npm run start:dev` en la raíz
del proyecto):

```bash
cd frontend
npm install
cp .env.example .env    # ajusta VITE_API_URL si tu API no está en :3000
npm run dev
```

Abre `http://localhost:5176`. Entra con `ana.ramirez@futuroars.demo` /
`colaborador123456` — el mismo usuario de prueba del Sprint 4.

**Dos cambios chicos en el backend, solo para este sprint:**
- `app.enableCors()` en `src/main.ts`, acotado a `CORS_ORIGENES` (`.env`,
  default `http://localhost:5176`).
- `GET /pedidos/consumo-ciclo` (`COLABORADOR`) — el consumo del período de
  nómina vigente y el tope efectivo, para el medidor de progreso.

## 27. Fuera de alcance del Sprint 10 (a propósito)

- Los otros 3 roles (suplidor, RRHH, back office) — sprints de frontend
  futuros, mismo stack.
- El botón "Reclamar" sobre un pedido `RECIBIDO` — el backend no lo
  soporta hoy.
- Un endpoint de previsualización de pedido y un endpoint `/me` para el
  colaborador — no existen; ver "Notas de implementación" en
  `plan-sprints.md`, Sprint 10, para cómo se resolvió sin ellos.
- Responsive/PWA, notificaciones push del navegador, modo oscuro,
  despliegue real del frontend.
