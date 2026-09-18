-- Sprint 7: liquidación a suplidores.
-- Ver plan-sprints.md, Sprint 7, para el diseño completo y las decisiones
-- resueltas con el usuario antes de escribir este archivo.

-- Un suplidor puede servir a empresas con frecuencia_nomina distinta —
-- agregar "por período" no puede depender de la frecuencia de ninguna
-- empresa en particular, así que el suplidor tiene la suya propia.
-- permite_liquidacion_con_pendientes es la misma bandera que
-- empresa.permite_cierre_con_pendientes (Sprint 6), ahora del lado suplidor.
ALTER TABLE suplidor
  ADD COLUMN frecuencia_liquidacion VARCHAR(20) NOT NULL DEFAULT 'QUINCENAL'
    CHECK (frecuencia_liquidacion IN ('QUINCENAL','MENSUAL')),
  ADD COLUMN permite_liquidacion_con_pendientes BOOLEAN NOT NULL DEFAULT false;

-- Sin tabla de movimientos aparte: a diferencia del libro mayor del
-- colaborador (Sprint 6), un pedido en RECIBIDO ya es terminal e inmutable
-- por diseño (ningún endpoint lo transiciona más allá). El mismo patrón de
-- "bloquear con pendientes salvo permiso explícito" del Sprint 6 garantiza
-- que, al calcular un lote, todo lo relevante en ese rango ya está resuelto
-- — sumar total_bruto de los pedidos RECIBIDO en el momento del cálculo es
-- correcto y completo, sin necesitar rastrear qué pedido ya se contó.
CREATE TABLE lote_pago_suplidor (
  id              BIGSERIAL PRIMARY KEY,
  suplidor_id     BIGINT NOT NULL REFERENCES suplidor(id),
  periodo_inicio  DATE NOT NULL,
  periodo_fin     DATE NOT NULL,
  estado          VARCHAR(20) NOT NULL DEFAULT 'CALCULADO' CHECK (estado IN ('CALCULADO','PAGADO')),
  monto_total     NUMERIC(12,2) NOT NULL,
  cantidad_pedidos INTEGER NOT NULL,
  calculado_en    TIMESTAMPTZ NOT NULL DEFAULT now(),
  calculado_por   BIGINT REFERENCES usuario(id),
  pagado_en       TIMESTAMPTZ,
  pagado_por      BIGINT REFERENCES usuario(id),
  referencia_pago TEXT,
  UNIQUE (suplidor_id, periodo_inicio, periodo_fin)
);

CREATE INDEX idx_lote_pago_suplidor_suplidor ON lote_pago_suplidor(suplidor_id);

ALTER TABLE lote_pago_suplidor ENABLE ROW LEVEL SECURITY;
ALTER TABLE lote_pago_suplidor FORCE ROW LEVEL SECURITY;

-- Único FOR SELECT a propósito: el suplidor puede ver sus propios lotes,
-- pero nunca crearlos, editarlos ni marcarlos pagados directamente — eso lo
-- hace solo plataforma, vía almuerzo_platform (BYPASSRLS). Sin ninguna
-- política permisiva para INSERT/UPDATE/DELETE, RLS las deniega todas para
-- almuerzo_app.
CREATE POLICY lote_pago_suplidor_lectura_propia ON lote_pago_suplidor
  FOR SELECT
  USING (suplidor_id = NULLIF(current_setting('app.suplidor_id', true), '')::bigint);
