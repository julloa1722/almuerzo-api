-- Sprint 19, subsprint 19.1: recuperación de contraseña — la otra mitad
-- del gap que el Sprint 18 dejó fuera a propósito (invitación resuelve
-- "nunca tuve cuenta"; esto resuelve "la perdí"). Mismo patrón que
-- `invitacion`: sin RLS, tabla de identidad transversal, no de tenant.
CREATE TABLE recuperacion_password (
  id          BIGSERIAL PRIMARY KEY,
  usuario_id  BIGINT NOT NULL REFERENCES usuario(id),
  token       VARCHAR(64) NOT NULL UNIQUE,
  estado      VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'USADA')),
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT now(),
  expira_en   TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_recuperacion_password_usuario ON recuperacion_password(usuario_id);
