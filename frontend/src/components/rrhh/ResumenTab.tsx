import { useQuery } from '@tanstack/react-query';
import { useApi } from '../../lib/useApi';
import { fmtCorto, formatoRD } from '../../lib/fechas';
import { Aviso } from '../Aviso';
import type { ResumenRrhh } from '../../types';

/** Sprint 19, subsprint 19.5: primera pestaña, vista general al entrar. */
export function ResumenTab() {
  const api = useApi();
  const { data, isLoading } = useQuery({
    queryKey: ['rrhh-resumen'],
    queryFn: () => api<ResumenRrhh>('/nomina/resumen'),
  });

  if (isLoading || !data) return <div className="text-sm text-muted">Cargando…</div>;

  return (
    <div>
      <h2>Resumen</h2>
      <p className="sub">
        Período actual: {fmtCorto(data.periodoActual.inicio)} – {fmtCorto(data.periodoActual.fin)}.
      </p>

      <div className="grid g3">
        <div className="card">
          <div className="eyebrow">Disputas</div>
          <div className={`mono text-[26px] font-medium tracking-tight mt-1.5 ${data.disputasPendientes > 0 ? 'text-granate' : ''}`}>
            {data.disputasPendientes}
          </div>
          <div className="text-[12.5px] text-muted">pendientes de resolver</div>
        </div>
        <div className="card">
          <div className="eyebrow">Colaboradores</div>
          <div className="mono text-[26px] font-medium tracking-tight mt-1.5">{data.colaboradoresActivos}</div>
          <div className="text-[12.5px] text-muted">
            activos
            {data.colaboradoresSinPrograma > 0 && (
              <span className="text-ambar"> · {data.colaboradoresSinPrograma} sin programa vigente</span>
            )}
          </div>
        </div>
        <div className="card">
          <div className="eyebrow">Ciclo del período</div>
          {data.cicloActual ? (
            <>
              <div className="mono text-[26px] font-medium tracking-tight mt-1.5">
                RD$ {formatoRD(Number(data.cicloActual.total))}
              </div>
              <div className="text-[12.5px] text-muted">
                {data.cicloActual.movimientos} movimiento(s) ·{' '}
                <span className={`est e-${data.cicloActual.estado}`}>{data.cicloActual.estado}</span>
              </div>
            </>
          ) : (
            <div className="text-[13px] text-muted mt-2">Sin movimientos todavía este período.</div>
          )}
        </div>
      </div>

      {data.disputasPendientes > 0 && (
        <div className="mt-4">
          <Aviso tipo="at">
            Tienes {data.disputasPendientes} disputa(s) sin resolver — revísalas en "Disputas y pedidos" antes de
            cerrar el ciclo.
          </Aviso>
        </div>
      )}
      {data.colaboradoresSinPrograma > 0 && (
        <div className="mt-2.5">
          <Aviso tipo="at">
            {data.colaboradoresSinPrograma} colaborador(es) activo(s) no tienen un programa de beneficio vigente —
            no pueden pedir almuerzo hasta que se les asigne uno.
          </Aviso>
        </div>
      )}
    </div>
  );
}
