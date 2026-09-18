-- Sprint 14: dashboard de plataforma.
--
-- Dos decisiones de negocio reales, resueltas con el usuario el 6 de
-- agosto de 2026 (ver plan-sprints.md, Sprint 14):
-- 1. La comisión de plataforma se agrega SOLO para la métrica informativa
--    "ingreso propio" del dashboard — no descuenta nada de la liquidación
--    real a suplidores (Sprint 7 sigue pagando el 100% del total_bruto
--    ajustado). Esa decisión no se reabre aquí.
-- 2. pedido_evento es un log paralelo de ESTADO, no de dinero — no
--    reemplaza a `movimiento` (Sprint 6), que sigue siendo la fuente de
--    verdad del dinero.

-- ---------- configuracion_plataforma: fila única ----------
--
-- No es una tabla de tenant (sin empresa_id/suplidor_id) — es
-- configuración global de plataforma. RLS activado sin ninguna política:
-- falla cerrado por defecto, solo almuerzo_platform (BYPASSRLS) puede
-- tocarla, mismo principio ya documentado en CLAUDE.md.
CREATE TABLE configuracion_plataforma (
  id                SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  tasa_comision_pct NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (tasa_comision_pct BETWEEN 0 AND 100),
  actualizado_en    TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO configuracion_plataforma (id) VALUES (1);

ALTER TABLE configuracion_plataforma ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracion_plataforma FORCE ROW LEVEL SECURITY;

-- ---------- pedido_evento: trazabilidad de estado ----------
CREATE TABLE pedido_evento (
  id              BIGSERIAL PRIMARY KEY,
  pedido_id       BIGINT NOT NULL REFERENCES pedido(id),
  empresa_id      BIGINT NOT NULL REFERENCES empresa(id), -- denormalizado, mismo patrón que pedido_linea
  estado_anterior VARCHAR(20),
  estado_nuevo    VARCHAR(20) NOT NULL,
  actor           VARCHAR(20) NOT NULL CHECK (actor IN ('COLABORADOR', 'SUPLIDOR', 'RRHH', 'SILENCIO')),
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pedido_evento_pedido ON pedido_evento(pedido_id);
CREATE INDEX idx_pedido_evento_empresa_creado ON pedido_evento(empresa_id, creado_en);

ALTER TABLE pedido_evento ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_evento FORCE ROW LEVEL SECURITY;

-- Las transiciones de crear/cancelar/confirmar/disputar/resolver-disputa/
-- silencio corren bajo ámbito EMPRESA.
CREATE POLICY pedido_evento_empresa ON pedido_evento
  USING (empresa_id = NULLIF(current_setting('app.empresa_id', true), '')::bigint)
  WITH CHECK (empresa_id = NULLIF(current_setting('app.empresa_id', true), '')::bigint);

-- preparar/entregar/no-entregado corren bajo ámbito SUPLIDOR — mismo
-- patrón EXISTS contra contrato_suplidor que ya usa la migración 0008
-- para que el suplidor pueda escribir sobre pedidos que no son "suyos"
-- en el sentido de RLS por empresa_id.
CREATE POLICY pedido_evento_suplidor_con_contrato ON pedido_evento
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM contrato_suplidor cs
      WHERE cs.empresa_id = pedido_evento.empresa_id
        AND cs.suplidor_id = NULLIF(current_setting('app.suplidor_id', true), '')::bigint
        AND cs.estado = 'ACTIVA'
    )
  );
