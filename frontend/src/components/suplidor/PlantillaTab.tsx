import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../../lib/useApi';
import { ApiError } from '../../lib/api';
import { Aviso } from '../Aviso';
import type { Plantilla, Producto } from '../../types';

const NOMBRE_DIA: Record<number, string> = { 1: 'lunes', 2: 'martes', 3: 'miércoles', 4: 'jueves', 5: 'viernes' };
const SEMANAS: (1 | 2)[] = [1, 2];

/**
 * Sprint 11, subsprint 11.3. Discrepancia 2 resuelta: "quitar" un plato de
 * un día llama al DELETE nuevo (backend, este mismo sprint) en vez de solo
 * simular un checkbox — no existía forma de hacerlo antes de este sprint.
 */
export function PlantillaTab() {
  const api = useApi();
  const queryClient = useQueryClient();

  const { data: dataProductos } = useQuery({
    queryKey: ['catalogo-productos'],
    queryFn: () => api<{ productos: Producto[] }>('/catalogo/productos'),
  });
  const { data: dataPlantillas, isLoading } = useQuery({
    queryKey: ['catalogo-plantillas'],
    queryFn: () => api<{ plantillas: Plantilla[] }>('/catalogo/plantillas'),
  });

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ['catalogo-plantillas'] });

  const crearPlantilla = useMutation({
    mutationFn: (semanaTipo: 1 | 2) => api('/catalogo/plantillas', { method: 'POST', body: { nombre: `Semana ${semanaTipo}`, semanaTipo } }),
    onSuccess: invalidar,
  });

  const agregarItem = useMutation({
    mutationFn: (params: { plantillaId: number; diaSemana: number; productoId: number; precio: number; cupo: number }) =>
      api(`/catalogo/plantillas/${params.plantillaId}/items`, {
        method: 'POST',
        body: { diaSemana: params.diaSemana, productoId: params.productoId, precio: params.precio, cupo: params.cupo },
      }),
    onSuccess: invalidar,
    onError: (err) => alert(err instanceof ApiError ? err.message : 'No se pudo agregar el plato.'),
  });

  const quitarItem = useMutation({
    mutationFn: (params: { plantillaId: number; itemId: number }) =>
      api(`/catalogo/plantillas/${params.plantillaId}/items/${params.itemId}`, { method: 'DELETE' }),
    onSuccess: invalidar,
  });

  const productosActivos = (dataProductos?.productos ?? []).filter((p) => p.estado === 'ACTIVO');
  const plantillas = dataPlantillas?.plantillas ?? [];

  function itemDe(plantilla: Plantilla, dia: number, productoId: number) {
    return plantilla.items.find((i) => i.dia_semana === dia && i.producto_id === productoId) ?? null;
  }

  function marcar(plantilla: Plantilla, dia: number, producto: Producto, marcado: boolean) {
    const item = itemDe(plantilla, dia, producto.id);
    if (marcado && !item) {
      const precioTxt = window.prompt(`Precio de "${producto.nombre}" el ${NOMBRE_DIA[dia]} (semana ${plantilla.semana_tipo}):`, '300');
      if (precioTxt == null) return;
      const precio = Number(precioTxt);
      if (!(precio > 0)) return;
      agregarItem.mutate({ plantillaId: plantilla.id, diaSemana: dia, productoId: producto.id, precio, cupo: 6 });
    } else if (!marcado && item) {
      quitarItem.mutate({ plantillaId: plantilla.id, itemId: item.id });
    }
  }

  return (
    <div>
      <h2>Plantilla semanal</h2>
      <p className="sub">
        Defines el patrón una vez por cada semana de rotación. La plataforma publica automáticamente el menú de cada
        fecha futura leyendo esta plantilla — no cargas el menú a diario.
      </p>

      {isLoading && <div className="text-sm text-muted">Cargando…</div>}

      <div className="grid g2" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))' }}>
        {SEMANAS.map((semT) => {
          const plantilla = plantillas.find((p) => p.semana_tipo === semT);
          return (
            <div className="card" key={semT}>
              <h3>
                Semana tipo {semT} {semT === 1 ? '(impar)' : '(par)'}
              </h3>
              {!plantilla ? (
                <div>
                  <p className="text-[13px] text-muted mb-2">Todavía no existe una plantilla para esta semana.</p>
                  <button className="btn btn-sm" disabled={crearPlantilla.isPending} onClick={() => crearPlantilla.mutate(semT)}>
                    Crear plantilla semana {semT}
                  </button>
                </div>
              ) : (
                <table>
                  <tbody>
                    {[1, 2, 3, 4, 5].map((dia) => (
                      <tr key={dia}>
                        <td className="font-medium capitalize whitespace-nowrap align-top pt-2.5">{NOMBRE_DIA[dia]}</td>
                        <td>
                          {productosActivos.map((p) => {
                            const item = itemDe(plantilla, dia, p.id);
                            return (
                              <div key={p.id} className="flex items-center gap-1.5 mb-1.5 text-[12.5px]">
                                <input
                                  type="checkbox"
                                  checked={!!item}
                                  onChange={(e) => marcar(plantilla, dia, p, e.target.checked)}
                                />
                                <span className="flex-1 min-w-0 truncate">{p.nombre}</span>
                                {item && (
                                  <>
                                    <input
                                      type="number"
                                      className="w-14 px-1 py-0.5 text-xs border border-rule rounded mono"
                                      defaultValue={item.precio}
                                      onBlur={(e) =>
                                        Number(e.target.value) !== Number(item.precio) &&
                                        agregarItem.mutate({
                                          plantillaId: plantilla.id,
                                          diaSemana: dia,
                                          productoId: p.id,
                                          precio: Number(e.target.value),
                                          cupo: item.cupo ?? 6,
                                        })
                                      }
                                    />
                                    <input
                                      type="number"
                                      className="w-12 px-1 py-0.5 text-xs border border-rule rounded mono"
                                      defaultValue={item.cupo ?? ''}
                                      onBlur={(e) =>
                                        Number(e.target.value) !== Number(item.cupo) &&
                                        agregarItem.mutate({
                                          plantillaId: plantilla.id,
                                          diaSemana: dia,
                                          productoId: p.id,
                                          precio: Number(item.precio),
                                          cupo: Number(e.target.value),
                                        })
                                      }
                                    />
                                  </>
                                )}
                              </div>
                            );
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          );
        })}
      </div>

      <Aviso tipo="si">
        La rotación entre semana 1 y 2 se calcula por número de semana ISO — se alterna sola. Ve a "Calendario y
        preparación" para generar el menú real a partir de esta plantilla.
      </Aviso>
    </div>
  );
}
