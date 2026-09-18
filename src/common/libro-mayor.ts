import type { PoolClient } from 'pg';
import { periodoDe } from './calendario.util';

interface CicloRow {
  id: number;
  estado: 'ABIERTO' | 'CERRADO';
}

async function buscarCiclo(
  db: PoolClient,
  empresaId: number,
  periodo: { inicio: string; fin: string },
): Promise<CicloRow | null> {
  const { rows } = await db.query(
    `SELECT id, estado FROM ciclo_nomina WHERE empresa_id = $1 AND periodo_inicio = $2 AND periodo_fin = $3`,
    [empresaId, periodo.inicio, periodo.fin],
  );
  return rows[0] ?? null;
}

/** Busca el ciclo ABIERTO de ese período, o lo crea. Nunca reabre uno CERRADO. */
export async function cicloAbiertoOCrear(
  db: PoolClient,
  empresaId: number,
  periodo: { inicio: string; fin: string },
): Promise<number> {
  const existente = await buscarCiclo(db, empresaId, periodo);
  if (existente) return existente.id;
  const { rows } = await db.query(
    `INSERT INTO ciclo_nomina (empresa_id, periodo_inicio, periodo_fin)
     VALUES ($1, $2, $3)
     ON CONFLICT (empresa_id, periodo_inicio, periodo_fin) DO UPDATE SET empresa_id = EXCLUDED.empresa_id
     RETURNING id`,
    [empresaId, periodo.inicio, periodo.fin],
  );
  return rows[0].id;
}

/**
 * Postea un CARGO al libro mayor cuando un pedido llega a RECIBIDO (Sprint 6).
 * Si el ciclo del período original ya cerró (solo posible si la empresa
 * activó permite_cierre_con_pendientes), el cargo va al ciclo abierto
 * VIGENTE HOY, nunca reabre el que ya cerró — ver plan-sprints.md, Sprint 6.
 */
export async function postearCargo(
  db: PoolClient,
  params: {
    empresaId: number;
    colaboradorId: number;
    fechaServicio: Date;
    frecuenciaNomina: 'QUINCENAL' | 'MENSUAL';
    pedidoId: number;
    monto: number;
  },
): Promise<void> {
  if (params.monto <= 0) return; // cobertura total: nada que cargar al colaborador

  const periodoOriginal = periodoDe(params.fechaServicio, params.frecuenciaNomina);
  const cicloOriginal = await buscarCiclo(db, params.empresaId, periodoOriginal);

  const cicloId =
    cicloOriginal && cicloOriginal.estado === 'ABIERTO'
      ? cicloOriginal.id
      : await cicloAbiertoOCrear(
          db,
          params.empresaId,
          cicloOriginal?.estado === 'CERRADO' ? periodoDe(new Date(), params.frecuenciaNomina) : periodoOriginal,
        );

  await db.query(
    `INSERT INTO movimiento (empresa_id, colaborador_id, ciclo_nomina_id, pedido_id, tipo, monto)
     VALUES ($1, $2, $3, $4, 'CARGO', $5)`,
    [params.empresaId, params.colaboradorId, cicloId, params.pedidoId, params.monto],
  );
}

export async function frecuenciaNominaDe(db: PoolClient, empresaId: number): Promise<'QUINCENAL' | 'MENSUAL'> {
  const { rows } = await db.query('SELECT frecuencia_nomina FROM empresa WHERE id = $1', [empresaId]);
  return rows[0].frecuencia_nomina;
}
