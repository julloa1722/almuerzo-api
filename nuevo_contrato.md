Antes de que confirme el Sprint 13, necesito que resuelvas dos cosas:

PRIMERO — verifica el estado real antes de construir nada:
Estuve discutiendo 6 decisiones de negocio en otra conversación mientras
tú seguías trabajando. Revisa el código y plan-sprints.md actual (puede
haber cambiado desde la última vez que lo compartí) y dime, para cada una,
si ya existe, existe parcialmente, o no existe en absoluto. No reconstruyas
lo que ya esté hecho — solo complétalo o corrígelo si hace falta.

Las 6 decisiones:

1. RRHH puede subir su propio CSV de colaboradores (autoservicio), no solo
   el back office. Mismos endpoints /preview e /importar ya existentes,
   expuestos también bajo ámbito EMPRESA (rol RRHH/ADMIN_EMPRESA), sin
   parámetro de empresaId — se toma del ámbito del token. Reutiliza el
   motor de validación existente, no lo dupliques. El disparador de esta
   decisión: el volumen de altas de empresa va a crecer más rápido de lo
   que yo puedo sostener manualmente (ver decisión 2).

2. Un suplidor puede solicitar vinculación (contrato) con una empresa que
   YA EXISTE en la plataforma — busca por RNC, propone términos de
   contrato, queda en estado PENDIENTE hasta que back office apruebe.

3. Corrección importante: un suplidor NUNCA crea una empresa nueva,
   directo ni con aprobación — ni siquiera vía solicitud. Solo el back
   office da de alta empresas (esto ya era así en el Sprint 2 — confírmame
   que sigue siendo así y que nada de lo que construiste después lo
   contradice).

4. Para cuando un suplidor conoce una empresa que NO está en la
   plataforma: un "lead comercial" — solo una nota (nombre propuesto,
   contacto, mensaje), sin crear nada automáticamente. Back office lo ve
   en una bandeja de pendientes por contactar; si la negociación real
   prospera fuera del sistema, da de alta la empresa por el flujo normal
   del Sprint 2 y opcionalmente enlaza el lead como CONVERTIDO, que desde la bandeja de pendientes pueda con un boton a la creacion de empresa, con los datos pre llenados.

5. Gap para anotar, NO construir: centro de costo/departamento/turno por
   colaborador — no existe ningún campo para esto hoy.

6. Gap para anotar, NO construir: límite de subsidio configurable POR
   EMPLEADO individual, no solo por empresa completa — hoy todos los
   colaboradores de una empresa comparten el mismo programa_beneficio.

SEGUNDO — antes de que yo confirme el Sprint 13:
¿Alguna de estas 6 decisiones (sobre todo la 1, autoservicio de RRHH, y
la 2/3/4, sobre cómo el suplidor se relaciona con empresas) afecta algo
que ya construiste en el Sprint 13 (back office) o en el Sprint 11
(portal del suplidor)? Si el Sprint 13 necesita ajustarse por esto,
dímelo ANTES de que yo vaya a confirmarlo en el navegador — no quiero
confirmar algo que vas a tener que romper después.

Documenta lo que falte en plan-sprints.md, siguiendo EXPERTO.md, antes de
construir cualquier código nuevo.