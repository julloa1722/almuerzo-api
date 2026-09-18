import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../../lib/useApi';
import { ApiError } from '../../lib/api';
import { fmtSello } from '../../lib/fechas';
import { Aviso } from '../Aviso';
import type { ContratoSuplidor, Lead } from '../../types';

const ESTADO_ETIQUETA: Record<string, string> = {
  ACTIVA: 'activo',
  INACTIVA: 'inactivo',
  PENDIENTE: 'pendiente',
  RECHAZADA: 'rechazada',
  CONVERTIDO: 'convertido',
};

/**
 * Sprint 17, subsprint 17.5. El suplidor propone (solicitud de contrato,
 * o un lead si la empresa ni siquiera existe en la plataforma) — back
 * office decide en los dos casos. Sin tabla de estado sofisticada: solo
 * ver si sigue pendiente, se aprobó o se rechazó.
 */
export function ComercialTab() {
  const api = useApi();
  const queryClient = useQueryClient();
  const [rnc, setRnc] = useState('');
  const [ajuste, setAjuste] = useState('0');
  const [errorSolicitud, setErrorSolicitud] = useState<string | null>(null);

  const [leadNombre, setLeadNombre] = useState('');
  const [leadRnc, setLeadRnc] = useState('');
  const [leadContacto, setLeadContacto] = useState('');
  const [leadMensaje, setLeadMensaje] = useState('');
  const [errorLead, setErrorLead] = useState<string | null>(null);

  const { data: dataContratos, isLoading: cargandoContratos } = useQuery({
    queryKey: ['suplidor-contratos'],
    queryFn: () => api<{ contratos: ContratoSuplidor[] }>('/catalogo/contratos'),
  });
  const { data: dataLeads, isLoading: cargandoLeads } = useQuery({
    queryKey: ['suplidor-leads'],
    queryFn: () => api<{ leads: Lead[] }>('/catalogo/leads'),
  });

  const solicitar = useMutation({
    mutationFn: () =>
      api('/catalogo/contratos/solicitar', {
        method: 'POST',
        body: { rnc: rnc.trim(), ajustePctPropuesto: Number(ajuste) },
      }),
    onSuccess: () => {
      setErrorSolicitud(null);
      setRnc('');
      setAjuste('0');
      queryClient.invalidateQueries({ queryKey: ['suplidor-contratos'] });
    },
    onError: (err) => setErrorSolicitud(err instanceof ApiError ? err.message : 'No se pudo enviar la solicitud.'),
  });

  const crearLead = useMutation({
    mutationFn: () =>
      api('/catalogo/leads', {
        method: 'POST',
        body: {
          nombrePropuesto: leadNombre.trim(),
          rncPropuesto: leadRnc.trim() || undefined,
          contacto: leadContacto.trim() || undefined,
          mensaje: leadMensaje.trim() || undefined,
        },
      }),
    onSuccess: () => {
      setErrorLead(null);
      setLeadNombre('');
      setLeadRnc('');
      setLeadContacto('');
      setLeadMensaje('');
      queryClient.invalidateQueries({ queryKey: ['suplidor-leads'] });
    },
    onError: (err) => setErrorLead(err instanceof ApiError ? err.message : 'No se pudo registrar el lead.'),
  });

  const contratos = dataContratos?.contratos ?? [];
  const leads = dataLeads?.leads ?? [];

  return (
    <div>
      <h2>Relación comercial</h2>
      <p className="sub">
        Tú propones, back office decide. Solicita un contrato con una empresa que ya está en la plataforma, o deja
        una nota sobre una que todavía no — nunca creas una empresa por tu cuenta.
      </p>

      <div className="grid g2">
        <div className="card">
          <h3>Solicitar contrato</h3>
          <p className="text-[13px] text-muted mb-3">
            Busca por RNC una empresa que ya está en la plataforma y propón un ajuste de precio.
          </p>
          {errorSolicitud && <Aviso tipo="no">{errorSolicitud}</Aviso>}
          <div className="campo">
            <label>RNC de la empresa</label>
            <input value={rnc} onChange={(e) => setRnc(e.target.value)} placeholder="000-00000-0" />
          </div>
          <div className="campo">
            <label>Ajuste de precio propuesto (%)</label>
            <input type="number" min={-25} max={25} step={0.5} value={ajuste} onChange={(e) => setAjuste(e.target.value)} />
          </div>
          <button className="btn btn-sm" disabled={!rnc.trim() || solicitar.isPending} onClick={() => solicitar.mutate()}>
            {solicitar.isPending ? 'Enviando…' : 'Solicitar contrato'}
          </button>

          <div className="mt-4">
            <h3>Tus contratos</h3>
            {cargandoContratos && <div className="text-sm text-muted">Cargando…</div>}
            {!cargandoContratos && contratos.length === 0 && <div className="vacio">Sin contratos todavía.</div>}
            {contratos.map((c) => (
              <div key={c.id} className="kv">
                <span>{c.empresa_nombre}</span>
                <span className={`est e-${c.estado === 'ACTIVA' ? 'ACTIVA' : 'INACTIVA'}`}>
                  {ESTADO_ETIQUETA[c.estado] ?? c.estado}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3>Registrar lead</h3>
          <p className="text-[13px] text-muted mb-3">
            Para una empresa que conoces pero que no está en la plataforma — solo una nota, back office decide si
            contactarla.
          </p>
          {errorLead && <Aviso tipo="no">{errorLead}</Aviso>}
          <div className="campo">
            <label>Nombre de la empresa</label>
            <input value={leadNombre} onChange={(e) => setLeadNombre(e.target.value)} />
          </div>
          <div className="campo">
            <label>RNC (si lo conoces)</label>
            <input value={leadRnc} onChange={(e) => setLeadRnc(e.target.value)} placeholder="opcional" />
          </div>
          <div className="campo">
            <label>Contacto</label>
            <input value={leadContacto} onChange={(e) => setLeadContacto(e.target.value)} placeholder="nombre, teléfono o correo" />
          </div>
          <div className="campo">
            <label>Mensaje</label>
            <input value={leadMensaje} onChange={(e) => setLeadMensaje(e.target.value)} placeholder="opcional" />
          </div>
          <button className="btn btn-sm" disabled={!leadNombre.trim() || crearLead.isPending} onClick={() => crearLead.mutate()}>
            {crearLead.isPending ? 'Guardando…' : 'Registrar lead'}
          </button>

          <div className="mt-4">
            <h3>Tus leads</h3>
            {cargandoLeads && <div className="text-sm text-muted">Cargando…</div>}
            {!cargandoLeads && leads.length === 0 && <div className="vacio">Sin leads todavía.</div>}
            {leads.map((l) => (
              <div key={l.id} className="border border-rule rounded p-2.5 mb-2">
                <div className="flex justify-between items-start gap-2">
                  <div className="font-medium text-[13px]">{l.nombre_propuesto}</div>
                  <span className={`est e-${l.estado === 'CONVERTIDO' ? 'ACTIVA' : 'INACTIVA'}`}>
                    {ESTADO_ETIQUETA[l.estado] ?? l.estado}
                  </span>
                </div>
                <div className="text-[11.5px] text-muted mt-0.5">{fmtSello(l.creado_en)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
