-- Sprint 9.2: notificaciones por email real (Resend) + su auditoría.
-- Ver plan-sprints.md, Sprint 9, para el diseño completo.

-- Sin columna de email todavía en suplidor — hace falta para poder
-- notificarle cuando se le marca un lote de pago como PAGADO.
ALTER TABLE suplidor ADD COLUMN email_contacto VARCHAR(200);

-- Auditoría de envíos, no cola de reintento (mismo principio de "sin jobs
-- en segundo plano" de todo el proyecto — un envío fallido queda
-- registrado para revisión manual, no se reintenta solo). Sin RLS a
-- propósito: es un log operativo interno, no dato de un tenant, y lo
-- escriben tanto almuerzo_app (ámbito EMPRESA/SUPLIDOR, ej. al entregar un
-- pedido) como almuerzo_platform (ej. al marcar un lote pagado) — una
-- política de RLS tendría que cubrir ambos casos sin aportar aislamiento
-- real, porque nada la consulta filtrado por tenant en este sprint.
CREATE TABLE notificacion_enviada (
  id              BIGSERIAL PRIMARY KEY,
  tipo            VARCHAR(50) NOT NULL,
  destinatario    VARCHAR(200) NOT NULL,
  asunto          VARCHAR(200) NOT NULL,
  estado          VARCHAR(20) NOT NULL CHECK (estado IN ('ENVIADA','ERROR','OMITIDA')),
  referencia_tipo VARCHAR(50),
  referencia_id   BIGINT,
  detalle_error   TEXT,
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notificacion_enviada_referencia ON notificacion_enviada(referencia_tipo, referencia_id);
