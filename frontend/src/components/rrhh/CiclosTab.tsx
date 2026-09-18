import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../auth/AuthContext';
import { useApi } from '../../lib/useApi';
import { ApiError } from '../../lib/api';
import { fmtCorto, fmtSello, formatoRD } from '../../lib/fechas';
import { Aviso } from '../Aviso';
import type { CampoDisponible, CampoPlantilla, Ciclo, Movimiento } from '../../types';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

/**
 * Sprint 12, subsprint 12.4. "Enviar a nómina" (discrepancia 2 del plan):
 * el backend nunca envía nada a un sistema externo — el botón dispara la
 * descarga del CSV ya generado por la API, para pegar a mano.
 */
export function CiclosTab() {
  const api = useApi();
  const { auth } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [descargando, setDescargando] = useState<number | null>(null);

  const { data: dataCiclos, isLoading: cargandoCiclos } = useQuery({
    queryKey: ['rrhh-ciclos'],
    queryFn: () => api<{ ciclos: Ciclo[] }>('/nomina/ciclos'),
  });
  const { data: dataMovs, isLoading: cargandoMovs } = useQuery({
    queryKey: ['rrhh-movimientos'],
    queryFn: () => api<{ movimientos: Movimiento[] }>('/nomina/movimientos'),
  });
  const { data: dataPlantilla } = useQuery({
    queryKey: ['rrhh-plantilla'],
    queryFn: () => api<{ campos: CampoPlantilla[]; catalogoDisponible: CampoDisponible[] }>('/nomina/plantilla-descuento'),
  });

  const invalidarCiclos = () => queryClient.invalidateQueries({ queryKey: ['rrhh-ciclos'] });

  const cerrar = useMutation({
    mutationFn: () => api('/nomina/ciclos/cerrar', { method: 'POST', body: {} }),
    onSuccess: () => {
      setError(null);
      invalidarCiclos();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'No se pudo cerrar el ciclo.'),
  });

  const guardarPlantilla = useMutation({
    mutationFn: (campos: CampoPlantilla[]) => api('/nomina/plantilla-descuento', { method: 'PUT', body: { campos } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rrhh-plantilla'] }),
    onError: (err) => alert(err instanceof ApiError ? err.message : 'No se pudo guardar la plantilla.'),
  });

  async function descargarArchivo(ciclo: Ciclo) {
    setDescargando(ciclo.id);
    setError(null);
    try {
      const resp = await fetch(`${BASE_URL}/nomina/ciclos/${ciclo.id}/archivo-descuento`, {
        headers: { Authorization: `Bearer ${auth?.token}` },
      });
      if (!resp.ok) throw new Error('No se pudo generar el archivo.');
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `descuento_${ciclo.periodo_inicio.slice(0, 10)}_${ciclo.periodo_fin.slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('No se pudo descargar el archivo de descuento.');
    } finally {
      setDescargando(null);
    }
  }

  function toggleCampo(campo: string) {
    const actuales = dataPlantilla?.campos ?? [];
    const yaEsta = actuales.some((c) => c.campo === campo);
    const nuevos = yaEsta ? actuales.filter((c) => c.campo !== campo) : [...actuales, { campo }];
    if (nuevos.length === 0) return;
    guardarPlantilla.mutate(nuevos);
  }

  const ciclos = dataCiclos?.ciclos ?? [];
  const movimientos = dataMovs?.movimientos ?? [];
  const campos = dataPlantilla?.campos ?? [];
  const catalogo = dataPlantilla?.catalogoDisponible ?? [];

  return (
    <div>
      <h2>Ciclos y libro mayor</h2>
      <p className="sub">
        El libro mayor es append-only — los cargos se generan al confirmar la recepción, nunca se editan. Una
        corrección posterior es siempre una fila nueva.
      </p>

      {error && <Aviso tipo="no">{error}</Aviso>}

      <div className="grid g2">
        <div className="card">
          <h3>Ciclos</h3>
          {cargandoCiclos && <div className="text-sm text-muted">Cargando…</div>}
          {!cargandoCiclos && ciclos.length === 0 && <div className="vacio">Sin ciclos todavía.</div>}
          {ciclos.map((c) => (
            <div key={c.id} className="border border-rule rounded p-3 mb-2.5">
              <div className="flex justify-between items-center gap-2.5 mb-2">
                <div>
                  <b>
                    {fmtCorto(c.periodo_inicio.slice(0, 10))} – {fmtCorto(c.periodo_fin.slice(0, 10))}
                  </b>
                  {c.cerrado_en && <div className="text-[11.5px] text-muted mono">cerrado {fmtSello(c.cerrado_en)}</div>}
                </div>
                <span className={`est e-${c.estado}`}>{c.estado}</span>
              </div>
              <div className="flex gap-1.5">
                {c.estado === 'ABIERTO' && (
                  <button className="btn btn-sec btn-sm" disabled={cerrar.isPending} onClick={() => cerrar.mutate()}>
                    {cerrar.isPending ? 'Cerrando…' : 'Cerrar ahora'}
                  </button>
                )}
                {c.estado === 'CERRADO' && (
                  <button className="btn btn-sm" disabled={descargando === c.id} onClick={() => descargarArchivo(c)}>
                    {descargando === c.id ? 'Generando…' : 'Descargar archivo de descuento'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="card">
          <h3>Libro mayor</h3>
          {cargandoMovs && <div className="text-sm text-muted">Cargando…</div>}
          {!cargandoMovs && movimientos.length === 0 && (
            <div className="vacio">Sin movimientos. Los cargos se generan al confirmar la recepción.</div>
          )}
          {movimientos.length > 0 && (
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Sello</th>
                  <th>Colaborador</th>
                  <th>Concepto</th>
                  <th className="num">Monto</th>
                </tr>
              </thead>
              <tbody>
                {movimientos.slice(0, 18).map((m) => (
                  <tr key={m.id}>
                    <td className="mono">{m.id}</td>
                    <td className="mono text-[11.5px]">{fmtSello(m.creado_en)}</td>
                    <td>{m.colaborador}</td>
                    <td>{m.motivo ?? (m.pedido_id ? `Pedido #${m.pedido_id}` : '—')}</td>
                    <td className={`num ${m.tipo === 'NOTA_CREDITO' ? 'neg' : ''}`}>
                      {m.tipo === 'NOTA_CREDITO' ? '−' : ''}
                      {formatoRD(Number(m.monto))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="card mt-4">
        <h3>Plantilla del archivo de descuento</h3>
        <p className="text-[13px] text-muted mb-2.5">
          Elige qué columnas incluye el CSV y en qué orden. Sin fórmulas ni SQL libre — solo campos de este catálogo.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {catalogo.map((c) => {
            const activo = campos.some((x) => x.campo === c.clave);
            const posicion = campos.findIndex((x) => x.campo === c.clave);
            return (
              <button
                key={c.clave}
                className={`text-[12px] border rounded-full px-2.5 py-0.5 ${
                  activo ? 'bg-ink border-ink text-white' : 'bg-paper border-rule text-muted'
                }`}
                disabled={guardarPlantilla.isPending}
                onClick={() => toggleCampo(c.clave)}
              >
                {activo ? `${posicion + 1}. ` : ''}
                {c.etiquetaDefault}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
