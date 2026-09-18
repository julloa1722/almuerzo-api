# CLAUDE.md — Contexto del proyecto

@EXPERTO.md

Backend de una plataforma de almuerzo corporativo (SaaS multi-empresa), estilo
Fripick, para el mercado dominicano. Proyecto personal — sin presupuesto de
empresa, sin restricciones regulatorias de salud.

**Antes de tocar código, lee `plan-sprints.md`** en la raíz del proyecto — es
la fuente de verdad del roadmap, con cada sprint documentado (objetivo,
subsprints, criterio de cierre) y marcado como ✅ CONFIRMADO solo cuando el
usuario lo probó en su propia máquina y lo confirmó explícitamente.

**`EXPERTO.md`** (importado arriba) fija el criterio de arquitecto experto,
el límite de qué se vuelve configurable, la referencia concreta de cobertura
funcional (comparación contra Fripick) para no perseguir alcance sin límite,
y la obligación de mantener `PLAN-PRUEBAS.md` vivo en cada sprint. Aplica
desde el Sprint 10 en adelante — se agregó el 31 de julio de 2026.

## Regla de trabajo, no negociable

1. Antes de construir un sprint nuevo, escribe primero su desglose en
   `plan-sprints.md` (objetivo, subsprints, criterio de cierre). No construyas
   antes de documentar — es un error que ya se cometió dos veces en este
   proyecto y se corrigió a partir del Sprint 4.
2. Construye, corre las migraciones y los tests **contra una base de datos
   real** (Neon, no mocks). Nunca declares un sprint terminado sin haberlo
   corrido de verdad.
3. Cada sprint termina en un entregable concreto que el usuario prueba en su
   propia máquina. No se avanza al siguiente sprint sin su confirmación
   explícita.
4. Si cambias `package.json` (nueva dependencia, versión), asegúrate de que
   el usuario tenga el archivo completo actualizado — no le pidas que edite
   una línea a mano; ya causó desincronización una vez en este proyecto.
5. Cuando encuentres un bug real durante el desarrollo (no un malentendido de
   prueba), corrígelo y documéntalo en `plan-sprints.md` bajo el sprint
   correspondiente — este proyecto tiene el hábito de dejar constancia de
   los bugs reales encontrados, no solo del código final.

## Decisiones de arquitectura ya tomadas (no las reabras sin razón nueva)

- **PostgreSQL en Neon**, sin Docker — desarrollo directo contra una rama de Neon.
- **SQL directo con un migrador propio** (`scripts/migrate.js`), no un ORM.
  Las migraciones viven en `migrations/*.sql`, aplicadas en orden alfabético.
- **RLS (Row Level Security) como mecanismo de aislamiento**, no filtros de
  aplicación. Patrón establecido:
  - `almuerzo_app`: rol sin `BYPASSRLS`, usado por la app y los tests. Aísla
    por `app.empresa_id` o `app.suplidor_id` (GUC fijado por
    `TenantContextInterceptor` según el ámbito del JWT).
  - `almuerzo_platform`: rol con `BYPASSRLS` a propósito, solo para back
    office (`SUPERADMIN`/`SOPORTE`, ámbito `PLATAFORMA`).
  - Tablas sin columna de tenant directa (ej. `plantilla_item`,
    `pedido_linea`) denormalizan `suplidor_id`/`empresa_id` para que la
    política de RLS sea una comparación simple, no un `EXISTS` con subconsulta.
  - Cuando dos ámbitos legítimamente necesitan ver los mismos datos con
    reglas distintas (ej. el suplidor gestiona su menú, la empresa contratada
    lo lee para pedir), se usan **múltiples políticas permisivas** en la misma
    tabla — Postgres las combina con `OR`. Ver `migrations/0007` como ejemplo.
- **bcryptjs**, no argon2 (evita compilación nativa).
- **BIGINT se parsea a `number` en JS**, no a string (`src/common/pg-tipos.ts`)
  — decisión consciente, documentada, por el volumen de este sistema.
- **NUMERIC se deja como string** (comportamiento default de `pg`) — a
  propósito, para no perder precisión en montos de dinero.
- **Ningún job en segundo plano todavía.** Estados como el congelamiento de
  `menu_dia` se calculan al vuelo contra el reloj real en cada request, no se
  guardan en una columna mutable.
- **Hosting futuro (no construido aún):** Render (plan gratuito) para la API,
  Neon para la base. Ver `plan-sprints.md`, Sprint 9.

## Comandos que ya existen

```bash
npm run migrate      # aplica migrations/*.sql pendientes
npm run seed         # datos de prueba (empresas, colaboradores, suplidores, usuarios)
npm run build        # compila TypeScript a dist/
npm run start        # corre la API compilada
npm run start:dev    # con recarga automática
npm run smoke        # scripts/smoke-test.js — flujo end-to-end con fetch nativo
npm run prueba-e2e   # scripts/prueba-e2e.js — recorrido narrativo completo de PLAN-PRUEBAS.md
npm run test          # test/tenant-isolation.test.js — RLS del Sprint 1
node test/back-office.test.js   # Sprint 2
node test/catalogo.test.js      # Sprint 3
node test/pedidos.test.js       # Sprint 4
node test/entrega-disputas.test.js  # Sprint 5
node test/nomina.test.js            # Sprint 6
node test/liquidaciones.test.js     # Sprint 7
node test/ayuda.test.js             # Sprint 8
node test/reportes.test.js          # Sprint 9
node test/notificaciones.test.js    # Sprint 9
```

Frontend (Sprint 10, `frontend/`), con la API ya corriendo:

```bash
cd frontend && npm install && npm run dev   # http://localhost:5176
```

## Usuarios de prueba (creados por `npm run seed`)

| Email | Password | Rol / Ámbito |
|---|---|---|
| `rrhh@futuroars.demo` | `rrhh123456` | RRHH, empresa Futuro ARS |
| `admin@plataforma.demo` | `admin123456` | SUPERADMIN, plataforma |
| `suplidor@cocinacriolla.demo` | `suplidor123456` | SUPLIDOR_ADMIN, Cocina Criolla del Este |
| `ana.ramirez@futuroars.demo` | `colaborador123456` | COLABORADOR, Futuro ARS |

## Estado actual

Revisa `plan-sprints.md` para el estado exacto de cada sprint. Al momento de
escribir este archivo, Sprints 1–9 confirmados por el usuario (Sprint 8 con
alcance recortado a solo el backend de contenido de ayuda — el tour visual
y el centro de ayuda quedaron diferidos hasta que exista un frontend). El
subsprint 9.4 (despliegue real a Render) sigue pendiente — preparado
(`render.yaml` + guía) pero **no ejecutado**. Lo que lo bloqueaba era la
falta de git; ahora que el código está en GitHub, Render ya puede conectarse
al repositorio. No lo construyas sin pedirlo antes, mismo criterio de
siempre.

**Control de versiones (actualizado el 16 de septiembre de 2026):** git sí
está instalado ahora (MinGit 2.55, en `%LOCALAPPDATA%\MinGit`) y el proyecto
es un repositorio git de verdad — rama `main`, con destino
`https://github.com/julloa1722/FreeEat`. El historial va en git; usa commits
normales. `CHANGELOG.md` se mantiene al día igual que antes (es la bitácora
narrativa del proyecto, más legible que `git log`), pero `versiones/` **ya no
se alimenta**: los `.zip` quedan como archivo histórico y no hay que
generar uno nuevo por sprint.

El **Sprint 10 (frontend, rol colaborador) está ✅ confirmado** (31 de
julio de 2026, probado por el usuario con clics reales en
`localhost:5176`) — `frontend/`, más dos cambios chicos de backend
(`app.enableCors()`, `GET /pedidos/consumo-ciclo`). Ver `plan-sprints.md`,
Sprint 10, "Notas de implementación", para 2 discrepancias reales
encontradas al construir (no hay endpoint de previsualización de pedido ni
un `/me` para el colaborador — resueltas sin ampliar el backend en
silencio). Los siguientes sprints de frontend (suplidor, RRHH, back
office) siguen sin documentar — no construir ninguno sin antes escribir su
desglose en `plan-sprints.md`, mismo criterio que todos los anteriores.

También se agregó `GET /pedidos/menu-disponible`, fuera de cualquier sprint
formal — cerraba un hueco real (el colaborador no tenía forma de descubrir
qué pedir sin conocer `suplidorId`/`menuDiaId` de antemano), anotado desde
el Sprint 5 y resuelto el 30 de julio de 2026 al preguntar qué faltaba para
concluir el proyecto.

`PLAN-PRUEBAS.md` (recorrido de extremo a extremo, backend) y
`scripts/prueba-e2e.js` (lo mismo, automatizado) existen desde el 31 de
julio de 2026, por exigencia de `EXPERTO.md` — actualiza `PLAN-PRUEBAS.md`
con el tramo de frontend cuando el Sprint 10 quede confirmado.

El **Sprint 11 (frontend, rol suplidor) está ✅ confirmado** (3 de agosto
de 2026, probado por el usuario con clics reales en `localhost:5176`,
`suplidor@cocinacriolla.demo`) — 3 pantallas nuevas (catálogo, plantilla
semanal, calendario/publicación + preparación/entrega), más un backend
chico documentado (`DELETE /catalogo/plantillas/:id/items/:itemId`). Ver
`plan-sprints.md`, Sprint 11, para las 5 discrepancias reales encontradas
contra `portal-suplidor-menu.html`. Bug de proceso real encontrado y
corregido al cerrar este sprint: el Sprint 10 nunca generó su snapshot en
`versiones/` pese a que el propio `versiones/README.md` decía que debía
hacerlo — corregido con un snapshot conjunto (Sprint 10 + 11).

El **Sprint 12 (frontend, rol RRHH) está ✅ confirmado** (4 de agosto de
2026, probado por el usuario con clics reales en `localhost:5176`,
`rrhh@futuroars.demo`) — 3 pantallas nuevas (disputas y pedidos, ciclos y
libro mayor, programas de beneficio), más backend chico documentado
(`GET /nomina/movimientos`, CRUD de `programa_beneficio`/
`asignacion_programa` — cierra el gap real anotado desde el Sprint 9).
Ver `plan-sprints.md`, Sprint 12.

El **Sprint 13 (frontend, panel de back office) está ✅ confirmado** (5 de
agosto de 2026, probado por el usuario con clics reales en
`localhost:5176`, `admin@plataforma.demo`) — lista de empresas, wizard de
alta en 3 pasos con subida real de CSV, y gestión de contratos con
suplidores. Dos bugs reales encontrados y corregidos durante la prueba:
un CSV mal formado devolvía `500` en vez de un mensaje claro, y el
parser no aceptaba `;` como separador (común en CSV exportado desde Excel
en español) — ver `plan-sprints.md`, Sprint 13.

El **Sprint 16 (autoservicio de RRHH para su propio CSV de
colaboradores) está ✅ confirmado** (5 de agosto de 2026,
`rrhh@futuroars.demo`) — mismo motor de importación que el back office
(Sprint 13), extraído a `src/back-office/importar-colaboradores.ts` para
no duplicarlo, expuesto ahora también bajo ámbito EMPRESA
(`POST /colaboradores/preview` e `/importar`, sin `empresaId` en la URL).
El motor de CSV compartido se endureció más ese mismo día, con el
archivo real del usuario: detección de delimitador y normalización de
encabezados (cambio propio del usuario, conservado) y una función nueva
`normalizarMonto()` (montos con formato español o símbolo de moneda ya
no rompen la validación ni el `INSERT`) — ver `plan-sprints.md`, Sprint
16.

El **Sprint 17 (relación comercial suplidor-empresa) está ✅ confirmado**
(6 de agosto de 2026) — el suplidor solicita contrato con una empresa
existente (queda `PENDIENTE` hasta aprobación) o registra un lead
comercial; back office aprueba/rechaza y puede crear una empresa desde un
lead con el wizard prellenado. Bug real encontrado y corregido durante la
prueba: la búsqueda de empresa por RNC comparaba texto exacto, así que
escribirlo sin guiones no encontraba una empresa guardada con guiones —
ver `plan-sprints.md`, Sprint 17.

El **Sprint 14 (dashboard de plataforma) está ✅ confirmado** (6 de
agosto de 2026) — panel de métricas (GMV, ingreso propio vía comisión
configurable, aporte de empresas, cobertura de menú, pedidos por estado)
y trazabilidad de pedidos (`pedido_evento`, log append-only,
instrumentado en las 9 transiciones de estado). Ver `plan-sprints.md`,
Sprint 14.

Los **Sprints 15 (recorrido final de extremo a extremo,
`RECORRIDO-FINAL.md`) y 18 (invitación de usuarios) están ✅
confirmados** (6 de agosto de 2026). El Sprint 18 cierra un gap real
encontrado al construir el 15: no existía ningún endpoint que creara una
`membresia` — solo `scripts/seed.js`, a mano. Ahora back office puede
invitar RRHH/suplidores, y RRHH puede invitar a colaboradores ya
cargados por CSV sin cuenta, todo desde la app (`/invitacion/:token`,
página pública). Ver `plan-sprints.md`, Sprints 15 y 18.

Con esto, el roadmap actual queda completo: los 8 sprints de frontend
documentados (colaborador, suplidor, RRHH, back office, autoservicio
RRHH, relación comercial, dashboard de plataforma, invitación de
usuarios) están construidos y confirmados, y no queda ningún sprint
reservado sin desglosar. Los gaps que siguen sin resolver a propósito
están anotados en la sección "Gaps identificados" al inicio de
`plan-sprints.md` — no se construyen sin que alguien lo pida primero,
mismo criterio de siempre.
