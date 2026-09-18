import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../../lib/useApi';
import { ApiError } from '../../lib/api';
import { Aviso } from '../Aviso';
import type { Contrato, Empresa, SuplidorBO } from '../../types';

export function DetalleEmpresa({ empresaId, onVolver }: { empresaId: number; onVolver: () => void }) {
  const api = useApi();
  const queryClient = useQueryClient();

  const { data: dataEmpresas } = useQuery({
    queryKey: ['bo-empresas'],
    queryFn: () => api<{ empresas: Empresa[] }>('/back-office/empresas'),
  });
  const { data: dataContratos, isLoading: cargandoContratos } = useQuery({
    queryKey: ['bo-contratos', empresaId],
    queryFn: () => api<{ contratos: Contrato[] }>(`/back-office/empresas/${empresaId}/contratos`),
  });
  const { data: dataSuplidores } = useQuery({
    queryKey: ['bo-suplidores'],
    queryFn: () => api<{ suplidores: SuplidorBO[] }>('/back-office/suplidores'),
  });

  const invalidarContratos = () => queryClient.invalidateQueries({ queryKey: ['bo-contratos', empresaId] });

  const crearContrato = useMutation({
    mutationFn: (suplidorId: number) =>
      api(`/back-office/empresas/${empresaId}/contratos`, { method: 'POST', body: { suplidorId } }),
    onSuccess: invalidarContratos,
    onError: (err) => alert(err instanceof ApiError ? err.message : 'No se pudo contratar al suplidor.'),
  });

  const editarContrato = useMutation({
    mutationFn: ({ id, cambios }: { id: number; cambios: { ajustePct?: number; estado?: 'ACTIVA' | 'INACTIVA' } }) =>
      api(`/back-office/contratos/${id}`, { method: 'PATCH', body: cambios }),
    onSuccess: invalidarContratos,
    onError: (err) => alert(err instanceof ApiError ? err.message : 'No se pudo guardar el cambio.'),
  });

  const empresa = dataEmpresas?.empresas.find((e) => e.id === empresaId);
  const contratos = dataContratos?.contratos ?? [];
  const disponibles = (dataSuplidores?.suplidores ?? []).filter(
    (s) => !contratos.some((c) => c.suplidor_id === s.id),
  );

  if (!empresa) return <div className="text-sm text-muted">Cargando…</div>;

  return (
    <div>
      <button className="btn btn-sec btn-sm mb-3.5" onClick={onVolver}>
        ← Volver a empresas
      </button>
      <h2>{empresa.nombre}</h2>
      <p className="sub mono">
        RNC {empresa.rnc} · nómina {empresa.frecuencia_nomina.toLowerCase()} · {empresa.colaboradores} colaboradores
        activos
      </p>

      <div className="grid g2">
        <div className="card">
          <h3>Suplidores contratados</h3>
          {cargandoContratos && <div className="text-sm text-muted">Cargando…</div>}
          {!cargandoContratos && contratos.length === 0 && <div className="vacio">Sin suplidores contratados todavía.</div>}

          {contratos.map((c) => (
            <div key={c.id} className="border border-rule rounded p-3 mb-2.5">
              <div className="flex justify-between items-center gap-2.5 mb-2">
                <div>
                  <div className="font-medium text-[13.5px]">{c.suplidor_nombre}</div>
                  <div className="text-[11.5px] text-muted mono">RNC {c.suplidor_rnc}</div>
                </div>
                <span className={`est e-${c.estado === 'ACTIVA' ? 'ACTIVA' : 'INACTIVA'}`}>{c.estado}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-muted whitespace-nowrap">Ajuste de precio</span>
                <input
                  type="range"
                  min={-25}
                  max={25}
                  step={0.5}
                  defaultValue={Number(c.ajuste_pct)}
                  onMouseUp={(e) => editarContrato.mutate({ id: c.id, cambios: { ajustePct: Number((e.target as HTMLInputElement).value) } })}
                  onTouchEnd={(e) => editarContrato.mutate({ id: c.id, cambios: { ajustePct: Number((e.target as HTMLInputElement).value) } })}
                  className="flex-1"
                />
                <span className="mono text-[12.5px] w-12 text-right">
                  {Number(c.ajuste_pct) > 0 ? '+' : ''}
                  {Number(c.ajuste_pct)}%
                </span>
              </div>
              <div className="text-[11.5px] text-muted mt-1.5">
                {Number(c.ajuste_pct) === 0
                  ? 'El colaborador ve el precio del menú tal como lo publica el suplidor.'
                  : Number(c.ajuste_pct) < 0
                    ? `El colaborador ve el precio del menú con ${Math.abs(Number(c.ajuste_pct))}% de descuento por volumen negociado.`
                    : `El colaborador ve el precio del menú incrementado ${Number(c.ajuste_pct)}% (recargo por logística u otro acuerdo).`}
              </div>
              <button
                className="btn btn-sec btn-sm mt-2"
                disabled={editarContrato.isPending}
                onClick={() => editarContrato.mutate({ id: c.id, cambios: { estado: c.estado === 'ACTIVA' ? 'INACTIVA' : 'ACTIVA' } })}
              >
                {c.estado === 'ACTIVA' ? 'Desactivar contrato' : 'Reactivar contrato'}
              </button>
            </div>
          ))}

          {disponibles.length > 0 && (
            <div className="campo mt-3">
              <label>Agregar suplidor</label>
              <div className="flex flex-wrap gap-1.5">
                {disponibles.map((s) => (
                  <button
                    key={s.id}
                    className="btn btn-sec btn-sm"
                    disabled={crearContrato.isPending}
                    onClick={() => crearContrato.mutate(s.id)}
                  >
                    {s.nombre}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <h3>Resumen</h3>
          <div className="kv">
            <span>Colaboradores activos</span>
            <span className="v">{empresa.colaboradores}</span>
          </div>
          <div className="kv">
            <span>Suplidores activos</span>
            <span className="v">{contratos.filter((c) => c.estado === 'ACTIVA').length}</span>
          </div>
          <div className="kv">
            <span>Frecuencia de nómina</span>
            <span className="v">{empresa.frecuencia_nomina}</span>
          </div>
          <div className="kv">
            <span>Estado</span>
            <span className={`est e-${empresa.estado}`}>{empresa.estado}</span>
          </div>
          <div className="mt-3.5">
            <Aviso tipo="si">
              Sin al menos un contrato activo, los colaboradores de esta empresa no verán ningún suplidor disponible
              al intentar pedir su almuerzo.
            </Aviso>
          </div>
        </div>
      </div>
    </div>
  );
}
