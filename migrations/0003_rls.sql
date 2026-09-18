-- Aislamiento por empresa a nivel de motor, no de aplicación.
-- La app fija current_setting('app.empresa_id') al inicio de cada transacción
-- (ver src/common/tenant-context.interceptor.ts). Sin ese valor fijado, estas
-- tablas no devuelven ninguna fila — falla cerrado, no abierto.

ALTER TABLE colaborador ENABLE ROW LEVEL SECURITY;
ALTER TABLE colaborador FORCE ROW LEVEL SECURITY;

CREATE POLICY colaborador_por_empresa ON colaborador
  USING (empresa_id = NULLIF(current_setting('app.empresa_id', true), '')::bigint);

ALTER TABLE punto_entrega ENABLE ROW LEVEL SECURITY;
ALTER TABLE punto_entrega FORCE ROW LEVEL SECURITY;

CREATE POLICY punto_entrega_por_empresa ON punto_entrega
  USING (empresa_id = NULLIF(current_setting('app.empresa_id', true), '')::bigint);

-- El rol de aplicación no debe poder desactivar RLS ni saltárselo como propietario.
-- En producción, la app se conecta con un rol distinto al dueño de las tablas (almuerzo_app),
-- que no tiene privilegio BYPASSRLS. Este bloque deja el rol listo si no existe todavía.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'almuerzo_app') THEN
    CREATE ROLE almuerzo_app LOGIN PASSWORD 'almuerzo_app_dev';
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO almuerzo_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO almuerzo_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO almuerzo_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO almuerzo_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO almuerzo_app;
