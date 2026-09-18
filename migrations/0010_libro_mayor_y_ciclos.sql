-- Sprint 6: libro mayor, ciclos de nómina y archivo de descuento configurable.
-- Ver plan-sprints.md, Sprint 6, para el diseño completo y las decisiones
-- resueltas con el usuario antes de escribir este archivo.

-- Bandera de la decisión "cierre con pendientes": por defecto, un ciclo con
-- pedidos ENTREGADO/DISPUTA en su rango no se puede cerrar. Una empresa
-- puede activarla si necesita cerrar igual.
ALTER TABLE empresa
  ADD COLUMN permite_cierre_con_pendientes BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE ciclo_nomina (
  id             BIGSERIAL PRIMARY KEY,
  empresa_id     BIGINT NOT NULL REFERENCES empresa(id),
  periodo_inicio DATE NOT NULL,
  periodo_fin    DATE NOT NULL,
  estado         VARCHAR(20) NOT NULL DEFAULT 'ABIERTO' CHECK (estado IN ('ABIERTO','CERRADO')),
  cerrado_en     TIMESTAMPTZ,
  cerrado_por    BIGINT REFERENCES usuario(id),
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, periodo_inicio, periodo_fin)
);

CREATE INDEX idx_ciclo_nomina_empresa_estado ON ciclo_nomina(empresa_id, estado);

ALTER TABLE ciclo_nomina ENABLE ROW LEVEL SECURITY;
ALTER TABLE ciclo_nomina FORCE ROW LEVEL SECURITY;
CREATE POLICY ciclo_nomina_por_empresa ON ciclo_nomina
  USING (empresa_id = NULLIF(current_setting('app.empresa_id', true), '')::bigint);

-- Libro mayor: append-only por diseño, no solo por convención de código.
-- pedido_id es nullable porque una corrección manual (subsprint 6.3) no
-- siempre está atada a un pedido puntual. Solo dos tipos, a propósito: un
-- "AJUSTE" con signo ambiguo obligaría a otro campo para saber si suma o
-- resta — un ajuste manual ya ES simplemente un CARGO o una NOTA_CREDITO
-- sin pedido_id detrás, no hace falta un tercer tipo.
CREATE TABLE movimiento (
  id              BIGSERIAL PRIMARY KEY,
  empresa_id      BIGINT NOT NULL REFERENCES empresa(id),
  colaborador_id  BIGINT NOT NULL REFERENCES colaborador(id),
  ciclo_nomina_id BIGINT NOT NULL REFERENCES ciclo_nomina(id),
  pedido_id       BIGINT REFERENCES pedido(id),
  tipo            VARCHAR(20) NOT NULL CHECK (tipo IN ('CARGO','NOTA_CREDITO')),
  monto           NUMERIC(12,2) NOT NULL CHECK (monto > 0),
  motivo          TEXT,
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
  creado_por      BIGINT REFERENCES usuario(id)
);

CREATE INDEX idx_movimiento_colaborador_ciclo ON movimiento(colaborador_id, ciclo_nomina_id);
CREATE INDEX idx_movimiento_ciclo ON movimiento(ciclo_nomina_id);

ALTER TABLE movimiento ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimiento FORCE ROW LEVEL SECURITY;
CREATE POLICY movimiento_por_empresa ON movimiento
  USING (empresa_id = NULLIF(current_setting('app.empresa_id', true), '')::bigint);

-- Inmutable de verdad, no solo "el código de la app nunca hace UPDATE/DELETE":
-- ALTER DEFAULT PRIVILEGES (migrations/0003) le da a almuerzo_app
-- SELECT/INSERT/UPDATE/DELETE en toda tabla nueva por defecto. Se retira
-- explícitamente UPDATE/DELETE aquí — la única vía para "corregir" un monto
-- es una fila nueva que lo compense (NOTA_CREDITO), igual que un libro
-- contable real.
REVOKE UPDATE, DELETE ON movimiento FROM almuerzo_app;

-- Plantilla configurable del archivo de descuento: una activa por empresa.
-- "campos" es un array JSONB de objetos { campo, etiqueta? }, sobre un
-- catálogo fijo que valida el código de la aplicación (nada de expresiones
-- ni SQL libre desde el cliente).
CREATE TABLE plantilla_reporte_descuento (
  empresa_id     BIGINT PRIMARY KEY REFERENCES empresa(id),
  campos         JSONB NOT NULL DEFAULT '[{"campo":"codigo_nomina"},{"campo":"nombre_completo"},{"campo":"monto_total"}]',
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE plantilla_reporte_descuento ENABLE ROW LEVEL SECURITY;
ALTER TABLE plantilla_reporte_descuento FORCE ROW LEVEL SECURITY;
CREATE POLICY plantilla_reporte_descuento_por_empresa ON plantilla_reporte_descuento
  USING (empresa_id = NULLIF(current_setting('app.empresa_id', true), '')::bigint);
