import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../../lib/useApi';
import { ApiError } from '../../lib/api';
import { formatoRD } from '../../lib/fechas';
import { Aviso } from '../Aviso';
import { EstadoBadge } from '../EstadoBadge';
import type { Configuracion, DashboardPlataforma, EstadoPedido } from '../../types';

/**
 * Sprint 14: panel de métricas de plataforma. Diseño de la pestaña
 * `vPlat` en `mockup-plataforma-almuerzo.html`. "Ingreso propio" es un
 * estimado informativo (gmv × tasaComisionPct) — no descuenta nada de la
 * liquidación real a suplidores (Sprint 7 sigue pagando el 100%), ver
 * plan-sprints.md, Sprint 14.
 */
export function DashboardTab() {
  const api = useApi();
  const queryClient = useQueryClient();
  const [editandoTasa, setEditandoTasa] = useState(false);
  const [tasa, setTasa] = useState('0');
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['bo-dashboard'],
    queryFn: () => api<DashboardPlataforma>('/reportes/dashboard-plataforma'),
  });
  const { data: dataCfg } = useQuery({
    queryKey: ['bo-configuracion'],
    queryFn: () => api<Configuracion>('/back-office/configuracion'),
  });

  const guardarTasa = useMutation({
    mutationFn: () => api('/back-office/configuracion', { method: 'PUT', body: { tasaComisionPct: Number(tasa) } }),
    onSuccess: () => {
      setError(null);
      setEditandoTasa(false);
      queryClient.invalidateQueries({ queryKey: ['bo-configuracion'] });
      queryClient.invalidateQueries({ queryKey: ['bo-dashboard'] });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'No se pudo guardar la tasa.'),
  });

  if (isLoading || !data) return <div className="text-sm text-muted">Cargando…</div>;

  return (
    <div>
      <h2>Panel de plataforma</h2>
      <p className="sub">
        Lo que mides como operador del SaaS. La cobertura de menú publicado es tu alerta temprana: un suplidor que
        deja de publicar deja de vender antes de que nadie se queje.
      </p>

      {error && <Aviso tipo="no">{error}</Aviso>}

      <div className="grid g3">
        <div className="card">
          <div className="eyebrow">Volumen</div>
          <div className="mono text-[26px] font-medium tracking-tight mt-1.5 mb-0.5">
            RD$ {formatoRD(data.gmvConfirmado)}
          </div>
          <div className="text-[12.5px] text-muted">GMV confirmado · {data.cantidadPedidosRecibidos} pedidos</div>
        </div>
        <div className="card">
          <div className="eyebrow">Ingreso propio</div>
          <div className="mono text-[26px] font-medium tracking-tight mt-1.5 mb-0.5">
            RD$ {formatoRD(data.ingresoPropio)}
          </div>
          {!editandoTasa ? (
            <div className="text-[12.5px] text-muted">
              Comisión {Number(data.tasaComisionPct)}% sobre GMV —{' '}
              <button
                className="underline"
                onClick={() => {
                  setTasa(dataCfg?.tasa_comision_pct ?? '0');
                  setEditandoTasa(true);
                }}
              >
                editar
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 mt-1">
              <input
                type="number"
                min={0}
                max={100}
                step={0.5}
                className="w-20 text-xs mono"
                value={tasa}
                onChange={(e) => setTasa(e.target.value)}
              />
              <span className="text-[12px]">%</span>
              <button className="btn btn-sm" disabled={guardarTasa.isPending} onClick={() => guardarTasa.mutate()}>
                Guardar
              </button>
              <button className="btn btn-sec btn-sm" onClick={() => setEditandoTasa(false)}>
                Cancelar
              </button>
            </div>
          )}
        </div>
        <div className="card">
          <div className="eyebrow">Aporte de las empresas</div>
          <div className="mono text-[26px] font-medium tracking-tight mt-1.5 mb-0.5">
            RD$ {formatoRD(data.subsidioTotalEmpresas)}
          </div>
          <div className="text-[12.5px] text-muted">
            {data.gmvConfirmado ? Math.round((data.subsidioTotalEmpresas / data.gmvConfirmado) * 100) : 0}% del consumo
          </div>
        </div>
      </div>

      <div className="grid g2 mt-4">
        <div className="card">
          <h3>Cobertura de menú publicado</h3>
          {data.coberturaMenu.map((c) => (
            <div key={c.suplidorId} className="kv">
              <span>{c.suplidorNombre}</span>
              <span className={`v ${c.diasPublicados < c.diasTotal ? 'text-ambar' : 'text-verde'}`}>
                {c.diasPublicados} / {c.diasTotal} días
              </span>
            </div>
          ))}
          <div className="text-[12px] text-muted mt-3 leading-relaxed">
            Sobre las próximas 10 fechas hábiles. Publicar por adelantado desde la plantilla mantiene esta métrica en
            verde sin trabajo diario.
          </div>
        </div>
        <div className="card">
          <h3>Pedidos por estado</h3>
          {data.pedidosPorEstado.length === 0 && <div className="vacio">Sin pedidos.</div>}
          {data.pedidosPorEstado.map((p) => (
            <div key={p.estado} className="kv">
              <EstadoBadge estado={p.estado as EstadoPedido} />
              <span className="v">{p.cantidad}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
