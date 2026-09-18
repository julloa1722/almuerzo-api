-- Sprint 18: invitación de usuarios.
--
-- Gap real confirmado al construir el Sprint 15: no existía ningún
-- endpoint que creara una `membresia` — solo `scripts/seed.js` lo hacía,
-- directo contra la base. Sin esto, una empresa nueva no tenía forma de
-- que su RRHH entrara a la aplicación, y un colaborador cargado por CSV
-- tampoco tenía forma de loguearse. Ver plan-sprints.md, Sprint 18.
--
-- Sin RLS a propósito — mismo criterio que `usuario`/`membresia`, que
-- tampoco la tienen: son tablas de identidad transversales, no datos de
-- un tenant. La autorización de quién puede invitar a quién se resuelve
-- en el código de la aplicación (InvitacionesController), no en la base.
CREATE TABLE invitacion (
  id             BIGSERIAL PRIMARY KEY,
  email          VARCHAR(200) NOT NULL,
  rol            VARCHAR(30) NOT NULL CHECK (rol IN (
                    'SUPERADMIN','SOPORTE',
                    'ADMIN_EMPRESA','RRHH','COLABORADOR',
                    'SUPLIDOR_ADMIN','DESPACHO'
                  )),
  ambito_tipo    VARCHAR(20) NOT NULL CHECK (ambito_tipo IN ('PLATAFORMA','EMPRESA','SUPLIDOR')),
  ambito_id      BIGINT,
  colaborador_id BIGINT REFERENCES colaborador(id), -- solo si rol = 'COLABORADOR'
  token          VARCHAR(64) NOT NULL UNIQUE,
  estado         VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE','ACEPTADA','REVOCADA')),
  creado_por     BIGINT REFERENCES usuario(id),
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT now(),
  expira_en      TIMESTAMPTZ NOT NULL,
  aceptado_en    TIMESTAMPTZ,
  CONSTRAINT invitacion_ambito_coherente CHECK (
    (ambito_tipo = 'PLATAFORMA' AND ambito_id IS NULL) OR
    (ambito_tipo IN ('EMPRESA','SUPLIDOR') AND ambito_id IS NOT NULL)
  )
);

CREATE INDEX idx_invitacion_email ON invitacion(email);
