import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../../lib/useApi';
import { ApiError } from '../../lib/api';
import { fmtFecha, formatoRD } from '../../lib/fechas';
import { Aviso } from '../Aviso';
import { EstadoBadge } from '../EstadoBadge';
import type { Disputa, PedidoEmpresa } from '../../types';

const MOTIVOS: Record<string, string> = {
  NO_LLEGO: 'Nunca llegó',
  INCOMPLETO: 'Llegó incompleto',
  EQUIVOCADO: 'Llegó un plato distinto',
  CALIDAD: 'Problema de calidad o estado del alimento',
  OTRO: 'Otro motivo',
};

export function DisputasTab() {
  const api = useApi();
  const queryClient = useQueryClient();

  const { data: dataDisputas, isLoading: cargandoDisputas } = useQuery({
    queryKey: ['rrhh-disputas'],
    queryFn: () => api<{ disputas: Disputa[] }>('/pedidos/disputas'),
  });
  const { data: dataPedidos, isLoading: cargandoPedidos } = useQuery({
    queryKey: ['rrhh-pedidos'],
    queryFn: () => api<{ pedidos: PedidoEmpresa[] }>('/pedidos'),
  });

  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: ['rrhh-disputas'] });
    queryClient.invalidateQueries({ queryKey: ['rrhh-pedidos'] });
  };

  const resolver = useMutation({
    mutationFn: ({ id, aFavorColaborador }: { id: number; aFavorColaborador: boolean }) =>
      api(`/pedidos/${id}/resolver-disputa`, { method: 'PATCH', body: { aFavorColaborador } }),
    onSuccess: invalidar,
    onError: (err) => alert(err instanceof ApiError ? err.message : 'No se pudo resolver la disputa.'),
  });

  const disputas = dataDisputas?.disputas ?? [];
  const pedidos = dataPedidos?.pedidos ?? [];

  return (
    <div>
      <h2>Disputas y pedidos</h2>
      <p className="sub">
        El libro mayor es append-only. Una disputa resuelta después del cierre de ciclo genera nota de crédito en el
        ciclo siguiente, nunca una corrección del asiento original.
      </p>

      {disputas.length > 0 && (
        <div className="card mb-4 border-granate">
          <h3 className="text-granate">Disputas por resolver · {disputas.length}</h3>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Colaborador</th>
                <th>Motivo</th>
                <th className="num">Monto</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {disputas.map((d) => (
                <tr key={d.id}>
                  <td className="mono">{d.id}</td>
                  <td>{d.colaborador}</td>
                  <td>
                    {MOTIVOS[d.motivo_disputa] ?? d.motivo_disputa}
                    {d.nota_disputa && (
                      <div className="text-[11.5px] text-muted mt-0.5">&quot;{d.nota_disputa}&quot;</div>
                    )}
                  </td>
                  <td className="num">{formatoRD(Number(d.total_bruto))}</td>
                  <td className="text-right whitespace-nowrap">
                    <button
                      className="btn btn-sm"
                      disabled={resolver.isPending}
                      onClick={() => resolver.mutate({ id: d.id, aFavorColaborador: true })}
                    >
                      A favor del colaborador
                    </button>{' '}
                    <button
                      className="btn btn-sec btn-sm"
                      disabled={resolver.isPending}
                      onClick={() => resolver.mutate({ id: d.id, aFavorColaborador: false })}
                    >
                      A favor del suplidor
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!cargandoDisputas && disputas.length === 0 && <Aviso tipo="si">Sin disputas pendientes.</Aviso>}

      <div className="card mt-4">
        <h3>Pedidos de la empresa</h3>
        {cargandoPedidos && <div className="text-sm text-muted">Cargando…</div>}
        {!cargandoPedidos && pedidos.length === 0 && <div className="vacio">Sin pedidos todavía.</div>}
        {pedidos.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Colaborador</th>
                <th>Suplidor</th>
                <th>Estado</th>
                <th className="num">A cargo del colaborador</th>
              </tr>
            </thead>
            <tbody>
              {pedidos.slice(0, 40).map((p) => (
                <tr key={p.id}>
                  <td className="text-[12.5px]">{fmtFecha(p.fecha_servicio.slice(0, 10))}</td>
                  <td>{p.colaborador}</td>
                  <td>{p.suplidor_nombre}</td>
                  <td>
                    <EstadoBadge estado={p.estado} />
                  </td>
                  <td className="num">{formatoRD(Number(p.monto_colaborador))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {pedidos.length > 40 && (
          <div className="text-[11.5px] text-muted mt-2">Mostrando los 40 más recientes de {pedidos.length}.</div>
        )}
      </div>
    </div>
  );
}
