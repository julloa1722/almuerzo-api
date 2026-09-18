-- Sprint 5: entrega, disputas y política de silencio.
-- Ver plan-sprints.md, Sprint 5, para el diseño completo y las notas de
-- implementación resueltas antes de escribir este archivo.

-- La política de silencio es una regla del programa de beneficio, no una
-- tabla nueva: AUTO_CONFIRMA (silencio = recibido) o AUTO_DISPUTA (silencio
-- = disputa abierta), con la ventana en horas simples desde entregado_en
-- (no días hábiles — a diferencia del cutoff de pedidos).
ALTER TABLE programa_beneficio
  ADD COLUMN politica_silencio VARCHAR(20) NOT NULL DEFAULT 'AUTO_CONFIRMA'
    CHECK (politica_silencio IN ('AUTO_CONFIRMA','AUTO_DISPUTA')),
  ADD COLUMN horas_ventana_confirmacion SMALLINT NOT NULL DEFAULT 24
    CHECK (horas_ventana_confirmacion > 0);

-- pedido.programa_id: no existía. Sin él no hay forma de saber, ya con el
-- pedido entregado, qué política de silencio le corresponde (la
-- asignacion_programa del colaborador puede haber cambiado desde que se
-- creó el pedido). Se fija en POST /pedidos y queda congelado, igual que
-- subsidio_empresa/monto_colaborador — ver nota de implementación en
-- plan-sprints.md.
ALTER TABLE pedido
  ADD COLUMN programa_id       BIGINT REFERENCES programa_beneficio(id),
  ADD COLUMN entregado_en      TIMESTAMPTZ,
  ADD COLUMN confirmado_en     TIMESTAMPTZ,
  ADD COLUMN confirmado_por    VARCHAR(20) CHECK (confirmado_por IN ('COLABORADOR','SILENCIO','RRHH')),
  ADD COLUMN disputado_en      TIMESTAMPTZ,
  ADD COLUMN disputado_por     VARCHAR(20) CHECK (disputado_por IN ('COLABORADOR','SILENCIO')),
  ADD COLUMN motivo_disputa    VARCHAR(20) CHECK (motivo_disputa IN ('NO_LLEGO','INCOMPLETO','EQUIVOCADO','CALIDAD','OTRO')),
  ADD COLUMN nota_disputa      TEXT,
  ADD COLUMN resolucion_disputa VARCHAR(20) CHECK (resolucion_disputa IN ('A_FAVOR_COLABORADOR','A_FAVOR_SUPLIDOR')),
  ADD COLUMN resuelto_en       TIMESTAMPTZ,
  ADD COLUMN resuelto_por      BIGINT REFERENCES usuario(id),
  ADD COLUMN nota_resolucion   TEXT;

-- Backfill best-effort para pedidos creados antes de esta migración (Sprint 4):
-- misma búsqueda que hace POST /pedidos, por colaborador_id + fecha_servicio.
-- Si no encuentra nada (asignación borrada desde entonces), programa_id
-- queda NULL — la resolución por silencio simplemente no toca esas filas,
-- caso límite aceptable para datos de desarrollo.
UPDATE pedido p
SET programa_id = (
  SELECT ap.programa_id
  FROM asignacion_programa ap
  WHERE ap.colaborador_id = p.colaborador_id
    AND ap.vigente_desde <= p.fecha_servicio
    AND (ap.vigente_hasta IS NULL OR ap.vigente_hasta >= p.fecha_servicio)
  LIMIT 1
)
WHERE p.programa_id IS NULL;

-- Índice para la lista de preparación del suplidor (agrupa por fecha de servicio).
CREATE INDEX idx_pedido_suplidor_fecha ON pedido(suplidor_id, fecha_servicio);

-- RLS: hasta ahora pedido/pedido_linea solo tenían política por empresa_id
-- (Sprint 4) — ningún suplidor podía ver ni tocar sus propios pedidos, aunque
-- pedido.suplidor_id existe desde ese mismo sprint. Mismo mecanismo de
-- políticas permisivas adicionales que migrations/0007, pero en la dirección
-- contraria (el suplidor escribe sobre una tabla aislada por empresa_id).
--
-- El predicado exige DOS cosas, no solo suplidor_id = GUC: que además exista
-- un contrato_suplidor ACTIVO entre ese suplidor y la empresa dueña de la
-- fila. Sin el segundo chequeo, un contrato desactivado después de creado el
-- pedido no bloquearía que el suplidor lo siga tocando.
CREATE POLICY pedido_suplidor_con_contrato ON pedido
  FOR SELECT
  USING (
    suplidor_id = NULLIF(current_setting('app.suplidor_id', true), '')::bigint
    AND EXISTS (
      SELECT 1 FROM contrato_suplidor cs
      WHERE cs.suplidor_id = pedido.suplidor_id
        AND cs.empresa_id = pedido.empresa_id
        AND cs.estado = 'ACTIVA'
    )
  );

CREATE POLICY pedido_suplidor_actualiza_con_contrato ON pedido
  FOR UPDATE
  USING (
    suplidor_id = NULLIF(current_setting('app.suplidor_id', true), '')::bigint
    AND EXISTS (
      SELECT 1 FROM contrato_suplidor cs
      WHERE cs.suplidor_id = pedido.suplidor_id
        AND cs.empresa_id = pedido.empresa_id
        AND cs.estado = 'ACTIVA'
    )
  )
  WITH CHECK (
    suplidor_id = NULLIF(current_setting('app.suplidor_id', true), '')::bigint
    AND EXISTS (
      SELECT 1 FROM contrato_suplidor cs
      WHERE cs.suplidor_id = pedido.suplidor_id
        AND cs.empresa_id = pedido.empresa_id
        AND cs.estado = 'ACTIVA'
    )
  );

-- pedido_linea no tiene suplidor_id propio (solo empresa_id, denormalizado
-- del Sprint 4) — se resuelve por EXISTS contra pedido, que ya sabe
-- responder esta pregunta con la política de arriba.
CREATE POLICY pedido_linea_suplidor_con_contrato ON pedido_linea
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pedido p
      JOIN contrato_suplidor cs ON cs.suplidor_id = p.suplidor_id AND cs.empresa_id = p.empresa_id AND cs.estado = 'ACTIVA'
      WHERE p.id = pedido_linea.pedido_id
        AND p.suplidor_id = NULLIF(current_setting('app.suplidor_id', true), '')::bigint
    )
  );
