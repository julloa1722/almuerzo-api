import { useQuery } from '@tanstack/react-query';
import { useApi } from '../../lib/useApi';
import { fmtCorto, formatoRD } from '../../lib/fechas';
import { EstadoBadge } from '../EstadoBadge';
import type { ResumenSuplidor } from '../../types';

/** Sprint 19, subsprint 19.5: primera pestaña, vista general al entrar. */
export function ResumenTab() {
  const api = useApi();
  const { data, isLoading } = useQuery({
    queryKey: ['suplidor-resumen'],
    queryFn: () => api<ResumenSuplidor>('/catalogo/resumen'),
  });

  if (isLoading || !data) return <div className="text-sm text-muted">Cargando…</div>;

  const totalHoy = data.pedidosHoy.reduce((s, p) => s + Number(p.cantidad), 0);

  return (
    <div>
      <h2>Resumen</h2>
      <p className="sub">Lo que necesitas saber al entrar, sin recorrer cada pestaña.</p>

      <div className="grid g3">
        <div className="card">
          <div className="eyebrow">Pedidos de hoy</div>
          <div className="mono text-[26px] font-medium tracking-tight mt-1.5">{totalHoy}</div>
          {totalHoy > 0 ? (
            <div className="text-[12.5px] text-muted">
              {data.pedidosHoy.map((p) => (
                <span key={p.estado} className="mr-2">
                  <EstadoBadge estado={p.estado} /> {p.cantidad}
                </span>
              ))}
            </div>
          ) : (
            <div className="text-[12.5px] text-muted">sin pedidos para hoy</div>
          )}
        </div>
        <div className="card">
          <div className="eyebrow">Cobertura de menú</div>
          <div
            className={`mono text-[26px] font-medium tracking-tight mt-1.5 ${
              data.coberturaMenu.diasPublicados < data.coberturaMenu.diasTotal ? 'text-ambar' : 'text-verde'
            }`}
          >
            {data.coberturaMenu.diasPublicados} / {data.coberturaMenu.diasTotal}
          </div>
          <div className="text-[12.5px] text-muted">próximos días hábiles con menú publicado</div>
        </div>
        <div className="card">
          <div className="eyebrow">Contratos activos</div>
          <div className="mono text-[26px] font-medium tracking-tight mt-1.5">{data.contratosActivos}</div>
          <div className="text-[12.5px] text-muted">empresa(s) que te contratan hoy</div>
        </div>
      </div>

      <div className="card mt-4">
        <h3>Última liquidación</h3>
        {data.ultimaLiquidacion ? (
          <div className="kv">
            <span>
              {fmtCorto(data.ultimaLiquidacion.periodo_inicio.slice(0, 10))} –{' '}
              {fmtCorto(data.ultimaLiquidacion.periodo_fin.slice(0, 10))}
            </span>
            <span className="v">
              RD$ {formatoRD(Number(data.ultimaLiquidacion.monto_total))} ·{' '}
              <span className={`est e-${data.ultimaLiquidacion.estado === 'PAGADO' ? 'ACTIVA' : 'INACTIVA'}`}>
                {data.ultimaLiquidacion.estado}
              </span>
            </span>
          </div>
        ) : (
          <div className="vacio">Todavía no se te ha calculado ninguna liquidación.</div>
        )}
      </div>
    </div>
  );
}
