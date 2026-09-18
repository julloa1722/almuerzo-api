# ESCENARIOS-PRODUCCION.md — catálogo completo para una prueba desde cero

Este documento es distinto a los otros dos que ya existen, y los tres se
complementan:

- **`PLAN-PRUEBAS.md`** — una pasada técnica limpia, sprint por sprint,
  con comandos `curl` exactos y el resultado esperado de cada endpoint.
- **`RECORRIDO-FINAL.md`** — una sola historia continua de negocio (el
  camino feliz de un período completo), pensada para sentir el producto
  terminado.
- **Este documento** — el catálogo **exhaustivo**: no solo el camino
  feliz, sino cada rama real que el sistema tiene programada — rechazos,
  validaciones, límites, casos de silencio, aislamiento entre empresas —
  organizado por actor. Es lo más parecido a "todo lo que puede pasar en
  producción" que se puede probar sin tener usuarios reales todavía. Cada
  escenario está sacado directamente del código (`throw new
  BadRequestException(...)` y similares), no inventado — así que el
  mensaje que verás en pantalla debería coincidir palabra por palabra.

**Cómo usarlo:** recórrelo de arriba hacia abajo, con clics reales en
`localhost:5176` donde el escenario tiene frontend, y con la API directa
(PowerShell, mismo patrón que `PLAN-PRUEBAS.md`) donde no lo tiene. Marca
cada casilla. Donde algo no se comporte como dice "Esperado", anótalo al
final en vez de asumir que está mal descrito aquí — puede ser un bug real
o una descripción desactualizada, y las dos cosas valen la pena anotarlas
igual.

---

## 0. Preparación

```powershell
npm run build
npm run start          # API en localhost:3000, en una terminal aparte
cd frontend && npm run dev   # frontend en localhost:5176
```

**Esta prueba está pensada para ser "desde cero" en el Bloque A** — en
vez de reusar Futuro ARS/Cocina Criolla del Este (que ya acumulan meses
de datos de prueba), el Bloque A crea una empresa y (si quieres) un
suplidor nuevos, y los usa para todo el ciclo de vida completo, desde el
alta hasta el primer pedido. Los bloques siguientes sí reusan las cuentas
sembradas donde el escenario no depende de partir de cero (por ejemplo,
probar aislamiento entre empresas necesita que ya existan dos).

| Rol | Email | Contraseña |
|---|---|---|
| Back office (plataforma) | `admin@plataforma.demo` | `admin123456` |
| RRHH (Futuro ARS) | `rrhh@futuroars.demo` | `rrhh123456` |
| Suplidor (Cocina Criolla del Este) | `suplidor@cocinacriolla.demo` | `suplidor123456` |
| Colaboradora (Futuro ARS) | `ana.ramirez@futuroars.demo` | `colaborador123456` |
| Suplidor 2 (Verde Menú, sin contrato con Futuro ARS) | ver `scripts/seed.js` | — |

---

## Bloque A — Plataforma / Back office

### A1. Alta de empresa desde cero, con invitación real ✅ camino feliz

1. `admin@plataforma.demo` → "Empresas" → "Dar de alta empresa nueva".
2. Razón social + RNC (formato `000-00000-0`) → "Continuar".
3. Sube un CSV real (o de prueba) → revisa la tabla de filas → "Importar".
4. En el detalle, "Agregar suplidor" → elige uno de la lista → ajusta el
   slider de precio.
5. Pestaña "Usuarios" → "Nueva invitación" → ámbito Empresa → la empresa
   recién creada → rol `RRHH` → tu propio correo → "Enviar".
6. Abre el link de invitación (o cópialo si no hay `RESEND_API_KEY`) →
   define contraseña → entra ya logueado como RRHH de esa empresa nueva.

**Esperado:** en cada paso, la entidad creada aparece de inmediato en las
pantallas siguientes (empresa en la lista, colaboradores en el detalle,
usuario nuevo con sesión activa) — nada requiere tocar la base de datos.

### A2. RNC con formato inválido

Repite el paso 2 de A1 con un RNC como `12345` (sin guiones, longitud
incorrecta).

**Esperado:** `400`, "rnc no tiene un formato reconocido." — la empresa
no se crea.

### A3. Razón social vacía

Deja el nombre en blanco.

**Esperado:** `400`, "nombre es obligatorio."

### A4. CSV mal formado

Sube un archivo con una comilla sin cerrar o columnas inconsistentes.

**Esperado:** `400` con el motivo exacto del parser (línea/columna
donde falló) — nunca un `500` genérico (bug real corregido en el
Sprint 13, ver `plan-sprints.md`).

### A5. CSV con `;` como separador (Excel en español)

Sube un CSV exportado de Excel en español, que usa `;` en vez de `,`.

**Esperado:** se detecta solo y se procesa igual que uno con comas — no
hace falta convertirlo a mano primero.

### A6. Fila de CSV con dato inválido vs. dato solo raro

Incluye en el CSV: una cédula de formato inválido (debe marcar
**error**, bloquea esa fila), un punto de entrega que no existe todavía
(debe marcar **alerta**, no bloquea), y un `salario_neto` en formato
español (`35.000,00`) o con símbolo de moneda (`RD$35,000.00`) (debe
**normalizarse y aceptarse**, no rechazarse).

**Esperado:** los 3 contadores (limpias/con alerta/con error) reflejan
exactamente eso, y solo la fila con cédula inválida queda fuera de
"importables".

### A7. Solicitud de contrato de un suplidor — aprobar

Con un suplidor (`suplidor@cocinacriolla.demo`) que solicita contrato
con una empresa que aún no lo tiene (pestaña "Relación comercial" →
"Solicitar contrato", con o sin guiones en el RNC — ambos funcionan
desde el bug corregido en el Sprint 17). Como back office, "Solicitudes
y leads" → "Aprobar".

**Esperado:** el contrato pasa de `PENDIENTE` a `ACTIVA`, visible para
el suplidor.

### A8. Solicitud de contrato — rechazar

Repite A7 pero con "Rechazar" en vez de "Aprobar".

**Esperado:** el contrato queda `RECHAZADA` — no bloquea que el mismo
suplidor vuelva a solicitar más adelante (no hay unicidad que lo impida
a propósito).

### A9. RNC que no existe en la plataforma → registrar lead

Como suplidor, "Solicitar contrato" con un RNC que no pertenece a
ninguna empresa registrada.

**Esperado:** `404`, "No existe ninguna empresa con ese RNC en la
plataforma. Registra un lead en su lugar." — y el flujo de "Registrar
lead" (nombre obligatorio, resto opcional) sí funciona con ese mismo
RNC.

### A10. Crear empresa desde un lead

Con el lead de A9 ya registrado: back office → "Solicitudes y leads" →
"Crear empresa desde este lead".

**Esperado:** te lleva al wizard de alta (A1) con nombre/RNC
prellenados; al completar la importación, el lead queda `CONVERTIDO`.

### A11. Comisión de plataforma

"Panel de plataforma" → editar la tasa de comisión → guardar.

**Esperado:** "Ingreso propio" se recalcula (GMV × la tasa nueva) sin
recargar la página. Prueba también un valor fuera de rango (`150`):
**esperado** `400`, "tasaComisionPct debe estar entre 0 y 100."

### A12. Trazabilidad de pedidos — solo lectura

Pestaña "Trazabilidad": confirma que no hay ningún botón de
editar/insertar/borrar — es un log append-only (mismo criterio que el
libro mayor).

### A13. Invitar con un rol que no corresponde al ámbito

Como plataforma, invita con ámbito `EMPRESA` y rol `SUPLIDOR_ADMIN`.

**Esperado:** `400`, "Para EMPRESA, rol debe ser uno de: RRHH,
ADMIN_EMPRESA, COLABORADOR."

### A14. Revocar una invitación pendiente

Sobre cualquier invitación `PENDIENTE`, "Revocar".

**Esperado:** pasa a `REVOCADA`; si esa persona intenta usar el link
después, ver escenario B12.

---

## Bloque B — RRHH

### B1. Invitación masiva de colaboradores (Sprint 19.7/19.8)

Con colaboradores recién importados por CSV (algunos con correo,
algunos sin), pestaña "Colaboradores" → botón "Invitar a todos los que
tienen correo".

**Esperado:** responde tres grupos — invitados (con correo, sin cuenta),
omitidos por no tener correo (con su nombre, para completarlo a mano), y
los que ya tenían invitación pendiente. Repetirlo enseguida mueve a los
recién invitados al tercer grupo.

### B2. Invitar a un colaborador que ya tiene cuenta

Intenta invitar (individual o dentro de la masiva) a un colaborador con
`usuario_id` ya asignado.

**Esperado:** individual → `403`, "Ese colaborador ya tiene una cuenta
vinculada."; masiva → simplemente no aparece entre los candidatos
(la consulta ya filtra `usuario_id IS NULL`).

### B3. Programa de beneficio — crear, asignar, solapamiento

Crea un programa nuevo → asígnalo a un colaborador con `vigenteDesde` de
hoy. Luego intenta asignarle un **segundo** programa con fechas que se
solapen con el primero.

**Esperado:** el segundo intento falla con "Ese colaborador ya tiene un
programa vigente que se solapa con esas fechas." — el `EXCLUDE` de
Postgres, no una validación de aplicación que se pueda saltear con una
carrera de escritura.

### B4. Finalizar una asignación vigente

"Finalizar hoy" sobre una asignación activa.

**Esperado:** pierde el botón (ya no vigente), el colaborador queda
libre para una asignación nueva desde hoy.

### B5. Resolver disputa — a favor del colaborador

Con un pedido en `DISPUTA`, "A favor del colaborador".

**Esperado:** pasa a `NO_ENTREGADO`, nunca postea `CARGO` al libro
mayor.

### B6. Resolver disputa — a favor del suplidor

Mismo escenario, "A favor del suplidor".

**Esperado:** pasa a `RECIBIDO`, el `CARGO` sí se mantiene/postea.

### B7. Cerrar ciclo con pedidos sin resolver

Con un pedido en `ENTREGADO` o `DISPUTA` todavía dentro del rango del
ciclo, intenta "Cerrar ahora".

**Esperado:** rechazo con el motivo exacto de la API (no un error
genérico) — resuélvelo (B5/B6) y reintenta.

### B8. Ajuste manual (nota de crédito / cargo)

`POST /nomina/movimientos/ajuste` con `monto <= 0` o sin `motivo`.

**Esperado:** `400`, "monto debe ser mayor que 0." o "motivo es
obligatorio para una corrección manual." respectivamente. Con datos
válidos: `201`, el movimiento aparece en el libro mayor del ciclo
abierto vigente.

### B9. Archivo de descuento con plantilla personalizada

Cambia la plantilla (agrega/quita campos) → descarga el CSV de un ciclo
cerrado.

**Esperado:** las columnas del archivo reflejan exactamente la
plantilla configurada, en el mismo orden.

### B10. Recuperación de contraseña — camino feliz

`POST /auth/olvide-password` con un email real registrado → toma el
token (de la base, sin `RESEND_API_KEY` real) → `POST
/auth/restablecer-password/:token` con una contraseña nueva de al menos
8 caracteres → login con la contraseña nueva.

**Esperado:** funciona de punta a punta; el login con la contraseña
**vieja** ya falla.

### B11. Recuperación de contraseña — email inexistente

`POST /auth/olvide-password` con un correo que no existe en el sistema.

**Esperado:** el mismo mensaje genérico que si el correo sí existiera
("Si ese correo tiene una cuenta, le enviamos instrucciones...") — a
propósito, para no confirmar por este medio qué correos están
registrados.

### B12. Token de recuperación/invitación vencido, ya usado, o inválido

Intenta `restablecer-password` dos veces con el mismo token, o con uno
inventado; intenta aceptar una invitación ya `ACEPTADA` o `REVOCADA`, o
una vencida (más de 7 días).

**Esperado:** recuperación → mismo mensaje de error genérico en los tres
casos (no distingue "no existe" de "venció" de "ya se usó", a
propósito). Invitación → "Esa invitación ya no está disponible." o "Esa
invitación ya venció." según el caso — sin importar cuál de los dos,
nunca se crea una cuenta.

### B13. Resumen de RRHH

Pestaña "Resumen" (primera del panel).

**Esperado:** disputas pendientes reales, colaboradores activos vs. sin
programa vigente (dato que antes no se veía en ningún lado), ciclo
actual con su total.

---

## Bloque C — Suplidor

### C1. Publicar menú sin ninguna ruta configurada

Con un suplidor sin rutas de servicio (uno nuevo, recién dado de alta),
intenta "Publicar próximos 10 días hábiles".

**Esperado:** `400`, "Configura al menos una ruta de servicio antes de
publicar."

### C2. Catálogo — crear producto sin SKU/nombre

Intenta crear un plato sin uno de los dos campos obligatorios.

**Esperado:** `400`, "sku y nombre son obligatorios."

### C3. Plantilla semanal — agregar y quitar un ítem

Marca un checkbox nuevo (pide precio/cupo) → confirma que aparece.
Luego destíldalo.

**Esperado:** al quitar, usa el `DELETE` del Sprint 11
(`/catalogo/plantillas/:id/items/:itemId`) — el ítem desaparece de ese
día sin afectar los demás días/semanas.

### C4. Editar un día del menú ya congelado

Con un pedido real ya creado para una fecha cuyo cutoff ya venció,
intenta cambiar el precio o desactivar ese ítem del menú de ese día.

**Esperado:** `403`, "Ese día ya está congelado: su cutoff venció y ya
existen pedidos con estos valores." — el precio que pagó el colaborador
no puede cambiar retroactivamente.

### C5. Entregar con código de retiro incorrecto

`PATCH /pedidos/:id/entregar` con un código que no coincide.

**Esperado:** `400`, "El código de retiro no coincide con el de este
pedido." — el pedido se queda como estaba, no pasa a `ENTREGADO`.

### C6. Entregar/preparar un pedido de otra empresa (sin contrato)

Con el suplidor 2 (Verde Menú, sin contrato con Futuro ARS), intenta
`GET /pedidos/preparacion` o `PATCH .../preparar` sobre un pedido real
de Futuro ARS↔Cocina Criolla.

**Esperado:** el `GET` no lo lista (RLS, no un filtro de aplicación); el
`PATCH` devuelve `404`/`0 filas afectadas` como si el pedido no
existiera — nunca revela que existe pero pertenece a otro.

### C7. Solicitar contrato / registrar lead

Ver A9/A7 desde el lado del suplidor.

### C8. Resumen del suplidor

Pestaña "Resumen" (primera del panel).

**Esperado:** pedidos de hoy por estado, cobertura de menú publicado de
los próximos 10 días hábiles, contratos activos, última liquidación
(estado/monto/período).

---

## Bloque D — Colaborador (motor de elegibilidad del pedido)

Cada validación real de `POST /pedidos`, en el orden en que el código
las evalúa — un pedido de producción puede chocar con cualquiera de
estas, no solo la primera que se te ocurra probar:

### D1. Perfil de colaborador inactivo

Con un colaborador `estado != ACTIVO` (ej. dado de baja).

**Esperado:** `403`, "Tu perfil de colaborador no está activo."

### D2. Fecha de salida ya pasada

Colaborador con `fecha_salida` anterior o igual a la fecha del pedido.

**Esperado:** `403`, "Tu fecha de salida ya pasó o coincide con la
fecha del pedido."

### D3. Sin programa de beneficio vigente

Colaborador sin ninguna `asignacion_programa` vigente para esa fecha.

**Esperado:** `403`, "No tienes un programa de beneficio vigente para
esa fecha."

### D4. Día no hábil del programa / feriado

Pide para un día de la semana que el programa no cubre, o un día
marcado como feriado.

**Esperado:** `400`, "El {fecha} no es un día hábil del programa de
beneficio." o "El {fecha} está marcado como feriado." respectivamente.

### D5. Suplidor que no sirve tu punto de entrega

Pide a un suplidor sin ruta hacia tu punto de entrega.

**Esperado:** `400`, "Ese suplidor no sirve tu punto de entrega."

### D6. Cutoff vencido

Pide para una fecha/suplidor cuyo cutoff ya pasó.

**Esperado:** `403`, "El cutoff de esa fecha venció el {hora}."

### D7. Pedido duplicado

Repite el mismo pedido (misma fecha + mismo suplidor).

**Esperado:** `403`, "Ya existe un pedido tuyo para esa fecha y
suplidor." — sí puedes pedir a **dos suplidores distintos** el mismo
día, a propósito.

### D8. Empresa sin contrato activo con ese suplidor

Pide a un suplidor que tu empresa nunca contrató (o el contrato está
`INACTIVA`/`PENDIENTE`/`RECHAZADA`).

**Esperado:** `400`, "Tu empresa no tiene un contrato activo con ese
suplidor."

### D9. Plato retirado o sin cupo

Pide un `menuDiaId` que ya no está `activo`, o que ya agotó su
`cupo_max`.

**Esperado:** `400`, "Uno de los platos fue retirado del menú de ese
día." o `403`, "Sin cupo suficiente para el plato {id}."
respectivamente.

### D10. Programa no permite excedente

Con un programa `permite_excedente = false`, pide algo cuyo precio deje
un monto a cargo del colaborador mayor que cero.

**Esperado:** `403`, "El programa no permite excedente y este pedido
dejaría RD$ {monto} a tu cargo."

### D11. Tope de ciclo o límite de endeudamiento por salario

Acumula pedidos hasta superar `tope_ciclo_colaborador`, o el
`pct_max_salario` del salario de referencia.

**Esperado:** `403`, "Excede el tope del período: ..." o "Excede el
{pct}% de tu salario neto ..." respectivamente. El medidor "Comprometido
este ciclo" en la app debería ya mostrar ámbar/granate antes de llegar
a este punto.

### D12. Cancelar — solo antes del cutoff y solo si está CONFIRMADO

Intenta cancelar un pedido ya `ENTREGADO`, o uno `CONFIRMADO` pero con
el cutoff ya vencido.

**Esperado:** `403`, "Solo se puede cancelar un pedido en estado
CONFIRMADO." o "El cutoff de este pedido ya venció." respectivamente.

### D13. Confirmar/disputar fuera de estado ENTREGADO

Intenta confirmar o disputar un pedido que no está `ENTREGADO` (ej. ya
`RECIBIDO`, o resuelto por silencio).

**Esperado:** `403`, mensaje que incluye "Si ya pasó la ventana de
confirmación, se resolvió automáticamente por política de silencio." —
la pista correcta para el caso real de que llegaste tarde.

### D14. Los 5 motivos de disputa

`PATCH /pedidos/:id/disputar` con un motivo fuera de la lista.

**Esperado:** `400`, "motivo debe ser uno de: NO_LLEGO, INCOMPLETO,
EQUIVOCADO, CALIDAD, OTRO." Con uno válido: pasa a `DISPUTA`.

### D15. Colaborador sin cuenta vinculada todavía

Un colaborador recién importado por CSV, sin `usuario_id`, intenta
loguearse.

**Esperado:** no existe ningún `usuario` para ese correo — necesita
pasar primero por B1/A1 (invitación) antes de poder entrar.

---

## Bloque E — Transversales (seguridad, aislamiento, automatismos)

### E1. Aislamiento entre empresas (RLS)

Con el token de una empresa, intenta leer/escribir un recurso
(colaborador, pedido, ciclo) que pertenece a otra empresa, por id
directo.

**Esperado:** `404`/lista vacía, nunca un `403` que confirme que el
recurso existe — RLS filtra a nivel de fila, no de aplicación. Ya
cubierto en detalle por `test/tenant-isolation.test.js`; este escenario
es para sentirlo también desde el navegador/API real, no solo el test.

### E2. Aislamiento entre suplidores

Igual que E1, pero con dos suplidores sin relación entre sí (ver C6).

### E3. Rol insuficiente

Con un token válido pero de un rol que no tiene permiso sobre ese
endpoint (ej. un colaborador intentando `POST /catalogo/productos`).

**Esperado:** `403`, "Rol insuficiente. Se requiere uno de: {roles}."

### E4. Sin ámbito seleccionado

Usa el token que devuelve `/auth/login` (antes de `seleccionar-ambito`)
directamente contra un endpoint que requiere ámbito.

**Esperado:** `403`, "Esta acción requiere haber seleccionado un ámbito
(empresa/suplidor/plataforma)."

### E5. Sin token / token vencido

Llama cualquier endpoint protegido sin header `Authorization`, o con uno
vencido (esperar 15 minutos, o corromper el JWT a mano).

**Esperado:** `401`, "Falta el header Authorization: Bearer <token>."
o "Token inválido o expirado." respectivamente.

### E6. Rate limiting de login y recuperación de contraseña

6 intentos seguidos de `POST /auth/login` (o `/auth/olvide-password`)
desde la misma IP en menos de un minuto.

**Esperado:** los primeros 5 responden normal (`401` si las
credenciales son malas); el sexto responde `429`.

### E7. Notificaciones — omitida vs. enviada

Sin `RESEND_API_KEY` configurada, dispara cualquier evento que notifique
(pedido entregado, disputa resuelta, lote pagado, invitación,
recuperación de contraseña) y revisa `GET /notificaciones` (plataforma).

**Esperado:** todas quedan `OMITIDA` con un `detalle_error` claro — el
sistema sigue funcionando igual, solo no llega el correo real. Con
`RESEND_API_KEY` configurada: quedan `ENVIADA`.

### E8. Resolución automática por silencio — auto-confirma

Deja un pedido en `ENTREGADO` más allá de `horas_ventana_confirmacion`
del programa (por defecto 24h) sin que el colaborador confirme ni
dispute, y luego toca cualquier endpoint de pedidos de esa empresa.

**Esperado:** se resuelve solo a `RECIBIDO` (si el programa es
`AUTO_CONFIRMA`) — sin ningún job en segundo plano, calculado al vuelo
contra el reloj real. Para verlo en minutos en vez de horas, baja
temporalmente `horas_ventana_confirmacion` a un valor chico (`0.01`) y
restaura el valor después. Ya cubierto por `test/entrega-disputas.test.js`
(P2/P3/P4).

### E9. Resolución automática por silencio — auto-disputa

Igual que E8, pero con un programa `AUTO_DISPUTA`.

**Esperado:** se resuelve solo a `DISPUTA`, quedando pendiente de que
RRHH la revise como cualquier otra.

### E10. Headers de seguridad

`curl.exe -si $BASE/health` y revisa los headers de respuesta.

**Esperado:** los headers de `helmet` presentes (`X-Frame-Options`,
`X-Content-Type-Options`, etc.) en cualquier respuesta, no solo en
`/health`.

---

## Matriz resumen

| # | Escenario | Actor | Cómo probarlo |
|---|---|---|---|
| A1 | Alta de empresa desde cero + invitación real | Plataforma | Browser |
| A2–A6 | Validaciones de alta/CSV | Plataforma | Browser |
| A7–A10 | Relación comercial (aprobar/rechazar/lead) | Plataforma | Browser |
| A11–A14 | Comisión, trazabilidad, invitaciones | Plataforma | Browser |
| B1–B4 | Invitación masiva, programas de beneficio | RRHH | Browser |
| B5–B9 | Disputas, cierre de ciclo, ajustes, descuento | RRHH | Browser |
| B10–B12 | Recuperación de contraseña, tokens vencidos | RRHH | API (PowerShell) |
| B13 | Resumen de RRHH | RRHH | Browser |
| C1–C6 | Catálogo, congelamiento, entrega, RLS | Suplidor | Browser |
| C7–C8 | Relación comercial, resumen | Suplidor | Browser |
| D1–D14 | Motor de elegibilidad del pedido (14 validaciones) | Colaborador | Browser + API |
| D15 | Colaborador sin cuenta | Colaborador | API |
| E1–E5 | RLS, roles, ámbito, tokens | Todos | API |
| E6 | Rate limiting | Todos | API |
| E7 | Notificaciones | Plataforma (lectura) | API |
| E8–E9 | Silencio automático | Colaborador/RRHH | API (+ ajuste temporal en base) |
| E10 | Headers de seguridad | — | API |

---

## Registro de resultados

_(Anota aquí, escenario por escenario, lo que no se comportó como dice
"Esperado" — con el # exacto. No asumas que el documento tiene razón: si
algo difiere, puede ser un bug real o una descripción vieja; las dos
cosas se anotan igual, y se deciden después de terminar el recorrido
completo.)_

-
-
-
