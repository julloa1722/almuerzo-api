import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../../lib/useApi';
import { ApiError } from '../../lib/api';
import { fmtCorto } from '../../lib/fechas';
import { Aviso } from '../Aviso';
import type { Asignacion, Colaborador, Programa } from '../../types';

const TIPOS_SUBSIDIO = [
  { valor: 'MONTO_FIJO', etiqueta: 'Monto fijo por almuerzo' },
  { valor: 'PORCENTAJE', etiqueta: 'Porcentaje del precio' },
  { valor: 'TOTAL', etiqueta: 'Cobertura total' },
] as const;

/**
 * Sprint 12, subsprint 12.5. Sin mockup de referencia — cierra el gap
 * documentado desde el Sprint 9: sin esto, una empresa nueva no tiene
 * forma de que ninguno de sus colaboradores pueda pedir almuerzo.
 */
export function ProgramasTab() {
  const api = useApi();
  const queryClient = useQueryClient();
  const [nuevo, setNuevo] = useState(false);
  const [form, setForm] = useState({ nombre: '', tipoSubsidio: 'MONTO_FIJO' as string, valorSubsidio: '250' });
  const [error, setError] = useState<string | null>(null);
  const [expandido, setExpandido] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['rrhh-programas'],
    queryFn: () => api<{ programas: Programa[] }>('/programas'),
  });
  const { data: dataColabs } = useQuery({
    queryKey: ['rrhh-colaboradores'],
    queryFn: () => api<{ colaboradores: Colaborador[] }>('/colaboradores'),
  });

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ['rrhh-programas'] });

  const crear = useMutation({
    mutationFn: () =>
      api('/programas', {
        method: 'POST',
        body: { nombre: form.nombre, tipoSubsidio: form.tipoSubsidio, valorSubsidio: Number(form.valorSubsidio) },
      }),
    onSuccess: () => {
      invalidar();
      setNuevo(false);
      setForm({ nombre: '', tipoSubsidio: 'MONTO_FIJO', valorSubsidio: '250' });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'No se pudo crear el programa.'),
  });

  const editar = useMutation({
    mutationFn: ({ id, cambios }: { id: number; cambios: Partial<Programa> }) =>
      api(`/programas/${id}`, { method: 'PATCH', body: cambios }),
    onSuccess: invalidar,
    onError: (err) => setError(err instanceof ApiError ? err.message : 'No se pudo guardar el cambio.'),
  });

  const programas = data?.programas ?? [];
  const colaboradores = dataColabs?.colaboradores ?? [];

  return (
    <div>
      <h2>Programas de beneficio</h2>
      <p className="sub">
        Un colaborador solo puede pedir almuerzo mientras tenga un programa vigente asignado — sin esto, una empresa
        nueva no tiene forma de que nadie pida.
      </p>

      {error && <Aviso tipo="no">{error}</Aviso>}

      <div className="flex justify-end mb-3">
        <button className="btn btn-sm" onClick={() => setNuevo((v) => !v)}>
          {nuevo ? 'Cancelar' : 'Crear programa'}
        </button>
      </div>

      {nuevo && (
        <div className="card mb-4">
          <h3>Nuevo programa</h3>
          <div className="campo">
            <label>Nombre</label>
            <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          </div>
          <div className="fila">
            <div className="campo">
              <label>Tipo de subsidio</label>
              <select value={form.tipoSubsidio} onChange={(e) => setForm({ ...form, tipoSubsidio: e.target.value })}>
                {TIPOS_SUBSIDIO.map((t) => (
                  <option key={t.valor} value={t.valor}>
                    {t.etiqueta}
                  </option>
                ))}
              </select>
            </div>
            <div className="campo">
              <label>{form.tipoSubsidio === 'PORCENTAJE' ? 'Porcentaje (%)' : 'Monto (RD$)'}</label>
              <input
                type="number"
                value={form.valorSubsidio}
                onChange={(e) => setForm({ ...form, valorSubsidio: e.target.value })}
                disabled={form.tipoSubsidio === 'TOTAL'}
              />
            </div>
          </div>
          <button
            className="btn btn-ok"
            disabled={!form.nombre.trim() || crear.isPending}
            onClick={() => crear.mutate()}
          >
            {crear.isPending ? 'Creando…' : 'Crear programa'}
          </button>
        </div>
      )}

      {isLoading && <div className="text-sm text-muted">Cargando…</div>}
      {!isLoading && programas.length === 0 && (
        <Aviso tipo="at">Esta empresa todavía no tiene ningún programa de beneficio — nadie puede pedir hasta crear uno.</Aviso>
      )}

      {programas.map((p) => (
        <div key={p.id} className={`card mb-3 ${p.estado === 'INACTIVO' ? 'opacity-50' : ''}`}>
          <div className="flex justify-between items-start gap-2.5">
            <div>
              <h3>{p.nombre}</h3>
              <div className="text-[12.5px] text-muted">
                {TIPOS_SUBSIDIO.find((t) => t.valor === p.tipo_subsidio)?.etiqueta}
                {p.tipo_subsidio !== 'TOTAL' && (
                  <>
                    {' · '}
                    {p.tipo_subsidio === 'PORCENTAJE' ? `${Number(p.valor_subsidio)}%` : `RD$ ${Number(p.valor_subsidio)}`}
                  </>
                )}
              </div>
            </div>
            <div className="flex gap-1.5 flex-none">
              <button
                className="btn btn-sec btn-sm"
                onClick={() => editar.mutate({ id: p.id, cambios: { estado: p.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO' } })}
              >
                {p.estado === 'ACTIVO' ? 'Desactivar' : 'Activar'}
              </button>
              <button className="btn btn-sec btn-sm" onClick={() => setExpandido(expandido === p.id ? null : p.id)}>
                {expandido === p.id ? 'Ocultar asignados' : 'Ver asignados'}
              </button>
            </div>
          </div>

          {expandido === p.id && <AsignacionesDe programa={p} colaboradores={colaboradores} />}
        </div>
      ))}
    </div>
  );
}

function AsignacionesDe({ programa, colaboradores }: { programa: Programa; colaboradores: Colaborador[] }) {
  const api = useApi();
  const queryClient = useQueryClient();
  const [colaboradorId, setColaboradorId] = useState<number | ''>('');
  const [vigenteDesde, setVigenteDesde] = useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['rrhh-asignaciones', programa.id],
    queryFn: () => api<{ asignaciones: Asignacion[] }>(`/programas/${programa.id}/asignaciones`),
  });

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ['rrhh-asignaciones', programa.id] });

  const asignar = useMutation({
    mutationFn: () =>
      api(`/programas/${programa.id}/asignaciones`, {
        method: 'POST',
        body: { colaboradorId, vigenteDesde },
      }),
    onSuccess: () => {
      setError(null);
      invalidar();
      setColaboradorId('');
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'No se pudo asignar.'),
  });

  const finalizar = useMutation({
    mutationFn: (asignacionId: number) =>
      api(`/programas/${programa.id}/asignaciones/${asignacionId}`, {
        method: 'PATCH',
        body: { vigenteHasta: new Date().toISOString().slice(0, 10) },
      }),
    onSuccess: invalidar,
    onError: (err) => setError(err instanceof ApiError ? err.message : 'No se pudo finalizar la asignación.'),
  });

  const asignaciones = data?.asignaciones ?? [];
  const vigentes = asignaciones.filter((a) => !a.vigente_hasta || a.vigente_hasta.slice(0, 10) >= new Date().toISOString().slice(0, 10));

  return (
    <div className="mt-3.5 pt-3.5 border-t border-rule-2">
      {error && <Aviso tipo="no">{error}</Aviso>}
      {isLoading && <div className="text-sm text-muted">Cargando…</div>}

      {asignaciones.length === 0 && !isLoading && (
        <div className="text-[13px] text-muted mb-2.5">Ningún colaborador tiene este programa asignado todavía.</div>
      )}

      {asignaciones.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Colaborador</th>
              <th>Vigente desde</th>
              <th>Vigente hasta</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {asignaciones.map((a) => {
              const vigente = vigentes.some((v) => v.id === a.id);
              return (
                <tr key={a.id}>
                  <td>{a.colaborador}</td>
                  <td className="mono text-[12px]">{fmtCorto(a.vigente_desde.slice(0, 10))}</td>
                  <td className="mono text-[12px]">{a.vigente_hasta ? fmtCorto(a.vigente_hasta.slice(0, 10)) : '— (indefinido)'}</td>
                  <td className="text-right">
                    {vigente && (
                      <button className="btn btn-sec btn-sm" disabled={finalizar.isPending} onClick={() => finalizar.mutate(a.id)}>
                        Finalizar hoy
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <div className="flex gap-1.5 items-end mt-3">
        <div className="campo !mb-0">
          <label>Asignar a</label>
          <select value={colaboradorId} onChange={(e) => setColaboradorId(e.target.value ? Number(e.target.value) : '')}>
            <option value="">Elige un colaborador…</option>
            {colaboradores.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre_completo}
              </option>
            ))}
          </select>
        </div>
        <div className="campo !mb-0">
          <label>Desde</label>
          <input type="date" value={vigenteDesde} onChange={(e) => setVigenteDesde(e.target.value)} />
        </div>
        <button className="btn btn-sm" disabled={!colaboradorId || asignar.isPending} onClick={() => asignar.mutate()}>
          {asignar.isPending ? 'Asignando…' : 'Asignar'}
        </button>
      </div>
      <div className="text-[11.5px] text-muted mt-1.5">
        Si el colaborador ya tiene otro programa vigente que se solape con estas fechas, la API lo rechaza — finalízalo
        primero.
      </div>
    </div>
  );
}
