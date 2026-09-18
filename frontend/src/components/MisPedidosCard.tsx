import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../lib/useApi';
import { ApiError } from '../lib/api';
import { fmtCorto, fmtSello, formatoRD } from '../lib/fechas';
import { EstadoBadge } from './EstadoBadge';
import { Aviso } from './Aviso';
import { DisputaModal } from './DisputaModal';
import type { MotivoDisputa, PedidoMio } from '../types';

function invalidarTodo(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['pedidos-mios'] });
  queryClient.invalidateQueries({ queryKey: ['menu-disponible'] });
  queryClient.invalidateQueries({ queryKey: ['consumo-ciclo'] });
}

export function MisPedidosCard() {
  const api = useApi();
  const queryClient = useQueryClient();
  const [disputaAbierta, setDisputaAbierta] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['pedidos-mios'],
    queryFn: () => api<{ pedidos: PedidoMio[] }>('/pedidos/mios'),
    refetchInterval: 30_000,
  });

  const cancelar = useMutation({
    mutationFn: (id: number) => api(`/pedidos/${id}/cancelar`, { method: 'PATCH' }),
    onSuccess: () => {
      setError(null);
      invalidarTodo(queryClient);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'No se pudo cancelar el pedido.'),
  });

  const confirmarRecibido = useMutation({
    mutationFn: (id: number) => api(`/pedidos/${id}/confirmar-recibido`, { method: 'PATCH' }),
    onSuccess: () => {
      setError(null);
      invalidarTodo(queryClient);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'No se pudo confirmar el pedido.'),
  });

  const disputar = useMutation({
    mutationFn: ({ id, motivo, nota }: { id: number; motivo: MotivoDisputa; nota: string }) =>
      api(`/pedidos/${id}/disputar`, { method: 'PATCH', body: { motivo, nota: nota.trim() || undefined } }),
    onSuccess: () => {
      setError(null);
      setDisputaAbierta(null);
      invalidarTodo(queryClient);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'No se pudo enviar el reclamo.'),
  });

  const pedidos = data?.pedidos ?? [];
  const pedidoEnDisputa = pedidos.find((p) => p.id === disputaAbierta) ?? null;

  return (
    <div className="card">
      <h3>Mis pedidos</h3>

      {isLoading && <div className="text-sm text-muted">Cargando…</div>}
      {error && <Aviso tipo="no">{error}</Aviso>}

      {!isLoading && pedidos.length === 0 && <div className="text-muted text-[13px] py-5 text-center">Sin pedidos todavía.</div>}

      {pedidos.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Fecha</th>
              <th>Suplidor</th>
              <th>Estado</th>
              <th className="num">A cargo</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {pedidos.map((p) => (
              <tr key={p.id}>
                <td className="mono">{p.id}</td>
                <td>{fmtCorto(p.fecha_servicio.slice(0, 10))}</td>
                <td>
                  {p.suplidor_nombre}
                  <br />
                  <span className="text-[11px] text-muted mono">retiro {p.codigo_retiro}</span>
                </td>
                <td>
                  <EstadoBadge estado={p.estado} />
                  {p.estado === 'ENTREGADO' && p.ventanaConfirmacionVenceEn && (
                    <div className="text-[10.5px] text-muted mt-1">
                      {p.puedeConfirmar ? `confirma antes de ${fmtSello(p.ventanaConfirmacionVenceEn)}` : 'ventana vencida'}
                    </div>
                  )}
                </td>
                <td className="num">{formatoRD(Number(p.monto_colaborador))}</td>
                <td className="text-right whitespace-nowrap">
                  {p.estado === 'CONFIRMADO' && (
                    <button className="btn btn-sec btn-sm" disabled={cancelar.isPending} onClick={() => cancelar.mutate(p.id)}>
                      Cancelar
                    </button>
                  )}
                  {p.estado === 'ENTREGADO' && p.puedeConfirmar && (
                    <>
                      <button
                        className="btn btn-ok btn-sm mr-1.5"
                        disabled={confirmarRecibido.isPending}
                        onClick={() => confirmarRecibido.mutate(p.id)}
                      >
                        Recibí
                      </button>
                      <button className="btn btn-dan btn-sm" onClick={() => setDisputaAbierta(p.id)}>
                        No llegó
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {pedidoEnDisputa && (
        <DisputaModal
          pedido={pedidoEnDisputa}
          enviando={disputar.isPending}
          onConfirmar={(motivo, nota) => disputar.mutate({ id: pedidoEnDisputa.id, motivo, nota })}
          onCancelar={() => setDisputaAbierta(null)}
        />
      )}
    </div>
  );
}
