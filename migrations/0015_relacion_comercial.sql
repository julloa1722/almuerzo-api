-- Sprint 17: relación comercial suplidor-empresa.
--
-- Decisiones de negocio 2, 3 (confirmación) y 4 de `nuevo_contrato.md`
-- (5 de agosto de 2026): el suplidor puede proponer un contrato con una
-- empresa ya existente (queda PENDIENTE hasta que back office lo
-- apruebe/rechace), y puede registrar un "lead" comercial de una empresa
-- que no está en la plataforma (solo una nota, sin crear nada
-- automático). El suplidor nunca crea una empresa, ni siquiera por esta
-- vía — back office decide en los dos casos. Ver plan-sprints.md,
-- Sprint 17.

-- ---------- contrato_suplidor: dos estados nuevos ----------
--
-- PENDIENTE: el suplidor lo solicitó, nadie lo resolvió todavía.
-- RECHAZADA: back office lo rechazó explícitamente — se distingue de
-- INACTIVA porque nunca llegó a estar vigente (INACTIVA es "lo
-- desactivamos", RECHAZADA es "lo rechazamos de entrada").
--
-- Todo el código existente (Sprints 4, 5, 7) ya filtra explícitamente
-- por estado = 'ACTIVA' en sus EXISTS — agregar dos valores nuevos al
-- dominio no cambia ninguna consulta existente, verificado al revisar
-- cada uso antes de escribir esto.
ALTER TABLE contrato_suplidor DROP CONSTRAINT contrato_suplidor_estado_check;
ALTER TABLE contrato_suplidor ADD CONSTRAINT contrato_suplidor_estado_check
  CHECK (estado IN ('ACTIVA', 'INACTIVA', 'PENDIENTE', 'RECHAZADA'));

-- El suplidor solo podía leer sus propios contratos (migración 0009).
-- Ahora también puede proponer uno nuevo con cualquier empresa — nunca
-- en nombre de otro suplidor. La aplicación, no la base, fuerza
-- estado = 'PENDIENTE' en cada solicitud nueva (el endpoint nunca acepta
-- ese campo del body), así que el WITH CHECK no necesita validar estado.
CREATE POLICY contrato_suplidor_solicitud_por_suplidor ON contrato_suplidor
  FOR INSERT
  WITH CHECK (suplidor_id = NULLIF(current_setting('app.suplidor_id', true), '')::bigint);

-- Sin esta política, un UPSERT (ON CONFLICT ... DO UPDATE) desde ámbito
-- SUPLIDOR fallaría al re-solicitar un contrato que ya existe en estado
-- INACTIVA/RECHAZADA (el UPDATE de la parte DO UPDATE lo evalúa la
-- política de UPDATE, no la de INSERT) — el suplidor solo puede tocar
-- sus propios contratos, igual que la de INSERT de arriba.
CREATE POLICY contrato_suplidor_solicitud_update_por_suplidor ON contrato_suplidor
  FOR UPDATE
  USING (suplidor_id = NULLIF(current_setting('app.suplidor_id', true), '')::bigint)
  WITH CHECK (suplidor_id = NULLIF(current_setting('app.suplidor_id', true), '')::bigint);

-- ---------- lead_comercial ----------
--
-- Nota simple del suplidor sobre una empresa que le gustaría servir pero
-- que no está en la plataforma. No crea ninguna empresa ni contrato — el
-- back office decide si contactarla y, si prospera, la da de alta por el
-- flujo normal (Sprint 13) y opcionalmente enlaza el lead como
-- CONVERTIDO.
CREATE TABLE lead_comercial (
  id              BIGSERIAL PRIMARY KEY,
  suplidor_id     BIGINT NOT NULL REFERENCES suplidor(id),
  nombre_propuesto VARCHAR(160) NOT NULL,
  rnc_propuesto   VARCHAR(20),
  contacto        VARCHAR(160),
  mensaje         TEXT,
  estado          VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'CONVERTIDO')),
  empresa_id      BIGINT REFERENCES empresa(id),
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_comercial_suplidor ON lead_comercial(suplidor_id);

ALTER TABLE lead_comercial ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_comercial FORCE ROW LEVEL SECURITY;

-- El suplidor ve y crea únicamente los suyos.
CREATE POLICY lead_comercial_por_suplidor ON lead_comercial
  USING (suplidor_id = NULLIF(current_setting('app.suplidor_id', true), '')::bigint)
  WITH CHECK (suplidor_id = NULLIF(current_setting('app.suplidor_id', true), '')::bigint);

-- Plataforma (almuerzo_platform, BYPASSRLS) ve y gestiona todos, igual
-- que el resto del back office — no necesita una política propia.
