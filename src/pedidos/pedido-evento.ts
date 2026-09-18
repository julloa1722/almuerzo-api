import { PoolClient } from 'pg';

export type ActorEvento = 'COLABORADOR' | 'SUPLIDOR' | 'RRHH' | 'SILENCIO';

/**
 * Sprint 14, subsprint 14.2: log paralelo de ESTADO, no de dinero — no
 * reemplaza `movimiento` (Sprint 6). Se llama justo después de cada
 * `UPDATE`/`INSERT` que cambia `pedido.estado`, dentro de la misma
 * transacción.
 */
export async function registrarEventoPedido(
  db: PoolClient,
  params: {
    pedidoId: number;
    empresaId: number;
    estadoAnterior: string | null;
    estadoNuevo: string;
    actor: ActorEvento;
  },
): Promise<void> {
  await db.query(
    `INSERT INTO pedido_evento (pedido_id, empresa_id, estado_anterior, estado_nuevo, actor)
     VALUES ($1, $2, $3, $4, $5)`,
    [params.pedidoId, params.empresaId, params.estadoAnterior, params.estadoNuevo, params.actor],
  );
}
