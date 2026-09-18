import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../../lib/useApi';
import { ApiError } from '../../lib/api';
import { Aviso } from '../Aviso';
import type { Colaborador, Invitacion } from '../../types';

interface RespuestaMasiva {
  invitados: { colaboradorId: number; email: string }[];
  omitidosSinEmail: { colaboradorId: number; nombre: string }[];
  yaInvitados: { colaboradorId: number; nombre: string }[];
}

/**
 * Sprint 18, subsprint 18.6: colaboradores cargados por CSV (Sprint 2/13/16)
 * no tienen ninguna forma de loguearse hasta que alguien los invite — este
 * es exactamente ese "alguien". Solo se ofrece invitar a los que todavía no
 * tienen `usuario_id`.
 *
 * Sprint 19, subsprint 19.8: el correo ahora viene precargado desde el CSV
 * (`c.email`, expuesto por `GET /colaboradores` desde el 19.7) pero sigue
 * siendo editable por si el dato del CSV está mal o falta. Se agrega el
 * botón de invitación masiva para no invitar de uno en uno cuando ya se
 * cargó una empresa entera por CSV.
 */
export function InvitarColaboradoresSeccion() {
  const api = useApi();
  const queryClient = useQueryClient();
  const [emailPorColaborador, setEmailPorColaborador] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [ultimoLink, setUltimoLink] = useState<string | null>(null);
  const [resumenMasivo, setResumenMasivo] = useState<RespuestaMasiva | null>(null);

  const { data: dataColabs, isLoading } = useQuery({
    queryKey: ['rrhh-colaboradores'],
    queryFn: () => api<{ colaboradores: Colaborador[] }>('/colaboradores'),
  });
  const { data: dataInv } = useQuery({
    queryKey: ['rrhh-invitaciones'],
    queryFn: () => api<{ invitaciones: Invitacion[] }>('/invitaciones'),
  });

  useEffect(() => {
    if (!dataColabs) return;
    setEmailPorColaborador((prev) => {
      const siguiente = { ...prev };
      for (const c of dataColabs.colaboradores) {
        if (siguiente[c.id] === undefined) siguiente[c.id] = c.email ?? '';
      }
      return siguiente;
    });
  }, [dataColabs]);

  const invitar = useMutation({
    mutationFn: ({ colaboradorId, email }: { colaboradorId: number; email: string }) =>
      api<{ link: string }>('/invitaciones', { method: 'POST', body: { email, rol: 'COLABORADOR', colaboradorId } }),
    onSuccess: (resp) => {
      setError(null);
      setUltimoLink(resp.link);
      queryClient.invalidateQueries({ queryKey: ['rrhh-invitaciones'] });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'No se pudo enviar la invitación.'),
  });

  const invitarMasivo = useMutation({
    mutationFn: () => api<RespuestaMasiva>('/invitaciones/masiva', { method: 'POST', body: {} }),
    onSuccess: (resp) => {
      setError(null);
      setResumenMasivo(resp);
      queryClient.invalidateQueries({ queryKey: ['rrhh-invitaciones'] });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'No se pudo enviar la invitación masiva.'),
  });

  const sinCuenta = (dataColabs?.colaboradores ?? []).filter((c) => !c.usuario_id);
  const invitacionesPendientes = new Set(
    (dataInv?.invitaciones ?? []).filter((i) => i.estado === 'PENDIENTE').map((i) => i.email),
  );
  const conCorreoSinInvitar = sinCuenta.filter((c) => c.email && !invitacionesPendientes.has(c.email));

  return (
    <div className="card mt-4">
      <h3>Invitar colaboradores</h3>
      <p className="text-[13px] text-muted mb-3">
        Un colaborador cargado por CSV no puede pedir almuerzo hasta que active su cuenta. Ponle su correo y
        envíale la invitación, uno por uno o de una sola vez.
      </p>

      {error && <Aviso tipo="no">{error}</Aviso>}
      {ultimoLink && (
        <Aviso tipo="si">
          Invitación enviada. Si no hay servicio de correo configurado, copia el enlace: <br />
          <span className="mono text-[11.5px] break-all">{ultimoLink}</span>
        </Aviso>
      )}
      {resumenMasivo && (
        <Aviso tipo={resumenMasivo.invitados.length ? 'si' : 'no'}>
          {resumenMasivo.invitados.length} invitación(es) enviada(s).
          {resumenMasivo.omitidosSinEmail.length > 0 &&
            ` ${resumenMasivo.omitidosSinEmail.length} sin correo, no se pudieron invitar (${resumenMasivo.omitidosSinEmail
              .map((o) => o.nombre)
              .join(', ')}).`}
          {resumenMasivo.yaInvitados.length > 0 && ` ${resumenMasivo.yaInvitados.length} ya tenían una invitación pendiente.`}
        </Aviso>
      )}

      {!isLoading && conCorreoSinInvitar.length > 0 && (
        <button
          className="btn btn-sm mb-3"
          disabled={invitarMasivo.isPending}
          onClick={() => invitarMasivo.mutate()}
        >
          {invitarMasivo.isPending
            ? 'Invitando…'
            : `Invitar a todos los que tienen correo (${conCorreoSinInvitar.length})`}
        </button>
      )}

      {isLoading && <div className="text-sm text-muted">Cargando…</div>}
      {!isLoading && sinCuenta.length === 0 && (
        <div className="vacio">Todos tus colaboradores ya tienen cuenta activa.</div>
      )}

      {sinCuenta.map((c) => {
        const email = emailPorColaborador[c.id] ?? '';
        const yaInvitado = email && invitacionesPendientes.has(email);
        return (
          <div key={c.id} className="flex items-center gap-1.5 mb-2">
            <span className="flex-1 min-w-0 truncate text-[13px]">
              {c.nombre_completo} <span className="mono text-[11.5px] text-muted">({c.codigo_nomina})</span>
            </span>
            <input
              className="w-56 text-xs"
              placeholder="correo del colaborador"
              value={email}
              onChange={(e) => setEmailPorColaborador({ ...emailPorColaborador, [c.id]: e.target.value })}
            />
            <button
              className="btn btn-sm flex-none"
              disabled={!email.trim() || invitar.isPending || !!yaInvitado}
              onClick={() => invitar.mutate({ colaboradorId: c.id, email: email.trim() })}
            >
              {yaInvitado ? 'Invitación enviada' : 'Invitar'}
            </button>
          </div>
        );
      })}
    </div>
  );
}
