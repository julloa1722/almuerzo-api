-- Sprint 4, corrección de diseño encontrada al probar el flujo real:
--
-- producto, ruta_servicio y menu_dia están aislados por suplidor_id (Sprint 3).
-- Un colaborador pide bajo ámbito EMPRESA, así que su transacción nunca fija
-- app.suplidor_id — la política existente (FOR ALL) lo bloquea por completo,
-- incluso para SELECT. Sin esto, ningún colaborador podría ver el menú de
-- NINGÚN suplidor, por contratado que esté.
--
-- La corrección: agregar una SEGUNDA política permisiva (Postgres las combina
-- con OR cuando son del mismo tipo "permissive", que es el default) que
-- habilita lectura — y, en menu_dia, también el descuento de cupo — para
-- cualquier empresa con un contrato_suplidor ACTIVA con ese suplidor.
--
-- Nota de alcance honesta: la política de UPDATE en menu_dia no restringe a
-- nivel de base de datos QUÉ columna se cambia (podría, en teoría, tocar
-- precio o cupo_max, no solo cupo_usado) — eso lo garantiza el código de la
-- aplicación (un solo UPDATE fijo que solo toca cupo_usado), igual que ya
-- confiamos en que el código de la app arma el SQL correcto en el resto del
-- sistema. Si esto preocupa más adelante, la alternativa es una función
-- SECURITY DEFINER dedicada solo a incrementar/decrementar cupo.

CREATE POLICY producto_lectura_empresas_contratadas ON producto
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM contrato_suplidor cs
    WHERE cs.suplidor_id = producto.suplidor_id
      AND cs.empresa_id = NULLIF(current_setting('app.empresa_id', true), '')::bigint
      AND cs.estado = 'ACTIVA'
  ));

CREATE POLICY ruta_servicio_lectura_empresas_contratadas ON ruta_servicio
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM contrato_suplidor cs
    WHERE cs.suplidor_id = ruta_servicio.suplidor_id
      AND cs.empresa_id = NULLIF(current_setting('app.empresa_id', true), '')::bigint
      AND cs.estado = 'ACTIVA'
  ));

CREATE POLICY menu_dia_lectura_empresas_contratadas ON menu_dia
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM contrato_suplidor cs
    WHERE cs.suplidor_id = menu_dia.suplidor_id
      AND cs.empresa_id = NULLIF(current_setting('app.empresa_id', true), '')::bigint
      AND cs.estado = 'ACTIVA'
  ));

CREATE POLICY menu_dia_descuento_cupo_empresas_contratadas ON menu_dia
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM contrato_suplidor cs
    WHERE cs.suplidor_id = menu_dia.suplidor_id
      AND cs.empresa_id = NULLIF(current_setting('app.empresa_id', true), '')::bigint
      AND cs.estado = 'ACTIVA'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM contrato_suplidor cs
    WHERE cs.suplidor_id = menu_dia.suplidor_id
      AND cs.empresa_id = NULLIF(current_setting('app.empresa_id', true), '')::bigint
      AND cs.estado = 'ACTIVA'
  ));
