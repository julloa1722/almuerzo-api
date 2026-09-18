# Plan de sprints — Plataforma de almuerzo corporativo

Documento vivo. Cada sprint se desarrolla y se congela solo después de tu confirmación explícita.
Los sprints 2 en adelante aparecen aquí solo como título y objetivo — se detallan uno a la vez.

**Regla de avance:** cada sprint cierra con un entregable concreto y probable por ti — no una lista de
tareas hechas, sino algo que puedes ejecutar y verificar con tus propias manos (un endpoint que responde,
una pantalla que funciona, un flujo que corre de principio a fin). No paso al siguiente sprint hasta que
confirmes explícitamente que el entregable cumple. Si algo falla en tu prueba, se corrige dentro del mismo
sprint antes de continuar.

## Gaps identificados, sin cubrir (agregado el 31 de julio de 2026, por criterio de `EXPERTO.md`)

Referencia concreta de cobertura funcional: la comparación contra Fripick de
la conversación de diseño original, más lo ya identificado como faltante
más allá de eso. Ninguno de estos está construido ni tiene sprint asignado
todavía — se listan aquí para no perseguirlos en silencio ni perderlos de
vista, no para resolverlos ya.

- ~~**Recuperación de contraseña e invitación por correo.**~~ **✅
  Resuelto en los Sprints 18 y 19** (6 de agosto de 2026) — invitación
  por email (`src/invitaciones/`) y recuperación de contraseña
  (`POST /auth/olvide-password` / `restablecer-password`). Se deja
  tachado en vez de borrado, mismo criterio que el gap de
  `programa_beneficio` abajo.
- **Cumplimiento fiscal dominicano (NCF, ITBIS, 606/607).** El sistema
  calcula montos de dinero (`total_bruto`, `subsidio_empresa`, liquidaciones
  a suplidores) pero no emite ni registra Números de Comprobante Fiscal, no
  desglosa ITBIS en ningún monto, y no genera los formatos 606/607 que la
  DGII espera de una plataforma que factura. Relevante en cuanto haya
  transacciones reales, no de prueba.
- **Ley 172-13 (protección de datos personales, República Dominicana).**
  El sistema guarda cédulas, salarios de referencia, y direcciones de email
  de personas reales, sin política de retención, sin mecanismo de solicitud
  de borrado, y sin documentación de qué se recolecta ni por qué. `CLAUDE.md`
  dice "sin restricciones regulatorias de salud" — pero protección de datos
  personales es una regulación distinta, y esta sí aplicaría con datos reales.
- **Control de versiones real (git).** Ya rastreado — ver Sprint 9,
  bloqueado en esta máquina, sustituido por `CHANGELOG.md` + `versiones/`.
- **Despliegue real.** Ya rastreado — Sprint 9.4, bloqueado por lo mismo.
- ~~**Sin CRUD de `programa_beneficio`.**~~ **✅ Resuelto en el Sprint 12**
  (4 de agosto de 2026) — `src/nomina/programas.controller.ts`. Se deja
  tachado en vez de borrado, para que quede constancia de que este gap se
  identificó y se cerró, no que nunca existió.
- **Centro de costo / departamento / turno por colaborador.** Agregado el
  5 de agosto de 2026, a pedido del usuario (`nuevo_contrato.md`) — no
  existe ningún campo para esto en `colaborador` hoy. Anotado para no
  perseguirlo sin un caso de negocio real que lo pida primero (regla de
  configurabilidad de `EXPERTO.md`).
- **Límite de subsidio configurable por colaborador individual, no solo
  por empresa completa.** Agregado el 5 de agosto de 2026, a pedido del
  usuario (`nuevo_contrato.md`) — hoy todos los colaboradores asignados al
  mismo `programa_beneficio` comparten exactamente los mismos topes; no
  hay forma de darle a un colaborador específico un tope distinto al resto
  de su empresa. Anotado, no construido.

---

## Mapa completo de sprints

| Sprint | Nombre | Objetivo | Mockup de referencia |
|---|---|---|---|
| **1** | Fundación técnica e identidad | Repo, infraestructura base, modelo de datos núcleo, autenticación y roles | — (no visual, es la base) |
| 2 | Back office: empresas y contratos | Alta de empresa, carga CSV de colaboradores, contrato con suplidores | `portal-backoffice-onboarding.html` — ✅ confirmado |
| 3 | Catálogo y menú del suplidor | Catálogo con fotos, plantilla semanal, publicación y congelamiento | `portal-suplidor-menu.html` — ✅ confirmado |
| 4 | Motor de pedidos | Elegibilidad, cutoff, cálculo de subsidio, carrito, confirmación | `mockup-plataforma-almuerzo.html` (colaborador) — ✅ confirmado |
| 5 | Entrega, disputas y política de silencio | Código de retiro, confirmación de recepción, disputa con motivo, resolución | `mockup-plataforma-almuerzo.html` (suplidor + disputa) — ✅ confirmado |
| 6 | Nómina y libro mayor | Ciclos, movimientos append-only, archivo de descuento configurable, cierre | `mockup-plataforma-almuerzo.html` (RRHH) — ✅ confirmado |
| 7 | Liquidación a suplidores | Cálculo de liquidación, modelo agente/intermediario, pago por lotes | `mockup-plataforma-almuerzo.html` (suplidor · liquidación) — ✅ confirmado |
| 8 | Sistema de ayuda y recorrido guiado | Solo el backend (API de contenido); tour visual y centro de ayuda diferidos hasta que exista un frontend | — (✅ confirmado) |
| 9 | Operación y lanzamiento | Reportes, notificaciones por email, observabilidad/endurecimiento básico, despliegue real a Render | — (✅ subsprints 9.1–9.3 confirmados; 9.4 (despliegue real) pendiente — bloqueado por falta de git) |
| 10 | Frontend — app del colaborador | Primer cliente real: React + TS + Vite sobre la API ya construida, empezando por el rol colaborador | `mockup-plataforma-almuerzo.html` (vista colaborador) — ✅ confirmado (31 de julio de 2026, probado en navegador por el usuario) |
| 11 | Frontend — portal del suplidor | Catálogo, plantilla semanal, calendario/publicación, y preparación/entrega de pedidos (hoy solo por curl) | `portal-suplidor-menu.html` — ✅ confirmado (3 de agosto de 2026) |
| 12 | Frontend — panel de RRHH | Disputas, ciclos y libro mayor, archivo de descuento, y CRUD de `programa_beneficio`/asignación (gap real cerrado aquí) | `mockup-plataforma-almuerzo.html` (pestaña `vRRHH`) — ✅ confirmado (4 de agosto de 2026) |
| 13 | Frontend — panel de back office | Alta de empresa, carga de CSV de colaboradores, contratos con suplidores — hoy solo por curl (backend del Sprint 2) | `portal-backoffice-onboarding.html` — ✅ confirmado (5 de agosto de 2026) |
| 14 | Dashboard de plataforma | Panel de métricas (GMV, comisión de plataforma, aporte de empresas, cobertura de menú, pedidos por estado) más trazabilidad de pedidos (`pedido_evento`) | `mockup-plataforma-almuerzo.html` (pestañas `vPlat`/`vLog`) — ✅ confirmado (6 de agosto de 2026) |
| 15 | Sprint final — recorrido de extremo a extremo | `RECORRIDO-FINAL.md`: un período completo de nómina, todos los roles, cierre y liquidación incluidos | — ✅ confirmado (6 de agosto de 2026) |
| 16 | Autoservicio de RRHH: carga de colaboradores | RRHH sube su propio CSV sin depender de back office, mismo motor de validación ya construido | — (backend puro, sin mockup nuevo) — ✅ confirmado (5 de agosto de 2026) |
| 17 | Relación comercial suplidor-empresa | Suplidor solicita vinculación con una empresa existente (queda `PENDIENTE` hasta aprobación), y registra leads de empresas que no están en la plataforma | — (sin mockup, decisiones de negocio nuevas del 5 de agosto de 2026) — ✅ confirmado (6 de agosto de 2026) |
| 18 | Invitación de usuarios | Cierra el gap real de crear `membresia` — back office invita RRHH/suplidores, RRHH invita colaboradores ya cargados sin login | — (sin mockup, gap confirmado al construir el Sprint 15) — ✅ confirmado (6 de agosto de 2026) |
| 19 | Recuperación de contraseña y resumen por rol | La otra mitad del gap del Sprint 18, más una pestaña "Resumen" para RRHH y suplidor, y una sección de resumen para el colaborador | — (sin mockup, pedido del usuario el 6 de agosto de 2026) — construido, pendiente de confirmación |

El orden respeta la dependencia real: no tiene sentido construir pedidos (sprint 4) antes de tener empresas y colaboradores reales (sprint 2), ni nómina (sprint 6) antes de tener pedidos que generen movimientos.

---

## Sprint 1 — Fundación técnica e identidad ✅ CONFIRMADO

**Estado: cerrado y verificado.** Construido, corrido contra Postgres real (Neon),
y confirmado por el usuario en su propia máquina (Windows + Neon) el 28 de julio
de 2026. Los tres criterios de cierre pasaron:
`npm run migrate` sin errores, `npm run smoke` (6/6), `npm run test` (5/5).

Bugs reales encontrados y corregidos durante este sprint (no cosméticos):
- Conexión de ejemplo apuntaba a un superusuario, lo que habría hecho que el
  test de RLS "pasara" sin probar nada — se separó `DATABASE_URL` (rol sin
  privilegios) de `MIGRATE_DATABASE_URL` (superusuario, solo para migraciones/seed).
- Vulnerabilidad moderada real en NestJS 10 (`npm audit`) — actualizado a NestJS 11.
- `INSERT ... SELECT ... WHERE NOT EXISTS` en el seed confundía el inferidor de
  tipos de Postgres — simplificado a dos consultas directas.
- BIGINT llega como string desde `pg`, rompía la comparación al seleccionar
  ámbito — corregido globalmente en `src/common/pg-tipos.ts`.
- El test estaba escrito para `jest` pero era un script plano — corregido a
  `node test/tenant-isolation.test.js`.
- El smoke test usaba `bash`, que no existe de forma nativa en Windows —
  reescrito en Node puro con `fetch` (`scripts/smoke-test.js`).

**Objetivo:** que exista un backend real, con base de datos, aislamiento por empresa a nivel de motor, y un sistema de login funcional — sin todavía una sola pantalla de negocio. Es el sprint menos visible y más fácil de subestimar.

**Criterio de cierre del sprint:** un desarrollador nuevo puede clonar el repo, levantar la base con `docker compose up`, correr las migraciones, crear un usuario por script, iniciar sesión vía API y recibir un JWT con sus membresías — todo sin tocar código.

---

### Subsprint 1.1 — Repositorio, infraestructura local y CI

**Tareas:**
- Monorepo NestJS con estructura de módulos: `auth`, `identidad`, `catalogo`, `pedidos`, `elegibilidad`, `finanzas`, `nomina`, `reportes` (módulos vacíos, solo el esqueleto).
- `docker-compose.yml` con PostgreSQL 16 y Redis.
- Migraciones con un ORM que soporte SQL crudo cuando haga falta (Prisma o Kysely — a decidir en esta subsprint, no antes).
- Linter, formateador y hooks de pre-commit.
- Pipeline de CI: build, lint, tests unitarios en cada push.
- Variables de entorno documentadas en `.env.example`, nunca committeadas con valores reales.

**Entregable verificable:** `docker compose up` levanta la base y el API responde `200` en un endpoint de salud (`/health`).

---

### Subsprint 1.2 — Modelo de datos núcleo y aislamiento por tenant

**Tareas:**
- Tablas: `empresa`, `usuario`, `membresia`, `colaborador`, `suplidor`, `punto_entrega`.
- Row Level Security activado sobre toda tabla con `empresa_id`, siguiendo el patrón ya validado:
  ```sql
  CREATE POLICY tenant_aislado ON <tabla>
    USING (empresa_id = current_setting('app.empresa_id')::bigint);
  ```
- Política equivalente para `suplidor_id` en las tablas que le pertenecen al suplidor — este es el pendiente que quedó marcado en la conversación de diseño y se cierra aquí, no después.
- Interceptor de NestJS que ejecuta `SET LOCAL app.empresa_id` / `app.suplidor_id` al inicio de cada transacción según el token.
- Extensión `btree_gist` habilitada, para la restricción de vigencias no solapadas que usará `asignacion_programa` más adelante.
- Semilla de datos (`seed`) con las mismas empresas, colaboradores y suplidores que ya existen en los mockups — así el backend real y los prototipos hablan de las mismas personas cuando los comparemos.

**Entregable verificable:** un test de integración que crea dos empresas, inserta datos en ambas, y demuestra que una consulta con `app.empresa_id` fijado en la empresa A nunca devuelve filas de la empresa B — ni con un `SELECT *` sin `WHERE`.

---

### Subsprint 1.3 — Autenticación, membresías y roles

**Tareas:**
- Registro y login con correo/teléfono + contraseña, hash con Argon2.
- Emisión de JWT de corta duración + refresh token.
- El JWT incluye `usuario_id` y la lista de membresías (`ambito_tipo`, `ambito_id`, `rol`).
- Endpoint para "entrar a un ámbito": si el usuario tiene más de una membresía (ej. RRHH de dos empresas), elige con cuál sesión trabaja; ese valor alimenta el interceptor de RLS de la subsprint 1.2.
- Roles mínimos implementados: `SUPERADMIN`, `SOPORTE`, `ADMIN_EMPRESA`, `RRHH`, `COLABORADOR`, `SUPLIDOR_ADMIN`, `DESPACHO`.
- Guard de autorización por rol + ámbito, reusable en cualquier endpoint futuro.
- OTP por correo o SMS como alternativa de login — no reemplaza la contraseña en este sprint, pero se deja el modelo de datos listo (tabla `otp_codigo`) para no tener que migrar después. Ya identificamos el login roto como el problema #1 de la competencia; vale la pena no dejarlo para el final.

**Entregable verificable:** un usuario con dos membresías (RRHH en empresa A, colaborador en empresa B) puede autenticarse una sola vez y elegir el ámbito; las llamadas subsecuentes a la API quedan correctamente aisladas según el ámbito elegido.

---

### Fuera de alcance de este sprint (a propósito)

- Cualquier pantalla de negocio (catálogo, pedidos, nómina) — eso empieza en el sprint 2.
- Notificaciones push — no hay nada que notificar todavía.
- Integración bancaria o de pagos — corresponde al sprint 7.
- Multi-beneficio real — el campo `tipo` en `programa_beneficio` se agrega en el sprint donde se cree esa tabla (sprint 4), no aquí.

---

## Sprint 2 — Back office: empresas, colaboradores y contratos ✅ CONFIRMADO

**Estado: cerrado y verificado.** Construido, corrido contra Postgres real (Neon),
y confirmado por el usuario en su propia máquina el 28 de julio de 2026.
Nota de proceso: este sprint se construyó antes de documentar su desglose aquí
— se corrige el orden a partir de ahora; esta sección se escribió después,
reflejando con exactitud lo que se construyó y probó, no un plan idealizado.

**Objetivo:** que exista una forma real (vía API) de dar de alta empresas,
cargar sus colaboradores desde un CSV con validación fila por fila, y
gestionar qué suplidores le sirven a cada una con qué ajuste de precio —
el equivalente en backend de `portal-backoffice-onboarding.html`.

**Criterio de cierre:** `npm run migrate` aplica la migración 4 sin errores,
y `node test/back-office.test.js` pasa sus 8 verificaciones contra la base real.

### Subsprint 2.1 — El rol de plataforma

El back office es intrínsecamente cruza-empresas: quien lo usa necesita ver
todas las empresas, no una sola — exactamente lo opuesto de lo que RRHH o un
colaborador necesitan. Eso no se resuelve reutilizando `almuerzo_app` (que
por diseño no ve nada sin un `empresa_id` fijado), sino con un segundo rol,
`almuerzo_platform`, que sí tiene `BYPASSRLS` — pero nada más: ni `CREATEROLE`,
ni `CREATEDB`, ni superusuario. Su uso queda restringido en código a requests
cuyo JWT ya pasó por `RolesGuard` con rol `SUPERADMIN` o `SOPORTE` en ámbito
`PLATAFORMA`. El interceptor de tenant ahora elige el pool correcto según el
ámbito del token, no solo el GUC.

### Subsprint 2.2 — Alta de empresa y carga de colaboradores

Endpoints `POST /back-office/empresas` y `GET /back-office/empresas`. La carga
de colaboradores soporta las dos formas de envío que se definieron para este
sprint — archivo real (`multipart/form-data`) y texto plano
(`{ "csv": "..." }`) — con un flujo de dos pasos: `preview` (valida, no escribe
nada) e `importar` (inserta solo las filas sin error). Las reglas de validación
son las mismas que se probaron visualmente en el mockup: código de nómina y
cédula obligatorios y únicos dentro del archivo, cédula con formato válido,
nombre obligatorio, y punto de entrega desconocido como **alerta**, no error.

### Subsprint 2.3 — Contratos con suplidores

Tabla `contrato_suplidor`, con RLS por empresa (para cuando RRHH necesite
consultar sus propios contratos más adelante) y gestión completa desde el
back office: crear, editar el ajuste de precio, activar/desactivar.

### Bugs reales encontrados y corregidos durante este sprint

- **Índice único que no evitaba duplicados.** La `UNIQUE` de `membresia`
  incluye `ambito_id`, que es `NULL` para membresías de ámbito `PLATAFORMA`
  — y Postgres trata cada `NULL` como distinto de cualquier otro en un índice
  único, así que `ON CONFLICT` nunca disparaba. Cada re-siembra habría creado
  una membresía de `SUPERADMIN` duplicada. Se corrigió con un índice único
  parcial (`WHERE ambito_tipo = 'PLATAFORMA'`) y se confirmó corriendo el seed
  dos veces seguidas sin duplicar.
- **Multer 1.x deprecado por vulnerabilidades reales, parchadas en 2.x.**
  Detectado por el propio warning de `npm install` en la máquina del usuario
  (no apareció en el sandbox de desarrollo). Se verificó que NestJS 11 no
  declara una versión de multer como peer dependency, se actualizó a `2.2.0`,
  y se re-verificó el flujo completo de subida de archivo — funciona idéntico.
- **`package.json` editado en el entorno de desarrollo no llegó al usuario**
  en un primer intento — quedó como recordatorio de proceso: cualquier cambio
  de dependencias debe entregarse como proyecto completo para descargar, no
  como una instrucción de "cambia esta línea", para evitar desincronización.

### Fuera de alcance de este sprint (a propósito)

Ninguna pantalla — son solo endpoints. El portal visual del back office se
construye cuando el proyecto tenga un frontend, que no es parte de estos
sprints de backend.

---

## Sprint 3 — Catálogo y menú del suplidor ✅ CONFIRMADO

**Estado: cerrado y verificado.** Construido, corrido contra Postgres real
(Neon), y confirmado por el usuario en su propia máquina el 29 de julio de
2026 — las 12 pruebas de `test/catalogo.test.js` en verde, incluida la de
fuga de RLS por `suplidor_id`. A diferencia de los sprints anteriores, no
apareció ningún bug real durante la construcción de este — el único ajuste
fue de diseño consciente, no una corrección: se decidió calcular
PUBLICADO/CONGELADO al vuelo contra el reloj real en vez de guardarlo en una
columna, evitando que dependiera de un job en segundo plano para no
desincronizarse.

**Objetivo:** que el suplidor pueda mantener su catálogo de platos, definir una
plantilla semanal de rotación, y publicar el menú de los próximos días — que
se congele automáticamente al vencer el cutoff de cada fecha. Backend real de
`portal-suplidor-menu.html`.

**Criterio de cierre:** un test de integración confirma que (a) publicar
genera `menu_dia` solo para fechas hábiles futuras según la plantilla correcta
por semana de rotación, (b) un día se congela solo después de vencer su
cutoff, y (c) el rol `SUPLIDOR_ADMIN` de un suplidor no puede ver ni tocar el
catálogo de otro — RLS por `suplidor_id`, el pendiente que quedó marcado desde
la conversación de diseño original.

### Subsprint 3.1 — Catálogo y ruta de servicio

Tablas `producto` (con `etiquetas` en JSONB para alérgenos/dietas, como se
definió en el diseño) y `ruta_servicio` (qué suplidor sirve a qué punto de
entrega, con su hora de cutoff y días de anticipación). RLS por `suplidor_id`
en ambas, reutilizando el mismo pool `almuerzo_app` y el mismo interceptor del
Sprint 1 — no hace falta un tercer rol de base de datos, porque el interceptor
ya sabía fijar `app.suplidor_id` desde que se escribió, solo que hasta ahora
ninguna tabla lo usaba.

### Subsprint 3.2 — Plantilla semanal

Tablas `plantilla_menu` y `plantilla_item` (día de la semana → productos con
precio y cupo). Se denormaliza `suplidor_id` también en `plantilla_item` — es
redundante con el que ya tiene `plantilla_menu`, pero evita que la política de
RLS dependa de un `EXISTS` con subconsulta, a cambio de mantener ese campo
sincronizado en cada insert. Decisión documentada, no accidental.

### Subsprint 3.3 — Publicación y congelamiento de `menu_dia`

El motor que aplica la plantilla a las próximas fechas hábiles, respetando la
rotación de semana (par/impar, por número de semana ISO — igual que en el
mockup) y el cutoff de cada `ruta_servicio`. Un día pasa de `PUBLICADO` a
`CONGELADO` automáticamente al vencer su cutoff; a partir de ahí, precio y
cupo dejan de poder editarse.

### Fuera de alcance de este sprint (a propósito)

- Fotos reales (CDN, recorte, tamaños) — `producto.imagen_url` queda como un
  campo de texto simple por ahora; la subida real de imágenes es trabajo de
  infraestructura de archivos que no aporta a validar la lógica de negocio.
- Aprobación del menú por la empresa (`EN_REVISION`) — mencionado como
  configurable en el diseño original, pero no se construye hasta que haya un
  cliente real que lo pida.
- Que el colaborador o RRHH vean este menú — eso es el Sprint 4 (motor de
  pedidos), que consume estas tablas pero desde el lado de la empresa.

---

## Sprint 4 — Motor de pedidos ✅ CONFIRMADO

**Estado: cerrado y verificado.** Construido y probado desde su momento
original; nunca se confirmó explícitamente por sí solo, pero se ejercitó de
punta a punta indirectamente a través de los Sprints 5, 6 y 7 (que dependen
de él) — el usuario lo confirmó formalmente el 30 de julio de 2026, junto
con la construcción del endpoint de descubrimiento de menú (ver más abajo).

**Objetivo:** que un colaborador pueda pedir su almuerzo del menú ya publicado
por el suplidor (Sprint 3), con el motor de elegibilidad completo — cutoff,
cupo, subsidio, topes — y que quede rechazado con un mensaje claro cuando
corresponda. Backend real de la vista Colaborador de `mockup-plataforma-almuerzo.html`.

**Decisión de secuencia, resuelta antes de construir:** el tope de ciclo del
colaborador necesita saber cuánto ha consumido, pero el libro mayor formal
(`movimiento`, `ciclo_nomina`) es el Sprint 6 — no puede adelantarse sin romper
el orden que ya definimos (nómina depende de pedidos ya resueltos, no al
revés). Para este sprint, el consumo del período se calcula sumando
directamente `monto_colaborador` de los pedidos activos del colaborador cuya
`fecha_servicio` cae en el período actual (calculado por fecha, según la
`frecuencia_nomina` de la empresa) — sin tabla de ciclo todavía. El Sprint 6
introduce el libro mayor formal, que en ese momento reconcilia este cálculo
ad-hoc con asientos inmutables reales.

**Criterio de cierre:** un test de integración confirma que el motor de
elegibilidad bloquea cada caso de la tabla de reglas original (cutoff vencido,
cupo agotado, tope diario, tope de ciclo, límite de endeudamiento, pedido
duplicado), y que un pedido válido calcula el desglose de subsidio
correctamente.

### Subsprint 4.1 — Programa de beneficio y asignación

Tablas `programa_beneficio` (con el campo `tipo` desde el día uno, per la
decisión de extensibilidad multi-beneficio ya tomada) y `asignacion_programa`,
con la restricción `EXCLUDE` vía `btree_gist` para que un colaborador no tenga
dos programas vigentes solapados — la misma que se documentó en el diseño
original. RLS por `empresa_id` en ambas.

### Subsprint 4.2 — Motor de elegibilidad

Puerto directo de las 6 validaciones de la sección 3.2 del documento de diseño
original, como funciones puras donde es posible (cálculo de subsidio, chequeo
de tope) y con acceso a datos donde hace falta (cupo, duplicados). La creación
del pedido corre dentro de una transacción con `SELECT ... FOR UPDATE` sobre
`menu_dia`, para que dos colaboradores no puedan tomar el mismo último cupo a
la vez — la condición de carrera que ya identificamos como riesgo en el
diseño original.

### Subsprint 4.3 — Endpoints del colaborador

Crear pedido, cancelar (antes del cutoff), y listar "mis pedidos" — ámbito
EMPRESA, rol COLABORADOR. A diferencia de RRHH (que ve todos los pedidos de
su empresa vía RLS), un colaborador solo debe ver los suyos — eso RLS no lo
distingue por rol, así que se refuerza en la capa de aplicación con un filtro
adicional por su propio `colaborador_id`.

### Fuera de alcance de este sprint (a propósito)

- Confirmación de entrega, disputas, política de silencio — Sprint 5.
- El libro mayor y el cierre de ciclo — Sprint 6, como se explicó arriba.
- Que el suplidor vea la lista de preparación derivada de estos pedidos — Sprint 5.

### Bug de arquitectura real, encontrado al probar el flujo completo

Un colaborador pide bajo ámbito `EMPRESA` — su transacción nunca fija
`app.suplidor_id`. La política de RLS del Sprint 3 (aislamiento por suplidor)
bloqueaba por completo la lectura del menú para **cualquier** colaborador de
**cualquier** empresa: RLS falla cerrado, así que sin `app.suplidor_id`
fijado, ninguna fila era visible. La migración 7 agrega políticas permisivas
adicionales — Postgres las combina con `OR` cuando son del mismo tipo — que
habilitan lectura, y el descuento de cupo, únicamente para empresas con un
`contrato_suplidor` **activo** con ese suplidor. Sin contrato, sigue sin ver
nada. Se documentó también la limitación honesta: la política de `UPDATE`
sobre `menu_dia` no restringe a nivel de base de datos qué columna se toca
(podría, en teoría, alterar precio en vez de solo cupo) — eso lo garantiza que
el código de la aplicación arme un único `UPDATE` fijo, igual que en el resto
del sistema.

### Segundo bug real, encontrado el 29 de julio de 2026 al diseñar el Sprint 7

`contrato_suplidor.ajuste_pct` existe desde el Sprint 2 (rango ±25%, pensado
para el ajuste de precio negociado entre una empresa y un suplidor
específicos) pero **nunca se aplicó en ningún cálculo** — `crearPedido`
siempre usó `menu_dia.precio` tal cual, sin tocar el contrato. Confirmado
con el usuario al diseñar el Sprint 7: un `ajuste_pct` negativo es un
descuento por volumen que el suplidor le dio a esa empresa (el colaborador
paga el precio del menú con ese % de menos que el precio publicado; 0% =
precio exacto publicado, sin ajuste). Se corrige aquí — `crearPedido` ahora
consulta `contrato_suplidor.ajuste_pct` (empresa↔suplidor del pedido) y lo
aplica a cada línea antes de calcular `bruto`. Pedidos ya creados **no** se
recalculan retroactivamente (`RECIBIDO` es terminal e inmutable por diseño;
tocar datos ya escritos en un proyecto sin ese hábito sería más riesgoso que
útil) — el fix aplica hacia adelante, a pedidos nuevos.

---

## Sprint 5 — Entrega, disputas y política de silencio ✅ CONFIRMADO

**Estado: cerrado y verificado.** Construido, corrido contra Postgres real
(Neon) incluido un flujo end-to-end real vía HTTP contra la API corriendo,
y confirmado por el usuario en su propia máquina el 29 de julio de 2026.

**Objetivo:** que el pedido avance desde `CONFIRMADO` hasta `RECIBIDO` (o
`DISPUTA`) reflejando lo que pasa en la vida real: el suplidor prepara y
entrega, el colaborador confirma o reclama, y si nadie confirma a tiempo, la
política de silencio de la empresa decide qué pasa. Backend real de la vista
Suplidor (lista de preparación) y del flujo de disputa con motivo de
`mockup-plataforma-almuerzo.html`.

**Principio heredado del Sprint 3, aplicado aquí de nuevo:** ninguna
transición se guarda por un job en segundo plano. `CONFIRMADO → EN_PREPARACION`
(al vencer el cutoff) y la política de silencio (`ENTREGADO → RECIBIDO` o
`ENTREGADO → DISPUTA`, al vencer la ventana de confirmación) se aplican de
forma perezosa: se calculan y persisten la primera vez que un endpoint
relevante toca esos pedidos, no por un cron. Esto mantiene la misma filosofía
de `menu_dia` — ver Sprint 3 — en vez de introducir infraestructura de
scheduling que este proyecto todavía no necesita.

**Criterio de cierre:** un test de integración confirma las cinco
transiciones de estado (`CONFIRMADO→EN_PREPARACION→ENTREGADO→RECIBIDO`, y la
rama `ENTREGADO→DISPUTA`), que la política de silencio configurable por
programa produce el resultado correcto en cada modo, y que un suplidor no
puede tocar pedidos de una empresa con la que no tiene contrato activo — el
mismo patrón de RLS cruzado del Sprint 4, ahora en la dirección contraria.

### Subsprint 5.1 — Configuración de política de silencio

Se agrega `politica_silencio` (`AUTO_CONFIRMA` | `AUTO_DISPUTA`) y
`horas_ventana_confirmacion` a `programa_beneficio` — es una regla del
beneficio, no una tabla nueva. Función pura para calcular si una ventana ya
venció, junto a las de `calendario.util.ts`.

### Subsprint 5.2 — RLS cruzado en la dirección del suplidor

El Sprint 4 resolvió que una empresa contratada pueda leer el menú de su
suplidor. Este sprint necesita lo inverso: que un suplidor pueda **escribir**
sobre pedidos que pertenecen a la tabla `pedido` (aislada por `empresa_id`),
para marcarlos `ENTREGADO`. Mismo mecanismo que `migrations/0007`: una
política permisiva adicional en `pedido`, condicionada a que exista un
`contrato_suplidor` activo entre el `suplidor_id` del pedido y la
`empresa_id` dueña de la fila.

### Subsprint 5.3 — Endpoints del suplidor: lista de preparación y escaneo

`GET /pedidos/preparacion` (agrupado por punto de entrega, con el consolidado
de platos a cocinar — igual que en el mockup) y `PATCH /pedidos/:id/entregar`
(valida el `codigo_retiro`, marca `ENTREGADO` con marca de tiempo).

### Subsprint 5.4 — Endpoints del colaborador: confirmar y disputar

`PATCH /pedidos/:id/confirmar-recibido` y `PATCH /pedidos/:id/disputar`, con
los mismos 5 motivos que se definieron en el mockup (`NO_LLEGO`,
`INCOMPLETO`, `EQUIVOCADO`, `CALIDAD`, `OTRO`) más nota opcional.

### Subsprint 5.5 — Resolución de disputas (RRHH)

`GET /pedidos/disputas` y `PATCH /pedidos/:id/resolver-disputa`
(`aFavorColaborador: boolean`). A favor del colaborador → `NO_ENTREGADO`
(sin cargo — el Sprint 6 decide qué hacer si el ciclo ya cerró). A favor del
suplidor → vuelve a `RECIBIDO`.

### Fuera de alcance de este sprint (a propósito)

- El cargo real en el libro mayor cuando un pedido llega a `RECIBIDO` —
  Sprint 6. Este sprint solo deja el pedido en el estado correcto; de dónde
  sale el descuento de nómina se resuelve cuando exista el libro mayor.
- Notificaciones push al colaborador ("tu pedido está en camino", "confirma
  tu entrega") — Sprint 9 (Operación).

### Notas de implementación, resueltas antes de escribir código

Puntos que esta sección no fijaba del todo y se resuelven aquí para no
dejarlos implícitos:

- **`pedido` no guarda hoy `programa_id`.** Sin eso, no hay forma de saber
  qué `politica_silencio`/`horas_ventana_confirmacion` aplican a un pedido ya
  entregado (la `asignacion_programa` del colaborador puede cambiar después).
  Se agrega `pedido.programa_id` en la migración 8, fijado en `POST /pedidos`
  igual que `subsidio_empresa`/`monto_colaborador` — un valor que se congela
  al crear el pedido, no que se recalcula después.
- **Resolución perezosa = un solo `UPDATE ... FROM ... WHERE` por request**,
  no un loop en JS por pedido. Se ejecuta al inicio de cualquier endpoint que
  liste o toque pedidos (`GET /pedidos/mios`, `GET /pedidos`, `GET
  /pedidos/disputas`, `GET /pedidos/preparacion`, y antes de
  `confirmar-recibido`/`disputar`/`resolver-disputa`), acotado por RLS de la
  misma transacción — así nunca hace falta decidir "cuál" endpoint es el que
  dispara la resolución, todos la disparan igual.
- **RLS del suplidor sobre `pedido`/`pedido_linea`:** predicado exacto —
  `suplidor_id` de la fila = GUC `app.suplidor_id` **y** existe
  `contrato_suplidor` activo entre ese suplidor y la `empresa_id` de la fila
  (no alcanza con el `suplidor_id` de la fila solo, porque una tabla sin ese
  segundo chequeo permitiría escribir en pedidos de una empresa cuyo contrato
  ya se desactivó después de creado el pedido).
- **`PATCH /pedidos/:id/no-entregado`** (suplidor marca que el colaborador no
  se presentó): no estaba listado explícitamente arriba, pero el `CHECK` de
  `estado` ya incluye `NO_ENTREGADO` desde el Sprint 4 y quedaría un estado
  del enum sin ningún camino que lo alcance si no se agrega. Libera el cupo
  de `menu_dia`, igual que `cancelar`.
- **Ventana de silencio, mecánica exacta:** `entregado_en + horas_ventana_confirmacion
  horas <= ahora()` — aritmética simple sobre timestamp, no días hábiles (a
  diferencia del cutoff de pedidos). Función pura `ventanaSilencioVencida` en
  `calendario.util.ts`, usada también para mostrarle al colaborador cuánto
  le queda en `GET /pedidos/mios`.

### Bug real encontrado y corregido durante este sprint

Las políticas nuevas de `pedido`/`pedido_linea` (migración 8) usan un
`EXISTS` contra `contrato_suplidor` para confirmar que el suplidor tiene
contrato activo con la empresa dueña del pedido — mismo mecanismo que
`migrations/0007`. Pero a diferencia de 0007 (cuyo `EXISTS` corre siempre
desde ámbito EMPRESA), aquí corre desde ámbito **SUPLIDOR** — y
`contrato_suplidor` tenía RLS que solo permitía verlo en ámbito EMPRESA
(`contrato_suplidor_por_empresa`, Sprint 2). Resultado real observado
corriendo `test/entrega-disputas.test.js`: un suplidor con contrato activo
de verdad no veía sus propios pedidos, porque el `EXISTS` evaluaba `false`
para él — no porque el contrato no existiera, sino porque RLS se lo escondía
incluso dentro de la subconsulta de otra política. Corregido en
`migrations/0009`: una política adicional que deja al suplidor ver sus
propios contratos (con cualquier empresa), simétrica a la que ya tenía la
empresa.

### Nota de alcance para un sprint futuro — ✅ resuelto el 30 de julio de 2026

Al armar la verificación end-to-end de este sprint quedó expuesto un hueco
que ya existía desde el Sprint 3/4, no introducido por este: `GET
/catalogo/menu` es un endpoint de ámbito `SUPLIDOR_ADMIN` únicamente, y no
devuelve `suplidor_id` en cada item. Un colaborador real no tenía ninguna
forma de descubrir vía API qué suplidores y qué `menuDiaId` puede pedir —
`POST /pedidos` exige `suplidorId` que el cliente ya debía conocer de
antemano. En este sprint y en el 4 esto se resolvió consultando la base
directamente durante las pruebas — quedó anotado para retomar, sin resolver
en su momento para no ampliar el alcance de "entrega, disputas y silencio".

**Resuelto al cerrar el roadmap actual (Sprint 9):** `GET
/pedidos/menu-disponible?desde=&hasta=` (COLABORADOR) — solo suplidores con
ruta activa al punto de entrega del colaborador **y** contrato activo con
su empresa (las mismas dos condiciones que ya exige `crearPedido`), con el
precio ya ajustado por `ajuste_pct` (Sprint 7, lo que de verdad pagaría) y
si todavía se puede pedir (`disponible`, antes del cutoff, con cupo).
Verificado end-to-end: se usó la respuesta de este endpoint, sin ninguna
consulta manual a la base, para armar un `POST /pedidos` real y exitoso.

**Criterio de cierre, verificado:**
1. `npm run migrate` aplicó las migraciones 8 y 9 sin errores sobre la base
   real (Neon).
2. `node test/entrega-disputas.test.js` — 10/10 verificaciones en verde:
   funciones puras de ventana de silencio, RLS nueva del suplidor sobre
   `pedido`/`pedido_linea` (con y sin contrato), y resolución perezosa por
   silencio en sus dos modos (`AUTO_CONFIRMA` y `AUTO_DISPUTA`).
3. Suite completa de sprints anteriores (`tenant-isolation`, `back-office`,
   `catalogo`, `pedidos`) sigue en verde — sin regresiones.
4. Flujo completo end-to-end contra la API real corriendo (`npm run build &&
   npm run start`, sin mocks): publicar menú → crear pedido (colaborador) →
   ver lista de preparación sin el código expuesto → preparar → entregar con
   código incorrecto (rechazado) → entregar con código correcto → el
   colaborador ve `puedeConfirmar`/`ventanaConfirmacionVenceEn` → disputar →
   RRHH ve la disputa → resolver a favor del colaborador → cupo liberado.
5. Confirmado por el usuario en su propia máquina el 29 de julio de 2026.

---

## Sprint 6 — Nómina y libro mayor ✅ CONFIRMADO

**Estado: cerrado y verificado.** Construido, corrido contra Postgres real
(Neon) incluido un flujo end-to-end real vía HTTP contra la API corriendo,
y confirmado por el usuario en su propia máquina el 29 de julio de 2026.

**Objetivo:** que exista un registro formal, inmutable, de cuánto le
corresponde descontar a cada colaborador — y que RRHH pueda cerrar un ciclo
de nómina y descargar el archivo que alimenta la nómina real de la empresa,
con las columnas que esa empresa necesite. Backend real de la vista RRHH de
`mockup-plataforma-almuerzo.html`.

**Decisiones de producto, resueltas con el usuario antes de construir (no
hay mockup para esta parte en este repo):**
1. **El cargo se genera cuando el pedido llega a `RECIBIDO`** — sin importar
   si fue por confirmación del colaborador, por silencio, o porque RRHH
   resolvió una disputa a favor del suplidor (Sprint 5). Antes de eso no hay
   movimiento; `CANCELADO` y `NO_ENTREGADO` nunca generan cargo.
2. **Cierre de ciclo bloqueado por defecto si quedan pedidos sin resolver**
   (`ENTREGADO`/`DISPUTA`) dentro de su rango de fechas — evita tener que
   mover cargos entre ciclos en el caso común. Es configurable por empresa
   (`empresa.permite_cierre_con_pendientes`, default `false`): si una
   empresa la activa, puede cerrar igual, y cualquier pedido pendiente que
   se resuelva después postea su cargo en el ciclo abierto **en ese
   momento**, nunca en el que ya cerró — el libro mayor es append-only, jamás
   se reabre ni se edita un ciclo cerrado.
3. **Cierra RRHH/ADMIN_EMPRESA de la propia empresa** — mismo rol que ya
   administra pedidos y disputas (Sprint 4/5).
4. **Archivo de descuento configurable por empresa**, no un CSV de forma
   fija: cada empresa elige qué columnas quiere y en qué orden, de un
   catálogo fijo de campos disponibles (no fórmulas ni SQL libre, por
   seguridad) — ver subsprint 6.4.

**Reconciliación con el Sprint 4 (decisión técnica, no de producto):** el
tope de ciclo que ya corre en `POST /pedidos` (`crearPedido`) sigue sumando
`monto_colaborador` de pedidos **no cancelados/no-entregados**, sin importar
si ya llegaron a `RECIBIDO` — a propósito. Ese chequeo existe para frenar al
colaborador mientras el pedido todavía está en camino, así que necesita
contar también lo que aún no se ha confirmado como recibido (si solo
contara `movimiento`, un colaborador podría acumular pedidos sin límite
mientras ninguno llegue a `RECIBIDO` todavía). El libro mayor (`movimiento`)
es la fuente de verdad de lo que realmente se descuenta; el chequeo de
`crearPedido` sigue siendo un freno preventivo en tiempo real, con un
propósito distinto. No se tocan las queries del Sprint 4/5.

**Criterio de cierre, verificado:**
1. `npm run migrate` aplicó la migración 10 sin errores sobre la base real
   (Neon), incluido el `REVOKE UPDATE, DELETE ON movimiento FROM
   almuerzo_app`.
2. `node test/nomina.test.js` — 17/17 verificaciones en verde: catálogo y
   generador de CSV puros, `almuerzo_app` rechazado con `insufficient_privilege`
   al intentar `UPDATE`/`DELETE` sobre `movimiento`, `postearCargo` crea y
   reutiliza el ciclo correcto, no postea nada con monto 0 (cobertura
   total), y un cargo cuyo período original ya cerró se postea en el ciclo
   abierto vigente hoy sin tocar el cerrado.
3. Suite completa de sprints anteriores sigue en verde — sin regresiones.
4. Flujo end-to-end contra la API real corriendo: colaborador pide y
   confirma un pedido → se postea un `CARGO` automático por el monto
   correcto → un segundo pedido queda `ENTREGADO` sin resolver en el mismo
   período → `POST /nomina/ciclos/cerrar` se bloquea (403) → se resuelve
   (el colaborador lo confirma) → el cierre procede → cerrar de nuevo el
   mismo ciclo se rechaza (no reabre) → `PUT /nomina/plantilla-descuento`
   guarda una plantilla propia (rechaza un campo fuera del catálogo) →
   `GET /nomina/ciclos/:id/archivo-descuento` devuelve un CSV con
   exactamente esas columnas, en ese orden, con la etiqueta personalizada
   bien escapada → `POST /nomina/movimientos/ajuste` (nota de crédito)
   postea en el ciclo abierto vigente, no en el que ya cerró.
5. Confirmado por el usuario en su propia máquina el 29 de julio de 2026.

### Subsprint 6.1 — Libro mayor (`movimiento`), append-only

Tabla `movimiento`: `id`, `empresa_id`, `colaborador_id`, `ciclo_nomina_id`,
`pedido_id` (nullable — una corrección manual puede no estar atada a un
pedido), `tipo` (`CARGO` | `NOTA_CREDITO` — sin un tercer tipo "AJUSTE": un
ajuste manual ya ES un `CARGO` o una `NOTA_CREDITO` sin `pedido_id`, un
tercer tipo obligaría a otro campo para saber el signo), `monto` (siempre
positivo; el signo lo da `tipo`, no un negativo escondido), `motivo`,
`creado_en`, `creado_por` (nullable — `NULL` cuando el sistema lo genera
automáticamente, ej. al llegar a `RECIBIDO`). Sin `UPDATE` ni `DELETE`
posible ni siquiera a nivel de permisos de Postgres (`REVOKE UPDATE, DELETE
... FROM almuerzo_app`) — la única forma de corregir un monto es una fila
nueva que lo compense.

El `CARGO` se genera automáticamente: en los mismos puntos donde Sprint 5
hace `estado = 'RECIBIDO'` (confirmación del colaborador, resolución
perezosa por silencio, y resolución de disputa a favor del suplidor), se
inserta el movimiento dentro de la misma transacción — si el `UPDATE` del
pedido falla, el `movimiento` tampoco se crea.

### Subsprint 6.2 — Ciclos de nómina (`ciclo_nomina`)

Tabla `ciclo_nomina`: `id`, `empresa_id`, `periodo_inicio`, `periodo_fin`,
`estado` (`ABIERTO` | `CERRADO`), `cerrado_en`, `cerrado_por`. `UNIQUE
(empresa_id, periodo_inicio, periodo_fin)`. Se crea de forma perezosa —
"buscar o crear" el ciclo `ABIERTO` correspondiente la primera vez que un
`movimiento` necesita postear en ese período (reutilizando `periodoDe()` de
`calendario.util.ts`, ya escrito en el Sprint 4) — ningún cron pre-crea
ciclos por adelantado, mismo principio de todo este proyecto.

`ALTER TABLE empresa ADD COLUMN permite_cierre_con_pendientes BOOLEAN NOT
NULL DEFAULT false` — la bandera de la decisión 2.

### Subsprint 6.3 — Cierre de ciclo y correcciones posteriores

`POST /nomina/ciclos/cerrar` (`{ periodoInicio, periodoFin }` o el ciclo
`ABIERTO` vigente por defecto) — valida que no haya pedidos
`ENTREGADO`/`DISPUTA` en el rango salvo que
`empresa.permite_cierre_con_pendientes` sea `true`; si pasa, marca
`estado = 'CERRADO'`, `cerrado_en`, `cerrado_por`.

`POST /nomina/movimientos/ajuste` (RRHH) — `{ colaboradorId, tipo:
'CARGO'|'NOTA_CREDITO', monto, motivo }`. Postea siempre contra el ciclo
`ABIERTO` vigente en el momento de la corrección, nunca contra uno ya
cerrado — es el mecanismo para toda corrección administrativa posterior
(disputa tardía, error de digitación, lo que sea), sin tocar jamás una fila
existente.

### Subsprint 6.4 — Archivo de descuento configurable

Catálogo fijo de campos disponibles (no hay expresiones libres, por
seguridad): `codigo_nomina`, `cedula`, `nombre_completo`, `punto_entrega`,
`cantidad_pedidos`, `monto_total`, `subsidio_total_empresa`,
`periodo_inicio`, `periodo_fin`. Una plantilla activa por empresa
(`plantilla_reporte_descuento`: `empresa_id`, `campos` JSONB — array
ordenado de claves del catálogo, cada una con una etiqueta de columna
opcional). Si la empresa nunca configura una, se usa una plantilla default
razonable (`codigo_nomina`, `nombre_completo`, `monto_total`).

- `GET /nomina/plantilla-descuento` / `PUT /nomina/plantilla-descuento`
  (RRHH) — ver/editar qué campos y en qué orden.
- `GET /nomina/ciclos/:id/archivo-descuento` (RRHH) — genera el CSV
  agregando `movimiento` por colaborador dentro de ese ciclo, con
  exactamente las columnas configuradas.

### Fuera de alcance de este sprint (a propósito)

- Múltiples plantillas con nombre por empresa (una activa por empresa
  alcanza para este sprint; si hace falta más adelante, es una tabla en vez
  de un registro único, cambio menor).
- Integración directa con un sistema de nómina real (ADP, sistemas locales
  dominicanos) — el archivo es un CSV para pegar a mano, no una API.
- Reapertura de un ciclo ya cerrado — a propósito nunca existe; toda
  corrección es una fila nueva (`CARGO`/`NOTA_CREDITO` manual).
- Liquidación a suplidores (cuánto se le paga a cada suplidor) — Sprint 7,
  es la mitad opuesta del dinero (lo que entra vs. lo que sale).

---

## Sprint 7 — Liquidación a suplidores ✅ CONFIRMADO

**Estado: cerrado y verificado.** Construido, corrido contra Postgres real
(Neon) incluido un flujo end-to-end real vía HTTP contra la API corriendo,
y confirmado por el usuario en su propia máquina el 30 de julio de 2026.

**Objetivo:** que la plataforma calcule cuánto le corresponde cobrar a cada
suplidor por lo que de verdad se entregó (`RECIBIDO`), agregado a través de
todas las empresas que ese suplidor sirve, en lotes por período — y que se
pueda marcar un lote como pagado una vez transferido el dinero fuera del
sistema. Backend real de la vista Suplidor · Liquidación de
`mockup-plataforma-almuerzo.html`.

**Decisiones de producto, resueltas con el usuario antes de construir (no
hay mockup para esta parte en este repo):**
1. **`ajuste_pct` ajusta lo que paga el colaborador**, no un margen
   escondido de plataforma — ver el bug real corregido arriba, bajo Sprint 4.
   El precio ya ajustado (`total_bruto` de cada `pedido`) es exactamente lo
   que se le debe al suplidor por ese pedido: no hay una comisión de
   plataforma separada en este sprint, nadie mencionó que exista una.
2. **La plataforma actúa como intermediaria**: liquida a cada suplidor
   agregando pedidos de **todas** las empresas que lo contrataron en el
   período, no una liquidación separada por cada relación empresa-suplidor.
   Coincide con el "modelo agente/intermediario" que ya estaba anotado en el
   mapa de sprints.
3. **Sin integración bancaria real**: el sistema calcula el lote y genera un
   reporte; el pago real ocurre fuera del sistema, y alguien de plataforma
   lo marca como pagado a mano (mismo patrón que el archivo de descuento
   del Sprint 6, sin credenciales bancarias de por medio).

**Decisión de implementación, resuelta sin necesidad de preguntar (patrón ya
establecido, solo trasladado):** un suplidor puede servir a empresas con
`frecuencia_nomina` distinta (quincenal vs. mensual) — agregar "por período"
no puede depender de la frecuencia de nómina de ninguna empresa en
particular. Se agrega `suplidor.frecuencia_liquidacion` (mismo dominio
`QUINCENAL`/`MENSUAL`, default `QUINCENAL`), y se reutiliza `periodoDe()` de
`calendario.util.ts` parametrizada por esa frecuencia, no la de la empresa.

**Decisión de arquitectura, para no duplicar el libro mayor del Sprint 6:**
no hace falta una tabla `movimiento_suplidor` — a diferencia del lado
colaborador (donde el silencio y las disputas hacían falta resolver antes de
que un cargo fuera definitivo), del lado suplidor un `pedido` en `RECIBIDO`
ya es terminal e inmutable por diseño (ningún endpoint transiciona un pedido
fuera de `RECIBIDO`). Por eso el mismo patrón de bloqueo del Sprint 6
(no calcular con pendientes, salvo que se permita explícitamente) alcanza
para garantizar que, al calcular un lote, todo lo relevante en ese rango ya
esté resuelto — un simple `SUM(total_bruto) FROM pedido WHERE estado =
'RECIBIDO'` en el momento del cálculo es correcto y completo, sin necesitar
rastrear "qué pedido ya se contó" en una tabla aparte.

**Criterio de cierre, verificado:**
1. `npm run migrate` aplicó la migración 11 sin errores sobre la base real
   (Neon).
2. `node test/liquidaciones.test.js` — 7/7 verificaciones en verde:
   `aplicarAjustePct` con datos fijos (descuento, recargo, 0%, redondeo a 2
   decimales), y RLS de `lote_pago_suplidor` (un suplidor ve sus propios
   lotes, no puede editarlos directamente — 0 filas afectadas por `UPDATE`,
   sin política permisiva para ese comando — y no ve los lotes de otro
   suplidor).
3. Suite completa de sprints anteriores sigue en verde — sin regresiones.
4. Flujo end-to-end contra la API real corriendo: se aplica un `ajuste_pct`
   real de -10% a un contrato → un pedido nuevo lo refleja correctamente en
   `total_bruto` → se entrega y confirma → una segunda empresa (fixture)
   contrata al mismo suplidor con un pedido `RECIBIDO` propio → calcular la
   liquidación agrega ambas empresas → se bloquea mientras queda un pedido
   `ENTREGADO` sin resolver → se resuelve → el cálculo procede con el total
   y la cantidad correctos → recalcular el mismo período se rechaza → el
   suplidor ve el lote y su desglose completo (empresa, no colaborador) →
   marcar pagado → volver a marcar pagado se rechaza.
5. Confirmado por el usuario en su propia máquina el 30 de julio de 2026.

### Bugs reales encontrados y corregidos durante la verificación end-to-end

- **RLS de `colaborador` bloqueaba el desglose de `GET
  /liquidaciones/:id` para el suplidor.** La primera versión hacía `JOIN
  colaborador` para mostrar el nombre de quien pidió — pero `colaborador`
  tiene RLS por `empresa_id` (Sprint 1), invisible en ámbito SUPLIDOR, así
  que el `JOIN` eliminaba **todas** las filas del desglose (`pedidos: []`),
  aunque `monto_total` (calculado bajo ámbito PLATAFORMA) fuera correcto.
  Mismo patrón exacto que el bug de `contrato_suplidor` del Sprint 5
  (migración 9): una tabla referenciada por `JOIN` deniega la fila completa
  si su propia RLS no la deja ver, sin importar qué tan permisiva sea la
  política de la tabla principal. Corregido reemplazando el `JOIN` por
  `empresa` (sin RLS propia) — que además es la información correcta: el
  suplidor necesita saber de qué empresa es cada pedido para su
  liquidación, no qué colaborador individual lo hizo (PII que no le
  corresponde ver).
- **Comparación de fechas rota por serialización de `Date`.**
  `periodo_inicio`/`periodo_fin` vuelven de Postgres como objetos `Date` de
  JavaScript (columna `DATE`). Pasarlos tal cual como parámetros de otra
  consulta los serializa con hora y zona horaria (ej. `2026-09-16T04:00:00.000Z`
  en vez de `2026-09-16`), desplazando el rango `BETWEEN` lo suficiente
  para excluir pedidos que sí correspondían. Corregido normalizando con
  `iso(new Date(...))`, el mismo helper que ya se usa en el resto del
  código para este propósito exacto — el bug era no haberlo aplicado aquí
  también.

### Subsprint 7.1 — Corrección de `ajuste_pct` en el motor de pedidos

`crearPedido` consulta `contrato_suplidor.ajuste_pct` (empresa↔suplidor del
pedido, ya sabemos que existe activo por construcción — RLS de 0007 no deja
ver el menú sin él) y lo aplica a cada línea antes de sumar `bruto`:
`precioAjustado = precio_base * (1 + ajuste_pct/100)`, redondeado a 2
decimales, mismo criterio de redondeo que ya usa `calcularSubsidio`.

### Subsprint 7.2 — `lote_pago_suplidor`

Tabla `lote_pago_suplidor`: `id`, `suplidor_id`, `periodo_inicio`,
`periodo_fin`, `estado` (`CALCULADO` | `PAGADO`), `monto_total`,
`cantidad_pedidos`, `calculado_en`, `calculado_por`, `pagado_en`,
`pagado_por`, `referencia_pago`. `UNIQUE (suplidor_id, periodo_inicio,
periodo_fin)`. RLS: el propio suplidor ve sus lotes (`suplidor_id =
app.suplidor_id`); plataforma los gestiona todos vía `almuerzo_platform`
(`BYPASSRLS`), igual que el back office.

`ALTER TABLE suplidor ADD COLUMN frecuencia_liquidacion` y `ADD COLUMN
permite_liquidacion_con_pendientes BOOLEAN NOT NULL DEFAULT false` — misma
bandera que `empresa.permite_cierre_con_pendientes`, ahora del lado suplidor.

### Subsprint 7.3 — Endpoints

Nuevo controlador `LiquidacionesController`, ámbito mixto (mismo patrón que
`PedidosController`: sin `@Roles` a nivel de clase, cada método declara el
suyo):
- `POST /liquidaciones/calcular` (plataforma, `SUPERADMIN`/`SOPORTE`) —
  `{ suplidorId, periodoInicio?, periodoFin? }`. Bloquea con 403 si hay
  pedidos `ENTREGADO`/`DISPUTA` de ese suplidor en el rango, salvo
  `permite_liquidacion_con_pendientes`. Calcula y persiste el lote.
- `GET /liquidaciones` (plataforma: todos; suplidor: los suyos, vía RLS) —
  lista de lotes.
- `GET /liquidaciones/:id` (mismo acceso) — detalle, con el desglose de
  pedidos que se contaron.
- `PATCH /liquidaciones/:id/marcar-pagado` (plataforma) —
  `{ referenciaPago }`. `CALCULADO` → `PAGADO`. Rechaza si ya está `PAGADO`.

**Limitación honesta:** `GET /liquidaciones/:id` incluye un desglose de los
pedidos que explican `monto_total`, recalculado en el momento de la
consulta (no se persiste). En ámbito SUPLIDOR, la RLS de `pedido` (Sprint 5)
solo deja ver pedidos de empresas con `contrato_suplidor` todavía **activo**
— si el contrato se desactivó después de la entrega, ese pedido puede faltar
en el desglose que ve el suplidor, aunque `monto_total` (calculado bajo
ámbito PLATAFORMA, que sí ve todo) siga siendo correcto. Mismo tipo de nota
de alcance que ya se documentó en `migrations/0007`.

### Fuera de alcance de este sprint (a propósito)

- Ajustes manuales sobre un lote ya calculado (bonos, penalizaciones) — si
  hace falta, es una extensión futura del mismo patrón que
  `POST /nomina/movimientos/ajuste` del Sprint 6, no se construye aquí sin
  que alguien lo pida primero.
- Integración bancaria o de pagos real — el archivo/reporte es para que
  alguien pague fuera del sistema, no una pasarela de pago.
- Recalcular retroactivamente pedidos creados antes del fix de `ajuste_pct`
  — ver la nota bajo Sprint 4.

---

## Sprint 8 — Sistema de ayuda y recorrido guiado ✅ CONFIRMADO

**Estado: cerrado y verificado.** Construido, corrido contra Postgres real
(Neon) incluido un flujo end-to-end real vía HTTP contra la API corriendo
(sin bugs encontrados), y confirmado por el usuario en su propia máquina el
30 de julio de 2026.

**Nota de alcance, resuelta con el usuario el 30 de julio de 2026, antes de
construir:** esta sección se escribió muy al inicio del proyecto, antes del
Sprint 1, y describe una feature de **frontend** — ícono contextual, tour
con overlay sobre "elementos reales de la interfaz", pantalla dedicada. Este
proyecto es puramente backend (ningún sprint construye pantallas — ver
"fuera de alcance" de los Sprints 2 y 3), y no existe ningún cliente visual
en este repo. Nunca se revisó este plan contra esa realidad hasta ahora.

**Decisión:** se construye solo el backend del contenido — la tabla
`ayuda_contenido` y los endpoints para consultarla/administrarla (subsprint
8.1, adaptado). Los subsprints 8.2 (tour con overlay) y 8.3 (pantalla
dedicada) quedan **fuera de alcance a propósito** hasta que exista un
frontend real que los consuma — no tiene sentido construir un tour contra
una interfaz que no existe. Se sembra contenido de ejemplo real (política de
silencio, tope de endeudamiento, nota de crédito tras cierre de ciclo — las
mismas reglas que ya menciona el entregable original de este sprint) para
que la API sea demostrable de verdad, no un CRUD vacío.

**Objetivo (ajustado):** que exista una API de contenido de ayuda —
consultable por cualquier rol autenticado, filtrada a lo suyo, con
buscador — y administrable por plataforma (`SUPERADMIN`/`SOPORTE`). Sienta
la base de datos y el contrato de API para que, el día que exista un
frontend, el tour y el centro de ayuda (subsprints 8.2/8.3) se construyan
consumiendo esto sin tocar el backend de nuevo.

**Criterio de cierre (ajustado), verificado:**
1. `npm run migrate` aplicó las migraciones 12 y 13 sin errores sobre la
   base real (Neon).
2. `node test/ayuda.test.js` — 10/10 verificaciones en verde: el contenido
   sembrado existe, el filtro por rol (propio + `TODOS`) funciona, el
   buscador por texto encuentra la ficha correcta, y `almuerzo_app` no
   puede escribir en `ayuda_contenido` (rechazado con `insufficient_privilege`,
   `REVOKE` de la migración 13) aunque sí puede leerlo.
3. Suite completa de sprints anteriores sigue en verde — sin regresiones.
4. Flujo end-to-end contra la API real corriendo: un colaborador ve su
   ficha de política de silencio pero no la de liquidación a suplidores; un
   suplidor ve la suya pero no la del colaborador; `?pantallaId=` y
   `?buscar=` filtran correctamente; RRHH no puede crear contenido (403);
   plataforma sí puede crear, editar (la versión sube), rechazar un
   `rolObjetivo` inválido (400), y borrar.
5. Confirmado por el usuario en su propia máquina el 30 de julio de 2026.

Sin bugs reales encontrados en este sprint — a diferencia de los anteriores,
el flujo end-to-end pasó limpio en el primer intento.

---

### Subsprint 8.1 — API de contenido de ayuda (construido)

**Tareas:**
- Tabla `ayuda_contenido`: cada ficha tiene `titulo`, `cuerpo` (markdown corto), `rol_objetivo` (uno de los
  roles existentes, o `TODOS` para contenido visible a cualquier rol), `pantalla_id` (identificador libre —
  lo definirá el frontend el día que exista; por ahora usa nombres descriptivos como `pedidos.confirmar`),
  y `orden`. Sin RLS por empresa/suplidor: es contenido de plataforma, igual para todos los que comparten rol.
- Versionado simple: `version` y `actualizado_en`, para saber si el contenido quedó desactualizado respecto
  a un cambio reciente de la regla que describe.
- `GET /ayuda` (cualquier rol autenticado) — filtra por el rol del propio usuario (`rol_objetivo` = su rol
  o `TODOS`), con `?pantallaId=` y `?buscar=` (ILIKE sobre título/cuerpo) opcionales.
- `POST /ayuda`, `PATCH /ayuda/:id`, `DELETE /ayuda/:id` (`SUPERADMIN`/`SOPORTE`, ámbito PLATAFORMA) — CRUD
  administrativo, mismo patrón que el back office.
- Semilla de contenido real: fichas explicando política de silencio, tope de endeudamiento, y nota de
  crédito tras cierre de ciclo — las mismas reglas que ya menciona el entregable original de este sprint.

**Entregable verificable:** un colaborador autenticado consulta `GET /ayuda` y recibe solo fichas de su rol
o `TODOS`; el buscador encuentra la ficha de "política de silencio" por texto; un intento de crear/editar/
borrar contenido sin ser plataforma se rechaza.

---

### Subsprint 8.2 — Recorrido guiado por rol (diferido — requiere un frontend real)

**Tareas:**
- Un tour paso a paso (tipo overlay con resaltado de elementos reales de la interfaz, no capturas de
  pantalla estáticas) para cada uno de los cuatro roles:
  - **Colaborador:** qué es el cutoff, cómo se lee el desglose de subsidio, qué significa cada estado de
    su pedido, cómo y cuándo reportar un problema.
  - **Suplidor:** diferencia entre catálogo y menú del día, cómo funciona la plantilla semanal y la
    rotación, qué significa que un día esté congelado, cómo se calcula su liquidación.
  - **RRHH:** cómo se configura el programa de beneficio, qué es el libro mayor y por qué nunca se edita,
    cómo resolver una disputa y qué implica que el ciclo ya haya cerrado.
  - **Back office:** el flujo completo de alta de empresa, qué validaciones aplica la carga de CSV y por
    qué, cómo funciona el ajuste de precio por contrato.
- El tour se activa automáticamente en el primer ingreso de cada usuario nuevo a su rol, y queda disponible
  para repetirse manualmente desde el menú en cualquier momento.
- Cada paso del tour enlaza a su ficha de `ayuda_contenido` correspondiente, para quien quiera más detalle
  del que cabe en el paso del tour.

**Entregable verificable:** los cuatro recorridos completos, probados por ti navegando cada uno de principio
a fin sin código de por medio — solo la interfaz real.

---

### Subsprint 8.3 — Centro de ayuda (diferido — requiere un frontend real)

**Tareas:**
- Una pantalla dedicada (no un modal perdido) que organiza todas las fichas de `ayuda_contenido` del rol
  activo por categoría, con el buscador de la subsprint 8.1 en la parte superior.
- Cada ficha explica no solo el "cómo" sino el "por qué" cuando la regla de negocio no es obvia — por
  ejemplo, por qué el cargo no se genera hasta que el colaborador confirma la entrega, o por qué un menú
  se congela al vencer el cutoff. Esto es exactitud, no solo cobertura: el contenido debe describir el
  comportamiento real del sistema, verificado contra el código, no una aproximación.
- Enlace visible desde cualquier pantalla del sistema hacia el centro de ayuda de ese rol.

**Entregable verificable:** localizar, desde el centro de ayuda, la explicación de cualquier regla de
negocio discutida en este documento (política de silencio, tope de endeudamiento, nota de crédito tras
cierre de ciclo) en menos de tres clics, con el texto describiendo correctamente el comportamiento actual.

---

### Fuera de alcance de este sprint (a propósito)

- Ayuda en video o soporte en vivo (chat, WhatsApp) — es un centro de ayuda estático más tour interactivo,
  no un canal de soporte humano.
- Traducción a otros idiomas — el sistema es en español, igual que toda esta conversación.
- Ayuda personalizada por IA (un asistente conversacional dentro de la app) — es una extensión posible a
  futuro, pero no de este sprint.

---

## Sprint 9 — Operación y lanzamiento — subsprints 9.1–9.3 ✅ CONFIRMADOS; 9.4 preparado, despliegue real pendiente

**Estado: 9.1–9.3 cerrados y verificados.** Construidos, corridos contra
Postgres real (Neon) incluido un flujo end-to-end real vía HTTP, y
confirmados por el usuario en su propia máquina el 30 de julio de 2026.
9.4 (despliegue real) sigue sin poder avanzar — ver el bloqueo de git más
abajo.

**Objetivo:** cerrar el roadmap actual con lo que hace falta para operar el
sistema de verdad — reportes para RRHH/plataforma, notificaciones reales
por correo, un mínimo de observabilidad/endurecimiento gratuito, y el
despliegue real a producción (Render + Neon, ya anotado como plan futuro en
`CLAUDE.md`).

**Decisiones de producto, resueltas con el usuario antes de construir** (el
roadmap original marcaba este sprint como "a definir con RRHH" — nunca se
definió hasta ahora):
1. **Despliegue real, no solo preparación.** Yo dejo el repo listo
   (`render.yaml`, variables de entorno documentadas) y te guío paso a paso;
   la creación de la cuenta en Render y la conexión real las haces tú —
   crear cuentas externas no es algo que deba hacer por mi cuenta.
2. **Notificaciones por email real**, con un proveedor de free tier
   (Resend, vía su API HTTP directa con `fetch` — sin SDK, mismo criterio
   de dependencias mínimas que ya usa el proyecto). Requiere que crees una
   cuenta gratuita y me des la API key en `.env`.
3. **Reportes**: propuestos por mí a partir de los datos que ya existen (no
   pedidos específicos del usuario) — ver subsprint 9.1.
4. **Observabilidad y endurecimiento básico y gratuito**: sin servicios de
   pago — `helmet`, rate limiting con `@nestjs/throttler` en `/auth/login`,
   logging estructurado de requests, y validación de variables de entorno
   críticas al arrancar.

**Prerrequisito descubierto, no anotado en ningún lado hasta ahora:** este
proyecto **no es un repositorio git todavía** — 8 sprints construidos sin
control de versiones. Render se conecta a un repo de GitHub para desplegar
automáticamente en cada push; sin git, ese camino no existe. Antes del
subsprint 9.4 hace falta `git init`, un primer commit, y un repo en GitHub
— se confirma con el usuario antes de tocarlo, por ser una acción que
crea infraestructura compartida nueva (regla de "acciones con cuidado").

**Criterio de cierre, verificado (subsprints 9.1–9.3):**
1. `npm run migrate` aplicó la migración 14 sin errores sobre la base real
   (Neon). `npm install helmet @nestjs/throttler` agregó 2 dependencias
   nuevas a `package.json` (ninguna vulnerabilidad propia — las 21 que
   reporta `npm audit` son preexistentes, todas de `jest`, una
   devDependency que no llega a producción; no se tocaron, es una limpieza
   aparte que no corresponde a este sprint).
2. `node test/reportes.test.js` (4/4) y `node test/notificaciones.test.js`
   (4/4) en verde. Suite completa de sprints anteriores sigue en verde —
   sin regresiones.
3. Flujo end-to-end contra la API real corriendo: los 4 reportes responden
   con datos reales y respetan RLS (`consumo-colaborador`/`gasto-empresa`
   acotados a la propia empresa en ámbito EMPRESA, agregando todas bajo
   PLATAFORMA; un colaborador no puede verlos); entregar un pedido genera
   una fila `notificacion_enviada` real (`OMITIDA`, porque la colaboradora
   de prueba no tiene email cargado en el seed — comportamiento correcto,
   no un bug); los headers de `helmet` aparecen en cualquier respuesta;
   `/auth/login` responde `401` en los primeros 5 intentos de una ventana
   de 60s y `429` en el sexto; la validación de variables de entorno falla
   rápido con el mensaje correcto cuando falta una.
4. Confirmado por el usuario en su propia máquina el 30 de julio de 2026.

**Subsprint 9.4 (despliegue real):** `render.yaml` escrito y la guía
paso a paso agregada al README. **No se ejecutó nada externo** — ver el
prerrequisito de git/GitHub abajo, pendiente de confirmación explícita
antes de tocarlo (regla de "acciones con cuidado": crear un repositorio en
GitHub y conectar una cuenta de Render es infraestructura nueva y
compartida, no una acción reversible como escribir un archivo).

**Bloqueo real encontrado al intentar cumplir el prerrequisito de git:**
el usuario confirmó que quería `git init` + GitHub, pero **git no está
instalado en esta máquina**, y el entorno de ejecución de esta sesión
bloquea la descarga de archivos binarios/ejecutables por seguridad
("body content-type denied" — tanto `winget install` como una descarga
directa del instalador de Git para Windows fallaron con 403, aunque el
acceso normal a github.com funciona bien). No se pudo instalar git desde
esta sesión.

**Decisión, con el usuario:** seguir sin git por ahora. En su lugar:
- `CHANGELOG.md` (raíz del proyecto) — historial legible por sprint, qué
  archivos cambiaron.
- `versiones/` — un `.zip` restaurable por cada sprint confirmado a partir
  de ahora (sin `node_modules`/`dist`/`.env`), con su propio `README.md`
  explicando cómo volver a una versión anterior. No fue posible reconstruir
  snapshots retroactivos de los Sprints 1–8 — el árbol de trabajo solo
  refleja el estado acumulado actual.
- El despliegue real a Render sigue bloqueado por la falta de git — cuando
  el usuario instale git por su cuenta (fuera de esta sesión, con acceso
  normal de navegador) o resuelva el bloqueo de otra forma, se retoma el
  subsprint 9.4 desde donde quedó.

### Subsprint 9.1 — Reportes

Cuatro endpoints de solo lectura, agregando sobre tablas que ya existen —
sin tablas nuevas, sin romper RLS (cada query corre en la misma transacción
con ámbito ya resuelto, así que el aislamiento existente se aplica solo):

- `GET /reportes/consumo-colaborador?desde=&hasta=` (RRHH/ADMIN_EMPRESA) —
  por colaborador de la empresa: cantidad de pedidos, total bruto, subsidio
  recibido, monto a su cargo, en el rango.
- `GET /reportes/gasto-empresa?desde=&hasta=` (RRHH/ADMIN_EMPRESA; también
  plataforma, todas las empresas) — subsidio total aportado, cantidad de
  colaboradores que pidieron al menos una vez, cantidad de pedidos.
- `GET /reportes/entregas-suplidor?desde=&hasta=` (SUPLIDOR_ADMIN, lo
  propio; también plataforma) — pedidos por estado (`RECIBIDO`,
  `NO_ENTREGADO`, `DISPUTA`, cancelados), tasa de disputas sobre el total.
- `GET /reportes/disputas?desde=&hasta=` (RRHH/ADMIN_EMPRESA; también
  plataforma) — cantidad por motivo, y por resolución (a favor de quién).

**`consumo-colaborador` y `gasto-empresa` salen de `movimiento` (el libro
mayor, Sprint 6), no de `pedido` directo** — son reportes de dinero, y
`movimiento` es "la fuente de verdad de lo ya asentado" (así se documentó
en el Sprint 6). Solo cuentan pedidos que llegaron a `RECIBIDO` (tienen un
`CARGO` posteado); uno todavía `CONFIRMADO`/`EN_PREPARACION`/`ENTREGADO`/
`DISPUTA` no aparece hasta que se resuelva, ni tampoco uno `NO_ENTREGADO`
(nunca posteó cargo). `entregas-suplidor` y `disputas` sí siguen sobre
`pedido` directo — son conteos de estado/disputa, columnas que no existen
en `movimiento`.

**Bug real, encontrado el 31 de julio de 2026 al revisar la documentación
con el usuario:** la primera versión de estos dos reportes sí salía de
`pedido` directo (`estado NOT IN ('CANCELADO','NO_ENTREGADO')`), contando
también pedidos `ENTREGADO`/`DISPUTA`/`CONFIRMADO` sin resolver — números
que no coincidían con lo que el libro mayor consideraba asentado, y ni el
README ni este plan decían de qué tabla salían. Corregido reescribiendo
ambas queries con un `WITH cargos AS (...)` sobre `movimiento JOIN pedido`
filtrado por `tipo = 'CARGO'`. Cubierto con una prueba nueva en
`test/reportes.test.js`: un pedido `ENTREGADO` sin `CARGO` posteado no se
cuenta; uno `RECIBIDO` con su `CARGO` sí, con el monto exacto.

### Subsprint 9.2 — Notificaciones por email

Tabla `notificacion_enviada` (auditoría, no cola de reintento): `id`,
`tipo`, `destinatario`, `asunto`, `estado` (`ENVIADA`|`ERROR`|`OMITIDA`),
`referencia_tipo`/`referencia_id` (ej. `PEDIDO`/`123`), `creado_en`,
`detalle_error`. `OMITIDA` es el caso sin `RESEND_API_KEY` configurada —
nunca bloquea el request que la disparó, solo queda registrado.

Tres disparadores reales, elegidos por ser los de mayor señal, no todos los
que existen (evita sobre-alcanzar):
1. Pedido pasa a `ENTREGADO` → email al colaborador (si tiene `email`) para
   que confirme.
2. Disputa resuelta (`resolver-disputa`) → email al colaborador con el
   resultado.
3. Lote de liquidación marcado `PAGADO` → no hay columna de email en
   `suplidor` todavía; se agrega `suplidor.email_contacto` (nullable) en
   esta migración para poder notificarlo.

`src/common/notificaciones.ts`: función `enviarNotificacion()` que llama al
API HTTP de Resend directo con `fetch`, registra el resultado en
`notificacion_enviada`, y **nunca lanza** — un fallo de envío no debe
tumbar la transacción que lo disparó (confirmar un pedido no debe fallar
porque el proveedor de email esté caído).

### Subsprint 9.3 — Observabilidad y endurecimiento básico

- `helmet` (headers de seguridad estándar) en `main.ts`.
- `@nestjs/throttler` en `/auth/login` — límite razonable (ej. 5 intentos
  por minuto por IP), responde 429 al excederlo.
- Interceptor simple de logging de requests: método, ruta, status, duración
  — usando el `Logger` que NestJS ya trae, sin servicio externo.
- Validación de variables de entorno críticas (`DATABASE_URL`,
  `MIGRATE_DATABASE_URL`, `PLATFORM_DATABASE_URL`, `JWT_SECRET`) al
  arrancar `main.ts` — falla rápido con un mensaje claro en vez de fallar
  a medias en el primer request que las necesite.

### Subsprint 9.4 — Despliegue real a Render

Requiere el prerrequisito de git/GitHub de arriba, confirmado antes de
tocarlo. Entregables:
- `render.yaml` — blueprint declarativo: build command (`npm ci && npm run
  build`), start command (`npm run start`), health check `/health`,
  variables de entorno declaradas (sin valores reales, esos se configuran
  en el dashboard de Render).
- Guía paso a paso en el README para: crear la cuenta, conectar el repo de
  GitHub, configurar las variables de entorno reales (`DATABASE_URL` de la
  rama de producción en Neon, `JWT_SECRET` propio, etc.), y correr
  `npm run migrate` contra la base de producción antes del primer deploy.

### Fuera de alcance de este sprint (a propósito)

- Notificaciones por SMS o push — solo email, por presupuesto.
- Reintentos automáticos de notificaciones fallidas — `notificacion_enviada`
  registra el fallo para revisión manual, no hay cola ni cron (mismo
  principio de "sin jobs en segundo plano" de todo el proyecto).
- Dashboards de observabilidad (Grafana, etc.) o servicios de pago (Sentry,
  New Relic) — logging básico a stdout, que Render ya captura por defecto.
- CI/CD con tests automáticos en cada push — Render puede desplegar en cada
  push, pero correr la suite de tests antes de cada deploy es una mejora
  futura, no de este sprint.

---

## Sprint 10 — Frontend: app del colaborador

**Objetivo:** el primer cliente real de esta API — no otro mockup de
simulación, una app que hace login de verdad, llama a los endpoints reales,
y le permite a un colaborador pedir su almuerzo de principio a fin. Empieza
por el rol colaborador (confirmado con el usuario); suplidor, RRHH y back
office quedan para sprints de frontend futuros, reusando la misma base
técnica.

**De dónde sale el diseño:** `mockup-plataforma-almuerzo.html`,
`portal-suplidor-menu.html` y `portal-backoffice-onboarding.html` — leídos
completos antes de escribir este plan. Los tres comparten el mismo sistema
de diseño (paleta, tipografía IBM Plex Sans/Mono, componentes `.card`/
`.btn`/`.est`/`.aviso`/`.kv`) y usan **exactamente** los mismos valores de
enum que el backend real (`CONFIRMADO`, `EN_PREPARACION`, `ENTREGADO`,
`RECIBIDO`, `DISPUTA`, `NO_ENTREGADO`, `CANCELADO`; los 5 motivos de
disputa) — confirma que diseño y backend salieron de la misma
especificación original, aunque se construyeron en momentos distintos.

**Importante — qué NO son estos mockups:** son consolas de *simulación de
reglas de negocio*, no la app real ni algo para reutilizar tal cual. Cada
uno reimplementa toda la lógica (cutoff, subsidio, ciclos) en JS puro,
en memoria, sin backend ni autenticación, con un "reloj" para adelantar el
tiempo y observar transiciones de estado. Ese motor entero se descarta — ya
existe, probado, en el backend real. Lo que se conserva es el diseño
visual, la información de cada pantalla, y el copy (los mensajes de error
del mockup coinciden casi palabra por palabra con los que ya devuelve la
API, prueba de que ambos vienen del mismo diseño original).

### Discrepancias reales encontradas leyendo el mockup contra el backend ya construido

1. **El mockup permite "Reclamar" sobre un pedido ya `RECIBIDO`** (con cargo
   ya posteado al libro mayor) — un segundo camino de disputa, después de
   que el colaborador ya confirmó o que venció la ventana de silencio. El
   backend real **no lo soporta**: `PATCH /pedidos/:id/disputar` exige
   `estado = 'ENTREGADO'`, y una vez `RECIBIDO` no hay ninguna transición de
   vuelta. **Decisión: el Sprint 10 no construye este botón** — la app
   solo ofrece lo que el backend ya puede hacer. Si hace falta reabrir un
   reclamo tardío en el futuro, es un cambio de backend (nueva transición
   `RECIBIDO → DISPUTA`), no algo que el frontend pueda simular por su cuenta.
2. **El medidor "comprometido este ciclo / tope"** (barra de progreso bajo
   el carrito) necesita el consumo acumulado del período de nómina vigente
   para ese colaborador — dato que `POST /pedidos` calcula internamente
   (`consumoProyectado`) pero **ningún endpoint expone hoy**. Se resuelve
   en el subsprint 10.5 (backend chico, un solo endpoint de solo lectura),
   no se difiere silenciosamente.
3. **CORS**: la API nunca configuró `app.enableCors()` porque hasta ahora
   nada la llamaba desde un navegador en otro origen (todas las pruebas
   fueron `curl`/`fetch` desde Node, sin política de origen). Un frontend
   real en `localhost:5176` (Vite) llamando a `localhost:3000` la necesita
   — se agrega en el subsprint 10.1, acotada a los orígenes conocidos
   (dev: `localhost:5176`; producción: el dominio real, cuando exista).

### Propuesta de stack, con razonamiento

**React 18 + TypeScript + Vite + Tailwind CSS + TanStack Query + React
Router.**

- **TypeScript**: ya es el lenguaje de todo el backend — mismo modelo
  mental, mismo tooling, y los tipos de las respuestas de la API (`Pedido`,
  `MenuDisponibleResponse`, etc.) se escriben una vez y atrapan errores de
  integración en compilación, no en producción.
- **React, no vanilla JS como el mockup**: el patrón del mockup
  (`innerHTML` con template strings interpolando datos del usuario sin
  escapar) es un XSS real en cuanto deja de ser una simulación local — una
  nota de disputa con `<script>` dentro se ejecutaría tal cual. JSX escapa
  por defecto. Además, cuatro roles con varias pantallas cada uno (el
  roadmap completo de frontend, no solo este sprint) se vuelve difícil de
  mantener a mano con `render()` reemplazando todo el DOM cada vez — React
  con estado localizado por componente escala mejor sin reescribir nada
  cuando lleguen los sprints de suplidor/RRHH/back office.
- **Vite, no Next.js**: esta app no necesita SSR ni SEO — es una
  herramienta interna, detrás de login, multi-tenant. Next agregaría
  complejidad de enrutamiento de servidor que este proyecto no necesita.
  Vite da dev server rápido y un build estático simple de desplegar.
- **TanStack Query** para las llamadas a la API: maneja loading/error/
  cache/revalidación (ej. refrescar "Mis pedidos" después de confirmar)
  con mucho menos código repetido que `useEffect` + `fetch` a mano, y
  encaja con el patrón de esta API (mayormente lecturas, mutaciones
  puntuales).
- **React Router** para la navegación (login → seleccionar ámbito → app),
  en vez del cambio de pestañas a mano (`S.vista`) del mockup.
- **Tailwind CSS**: en vez de portar el CSS del mockup archivo por
  archivo, se codifican los mismos tokens ya validados (colores, radios,
  tipografía) en `tailwind.config` — se conserva el lenguaje visual
  exacto, pero con clases utilitarias en vez de mantener una hoja de
  estilos aparte. Gratis, sin sistema de diseño que inventar desde cero,
  ampliamente documentado.
- **Alternativa considerada y descartada — vanilla JS/HTML sin build,
  igual que el mockup**: más rápido de arrancar, cero herramientas, pero
  no escala a los 4 roles del roadmap completo de frontend, sin seguridad
  de tipos, y con el riesgo de XSS ya mencionado. Válida solo si este fuera
  el único sprint de frontend que existiría — no es el caso.
- **Autenticación**: el JWT con ámbito ya seleccionado se guarda en
  `localStorage` (patrón SPA estándar) — suficiente para un proyecto
  personal; una cookie `httpOnly` sería más resistente a XSS pero exige
  cambios de CORS/cookies en el backend que no corresponden a este sprint.
- **Ubicación**: `frontend/` dentro de este mismo repositorio (sigue sin
  existir git — no hay razón todavía para separarlo en otro proyecto).
- **Hosting (cuando llegue)**: build estático a Render Static Site, mismo
  bloqueo de git que el subsprint 9.4 — no es un bloqueo nuevo.

### Subsprint 10.1 — Bootstrap y cliente de API

Scaffold de Vite + React + TS en `frontend/`. `tailwind.config` con los
tokens exactos del mockup (colores, IBM Plex). Cliente HTTP tipado
(`fetch` con base URL por variable de entorno, inyecta el `Authorization:
Bearer`, maneja 401 cerrando sesión). `app.enableCors()` en el backend
(`src/main.ts`), acotado a los orígenes de dev/producción — el pequeño
cambio de backend que este sprint sí necesita.

### Subsprint 10.2 — Autenticación

Pantalla de login (email + contraseña) → `POST /auth/login`. Si el usuario
tiene más de una membresía, selector de ámbito → `POST
/auth/seleccionar-ambito` (aunque el colaborador de prueba solo tiene una,
el flujo debe soportarlo desde ahora — no es exclusivo de otros roles).
Sesión persistida en `localStorage`, logout, y una ruta protegida que
redirige a login si no hay token.

### Subsprint 10.3 — Pedir almuerzo

Selector de fecha (solo las que trae `GET /pedidos/menu-disponible`, ya
acotadas al cutoff), selector de suplidor si hay más de uno en el punto de
entrega del colaborador, tarjetas de plato reusando el estilo `.plato` del
mockup. **Selección única, no carrito multi-ítem** — el mockup nunca
permitió seleccionar más de un plato a la vez
(`S.carrito={'+m.id+':1}` reemplaza, no agrega), aunque el backend acepta
un array de líneas; se respeta el flujo ya validado visualmente, no lo que
el backend técnicamente permite. Desglose en vivo (bruto, subsidio,
a cargo) y avisos de error/advertencia reusando el texto que ya devuelve
la API. Confirmar → `POST /pedidos`.

### Subsprint 10.4 — Mis pedidos y disputa

Lista de pedidos propios (`GET /pedidos/mios`) con badge de estado
(mismos colores del mockup por estado) y acciones condicionales: Cancelar
(`CONFIRMADO`), Confirmar recibido / Reportar problema (`ENTREGADO`) — nada
para `RECIBIDO` (ver discrepancia 1 arriba). Modal de disputa con los 5
motivos exactos (`NO_LLEGO`, `INCOMPLETO`, `EQUIVOCADO`, `CALIDAD`,
`OTRO`) y nota opcional → `PATCH /pedidos/:id/disputar`. Muestra
`puedeConfirmar`/`ventanaConfirmacionVenceEn` (ya los devuelve `GET
/pedidos/mios` desde el Sprint 5) como cuenta regresiva.

### Subsprint 10.5 — Medidor de consumo del ciclo (requiere un endpoint nuevo, chico, de backend)

`GET /pedidos/consumo-ciclo` (`COLABORADOR`) — reutiliza la misma lógica
que ya vive en `crearPedido` (período vigente vía `periodoDe()`, suma de
`monto_colaborador` de pedidos no cancelados/no-entregados, tope efectivo
= mínimo entre `topeCicloColaborador` y `salario × pctMaxSalario/100`) sin
duplicarla — se factoriza a una función compartida. Barra de progreso en
la app, con los mismos umbrales de color del mockup (verde / ámbar >70% /
granate >90%).

**Criterio de cierre:** con la API real corriendo (`npm run start`) y el
frontend en modo dev, un login real como `ana.ramirez@futuroars.demo`
completa el flujo de punta a punta con clics reales, no `curl`: ve el menú
disponible respetando el cutoff, selecciona un plato, ve el desglose
correcto, confirma, lo ve en "Mis pedidos" como `CONFIRMADO`, lo cancela, y
(con el suplidor entregándolo por `curl` mientras tanto, porque el portal
del suplidor todavía no existe) confirma la recepción o abre una disputa
con motivo. Verificado visualmente por el usuario en su navegador — un
test automatizado no reemplaza confirmar que la pantalla realmente se ve y
funciona.

### Fuera de alcance de este sprint (a propósito)

- Los otros 3 roles (suplidor, RRHH, back office) — sprints de frontend
  futuros, mismo stack.
- El botón "Reclamar" sobre un pedido `RECIBIDO` — el backend no lo soporta
  hoy (ver discrepancia 1).
- Responsive/PWA instalable, notificaciones push del navegador, modo
  oscuro — nada de esto se validó en el mockup, no se inventa aquí.
- Despliegue real del frontend — mismo bloqueo de git que el Sprint 9.4.

### Notas de implementación (encontradas al construir, 31 de julio de 2026)

Dos discrepancias reales más, además de las 3 ya documentadas arriba —
encontradas al construir, no al planear, y resueltas sin ampliar el alcance
del backend en silencio (criterio de `EXPERTO.md`):

4. **No existe una forma de "previsualizar" un pedido antes de crearlo.**
   El mockup calcula bruto/subsidio/a-cargo en vivo con su propio motor JS
   mientras el colaborador arma el pedido — motor que este sprint
   explícitamente descarta (ver "qué NO son estos mockups" arriba). El
   backend real solo calcula ese desglose dentro de `POST /pedidos`, al
   crear el pedido de verdad; no hay un endpoint de solo cálculo, y
   recalcularlo en el cliente sería reinventar `calcularSubsidio` (con el
   riesgo de que ambos se desincronicen). **Decisión:** la pantalla de
   pedir muestra el precio bruto del plato (dato ya conocido, ajustado por
   contrato) antes de confirmar, con una nota de que el subsidio y el monto
   a cargo se calculan al confirmar — y los muestra reales, tal como los
   devolvió la API, en cuanto el pedido se crea. No se agregó ningún
   endpoint nuevo para esto.
5. **No hay forma de que un colaborador consulte su propio nombre/punto de
   entrega vía API.** `GET /colaboradores` existe pero es de rol
   RRHH/ADMIN_EMPRESA (lista toda la empresa, Sprint 1). Ningún endpoint de
   ámbito COLABORADOR expone el perfil del propio colaborador. **Decisión:**
   el encabezado de la app muestra el correo de la sesión (dato que ya se
   tiene del login) en vez del nombre completo del colaborador. No se
   agregó un endpoint `/me` para esto — nómbralo si hace falta de verdad
   más adelante.

**Backend tocado en este sprint** (ambos cambios chicos, documentados en
los subsprints 10.1 y 10.5, no nuevos sin avisar):
- `src/main.ts`: `app.enableCors()`, orígenes desde `CORS_ORIGENES` (env,
  default `http://localhost:5176`).
- `GET /pedidos/consumo-ciclo` (`src/pedidos/pedidos.controller.ts`) — usa
  `src/pedidos/consumo-ciclo.ts` (función nueva `consumoCicloDe`), que
  también reemplaza el cálculo que antes vivía duplicado dentro de
  `crearPedido` — mismo comportamiento, sin la duplicación.

**Frontend:** `frontend/` — Vite + React 18 + TypeScript + Tailwind +
TanStack Query + React Router, tal como se documentó. `npm install` dejó 4
vulnerabilidades reportadas por `npm audit`: la de `react-router`
(GHSA-wrjc-x8rr-h8h6, moderada, redirección abierta) no tiene fix en la
serie 6.x todavía — la 7.x es un cambio mayor, fuera de alcance de este
sprint; la de `esbuild` (moderada) solo afecta al dev server, no al build
de producción. Ninguna crítica. Revisar de nuevo si `npm audit` ofrece un
fix sin romper cuando se retome el frontend.

**Verificado por Claude antes de entregar:** `npm run typecheck` y
`npm run build` limpios en frontend y backend, toda la suite de regresión
del backend (`npm run test` + los 9 `test/*.test.js`) sigue pasando sin
romperse por el refactor de `consumo-ciclo`, `GET /pedidos/consumo-ciclo`
y CORS verificados en vivo contra la API real corriendo.

**✅ CONFIRMADO por el usuario el 31 de julio de 2026** — probado con
clics reales en el navegador (`localhost:5176`, login
`ana.ramirez@futuroars.demo`): login, pedir, mis pedidos,
cancelar/confirmar/disputar.

---

## Sprint 11 — Frontend: portal del suplidor ✅ CONFIRMADO

**Estado: cerrado y verificado.** Construido, verificado de extremo a extremo
por Claude, y **confirmado por el usuario en su propia máquina el 3 de
agosto de 2026** con clics reales en `localhost:5176`
(`suplidor@cocinacriolla.demo`).

**Verificado (3 de agosto de 2026):**
1. `npm run migrate` — nada que aplicar, el `DELETE` de plantilla no necesitó columna ni tabla nueva.
2. `npm run build` (backend) y `npm run typecheck && npm run build` (frontend) — ambos limpios.
3. Suite completa de regresión — los 10 archivos de test (`tenant-isolation`, `back-office`, `catalogo`, `pedidos`, `entrega-disputas`, `nomina`, `liquidaciones`, `ayuda`, `reportes`, `notificaciones`) en verde, sin ninguna rotura por este sprint.
4. `DELETE /catalogo/plantillas/:id/items/:itemId` probado en vivo contra la API real corriendo (`localhost:3000`) con el usuario de prueba del suplidor: crear un item, borrarlo, y confirmar `404` al repetir el borrado sobre un item que ya no existe. El aislamiento por `suplidor_id` reutiliza el mismo mecanismo `WITH CHECK` ya cubierto en `test/catalogo.test.js` — no se creó un test cruzado nuevo porque no existe un segundo usuario de prueba para "Verde Menú" en el seed.

**Pendiente, tuyo:** entrar como `suplidor@cocinacriolla.demo` en `localhost:5176`, y recorrer el criterio de cierre de abajo con clics reales — editar un plato, agregar/quitar uno de la plantilla, publicar el menú, y entregar un pedido real de Ana (Sprint 10) con su código de retiro.

**Objetivo:** el segundo cliente real, mismo stack que el Sprint 10
(React + TS + Vite + Tailwind + TanStack Query + React Router, dentro del
mismo `frontend/` — no un proyecto aparte). Le da al suplidor
(`suplidor@cocinacriolla.demo`) todo lo que hoy solo puede hacer por
`curl`: gestionar su catálogo, su plantilla semanal, publicar el
calendario, y preparar/entregar los pedidos reales que ya llegan desde la
app del colaborador (Sprint 10).

**De dónde sale el diseño:** `portal-suplidor-menu.html`, leído completo
antes de escribir este plan. Comparte el mismo sistema de diseño que
`mockup-plataforma-almuerzo.html` (mismos tokens, ya portados a
`tailwind.config.js`) y usa los mismos valores de enum del backend
(`SIN_PUBLICAR`/`PUBLICADO`/`CONGELADO`, `ACTIVO`/`INACTIVO`).

**Importante — qué NO es este mockup:** al igual que el de la Sección
10, es una consola de simulación con su propio motor en memoria (estado de
catálogo/plantilla/calendario vive en un objeto JS `S`, sin backend). Ese
motor se descarta — el backend real (Sprint 3) ya hace exactamente esto.
Se conserva el diseño visual, las 3 pantallas (Catálogo, Plantilla
semanal, Calendario y publicación) y su copy.

### Discrepancias reales encontradas leyendo el mockup contra el backend ya construido

1. **Subida de fotos real.** El mockup sube una foto a memoria
   (`FileReader`, sin servidor) y la muestra recortada. El backend nunca
   construyó esto — `producto.imagen_url` es solo texto (decisión de
   alcance del Sprint 3, ver `README.md`). **Decisión: este sprint no
   sube archivos.** El campo `imagenUrl` de `POST/PATCH
   /catalogo/productos` se expone como un campo de texto opcional (pegar
   una URL), no un selector de archivo. Sin foto, se muestra un color por
   categoría, igual que en el mockup.
2. **Quitar un plato de la plantilla semanal.** El mockup permite
   destildar un checkbox para sacar un plato de un día — pero
   `POST /catalogo/plantillas/:id/items` (Sprint 3) solo agrega o
   actualiza (`ON CONFLICT ... DO UPDATE`); no existe ningún endpoint que
   borre una fila de `plantilla_item`. Es un caso de negocio real (un
   suplidor agrega un plato por error, o deja de ofrecerlo un día fijo de
   la semana) — se agrega en el subsprint 11.2 un endpoint chico nuevo,
   documentado aquí antes de construirse, no decidido a mitad de código.
3. **"Vista del colaborador" (pestaña de previsualización).** El mockup
   incluye una 4ª pestaña que simula cómo un colaborador vería el menú con
   el ajuste de contrato aplicado. Ya no hace falta simularla — existe de
   verdad desde el Sprint 10 (`GET /pedidos/menu-disponible`, la app del
   colaborador real). **Decisión: no se construye esta pestaña.**
4. **Preparación y entrega de pedidos — no está en este mockup en
   absoluto.** El mockup de catálogo solo cubre menú, no el ciclo de vida
   de un pedido ya hecho. Pero es la pieza real que falta para que el
   flujo completo (colaborador pide → suplidor entrega) no dependa de
   `curl`, como se probó a mano en `PLAN-PRUEBAS.md`, Sección 5. Se agrega
   como una pantalla nueva (subsprint 11.4), con el mismo lenguaje visual,
   sobre los endpoints ya existentes del Sprint 5
   (`GET /pedidos/preparacion`, `PATCH /pedidos/:id/preparar`,
   `/entregar`, `/no-entregado`) — sin inventar mockup para esto porque ya
   existe el backend real y su copy exacto (ver Sprint 5 en este mismo
   documento).
5. **Feriados y `requiereAprobacionMenu`.** El mockup simula ambos
   (`FERIADOS` hardcodeado, aprobación de RRHH antes de publicar). El
   backend real no tiene una pantalla de gestión de feriados (son de la
   empresa, `dia_no_habil`, sin CRUD expuesto) ni el flag
   `requiereAprobacionMenu` existe en el esquema real. **Decisión:
   ninguno de los dos se construye aquí** — no son parte del backend ya
   construido, y agregarlos sería ampliar alcance sin que EXPERTO.md lo
   pida.

### Subsprint 11.1 — Enrutamiento por rol

Hasta ahora `frontend/` solo tenía una pantalla protegida (la del
colaborador). Se agrega una redirección después de login según
`ambito.rol`: `COLABORADOR` → la pantalla ya existente (Sprint 10);
`SUPLIDOR_ADMIN` → la pantalla nueva de este sprint. Mismo `AuthContext`,
mismo cliente de API — no se duplica nada de autenticación.

### Subsprint 11.2 — Catálogo

`GET/POST /catalogo/productos`, `PATCH /catalogo/productos/:id`. Lista de
platos con foto (color por categoría si no hay `imagenUrl`), edición
inline de nombre/descripción/categoría/precio base/etiquetas, activar/
desactivar. **Backend nuevo, chico:** `DELETE
/catalogo/plantillas/:plantillaId/items/:itemId` (`SUPLIDOR_ADMIN`) — para
la discrepancia 2. Valida que el item pertenezca a una plantilla del
propio suplidor (RLS ya lo garantiza, igual que el resto de `catalogo`).

### Subsprint 11.3 — Plantilla semanal

`GET/POST /catalogo/plantillas`, `POST /catalogo/plantillas/:id/items`,
`DELETE .../items/:itemId` (nuevo, arriba). Tabla semana 1 / semana 2 (se
ofrece crear la que falte si el suplidor todavía no la tiene — hoy
Cocina Criolla del Este solo tiene semana 1 sembrada), un plato por fila
con checkbox agregar/quitar y campos de precio/cupo cuando está agregado,
igual que el mockup.

### Subsprint 11.4 — Calendario, publicación, y preparación/entrega

`POST /catalogo/menu/publicar`, `GET /catalogo/menu` (calendario con
`estado` calculado al vuelo), `PATCH /catalogo/menu/:id` (editar precio/
cupo/activo, bloqueado si `CONGELADO`, mismo aviso del mockup). Debajo,
una sección nueva (discrepancia 4): `GET /pedidos/preparacion?fecha=` con
el consolidado por punto de entrega, `PATCH /pedidos/:id/preparar` y
`PATCH /pedidos/:id/entregar` (pide el código de retiro por input de
texto — nunca se muestra, ver Sprint 5) y `/no-entregado`.

**Criterio de cierre:** con la API real corriendo y el frontend en modo
dev, un login real como `suplidor@cocinacriolla.demo` completa de punta a
punta con clics reales: edita un plato del catálogo, agrega/quita un
plato de la plantilla semanal, publica el menú de un día nuevo y lo ve
`PUBLICADO` en el calendario, y — con un pedido real que Ana (colaboradora,
Sprint 10) haya confirmado — lo pasa a `EN_PREPARACION` y lo entrega
ingresando el código de retiro real que ella ve en su app. Verificado
visualmente por el usuario en su navegador.

### Fuera de alcance de este sprint (a propósito)

- Los otros 2 roles (RRHH, back office) — sprints de frontend futuros.
- Subida real de archivos de imagen — ver discrepancia 1.
- Gestión de feriados (`dia_no_habil`) y aprobación de menú por RRHH — ver
  discrepancia 5, no existen en el backend real.
- La pestaña "vista del colaborador" del mockup — redundante, ya existe
  de verdad (Sprint 10).
- Múltiples rutas de servicio por suplidor en la misma pantalla más allá
  de listar/crear — editar/desactivar una ruta ya creada no tiene
  endpoint (`PATCH /catalogo/rutas/:id` no existe); se documenta aquí como
  gap menor, no se construye un endpoint nuevo para esto sin que alguien
  lo pida — a diferencia de la discrepancia 2 (quitar de plantilla), esto
  no bloquea el flujo real de publicar/vender.

---

## Sprint 12 — Frontend: panel de RRHH ✅ CONFIRMADO

**Estado: cerrado y verificado.** Construido, verificado de extremo a
extremo por Claude, y **confirmado por el usuario en su propia máquina el
4 de agosto de 2026** con clics reales en `localhost:5176`
(`rrhh@futuroars.demo`).

**Verificado:**
1. `npm run build` (backend) y `npm run typecheck && npm run build`
   (frontend) — ambos limpios. Sin migración nueva — el backend chico de
   este sprint (`GET /nomina/movimientos`, CRUD de `programas`) reutiliza
   tablas ya existentes desde el Sprint 4/6.
2. Suite completa de regresión — los 10 archivos de test en verde, sin
   ninguna rotura por este sprint.
3. Backend nuevo probado en vivo contra la API real: crear un programa de
   prueba, solape rechazado con `400` (Postgres `EXCLUDE` → mensaje
   legible), finalizar una asignación existente y reasignar sin solape,
   editar/desactivar un programa, y `GET /nomina/movimientos`/`GET
   /pedidos/disputas`/`GET /nomina/plantilla-descuento`/descarga real del
   CSV de `archivo-descuento` (`Content-Type: text/csv`, con las columnas
   configuradas). **Los datos de prueba se limpiaron después** (programa y
   asignación de prueba eliminados, la asignación original de Luis Fermín
   restaurada) para no contaminar el seed que tú vas a ver en el
   navegador.

**Pendiente, tuyo:** entrar como `rrhh@futuroars.demo` en
`localhost:5176`, y recorrer el criterio de cierre de abajo con clics
reales.

**Objetivo:** el tercer cliente real, mismo stack que los Sprints 10 y 11
(React + TS + Vite + Tailwind + TanStack Query + React Router, dentro del
mismo `frontend/`). Le da a RRHH (`rrhh@futuroars.demo`) lo que hoy solo
puede hacer por `curl`: resolver disputas, cerrar ciclos de nómina y
descargar el archivo de descuento, ver el libro mayor, y — nuevo en este
sprint — configurar el programa de beneficio de su empresa y decidir qué
colaboradores lo tienen activo.

**De dónde sale el diseño:** la pestaña `vRRHH` (función `vRRHH()`) dentro
de `mockup-plataforma-almuerzo.html`, leída completa antes de escribir este
plan — mismo archivo que ya dio el diseño del Sprint 10, distinta pestaña
de su simulador de 5 vistas (colaborador, suplidor, RRHH, plataforma,
trazabilidad). Comparte paleta/tipografía/componentes con los mockups
anteriores.

**Importante — qué NO es este mockup:** igual que los Sprints 10 y 11, es
una consola de simulación con estado en memoria (`S.ciclos`,
`S.movimientos`), sin backend real. Se descarta el motor, se conserva el
diseño visual, la información de cada pantalla y su copy.

### Discrepancias reales encontradas leyendo el mockup contra el backend ya construido

1. **"Menús por aprobar" (`EN_REVISION`, `requiereAprobacionMenu`).** El
   mockup muestra una tarjeta de menús pendientes de aprobación de RRHH
   antes de publicarse. Ya se documentó como no construido al llegar aquí
   desde el lado del suplidor (Sprint 11, discrepancia 5) — ni el estado
   `EN_REVISION` ni el flag existen en el esquema real. **Misma decisión:
   no se construye esta tarjeta.**
2. **"Enviar a nómina" no envía nada — descarga el CSV.** El botón del
   mockup simula un envío automático a un sistema de nómina externo. El
   backend real (Sprint 6) decidió a propósito que el archivo de descuento
   es "un CSV para pegar a mano, no una API" — no hay ninguna integración
   con un sistema de nómina real, ni la habrá en este sprint. El botón
   equivalente en la app real dispara la descarga de
   `GET /nomina/ciclos/:id/archivo-descuento`.
3. **El "libro mayor" (tabla de movimientos individuales) no tiene
   endpoint hoy.** `nomina.controller.ts` solo expone el CSV ya agregado
   por colaborador (`archivo-descuento`) — nunca una lista cruda de
   `movimiento` para mostrar en pantalla, que es lo que el mockup dibuja
   (id, sello, colaborador, concepto, monto). Caso de negocio real: RRHH
   necesita poder ver el detalle antes de cerrar un ciclo, no solo el CSV
   final. Se agrega `GET /nomina/movimientos` (subsprint 12.1), mismo
   patrón que el `DELETE` chico del Sprint 11 — documentado aquí antes de
   construirse.
4. **`programa_beneficio`/`asignacion_programa` no tienen CRUD — gap ya
   documentado desde el Sprint 9, resuelto en este sprint por decisión
   explícita del usuario.** El mockup ni siquiera lo simula (asume que el
   programa ya existe) — no hay referencia visual para esta pantalla, así
   que se diseña sin mockup, mismo criterio que ya se usó para partes de
   los Sprints 6 y 7 que tampoco tenían uno. Sin esto, una empresa nueva
   dada de alta por el back office no tiene forma de que ninguno de sus
   colaboradores pueda pedir almuerzo — es el hueco más bloqueante de los
   que quedaban anotados. Se agrega en el subsprint 12.1 (backend) y 12.5
   (pantalla).

### Subsprint 12.1 — Backend chico: libro mayor consultable y CRUD de programa de beneficio

- `GET /nomina/movimientos` (RRHH/ADMIN_EMPRESA) — lista `movimiento` más
  reciente primero (id, creado_en, colaborador, tipo, monto, motivo,
  pedido_id, ciclo_nomina_id), con `?cicloId=` opcional. Sin escritura —
  `movimiento` sigue siendo append-only, esto es solo lectura nueva.
- Controlador nuevo `src/nomina/programas.controller.ts` (mismo módulo
  `nomina`, `@Roles('RRHH','ADMIN_EMPRESA')`):
  - `GET /programas` / `POST /programas` — listar/crear el programa de
    beneficio de la propia empresa (`nombre`, `tipoSubsidio`,
    `valorSubsidio`, topes, `diasSemana`, `pctMaxSalario`).
  - `PATCH /programas/:id` — editar, incluye activar/desactivar
    (`estado`).
  - `GET /programas/:id/asignaciones` / `POST /programas/:id/asignaciones`
    — ver quién tiene el programa vigente y asignárselo a un colaborador
    (`colaboradorId`, `vigenteDesde`, `vigenteHasta?`). El `EXCLUDE` por
    `daterange` (Sprint 4) ya impide un solape — el endpoint solo traduce
    ese error de Postgres a un `400` legible.
  - `PATCH /programas/:programaId/asignaciones/:asignacionId` — finalizar
    una asignación (fijar `vigenteHasta`), no se borra — mismo espíritu de
    no destruir historial que el resto del sistema.

### Subsprint 12.2 — Enrutamiento

`RolRouter` gana una rama: `RRHH`/`ADMIN_EMPRESA` → `RrhhPage` nueva, con
pestañas (mismo patrón que `SuplidorPage` del Sprint 11).

### Subsprint 12.3 — Disputas y pedidos de la empresa

`GET /pedidos/disputas` con los 5 motivos ya conocidos, botones "A favor
del colaborador" / "A favor del suplidor" → `PATCH
/pedidos/:id/resolver-disputa`. Debajo, `GET /pedidos` (todos los de la
empresa) como tabla de referencia.

### Subsprint 12.4 — Ciclos y libro mayor

`GET /nomina/ciclos`, `POST /nomina/ciclos/cerrar` (bloqueo por pendientes
ya conocido, mensaje de error tal cual lo devuelve la API), `GET
/nomina/movimientos` (nuevo, 12.1) como tabla, `POST
/nomina/movimientos/ajuste` (corrección manual, `CARGO`/`NOTA_CREDITO`),
`GET`/`PUT /nomina/plantilla-descuento` (elegir columnas del catálogo
fijo), y el botón de descarga de `GET
/nomina/ciclos/:id/archivo-descuento` (discrepancia 2).

### Subsprint 12.5 — Programas de beneficio (pantalla nueva, sin mockup)

Crear/editar el programa de beneficio de la empresa, y asignar/finalizar
colaboradores — consumiendo el backend de 12.1. Cierra la discrepancia 4.

### Fuera de alcance de este sprint (a propósito)

- La tarjeta de "menús por aprobar" — ver discrepancia 1, no existe en el
  backend real.
- Cualquier integración real con un sistema de nómina externo — ver
  discrepancia 2, el archivo es para pegar a mano, a propósito.
- Reportes (`consumo-colaborador`, `gasto-empresa`) — existen y son de
  ámbito RRHH, pero no están en el mockup `vRRHH`; se revisan cuando se
  documente el Sprint 13 (dashboard), que es donde el usuario pidió
  agrupar métricas.
- El panel de back office (empresas, contratos, CSV de colaboradores) —
  sigue sin frontend ni sprint asignado; no se decide aquí.

**Criterio de cierre:** con la API real corriendo y el frontend en modo
dev, un login real como `rrhh@futuroars.demo` completa de punta a punta
con clics reales: resuelve una disputa real, ve el libro mayor actualizado
tras un pedido `RECIBIDO`, cierra un ciclo (y ve el bloqueo si hay
pendientes), descarga el archivo de descuento, y — con una empresa/
colaborador de prueba sin programa vigente — crea un programa de
beneficio nuevo, se lo asigna, y ese colaborador puede pedir almuerzo por
primera vez. Verificado visualmente por el usuario en su navegador.

---

## Sprint 13 — Frontend: panel de back office ✅ CONFIRMADO

**Estado: cerrado y verificado.** Construido, verificado de extremo a
extremo por Claude, y **confirmado por el usuario en su propia máquina el
5 de agosto de 2026** con clics reales en `localhost:5176`
(`admin@plataforma.demo`) — incluidos los dos bugs reales encontrados y
corregidos durante la prueba (ver más abajo).

**Verificado:**
1. `npm run build` (backend) y `npm run typecheck && npm run build`
   (frontend) — ambos limpios. Sin migración nueva — `GET
   /back-office/suplidores` solo lee una tabla ya existente.
2. Suite completa de regresión — los 10 archivos de test en verde, sin
   ninguna rotura por este sprint.
3. Flujo completo probado en vivo contra la API real, igual que lo haría
   el frontend (multipart real, no simulado): se creó una empresa de
   prueba, se subió un CSV real de 3 filas (1 cédula duplicada → error, 2
   con punto de entrega desconocido → alerta, ambas importables), el
   preview reportó exactamente `conError=1, conAlerta=2, importables=2`,
   la importación insertó los 2 colaboradores esperados, se contrató un
   suplidor de la lista real (`GET /back-office/suplidores`), se editó el
   `ajuste_pct` y se desactivó el contrato — el conteo
   `suplidores_activos` de la empresa bajó a 0 correctamente. **Los datos
   de prueba se limpiaron después** (empresa, colaboradores y contrato de
   prueba eliminados) para no contaminar el seed que vas a ver en el
   navegador.

**Pendiente, tuyo:** entrar como `admin@plataforma.demo` en
`localhost:5176`, y recorrer el criterio de cierre de abajo con clics
reales.

### Bug real encontrado y corregido, al probarlo tú en el navegador (5 de agosto de 2026)

Subir un CSV real y hacer clic en "Ver revisión de filas" devolvía `500
Internal server error`, sin mensaje útil. Causa real:
`validarCsvColaboradores` (`src/back-office/csv-colaboradores.ts`) llama a
`parse()` de `csv-parse` sin capturar sus excepciones — cualquier CSV
verdaderamente inválido (ej. una comilla sin cerrar, número de columnas
inconsistente entre filas) hace que `parse()` lance una excepción síncrona
que nadie atrapaba, y NestJS la convierte en `500` genérico por defecto.
Nunca apareció en las pruebas anteriores porque todos los CSV de prueba
(`test/back-office.test.js`, mis pruebas por `curl`/`Invoke-RestMethod`)
estaban bien formados — hacía falta un archivo real, con un error real de
formato, para exponerlo.

**Corregido:** `validarCsvColaboradores` ahora captura el error de
`csv-parse` y lo relanza como un `Error` con mensaje legible (incluye la
línea exacta donde falló el parseo). El controlador
(`src/back-office/back-office.controller.ts`, helper `parsearOFallar`)
atrapa ese `Error` en los dos endpoints (`preview` e `importar`) y lo
convierte en `400 Bad Request` con el mensaje real, en vez de un `500`
opaco. Verificado en vivo: un CSV con una comilla sin cerrar ahora
responde `400` con `"El archivo no se pudo leer como CSV: Quote Not
Closed: the parsing is finished with an opening quote at line 3"`; el CSV
válido de antes sigue funcionando idéntico; `test/back-office.test.js`
(8/8) sigue en verde.

### Segundo bug real, con el error ya legible (5 de agosto de 2026)

Con el `400` ya mostrando el mensaje real, el usuario probó con su propio
archivo y obtuvo `"Invalid Record Length: columns length is 1, got 2 on
line 2"` — su CSV real usa `;` como separador (Excel en español/locale
República Dominicana exporta así, porque `,` es el separador decimal),
pero el parser solo aceptaba `,`. **Corregido:** `parse()` ahora recibe
`delimiter: [',', ';']`, que hace que `csv-parse` detecte automáticamente
cuál de los dos usa el archivo — verificado con un CSV real separado por
`;` (lo procesa igual que uno por `,`) y con la suite de regresión
(`test/back-office.test.js`, 8/8) sin romperse.

**Objetivo:** el cuarto cliente real, mismo stack que los Sprints 10/11/12
(React + TS + Vite + Tailwind + TanStack Query + React Router, dentro del
mismo `frontend/`). Le da a plataforma (`admin@plataforma.demo`) lo que
hoy solo puede hacer por `curl`: dar de alta una empresa nueva, cargar sus
colaboradores desde un CSV real, y gestionar sus contratos con
suplidores.

**De dónde sale el diseño:** `portal-backoffice-onboarding.html`, leído
completo antes de escribir este plan. Comparte el mismo sistema de diseño
que los mockups anteriores. Tres vistas: `vEmpresas` (lista), `vOnboarding`
(alta en 3 pasos: datos → cargar CSV → revisar e importar) y `vDetalle`
(contratos con suplidores, ajuste de precio por slider).

**Importante — qué NO es este mockup:** igual que los anteriores, simula
todo en memoria (`S.empresas`), incluida la carga de CSV ("haz clic para
simular la carga" en vez de un selector de archivo real). Se descarta el
motor, se conserva el diseño visual y el copy.

### Discrepancias reales encontradas leyendo el mockup contra el backend ya construido

1. **No existe `GET /suplidores` (ni nada parecido).** El mockup asume una
   lista fija (`SUPLIDORES`, la misma constante compartida con los otros
   dos mockups) para el selector de "agregar suplidor" en `vDetalle`. El
   backend real nunca expuso un endpoint para listar suplidores desde
   ningún ámbito — ni siquiera plataforma. Sin esto, la pantalla de
   contratos no tiene forma de saber qué suplidores existen para
   ofrecerlos. Se agrega `GET /back-office/suplidores` (subsprint 13.1),
   documentado antes de construirse, mismo patrón que los backends chicos
   de los Sprints 11 y 12.
2. **La carga de CSV es real, no una simulación de un clic.** El backend
   ya soporta `multipart/form-data` desde el Sprint 2 (`multer`, ya
   parcheado a 2.x) — a diferencia del campo de imagen del suplidor
   (Sprint 11), aquí no hace falta ningún servicio externo: el archivo se
   parsea en memoria y nunca se guarda en disco, así que tampoco choca con
   la limitación de disco efímero de Render que se documentó en esa
   conversación. Este sprint conecta un `<input type="file">` real al
   mismo `POST .../colaboradores/preview` / `.../importar` que ya existe.
3. **`punto_entrega` sigue sin CRUD — gap conocido, no bloqueante, no se
   resuelve aquí.** Ni el mockup ni el backend real gestionan puntos de
   entrega desde ninguna pantalla (se siembran directo en `scripts/seed.js`,
   igual que `programa_beneficio` estaba antes del Sprint 12). A
   diferencia de ese gap, este **no bloquea** el flujo: un punto de
   entrega desconocido en el CSV es una *alerta*, no un error — la fila se
   importa igual, solo queda sin punto asignado hasta que alguien lo
   corrija (mismo comportamiento ya documentado en el Sprint 2). Se deja
   anotado, no se construye sin que alguien lo pida — mismo criterio que
   el resto de gaps de este documento.
4. **El wizard de 3 pasos del mockup mapea 1 a 1 con los endpoints ya
   existentes**, sin necesitar diseño nuevo: paso 1 → `POST
   /back-office/empresas`; paso 2 → seleccionar archivo real; paso 3 →
   `POST .../colaboradores/preview` (nunca escribe) y, al confirmar,
   `POST .../colaboradores/importar`.

### Subsprint 13.1 — Backend chico: listar suplidores

`GET /back-office/suplidores` (`SUPERADMIN`/`SOPORTE`, ámbito PLATAFORMA)
— `id, nombre, rnc, estado`, sin filtros ni paginación (mismo criterio
minimalista que `GET /colaboradores` del Sprint 1: solo lo que la
pantalla necesita hoy).

### Subsprint 13.2 — Enrutamiento

`RolRouter` gana la rama de ámbito `PLATAFORMA` (`SUPERADMIN`/`SOPORTE`)
→ `BackOfficePage` nueva, con pestañas/vistas (mismo patrón que las
pantallas anteriores).

### Subsprint 13.3 — Lista de empresas y alta de empresa nueva

Lista de empresas (tarjetas, igual que `vEmpresas`) desde `GET
/back-office/empresas` (ya trae conteo de colaboradores y suplidores
activos). Wizard de 3 pasos real (discrepancia 4): datos → `POST
/back-office/empresas`; carga de CSV con `<input type="file">` real →
`POST .../colaboradores/preview` (tabla de revisión fila por fila, mismo
diseño que `vRevisionCSV`) → confirmar → `POST .../colaboradores/importar`.

### Subsprint 13.4 — Detalle de empresa y contratos

Vista de detalle (igual que `vDetalle`): contratos existentes con
`GET .../contratos`, slider de ajuste de precio y activar/desactivar vía
`PATCH /back-office/contratos/:id`, y "agregar suplidor" usando el
`GET /back-office/suplidores` nuevo (13.1) para ofrecer solo los que
todavía no tienen contrato con esa empresa.

### Fuera de alcance de este sprint (a propósito)

- CRUD de `punto_entrega` — ver discrepancia 3, gap conocido no
  bloqueante, no se construye aquí.
- Edición de una empresa ya creada (nombre, RNC, frecuencia de nómina) —
  ni el mockup ni el backend lo permiten hoy; solo alta y gestión de
  contratos.
- Reintentar la importación de un CSV con errores corregidos sin volver a
  empezar el wizard — el flujo siempre es "vuelve a cargar el archivo
  completo", igual que el mockup.

**Criterio de cierre:** con la API real corriendo y el frontend en modo
dev, un login real como `admin@plataforma.demo` completa de punta a
punta con clics reales: da de alta una empresa nueva, sube un CSV real de
colaboradores, revisa la tabla de errores/alertas, importa las filas
válidas, entra al detalle de la empresa, contrata un suplidor de la lista
real, ajusta su precio con el slider, y desactiva el contrato. Verificado
visualmente por el usuario en su navegador.

---

## Sprint 14 — Dashboard de plataforma ✅ CONFIRMADO

**Estado: cerrado y verificado.** Construido, verificado de extremo a
extremo por Claude, y **confirmado por el usuario en su propia máquina el
6 de agosto de 2026** con clics reales en `localhost:5176`
(`admin@plataforma.demo`) — pestañas "Panel de plataforma" y
"Trazabilidad" (confirmó que el diseño append-only de esta última era
intencional, no una limitación por corregir).

**Verificado:**
1. `npm run migrate` aplicó la migración 16 sin errores (`configuracion_plataforma`,
   `pedido_evento` con sus 3 políticas RLS). `npm run build`/`npm run
   typecheck` limpios en backend y frontend.
2. Suite completa de regresión — los 10 archivos de test en verde, sin
   ninguna rotura por la instrumentación de las 9 transiciones de estado
   ni por las políticas RLS nuevas (`entrega-disputas.test.js`, que
   ejercita escrituras bajo ámbito SUPLIDOR, confirma que la política de
   `pedido_evento` para ese ámbito no bloquea nada).
3. Backend probado en vivo contra la API real: `GET
   /reportes/dashboard-plataforma` con datos reales (GMV, pedidos por
   estado, cobertura de menú de los dos suplidores sembrados); `GET`/`PUT
   /back-office/configuracion` (editar la tasa, verla reflejada,
   restaurada a 0 después); y un pedido de prueba real recorrido de
   punta a punta (`preparar → entregar → confirmar-recibido`) con `GET
   /reportes/trazabilidad` mostrando las 3 transiciones exactas, actor
   correcto en cada una (`SUPLIDOR`, `SUPLIDOR`, `COLABORADOR`).

**Nota real encontrada durante la verificación, no un bug de este
sprint:** el programa de beneficio de Futuro ARS (`Almuerzo Futuro ARS`,
id 1) estaba `INACTIVO` en la base — efecto colateral de tus propias
pruebas del Sprint 12 (activar/desactivar), no algo que este sprint
tocara. Lo reactivé para poder completar la verificación (una empresa
real no puede quedar sin que nadie pueda pedir). Si lo desactivaste a
propósito, avísame y lo dejamos como estaba.

**Pendiente, tuyo:** entrar como `admin@plataforma.demo` en
`localhost:5176`, pestañas "Panel de plataforma" (las 5 métricas, edita
la tasa de comisión) y "Trazabilidad" (historial real de un pedido).

**Objetivo:** el panel de métricas de plataforma (`admin@plataforma.demo`)
que hasta ahora no existe — GMV confirmado, ingreso propio de la
plataforma, aporte de las empresas, cobertura de menú publicado por
suplidor, pedidos por estado — más una pestaña de trazabilidad con el
historial de cada cambio de estado de un pedido.

**De dónde sale el diseño:** la pestaña `vPlat()` (panel de métricas) y
`vLog()` (trazabilidad) dentro de `mockup-plataforma-almuerzo.html`.

**Dos decisiones de negocio reales, resueltas con el usuario el 6 de
agosto de 2026 (no solo de UI — cambian lo que el sistema hace, no solo
cómo se ve):**

1. **Comisión de plataforma — sí se construye, con alcance acotado a
   propósito.** El Sprint 7 decidió explícitamente que la plataforma no
   se queda con ningún porcentaje ("el precio ya ajustado es exactamente
   lo que se le debe al suplidor... no hay una comisión de plataforma
   separada"). Esa decisión **no se reabre aquí**: se agrega una tasa de
   comisión configurable por plataforma (`configuracion_plataforma`,
   fila única), pero se usa **únicamente** para calcular la tarjeta
   informativa "Ingreso propio" del dashboard — un estimado de reporte,
   no un cobro real. La liquidación a suplidores (Sprint 7) sigue
   pagando el 100% de `total_bruto` ajustado, sin descuento. Si algún
   día se decide cobrar la comisión de verdad, es un cambio al motor de
   liquidaciones (Sprint 7), no a este dashboard — se documenta aquí
   para que la distinción quede explícita y nadie asuma que ya se está
   cobrando.
2. **Trazabilidad — sí se construye, tabla `pedido_evento` nueva.**
   Instrumenta las 9 transiciones de estado de pedido que ya existen en
   `pedidos.controller.ts` (crear, cancelar, preparar, entregar, no
   entregado, confirmar recibido, disputar, resolver disputa ×2, y la
   resolución perezosa por silencio — que puede afectar varios pedidos
   en una sola llamada). No reemplaza `movimiento` (Sprint 6, sigue
   siendo la fuente de verdad del dinero) — este es un log paralelo de
   *estado*, no de *dinero*.

### Subsprint 14.1 — Backend: configuración de plataforma y comisión

Migración: tabla `configuracion_plataforma` (fila única, `id SMALLINT
PRIMARY KEY DEFAULT 1 CHECK (id = 1)`, `tasa_comision_pct NUMERIC(5,2)
NOT NULL DEFAULT 0 CHECK (BETWEEN 0 AND 100)`, `actualizado_en`). RLS
activado sin ninguna política (mismo "falla cerrado" ya documentado en
`CLAUDE.md`) — solo `almuerzo_platform` (`BYPASSRLS`) puede tocarla, a
propósito: no es una tabla de tenant, es configuración global de
plataforma.

- `GET /back-office/configuracion` / `PUT /back-office/configuracion`
  (`SUPERADMIN`/`SOPORTE`) — ver y editar `tasaComisionPct`.

### Subsprint 14.2 — Backend: `pedido_evento` e instrumentación

Migración: tabla `pedido_evento` (`id`, `pedido_id`, `empresa_id`
denormalizado — mismo patrón que `pedido_linea`, `estado_anterior`
nullable, `estado_nuevo`, `actor` — `COLABORADOR`/`SUPLIDOR`/`RRHH`/
`SILENCIO`, `creado_en`). RLS: política de `SELECT`/`INSERT` para ámbito
EMPRESA (`empresa_id = app.empresa_id`, cubre crear/cancelar/confirmar/
disputar/resolver-disputa/silencio — todas corren bajo ese ámbito), más
una política de `INSERT` para ámbito SUPLIDOR con el mismo `EXISTS`
contra `contrato_suplidor` que ya usa la migración 0008 (cubre preparar/
entregar/no-entregado).

Se instrumentan las 9 transiciones ya existentes en
`pedidos.controller.ts`, cada una con un `INSERT INTO pedido_evento`
justo después de su `UPDATE`/`INSERT` ya existente (reutilizando el
`RETURNING` que la mayoría ya tiene, sin una segunda consulta):
`crearPedido` (creación, `estado_anterior` nulo), `cancelarPedido`,
`prepararPedido`, `entregarPedido`, `marcarNoEntregado`,
`confirmarRecibido`, `disputar`, `resolverDisputa` (sus dos ramas), y
`resolverPorSilencio` (recorre el `RETURNING` de su `UPDATE` masivo e
inserta un evento por cada pedido afectado, ya que un solo `UPDATE`
perezoso puede resolver varios pedidos a la vez).

### Subsprint 14.3 — Backend: endpoint del dashboard

`GET /reportes/dashboard-plataforma` (`SUPERADMIN`/`SOPORTE`,
`src/reportes/reportes.controller.ts`): GMV confirmado y cantidad de
pedidos `RECIBIDO`, aporte total de las empresas (`subsidio_empresa` de
esos mismos pedidos), ingreso propio (`gmv × tasaComisionPct / 100`,
leyendo `configuracion_plataforma`), pedidos por estado (agregado de
toda la plataforma), y cobertura de menú publicado por suplidor
(próximos 10 días hábiles — sin feriados por empresa, es una métrica
agregada de plataforma, no de una empresa en particular; simplificación
consciente, documentada aquí, no silenciosa).

`GET /reportes/trazabilidad?desde=&hasta=` (`SUPERADMIN`/`SOPORTE`) —
lista `pedido_evento` más reciente primero (con empresa y fecha de
servicio del pedido), limitado a 200 filas — mismo criterio que `GET
/nomina/movimientos` del Sprint 12.

### Subsprint 14.4 — Frontend

Dos pestañas nuevas en `BackOfficePage` (Sprint 13): "Panel de
plataforma" (las 5 tarjetas/secciones de `vPlat`) y "Trazabilidad" (tabla
de `vLog`). Ámbito ya cubierto — `BackOfficePage` solo lo ve
`SUPERADMIN`/`SOPORTE`.

### Fuera de alcance de este sprint (a propósito)

- Cobrar la comisión de verdad (descontarla en la liquidación a
  suplidores, Sprint 7) — ver decisión 1 arriba, es un cambio distinto,
  no se toca aquí.
- Trazabilidad de otras entidades (contratos, leads, ciclos de nómina) —
  solo pedidos, que es lo que pedía el mockup original.
- Editar o revertir un evento de `pedido_evento` — es un log, append-only
  por diseño, mismo criterio que `movimiento` (Sprint 6).

**Criterio de cierre:** con la API real corriendo, `admin@plataforma.demo`
ve el panel de plataforma con las 5 métricas reales (no simuladas), edita
la tasa de comisión y ve "Ingreso propio" recalcularse, y en
"Trazabilidad" ve el historial real de transiciones de un pedido de
prueba de principio a fin (creado → confirmado → preparación → entregado
→ recibido). Verificado visualmente por el usuario en su navegador.

---

## Sprint 15 — Recorrido de extremo a extremo del sistema terminado ✅ CONFIRMADO

**Estado: cerrado y verificado.** `RECORRIDO-FINAL.md` escrito y
verificado de extremo a extremo por Claude contra la API real, y
**confirmado por el usuario en su propia máquina el 6 de agosto de
2026** recorriéndolo con clics reales en `localhost:5176`.

**Verificado en vivo, la cadena completa, encadenada como un solo flujo
(no piezas sueltas):** 2 pedidos reales creados por la colaboradora →
ambos preparados y entregados por el suplidor → uno confirmado, el otro
disputado → disputa resuelta a favor del colaborador por RRHH → ciclo de
nómina cerrado sin bloqueos → archivo de descuento descargado (CSV real,
monto correcto) → liquidación al suplidor calculada y marcada pagada →
dashboard de plataforma reflejando el GMV actualizado → trazabilidad
mostrando las 9 transiciones exactas de los dos pedidos, actor correcto
en cada una, incluida la creación (a diferencia de la verificación del
Sprint 14, esta vez los pedidos se crearon íntegramente dentro de la
sesión ya instrumentada).

**Hallazgo real durante la verificación, cambió el diseño del
escenario:** no existe ningún endpoint que cree un usuario con membresía
para una empresa nueva — `POST /auth/registro` solo crea un usuario
suelto, sin membresía (confirmado leyendo `auth.service.ts`). Es
exactamente el gap ya documentado ("Recuperación de contraseña e
invitación por correo"), pero verlo bloquear un intento real de armar
este recorrido lo confirma como un bloqueo concreto, no solo teórico: no
hay forma de que una empresa recién creada por back office tenga RRHH
operando en la app sin sembrar el usuario a mano. Por eso el documento
separa la demostración de "alta de empresa" (aislada, con esta
limitación explicada ahí mismo) del período recurrente (que usa Futuro
ARS, con logins reales).

**Dato de limpieza — resuelto el 6 de agosto de 2026:** el recorrido de
verificación había dejado 2 pedidos reales (152 y 153, diciembre 2026,
fechas elegidas porque las cercanas ya estaban ocupadas por pruebas de
sprints anteriores), un ciclo de nómina cerrado (id 75) y una
liquidación pagada al suplidor (lote_pago_suplidor id 31) — todo con
dinero de prueba. A pedido explícito del usuario, se borraron de la
base real (transacción única: pedido, pedido_linea, pedido_evento,
movimiento, ciclo_nomina, lote_pago_suplidor, y los 4 registros de
`notificacion_enviada` ligados) y se verificó que no quedó rastro.
Suite de regresión (`reportes.test.js`, `nomina.test.js`) corrida de
nuevo después del borrado, sin romperse.

**Pendiente, tuyo:** recorrer `RECORRIDO-FINAL.md` completo en tu
navegador, y anotar cualquier ajuste chico o cambio de frontend en su
sección final.

**Objetivo:** un documento nuevo, `RECORRIDO-FINAL.md`, que recorre **un
período completo de nómina** como una sola historia continua — no
fragmentada por sprint como `PLAN-PRUEBAS.md` — pasando por los 4 roles
con frontend (back office, RRHH, suplidor, colaborador) en el orden en
que ocurrirían en la vida real, y terminando en el cierre del ciclo y la
liquidación al suplidor. Es la demostración del producto terminado, no
una lista de verificación técnica — pensado para que el usuario lo
recorra con clics reales en su navegador y, en cada paso, pueda pedir un
ajuste chico o un cambio de frontend si algo no se ve o no se siente
como debería.

**Diferencia real con lo que ya existe:** `PLAN-PRUEBAS.md` (y
`scripts/prueba-e2e.js`) verifican que cada pieza funciona, sprint por
sprint, con pasos técnicos y resultados esperados puntuales.
`RECORRIDO-FINAL.md` cuenta una sola historia de negocio de principio a
fin — una empresa nueva contrata la plataforma, sus colaboradores piden
almuerzo durante un período completo, algo sale mal y se resuelve, y al
cerrar el período el dinero se mueve correctamente en ambas direcciones
(descuento a colaboradores, pago al suplidor). No reemplaza a
`PLAN-PRUEBAS.md`, lo complementa desde un ángulo distinto.

**Escenario elegido** (para que el recorrido sea concreto, no abstracto):
una empresa nueva ("Café del Puerto", ficticia) contrata a Cocina Criolla
del Este (el suplidor ya sembrado, con catálogo y menú reales) — así el
recorrido ejercita el alta real de una empresa de principio a fin, sin
tener que además construir un catálogo de suplidor desde cero.

### Subsprint 15.1 — Escribir el documento

Estructura narrativa, un capítulo por hito del período (no por sprint):
1. Back office da de alta la empresa nueva (Sprint 13).
2. RRHH carga sus colaboradores por CSV (Sprint 16, autoservicio) y
   configura su programa de beneficio, asignándolo a cada colaborador
   (Sprint 12).
3. El suplidor solicita el contrato con la empresa nueva por RNC (Sprint
   17) y back office lo aprueba — camino alternativo documentado: back
   office también podría contratarlo directo (Sprint 13); se recorre el
   de solicitud porque ya no se había probado de punta a punta enlazado
   con una alta de empresa real.
4. El suplidor publica el menú de la semana (Sprint 11) sobre su
   plantilla ya existente.
5. Varios colaboradores piden almuerzo en distintos días (Sprint 10).
6. El suplidor prepara y entrega los pedidos (Sprint 11).
7. Los colaboradores confirman recepción — uno de ellos reporta un
   problema real (Sprint 10) en vez de confirmar.
8. RRHH resuelve la disputa (Sprint 12).
9. RRHH cierra el ciclo de nómina y descarga el archivo de descuento
   (Sprint 12).
10. Back office calcula la liquidación del suplidor para el período y la
    marca pagada (backend del Sprint 7, sin frontend propio — se hace
    por `curl`, anotado explícitamente como el único tramo que no tiene
    pantalla todavía, gap real, no se construye aquí sin que se pida).
11. Plataforma revisa el panel (Sprint 14): el GMV, el aporte de la
    empresa, y la cobertura de menú ya reflejan lo que pasó; en
    "Trazabilidad", el historial completo de uno de los pedidos.

Cada paso indica el rol, la pantalla exacta, qué hacer clic, y qué
esperar ver — igual de concreto que `PLAN-PRUEBAS.md`, pero contado como
una sola historia. Al final del documento, una sección abierta para que
el usuario anote ajustes chicos o cambios de frontend pedidos durante el
recorrido, con espacio para que Claude los resuelva uno por uno después.

### Subsprint 15.2 — Verificación previa de Claude

Antes de entregar el documento, se recorre el mismo escenario contra la
API real (no simulado) — mismo criterio de todo el proyecto: no se
entrega un documento sin haber confirmado que cada paso realmente
funciona encadenado con el anterior. Las piezas individuales ya se
verificaron en cada sprint; lo nuevo aquí es confirmar que **componen**
sin fricción como un solo flujo continuo, con una empresa creada desde
cero (no reusando datos ya sembrados).

### Fuera de alcance de este sprint (a propósito)

- Automatizar este recorrido como test (`scripts/prueba-e2e.js` ya cubre
  el camino técnico; este documento es para que lo recorra una persona,
  no una máquina).
- Construir el frontend de liquidación a suplidores — sigue sin
  pantalla, gap real anotado en el paso 10, no se resuelve en este
  sprint sin que se pida.
- Demostrar en vivo la resolución por silencio (requiere que pase la
  ventana de confirmación real, horas de espera) — se anota como
  variante opcional del recorrido, no como paso obligatorio.

**Criterio de cierre:** `RECORRIDO-FINAL.md` existe, fue recorrido por
Claude contra la API real de punta a punta sin encontrar un paso que no
funcione, y el usuario lo recorre con clics reales en su navegador,
confirmando que el período completo (alta → pedidos → disputa →
resolución → cierre → liquidación → dashboard) se sostiene como una sola
historia coherente.

---

## Sprint 16 — Autoservicio de RRHH: carga de colaboradores ✅ CONFIRMADO

**Estado: cerrado y verificado.** Construido, verificado de extremo a
extremo por Claude, y **confirmado por el usuario en su propia máquina el
5 de agosto de 2026** con clics reales en `localhost:5176`
(`rrhh@futuroars.demo`) — incluidos dos bugs reales de más encontrados y
corregidos con su archivo real durante la prueba (formato de monto
español, ver más abajo) y un ajuste visual propio conservado (estilos de
la tabla de revisión en `ColaboradoresTab.tsx`).

**Verificado:**
1. `npm run build` (backend) y `npm run typecheck && npm run build`
   (frontend) — ambos limpios. Sin migración nueva.
2. Suite completa de regresión — los 10 archivos de test en verde,
   incluido `test/back-office.test.js` (prueba el motor de importación
   ahora extraído a `importar-colaboradores.ts`) sin ninguna rotura por
   el refactor.
3. Backend nuevo probado en vivo contra la API real: `rrhh@futuroars.demo`
   subió un CSV real (mismo archivo separado por `;` que expuso el bug
   del Sprint 13) a `POST /colaboradores/preview` — sin `empresaId` en la
   URL, tomado del ámbito del token — con el resultado esperado
   (`conAlerta=1`); `POST /colaboradores/importar` insertó el colaborador
   de verdad, confirmado apareciendo en `GET /colaboradores`. Dato de
   prueba limpiado después.

**Pendiente, tuyo:** entrar como `rrhh@futuroars.demo` en
`localhost:5176`, pestaña "Cargar colaboradores", y subir un CSV real con
clics reales.

### El motor de importación se endureció más, con tu propio archivo real (5 de agosto de 2026)

Con los dos bugs del Sprint 13 ya corregidos, tu archivo real siguió
exponiendo fricción — el motor de importación (`csv-colaboradores.ts`,
compartido por el Sprint 13 y este) se endureció dos veces más el mismo
día, una por ti y otra por mí:

- **Detección de delimitador y normalización de encabezados** (tu propio
  cambio, no reviertido): `detectarDelimitadorCsv` cuenta `;` vs `,` en
  las primeras líneas en vez de exigir uno fijo, y `normalizarCabecera`
  acepta variantes reales de columna (`Código de Nómina`, `correo
  electrónico`, `Punto de Entrega`, con/sin tilde, mayúsculas/minúsculas)
  en vez de exigir el nombre exacto `codigo_nomina`.
- **`salario_neto` con formato español o símbolo de moneda — bug real,
  corregido por Claude.** Tu archivo trae montos como `35.000,00` (punto
  de millar, coma decimal — formato de Excel en español) o con `RD$`
  delante; `Number()` de JavaScript no entiende ninguno de los dos, y
  aunque la validación los aceptara, el `INSERT` a la columna `NUMERIC`
  de Postgres habría fallado igual con la coma sin limpiar. Nueva función
  pura `normalizarMonto()` — distingue formato español (`35.000,00`) de
  formato dominicano/US (`35,000.00`) mirando cuál separador aparece
  último, quita símbolos de moneda y espacios, y dentro de
  `validarCsvColaboradores` sobrescribe `fila.datos.salario_neto` con el
  valor ya limpio, para que la importación real use el mismo número que
  ya se validó. Verificado con 9 formatos distintos
  (`35.000,00`, `35,000.00`, `35000`, `35000.50`, `35,50`, `35.50`,
  `1.234.567,89`, `RD$35,000.00`, `" 42000 "`) y en vivo contra la API
  real (preview e importación real, `INSERT` exitoso); `cédula` y `punto
  de entrega` se revisaron aparte y **no son bugs**: una cédula de 9
  dígitos es un dato real inválido (probable pérdida de ceros a la
  izquierda al editar en Excel — se explica al usuario, no se afloja la
  validación de un documento de identidad), y un punto de entrega
  desconocido ya era una alerta no bloqueante, funcionando como se
  diseñó desde el Sprint 2.
- Suite de regresión (`test/back-office.test.js`, 8/8) sin romperse por
  ninguno de los dos cambios.

**Origen:** decisión de negocio 1 de `nuevo_contrato.md` (5 de agosto de
2026, discutida por el usuario en paralelo mientras se construía el
Sprint 13). **Disparador:** el volumen de altas de empresa va a crecer
más rápido de lo que el usuario puede sostener manualmente subiendo cada
CSV por su cuenta.

**Objetivo:** que RRHH pueda subir el CSV de sus propios colaboradores
desde su panel (Sprint 12), sin pedirle a plataforma que lo haga por
`curl` o desde el back office (Sprint 13) — mismas reglas de validación,
mismo formato de archivo, mismo comportamiento de preview/importar que ya
existen, sin duplicar ese motor.

**Verificado antes de documentar esto:** no existe en absoluto — ver la
tabla de verificación de la conversación. Solo `BackOfficeController`
(ámbito PLATAFORMA) puede subir CSV hoy.

**No afecta al Sprint 13 (back office) ni lo reemplaza.** Back office
sigue pudiendo cargar colaboradores de cualquier empresa (útil para
soporte, corrección de errores, empresas sin RRHH todavía activo) — este
sprint agrega un segundo camino, no quita el primero.

### Subsprint 16.1 — Extraer el motor de importación a funciones reusables

Hoy la lógica vive parcialmente como métodos privados de
`BackOfficeController` (`puntosValidosDe`, `mapaPuntosDe`,
`resumenDeFilas`, `obtenerContenidoCsv`, `parsearOFallar`) — atados a
`Request`, no reusables desde otro controlador tal cual. Se mueven a
funciones puras en `src/back-office/csv-colaboradores.ts` (que ya exporta
`validarCsvColaboradores`), recibiendo `dbClient`/`empresaId` como
parámetros explícitos en vez de leerlos de `req`. `BackOfficeController`
pasa a ser un consumidor de esas funciones, igual que el nuevo endpoint
de RRHH — sin lógica duplicada entre los dos.

### Subsprint 16.2 — Endpoints bajo ámbito EMPRESA

En `IdentidadController` (`@Controller('colaboradores')`, ya
`@Roles('RRHH','ADMIN_EMPRESA')` en su único método hoy):
- `POST /colaboradores/preview` — mismo contrato de respuesta que el de
  back office, pero **sin** `:empresaId` en la URL — se toma de
  `req.ambito!.id` (ámbito EMPRESA, ya resuelto por
  `TenantContextInterceptor`). RLS de `almuerzo_app` garantiza que RRHH
  jamás pueda escribir colaboradores de otra empresa, aunque el código
  tuviera un bug — no hace falta un chequeo manual adicional.
- `POST /colaboradores/importar` — igual.

### Subsprint 16.3 — Frontend: pestaña de carga en el panel de RRHH

Nueva pestaña o sección en `RrhhPage` (Sprint 12) reusando el mismo
patrón visual del wizard de back office (paso de subir archivo → tabla de
revisión con errores/alertas → confirmar importación) — sin el paso de
"datos de la empresa" (RRHH ya tiene una, es la suya).

**Criterio de cierre:** con la API real corriendo, un login real como
`rrhh@futuroars.demo` sube un CSV real desde su propio panel, ve la misma
tabla de revisión que back office, importa, y los colaboradores nuevos
aparecen en `GET /colaboradores` — todo sin que `admin@plataforma.demo`
haya intervenido.

---

## Sprint 17 — Relación comercial suplidor-empresa ✅ CONFIRMADO

**Estado: cerrado y verificado.** Construido, verificado de extremo a
extremo por Claude, y **confirmado por el usuario en su propia máquina el
6 de agosto de 2026** con clics reales en `localhost:5176` — incluido un
bug real encontrado y corregido durante la prueba (búsqueda de RNC por
texto exacto, ver más abajo).

**Verificado:**
1. `npm run migrate` aplicó la migración 15 sin errores (2 estados nuevos
   en `contrato_suplidor`, RLS de escritura para el suplidor, tabla
   `lead_comercial` nueva). `npm run build`/`npm run typecheck` limpios
   en backend y frontend.
2. Suite completa de regresión — los 10 archivos de test en verde, sin
   ninguna rotura por este sprint.
3. Backend probado en vivo contra la API real, endpoint por endpoint:
   `POST /catalogo/contratos/solicitar` (creación en `PENDIENTE`, rechazo
   por contrato ya activo, rechazo por solicitud ya pendiente, rechazo
   por RNC inexistente con el mensaje que sugiere registrar un lead),
   `PATCH /back-office/contratos/:id/aprobar` (pasa a `ACTIVA`, un
   segundo intento da `404`), `PATCH .../rechazar` (pasa a `RECHAZADA`),
   `POST`/`GET /catalogo/leads` (crear y listar los propios),
   `GET /back-office/leads` (bandeja), `PATCH .../convertido` (vincula
   `empresa_id`, un segundo intento da `404`). **Los datos de prueba se
   limpiaron después** (lead y empresa de prueba eliminados, los dos
   contratos usados para probar restaurados a su `ajuste_pct`/`estado`
   original) para no contaminar el seed.

**Pendiente, tuyo:** entrar como `suplidor@cocinacriolla.demo` en
`localhost:5176`, pestaña "Relación comercial", solicitar un contrato con
una empresa existente por RNC y registrar un lead; luego entrar como
`admin@plataforma.demo`, pestaña "Solicitudes y leads", aprobar/rechazar
la solicitud, y probar "Crear empresa desde este lead" (llega al wizard
de alta con nombre/RNC prellenados; el lead queda convertido al terminar
de importar los colaboradores).

### Bug real encontrado y corregido, al probarlo tú en el navegador (6 de agosto de 2026)

Solicitar un contrato con el RNC `130552117` (Grupo Vantia, sin guiones)
devolvía "No existe ninguna empresa con ese RNC" — la empresa sí existe,
guardada como `130-55211-7`. `solicitarContrato` comparaba el RNC como
texto exacto, así que cualquier diferencia de formato (con/sin guiones)
rompía la búsqueda aunque fuera el mismo número. Corregido en
`src/catalogo/catalogo.controller.ts`: la consulta ahora compara solo
dígitos en los dos lados (`regexp_replace(rnc, '\D', '', 'g')`), mismo
criterio de tolerancia a formato ya aplicado en el motor de CSV (Sprint
13/16). Verificado en vivo con el RNC exacto reportado: ahora encuentra
la empresa correctamente (pasa a rechazar por "ya existe un contrato
activo", la razón real, en vez del falso "no existe"). Suite de
regresión (`catalogo.test.js`, `back-office.test.js`) sin romperse.

**Origen:** decisiones de negocio 2, 3 (confirmación) y 4 de
`nuevo_contrato.md` (5 de agosto de 2026). Mismo disparador que el Sprint
16: escalar la incorporación de empresas más allá de lo que plataforma
puede sostener a mano — aquí, dejando que el suplidor inicie la relación
comercial, sin que eso signifique que el suplidor gane ningún poder que
hoy es exclusivo de back office.

**Decisión 3, confirmada, no reabierta:** un suplidor nunca crea una
empresa, ni directo ni con aprobación — ver la tabla de verificación de
la conversación. Nada de este sprint lo cambia: el suplidor **propone**
(solicitud de contrato, o un lead si la empresa ni siquiera existe en la
plataforma); **back office decide** en los dos casos.

**No afecta al Sprint 13 (back office) ni al Sprint 11 (suplidor) de
forma destructiva** — ver la respuesta completa en la conversación del 5
de agosto de 2026: el botón "Agregar suplidor" que ya existe en
`DetalleEmpresa` (creación directa por back office, `estado='ACTIVA'`)
sigue funcionando igual; este sprint agrega una bandeja de solicitudes
*aparte*, no lo reemplaza.

### Subsprint 17.1 — Estados nuevos de `contrato_suplidor`

Migración: `ALTER TABLE contrato_suplidor DROP CONSTRAINT ...` y
recrear el `CHECK` para admitir 4 estados: `PENDIENTE` (el suplidor lo
solicitó, nadie lo resolvió todavía), `ACTIVA` (vigente — igual que hoy),
`INACTIVA` (fue activo, se desactivó — igual que hoy), `RECHAZADA` (back
office lo rechazó explícitamente; se distingue de `INACTIVA` porque
nunca llegó a estar vigente, dato relevante para no confundir "lo
desactivamos" con "lo rechazamos de entrada"). Todo el código existente
(Sprints 4, 5, 7) ya filtra explícitamente por `estado = 'ACTIVA'` en
sus `EXISTS` — agregar dos valores nuevos al dominio no cambia ninguna
consulta existente, verificado al revisar cada uso antes de escribir
esto.

Nueva política RLS de escritura para el suplidor sobre `contrato_suplidor`
(hoy solo tiene `FOR SELECT`, migración 0009): `FOR INSERT WITH CHECK
(suplidor_id = current_setting('app.suplidor_id'))` — el suplidor puede
proponer un contrato con cualquier empresa, nunca en nombre de otro
suplidor. La aplicación, no la base, fuerza `estado = 'PENDIENTE'` en
cada solicitud nueva (el `WITH CHECK` no necesita validar el estado
porque el endpoint nunca acepta ese campo del body).

### Subsprint 17.2 — Endpoints del suplidor: solicitar contrato

`POST /catalogo/contratos/solicitar` (`SUPLIDOR_ADMIN`) — `{ rnc,
ajustePctPropuesto? }`. Busca la empresa por RNC (`empresa` no tiene RLS
propia — ya es así desde el Sprint 7, documentado en su momento — así que
esta búsqueda no necesita permiso nuevo). Si ya existe un contrato
`ACTIVA` o `PENDIENTE` con esa empresa, rechaza con mensaje claro (no se
duplica una solicitud ni se pisa un contrato ya vigente); si existe uno
`INACTIVA`/`RECHAZADA`, la nueva solicitud lo reemplaza (mismo patrón
`ON CONFLICT (empresa_id, suplidor_id)` que ya usa
`back-office.controller.ts`, ahora también disponible al suplidor gracias
a la política de 17.1) con `estado = 'PENDIENTE'`.

### Subsprint 17.3 — Endpoints de back office: aprobar/rechazar

`GET /back-office/solicitudes-contrato` (`SUPERADMIN`/`SOPORTE`) — todas
las filas `PENDIENTE`, con nombre de empresa y de suplidor. `PATCH
/back-office/contratos/:id/aprobar` → `estado = 'ACTIVA'` (el ajuste de
precio se puede corregir antes o después con el `PATCH
/back-office/contratos/:id` que ya existe — no hace falta un campo nuevo
para esto). `PATCH /back-office/contratos/:id/rechazar` → `estado =
'RECHAZADA'`.

### Subsprint 17.4 — Lead comercial

Tabla nueva `lead_comercial`: `id`, `suplidor_id`, `nombre_propuesto`,
`rnc_propuesto` (nullable — el suplidor puede no conocerlo), `contacto`,
`mensaje`, `estado` (`PENDIENTE`|`CONVERTIDO`), `empresa_id` (nullable,
se llena solo al convertir), `creado_en`. RLS: el suplidor ve/crea los
suyos; plataforma los ve todos (bypass, igual que el resto del back
office).

- `POST /catalogo/leads` (`SUPLIDOR_ADMIN`) — solo una nota, no crea
  ninguna empresa ni contrato — coincide con la decisión 4 tal cual se
  planteó.
- `GET /catalogo/leads` (`SUPLIDOR_ADMIN`) — los propios.
- `GET /back-office/leads` (`SUPERADMIN`/`SOPORTE`) — bandeja de
  pendientes.
- `PATCH /back-office/leads/:id/convertido` — marca `CONVERTIDO` y fija
  `empresa_id`, llamado por el frontend después de que el wizard de alta
  (Sprint 13) termina de crear la empresa.

### Subsprint 17.5 — Frontend: suplidor

Nueva pestaña en `SuplidorPage` (Sprint 11) — dos formularios simples:
"Solicitar contrato" (RNC + ajuste propuesto) y "Registrar lead"
(nombre/contacto/mensaje). Sin tabla de estado sofisticada — el suplidor
ve si su solicitud sigue `PENDIENTE`, se aprobó o se rechazó, nada más.

### Subsprint 17.6 — Frontend: back office

Nueva pestaña en `BackOfficePage` (Sprint 13) — "Solicitudes y leads":
lista de contratos `PENDIENTE` con botones aprobar/rechazar, y bandeja de
leads con botón "Crear empresa desde este lead" que abre el
`OnboardingWizard` ya existente con `nombre`/`rnc` prellenados desde el
lead (si el lead no traía RNC, el campo queda vacío para completarlo a
mano — el wizard no cambia su validación). Al terminar el wizard con
éxito, dispara `PATCH /back-office/leads/:id/convertido` automáticamente.

### Fuera de alcance de este sprint (a propósito)

- Que el suplidor pueda editar su propuesta ya enviada, o retirarla —
  vuelve a solicitar y el `ON CONFLICT` la reemplaza; no hace falta un
  endpoint separado de "editar solicitud".
- Notificación por email de solicitud aprobada/rechazada — mismo patrón
  que ya existe para disputas (Sprint 9), se agregaría como un
  disparador más de `enviarNotificacion()`, pero no es parte de este
  sprint a menos que se pida.

**Criterio de cierre:** con la API real corriendo, un suplidor
(`suplidor@cocinacriolla.demo`) solicita un contrato con una empresa
existente por RNC, back office lo ve en la bandeja y lo aprueba (pasa a
`ACTIVA`, el colaborador ya puede pedir con ese suplidor); un segundo
suplidor registra un lead con una empresa nueva, back office lo ve, hace
clic en "Crear empresa desde este lead", el wizard llega con los datos
prellenados, y al confirmar la importación el lead queda `CONVERTIDO`.

---

### Bug de proceso real, encontrado al armar el snapshot de este sprint (6 de agosto de 2026)

El script que arma cada `.zip` de `versiones/` copiaba `frontend/`
completo con `-Recurse` en su primer bucle (antes de que el segundo
bucle, pensado para excluir `node_modules`/`dist` de esa carpeta,
llegara a correr) — el filtro nunca alcanzaba a tiempo. Resultado real:
los 4 snapshots ya tomados en esta sesión (`sprint-10-11`, `sprint-12`,
`sprint-13`, `sprint-16`) tenían `frontend/node_modules` y `frontend/dist`
adentro — ~97% de cada archivo, ~20× más grandes de lo necesario,
contradiciendo la propia documentación de `versiones/README.md` ("sin
node_modules, dist, ni .env"). No corrompía la restauración (`npm
install` los regenera igual), pero era información falsa. Corregido
excluyendo `frontend` también del bucle principal (se copia aparte, con
su propia exclusión, que si se aplica a tiempo). Por decisión del
usuario, los 4 snapshots inflados se borraron (no se pueden reconstruir
limpios de forma retroactiva sin git) — el de este sprint los reemplaza,
verificado con 0 entradas de `node_modules`/`dist` antes de darlo por
bueno.

## Sprint 18 — Invitación de usuarios ✅ CONFIRMADO

**Estado: cerrado y verificado.** Construido, verificado de extremo a
extremo por Claude, y **confirmado por el usuario en su propia máquina
el 6 de agosto de 2026** con clics reales en `localhost:5176`.

**Verificado:**
1. `npm run migrate` aplicó la migración 17 sin errores (tabla
   `invitacion`, sin RLS). `npm run build`/`npm run typecheck` limpios en
   backend y frontend.
2. Suite completa de regresión — los 10 archivos de test en verde.
3. Backend probado en vivo, los dos caminos completos: **(a)** back
   office invita a un RRHH para Grupo Vantia → acepta con contraseña →
   login funcional (vía el token que ya trae ámbito, y vía `/auth/login`
   normal después) → ve exactamente los datos de esa empresa (RLS
   correcto); reintentar aceptar la misma invitación se rechaza con
   `400`. **(b)** RRHH invita a Luis Fermín (colaborador real del seed,
   sin cuenta) → acepta → puede consultar `GET
   /pedidos/menu-disponible` (antes no podía loguearse en absoluto). Se
   verificó también que RRHH no puede invitar con un rol fuera de su
   alcance (`SUPLIDOR_ADMIN` rechazado con `400`). Datos de prueba
   limpiados después (usuarios, membresías e invitaciones de prueba
   eliminados; `colaborador.usuario_id` de Luis Fermín restaurado a
   `NULL`).

**Bug evitado antes de escribirlo, no encontrado después:** al diseñar
el `INSERT` de `membresia` en la aceptación, se detectó a tiempo que
haría falta el mismo manejo especial para ámbito `PLATAFORMA` que ya se
documentó como bug real en el Sprint 2 (`ambito_id` es `NULL` ahí, y
Postgres nunca trata dos `NULL` como iguales en un índice único) — se
replicó el mismo patrón de dos `INSERT` distintos que ya usa
`scripts/seed.js`, en vez de repetir el error original.

**Pendiente, tuyo:** como `admin@plataforma.demo`, pestaña "Usuarios",
invita a alguien real; como `rrhh@futuroars.demo`, pestaña "Cargar
colaboradores", invita a un colaborador sin cuenta. Con el link que
devuelve la pantalla (o el correo real, si configuraste
`RESEND_API_KEY`), acepta la invitación y confirma que el login
funciona.

**Objetivo:** cerrar el gap real confirmado al construir el Sprint 15 —
hoy no existe ningún endpoint que cree una `membresia` (rol + ámbito)
para un usuario. `POST /auth/registro` crea un usuario suelto, sin
ningún acceso; la única forma de darle un rol es insertarlo directo en
la base, algo que hasta ahora solo hacía `scripts/seed.js`. Sin esto,
una empresa nueva dada de alta por back office no tiene forma de que su
RRHH entre a la aplicación, y un colaborador cargado por CSV (Sprint
2/13/16) tampoco tiene forma de loguearse — mismo problema raíz, dos
síntomas.

**Verificado antes de documentar esto:** confirmado leyendo el código —
`grep "INSERT INTO membresia"` en todo `src/` no devuelve nada; el único
lugar que inserta una `membresia` en el proyecto entero es
`scripts/seed.js`. También confirmado que `colaborador.usuario_id` es
nullable — un colaborador importado por CSV existe sin usuario hasta que
alguien lo vincule.

### Subsprint 18.1 — Tabla `invitacion`

Migración: `invitacion` (`email`, `rol`, `ambito_tipo`, `ambito_id`
nullable, `colaborador_id` nullable — solo si `rol = 'COLABORADOR'`,
vincula a un colaborador ya importado sin `usuario_id`, `token` único,
`estado` `PENDIENTE`/`ACEPTADA`/`REVOCADA`, `creado_por`, `expira_en`).
**Sin RLS** — mismo criterio que `usuario`/`membresia`, que tampoco la
tienen: son tablas de identidad transversales, no datos de un tenant. La
autorización de quién puede invitar a quién se resuelve en el código de
la aplicación, no en la base.

### Subsprint 18.2 — Crear, listar y revocar (autenticado)

Controlador nuevo `InvitacionesController` (`src/invitaciones/`), sin
`@Roles` de clase — cada método declara el suyo, mismo patrón que
`PedidosController`:
- `POST /invitaciones` — quién puede invitar a quién, según el ámbito
  de quien invita:
  - Plataforma (`SUPERADMIN`/`SOPORTE`) — a cualquier rol/ámbito: RRHH o
    `ADMIN_EMPRESA` de cualquier empresa, `SUPLIDOR_ADMIN` de cualquier
    suplidor, o más `SUPERADMIN`/`SOPORTE`.
  - RRHH/`ADMIN_EMPRESA` — solo dentro de su propia empresa (el ámbito
    se toma del token, no se elige): más RRHH/`ADMIN_EMPRESA`, o un
    `COLABORADOR` — en ese caso exige `colaboradorId`, que debe existir,
    pertenecer a esa empresa (RLS ya lo garantiza al consultarlo con el
    ámbito del que invita) y no tener ya `usuario_id`.
  - `SUPLIDOR_ADMIN` — solo dentro de su propio suplidor: más
    `SUPLIDOR_ADMIN`.
- `GET /invitaciones` — las del ámbito propio (o todas, si plataforma).
- `PATCH /invitaciones/:id/revocar` — pasa a `REVOCADA`, ya no se puede
  aceptar.

### Subsprint 18.3 — Ver y aceptar (público, sin JWT)

- `GET /invitaciones/:token` — sin autenticación (quien recibe el
  correo todavía no tiene cuenta). Devuelve a qué rol/ámbito corresponde
  y si sigue vigente, para que el frontend lo muestre antes de pedir
  contraseña.
- `POST /invitaciones/:token/aceptar` — `{ password }`, sin
  autenticación. Usa `PG_POOL_PLATAFORMA` (`BYPASSRLS`) directo, no
  `req.dbClient` — no hay ámbito que fijar todavía, y la operación
  necesita escribir en `colaborador` (que sí tiene RLS) sin ningún GUC
  disponible; la autorización ya quedó resuelta al crear la invitación,
  aceptarla es solo materializarla. Si el email ya tiene un `usuario`,
  lo reutiliza (agrega una membresía más); si no, lo crea. Si
  `rol = 'COLABORADOR'`, además fija `colaborador.usuario_id`. Devuelve
  un `accessToken` con el ámbito ya elegido — mismo formato que `POST
  /auth/seleccionar-ambito` — para loguear automáticamente sin pedir la
  contraseña dos veces.

### Subsprint 18.4 — Email real

Reutiliza `enviarNotificacion()` (Sprint 9, Resend) con el link
(`${FRONTEND_URL}/invitacion/:token`) — mismo comportamiento ya
establecido si falta `RESEND_API_KEY` (queda `OMITIDA`, nunca bloquea).

### Subsprint 18.5 — Frontend: aceptar invitación

Página pública nueva, ruta `/invitacion/:token`, **fuera** de
`ProtectedRoute` (quien la visita no tiene sesión). Muestra a qué
rol/empresa corresponde, pide una contraseña, y al aceptar entra
directo a la aplicación — mismo comportamiento que loguearse.

### Subsprint 18.6 — Frontend: invitar

- Back office: pestaña nueva "Usuarios" — invitar RRHH/`ADMIN_EMPRESA`
  (con selector de empresa) o `SUPLIDOR_ADMIN` (con selector de
  suplidor).
- RRHH: dentro de la pestaña de colaboradores, cada colaborador sin
  `usuario_id` muestra un botón "Invitar".

### Fuera de alcance de este sprint (a propósito)

- Recuperación de contraseña ("olvidé mi contraseña") — es la otra
  mitad del gap ya documentado, pero un problema distinto (un usuario
  que ya existe pierde acceso, no uno que nunca tuvo cuenta); no se
  resuelve aquí sin que se pida.
- Que `SUPLIDOR_ADMIN` invite a alguien fuera de su propio suplidor, o
  que un `COLABORADOR` invite a alguien — no hay caso de negocio real
  para ninguno de los dos.
- Reenviar o expirar invitaciones automáticamente por un job — se
  revocan a mano si hace falta, mismo principio de "sin jobs en segundo
  plano" de todo el proyecto.

**Criterio de cierre:** con la API real corriendo, back office invita a
un RRHH para una empresa nueva (cierra exactamente el bloqueo encontrado
en el Sprint 15), el correo (u `OMITIDA` si no hay `RESEND_API_KEY`,
pero el link se puede copiar de la respuesta del endpoint) lleva a la
página de aceptar, la contraseña se define, y esa persona entra
funcionando como RRHH real de esa empresa. Por separado, RRHH invita a
un colaborador ya cargado por CSV sin login, y ese colaborador puede
entrar y pedir almuerzo. Verificado por el usuario en su navegador.

---

## Sprint 19 — Recuperación de contraseña y resumen por rol ✅ CONFIRMADO

**Confirmado por el usuario el 6 de agosto de 2026** (subsprints
19.1–19.8 completos, incluida la extensión de correo del CSV +
invitación masiva).

**Verificado:**
1. `npm run migrate` aplicó la migración 18 sin errores (tabla
   `recuperacion_password`, sin RLS). `npm run build`/`npm run
   typecheck` limpios en backend y frontend.
2. Suite completa de regresión — los 10 archivos de test en verde.
3. Backend probado en vivo: **(a)** recuperación de contraseña — la
   respuesta es idéntica exista o no el email (verificado comparando los
   dos mensajes byte a byte), el token generado permite restablecer la
   contraseña, el login nuevo funciona, y reintentar el mismo token se
   rechaza con `401`. `rrhh@futuroars.demo` quedó exactamente con su
   contraseña original (`rrhh123456`) al terminar la prueba. **(b)**
   `GET /nomina/resumen` — datos reales: 3 de 5 colaboradores activos de
   Futuro ARS sin programa de beneficio vigente (dato real, no
   inventado — confirma que el resumen encuentra algo que de verdad
   vale la pena mostrar). **(c)** `GET /catalogo/resumen` — cobertura de
   menú, contratos activos y última liquidación de Cocina Criolla del
   Este, todos con datos reales.

**Pendiente, tuyo:** en `localhost:5176`, pestaña "¿Olvidaste tu
contraseña?" desde el login (con `RESEND_API_KEY` sin configurar, usa el
enfoque de la conversación: pide el link a Claude o revisa el mensaje
genérico); pestaña "Resumen" nueva, primera en RRHH y en el portal del
suplidor; y la sección nueva arriba de "Pedir almuerzo" para el
colaborador.

**Objetivo:** dos piezas pedidas por el usuario el 6 de agosto de 2026,
distintas entre sí pero agrupadas en un mismo sprint porque llegaron
juntas:
1. **Recuperación de contraseña** — la otra mitad del gap que el Sprint
   18 dejó fuera a propósito ("Fuera de alcance... es un problema
   distinto: un usuario que ya existe pierde acceso, no uno que nunca
   tuvo cuenta"). Hoy no hay forma de recuperar una cuenta si se olvida
   la contraseña — hay que pedirle a alguien con acceso a la base que
   genere una nueva a mano.
2. **Un "Resumen" por rol** — RRHH, suplidor y colaborador hoy navegan
   directo a sus pestañas de trabajo, sin una vista general al entrar.
   Plataforma ya tiene la suya (Sprint 14, "Panel de plataforma").

**Decisión de alcance para el colaborador, resuelta antes de construir:**
`PedirCard` ya incluye el medidor de consumo del ciclo desde el Sprint
10 — no hace falta un endpoint nuevo para su resumen, se arma en el
frontend con datos que `GET /pedidos/mios` y `GET /pedidos/consumo-ciclo`
ya devuelven (próximo pedido pendiente, cantidad de pedidos del
período). RRHH y suplidor sí necesitan un endpoint nuevo cada uno,
porque piden datos que hoy no se calculan en ningún lado (colaboradores
sin programa vigente, cobertura de menú del propio suplidor, estado de
su última liquidación).

### Subsprint 19.1 — Backend: recuperación de contraseña

Migración: tabla `recuperacion_password` (`usuario_id`, `token` único,
`estado` `PENDIENTE`/`USADA`, `expira_en`) — mismo patrón que
`invitacion` (Sprint 18), sin RLS por el mismo motivo (tabla de
identidad transversal, no de tenant). Vigencia corta (1 hora, a
diferencia de los 7 días de una invitación — perder la contraseña es
urgente, invitar a alguien no).

- `POST /auth/olvide-password` — `{ email }`, público. Genera el token y
  envía el correo (`enviarNotificacion`, mismo patrón del Sprint 18) si
  el email existe — **responde igual en los dos casos** (exista o no el
  email), para no confirmar por este medio qué correos tienen cuenta.
- `POST /auth/restablecer-password/:token` — `{ password }`, público.
  Valida vigencia, actualiza `usuario.password_hash`, marca el token
  `USADA`. Mismo mensaje de error genérico si el token no sirve (no
  distingue "no existe" de "venció" de "ya se usó" — no hay necesidad
  real de que el usuario sepa cuál de las tres, y evita filtrar
  información).

### Subsprint 19.2 — Frontend: recuperación de contraseña

- Link "¿Olvidaste tu contraseña?" en `LoginPage`, debajo del botón
  "Entrar".
- Pantalla pública nueva para pedir el correo (`/olvide-password`).
- Pantalla pública nueva para la nueva contraseña
  (`/restablecer-password/:token`) — mismo patrón visual que
  `AceptarInvitacionPage` (Sprint 18).

### Subsprint 19.3 — Backend: resumen de RRHH

`GET /nomina/resumen` (RRHH/ADMIN_EMPRESA): disputas pendientes
(cantidad), ciclo `ABIERTO` vigente (período, cantidad de movimientos,
total), colaboradores activos, y **colaboradores sin programa de
beneficio vigente** — dato que hoy no se ve en ningún lado y es
justamente el que explica por qué alguien no puede pedir.

### Subsprint 19.4 — Backend: resumen del suplidor

`GET /catalogo/resumen` (`SUPLIDOR_ADMIN`): pedidos de hoy agrupados por
estado, cobertura de menú publicado de los próximos 10 días hábiles
(mismo cálculo que la tarjeta de plataforma del Sprint 14, pero acotado
a este suplidor en vez de a todos), contratos activos, y la liquidación
más reciente (estado, monto, período).

### Subsprint 19.5 — Frontend: pestaña "Resumen" en RRHH y suplidor

Nueva pestaña, primera de la lista en ambas pantallas (`RrhhPage`,
`SuplidorPage`), consumiendo los endpoints de 19.3/19.4.

### Subsprint 19.6 — Frontend: resumen del colaborador

Sección nueva arriba de `AppPage` (antes de "Pedir almuerzo"/"Mis
pedidos") con el próximo pedido pendiente y la cantidad de pedidos del
período — datos ya disponibles en el frontend, sin pedir nada nuevo al
backend (ver decisión de alcance arriba).

### Subsprint 19.7 — Backend: exponer el correo del CSV, e invitación masiva

**Hallazgo real, encontrado al recibir este pedido del usuario (6 de
agosto de 2026):** el correo del colaborador **ya se captura** desde el
Sprint 2 — `csv-colaboradores.ts` lo parsea y `importar-colaboradores.ts`
ya lo guarda en `colaborador.email` — pero `GET /colaboradores` nunca lo
devolvía, así que la sección "Invitar colaboradores" del Sprint 19
obligaba a RRHH a volver a escribir un correo que ya había cargado por
CSV. No es un dato faltante, es un dato que existe y no se mostraba.

- `GET /colaboradores` ahora también devuelve `email`.
- `POST /invitaciones/masiva` (`RRHH`/`ADMIN_EMPRESA`) — sin body
  (o `{ colaboradorIds?: number[] }` para acotar a una selección):
  invita de una vez a todos los colaboradores activos de la empresa que
  **no** tienen `usuario_id` y **sí** tienen `email` registrado (del
  CSV o cargado a mano). Reutiliza la misma lógica de creación de
  invitación que ya usa `POST /invitaciones` con `rol = 'COLABORADOR'`
  (factorizada a un método privado, no duplicada). Devuelve tres listas
  — invitados, omitidos por no tener correo (con su nombre, para que
  RRHH sepa a quién completarle el dato a mano), y los que ya tenían una
  invitación pendiente o cuenta.

### Subsprint 19.8 — Frontend: invitación masiva

En "Invitar colaboradores": el campo de correo de cada fila **ahora
viene prellenado** con el `email` del CSV (si lo trae — sigue siendo
editable, por si hay que corregirlo o completarlo). Botón nuevo
"Invitar a todos los que tienen correo" — llama al endpoint masivo y
muestra el resumen (cuántos se invitaron, cuántos quedaron pendientes
por falta de correo).

### Fuera de alcance de este sprint (a propósito)

- Que la recuperación de contraseña también sirva para el primer ingreso
  (eso ya lo resuelve la invitación, Sprint 18 — son flujos distintos a
  propósito, uno para "nunca tuve cuenta", otro para "la perdí").
- Dashboard adicional para back office más allá del ya existente (Sprint
  14) — no se pidió.
- Notificar por email cuando cambia el estado de una disputa/ciclo
  reflejado en el resumen — el resumen es de solo lectura, no dispara
  nada nuevo.
- Invitación masiva para RRHH/suplidores desde back office (pestaña
  "Usuarios", Sprint 18) — el pedido fue específicamente sobre
  colaboradores cargados por CSV; back office invita de a uno, con
  volumen mucho menor, no hay caso de negocio real todavía para
  masificar eso también.

**Criterio de cierre:** con la API real corriendo, un usuario que olvidó
su contraseña la recupera de principio a fin sin que nadie tenga que
tocar la base de datos; RRHH, suplidor y colaborador ven un resumen real
(no simulado) al entrar a su pantalla; y RRHH invita de un solo clic a
todos los colaboradores de un CSV recién cargado que ya traían correo,
sin volver a escribir nada. Verificado por el usuario en su navegador.

---

## Siguiente paso

Sprint 19 completo (subsprints 19.1–19.8, incluida la extensión de
correo del CSV + invitación masiva) ✅ CONFIRMADO. Con esto los 9
sprints de frontend documentados quedan todos confirmados. Lo que sigue
sin construir está anotado en "Gaps identificados" al inicio de este
documento — no se construye nada de ahí sin que alguien lo pida
primero, mismo criterio de siempre.
