import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../auth/AuthContext';
import { Aviso } from '../Aviso';
import { InvitarColaboradoresSeccion } from './InvitarColaboradoresSeccion';
import type { ImportarCsvResponse, PreviewCsvResponse } from '../../types';

import { BASE_URL } from '../../lib/base-url';

/**
 * Sprint 16: autoservicio de RRHH — mismo motor de validación que el
 * wizard de back office (Sprint 13), pero sin el paso de "datos de la
 * empresa" (RRHH ya tiene una, es la suya) y sin `:empresaId` en la URL
 * (`POST /colaboradores/preview` e `/importar`, ámbito EMPRESA — ver
 * plan-sprints.md, Sprint 16). Antes, esto solo lo podía hacer plataforma
 * desde el back office.
 */
export function ColaboradoresTab() {
  const { auth } = useAuth();
  const queryClient = useQueryClient();
  const [archivo, setArchivo] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewCsvResponse | null>(null);
  const [resultado, setResultado] = useState<ImportarCsvResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function subirParaPreview() {
    if (!archivo) return;
    setError(null);
    setCargando(true);
    try {
      const body = new FormData();
      body.append('file', archivo);
      const resp = await fetch(`${BASE_URL}/colaboradores/preview`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${auth?.token}` },
        body,
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.message ?? 'No se pudo previsualizar el archivo.');
      setPreview(data as PreviewCsvResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo previsualizar el archivo.');
    } finally {
      setCargando(false);
    }
  }

  async function confirmarImportacion() {
    if (!archivo) return;
    setError(null);
    setCargando(true);
    try {
      const body = new FormData();
      body.append('file', archivo);
      const resp = await fetch(`${BASE_URL}/colaboradores/importar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${auth?.token}` },
        body,
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.message ?? 'No se pudo importar.');
      setResultado(data as ImportarCsvResponse);
      queryClient.invalidateQueries({ queryKey: ['rrhh-colaboradores'] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo importar.');
    } finally {
      setCargando(false);
    }
  }

  function reiniciar() {
    setArchivo(null);
    setPreview(null);
    setResultado(null);
    setError(null);
  }

  return (
    <div>
      <h2>Cargar colaboradores</h2>
      <p className="sub">
        Sube el CSV de tus propios colaboradores sin depender de plataforma — mismas reglas de siempre: código de
        nómina y cédula obligatorios y únicos, un punto de entrega desconocido es alerta, no error.
      </p>

      {error && <Aviso tipo="no">{error}</Aviso>}

      {!preview && !resultado && (
        <div className="card" style={{ maxWidth: 560 }}>
          <h3>Elegir archivo</h3>
          <p className="text-[13px] text-muted mb-3">
            CSV con columnas: código de nómina, cédula, nombre completo, correo, punto de entrega y salario neto.
          </p>
          <input type="file" accept=".csv,text/csv" onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} />
          {archivo && (
            <div className="aviso aviso-si mt-2.5">
              Archivo elegido: <b>{archivo.name}</b>
            </div>
          )}
          <div className="mt-3.5">
            <button className="btn" disabled={!archivo || cargando} onClick={subirParaPreview}>
              {cargando ? 'Leyendo…' : 'Ver revisión de filas'}
            </button>
          </div>
        </div>
      )}

      {preview && !resultado && (
        <div>
          <div className="flex flex-wrap gap-2.5 mb-3.5">
            <Pill n={preview.totalFilas} l="filas leídas" />
            <Pill n={preview.limpias} l="listas sin observaciones" tono="ok" />
            <Pill n={preview.conAlerta} l="con alerta, se pueden importar" tono="warn" />
            <Pill n={preview.conError} l="con error, se excluyen" tono="err" />
          </div>

          <div className="card">
            <h3>Detalle de la carga</h3>
            <table className="w-full border-separate border-spacing-x-3 border-spacing-y-2 text-left">
              <thead>
                <tr>
                  <th className="pb-3 pr-3 text-[13px] font-semibold text-ink/80">Fila</th>
                  <th className="pb-3 pr-3 text-[13px] font-semibold text-ink/80">Código</th>
                  <th className="pb-3 pr-3 text-[13px] font-semibold text-ink/80">Nombre</th>
                  <th className="pb-3 pr-3 text-[13px] font-semibold text-ink/80">Cédula</th>
                  <th className="pb-3 pr-3 text-[13px] font-semibold text-ink/80">Punto de entrega</th>
                  <th className="pb-3 text-[13px] font-semibold text-ink/80">Estado</th>
                </tr>
              </thead>
              <tbody>
                {preview.filas.map((f) => {
                  const est = f.errores.length ? 'ERROR' : f.alertas.length ? 'ALERTA' : 'OK';
                  return (
                    <tr key={f.numeroFila}>
                      <td className="mono py-2 pr-3 align-top">{f.numeroFila}</td>
                      <td className="mono py-2 pr-3 align-top">{f.datos.codigo_nomina || '—'}</td>
                      <td className="py-2 pr-3 align-top break-words">
                        {f.datos.nombre_completo || <span className="text-granate">sin nombre</span>}
                      </td>
                      <td className="mono py-2 pr-3 align-top">{f.datos.cedula || '—'}</td>
                      <td className="py-2 pr-3 align-top break-words">{f.datos.punto_entrega || '—'}</td>
                      <td className="py-2 align-top">
                        <span className={`est e-${est}`}>{est}</span>
                        {f.errores.map((e, i) => (
                          <div key={i} className="text-[11px] text-granate mt-0.5">
                            {e}
                          </div>
                        ))}
                        {f.alertas.map((a, i) => (
                          <div key={i} className="text-[11px] text-ambar mt-0.5">
                            {a}
                          </div>
                        ))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {preview.conError > 0 && (
              <Aviso tipo="no">
                {preview.conError} fila(s) no se importarán por errores de datos. Corrige el archivo original y
                vuelve a cargarlo si quieres incluirlas — no bloquean el resto de la importación.
              </Aviso>
            )}
            {preview.conAlerta > 0 && (
              <Aviso tipo="at">
                {preview.conAlerta} fila(s) tienen un punto de entrega que no coincide con los configurados. Se
                importarán, pero quedarán sin punto asignado hasta que alguien lo corrija.
              </Aviso>
            )}

            <div className="flex gap-1.5 mt-4">
              <button className="btn btn-ok" disabled={!preview.importables || cargando} onClick={confirmarImportacion}>
                {cargando ? 'Importando…' : `Importar ${preview.importables} colaborador(es)`}
              </button>
              <button className="btn btn-sec" onClick={reiniciar}>
                Volver a cargar archivo
              </button>
            </div>
          </div>
        </div>
      )}

      {resultado && (
        <div className="card">
          <Aviso tipo="si">
            {resultado.importados} colaborador(es) importado(s) correctamente en tu empresa.
          </Aviso>
          <button className="btn mt-3" onClick={reiniciar}>
            Cargar otro archivo
          </button>
        </div>
      )}

      <InvitarColaboradoresSeccion />
    </div>
  );
}

function Pill({ n, l, tono }: { n: number; l: string; tono?: 'ok' | 'warn' | 'err' }) {
  const color = tono === 'ok' ? 'text-verde' : tono === 'warn' ? 'text-ambar' : tono === 'err' ? 'text-granate' : '';
  return (
    <div className="border border-rule rounded px-3 py-2 text-center min-w-[110px]">
      <div className={`mono text-[20px] font-medium ${color}`}>{n}</div>
      <div className="text-[11px] text-muted">{l}</div>
    </div>
  );
}
