import { useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { useApi } from '../../lib/useApi';
import { ApiError } from '../../lib/api';
import { Aviso } from '../Aviso';
import type { Empresa, ImportarCsvResponse, PreviewCsvResponse } from '../../types';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
const RNC_RE = /^\d{3}-?\d{5,8}-?\d?$/;

const PASOS = [
  { n: 1, t: 'Datos de la empresa' },
  { n: 2, t: 'Cargar colaboradores' },
  { n: 3, t: 'Revisar e importar' },
] as const;

/**
 * Sprint 13, subsprint 13.3. A diferencia del mockup (que simula la carga
 * con un clic), este wizard sube un archivo CSV real — el backend ya
 * soporta multipart/form-data desde el Sprint 2. La subida se hace con
 * `fetch` directo (no `useApi`) porque el body es `FormData`, no JSON.
 */
export function OnboardingWizard({
  onTerminado,
  onCancelar,
  nombreInicial,
  rncInicial,
  leadId,
}: {
  onTerminado: () => void;
  onCancelar: () => void;
  /** Sprint 17: prellenado al llegar desde "Crear empresa desde este lead". */
  nombreInicial?: string;
  rncInicial?: string;
  leadId?: number;
}) {
  const api = useApi();
  const { auth } = useAuth();
  const [paso, setPaso] = useState<1 | 2 | 3>(1);
  const [empresaId, setEmpresaId] = useState<number | null>(null);
  const [form, setForm] = useState({
    nombre: nombreInicial ?? '',
    rnc: rncInicial ?? '',
    frecuenciaNomina: 'QUINCENAL' as 'QUINCENAL' | 'MENSUAL',
  });
  const [archivo, setArchivo] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewCsvResponse | null>(null);
  const [resultado, setResultado] = useState<ImportarCsvResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const datosOk = form.nombre.trim().length > 0 && RNC_RE.test(form.rnc.trim());

  async function crearEmpresa() {
    setError(null);
    setCargando(true);
    try {
      const empresa = await api<Empresa>('/back-office/empresas', { method: 'POST', body: form });
      setEmpresaId(empresa.id);
      setPaso(2);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo crear la empresa.');
    } finally {
      setCargando(false);
    }
  }

  async function subirParaPreview() {
    if (!archivo || !empresaId) return;
    setError(null);
    setCargando(true);
    try {
      const body = new FormData();
      body.append('file', archivo);
      const resp = await fetch(`${BASE_URL}/back-office/empresas/${empresaId}/colaboradores/preview`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${auth?.token}` },
        body,
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.message ?? 'No se pudo previsualizar el archivo.');
      setPreview(data as PreviewCsvResponse);
      setPaso(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo previsualizar el archivo.');
    } finally {
      setCargando(false);
    }
  }

  async function confirmarImportacion() {
    if (!archivo || !empresaId) return;
    setError(null);
    setCargando(true);
    try {
      const body = new FormData();
      body.append('file', archivo);
      const resp = await fetch(`${BASE_URL}/back-office/empresas/${empresaId}/colaboradores/importar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${auth?.token}` },
        body,
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.message ?? 'No se pudo importar.');
      setResultado(data as ImportarCsvResponse);

      // Sprint 17: si se llegó desde "Crear empresa desde este lead", el
      // lead queda CONVERTIDO al confirmar la importación — no antes, para
      // que coincida exactamente con el criterio de cierre documentado.
      // Falla silenciosa a propósito: no bloquea la pantalla de éxito del
      // wizard si esta llamada falla, el back office puede convertirlo a
      // mano después desde la bandeja.
      if (leadId) {
        try {
          await api(`/back-office/leads/${leadId}/convertido`, { method: 'PATCH', body: { empresaId } });
        } catch {
          // silencioso, ver comentario arriba
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo importar.');
    } finally {
      setCargando(false);
    }
  }

  return (
    <div>
      <h2>Alta de empresa nueva</h2>
      <p className="sub">
        Tres pasos: datos de la empresa, carga del CSV de colaboradores, y revisión fila por fila antes de confirmar.
        Nada se importa hasta el paso 3.
      </p>

      <div className="flex gap-4 mb-4 text-[13px]">
        {PASOS.map((p) => (
          <div key={p.n} className={`flex items-center gap-1.5 ${paso === p.n ? 'font-semibold' : 'text-muted'}`}>
            <span className="mono">{paso > p.n ? '✓' : p.n}</span>
            {p.t}
          </div>
        ))}
      </div>

      {error && <Aviso tipo="no">{error}</Aviso>}

      {paso === 1 && (
        <div className="card" style={{ maxWidth: 480 }}>
          <h3>Datos de la empresa</h3>
          <div className="campo">
            <label>Razón social</label>
            <input
              value={form.nombre}
              placeholder="Ej. Futuro ARS"
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            />
          </div>
          <div className="campo">
            <label>RNC</label>
            <input
              value={form.rnc}
              placeholder="000-00000-0"
              onChange={(e) => setForm({ ...form, rnc: e.target.value })}
            />
            {form.rnc && !RNC_RE.test(form.rnc.trim()) && (
              <div className="text-[11.5px] text-granate mt-1">Formato de RNC no reconocido.</div>
            )}
          </div>
          <div className="campo">
            <label>Frecuencia de nómina</label>
            <select
              value={form.frecuenciaNomina}
              onChange={(e) => setForm({ ...form, frecuenciaNomina: e.target.value as 'QUINCENAL' | 'MENSUAL' })}
            >
              <option value="QUINCENAL">Quincenal</option>
              <option value="MENSUAL">Mensual</option>
            </select>
          </div>
          <div className="flex gap-1.5">
            <button className="btn" disabled={!datosOk || cargando} onClick={crearEmpresa}>
              {cargando ? 'Creando…' : 'Continuar'}
            </button>
            <button className="btn btn-sec" onClick={onCancelar}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {paso === 2 && (
        <div className="card" style={{ maxWidth: 560 }}>
          <h3>Cargar colaboradores</h3>
          <p className="text-[13px] text-muted mb-3">
            Archivo CSV con columnas: código de nómina, cédula, nombre completo, correo, punto de entrega y salario
            neto (para el límite de endeudamiento).
          </p>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
          />
          {archivo && (
            <div className="aviso aviso-si mt-2.5">
              Archivo elegido: <b>{archivo.name}</b>
            </div>
          )}
          <div className="flex gap-1.5 mt-3.5">
            <button className="btn" disabled={!archivo || cargando} onClick={subirParaPreview}>
              {cargando ? 'Leyendo…' : 'Ver revisión de filas'}
            </button>
            <button className="btn btn-sec" onClick={() => setPaso(1)}>
              Volver
            </button>
          </div>
        </div>
      )}

      {paso === 3 && preview && !resultado && (
        <div>
          <div className="flex flex-wrap gap-2.5 mb-3.5">
            <Pill n={preview.totalFilas} l="filas leídas" />
            <Pill n={preview.limpias} l="listas sin observaciones" tono="ok" />
            <Pill n={preview.conAlerta} l="con alerta, se pueden importar" tono="warn" />
            <Pill n={preview.conError} l="con error, se excluyen" tono="err" />
          </div>

          <div className="card">
            <h3>Detalle de la carga</h3>
            <table>
              <thead>
                <tr>
                  <th>Fila</th>
                  <th>Código</th>
                  <th>Nombre</th>
                  <th>Cédula</th>
                  <th>Punto de entrega</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {preview.filas.map((f) => {
                  const est = f.errores.length ? 'ERROR' : f.alertas.length ? 'ALERTA' : 'OK';
                  return (
                    <tr key={f.numeroFila}>
                      <td className="mono">{f.numeroFila}</td>
                      <td className="mono">{f.datos.codigo_nomina || '—'}</td>
                      <td>{f.datos.nombre_completo || <span className="text-granate">sin nombre</span>}</td>
                      <td className="mono">{f.datos.cedula || '—'}</td>
                      <td>{f.datos.punto_entrega || '—'}</td>
                      <td>
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
              <button
                className="btn btn-sec"
                onClick={() => {
                  setPreview(null);
                  setArchivo(null);
                  setPaso(2);
                }}
              >
                Volver a cargar archivo
              </button>
            </div>
          </div>
        </div>
      )}

      {resultado && (
        <div className="card">
          <Aviso tipo="si">
            {resultado.importados} colaborador(es) importado(s) correctamente en la empresa recién creada.
          </Aviso>
          <button className="btn mt-3" onClick={onTerminado}>
            Volver a la lista de empresas
          </button>
        </div>
      )}
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
