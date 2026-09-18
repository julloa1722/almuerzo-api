import { useQuery } from '@tanstack/react-query';
import { useApi } from '../../lib/useApi';
import { fmtSello } from '../../lib/fechas';
import type { EventoPedido } from '../../types';

const ACTOR_ETIQUETA: Record<string, string> = {
  COLABORADOR: 'colaborador',
  SUPLIDOR: 'suplidor',
  RRHH: 'RRHH',
  SILENCIO: 'silencio (automático)',
};

/**
 * Sprint 14: trazabilidad de pedidos. Diseño de la pestaña `vLog` en
 * `mockup-plataforma-almuerzo.html` — aquí acotada a pedidos (no a
 * contratos/leads/ciclos), que es lo que pedía el mockup original. Log
 * paralelo de ESTADO, no de dinero — `movimiento` (Sprint 6) sigue siendo
 * la fuente de verdad del dinero.
 */
export function TrazabilidadTab() {
  const api = useApi();
  const { data, isLoading } = useQuery({
    queryKey: ['bo-trazabilidad'],
    queryFn: () => api<{ eventos: EventoPedido[] }>('/reportes/trazabilidad'),
  });

  const eventos = data?.eventos ?? [];

  return (
    <div>
      <h2>Trazabilidad</h2>
      <p className="sub">
        Todo cambio de estado de un pedido queda registrado con actor y sello de tiempo. Vive en{' '}
        <code className="mono">pedido_evento</code>, append-only.
      </p>

      <div className="card">
        {isLoading && <div className="text-sm text-muted">Cargando…</div>}
        {!isLoading && eventos.length === 0 && <div className="vacio">Sin eventos.</div>}
        {eventos.map((e) => (
          <div key={e.id} className="border-b border-rule-2 py-2 last:border-0 flex items-center gap-2.5 text-[13px]">
            <span className="mono text-[11.5px] text-muted whitespace-nowrap">{fmtSello(e.creado_en)}</span>
            <span className="text-[11.5px] text-muted whitespace-nowrap">{ACTOR_ETIQUETA[e.actor] ?? e.actor}</span>
            <span className="flex-1 min-w-0">
              Pedido #{e.pedido_id} ({e.empresa_nombre}): {e.estado_anterior ?? 'creado'} → <b>{e.estado_nuevo}</b>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
