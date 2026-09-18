import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../../lib/useApi';
import { ApiError } from '../../lib/api';
import { fmtFecha } from '../../lib/fechas';
import { Aviso } from '../Aviso';
import { EstadoBadge } from '../EstadoBadge';
import type { PreparacionResponse } from '../../types';

/**
 * Sprint 11, discrepancia 4: no está en el mockup de catálogo — es la
 * pieza real que faltaba para que "colaborador pide → suplidor entrega"
 * no dependa de curl (ver PLAN-PRUEBAS.md, Sección 5). El código de
 * retiro nunca llega precargado — el suplidor lo escribe a mano, tal como
 * se lo dice el colaborador en persona (ver Sprint 5).
 */
export function PreparacionSeccion({ fecha }: { fecha: string | null }) {
  const api = useApi();
  const queryClient = useQueryClient();
  const [codigos, setCodigos] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['preparacion', fecha],
    queryFn: () => api<PreparacionResponse>(`/pedidos/preparacion?fecha=${fecha}`),
    enabled: !!fecha,
  });

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ['preparacion', fecha] });

  const preparar = useMutation({
    mutationFn: (id: number) => api(`/pedidos/${id}/preparar`, { method: 'PATCH' }),
    onSuccess: invalidar,
    onError: (err) => setError(err instanceof ApiError ? err.message : 'No se pudo pasar a preparación.'),
  });
  const entregar = useMutation({
    mutationFn: ({ id, codigoRetiro }: { id: number; codigoRetiro: string }) =>
      api(`/pedidos/${id}/entregar`, { method: 'PATCH', body: { codigoRetiro } }),
    onSuccess: (_data, vars) => {
      setError(null);
      invalidar();
      setCodigos((c) => ({ ...c, [vars.id]: '' }));
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'No se pudo marcar como entregado.'),
  });
  const noEntregado = useMutation({
    mutationFn: (id: number) => api(`/pedidos/${id}/no-entregado`, { method: 'PATCH', body: {} }),
    onSuccess: invalidar,
    onError: (err) => setError(err instanceof ApiError ? err.message : 'No se pudo actualizar.'),
  });

  if (!fecha) return null;

  const grupos = Object.entries(data?.porPuntoEntrega ?? {});

  return (
    <div className="mt-6">
      <h3 className="mb-3">Preparación y entrega · {fmtFecha(fecha)}</h3>
      {error && <Aviso tipo="no">{error}</Aviso>}
      {isLoading && <div className="text-sm text-muted">Cargando…</div>}
      {!isLoading && grupos.length === 0 && (
        <div className="text-muted text-[13px] py-4 text-center">Sin pedidos confirmados para este día.</div>
      )}

      {grupos.map(([punto, pedidos]) => (
        <div key={punto} className="card mb-3">
          <h3>{punto}</h3>
          {pedidos.map((p) => (
            <div key={p.id} className="border-b border-rule-2 py-2.5 last:border-0">
              <div className="flex justify-between items-center gap-2">
                <div className="min-w-0">
                  <div className="font-medium text-[13px]">{p.colaborador}</div>
                  <div className="text-[11.5px] text-muted">
                    {p.lineas.map((l) => `${l.cantidad}× ${l.producto_nombre}`).join(', ')}
                  </div>
                </div>
                <EstadoBadge estado={p.estado} />
              </div>

              {p.estado === 'CONFIRMADO' && (
                <button className="btn btn-sec btn-sm mt-2" disabled={preparar.isPending} onClick={() => preparar.mutate(p.id)}>
                  Pasar a preparación
                </button>
              )}

              {(p.estado === 'CONFIRMADO' || p.estado === 'EN_PREPARACION') && (
                <div className="flex gap-1.5 mt-2 items-center">
                  <input
                    placeholder="código de retiro"
                    className="border border-rule rounded px-2 py-1 text-xs mono w-32"
                    value={codigos[p.id] ?? ''}
                    onChange={(e) => setCodigos({ ...codigos, [p.id]: e.target.value })}
                  />
                  <button
                    className="btn btn-ok btn-sm"
                    disabled={!codigos[p.id] || entregar.isPending}
                    onClick={() => entregar.mutate({ id: p.id, codigoRetiro: codigos[p.id] })}
                  >
                    Entregar
                  </button>
                  <button className="btn btn-dan btn-sm" disabled={noEntregado.isPending} onClick={() => noEntregado.mutate(p.id)}>
                    No se presentó
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
