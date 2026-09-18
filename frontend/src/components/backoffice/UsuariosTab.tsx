import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../../lib/useApi';
import { ApiError } from '../../lib/api';
import { fmtSello } from '../../lib/fechas';
import { Aviso } from '../Aviso';
import type { Empresa, Invitacion, SuplidorBO } from '../../types';

const ROLES_EMPRESA = ['RRHH', 'ADMIN_EMPRESA'] as const;

/**
 * Sprint 18, subsprint 18.6. Cierra el bloqueo real encontrado al armar
 * `RECORRIDO-FINAL.md` (Sprint 15): antes de esto, una empresa dada de
 * alta por el back office no tenía ninguna forma de que su RRHH entrara a
 * la aplicación.
 */
export function UsuariosTab() {
  const api = useApi();
  const queryClient = useQueryClient();
  const [ambitoTipo, setAmbitoTipo] = useState<'EMPRESA' | 'SUPLIDOR'>('EMPRESA');
  const [ambitoId, setAmbitoId] = useState<number | ''>('');
  const [rol, setRol] = useState<string>('RRHH');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ultimoLink, setUltimoLink] = useState<string | null>(null);

  const { data: dataEmpresas } = useQuery({
    queryKey: ['bo-empresas'],
    queryFn: () => api<{ empresas: Empresa[] }>('/back-office/empresas'),
  });
  const { data: dataSuplidores } = useQuery({
    queryKey: ['bo-suplidores'],
    queryFn: () => api<{ suplidores: SuplidorBO[] }>('/back-office/suplidores'),
  });
  const { data: dataInv, isLoading } = useQuery({
    queryKey: ['bo-invitaciones'],
    queryFn: () => api<{ invitaciones: Invitacion[] }>('/invitaciones'),
  });

  const invitar = useMutation({
    mutationFn: () =>
      api<{ link: string }>('/invitaciones', {
        method: 'POST',
        body: { email: email.trim(), rol, ambitoTipo, ambitoId },
      }),
    onSuccess: (resp) => {
      setError(null);
      setUltimoLink(resp.link);
      setEmail('');
      queryClient.invalidateQueries({ queryKey: ['bo-invitaciones'] });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'No se pudo enviar la invitación.'),
  });

  const revocar = useMutation({
    mutationFn: (id: number) => api(`/invitaciones/${id}/revocar`, { method: 'PATCH' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bo-invitaciones'] }),
  });

  function cambiarAmbitoTipo(t: 'EMPRESA' | 'SUPLIDOR') {
    setAmbitoTipo(t);
    setAmbitoId('');
    setRol(t === 'EMPRESA' ? 'RRHH' : 'SUPLIDOR_ADMIN');
  }

  const invitaciones = dataInv?.invitaciones ?? [];

  return (
    <div>
      <h2>Usuarios</h2>
      <p className="sub">
        Invita a alguien de una empresa o suplidor a entrar a su propio portal — sin esto, una empresa nueva no
        tiene forma de que su RRHH acceda a la aplicación.
      </p>

      {error && <Aviso tipo="no">{error}</Aviso>}
      {ultimoLink && (
        <Aviso tipo="si">
          Invitación enviada. Si no hay servicio de correo configurado, copia el enlace: <br />
          <span className="mono text-[11.5px] break-all">{ultimoLink}</span>
        </Aviso>
      )}

      <div className="card mb-4" style={{ maxWidth: 480 }}>
        <h3>Nueva invitación</h3>
        <div className="campo">
          <label>Ámbito</label>
          <select value={ambitoTipo} onChange={(e) => cambiarAmbitoTipo(e.target.value as 'EMPRESA' | 'SUPLIDOR')}>
            <option value="EMPRESA">Empresa</option>
            <option value="SUPLIDOR">Suplidor</option>
          </select>
        </div>
        <div className="campo">
          <label>{ambitoTipo === 'EMPRESA' ? 'Empresa' : 'Suplidor'}</label>
          <select value={ambitoId} onChange={(e) => setAmbitoId(e.target.value ? Number(e.target.value) : '')}>
            <option value="">Elige uno…</option>
            {ambitoTipo === 'EMPRESA'
              ? (dataEmpresas?.empresas ?? []).map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombre}
                  </option>
                ))
              : (dataSuplidores?.suplidores ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
          </select>
        </div>
        {ambitoTipo === 'EMPRESA' && (
          <div className="campo">
            <label>Rol</label>
            <select value={rol} onChange={(e) => setRol(e.target.value)}>
              {ROLES_EMPRESA.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="campo">
          <label>Correo</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="persona@empresa.com" />
        </div>
        <button className="btn" disabled={!email.trim() || !ambitoId || invitar.isPending} onClick={() => invitar.mutate()}>
          {invitar.isPending ? 'Enviando…' : 'Enviar invitación'}
        </button>
      </div>

      <div className="card">
        <h3>Invitaciones</h3>
        {isLoading && <div className="text-sm text-muted">Cargando…</div>}
        {!isLoading && invitaciones.length === 0 && <div className="vacio">Sin invitaciones todavía.</div>}
        {invitaciones.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Correo</th>
                <th>Rol</th>
                <th>Enviada</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {invitaciones.map((i) => (
                <tr key={i.id}>
                  <td>{i.email}</td>
                  <td>{i.rol}</td>
                  <td className="text-[12px] text-muted">{fmtSello(i.creado_en)}</td>
                  <td>
                    <span className={`est e-${i.estado === 'ACEPTADA' ? 'ACTIVA' : 'INACTIVA'}`}>{i.estado}</span>
                  </td>
                  <td className="text-right">
                    {i.estado === 'PENDIENTE' && (
                      <button className="btn btn-sec btn-sm" disabled={revocar.isPending} onClick={() => revocar.mutate(i.id)}>
                        Revocar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
