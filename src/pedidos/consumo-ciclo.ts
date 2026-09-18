import type { PoolClient } from 'pg';
import { periodoDe } from '../common/calendario.util';

export interface ParamsConsumoCiclo {
  colaboradorId: number;
  fecha: Date;
  frecuenciaNomina: 'QUINCENAL' | 'MENSUAL';
  topeCicloColaborador: number | null;
  pctMaxSalario: number;
  salarioNetoRef: number | null;
}

export interface ConsumoCiclo {
  periodoInicio: string;
  periodoFin: string;
  consumo: number;
  topeCicloColaborador: number | null;
  limiteSalario: number | null;
  topeEfectivo: number | null;
}

/**
 * Consumo del colaborador en el período de nómina vigente para `fecha`, y el
 * tope efectivo (mínimo entre el tope de ciclo del programa y el límite de
 * endeudamiento por salario) — misma regla que ya vive en `crearPedido`
 * (Sprint 4), factorizada aquí para que GET /pedidos/consumo-ciclo (Sprint
 * 10, subsprint 10.5) no la duplique.
 */
export async function consumoCicloDe(db: PoolClient, params: ParamsConsumoCiclo): Promise<ConsumoCiclo> {
  const periodo = periodoDe(params.fecha, params.frecuenciaNomina);
  const { rows } = await db.query(
    `SELECT COALESCE(SUM(monto_colaborador),0) AS consumo FROM pedido
     WHERE colaborador_id = $1 AND fecha_servicio BETWEEN $2 AND $3 AND estado NOT IN ('CANCELADO','NO_ENTREGADO')`,
    [params.colaboradorId, periodo.inicio, periodo.fin],
  );
  const consumo = Number(rows[0].consumo);
  const limiteSalario = params.salarioNetoRef != null ? (params.salarioNetoRef * params.pctMaxSalario) / 100 : null;
  const candidatos = [params.topeCicloColaborador, limiteSalario].filter((v): v is number => v != null);
  const topeEfectivo = candidatos.length ? Math.min(...candidatos) : null;

  return {
    periodoInicio: periodo.inicio,
    periodoFin: periodo.fin,
    consumo,
    topeCicloColaborador: params.topeCicloColaborador,
    limiteSalario,
    topeEfectivo,
  };
}
