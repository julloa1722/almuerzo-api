# RECORRIDO-FINAL.md — un período completo, de punta a punta

Documento del Sprint 15 (ver `plan-sprints.md`). No es una lista de
verificación técnica — eso ya lo cubre `PLAN-PRUEBAS.md`, sprint por
sprint. Esto es una sola historia de negocio, contada de principio a fin:
una empresa contrata la plataforma, sus colaboradores piden almuerzo
durante un período, algo sale mal y se resuelve, y al cerrar el período
el dinero se mueve correctamente en las dos direcciones — descuento a
colaboradores, pago al suplidor.

Recorre esto con clics reales en tu navegador. Donde algo no se vea o no
se sienta como debería, anótalo en la sección final ("Ajustes pedidos") —
son exactamente el tipo de cosas que vale la pena pedir ajustar ahora que
el sistema completo está armado y se puede ver todo junto.

**Verificado por Claude contra la API real antes de entregarte esto**
(6 de agosto de 2026): la cadena completa — pedir, entregar, confirmar,
disputar, resolver, cerrar ciclo, descargar archivo, calcular y pagar
liquidación, ver el dashboard reflejar todo — se corrió de punta a punta
sin encontrar un paso que no funcionara. El detalle exacto de esa
verificación está en `plan-sprints.md`, Sprint 15.

---

## 0. Preparación

```powershell
npm run start          # API en localhost:3000, en una terminal aparte
cd frontend && npm run dev   # frontend en localhost:5176
```

Usuarios de este recorrido (del seed, ver `CLAUDE.md`):

| Rol | Email | Contraseña |
|---|---|---|
| Back office (plataforma) | `admin@plataforma.demo` | `admin123456` |
| RRHH (Futuro ARS) | `rrhh@futuroars.demo` | `rrhh123456` |
| Suplidor (Cocina Criolla del Este) | `suplidor@cocinacriolla.demo` | `suplidor123456` |
| Colaboradora (Futuro ARS) | `ana.ramirez@futuroars.demo` | `colaborador123456` |

---

## 1. Back office: alta de una empresa nueva, con su primer usuario

**Actualizado (Sprint 18, 6 de agosto de 2026):** el bloqueo que este
recorrido documentaba aquí —"no hay forma de crear un usuario RRHH para
una empresa nueva"— ya se resolvió. Se deja la nota como estaba, tachada,
porque así se descubrió el gap real que llevó al Sprint 18: ~~al dar de
alta una empresa nueva, hoy no hay ninguna forma de crear un usuario
RRHH con acceso a ella~~.

1. Entra como `admin@plataforma.demo` → pestaña "Empresas" → "Dar de
   alta empresa nueva".
2. Completa razón social y RNC → "Continuar".
3. Sube un CSV de colaboradores (o pega uno de prueba) → revisa la tabla
   de errores/alertas → "Importar".
4. En el detalle de la empresa recién creada, clic en "Agregar
   suplidor" → elige uno de la lista.
5. Pestaña "Usuarios" → "Nueva invitación" → ámbito "Empresa" → elige la
   empresa recién creada → rol `RRHH` → el correo de la persona real →
   "Enviar invitación". **Esperado:** si configuraste `RESEND_API_KEY`,
   le llega un correo real; si no, la pantalla te da el link para
   copiar y pasarle a mano — ninguno de los dos casos bloquea el flujo.
6. Esa persona abre el link (`/invitacion/:token`), define su
   contraseña, y entra **ya logueada** como RRHH de la empresa nueva —
   sin pasar por login por separado.

**Lo que esto demuestra:** el ciclo de vida completo de "una empresa
nueva llega a la plataforma, y su gente puede entrar a usarla" ya
funciona de principio a fin, sin que nadie tenga que tocar la base de
datos a mano.

---

## 2. El período: Futuro ARS + Cocina Criolla del Este

De aquí en adelante, la historia continúa con una empresa ya operando de
verdad — es lo que pasa cada quincena, no solo el día de la firma del
contrato.

### 2.1 RRHH revisa a su gente y su programa de beneficio

1. Entra como `rrhh@futuroars.demo` → pestaña "Cargar colaboradores".
   Si tienes un CSV nuevo (altas o cambios), súbelo aquí — mismo motor
   que usa back office, sin depender de plataforma (Sprint 16).
2. Pestaña "Programas de beneficio" → confirma que "Almuerzo Futuro ARS"
   está `ACTIVO` y que los colaboradores que van a pedir en este período
   tienen una asignación vigente (columna "Vigente hasta" vacía o
   posterior a hoy).

### 2.2 El suplidor prepara la semana

1. Entra como `suplidor@cocinacriolla.demo` → pestaña "Plantilla
   semanal" → confirma que ambas semanas (1 y 2) tienen platos
   asignados a cada día.
2. Pestaña "Catálogo" → si hay un plato nuevo, agrégalo aquí primero.
3. Pestaña "Calendario y preparación" → "Publicar próximos 10 días
   hábiles". Verás las fechas nuevas aparecer con estado `PUBLICADO`.

### 2.3 Los colaboradores piden

1. Entra como `ana.ramirez@futuroars.demo` (o cualquier otro
   colaborador del seed).
2. En "Pedir almuerzo", elige una fecha publicada, un plato, y
   confirma. Repite para un segundo día — vas a necesitar al menos 2
   pedidos en este período para ver el paso de la disputa más abajo.
3. En "Mis pedidos", confirma que ambos aparecen `CONFIRMADO`, con su
   código de retiro.

### 2.4 El suplidor prepara y entrega

1. De vuelta como el suplidor, pestaña "Calendario y preparación",
   sección "Preparación y entrega" de cada fecha con pedidos.
2. Para cada pedido: "Pasar a preparación" → escribe el código de
   retiro (el colaborador te lo dice, nunca se muestra en tu pantalla a
   propósito) → "Entregar".

### 2.5 Un colaborador confirma, otro reporta un problema

1. Como el colaborador, en "Mis pedidos", verás los dos pedidos ahora
   `ENTREGADO`, con la cuenta regresiva de la ventana de confirmación.
2. En el primero, clic en "Confirmar recibido". **Esperado:** pasa a
   `RECIBIDO` — el cargo real ya se generó en el libro mayor.
3. En el segundo, clic en "Reportar problema" → elige un motivo (ej.
   "Llegó incompleto") → nota opcional → "Enviar reclamo". **Esperado:**
   pasa a `DISPUTA`.

### 2.6 RRHH resuelve la disputa

1. Entra como RRHH → pestaña "Disputas y pedidos".
2. Verás el pedido en disputa, con el motivo y la nota. Decide: "A
   favor del colaborador" (el pedido pasa a `NO_ENTREGADO`, sin cargo)
   o "A favor del suplidor" (pasa a `RECIBIDO`, el cargo se mantiene).

### 2.7 RRHH cierra el ciclo y descarga el archivo de descuento

1. Pestaña "Ciclos y libro mayor". Verás el ciclo `ABIERTO` del período
   actual, con los movimientos ya generados por los pedidos `RECIBIDO`
   de este recorrido.
2. Clic en "Cerrar ahora". **Esperado:** si queda algún pedido
   `ENTREGADO`/`DISPUTA` sin resolver en el rango, un aviso rojo con el
   motivo exacto — resuélvelo primero (paso 2.6) y reintenta.
3. Con el ciclo ya `CERRADO`, clic en "Descargar archivo de descuento".
   **Esperado:** un `.csv` real, con las columnas que hayas configurado
   en "Plantilla del archivo de descuento", listo para pegar en el
   sistema de nómina real de la empresa.

### 2.8 Plataforma liquida al suplidor

**Nota real, sin pantalla propia todavía:** a diferencia de todo lo
anterior, este paso no tiene frontend — es un gap real anotado en
`plan-sprints.md` desde el Sprint 7, nunca resuelto. Se hace por API
directa:

```powershell
$login = Invoke-RestMethod -Uri "http://localhost:3000/auth/login" -Method Post -ContentType "application/json" -Body (@{ email = "admin@plataforma.demo"; password = "admin123456" } | ConvertTo-Json)
$m = $login.membresias[0]
$sel = Invoke-RestMethod -Uri "http://localhost:3000/auth/seleccionar-ambito" -Method Post -ContentType "application/json" -Headers @{ Authorization = "Bearer $($login.accessToken)" } -Body (@{ membresiaId = $m.membresiaId } | ConvertTo-Json)
$headers = @{ Authorization = "Bearer $($sel.accessToken)" }

# Ajusta las fechas al período que acabas de cerrar arriba
$liq = Invoke-RestMethod -Uri "http://localhost:3000/liquidaciones/calcular" -Method Post -ContentType "application/json" -Headers $headers -Body (@{ suplidorId = 1; periodoInicio = "AAAA-MM-DD"; periodoFin = "AAAA-MM-DD" } | ConvertTo-Json)
$liq

# Una vez transferido el dinero de verdad, fuera del sistema:
Invoke-RestMethod -Uri "http://localhost:3000/liquidaciones/$($liq.id)/marcar-pagado" -Method Patch -ContentType "application/json" -Headers $headers -Body (@{ referenciaPago = "TU-REFERENCIA" } | ConvertTo-Json)
```

**Esperado:** `$liq.monto_total` coincide con la suma de los pedidos
`RECIBIDO` del suplidor en ese rango, agregando todas las empresas que
lo contrataron (no solo Futuro ARS) — es el modelo intermediario ya
documentado desde el Sprint 7.

### 2.9 Plataforma revisa que todo cuadre

1. Como `admin@plataforma.demo`, pestaña "Panel de plataforma".
   **Esperado:** el GMV confirmado y el aporte de las empresas ya
   incluyen lo que acaba de pasar en este recorrido.
2. Pestaña "Trazabilidad". **Esperado:** el historial completo de cada
   uno de los pedidos de este recorrido — creado → confirmado →
   preparación → entregado → recibido (o disputa → resuelto), con el
   actor correcto en cada paso.

---

## 3. Variante opcional: relación comercial (Sprint 17)

No es parte del período recurrente, pero sí del ciclo de vida completo
del negocio — cuándo un suplidor nuevo entra a servir a una empresa:

1. Como el suplidor, pestaña "Relación comercial" → "Solicitar
   contrato" con el RNC de una empresa que no le haya contratado
   todavía.
2. Como back office, pestaña "Solicitudes y leads" → "Aprobar".
3. Alternativa: el suplidor "Registra un lead" de una empresa que no
   está en la plataforma → back office la ve en la bandeja → "Crear
   empresa desde este lead" (te lleva de vuelta al wizard del paso 1,
   con los datos prellenados).

---

## 4. Variante opcional, no recorrida en vivo: resolución por silencio

Si un colaborador ni confirma ni disputa dentro de la ventana configurada
(`horas_ventana_confirmacion` del programa de beneficio, por defecto 24h),
el pedido se resuelve solo la próxima vez que alguien de la empresa toque
pedidos — sin ningún job en segundo plano, ver `plan-sprints.md`, Sprint
5. Esto es difícil de recorrer en vivo sin esperar horas de verdad; ya
está cubierto por `test/entrega-disputas.test.js` (P2/P3/P4, los tres
casos: se resuelve a `RECIBIDO`, se resuelve a `DISPUTA`, y todavía no
vence). Si quieres verlo en el navegador de todas formas, edita
temporalmente `horas_ventana_confirmacion` de un programa a un valor
chico (ej. `0.01`, unos 36 segundos) desde la base, deja un pedido en
`ENTREGADO`, espera ese tiempo, y refresca "Mis pedidos" — verás la
resolución automática. Restaura el valor después.

---

## 5. Ajustes pedidos

_(Anota aquí, mientras recorres el sistema, cualquier cosa que quieras
que se vea distinto, se sienta distinto, o falte — un botón que debería
estar en otro lado, un texto confuso, un paso que debería ser más corto.
Uno por uno, se resuelven después de terminar el recorrido completo.)_

-
-
-
