-- Sprint 8 (alcance recortado a backend — ver plan-sprints.md): API de
-- contenido de ayuda. Sin RLS por empresa/suplidor a propósito — es
-- contenido de plataforma, igual para cualquiera que comparta rol, no un
-- dato propio de un tenant.

CREATE TABLE ayuda_contenido (
  id            BIGSERIAL PRIMARY KEY,
  titulo        VARCHAR(200) NOT NULL,
  cuerpo        TEXT NOT NULL,
  rol_objetivo  VARCHAR(30) NOT NULL CHECK (rol_objetivo IN (
                  'TODOS','SUPERADMIN','SOPORTE',
                  'ADMIN_EMPRESA','RRHH','COLABORADOR',
                  'SUPLIDOR_ADMIN','DESPACHO'
                )),
  pantalla_id   VARCHAR(100) NOT NULL,
  orden         INTEGER NOT NULL DEFAULT 0,
  version       INTEGER NOT NULL DEFAULT 1,
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ayuda_contenido_rol ON ayuda_contenido(rol_objetivo);
CREATE INDEX idx_ayuda_contenido_pantalla ON ayuda_contenido(pantalla_id);
