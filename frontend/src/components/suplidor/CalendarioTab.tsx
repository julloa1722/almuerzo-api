import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../../lib/useApi';
import { ApiError } from '../../lib/api';
import { fmtCorto, fmtFecha } from '../../lib/fechas';
import { Aviso } from '../Aviso';
import { PreparacionSeccion } from './PreparacionSeccion';
import type { MenuCalendarioResponse } from '../../types';

export function CalendarioTab() {
  const api = useApi();
  const queryClient = useQueryClient();
  const [fechaSel, setFechaSel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['catalogo-menu'],
    queryFn: () => api<MenuCalendarioResponse>('/catalogo/menu'),
  });

  const invalidarMenu = () => queryClient.invalidateQueries({ queryKey: ['catalogo-menu'] });

  const publicar = useMutation({
    mutationFn: () => api<{ diasPublicados: number }>('/catalogo/menu/publicar', { method: 'POST', body: { dias: 10 } }),
    onSuccess: invalidarMenu,
  });

  const editarItem = useMutation({
    mutationFn: ({ id, cambios }: { id: number; cambios: { precio?: number; cupo?: number; activo?: boolean } }) =>
      api(`/catalogo/menu/${id}`, { method: 'PATCH', body: cambios }),
    onSuccess: invalidarMenu,
    onError: (err) => setError(err instanceof ApiError ? err.message : 'No se pudo guardar — revisa si el día ya se congeló.'),
  });

  const fechas = Object.keys(data?.menu ?? {}).sort();
  const fechaActiva = fechaSel && fechas.includes(fechaSel) ? fechaSel : fechas[0] ?? null;
  const diaActivo = fechaActiva ? data?.menu[fechaActiva] : null;
  const bloqueado = diaActivo?.estado === 'CONGELADO';

  return (
    <div>
      <h2>Calendario y publicación</h2>
      <p className="sub">
        Publicar aplica la plantilla semanal a cada fecha futura hábil y crea su menú del día. Al vencer el cutoff
        de una fecha, ese día se congela — precio y cupo dejan de poder editarse porque ya hay pedidos que copiaron
        esos valores.
      </p>

      <div className="flex justify-end mb-3.5">
        <button className="btn btn-ok" disabled={publicar.isPending} onClick={() => publicar.mutate()}>
          {publicar.isPending ? 'Publicando…' : 'Publicar próximos 10 días hábiles'}
        </button>
      </div>

      {isLoading && <div className="text-sm text-muted">Cargando…</div>}
      {!isLoading && fechas.length === 0 && (
        <Aviso tipo="at">Todavía no hay ningún día publicado. Usa el botón de arriba — lee la plantilla semanal.</Aviso>
      )}

      <div className="grid gap-2 mb-5" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))' }}>
        {fechas.map((f) => {
          const dia = data!.menu[f];
          return (
            <div
              key={f}
              className={`border rounded p-2.5 cursor-pointer ${f === fechaActiva ? 'border-ink bg-paper' : 'border-rule'}`}
              onClick={() => setFechaSel(f)}
            >
              <div className="font-medium text-[13px] capitalize">{fmtFecha(f).split(' ').slice(0, 1)} {fmtCorto(f)}</div>
              <div className={`est-dia est-dia-${dia.estado} mt-1.5`}>{dia.estado}</div>
            </div>
          );
        })}
      </div>

      {error && <Aviso tipo="no">{error}</Aviso>}

      {fechaActiva && diaActivo && (
        <div className="card">
          <h3>
            {fmtFecha(fechaActiva)}
            <span className={`est-dia est-dia-${diaActivo.estado} ml-2`}>{diaActivo.estado}</span>
          </h3>
          <table>
            <thead>
              <tr>
                <th>Plato</th>
                <th className="num">Precio</th>
                <th className="num">Cupo</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {diaActivo.items.map((it) => (
                <tr key={it.id}>
                  <td>{it.producto_nombre}</td>
                  <td className="num">
                    <input
                      type="number"
                      className="w-20 text-right border border-rule rounded px-1.5 py-0.5 mono text-xs"
                      defaultValue={it.precio}
                      disabled={bloqueado}
                      onBlur={(e) => Number(e.target.value) !== Number(it.precio) && editarItem.mutate({ id: it.id, cambios: { precio: Number(e.target.value) } })}
                    />
                  </td>
                  <td className="num">
                    <input
                      type="number"
                      className="w-14 text-right border border-rule rounded px-1.5 py-0.5 mono text-xs"
                      defaultValue={it.cupo_max ?? ''}
                      disabled={bloqueado}
                      onBlur={(e) => Number(e.target.value) !== Number(it.cupo_max) && editarItem.mutate({ id: it.id, cambios: { cupo: Number(e.target.value) } })}
                    />
                  </td>
                  <td>
                    <span className={`est-dia ${it.activo ? 'est-dia-ACTIVO' : 'est-dia-INACTIVO'}`}>
                      {it.activo ? 'disponible' : 'retirado'}
                    </span>
                    <div className="text-[11px] text-muted mt-0.5">{it.cupo_usado} ya pedidos</div>
                  </td>
                  <td className="text-right">
                    {!bloqueado ? (
                      <button className="btn btn-sec btn-sm" onClick={() => editarItem.mutate({ id: it.id, cambios: { activo: !it.activo } })}>
                        {it.activo ? 'Retirar' : 'Reactivar'}
                      </button>
                    ) : (
                      <span className="text-[11px] text-muted">sin cambios</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {bloqueado ? (
            <Aviso tipo="no">
              Este día ya pasó su cutoff. Ya existen pedidos con estos precios — no se puede editar desde aquí.
            </Aviso>
          ) : (
            <Aviso tipo="at">Puedes retirar un plato puntual (por ejemplo, si se agotó un insumo) sin tocar la plantilla base.</Aviso>
          )}
        </div>
      )}

      <PreparacionSeccion fecha={fechaActiva} />
    </div>
  );
}
