-- Sprint 2: contratos empresa-suplidor, y el rol de plataforma.
--
-- El back office (alta de empresas, gestión de contratos) es intrínsecamente
-- cruza-empresas: quien lo usa necesita ver TODAS las empresas, no una sola.
-- Eso es exactamente lo contrario de lo que colaborador/RRHH necesitan, así
-- que no puede usar el mismo rol almuerzo_app sin desactivar RLS para todos.
--
-- La solución es un segundo rol, con el mismo principio de mínimo privilegio:
-- almuerzo_platform SÍ tiene BYPASSRLS, pero NO tiene CREATEROLE, CREATEDB,
-- ni SUPERUSER. Su uso queda restringido en la aplicación a requests cuyo
-- JWT ya pasó por RolesGuard con rol SUPERADMIN o SOPORTE en ámbito PLATAFORMA
-- (ver src/common/tenant-context.interceptor.ts). Si ese guard tuviera un bug,
-- el daño se limita a lectura/escritura de datos — nunca a crear roles nuevos
-- ni tocar el propio esquema.

CREATE TABLE contrato_suplidor (
  id          BIGSERIAL PRIMARY KEY,
  empresa_id  BIGINT NOT NULL REFERENCES empresa(id),
  suplidor_id BIGINT NOT NULL REFERENCES suplidor(id),
  ajuste_pct  NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (ajuste_pct BETWEEN -25 AND 25),
  estado      VARCHAR(20) NOT NULL DEFAULT 'ACTIVA' CHECK (estado IN ('ACTIVA','INACTIVA')),
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, suplidor_id)
);

CREATE INDEX idx_contrato_suplidor_empresa ON contrato_suplidor(empresa_id);

ALTER TABLE contrato_suplidor ENABLE ROW LEVEL SECURITY;
ALTER TABLE contrato_suplidor FORCE ROW LEVEL SECURITY;

CREATE POLICY contrato_suplidor_por_empresa ON contrato_suplidor
  USING (empresa_id = NULLIF(current_setting('app.empresa_id', true), '')::bigint);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'almuerzo_platform') THEN
    CREATE ROLE almuerzo_platform LOGIN PASSWORD 'almuerzo_platform_dev' BYPASSRLS;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO almuerzo_platform;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO almuerzo_platform;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO almuerzo_platform;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO almuerzo_platform;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO almuerzo_platform;

-- Bug real encontrado al escribir el seed de este sprint: la UNIQUE de
-- membresia (usuario_id, ambito_tipo, ambito_id, rol) no evita duplicados
-- para ambito_tipo = 'PLATAFORMA', porque ahí ambito_id es NULL, y Postgres
-- trata cada NULL como distinto de cualquier otro en un índice único —
-- ON CONFLICT nunca dispara, así que cada re-siembra crearía una membresía
-- de plataforma repetida para el mismo usuario y rol.
CREATE UNIQUE INDEX uq_membresia_plataforma ON membresia (usuario_id, rol)
  WHERE ambito_tipo = 'PLATAFORMA';
