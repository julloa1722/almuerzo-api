# Guía de despliegue — poner la plataforma en internet

Esta guía te lleva desde el proyecto corriendo en tu máquina hasta la
plataforma accesible desde cualquier dispositivo, con tu computadora apagada.

**Tiempo estimado:** 30–40 minutos la primera vez, casi todo esperando builds.
**Costo:** cero. Render y Neon tienen plan gratuito, y no hace falta tarjeta.

Lo que vas a tener al terminar:

- `https://almuerzo-api.onrender.com` — la API
- `https://almuerzo-front.onrender.com` — el frontend, que es lo que abres
  en el navegador o en el teléfono
- Una base de producción en Neon, separada de la que usas para desarrollar

---

## Antes de empezar

Necesitas tres cuentas, todas gratuitas:

- **GitHub** — ya la tienes, el proyecto está en
  `https://github.com/julloa1722/almuerzo-api`
- **Neon** — ya la tienes, es donde vive tu base de desarrollo
- **Render** — la vas a crear en el paso 3

---

## Paso 1 — Crear la base de producción en Neon

No uses tu rama de desarrollo. Producción va aparte, para que sembrar datos de
prueba o romper algo mientras desarrollas nunca toque datos reales.

1. Entra a [console.neon.tech](https://console.neon.tech) y abre tu proyecto.
2. Ve a **Branches** → **New Branch**.
3. Nómbrala `production`. **Créala vacía**, no como copia de `dev` — busca la
   opción de crear sin datos. Si Neon solo te deja ramificar desde otra rama,
   crea mejor un **proyecto nuevo**; el objetivo es una base sin nada adentro.
4. Copia el connection string que te da. Se ve así:

   ```
   postgres://neondb_owner:XXXX@ep-algo-algo.neon.tech/neondb?sslmode=require
   ```

   Guárdalo a mano, lo vas a pegar en el paso 4.

> **Por qué vacía:** las migraciones crean los roles `almuerzo_app` y
> `almuerzo_platform` solo si no existen. Si ramificas desde `dev`, llegan ya
> creados y la migración no hace nada — vas a creer que los creaste cuando en
> realidad heredaste los de desarrollo.

## Paso 2 — Armar las tres cadenas de conexión

La API usa tres usuarios distintos contra la misma base. Es el mecanismo de
aislamiento del proyecto, no un capricho:

| Variable | Usuario | Para qué |
|---|---|---|
| `MIGRATE_DATABASE_URL` | `neondb_owner` | Correr las migraciones. Es la credencial más poderosa |
| `DATABASE_URL` | `almuerzo_app` | La app. **Sin** BYPASSRLS — el aislamiento entre empresas depende de esto |
| `PLATFORM_DATABASE_URL` | `almuerzo_platform` | Back office. Con BYPASSRLS a propósito |

**Esto no se configura en ninguna pantalla.** Son tres líneas de texto que
escribes en un bloc de notas; se pegan en Render, en el paso 4. Neon solo te
da la primera.

**Y los roles `almuerzo_app` y `almuerzo_platform` todavía no existen** — los
crean las migraciones `0003` y `0004` en el primer deploy. Si pruebas a
conectarte con ellos ahora, falla, y está bien. Por eso el `startCommand` corre
primero `npm run migrate` (con `neondb_owner`) y solo después arranca la app.

> ### Usa el host directo, no el `-pooler`
>
> Neon ofrece dos variantes del mismo host:
>
> ```
> ep-algo-123456.us-east-2.aws.neon.tech           ← esta
> ep-algo-123456-pooler.us-east-2.aws.neon.tech    ← esta no
> ```
>
> La versión `-pooler` pasa por PgBouncer en modo transacción, donde
> **`pg_advisory_lock` no funciona de forma fiable**: es un lock de sesión, y
> PgBouncer no garantiza que dos consultas seguidas viajen por la misma. El
> migrador toma ese lock en cada arranque (`scripts/migrate.js`), así que con
> el host agrupado la protección contra migraciones simultáneas deja de servir.
>
> Si en el panel de Neon ves un interruptor *Connection pooling*, apágalo antes
> de copiar la cadena. Las tres variables deben usar el mismo host directo.

La primera es la que copiaste de Neon, tal cual. Las otras dos son la misma
cadena cambiando **solo usuario y contraseña** — todo lo que va del `@` en
adelante es idéntico en las tres:

```
MIGRATE_DATABASE_URL=postgres://neondb_owner:XXXX@ep-algo.neon.tech/neondb?sslmode=require
DATABASE_URL=postgres://almuerzo_app:almuerzo_app_dev@ep-algo.neon.tech/neondb?sslmode=require
PLATFORM_DATABASE_URL=postgres://almuerzo_platform:almuerzo_platform_dev@ep-algo.neon.tech/neondb?sslmode=require
```

> ### ⚠️ Paso opcional, muy recomendado: cambiar esas dos contraseñas
>
> `almuerzo_app_dev` y `almuerzo_platform_dev` están escritas en
> `migrations/0003_rls.sql` y `migrations/0004_contratos_y_rol_plataforma.sql`,
> o sea **publicadas en GitHub**. El segundo rol tiene `BYPASSRLS`: quien
> entre con él lee y escribe los datos de todas las empresas, saltándose el
> aislamiento completo.
>
> Lo único que impide que alguien entre hoy es que no conoce el host de tu
> base. Eso no es una contraseña, es suerte.
>
> **Cómo cambiarlas** (dos minutos, después del paso 5, cuando los roles ya
> existan). En la consola SQL de Neon, sobre la rama de producción:
>
> ```sql
> ALTER ROLE almuerzo_app      WITH PASSWORD 'pon-aqui-algo-largo-y-aleatorio';
> ALTER ROLE almuerzo_platform WITH PASSWORD 'otro-distinto-igual-de-largo';
> ```
>
> Y actualiza `DATABASE_URL` y `PLATFORM_DATABASE_URL` en Render con las
> nuevas. Genera las contraseñas con:
>
> ```powershell
> node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
> ```
>
> Decidiste dejar esto para después, así que la guía no lo da por hecho —
> pero el hueco sigue abierto hasta que lo hagas, y también aplica a tu base
> de desarrollo.

## Paso 3 — Crear el blueprint en Render

1. Crea tu cuenta en [render.com](https://render.com) (puedes entrar con
   GitHub, es lo más rápido).
2. **New** → **Blueprint**.
3. Conecta tu repositorio `julloa1722/almuerzo-api`. Si no aparece, dale
   permiso a Render sobre el repo desde el diálogo de GitHub.
4. Render lee `render.yaml` y te muestra **dos servicios**: `almuerzo-api` y
   `almuerzo-front`. Si solo ves uno, el `render.yaml` no se leyó bien —
   revisa que estés en la rama `main`.
5. Todavía **no** le des a crear: primero las variables, en el paso siguiente.

## Paso 4 — Cargar las credenciales

Render te va a pedir las variables marcadas como secretas. Son estas cinco,
todas en el servicio `almuerzo-api`:

| Variable | Qué pegar |
|---|---|
| `MIGRATE_DATABASE_URL` | La cadena de `neondb_owner` del paso 2 |
| `DATABASE_URL` | La de `almuerzo_app` |
| `PLATFORM_DATABASE_URL` | La de `almuerzo_platform` |
| `RESEND_API_KEY` | Tu API key de [resend.com](https://resend.com), o déjala vacía |
| `RESEND_FROM_EMAIL` | El remitente verificado en Resend, o vacío |

Hay tres más — `CORS_ORIGENES`, `FRONTEND_URL` y `VITE_API_URL` — que **no
puedes llenar todavía**, porque necesitan los dominios que Render asigna al
crear los servicios. Déjalas vacías por ahora; el paso 5b las completa.

**No** tienes que configurar `JWT_SECRET`: `render.yaml` le dice a Render que
genere uno aleatorio y lo guarde.

> **Por qué esas tres son manuales.** El blueprint puede enlazar un servicio
> con otro, y eso se intentó — pero Render entrega ahí el hostname de la *red
> privada*, no el dominio público de internet. Un navegador nunca manda ese
> valor, así que CORS bloquearía todo, y un enlace de correo con ese host no
> llevaría a ninguna parte. No hay forma de obtener el dominio público desde
> el blueprint, así que este paso es manual por diseño de Render.

> **Sin Resend** las notificaciones por correo quedan registradas como
> `OMITIDA` y nada se rompe. Pero **las invitaciones y la recuperación de
> contraseña llegan por correo**: sin Resend, tendrás que pasar los enlaces a
> mano. Para una prueba real, configúralo.

Ahora sí: **Apply** / **Create**.

## Paso 5 — Esperar el primer deploy

Render construye los dos servicios. Tarda entre 5 y 10 minutos la primera vez.

**El primer deploy de la API va a fallar al arrancar, y está bien.** Sin
`FRONTEND_URL` la API se niega a levantar a propósito — es preferible a
arrancar bien y mandar correos de invitación apuntando a `localhost`, que es
un fallo que solo descubres cuando alguien no puede entrar. El paso 5b lo
arregla.

En los logs de `almuerzo-api` deberías ver **exactamente esto**, en este orden:

```
Tomando el lock de migraciones ...
Aplicando 0001_extensiones.sql ...
  OK: 0001_extensiones.sql
... (18 migraciones)
18 migración(es) aplicada(s).
No se puede arrancar: faltan variables de entorno obligatorias: FRONTEND_URL, CORS_ORIGENES.
```

**Esa última línea es el éxito de este paso, no un fracaso.** Significa que las
migraciones corrieron bien contra tu base de producción y que la API se detuvo
donde debía. Render marcará el deploy en rojo; ignóralo por ahora.

Lo que **no** vas a ver todavía son las líneas `almuerzo-api escuchando...` ni
`CORS permitido para...`: la validación de entorno corre antes de levantar el
servidor. Tampoco tiene sentido abrir `/health` aún — el servicio no está en
línea, así que verías la página de error de Render.

**Lo único que hay que verificar aquí son las 18 migraciones.** Si alguna
falla, el resto no se aplica — y entonces el problema está en la base o en las
cadenas de conexión, no en las variables que dejaste vacías.

Las migraciones corren solas en cada arranque, no tienes que hacer nada desde
tu máquina.

El frontend, en cambio, ya debería estar publicado y accesible en su URL
(aunque todavía no pueda hablar con la API — eso lo arregla el paso 5b).

Terminado el paso 5b vas a volver aquí a comprobar la API. Cuando esté arriba,
`https://almuerzo-api.onrender.com/health` debe responder:

```json
{"estado":"ok","baseDeDatos":"conectada","basePlataforma":"conectada","latenciaMs":123}
```

Si dice `"estado":"degradado"`, el JSON trae una etiqueta por cada base:

| Etiqueta | Qué revisar |
|---|---|
| `credenciales-invalidas` | Usuario o contraseña mal copiados en esa `*_DATABASE_URL` |
| `base-no-existe` | El nombre de la base al final de la URL |
| `inalcanzable` | El host — ¿es la rama correcta de Neon? |
| `timeout` | Neon despertando; reintenta en un minuto |
| `error-desconocido` | Cualquier otra cosa: cuota de cómputo de Neon agotada, límite de conexiones, el rol todavía sin crear. Aquí hay que abrir los logs de Render y buscar la línea `Fallo al consultar la base ...`, que trae el mensaje completo |

El motivo completo queda en los logs de Render, no en la respuesta pública —
ese mensaje incluye el host de tu base, y mientras las contraseñas de los roles
sigan publicadas en las migraciones, ese host es lo único que la protege.

> **Si las bases están mal, no vas a poder abrir `/health` en el navegador.**
> `render.yaml` declara `/health` como health check, y ese endpoint devuelve
> 503 cuando alguna base falla — así que Render nunca pone el servicio en
> línea y lo reinicia en bucle. Verías la página de error de Render, no el
> JSON. **En ese caso el diagnóstico está en los logs**, no en la URL: busca
> la línea `Fallo al consultar la base "app"` o `"plataforma"`, que trae el
> mensaje completo. La tabla de arriba sirve cuando el servicio sí está vivo.

## Paso 5b — Conectar los dos servicios entre sí

Ahora que Render ya asignó los dominios, ve a la pestaña **Settings** de cada
servicio y cópialos. Se ven así:

```
https://almuerzo-api.onrender.com
https://almuerzo-front.onrender.com
```

> **Copia los tuyos, no estos.** Los nombres de servicio en `onrender.com` son
> globales: si alguien ya usó `almuerzo-api`, Render le agrega un sufijo al
> tuyo (`almuerzo-api-a1b2.onrender.com`). Esta guía usa los nombres limpios
> como ejemplo, pero lo que vale es lo que diga tu dashboard. Un dominio mal
> copiado aquí es la causa más probable de que el paso 7 no funcione.

En **`almuerzo-api`** → Environment, completa las dos que dejaste vacías:

| Variable | Valor |
|---|---|
| `CORS_ORIGENES` | `https://almuerzo-front.onrender.com` |
| `FRONTEND_URL` | `https://almuerzo-front.onrender.com` |

En **`almuerzo-front`** → Environment:

| Variable | Valor |
|---|---|
| `VITE_API_URL` | `https://almuerzo-api.onrender.com` |

**Ahora redespliega los dos**, en este orden: primero la API (con las
variables ya puestas debe arrancar bien esta vez), después el frontend.

> **El frontend hay que redesplegarlo sí o sí.** Vite mete las variables
> `VITE_*` dentro del código al construirlo, no las lee al ejecutarse.
> Guardar el valor no cambia nada si no se reconstruye el bundle. Es el error
> más común de este paso: se cambia la variable, se recarga la página, y sigue
> apuntando al valor viejo.

Con la API ya arriba, vuelve a abrir `/health` y confirma que dice `ok`.

## Paso 6 — Crear tu usuario administrador

La base de producción está vacía: no hay ni un usuario, así que todavía no
puedes entrar. **No corras `npm run seed`** — eso siembra los datos de demo,
incluido un administrador con la contraseña `admin123456`, que está publicada
en este mismo repositorio.

De hecho ya no puedes: `scripts/seed.js` aborta solo si la base destino no es
`localhost`. Para que siga funcionando en **tu máquina de desarrollo**, declara
una vez en tu `.env` local el host de tu rama `dev` de Neon:

```
SEED_HOST_PERMITIDO=ep-tu-rama-dev.neon.tech
```

Si no sabes cuál es, corre `npm run seed` y el propio error te da la línea ya
escrita. **Nunca pongas ahí el host de producción** — sería desactivar la
protección justo donde más hace falta.

Desde tu máquina, con `MIGRATE_DATABASE_URL` apuntando **a producción**:

```powershell
$env:MIGRATE_DATABASE_URL = "postgres://neondb_owner:XXXX@ep-algo.neon.tech/neondb?sslmode=require"
npm run crear-admin -- --email tu@correo.com --password "una frase larga que recuerdes"
```

Debe responder:

```
Usuario creado: tu@correo.com
Membresía SUPERADMIN de plataforma creada.

Ya puedes entrar al frontend con ese email y contraseña.
Desde ahí, invita al resto de los usuarios — no vuelvas a usar este script.
```

Dos detalles de la contraseña: **mínimo 12 caracteres** (el script la rechaza
si no), y si contiene `$`, usa **comillas simples** — entre comillas dobles
PowerShell lo interpreta como variable y llegaría una contraseña distinta a la
que escribiste, sin ningún aviso.

> ### ⚠️ Cierra esa ventana al terminar
>
> El `$env:MIGRATE_DATABASE_URL` que acabas de fijar **vive mientras la
> ventana de PowerShell esté abierta**, y tiene prioridad sobre tu archivo
> `.env`. Cualquier comando npm que corras después en esa misma ventana
> apuntará a **producción**, no a tu base de desarrollo.
>
> Al terminar, cierra la ventana o limpia la variable:
>
> ```powershell
> Remove-Item Env:MIGRATE_DATABASE_URL
> ```
>
> `npm run seed` detecta esta situación y aborta avisándote, pero no cuentes
> con eso: otros comandos no lo hacen.

Ese script crea un usuario y su membresía de plataforma, y nada más. De ahí en
adelante todo se hace desde la aplicación: ese administrador invita a RRHH y a
suplidores, y RRHH invita a sus colaboradores.

Correrlo dos veces con el mismo correo no duplica nada — actualiza la
contraseña. Es también la forma de recuperar el acceso si la olvidas.

## Paso 7 — Entrar

Abre `https://almuerzo-front.onrender.com` **desde el teléfono**, para
comprobar de verdad que no depende de tu computadora. Entra con el correo y la
contraseña del paso 6.

Deberías caer en el panel de plataforma. Desde ahí: dar de alta una empresa,
cargar su CSV de colaboradores, e invitar a alguien.

**Si no configuraste Resend no va a salir ningún correo, y eso es lo
esperado** — no es que la invitación fallara. La pantalla te muestra el enlace
recién creado justo debajo del formulario: cópialo de ahí y pásalo por el
medio que quieras. Vence en 7 días.

---

## Qué esperar del plan gratuito

**La API se duerme.** Render apaga los servicios web gratuitos tras unos 15
minutos sin tráfico. El siguiente request la despierta, y esa primera llamada
tarda entre 30 y 60 segundos. No está rota: está arrancando. Las siguientes
son normales.

**Neon también se suspende**, por lo mismo. Por eso el pool tiene un timeout
de 15 segundos: si Neon está despertando, la llamada falla con un mensaje
claro en vez de quedarse colgada para siempre. Reintenta y ya.

En la práctica, la primera persona que entra cada mañana espera un minuto y el
resto del día va fluido. Evitarlo cuesta dinero (plan de pago) o exige un cron
que haga ping cada 10 minutos — y este proyecto decidió no tener jobs en
segundo plano.

**El frontend no se duerme**: los sitios estáticos se sirven desde CDN.

---

## Actualizar la aplicación

Cada `git push` a `main` dispara un deploy automático de los dos servicios.
Las migraciones nuevas se aplican solas en el arranque.

```powershell
git add .
git commit -m "lo que cambiaste"
git push
```

---

## Cuando algo falla

**El build muere con `tsc: not found`** — el `buildCommand` perdió el
`--include=dev`. Con `NODE_ENV=production`, npm omite las devDependencies, y
`typescript` vive ahí. Revisa `render.yaml`.

**La API no arranca y el log dice `faltan variables de entorno obligatorias:
FRONTEND_URL, CORS_ORIGENES`** — no hiciste el paso 5b, o lo hiciste sin
redesplegar. Es el comportamiento esperado, no un error: son justo las dos que
dejaste vacías en el paso 4, y salen siempre juntas.

**El frontend carga pero todo da error de red** — dos causas posibles, en
orden de frecuencia. (1) `VITE_API_URL` está bien puesta pero **no
redesplegaste el frontend** después: el bundle viejo sigue apuntando a
`localhost`. Compruébalo en la consola del navegador (F12) mirando a qué URL
van los requests fallidos. (2) Es CORS: si la consola dice que el origen fue
bloqueado, revisa `CORS_ORIGENES` en `almuerzo-api` — debe tener el dominio
del frontend, con `https://`. Para varios dominios, sepáralos por comas.

**Un enlace de invitación da 404** — el rewrite del sitio estático no está
activo. Sin él, `/invitacion/:token` y `/restablecer-password/:token` no
existen como archivos y el host devuelve 404. Está declarado en `render.yaml`
bajo `routes`; si lo tocaste, restáuralo.

**El deploy queda en rojo con "health check failed", o `/health` no responde**
— la API declara `/health` como health check y ese endpoint devuelve 503 si
alguna de las dos bases falla, así que Render no pone el servicio en línea y no
vas a poder leer el JSON. El diagnóstico está en los logs: busca
`Fallo al consultar la base`. Si el servicio **sí** está vivo y `/health`
responde `degradado`, usa la tabla de etiquetas del paso 5.

**Un correo de invitación llega con un enlace equivocado** — `FRONTEND_URL`
tiene un valor incorrecto. Vacía no puede estar: en producción la API se niega
a arrancar sin ella. Corrígela, redespliega la API, y vuelve a mandar las
invitaciones que ya salieron — esos enlaces viejos ya están escritos en los
correos y no cambian solos.

**El servicio se reinicia solo, sin requests** — revisa que
`src/db/db.module.ts` siga registrando `pool.on('error')`. Sin ese listener,
una conexión ociosa que Neon corta al suspenderse tumba el proceso entero.

**Los logins fallan con 429 a cada rato** — `CONFIAR_EN_PROXY` debe valer
`true`. El blueprint la pone sola, así que no tienes que agregarla: revisa en
Environment que siga ahí y que nadie la haya borrado o cambiado. Sin ella todos
los requests parecen venir de la misma IP (la del balanceador de Render) y el
límite de 5 intentos por minuto se comparte entre todos los usuarios de la
plataforma.

---

## Volver atrás

El comando `npm run migrate:down` existe, pero **no revierte nada**: sale con
un error y te manda aquí. Es a propósito — revertir DDL automáticamente es más
peligroso que útil.

- **Para el código:** en Render, cada deploy tiene un botón de rollback.
- **Para la base:** usa el point-in-time restore de Neon (crea un branch desde
  un momento anterior y apunta ahí las variables).

**Ojo con el orden, en las dos direcciones — ninguna arrastra a la otra:**

- Restaurar la base **no** revierte el código desplegado.
- Hacer rollback del código en Render **no** deshace las migraciones ya
  aplicadas. El arranque dirá `Nada que aplicar` y el deploy quedará verde,
  con código viejo corriendo sobre un esquema nuevo, sin ninguna señal de que
  algo está desalineado.

Si la migración que quieres deshacer es incompatible con el código viejo,
tienes que revertir las dos cosas.
