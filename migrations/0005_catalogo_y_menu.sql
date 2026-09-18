-- Sprint 3: catálogo del suplidor, plantilla semanal, y publicación de menu_dia.
--
-- Estas tablas se aíslan por suplidor_id, reutilizando el mismo rol almuerzo_app
-- y el mismo interceptor del Sprint 1 — ya sabía fijar app.suplidor_id desde
-- que se escribió (ámbito SUPLIDOR), solo que hasta ahora ninguna tabla lo usaba.
-- Este es el pendiente de "RLS por suplidor_id" que quedó marcado desde la
-- conversación de diseño original.

CREATE TABLE producto (
  id          BIGSERIAL PRIMARY KEY,
  suplidor_id BIGINT NOT NULL REFERENCES suplidor(id),
  sku         VARCHAR(50) NOT NULL,
  nombre      VARCHAR(200) NOT NULL,
  descripcion TEXT,
  categoria   VARCHAR(50),
  etiquetas   JSONB NOT NULL DEFAULT '[]',
  imagen_url  TEXT, -- Sprint 3 no sube archivos; ver README, "fuera de alcance"
  estado      VARCHAR(20) NOT NULL DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO','INACTIVO')),
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (suplidor_id, sku)
);

ALTER TABLE producto ENABLE ROW LEVEL SECURITY;
ALTER TABLE producto FORCE ROW LEVEL SECURITY;
CREATE POLICY producto_por_suplidor ON producto
  USING (suplidor_id = NULLIF(current_setting('app.suplidor_id', true), '')::bigint);

CREATE TABLE ruta_servicio (
  id                BIGSERIAL PRIMARY KEY,
  suplidor_id       BIGINT NOT NULL REFERENCES suplidor(id),
  punto_entrega_id  BIGINT NOT NULL REFERENCES punto_entrega(id),
  hora_cutoff       TIME NOT NULL,
  dias_anticipacion SMALLINT NOT NULL DEFAULT 0,
  hora_entrega_est  TIME NOT NULL,
  cupo_max_dia      INTEGER,
  estado            VARCHAR(20) NOT NULL DEFAULT 'ACTIVA' CHECK (estado IN ('ACTIVA','INACTIVA')),
  UNIQUE (suplidor_id, punto_entrega_id)
);

ALTER TABLE ruta_servicio ENABLE ROW LEVEL SECURITY;
ALTER TABLE ruta_servicio FORCE ROW LEVEL SECURITY;
CREATE POLICY ruta_servicio_por_suplidor ON ruta_servicio
  USING (suplidor_id = NULLIF(current_setting('app.suplidor_id', true), '')::bigint);

-- Feriados, para el cálculo de días hábiles del cutoff. Ligado a la empresa
-- porque es el calendario de esa empresa el que importa (vía punto_entrega).
CREATE TABLE dia_no_habil (
  empresa_id BIGINT NOT NULL REFERENCES empresa(id),
  fecha      DATE NOT NULL,
  motivo     VARCHAR(120),
  PRIMARY KEY (empresa_id, fecha)
);

CREATE TABLE plantilla_menu (
  id          BIGSERIAL PRIMARY KEY,
  suplidor_id BIGINT NOT NULL REFERENCES suplidor(id),
  nombre      VARCHAR(120) NOT NULL,
  semana_tipo SMALLINT NOT NULL DEFAULT 1 CHECK (semana_tipo IN (1,2)),
  estado      VARCHAR(20) NOT NULL DEFAULT 'ACTIVA' CHECK (estado IN ('ACTIVA','INACTIVA'))
);

ALTER TABLE plantilla_menu ENABLE ROW LEVEL SECURITY;
ALTER TABLE plantilla_menu FORCE ROW LEVEL SECURITY;
CREATE POLICY plantilla_menu_por_suplidor ON plantilla_menu
  USING (suplidor_id = NULLIF(current_setting('app.suplidor_id', true), '')::bigint);

-- suplidor_id se denormaliza aquí también: es redundante con el de
-- plantilla_menu, pero evita que la política de RLS dependa de un EXISTS
-- con subconsulta contra otra tabla. La app debe mantenerlo sincronizado al
-- insertar (ver src/catalogo/plantilla.service.ts). Decisión documentada,
-- no un descuido de normalización.
CREATE TABLE plantilla_item (
  id           BIGSERIAL PRIMARY KEY,
  plantilla_id BIGINT NOT NULL REFERENCES plantilla_menu(id) ON DELETE CASCADE,
  suplidor_id  BIGINT NOT NULL REFERENCES suplidor(id),
  dia_semana   SMALLINT NOT NULL CHECK (dia_semana BETWEEN 1 AND 5),
  producto_id  BIGINT NOT NULL REFERENCES producto(id),
  precio       NUMERIC(12,2) NOT NULL CHECK (precio > 0),
  cupo         INTEGER CHECK (cupo IS NULL OR cupo > 0),
  UNIQUE (plantilla_id, dia_semana, producto_id)
);

ALTER TABLE plantilla_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE plantilla_item FORCE ROW LEVEL SECURITY;
CREATE POLICY plantilla_item_por_suplidor ON plantilla_item
  USING (suplidor_id = NULLIF(current_setting('app.suplidor_id', true), '')::bigint);

CREATE TABLE menu_dia (
  id           BIGSERIAL PRIMARY KEY,
  suplidor_id  BIGINT NOT NULL REFERENCES suplidor(id),
  producto_id  BIGINT NOT NULL REFERENCES producto(id),
  fecha        DATE NOT NULL,
  precio       NUMERIC(12,2) NOT NULL CHECK (precio > 0),
  cupo_max     INTEGER,
  cupo_usado   INTEGER NOT NULL DEFAULT 0,
  -- Sin columna "estado": si PUBLICADO/CONGELADO se guardara aquí, necesitaría
  -- un job que la actualice al vencer cada cutoff, con riesgo de desincronía.
  -- Se calcula al vuelo comparando la fecha contra el cutoff (igual que en
  -- el mockup) — ver src/catalogo/calendario.util.ts.
  activo       BOOLEAN NOT NULL DEFAULT true, -- excepción puntual: retirar un plato sin tocar la plantilla
  UNIQUE (suplidor_id, producto_id, fecha),
  CHECK (cupo_max IS NULL OR cupo_usado <= cupo_max)
);

CREATE INDEX idx_menu_dia_suplidor_fecha ON menu_dia(suplidor_id, fecha);

ALTER TABLE menu_dia ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_dia FORCE ROW LEVEL SECURITY;
CREATE POLICY menu_dia_por_suplidor ON menu_dia
  USING (suplidor_id = NULLIF(current_setting('app.suplidor_id', true), '')::bigint);
