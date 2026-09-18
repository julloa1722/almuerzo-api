import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../../lib/useApi';
import { ApiError } from '../../lib/api';
import { Aviso } from '../Aviso';
import type { Producto } from '../../types';

const ETIQUETAS_DISPONIBLES = ['vegetariano', 'sin gluten', 'picante', 'bajo en sodio'];
const CATEGORIAS = ['Plato fuerte', 'Vegetariano', 'Ligero', 'Sopa', 'Premium', 'Postre'];
const COLORES = ['#2D6A4F', '#B06C05', '#1F4E79', '#9B2C2C', '#534AB7', '#993556'];

function colorDe(id: number): string {
  return COLORES[id % COLORES.length];
}

function FotoOColor({ p }: { p: Producto }) {
  if (p.imagen_url) {
    return <img src={p.imagen_url} alt="" className="w-16 h-16 rounded object-cover flex-none" />;
  }
  const inicial = p.nombre.trim().slice(0, 2).toUpperCase();
  return (
    <div
      className="w-16 h-16 rounded flex-none flex items-center justify-center mono text-[11px] font-semibold text-white"
      style={{ background: colorDe(p.id) }}
    >
      {inicial}
    </div>
  );
}

/**
 * Sprint 11, discrepancia 1: sin subida real de archivo — `imagenUrl` es
 * un campo de texto opcional (pegar una URL). Sin foto, color por id, como
 * el mockup.
 */
export function CatalogoTab() {
  const api = useApi();
  const queryClient = useQueryClient();
  const [nuevo, setNuevo] = useState(false);
  const [form, setForm] = useState({ sku: '', nombre: '', descripcion: '', categoria: CATEGORIAS[0] });
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['catalogo-productos'],
    queryFn: () => api<{ productos: Producto[] }>('/catalogo/productos'),
  });

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ['catalogo-productos'] });

  const editar = useMutation({
    mutationFn: ({ id, cambios }: { id: number; cambios: Partial<Producto> & { imagenUrl?: string } }) =>
      api(`/catalogo/productos/${id}`, { method: 'PATCH', body: cambios }),
    onSuccess: invalidar,
    onError: (err) => setError(err instanceof ApiError ? err.message : 'No se pudo guardar el cambio.'),
  });

  const crear = useMutation({
    mutationFn: () => api('/catalogo/productos', { method: 'POST', body: form }),
    onSuccess: () => {
      invalidar();
      setNuevo(false);
      setForm({ sku: '', nombre: '', descripcion: '', categoria: CATEGORIAS[0] });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'No se pudo crear el plato.'),
  });

  function toggleEtiqueta(p: Producto, et: string) {
    const etiquetas = p.etiquetas.includes(et) ? p.etiquetas.filter((e) => e !== et) : [...p.etiquetas, et];
    editar.mutate({ id: p.id, cambios: { etiquetas } });
  }

  const productos = data?.productos ?? [];

  return (
    <div>
      <h2>Catálogo de platos</h2>
      <p className="sub">
        El catálogo es permanente: cada plato se crea una vez y se reutiliza en la plantilla semanal. Cambiar el
        precio o el nombre aquí no afecta pedidos ya confirmados.
      </p>

      <div className="flex justify-end mb-3">
        <button className="btn btn-sm" onClick={() => setNuevo((v) => !v)}>
          {nuevo ? 'Cancelar' : 'Agregar plato'}
        </button>
      </div>

      {error && <Aviso tipo="no">{error}</Aviso>}

      {nuevo && (
        <div className="card mb-4">
          <h3>Nuevo plato</h3>
          <div className="fila">
            <div className="campo">
              <label>SKU</label>
              <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            </div>
            <div className="campo">
              <label>Nombre</label>
              <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            </div>
          </div>
          <div className="campo">
            <label>Descripción</label>
            <input value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
          </div>
          <div className="campo">
            <label>Categoría</label>
            <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
              {CATEGORIAS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <button className="btn btn-ok" disabled={!form.sku || !form.nombre || crear.isPending} onClick={() => crear.mutate()}>
            {crear.isPending ? 'Creando…' : 'Crear plato'}
          </button>
        </div>
      )}

      {isLoading && <div className="text-sm text-muted">Cargando…</div>}

      {productos.map((p) => (
        <div key={p.id} className={`prod flex gap-3 mb-2.5 p-3 border border-rule rounded ${p.estado === 'INACTIVO' ? 'opacity-50' : ''}`}>
          <FotoOColor p={p} />
          <div className="flex-1 min-w-0">
            <div className="fila mb-1.5">
              <input
                className="!font-medium"
                defaultValue={p.nombre}
                onBlur={(e) => e.target.value !== p.nombre && editar.mutate({ id: p.id, cambios: { nombre: e.target.value } })}
              />
              <select
                className="max-w-[160px]"
                defaultValue={p.categoria ?? CATEGORIAS[0]}
                onChange={(e) => editar.mutate({ id: p.id, cambios: { categoria: e.target.value } })}
              >
                {CATEGORIAS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <input
              className="text-xs mb-1.5"
              placeholder="Descripción"
              defaultValue={p.descripcion ?? ''}
              onBlur={(e) => e.target.value !== p.descripcion && editar.mutate({ id: p.id, cambios: { descripcion: e.target.value } })}
            />
            <input
              className="text-xs mb-1.5"
              placeholder="URL de una foto (opcional)"
              defaultValue={p.imagen_url ?? ''}
              onBlur={(e) => e.target.value !== p.imagen_url && editar.mutate({ id: p.id, cambios: { imagenUrl: e.target.value } })}
            />
            <div className="flex flex-wrap gap-1.5">
              {ETIQUETAS_DISPONIBLES.map((et) => (
                <button
                  key={et}
                  className={`text-[12px] border rounded-full px-2.5 py-0.5 ${
                    p.etiquetas.includes(et) ? 'bg-ink border-ink text-white' : 'bg-paper border-rule text-muted'
                  }`}
                  onClick={() => toggleEtiqueta(p, et)}
                >
                  {et}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1.5 items-end flex-none">
            <button className="btn btn-sec btn-sm" onClick={() => editar.mutate({ id: p.id, cambios: { estado: p.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO' } })}>
              {p.estado === 'ACTIVO' ? 'Desactivar' : 'Activar'}
            </button>
          </div>
        </div>
      ))}

      <Aviso tipo="at">
        Sin CDN todavía: la "foto" es una URL que tú pegas. Sin ninguna, se muestra un color por plato — la
        publicación nunca se bloquea por falta de imagen.
      </Aviso>
    </div>
  );
}
