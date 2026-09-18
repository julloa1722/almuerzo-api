# versiones/ — snapshots restaurables (archivo histórico)

> **Actualización del 16 de septiembre de 2026 — esta carpeta ya no se
> alimenta.** Git sí está instalado ahora y el proyecto tiene control de
> versiones real (`main`, con destino
> `https://github.com/julloa1722/FreeEat`). Los `.zip` de abajo se
> conservan como archivo histórico de los Sprints 9–19, pero **ya no hay
> que generar uno nuevo por sprint**: eso lo cubre git. Ver `CHANGELOG.md`.
>
> Al preparar la subida a GitHub se encontró que
> `sprint-19-2026-08-06.zip` contenía un `.env` real (credenciales de
> Neon y `JWT_SECRET`), contradiciendo lo que este mismo archivo dice dos
> párrafos más abajo. Se eliminó esa entrada del `.zip` antes del primer
> commit, así que nunca llegó al historial de git. Los otros 6 snapshots
> estaban limpios.

Mientras el proyecto no tuvo control de versiones real (git no se pudo
instalar en esta máquina en aquel momento — ver `plan-sprints.md`, Sprint
9), cada sprint confirmado dejó aquí un `.zip` con el código completo en
ese punto (sin `node_modules`, `dist`, ni `.env` — igual que excluiría
`.gitignore`).

**Para volver a una versión anterior:**
1. Guarda aparte cualquier cambio actual que no quieras perder.
2. Descomprime el `.zip` de la versión que quieres recuperar sobre el
   proyecto (o en una carpeta nueva para comparar antes de reemplazar).
3. `npm install` (las dependencias pueden diferir entre versiones).
4. Revisa `migrations/` — si la versión a la que vuelves tiene menos
   migraciones que las ya aplicadas en tu base de Neon, **no** corras
   `migrate:down` a ciegas (no existe un downgrade automático — ver
   `scripts/migrate.js`); columnas o tablas de más en la base no rompen
   nada mientras el código no las use, así que en general no hace falta
   revertir la base para volver el código atrás.

**Convención de nombre:** `sprint-N-AAAA-MM-DD.zip`, con la fecha de cuando
se tomó el snapshot (ver `CHANGELOG.md` para el detalle de qué cambió en
cada uno).

## Snapshots disponibles

- `sprint-19-2026-08-06.zip` — el más reciente. Sprint 19 confirmado:
  recuperación de contraseña, resumen por rol (RRHH/suplidor/colaborador),
  y la extensión del mismo día (correo del CSV expuesto + invitación
  masiva de colaboradores, subsprints 19.7/19.8). Con esto los 9 sprints
  de frontend documentados quedan todos confirmados — ver "Gaps
  identificados" en `plan-sprints.md` para lo que sigue sin construir a
  propósito.
- `sprint-15-18-2026-08-06.zip` — Sprint 15 (recorrido
  final, `RECORRIDO-FINAL.md`) y Sprint 18 (invitación de usuarios)
  confirmados — el roadmap actual queda completo, sin ningún sprint
  reservado sin desglosar. Ver `plan-sprints.md`/`CHANGELOG.md` para el
  detalle.
- `sprint-14-2026-08-06.zip`.
- `sprint-17-2026-08-06.zip` — Sprints 13, 16 y 17 confirmados desde el
  último snapshot limpio (Sprint 12).

**Nota real (6 de agosto de 2026):** los snapshots de `sprint-10-11`,
`sprint-12`, `sprint-13` y `sprint-16` se borraron — un bug real en el
script de armado (el bucle que excluye `node_modules`/`dist` copiaba
`frontend/` completo *antes* de aplicar la exclusión, así que el filtro
nunca llegaba a tiempo) hacía que casi el 97% de cada archivo fuera
`frontend/node_modules`/`frontend/dist`. No corrompía la restauración
(`npm install` los regenera igual, paso 3 de abajo), pero contradecía
esta misma documentación y pesaban ~20× más de lo necesario. No es
posible reconstruirlos limpios de forma retroactiva sin git — el
snapshot de `sprint-17` ya cubre el estado acumulado de todos ellos. Cubre **dos** sprints
  confirmados en un solo snapshot: el Sprint 10 (frontend colaborador,
  confirmado el 31 de julio) nunca generó su propio `.zip` — se saltó el
  proceso descrito abajo, un bug real de proceso, no de código, corregido
  aquí — y el Sprint 11 (frontend suplidor, confirmado el 3 de agosto).
  Ver `plan-sprints.md`, Sprints 10 y 11, y `CHANGELOG.md` para el detalle
  de qué cambió en cada uno.
- `fix-reportes-libro-mayor-2026-07-31.zip`.
  `consumo-colaborador`/`gasto-empresa` corregidos para salir de
  `movimiento` (el libro mayor), no de `pedido` directo — ver
  `CHANGELOG.md`. También corrige 5 líneas de estado obsoletas en
  `plan-sprints.md`.
- `cierre-roadmap-2026-07-30.zip` — Sprint 4 confirmado + `GET
  /pedidos/menu-disponible` (resuelve el hueco de descubrimiento de menú
  anotado desde el Sprint 5), encima del estado del Sprint 9.

- `sprint-9-2026-07-30.zip` — estado del código con los subsprints 9.1–9.3
  (reportes, notificaciones, endurecimiento) — **✅ confirmado por el
  usuario el 30 de julio de 2026**, ningún archivo cambió desde que se tomó
  el snapshot. Es el primer snapshot que existe — no fue posible
  reconstruir snapshots retroactivos de los Sprints 1–8 (el árbol de
  trabajo solo refleja el estado acumulado actual, no había forma de
  recuperar cada estado intermedio sin git). De aquí en adelante, cada
  sprint confirmado agrega uno nuevo.
