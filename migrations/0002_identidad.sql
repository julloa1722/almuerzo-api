-- Núcleo de identidad: empresa, usuario, membresía, colaborador, suplidor, punto de entrega.
-- Ver plan-sprints.md, Sprint 1, subsprint 1.2.

CREATE TABLE empresa (
  id                BIGSERIAL PRIMARY KEY,
  rnc               VARCHAR(15) NOT NULL UNIQUE,
  nombre            VARCHAR(200) NOT NULL,
  timezone          VARCHAR(50) NOT NULL DEFAULT 'America/Santo_Domingo',
  frecuencia_nomina VARCHAR(20) NOT NULL DEFAULT 'QUINCENAL'
                       CHECK (frecuencia_nomina IN ('QUINCENAL','MENSUAL')),
  estado            VARCHAR(20) NOT NULL DEFAULT 'ACTIVA'
                       CHECK (estado IN ('ACTIVA','INACTIVA')),
  creado_en         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE suplidor (
  id        BIGSERIAL PRIMARY KEY,
  rnc       VARCHAR(15) NOT NULL UNIQUE,
  nombre    VARCHAR(200) NOT NULL,
  contacto  VARCHAR(200),
  estado    VARCHAR(20) NOT NULL DEFAULT 'ACTIVO'
              CHECK (estado IN ('ACTIVO','INACTIVO')),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE punto_entrega (
  id          BIGSERIAL PRIMARY KEY,
  empresa_id  BIGINT NOT NULL REFERENCES empresa(id),
  nombre      VARCHAR(120) NOT NULL,
  direccion   TEXT,
  estado      VARCHAR(20) NOT NULL DEFAULT 'ACTIVO'
                CHECK (estado IN ('ACTIVO','INACTIVO'))
);

CREATE TABLE usuario (
  id            BIGSERIAL PRIMARY KEY,
  email         VARCHAR(200) UNIQUE,
  telefono      VARCHAR(20) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  estado        VARCHAR(20) NOT NULL DEFAULT 'ACTIVO'
                  CHECK (estado IN ('ACTIVO','INACTIVO')),
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT usuario_email_o_telefono CHECK (email IS NOT NULL OR telefono IS NOT NULL)
);

-- Una persona (usuario) puede tener varios vínculos con distintos ámbitos del sistema.
-- ambito_tipo = PLATAFORMA | EMPRESA | SUPLIDOR. ambito_id es NULL para PLATAFORMA.
CREATE TABLE membresia (
  id           BIGSERIAL PRIMARY KEY,
  usuario_id   BIGINT NOT NULL REFERENCES usuario(id),
  ambito_tipo  VARCHAR(20) NOT NULL CHECK (ambito_tipo IN ('PLATAFORMA','EMPRESA','SUPLIDOR')),
  ambito_id    BIGINT,
  rol          VARCHAR(30) NOT NULL CHECK (rol IN (
                 'SUPERADMIN','SOPORTE',
                 'ADMIN_EMPRESA','RRHH','COLABORADOR',
                 'SUPLIDOR_ADMIN','DESPACHO'
               )),
  estado       VARCHAR(20) NOT NULL DEFAULT 'ACTIVA' CHECK (estado IN ('ACTIVA','INACTIVA')),
  creado_en    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT membresia_ambito_coherente CHECK (
    (ambito_tipo = 'PLATAFORMA' AND ambito_id IS NULL) OR
    (ambito_tipo IN ('EMPRESA','SUPLIDOR') AND ambito_id IS NOT NULL)
  ),
  UNIQUE (usuario_id, ambito_tipo, ambito_id, rol)
);

CREATE INDEX idx_membresia_usuario ON membresia(usuario_id);
CREATE INDEX idx_membresia_ambito ON membresia(ambito_tipo, ambito_id);

-- El colaborador es el vínculo laboral (empresa, punto de entrega, salario de referencia),
-- distinto del usuario que es la identidad de la persona. Una persona puede dejar de ser
-- colaborador de una empresa y empezar en otra sin perder su cuenta.
CREATE TABLE colaborador (
  id                BIGSERIAL PRIMARY KEY,
  empresa_id        BIGINT NOT NULL REFERENCES empresa(id),
  usuario_id        BIGINT REFERENCES usuario(id),
  cedula            VARCHAR(13) NOT NULL,
  codigo_nomina     VARCHAR(30) NOT NULL,
  nombre_completo   VARCHAR(200) NOT NULL,
  email             VARCHAR(200),
  punto_entrega_id  BIGINT REFERENCES punto_entrega(id),
  -- Dato sensible: se usa solo para el límite de endeudamiento (sprint 4).
  -- Pendiente evaluar cifrado a nivel de columna con pgcrypto antes de cargar datos reales.
  salario_neto_ref  NUMERIC(12,2),
  estado            VARCHAR(20) NOT NULL DEFAULT 'ACTIVO'
                       CHECK (estado IN ('ACTIVO','INACTIVO')),
  fecha_ingreso     DATE,
  fecha_salida      DATE,
  creado_en         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, codigo_nomina),
  UNIQUE (empresa_id, cedula)
);

CREATE INDEX idx_colaborador_empresa ON colaborador(empresa_id);
CREATE INDEX idx_colaborador_usuario ON colaborador(usuario_id);
