-- Sprint 5, bug real encontrado al correr test/entrega-disputas.test.js:
--
-- Las políticas nuevas de 0008 (pedido_suplidor_con_contrato y afines) usan
-- un EXISTS contra contrato_suplidor para confirmar que el suplidor tiene
-- contrato activo con la empresa dueña del pedido. Pero contrato_suplidor
-- tiene su propia RLS (contrato_suplidor_por_empresa, Sprint 2), que solo
-- permite verlo en ámbito EMPRESA — bajo ámbito SUPLIDOR, app.empresa_id
-- nunca está fijado, así que esa política deniega TODA fila, incluso dentro
-- de la subconsulta EXISTS de otra tabla. El resultado observado: un
-- suplidor con contrato activo real no veía sus propios pedidos, porque el
-- EXISTS siempre evaluaba a false para él, no porque el contrato no existiera.
--
-- migrations/0007 no tenía este problema porque sus EXISTS corren desde
-- ámbito EMPRESA — exactamente el ámbito que contrato_suplidor ya sabía
-- permitir. 0008 es el primer caso donde el ámbito SUPLIDOR necesita leer
-- contrato_suplidor indirectamente, y le faltaba su propia política.
--
-- Corrección: una política permisiva adicional — el suplidor puede ver sus
-- propios contratos (con cualquier empresa), igual que la empresa ya puede
-- ver los suyos (con cualquier suplidor). Mismo patrón de "múltiples
-- políticas permisivas combinadas con OR" documentado en CLAUDE.md.
CREATE POLICY contrato_suplidor_por_suplidor ON contrato_suplidor
  FOR SELECT
  USING (suplidor_id = NULLIF(current_setting('app.suplidor_id', true), '')::bigint);
