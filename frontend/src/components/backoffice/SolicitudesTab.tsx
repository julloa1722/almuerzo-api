import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../../lib/useApi';
import { ApiError } from '../../lib/api';
import { fmtSello } from '../../lib/fechas';
import { Aviso } from '../Aviso';
import type { Lead, SolicitudContrato } from '../../types';

/**
 * Sprint 17, subsprint 17.6. El suplidor propone (Sprint 11), back office
 * decide aquí — aprobar/rechazar solicitudes de contrato, y convertir un
 * lead en una empresa real vía el wizard de alta ya existente (Sprint 13),
 * prellenado.
 */
export function SolicitudesTab({ onCrearEmpresaDesdeLead }: { onCrearEmpresaDesdeLead: (lead: Lead) => void }) {
  const api = useApi();
  const queryClient = useQueryClient();

  const { data: dataSolicitudes, isLoading: cargandoSolicitudes } = useQuery({
    queryKey: ['bo-solicitudes'],
    queryFn: () => api<{ solicitudes: SolicitudContrato[] }>('/back-office/solicitudes-contrato'),
  });
  const { data: dataLeads, isLoading: cargandoLeads } = useQuery({
    queryKey: ['bo-leads'],
    queryFn: () => api<{ leads: Lead[] }>('/back-office/leads'),
  });

  const invalidarSolicitudes = () => queryClient.invalidateQueries({ queryKey: ['bo-solicitudes'] });

  const aprobar = useMutation({
    mutationFn: (id: number) => api(`/back-office/contratos/${id}/aprobar`, { method: 'PATCH' }),
    onSuccess: invalidarSolicitudes,
    onError: (err) => alert(err instanceof ApiError ? err.message : 'No se pudo aprobar la solicitud.'),
  });
  const rechazar = useMutation({
    mutationFn: (id: number) => api(`/back-office/contratos/${id}/rechazar`, { method: 'PATCH' }),
    onSuccess: invalidarSolicitudes,
    onError: (err) => alert(err instanceof ApiError ? err.message : 'No se pudo rechazar la solicitud.'),
  });

  const solicitudes = dataSolicitudes?.solicitudes ?? [];
  const leads = dataLeads?.leads ?? [];
  const leadsPendientes = leads.filter((l) => l.estado === 'PENDIENTE');
  const leadsConvertidos = leads.filter((l) => l.estado === 'CONVERTIDO');

  return (
    <div>
      <h2>Solicitudes y leads</h2>
      <p className="sub">
        Los suplidores proponen — contratos con empresas ya existentes, o leads de empresas que todavía no están en
        la plataforma. Aquí decides.
      </p>

      <div className="card mb-4">
        <h3>Solicitudes de contrato · {solicitudes.length}</h3>
        {cargandoSolicitudes && <div className="text-sm text-muted">Cargando…</div>}
        {!cargandoSolicitudes && solicitudes.length === 0 && <div className="vacio">Sin solicitudes pendientes.</div>}
        {solicitudes.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Suplidor</th>
                <th>Empresa</th>
                <th className="num">Ajuste propuesto</th>
                <th>Solicitado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {solicitudes.map((s) => (
                <tr key={s.id}>
                  <td>{s.suplidor_nombre}</td>
                  <td>{s.empresa_nombre}</td>
                  <td className="num mono">
                    {Number(s.ajuste_pct) > 0 ? '+' : ''}
                    {Number(s.ajuste_pct)}%
                  </td>
                  <td className="text-[12px] text-muted">{fmtSello(s.creado_en)}</td>
                  <td className="text-right whitespace-nowrap">
                    <button className="btn btn-sm" disabled={aprobar.isPending} onClick={() => aprobar.mutate(s.id)}>
                      Aprobar
                    </button>{' '}
                    <button className="btn btn-sec btn-sm" disabled={rechazar.isPending} onClick={() => rechazar.mutate(s.id)}>
                      Rechazar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h3>Leads comerciales · {leadsPendientes.length} pendiente(s)</h3>
        {cargandoLeads && <div className="text-sm text-muted">Cargando…</div>}
        {!cargandoLeads && leads.length === 0 && <div className="vacio">Sin leads todavía.</div>}

        {leadsPendientes.map((l) => (
          <div key={l.id} className="border border-rule rounded p-3 mb-2.5">
            <div className="flex justify-between items-start gap-2.5">
              <div>
                <div className="font-medium text-[13.5px]">{l.nombre_propuesto}</div>
                <div className="text-[11.5px] text-muted">
                  {l.suplidor_nombre} · {fmtSello(l.creado_en)}
                  {l.rnc_propuesto ? ` · RNC ${l.rnc_propuesto}` : ''}
                </div>
                {l.contacto && <div className="text-[12px] mt-1">{l.contacto}</div>}
                {l.mensaje && <div className="text-[12px] text-muted mt-0.5">&quot;{l.mensaje}&quot;</div>}
              </div>
              <button className="btn btn-sm flex-none" onClick={() => onCrearEmpresaDesdeLead(l)}>
                Crear empresa desde este lead
              </button>
            </div>
          </div>
        ))}

        {leadsConvertidos.length > 0 && (
          <>
            <div className="text-[12px] text-muted mt-3 mb-1.5">Convertidos</div>
            {leadsConvertidos.map((l) => (
              <div key={l.id} className="kv">
                <span>{l.nombre_propuesto}</span>
                <span className="est e-ACTIVA">convertido</span>
              </div>
            ))}
          </>
        )}
      </div>

      <div className="mt-3.5">
        <Aviso tipo="si">
          "Crear empresa desde este lead" te lleva al wizard de alta normal, con nombre/RNC prellenados si el lead
          los traía — el lead queda convertido al terminar de importar los colaboradores.
        </Aviso>
      </div>
    </div>
  );
}
