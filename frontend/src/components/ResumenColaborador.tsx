import { useQuery } from '@tanstack/react-query';
import { useApi } from '../lib/useApi';
import { fmtFecha } from '../lib/fechas';
import { EstadoBadge } from './EstadoBadge';
import type { ConsumoCiclo, PedidoMio } from '../types';

/**
 * Sprint 19, subsprint 19.6: sin backend nuevo — reusa exactamente los
 * mismos `queryKey` que `MisPedidosCard` y `ConsumoCicloMedidor`, así que
 * React Query comparte la caché en vez de duplicar la llamada a la API.
 */
export function ResumenColaborador() {
  const api = useApi();
  const { data: dataMios } = useQuery({
    queryKey: ['pedidos-mios'],
    queryFn: () => api<{ pedidos: PedidoMio[] }>('/pedidos/mios'),
  });
  const { data: dataConsumo } = useQuery({
    queryKey: ['consumo-ciclo'],
    queryFn: () => api<ConsumoCiclo>('/pedidos/consumo-ciclo'),
  });

  const pedidos = dataMios?.pedidos ?? [];
  const pendientes = pedidos
    .filter((p) => p.estado === 'CONFIRMADO' || (p.estado === 'ENTREGADO' && p.puedeConfirmar))
    .sort((a, b) => a.fecha_servicio.localeCompare(b.fecha_servicio));
  const proximo = pendientes[0] ?? null;

  const enPeriodo = dataConsumo
    ? pedidos.filter(
        (p) =>
          p.fecha_servicio.slice(0, 10) >= dataConsumo.periodoInicio &&
          p.fecha_servicio.slice(0, 10) <= dataConsumo.periodoFin &&
          p.estado !== 'CANCELADO' &&
          p.estado !== 'NO_ENTREGADO',
      ).length
    : 0;

  if (!dataMios) return null;

  return (
    <div className="grid g2 mb-4">
      <div className="card">
        <div className="eyebrow">Próxima acción</div>
        {proximo ? (
          <>
            <div className="text-[14px] font-medium mt-1.5">{fmtFecha(proximo.fecha_servicio.slice(0, 10))}</div>
            <div className="text-[12.5px] text-muted mt-0.5">
              {proximo.suplidor_nombre} · <EstadoBadge estado={proximo.estado} />
            </div>
          </>
        ) : (
          <div className="text-[13px] text-muted mt-2">Sin pedidos pendientes.</div>
        )}
      </div>
      <div className="card">
        <div className="eyebrow">Este período</div>
        <div className="mono text-[26px] font-medium tracking-tight mt-1.5">{enPeriodo}</div>
        <div className="text-[12.5px] text-muted">pedido(s), sin contar cancelados</div>
      </div>
    </div>
  );
}
