import { useQuery } from '@tanstack/react-query';
import { useApi } from '../../lib/useApi';
import type { Empresa } from '../../types';

export function EmpresasLista({
  onNuevaEmpresa,
  onSeleccionar,
}: {
  onNuevaEmpresa: () => void;
  onSeleccionar: (empresaId: number) => void;
}) {
  const api = useApi();
  const { data, isLoading } = useQuery({
    queryKey: ['bo-empresas'],
    queryFn: () => api<{ empresas: Empresa[] }>('/back-office/empresas'),
  });

  const empresas = data?.empresas ?? [];

  return (
    <div>
      <h2>Empresas</h2>
      <p className="sub">
        Cada empresa se da de alta desde aquí, no vía self-service — se verifica el RNC y se configuran sus contratos
        con suplidores antes de que RRHH tenga acceso a su propio portal.
      </p>

      <div className="flex justify-end mb-3.5">
        <button className="btn" onClick={onNuevaEmpresa}>
          Dar de alta empresa nueva
        </button>
      </div>

      {isLoading && <div className="text-sm text-muted">Cargando…</div>}
      {!isLoading && empresas.length === 0 && <div className="vacio">Sin empresas todavía.</div>}

      {empresas.map((e) => (
        <div
          key={e.id}
          className="border border-rule rounded p-3 mb-2.5 cursor-pointer flex justify-between items-center gap-2.5 hover:border-ink"
          onClick={() => onSeleccionar(e.id)}
        >
          <div>
            <div className="font-medium text-[14px]">{e.nombre}</div>
            <div className="text-[12px] text-muted mono">
              RNC {e.rnc} · {e.colaboradores} colaboradores · nómina {e.frecuencia_nomina.toLowerCase()}
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-[12px] text-muted">{e.suplidores_activos} suplidor(es)</span>
            <span className={`est e-${e.estado}`}>{e.estado}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
