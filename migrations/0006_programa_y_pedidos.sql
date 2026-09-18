-- Sprint 4: programa de beneficio, asignación, y el pedido en sí.
--
-- "tipo" en programa_beneficio desde el día uno: es la decisión de
-- extensibilidad multi-beneficio que ya se tomó en la conversación de diseño
-- (hoy solo se usa ALMUERZO; el día que se agregue farmacia u óptica, no hace
-- falta migrar nada, solo agregar filas con un tipo distinto).

CREATE TABLE programa_beneficio (
  id                  BIGSERIAL PRIMARY KEY,
  empresa_id          BIGINT NOT NULL REFERENCES empresa(id),
  tipo                VARCHAR(20) NOT NULL DEFAULT 'ALMUERZO',
  nombre              VARCHAR(120) NOT NULL,
  tipo_subsidio       VARCHAR(20) NOT NULL CHECK (tipo_subsidio IN ('MONTO_FIJO','PORCENTAJE','TOTAL')),
  valor_subsidio      NUMERIC(12,2) NOT NULL DEFAULT 0,
  tope_diario_subsidio NUMERIC(12,2),
  tope_ciclo_colaborador NUMERIC(12,2),
  permite_excedente   BOOLEAN NOT NULL DEFAULT true,
  dias_semana         SMALLINT[] NOT NULL DEFAULT '{1,2,3,4,5}',
  pct_max_salario     NUMERIC(5,2) NOT NULL DEFAULT 15.00,
  estado              VARCHAR(20) NOT NULL DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO','INACTIVO'))
);

ALTER TABLE programa_beneficio ENABLE ROW LEVEL SECURITY;
ALTER TABLE programa_beneficio FORCE ROW LEVEL SECURITY;
CREATE POLICY programa_beneficio_por_empresa ON programa_beneficio
  USING (empresa_id = NULLIF(current_setting('app.empresa_id', true), '')::bigint);

-- suplidor_id y empresa_id ya usan btree_gist (Sprint 1). asignacion_programa
-- usa la misma extensión para impedir que un colaborador tenga dos programas
-- vigentes al mismo tiempo — la restricción que se documentó en el diseño
-- original y nunca se había materializado hasta ahora.
CREATE TABLE asignacion_programa (
  id             BIGSERIAL PRIMARY KEY,
  empresa_id     BIGINT NOT NULL REFERENCES empresa(id), -- denormalizado para RLS simple, mismo patrón que plantilla_item
  colaborador_id BIGINT NOT NULL REFERENCES colaborador(id),
  programa_id    BIGINT NOT NULL REFERENCES programa_beneficio(id),
  vigente_desde  DATE NOT NULL,
  vigente_hasta  DATE,
  EXCLUDE USING gist (
    colaborador_id WITH =,
    daterange(vigente_desde, COALESCE(vigente_hasta, 'infinity'::date)) WITH &&
  )
);

ALTER TABLE asignacion_programa ENABLE ROW LEVEL SECURITY;
ALTER TABLE asignacion_programa FORCE ROW LEVEL SECURITY;
CREATE POLICY asignacion_programa_por_empresa ON asignacion_programa
  USING (empresa_id = NULLIF(current_setting('app.empresa_id', true), '')::bigint);

CREATE TABLE pedido (
  id                BIGSERIAL PRIMARY KEY,
  empresa_id        BIGINT NOT NULL REFERENCES empresa(id),
  colaborador_id    BIGINT NOT NULL REFERENCES colaborador(id),
  suplidor_id       BIGINT NOT NULL REFERENCES suplidor(id),
  fecha_servicio    DATE NOT NULL,
  estado            VARCHAR(20) NOT NULL DEFAULT 'CONFIRMADO'
                       CHECK (estado IN ('CONFIRMADO','CANCELADO','EN_PREPARACION','ENTREGADO','RECIBIDO','DISPUTA','NO_ENTREGADO')),
  cutoff_at         TIMESTAMPTZ NOT NULL,
  total_bruto       NUMERIC(12,2) NOT NULL,
  subsidio_empresa  NUMERIC(12,2) NOT NULL,
  monto_colaborador NUMERIC(12,2) NOT NULL,
  codigo_retiro     VARCHAR(12) NOT NULL,
  creado_en         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (total_bruto = subsidio_empresa + monto_colaborador),
  UNIQUE (colaborador_id, fecha_servicio, suplidor_id)
);

CREATE INDEX idx_pedido_empresa_fecha ON pedido(empresa_id, fecha_servicio);
CREATE INDEX idx_pedido_colaborador ON pedido(colaborador_id);

ALTER TABLE pedido ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido FORCE ROW LEVEL SECURITY;
CREATE POLICY pedido_por_empresa ON pedido
  USING (empresa_id = NULLIF(current_setting('app.empresa_id', true), '')::bigint);

-- empresa_id denormalizado aquí también, mismo patrón, para no depender de un
-- JOIN contra pedido dentro de la política de RLS.
CREATE TABLE pedido_linea (
  id          BIGSERIAL PRIMARY KEY,
  pedido_id   BIGINT NOT NULL REFERENCES pedido(id) ON DELETE CASCADE,
  empresa_id  BIGINT NOT NULL REFERENCES empresa(id),
  menu_dia_id BIGINT NOT NULL REFERENCES menu_dia(id),
  cantidad    SMALLINT NOT NULL CHECK (cantidad > 0),
  precio_unit NUMERIC(12,2) NOT NULL,
  subtotal    NUMERIC(12,2) NOT NULL
);

ALTER TABLE pedido_linea ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_linea FORCE ROW LEVEL SECURITY;
CREATE POLICY pedido_linea_por_empresa ON pedido_linea
  USING (empresa_id = NULLIF(current_setting('app.empresa_id', true), '')::bigint);
