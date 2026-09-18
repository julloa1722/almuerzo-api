# PLAN-PRUEBAS.md — recorrido de extremo a extremo

Documento vivo, exigido por `EXPERTO.md`. No es una tarea de una sola vez al
cierre del proyecto: cada sprint que confirmemos agrega su tramo aquí, en el
mismo orden narrativo en el que un pedido de almuerzo corporativo ocurre de
verdad — alta de empresa → colaboradores → contrato → menú → pedido →
entrega → confirmación/disputa → cierre de ciclo → liquidación.

Este es el documento que corres de principio a fin cuando quieras confirmar
que el sistema **completo** funciona, no solo un sprint aislado. Los casos de
rechazo (validaciones, RLS, permisos) ya están cubiertos con detalle en
`test/*.test.js` — aquí no se repiten uno por uno, solo se navega el camino
feliz completo, con un par de rechazos representativos donde importan para
entender el negocio (cutoff vencido, pedido duplicado, disputa).

Comandos en PowerShell (tu shell real), con `curl.exe` — no el alias
`curl`→`Invoke-WebRequest` de PowerShell — y `ConvertFrom-Json`/
`ConvertTo-Json` para leer y armar cuerpos JSON, en vez de `python3` (que
usa `scripts/smoke-test.sh`, pensado para bash).

---

## 0. Preparación (una sola vez)

```powershell
npm run migrate
npm run seed
npm run build
npm run start          # deja esto corriendo en una terminal aparte
```

En otra terminal, fija la URL base una vez:

```powershell
$BASE = "http://localhost:3000"
```

Confirma que responde:

```powershell
curl.exe -s "$BASE/health"
```

**Esperado:** `{"estado":"ok", ...}`.

---

## 1. Sprint 1 — Identidad y RLS

Ya cubierto por `npm run smoke` (`scripts/smoke-test.js`) y `npm run test`
(`test/tenant-isolation.test.js`) — no se repite aquí en detalle. El patrón
de login que se usa en el resto de este documento es el mismo que confirma
ese smoke test:

```powershell
$login = curl.exe -s -X POST "$BASE/auth/login" `
  -H "Content-Type: application/json" `
  -d '{"email":"rrhh@futuroars.demo","password":"rrhh123456"}' | ConvertFrom-Json

$membresiaId = $login.membresias[0].membresiaId

$ambito = curl.exe -s -X POST "$BASE/auth/seleccionar-ambito" `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer $($login.accessToken)" `
  -d "{`"membresiaId`": $membresiaId}" | ConvertFrom-Json

$tokenRrhh = $ambito.accessToken
```

**Esperado:** `$tokenRrhh` no vacío. Este es el patrón — login sin ámbito,
elegir membresía, token con ámbito — que se repite con cada usuario de
prueba de aquí en adelante (solo cambia el email/password y qué se hace con
el token).

---

## 2. Sprint 2 — Back office: alta de empresa, colaboradores, contrato

Usuario: `admin@plataforma.demo` / `admin123456` (SUPERADMIN, ámbito
PLATAFORMA). Este tramo crea una empresa **nueva** (no la ya sembrada) para
probar de verdad los endpoints de escritura, no solo leer lo que ya puso
`seed.js`.

```powershell
$loginAdmin = curl.exe -s -X POST "$BASE/auth/login" `
  -H "Content-Type: application/json" `
  -d '{"email":"admin@plataforma.demo","password":"admin123456"}' | ConvertFrom-Json
$ambitoAdmin = curl.exe -s -X POST "$BASE/auth/seleccionar-ambito" `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer $($loginAdmin.accessToken)" `
  -d "{`"membresiaId`": $($loginAdmin.membresias[0].membresiaId)}" | ConvertFrom-Json
$tokenAdmin = $ambitoAdmin.accessToken
```

**2.1 — Listar empresas** (ya deben aparecer Futuro ARS y Grupo Vantia, del seed):

```powershell
curl.exe -s "$BASE/back-office/empresas" -H "Authorization: Bearer $tokenAdmin"
```

**2.2 — Crear empresa nueva:**

```powershell
$empresaNueva = curl.exe -s -X POST "$BASE/back-office/empresas" `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer $tokenAdmin" `
  -d '{"rnc":"101-77003-9","nombre":"Textiles del Caribe","frecuenciaNomina":"QUINCENAL"}' | ConvertFrom-Json
$empresaNuevaId = $empresaNueva.id
```

**Esperado:** `201`, objeto con `id`, `estado: "ACTIVO"`.

**2.3 — Previsualizar CSV de colaboradores** (sin escribir nada — nota que
el punto de entrega `"Bodega principal"` todavía no existe para esta
empresa, así que debe marcarse **alerta**, no error, y aun así importarse):

```powershell
$csv = "codigo_nomina,cedula,nombre_completo,punto_entrega,salario_neto`nT-001,001-2233445-6,Rosa Diaz,Bodega principal,32000"

$preview = curl.exe -s -X POST "$BASE/back-office/empresas/$empresaNuevaId/colaboradores/preview" `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer $tokenAdmin" `
  -d (@{ csv = $csv } | ConvertTo-Json) | ConvertFrom-Json
$preview
```

**Esperado:** `totalFilas: 1`, `conAlerta: 1`, `conError: 0`, `importables: 1`.

**2.4 — Importar de verdad:**

```powershell
$importado = curl.exe -s -X POST "$BASE/back-office/empresas/$empresaNuevaId/colaboradores/importar" `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer $tokenAdmin" `
  -d (@{ csv = $csv } | ConvertTo-Json) | ConvertFrom-Json
$importado.importados
```

**Esperado:** `1`.

**2.5 — Crear contrato con un suplidor** (usa el suplidor ya sembrado,
Cocina Criolla del Este — necesitas su `id`; si no lo tienes a mano,
`SELECT id FROM suplidor WHERE nombre = 'Cocina Criolla del Este'` con
cualquier cliente de Postgres, o repite este paso después de correr la
Sección 3, que sí devuelve el id vía login del suplidor):

```powershell
$contrato = curl.exe -s -X POST "$BASE/back-office/empresas/$empresaNuevaId/contratos" `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer $tokenAdmin" `
  -d '{"suplidorId": 1, "ajustePct": -5}' | ConvertFrom-Json
$contrato
```

**Esperado:** `201`, `ajuste_pct: "-5"` (o `-5`), `estado: "ACTIVA"`.

**Nota:** esta empresa nueva (`Textiles del Caribe`) no tiene programa de
beneficio — no existe un endpoint para crear `programa_beneficio` (solo lo
inserta `scripts/seed.js`). Es un hueco real que EXPERTO.md exige nombrar
explícitamente, no construir en silencio aquí — ver la sección de gaps en
`plan-sprints.md`. Por eso el resto de este documento (pedidos en adelante)
continúa con **Futuro ARS**, que sí tiene programa de beneficio sembrado.

---

## 3. Sprint 3 — Catálogo y menú del suplidor

Usuario: `suplidor@cocinacriolla.demo` / `suplidor123456` (SUPLIDOR_ADMIN,
Cocina Criolla del Este — ya tiene 2 productos, 1 ruta y una plantilla de la
semana 1 sembrados por `seed.js`).

```powershell
$loginSup = curl.exe -s -X POST "$BASE/auth/login" `
  -H "Content-Type: application/json" `
  -d '{"email":"suplidor@cocinacriolla.demo","password":"suplidor123456"}' | ConvertFrom-Json
$ambitoSup = curl.exe -s -X POST "$BASE/auth/seleccionar-ambito" `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer $($loginSup.accessToken)" `
  -d "{`"membresiaId`": $($loginSup.membresias[0].membresiaId)}" | ConvertFrom-Json
$tokenSup = $ambitoSup.accessToken
```

**3.1 — Ver catálogo actual:**

```powershell
curl.exe -s "$BASE/catalogo/productos" -H "Authorization: Bearer $tokenSup"
curl.exe -s "$BASE/catalogo/rutas" -H "Authorization: Bearer $tokenSup"
curl.exe -s "$BASE/catalogo/plantillas" -H "Authorization: Bearer $tokenSup"
```

**Esperado:** 2 productos (`BAND-001`, `PECH-001`), 1 ruta (Torre
corporativa · piso 4, cutoff `10:00`), 1 plantilla semana 1 con 3 items
(lunes: bandeja + pechuga, martes: pechuga).

**3.2 — Publicar el menú de los próximos días hábiles:**

```powershell
$publicado = curl.exe -s -X POST "$BASE/catalogo/menu/publicar" `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer $tokenSup" `
  -d '{"dias": 10}' | ConvertFrom-Json
$publicado
```

**Esperado:** `diasPublicados` > 0 (los lunes/martes hábiles dentro de esos
10 días), `detalle` con la cantidad de items por fecha.

**3.3 — Ver el calendario resultante:**

```powershell
curl.exe -s "$BASE/catalogo/menu" -H "Authorization: Bearer $tokenSup"
```

**Esperado:** cada fecha con `estado: "PUBLICADO"` (todavía no vencido su
cutoff) y sus items, con `precio`, `cupo_max`, `cupo_usado: 0`.

**Guarda una fecha de lunes o martes publicada, dentro de los próximos días,
como `$fechaLunes` / `$fechaMartes` (formato `YYYY-MM-DD`) — las usarás en
la Sección 4.**

---

## 4. Sprint 4 — Motor de pedidos (colaborador)

Usuario: `ana.ramirez@futuroars.demo` / `colaborador123456` (COLABORADOR,
Futuro ARS, punto de entrega "Torre corporativa · piso 4").

```powershell
$loginAna = curl.exe -s -X POST "$BASE/auth/login" `
  -H "Content-Type: application/json" `
  -d '{"email":"ana.ramirez@futuroars.demo","password":"colaborador123456"}' | ConvertFrom-Json
$ambitoAna = curl.exe -s -X POST "$BASE/auth/seleccionar-ambito" `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer $($loginAna.accessToken)" `
  -d "{`"membresiaId`": $($loginAna.membresias[0].membresiaId)}" | ConvertFrom-Json
$tokenAna = $ambitoAna.accessToken
```

**4.1 — Descubrir qué puede pedir** (sin conocer de antemano `suplidorId` ni
`menuDiaId` — el endpoint agregado al cerrar el roadmap, Sprint 9):

```powershell
$disponible = curl.exe -s "$BASE/pedidos/menu-disponible" -H "Authorization: Bearer $tokenAna" | ConvertFrom-Json
$disponible.menu.$fechaLunes
```

**Esperado:** lista con `suplidorId` (guárdalo como `$suplidorId`),
`menuDiaId` de la bandeja y de la pechuga, `precio` ya con el ajuste del
contrato aplicado (0% en este caso, Futuro ARS↔Cocina Criolla), `disponible:
true` (antes del cutoff, con cupo).

**4.2 — Crear un pedido** (bandeja del lunes, para probar más adelante el
camino de confirmación normal):

```powershell
$menuDiaLunes = ($disponible.menu.$fechaLunes | Where-Object { $_.productoNombre -eq 'Bandeja del día' }).menuDiaId

$pedido1 = curl.exe -s -X POST "$BASE/pedidos" `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer $tokenAna" `
  -d (@{ fecha = $fechaLunes; suplidorId = $suplidorId; lineas = @(@{ menuDiaId = $menuDiaLunes; cantidad = 1 }) } | ConvertTo-Json -Depth 5) | ConvertFrom-Json
$pedido1
```

**Esperado:** `201`, `estado: "CONFIRMADO"`, `codigo_retiro` de 6
caracteres, `monto_colaborador` calculado según el programa de beneficio
(`MONTO_FIJO`, subsidio RD$250 por día, tope diario RD$300 — con la bandeja
a RD$320, a Ana le toca RD$70). **Guarda `codigo_retiro` como
`$codigoRetiro1` y el `id` como `$pedidoId1`.**

**4.3 — Repetir el mismo pedido (mismo colaborador, fecha y suplidor):**

```powershell
curl.exe -s -X POST "$BASE/pedidos" -H "Content-Type: application/json" -H "Authorization: Bearer $tokenAna" `
  -d (@{ fecha = $fechaLunes; suplidorId = $suplidorId; lineas = @(@{ menuDiaId = $menuDiaLunes; cantidad = 1 }) } | ConvertTo-Json -Depth 5)
```

**Esperado:** `403`, "Ya existe un pedido tuyo para esa fecha y suplidor."
— la validación 6 del motor de elegibilidad, en el camino real.

**4.4 — Segundo pedido, para el martes** (pechuga — lo usarás para el
camino de disputa en la Sección 5):

```powershell
$menuDiaMartes = ($disponible.menu.$fechaMartes | Where-Object { $_.productoNombre -eq 'Pechuga a la plancha' }).menuDiaId

$pedido2 = curl.exe -s -X POST "$BASE/pedidos" -H "Content-Type: application/json" -H "Authorization: Bearer $tokenAna" `
  -d (@{ fecha = $fechaMartes; suplidorId = $suplidorId; lineas = @(@{ menuDiaId = $menuDiaMartes; cantidad = 1 }) } | ConvertTo-Json -Depth 5) | ConvertFrom-Json
$pedido2
```

**Esperado:** `201`, mismo patrón que 4.2. **Guarda `codigo_retiro` como
`$codigoRetiro2` y el `id` como `$pedidoId2`.**

**4.5 — Ver mis pedidos:**

```powershell
curl.exe -s "$BASE/pedidos/mios" -H "Authorization: Bearer $tokenAna"
```

**Esperado:** los 2 pedidos, ambos `CONFIRMADO`, con `puedeConfirmar: false`
(todavía no están `ENTREGADO`).

---

## 5. Sprint 5 — Entrega, confirmación y disputa

**5.1 — El suplidor ve su lista de preparación** (con el token del
suplidor, `$tokenSup`, de la Sección 3 — nota que el `codigo_retiro` **no**
aparece aquí a propósito):

```powershell
curl.exe -s "$BASE/pedidos/preparacion?fecha=$fechaLunes" -H "Authorization: Bearer $tokenSup"
```

**Esperado:** el pedido de Ana agrupado bajo "Torre corporativa · piso 4",
con su línea de bandeja — sin `codigo_retiro` en la respuesta.

**5.2 — Pasar a preparación y entregar el pedido del lunes:**

```powershell
curl.exe -s -X PATCH "$BASE/pedidos/$pedidoId1/preparar" -H "Authorization: Bearer $tokenSup"

curl.exe -s -X PATCH "$BASE/pedidos/$pedidoId1/entregar" -H "Content-Type: application/json" -H "Authorization: Bearer $tokenSup" `
  -d (@{ codigoRetiro = $codigoRetiro1 } | ConvertTo-Json)
```

**Esperado:** el primer PATCH devuelve `estado: "EN_PREPARACION"`; el
segundo, `estado: "ENTREGADO"` con `entregado_en`. Prueba también el
rechazo real, con un código incorrecto:

```powershell
curl.exe -s -X PATCH "$BASE/pedidos/$pedidoId2/entregar" -H "Content-Type: application/json" -H "Authorization: Bearer $tokenSup" `
  -d '{"codigoRetiro":"XXXXXX"}'
```

**Esperado:** `400`, "El código de retiro no coincide con el de este pedido."

**5.3 — Ana confirma el pedido del lunes como recibido:**

```powershell
curl.exe -s -X PATCH "$BASE/pedidos/$pedidoId1/confirmar-recibido" -H "Authorization: Bearer $tokenAna"
```

**Esperado:** `estado: "RECIBIDO"`, `confirmado_en` presente. Este cambio
también postea el `CARGO` al libro mayor (Sprint 6) dentro de la misma
transacción — lo verificarás indirectamente en la Sección 6.

**5.4 — Camino de disputa: entrega y disputa del pedido del martes:**

```powershell
curl.exe -s -X PATCH "$BASE/pedidos/$pedidoId2/entregar" -H "Content-Type: application/json" -H "Authorization: Bearer $tokenSup" `
  -d (@{ codigoRetiro = $codigoRetiro2 } | ConvertTo-Json)

curl.exe -s -X PATCH "$BASE/pedidos/$pedidoId2/disputar" -H "Content-Type: application/json" -H "Authorization: Bearer $tokenAna" `
  -d '{"motivo":"INCOMPLETO","nota":"Faltó la ensalada"}'
```

**Esperado:** el pedido queda `estado: "DISPUTA"`, `motivo_disputa:
"INCOMPLETO"`.

**5.5 — RRHH revisa y resuelve la disputa a favor de Ana** (con
`$tokenRrhh`, de la Sección 1):

```powershell
curl.exe -s "$BASE/pedidos/disputas" -H "Authorization: Bearer $tokenRrhh"

curl.exe -s -X PATCH "$BASE/pedidos/$pedidoId2/resolver-disputa" -H "Content-Type: application/json" -H "Authorization: Bearer $tokenRrhh" `
  -d '{"aFavorColaborador": true, "nota":"Confirmado con el suplidor, faltó la ensalada"}'
```

**Esperado:** el `GET` lista el pedido con su motivo y nota; el `PATCH`
devuelve `estado: "NO_ENTREGADO"`, `resolucion_disputa:
"A_FAVOR_COLABORADOR"` — a Ana no se le cobra este pedido (nunca postea
`CARGO`).

---

## 6. Sprint 6 — Nómina y libro mayor

Con `$tokenRrhh`.

**6.1 — Ver ciclos** (el `CARGO` del pedido 1 ya debería haber abierto uno,
al confirmarse en 5.3):

```powershell
curl.exe -s "$BASE/nomina/ciclos" -H "Authorization: Bearer $tokenRrhh"
```

**Esperado:** al menos un ciclo `ABIERTO` cubriendo la fecha de hoy, según
la frecuencia quincenal de Futuro ARS.

**6.2 — Ver y editar la plantilla del archivo de descuento:**

```powershell
curl.exe -s "$BASE/nomina/plantilla-descuento" -H "Authorization: Bearer $tokenRrhh"

curl.exe -s -X PUT "$BASE/nomina/plantilla-descuento" -H "Content-Type: application/json" -H "Authorization: Bearer $tokenRrhh" `
  -d '{"campos":[{"campo":"codigo_nomina","etiqueta":"Código"},{"campo":"nombre_completo"},{"campo":"monto_total","etiqueta":"Descuento RD$"}]}'
```

**Esperado:** el `GET` trae `catalogoDisponible` con los 9 campos fijos; el
`PUT` confirma los 3 campos elegidos, con la etiqueta personalizada donde se
dio.

**6.3 — Ajuste manual** (una nota de crédito, por ejemplo por buena
voluntad comercial):

```powershell
curl.exe -s -X POST "$BASE/nomina/movimientos/ajuste" -H "Content-Type: application/json" -H "Authorization: Bearer $tokenRrhh" `
  -d '{"colaboradorId": <id de Ana>, "tipo":"NOTA_CREDITO", "monto": 20, "motivo":"Cortesía por demora"}'
```

**Esperado:** `201`, `tipo: "NOTA_CREDITO"`, contra el ciclo abierto
vigente.

**6.4 — Cerrar el ciclo** (fallará si queda algo `ENTREGADO`/`DISPUTA` sin
resolver — ya deberían estar resueltos los 2 pedidos de este recorrido):

```powershell
curl.exe -s -X POST "$BASE/nomina/ciclos/cerrar" -H "Content-Type: application/json" -H "Authorization: Bearer $tokenRrhh" -d '{}'
```

**Esperado:** `estado: "CERRADO"`, `cerrado_en` presente. **Guarda el `id`
como `$cicloId`.**

**6.5 — Descargar el archivo de descuento:**

```powershell
curl.exe -s "$BASE/nomina/ciclos/$cicloId/archivo-descuento" -H "Authorization: Bearer $tokenRrhh"
```

**Esperado:** CSV de texto plano, cabecera `Código,nombre_completo,Descuento
RD$`, con la fila de Ana Ramírez incluyendo el `CARGO` de RD$70 (pedido 1)
y la `NOTA_CREDITO` de RD$20 restada del total (RD$50 neto).

---

## 7. Sprint 7 — Liquidación a suplidores

Con `$tokenAdmin` (SUPERADMIN, plataforma).

**7.1 — Calcular el lote del suplidor:**

```powershell
curl.exe -s -X POST "$BASE/liquidaciones/calcular" -H "Content-Type: application/json" -H "Authorization: Bearer $tokenAdmin" `
  -d "{`"suplidorId`": $suplidorId}" | ConvertFrom-Json
```

**Esperado:** `201`, `estado: "CALCULADO"`, `monto_total` = RD$320 (el
único pedido `RECIBIDO` de este suplidor, el de la bandeja — el del martes
quedó `NO_ENTREGADO`, no cuenta), `cantidad_pedidos: 1`. **Guarda el `id`
como `$loteId`.**

**7.2 — Ver el lote y su desglose:**

```powershell
curl.exe -s "$BASE/liquidaciones" -H "Authorization: Bearer $tokenAdmin"
curl.exe -s "$BASE/liquidaciones/$loteId" -H "Authorization: Bearer $tokenAdmin"
```

**Esperado:** el detalle trae `pedidos: [...]` con `empresa_nombre: "Futuro
ARS"` (no el nombre del colaborador — PII que no le corresponde al
suplidor).

**7.3 — Marcar como pagado:**

```powershell
curl.exe -s -X PATCH "$BASE/liquidaciones/$loteId/marcar-pagado" -H "Content-Type: application/json" -H "Authorization: Bearer $tokenAdmin" `
  -d '{"referenciaPago":"TRANSF-00123"}'
```

**Esperado:** `estado: "PAGADO"`, `referencia_pago: "TRANSF-00123"`. Sin
`RESEND_API_KEY` configurada, este paso también dispara un intento de
notificación que queda `OMITIDA` — verificable en la Sección 9.2.

---

## 8. Sprint 8 — Ayuda

**8.1 — Ana ve solo lo suyo** (rol COLABORADOR + `TODOS`):

```powershell
curl.exe -s "$BASE/ayuda" -H "Authorization: Bearer $tokenAna"
```

**Esperado:** las 3 fichas con `rol_objetivo` `COLABORADOR` o `TODOS`
(silencio, tope de endeudamiento, congelamiento de menú) — no las de RRHH
ni SUPLIDOR_ADMIN.

**8.2 — Buscador:**

```powershell
curl.exe -s "$BASE/ayuda?buscar=silencio" -H "Authorization: Bearer $tokenAna"
```

**Esperado:** solo la ficha de política de silencio.

**8.3 — Crear una ficha nueva** (solo plataforma):

```powershell
curl.exe -s -X POST "$BASE/ayuda" -H "Content-Type: application/json" -H "Authorization: Bearer $tokenAdmin" `
  -d '{"titulo":"Cómo importar colaboradores por CSV","cuerpo":"...","rolObjetivo":"SOPORTE","pantallaId":"back-office.importar","orden":1}'
```

**Esperado:** `201`. Repite el mismo `POST` con `$tokenRrhh` en vez de
`$tokenAdmin` para confirmar el rechazo:

**Esperado:** `403` — el `REVOKE` de Postgres sobre `almuerzo_app`, no solo
el chequeo de rol.

---

## 9. Sprint 9 — Reportes, notificaciones y endurecimiento

**9.1 — Los 4 reportes:**

```powershell
curl.exe -s "$BASE/reportes/consumo-colaborador" -H "Authorization: Bearer $tokenRrhh"
curl.exe -s "$BASE/reportes/gasto-empresa" -H "Authorization: Bearer $tokenRrhh"
curl.exe -s "$BASE/reportes/entregas-suplidor" -H "Authorization: Bearer $tokenSup"
curl.exe -s "$BASE/reportes/disputas" -H "Authorization: Bearer $tokenRrhh"
```

**Esperado:** `consumo-colaborador` muestra a Ana con `cantidad_pedidos: 1`
(solo el `RECIBIDO`, no el `NO_ENTREGADO` — la corrección del 31 de julio
de 2026). `entregas-suplidor` muestra Cocina Criolla del Este con
`recibidos: 1`, `no_entregados: 1`, `tasaDisputasPct` reflejando la disputa
que hubo. `disputas` muestra una fila `INCOMPLETO` /
`A_FAVOR_COLABORADOR`, cantidad 1.

**9.2 — Auditoría de notificaciones** (solo plataforma):

```powershell
curl.exe -s "$BASE/notificaciones" -H "Authorization: Bearer $tokenAdmin"
```

**Esperado:** al menos 3 intentos registrados (pedido `ENTREGADO` x2,
disputa resuelta, lote pagado), todos `OMITIDA` si no configuraste
`RESEND_API_KEY`/`RESEND_FROM_EMAIL` en tu `.env`, o `ENVIADA` si sí lo
hiciste.

**9.3 — Headers de seguridad y rate limiting:**

```powershell
curl.exe -si "$BASE/health" | Select-String "X-Frame-Options|X-Content-Type-Options"

1..6 | ForEach-Object {
  curl.exe -s -o $null -w "%{http_code}`n" -X POST "$BASE/auth/login" `
    -H "Content-Type: application/json" -d '{"email":"nadie@nada.demo","password":"lo-que-sea"}'
}
```

**Esperado:** los headers de `helmet` presentes en cualquier respuesta; de
los 6 intentos de login seguidos, los primeros 5 responden `401`
(credenciales inválidas) y el sexto responde `429` (límite de 5 por minuto
por IP).

---

## 10. Sprint 10 — Frontend (colaborador) ✅ confirmado el 31 de julio de 2026

Con la API corriendo (`npm run start:dev`, puerto 3000):

```bash
cd frontend
npm install        # solo la primera vez
npm run dev         # http://localhost:5176
```

1. Abre `http://localhost:5176`. **Esperado:** pantalla de login, tarjeta
   blanca sobre fondo `paper`, tipografía IBM Plex.
2. Entra con `ana.ramirez@futuroars.demo` / `colaborador123456`.
   **Esperado:** como Ana solo tiene una membresía, entra directo a la app
   (sin pantalla de selección de ámbito) — pero el mismo flujo funciona
   igual si un usuario tuviera varias (ver Sprint 1/README).
3. En la tarjeta "Pedir almuerzo", cambia la fecha del selector.
   **Esperado:** la lista de platos se actualiza; si el suplidor no
   publicó ese día o no queda cupo, un aviso ámbar lo dice en vez de
   quedar en blanco.
4. Haz clic en un plato disponible. **Esperado:** se resalta en verde
   (selección única — clic de nuevo lo deselecciona), aparece el precio
   bruto debajo con la nota de que el subsidio se calcula al confirmar.
5. Clic en "Confirmar pedido". **Esperado:** aviso verde con el pedido
   creado, código de retiro, y el desglose real (bruto / cubre la empresa
   / a tu cargo) devuelto por la API. La tarjeta "Mis pedidos" se
   actualiza sola con el pedido nuevo en `CONFIRMADO`.
6. En "Mis pedidos", clic en "Cancelar" sobre el pedido recién creado
   (antes de su cutoff). **Esperado:** pasa a `CANCELADO`, badge gris.
7. Repite el pedido, y con el suplidor entregándolo por `curl` mientras
   tanto (Sección 5 de este documento, pasos 5.1–5.2, con el `codigoRetiro`
   que te mostró la app), refresca "Mis pedidos" (o espera hasta 30s, se
   refresca sola). **Esperado:** el pedido aparece `ENTREGADO`, con
   botones "Recibí" y "No llegó", y la cuenta regresiva de la ventana de
   confirmación.
8. Clic en "No llegó" → elige un motivo → "Enviar reclamo". **Esperado:**
   modal con los 5 motivos exactos del backend, el pedido pasa a
   `DISPUTA`. (Alternativa: clic en "Recibí" en vez de disputar —
   **esperado:** pasa a `RECIBIDO`, sin acciones disponibles — no existe
   un botón "Reclamar" sobre `RECIBIDO`, a propósito, ver Sprint 10 en
   `plan-sprints.md`).
9. Debajo del botón de confirmar pedido, revisa el medidor "Comprometido
   este ciclo". **Esperado:** barra verde que crece con cada pedido
   confirmado/recibido, ámbar sobre 70% del tope, granate sobre 90%.
10. Clic en "Salir" (encabezado). **Esperado:** vuelve a la pantalla de
    login; recargar la página sin volver a entrar también redirige a
    login (sesión vive en `localStorage`, se borra al salir).

**No cubierto en este tramo, a propósito:** los otros 3 roles (suplidor,
RRHH, back office) siguen sin frontend — se agrega su propio tramo aquí
cuando se confirme cada sprint futuro.

---

## 11. Sprint 11 — Frontend (suplidor) ✅ confirmado el 3 de agosto de 2026

Con la API corriendo y `cd frontend && npm run dev`:

1. Entra con `suplidor@cocinacriolla.demo` / `suplidor123456`.
   **Esperado:** portal del suplidor, con 3 pestañas: Catálogo, Plantilla
   semanal, Calendario y preparación.
2. En "Catálogo", edita el nombre de un plato (sale del campo para
   guardar) y pega una URL de imagen. **Esperado:** el cambio se refleja
   sin recargar la página; sin foto, cada plato muestra un color por id.
3. Clic en "Agregar plato" → llena SKU/nombre/categoría → "Crear plato".
   **Esperado:** aparece en la lista, activo por defecto.
4. En "Plantilla semanal", marca un checkbox de un plato en un día que no
   lo tenía. **Esperado:** pide precio y cupo por `prompt`, y el plato
   queda agregado a ese día de esa semana (1 o 2).
5. Destilda un checkbox de un plato ya agregado. **Esperado:** desaparece
   de ese día — usa el `DELETE` nuevo de este sprint
   (`/catalogo/plantillas/:id/items/:itemId}`), no quedaba forma de hacer
   esto antes.
6. En "Calendario y preparación", clic en "Publicar próximos 10 días
   hábiles". **Esperado:** aparecen tarjetas de fecha con estado
   `PUBLICADO`; clic en una muestra sus platos con precio/cupo editable.
7. Con un pedido real que un colaborador (Sección 10, `ana.ramirez@
   futuroars.demo`) haya confirmado para una fecha publicada, baja a
   "Preparación y entrega" en esa misma fecha. **Esperado:** el pedido
   aparece agrupado por punto de entrega, sin el código de retiro
   expuesto.
8. Clic en "Pasar a preparación". **Esperado:** el pedido cambia a
   `EN_PREPARACION`.
9. Escribe el código de retiro (el que la app del colaborador le mostró a
   Ana) y clic en "Entregar". **Esperado:** con el código correcto, pasa a
   `ENTREGADO`; con uno incorrecto, la API lo rechaza y el aviso rojo lo
   dice.
10. Vuelve a "Mis pedidos" en la app del colaborador (Sección 10).
    **Esperado:** el pedido aparece `ENTREGADO`, con la cuenta regresiva de
    la ventana de confirmación — el mismo pedido, visto desde los dos
    frontends reales.

**No cubierto en este tramo, a propósito:** subida real de archivos de
imagen (campo de texto, URL), gestión de feriados, aprobación de menú por
RRHH — ninguno existe en el backend real, ver discrepancias del Sprint 11
en `plan-sprints.md`.

---

## 12. Sprint 12 — Frontend (RRHH) ✅ confirmado el 4 de agosto de 2026

Con la API corriendo y `cd frontend && npm run dev`:

1. Entra con `rrhh@futuroars.demo` / `rrhh123456`. **Esperado:** panel de
   RRHH, con 3 pestañas: Disputas y pedidos, Ciclos y libro mayor,
   Programas de beneficio.
2. En "Disputas y pedidos", si hay una disputa pendiente (Sección 5, paso
   8), clic en "A favor del colaborador" o "A favor del suplidor".
   **Esperado:** la disputa desaparece de la lista, y el pedido cambia de
   estado (`NO_ENTREGADO` o `RECIBIDO` según corresponda). Debajo, la
   tabla de pedidos de la empresa se actualiza sola.
3. En "Ciclos y libro mayor", clic en "Cerrar ahora" sobre el ciclo
   `ABIERTO`. **Esperado:** si hay pedidos `ENTREGADO`/`DISPUTA` sin
   resolver en el rango, un aviso rojo con el mensaje exacto de la API;
   si no, el ciclo pasa a `CERRADO`.
4. Sobre un ciclo `CERRADO`, clic en "Descargar archivo de descuento".
   **Esperado:** el navegador descarga un `.csv` real con las columnas
   configuradas en la plantilla de abajo.
5. En "Plantilla del archivo de descuento", clic en un campo del catálogo
   para agregarlo/quitarlo. **Esperado:** el número de orden se actualiza
   en los botones activos, y el próximo CSV descargado refleja el cambio.
6. En "Programas de beneficio", clic en "Crear programa" → llena
   nombre/tipo/valor → "Crear programa". **Esperado:** aparece en la
   lista, `ACTIVO`.
7. Clic en "Ver asignados" sobre ese programa nuevo → elige un colaborador
   → fecha de hoy → "Asignar". **Esperado:** si el colaborador ya tiene
   otro programa vigente que se solapa, un aviso rojo con el mensaje
   exacto de la API (`EXCLUDE` de Postgres traducido a texto legible); si
   no, aparece en la tabla de asignados.
8. Clic en "Finalizar hoy" sobre una asignación vigente. **Esperado:**
   pierde el botón de finalizar (ya no está vigente), y ese colaborador
   queda libre para que se le asigne otro programa desde hoy en adelante.

**No cubierto en este tramo, a propósito:** la tarjeta de "menús por
aprobar" y cualquier integración real con un sistema de nómina externo —
ninguno existe en el backend real, ver discrepancias del Sprint 12 en
`plan-sprints.md`.

---

## 13. Sprint 13 — Frontend (back office) ✅ confirmado el 5 de agosto de 2026

Con la API corriendo y `cd frontend && npm run dev`:

1. Entra con `admin@plataforma.demo` / `admin123456`. **Esperado:** panel
   de back office, con la lista de empresas existentes (tarjetas con RNC,
   cantidad de colaboradores, suplidores activos, estado).
2. Clic en "Dar de alta empresa nueva". **Esperado:** wizard de 3 pasos.
   Llena razón social y RNC (formato `000-00000-0`) → "Continuar".
   **Esperado:** la empresa se crea de verdad (aparecerá en la lista al
   volver) y avanza al paso 2.
3. Selecciona un archivo CSV real con columnas `codigo_nomina,cedula,
   nombre_completo,email,punto_entrega,salario_neto` (coma o punto y coma,
   ambos funcionan) → "Ver revisión de filas". **Esperado:** tabla con
   una fila por colaborador, estado `OK`/`ALERTA`/`ERROR` por fila, y los
   4 contadores arriba (filas leídas, listas, con alerta, con error). Si
   el archivo no es un CSV válido, un aviso rojo con el motivo exacto
   (no un error genérico).
4. Clic en "Importar N colaborador(es)". **Esperado:** aviso verde con la
   cantidad importada; botón para volver a la lista de empresas.
5. Clic en la empresa recién creada. **Esperado:** vista de detalle con
   sus contratos (vacía la primera vez) y un resumen (colaboradores,
   suplidores activos, frecuencia de nómina, estado).
6. En "Agregar suplidor", clic en uno de los botones de la lista.
   **Esperado:** aparece como contrato nuevo, `ACTIVA`, ajuste `0%`.
7. Mueve el slider de "Ajuste de precio" y suéltalo. **Esperado:** el
   valor se guarda solo (sin botón "Guardar" aparte) y el texto de
   explicación cambia según sea descuento o recargo.
8. Clic en "Desactivar contrato". **Esperado:** pasa a `INACTIVA`, y el
   contador de "suplidores activos" en el resumen baja.

**No cubierto en este tramo, a propósito:** edición de una empresa ya
creada, CRUD de `punto_entrega`, y volver a cargar colaboradores en una
empresa ya existente (solo se puede al momento de crearla) — ver
discrepancias del Sprint 13 en `plan-sprints.md`.

### Bugs reales encontrados y corregidos durante esta prueba

1. Un CSV mal formado (ej. una comilla sin cerrar) hacía que el paso 3
   devolviera `500 Internal server error` sin decir qué estaba mal —
   corregido para devolver `400` con el motivo exacto, incluida la línea
   donde falló el parseo.
2. El archivo real del usuario usaba `;` como separador (Excel en
   español) en vez de `,` — el parser solo aceptaba coma. Corregido para
   detectar automáticamente cuál de los dos usa el archivo.

---

## 16. Sprint 16 — Autoservicio de RRHH (carga de colaboradores) ✅ confirmado el 5 de agosto de 2026

Con la API corriendo y `cd frontend && npm run dev`:

1. Entra con `rrhh@futuroars.demo` / `rrhh123456` → pestaña "Cargar
   colaboradores" del panel de RRHH.
2. Selecciona un archivo CSV real de tus propios colaboradores → "Ver
   revisión de filas". **Esperado:** misma tabla de revisión que en el
   back office (Sección 13), sin pedir datos de ninguna empresa — ya es
   la tuya.
3. Clic en "Importar N colaborador(es)". **Esperado:** aviso verde con la
   cantidad importada; los colaboradores nuevos aparecen si vas a
   "Programas de beneficio" a asignarles uno.

**No cubierto en este tramo, a propósito:** nada distinto al back office
— mismas reglas, mismo motor, solo sin `admin@plataforma.demo` de por
medio.

### Bugs reales encontrados y corregidos durante esta prueba (con el archivo real del usuario)

1. Una cédula de 9 dígitos y un punto de entrega desconocido **no eran
   bugs** — la primera es un dato real inválido (probable pérdida de
   ceros a la izquierda al editar en Excel), el segundo ya era una
   alerta no bloqueante, funcionando como se diseñó desde el Sprint 2.
2. `salario_neto` con formato español (`35.000,00`, punto de millar y
   coma decimal) o con símbolo de moneda delante (`RD$35,000.00`) hacía
   que la fila se rechazara como "salario inválido" — y aunque no se
   hubiera rechazado, el `INSERT` a la columna `NUMERIC` de Postgres
   habría fallado igual con la coma sin limpiar. Corregido con
   `normalizarMonto()`, que detecta el formato (español vs. dominicano/US)
   mirando cuál separador aparece último, y dentro de
   `validarCsvColaboradores` sobrescribe el valor con el ya limpio, para
   que la importación real use el mismo número que se validó.

---

## 17. Sprint 17 — Relación comercial suplidor-empresa ✅ confirmado el 6 de agosto de 2026

Con la API corriendo y `cd frontend && npm run dev`:

1. Entra con `suplidor@cocinacriolla.demo` / `suplidor123456` → pestaña
   "Relación comercial".
2. En "Solicitar contrato", escribe el RNC de una empresa existente sin
   contrato con este suplidor (con o sin guiones — ambos funcionan) y un
   ajuste propuesto → "Solicitar contrato". **Esperado:** aparece en "Tus
   contratos" como `pendiente`.
3. En "Registrar lead", llena nombre (obligatorio) y el resto opcional →
   "Registrar lead". **Esperado:** aparece en "Tus leads" como
   `pendiente`.
4. Entra con `admin@plataforma.demo` / `admin123456` → pestaña
   "Solicitudes y leads". **Esperado:** ves la solicitud del paso 2 y el
   lead del paso 3.
5. Clic en "Aprobar" sobre la solicitud. **Esperado:** desaparece de la
   bandeja; si vuelves a entrar como el suplidor, su contrato ya aparece
   `activo`.
6. Clic en "Crear empresa desde este lead" sobre el lead del paso 3.
   **Esperado:** te lleva a la pestaña "Empresas", wizard de alta, con el
   nombre (y RNC si el suplidor lo puso) ya prellenados. Completa el
   wizard normal (CSV opcional). **Esperado:** al confirmar la
   importación, el lead queda `convertido` en la bandeja.

**No cubierto en este tramo, a propósito:** editar o retirar una
solicitud ya enviada, notificación por email de aprobación/rechazo —
ninguno existe, ver "Fuera de alcance" del Sprint 17 en
`plan-sprints.md`.

### Bug real encontrado y corregido durante esta prueba

Solicitar un contrato por RNC sin guiones (`130552117`) no encontraba la
empresa guardada con guiones (`130-55211-7`) — comparaba el RNC como
texto exacto. Corregido comparando solo dígitos en la consulta.

---

## 14. Sprint 14 — Dashboard de plataforma ✅ confirmado el 6 de agosto de 2026

Con la API corriendo y `cd frontend && npm run dev`:

1. Entra con `admin@plataforma.demo` / `admin123456` → pestaña "Panel de
   plataforma". **Esperado:** 3 tarjetas arriba (Volumen/GMV, Ingreso
   propio, Aporte de las empresas) con datos reales, y debajo Cobertura
   de menú publicado por suplidor + Pedidos por estado.
2. Clic en "editar" bajo "Ingreso propio" → cambia la tasa de comisión →
   "Guardar". **Esperado:** el valor de "Ingreso propio" se recalcula
   (GMV × la nueva tasa), sin recargar la página.
3. Ve a la pestaña "Trazabilidad". **Esperado:** lista de eventos
   (fecha, actor, `pedido #N (empresa): estado_anterior → estado_nuevo`)
   — solo lectura, ningún botón de editar/insertar (es un log
   append-only, mismo criterio que el libro mayor del Sprint 6).
4. Con un pedido real recorriendo su ciclo de vida (crear → preparar →
   entregar → confirmar), refresca "Trazabilidad". **Esperado:** cada
   transición aparece como un evento nuevo, con el actor correcto
   (colaborador, suplidor, RRHH o silencio).

**No cubierto en este tramo, a propósito:** cobrar la comisión de verdad
(descontarla de la liquidación a suplidores), trazabilidad de otras
entidades (contratos, leads, ciclos) — ninguno existe, ver "Fuera de
alcance" del Sprint 14 en `plan-sprints.md`.
