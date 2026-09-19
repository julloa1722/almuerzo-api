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

La primera es la que copiaste de Neon, tal cual. Las otras dos son la misma
cadena cambiando **solo usuario y contraseña**:

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

Render te va a pedir las variables marcadas como secretas. Son estas cuatro,
todas en el servicio `almuerzo-api`:

| Variable | Qué pegar |
|---|---|
| `MIGRATE_DATABASE_URL` | La cadena de `neondb_owner` del paso 2 |
| `DATABASE_URL` | La de `almuerzo_app` |
| `PLATFORM_DATABASE_URL` | La de `almuerzo_platform` |
| `RESEND_API_KEY` | Tu API key de [resend.com](https://resend.com), o déjala vacía |
| `RESEND_FROM_EMAIL` | El remitente verificado en Resend, o vacío |

**No** tienes que configurar `JWT_SECRET`: `render.yaml` le dice a Render que
genere uno aleatorio y lo guarde. Tampoco `CORS_ORIGENES` ni `VITE_API_URL` —
Render las resuelve sola enlazando un servicio con el otro.

> **Sin Resend** las notificaciones por correo quedan registradas como
> `OMITIDA` y nada se rompe. Pero **las invitaciones y la recuperación de
> contraseña llegan por correo**: sin Resend, tendrás que pasar los enlaces a
> mano. Para una prueba real, configúralo.

Ahora sí: **Apply** / **Create**.

## Paso 5 — Esperar el primer deploy

Render construye los dos servicios. Tarda entre 5 y 10 minutos la primera vez.

En los logs de `almuerzo-api` deberías ver, en este orden:

```
Tomando el lock de migraciones ...
Aplicando 0001_extensiones.sql ...
  OK: 0001_extensiones.sql
... (18 migraciones)
18 migración(es) aplicada(s).
almuerzo-api escuchando en el puerto 10000
CORS permitido para: https://almuerzo-front.onrender.com
```

Las migraciones corren solas en cada arranque — no tienes que hacer nada desde
tu máquina. Si una falla, el servicio no arranca: es a propósito, mejor caído
que sirviendo contra un esquema equivocado.

**Verifica la API** abriendo `https://almuerzo-api.onrender.com/health`.
Debe responder:

```json
{"estado":"ok","baseDeDatos":"conectada","basePlataforma":"conectada","latenciaMs":123}
```

Si dice `"estado":"degradado"`, el mismo JSON te dice cuál de las dos bases
falló y por qué — casi siempre es una contraseña mal copiada.

## Paso 6 — Crear tu usuario administrador

La base de producción está vacía: no hay ni un usuario, así que todavía no
puedes entrar. **No corras `npm run seed`** — eso siembra los datos de demo,
incluido un administrador con la contraseña `admin123456`, que está publicada
en este mismo repositorio.

Desde tu máquina, con `MIGRATE_DATABASE_URL` apuntando **a producción**:

```powershell
$env:MIGRATE_DATABASE_URL = "postgres://neondb_owner:XXXX@ep-algo.neon.tech/neondb?sslmode=require"
npm run crear-admin -- --email tu@correo.com --password "una frase larga que recuerdes"
```

Debe responder:

```
Usuario creado: tu@correo.com
Membresía SUPERADMIN de plataforma creada.
```

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

**El frontend carga pero todo da error de red** — es CORS. Abre la consola del
navegador (F12). Si dice que el origen fue bloqueado, revisa `CORS_ORIGENES`
en el servicio `almuerzo-api`: debe tener el dominio del frontend. Render la
llena sola, pero si le pusiste un dominio propio hay que agregarlo a mano,
separado por comas.

**Un enlace de invitación da 404** — el rewrite del sitio estático no está
activo. Sin él, `/invitacion/:token` y `/restablecer-password/:token` no
existen como archivos y el host devuelve 404. Está declarado en `render.yaml`
bajo `routes`; si lo tocaste, restáuralo.

**`/health` dice `degradado`** — el JSON incluye el motivo por cada base.
Contraseña mal copiada, o el host de la rama equivocada.

**El servicio se reinicia solo, sin requests** — revisa que
`src/db/db.module.ts` siga registrando `pool.on('error')`. Sin ese listener,
una conexión ociosa que Neon corta al suspenderse tumba el proceso entero.

**Los logins fallan con 429 a cada rato** — falta `CONFIAR_EN_PROXY=true` en
el servicio. Sin eso, todos los requests parecen venir de la misma IP (la del
balanceador de Render) y el límite de 5 intentos por minuto se comparte entre
todos los usuarios de la plataforma.

---

## Volver atrás

No hay `migrate down` — a propósito, revertir DDL automáticamente es más
peligroso que útil.

- **Para el código:** en Render, cada deploy tiene un botón de rollback.
- **Para la base:** usa el point-in-time restore de Neon (crea un branch desde
  un momento anterior y apunta ahí las variables).

Ojo con el orden: restaurar la base **no** revierte el código desplegado. Si
vuelves la base a un estado sin la última migración, vuelve también el código.
