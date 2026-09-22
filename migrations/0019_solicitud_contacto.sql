-- Sprint 22 — Solicitudes de contacto desde la página pública.
--
-- Quien llega a la plataforma sin cuenta (el suplidor o la empresa que
-- podríamos firmar) no tenía forma de escribirnos: el único destino público
-- era el login. Esta tabla guarda lo que mandan por el formulario de
-- /contacto.
--
-- No se reusa `lead_comercial` (migración 0015) aunque se parezca. Esa tabla
-- exige `suplidor_id NOT NULL` porque modela algo distinto: un suplidor YA
-- REGISTRADO que propone una empresa que todavía no está en la plataforma.
-- Aquí el remitente es anónimo y puede venir de cualquiera de los dos lados.
-- Meterlo ahí obligaría a hacer nullable la llave que sostiene su política de
-- RLS, y a mezclar dos ciclos de vida: un lead se CONVIERTE en empresa; una
-- solicitud se RESPONDE y se cierra.

CREATE TABLE solicitud_contacto (
  id             BIGSERIAL PRIMARY KEY,
  nombre         VARCHAR(160) NOT NULL,
  email          VARCHAR(200) NOT NULL,
  telefono       VARCHAR(40),
  -- De qué lado del negocio escribe. Determina qué le vamos a ofrecer.
  tipo           VARCHAR(20)  NOT NULL CHECK (tipo IN ('SUPLIDOR', 'EMPRESA')),
  negocio        VARCHAR(160),
  mensaje        TEXT,
  estado         VARCHAR(20)  NOT NULL DEFAULT 'NUEVA'
                   CHECK (estado IN ('NUEVA', 'ATENDIDA', 'DESCARTADA')),
  creado_en      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  atendido_en    TIMESTAMPTZ
);

CREATE INDEX idx_solicitud_contacto_estado ON solicitud_contacto(estado, creado_en DESC);

-- Esto es información de plataforma, no de ningún tenant: no hay empresa ni
-- suplidor a quien aislar, y nadie con ámbito EMPRESA o SUPLIDOR tiene por qué
-- ver quién más está tocando la puerta.
--
-- Con RLS activado y SIN ninguna política permisiva, `almuerzo_app` no ve ni
-- escribe nada — falla cerrado, que es el criterio de todo el proyecto.
-- `almuerzo_platform` tiene BYPASSRLS, así que back office sí lee y actualiza.
-- La inserción pública (sin sesión) también va por ese rol, mismo patrón que
-- ya usa `InvitacionesService.aceptar` para escribir sin ámbito fijado.
ALTER TABLE solicitud_contacto ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitud_contacto FORCE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON solicitud_contacto TO almuerzo_platform;
GRANT USAGE, SELECT ON SEQUENCE solicitud_contacto_id_seq TO almuerzo_platform;
