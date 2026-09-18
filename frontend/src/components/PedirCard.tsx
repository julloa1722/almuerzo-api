import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../lib/useApi';
import { ApiError } from '../lib/api';
import { fmtFecha, fmtHora, formatoRD } from '../lib/fechas';
import { Aviso } from './Aviso';
import { ConsumoCicloMedidor } from './ConsumoCicloMedidor';
import type { MenuDisponibleResponse, PedidoCreado } from '../types';

/**
 * Sprint 10, subsprint 10.3. Selección única (no carrito multi-ítem) —
 * el mockup nunca permitió más de un plato seleccionado a la vez, aunque
 * el backend acepta un array de líneas (ver plan-sprints.md, Sprint 10).
 *
 * A diferencia del mockup, esta pantalla NO recalcula subsidio/monto a
 * cargo en el cliente: ese motor vive solo en el backend (POST /pedidos)
 * y no hay un endpoint de "previsualizar" un pedido sin crearlo. Se
 * muestra el bruto (conocido de antemano) y el desglose real llega en la
 * confirmación — discrepancia real encontrada al construir este sprint,
 * documentada en plan-sprints.md.
 */
export function PedirCard() {
  const api = useApi();
  const queryClient = useQueryClient();
  const [fecha, setFecha] = useState<string | null>(null);
  const [suplidorId, setSuplidorId] = useState<number | null>(null);
  const [menuDiaId, setMenuDiaId] = useState<number | null>(null);
  const [confirmado, setConfirmado] = useState<PedidoCreado | null>(null);
  const [errorCrear, setErrorCrear] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['menu-disponible'],
    queryFn: () => api<MenuDisponibleResponse>('/pedidos/menu-disponible'),
  });

  const fechas = useMemo(() => Object.keys(data?.menu ?? {}).sort(), [data]);
  const fechaActiva = fecha && fechas.includes(fecha) ? fecha : fechas[0] ?? null;

  const itemsDeFecha = fechaActiva ? data?.menu[fechaActiva] ?? [] : [];
  const suplidores = useMemo(() => {
    const mapa = new Map<number, string>();
    itemsDeFecha.forEach((i) => mapa.set(i.suplidorId, i.suplidorNombre));
    return [...mapa.entries()].map(([id, nombre]) => ({ id, nombre }));
  }, [itemsDeFecha]);
  const suplidorActivo = suplidorId && suplidores.some((s) => s.id === suplidorId) ? suplidorId : suplidores[0]?.id ?? null;

  const platos = itemsDeFecha.filter((i) => i.suplidorId === suplidorActivo);
  const platoSeleccionado = platos.find((p) => p.menuDiaId === menuDiaId) ?? null;

  const crearPedido = useMutation({
    mutationFn: () => {
      if (!fechaActiva || !suplidorActivo || !menuDiaId) throw new Error('Selecciona un plato primero.');
      return api<PedidoCreado>('/pedidos', {
        method: 'POST',
        body: { fecha: fechaActiva, suplidorId: suplidorActivo, lineas: [{ menuDiaId, cantidad: 1 }] },
      });
    },
    onSuccess: (pedido) => {
      setConfirmado(pedido);
      setErrorCrear(null);
      setMenuDiaId(null);
      queryClient.invalidateQueries({ queryKey: ['menu-disponible'] });
      queryClient.invalidateQueries({ queryKey: ['pedidos-mios'] });
      queryClient.invalidateQueries({ queryKey: ['consumo-ciclo'] });
    },
    onError: (err) => {
      setConfirmado(null);
      setErrorCrear(err instanceof ApiError ? err.message : 'No se pudo crear el pedido.');
    },
  });

  function seleccionarFecha(f: string) {
    setFecha(f);
    setSuplidorId(null);
    setMenuDiaId(null);
    setConfirmado(null);
    setErrorCrear(null);
  }

  function seleccionarSuplidor(id: number) {
    setSuplidorId(id);
    setMenuDiaId(null);
    setConfirmado(null);
  }

  function seleccionarPlato(id: number, agotado: boolean) {
    if (agotado) return;
    setMenuDiaId((actual) => (actual === id ? null : id));
    setConfirmado(null);
    setErrorCrear(null);
  }

  return (
    <div className="bg-ink rounded-[18px] p-[9px]">
      <div className="bg-card rounded-[11px] overflow-hidden">
        <div className="bg-verde text-white px-4 py-3.5">
          <div className="font-semibold text-[15px]">Pedir almuerzo</div>
          <div className="text-xs opacity-85">Menú disponible según tu punto de entrega y contrato</div>
        </div>
        <div className="p-4">
          {isLoading && <div className="text-sm text-muted">Cargando menú…</div>}

          {!isLoading && fechas.length === 0 && (
            <Aviso tipo="at">No hay fechas con menú publicado y disponible en este momento.</Aviso>
          )}

          {fechas.length > 0 && (
            <div className="campo">
              <label>Pedir para</label>
              <select value={fechaActiva ?? ''} onChange={(e) => seleccionarFecha(e.target.value)}>
                {fechas.map((f) => (
                  <option key={f} value={f}>
                    {fmtFecha(f)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {suplidores.length > 1 && (
            <div className="flex gap-1.5 mb-3">
              {suplidores.map((s) => (
                <button
                  key={s.id}
                  className={`btn btn-sm flex-1 ${s.id === suplidorActivo ? '' : 'btn-sec'}`}
                  onClick={() => seleccionarSuplidor(s.id)}
                >
                  {s.nombre}
                </button>
              ))}
            </div>
          )}

          {fechaActiva &&
            (platos.length ? (
              platos.map((p) => {
                const agotado = !p.disponible;
                const seleccionado = p.menuDiaId === menuDiaId;
                return (
                  <div
                    key={p.menuDiaId}
                    className={`plato ${seleccionado ? 'plato-sel' : ''} ${agotado ? 'plato-ago' : ''}`}
                    onClick={() => seleccionarPlato(p.menuDiaId, agotado)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-[13.5px]">{p.productoNombre}</div>
                      <div className="text-[11.5px] text-muted mt-0.5">
                        {p.descripcion}
                        {p.cupoDisponible != null ? ` · ${p.cupoDisponible} disponible(s)` : ''}
                        {agotado ? ' · sin cupo o cutoff vencido' : ''}
                      </div>
                    </div>
                    <div className="mono text-[13px] font-medium whitespace-nowrap">RD$ {formatoRD(p.precio)}</div>
                  </div>
                );
              })
            ) : (
              <Aviso tipo="at">
                El suplidor todavía no publicó el menú del {fmtFecha(fechaActiva)}, o ya no queda cupo.
              </Aviso>
            ))}

          {platoSeleccionado && (
            <div className="desglose">
              <div className="flex justify-between text-[13px] py-[3px]">
                <span>Precio del plato</span>
                <span className="mono">RD$ {formatoRD(platoSeleccionado.precio)}</span>
              </div>
              <div className="text-[11px] text-muted mt-1">
                El subsidio de tu empresa y el monto exacto a tu cargo se calculan al confirmar.
              </div>
            </div>
          )}

          {errorCrear && <Aviso tipo="no">{errorCrear}</Aviso>}

          {confirmado && (
            <Aviso tipo="si">
              Pedido #{confirmado.id} confirmado · código de retiro <b className="mono">{confirmado.codigo_retiro}</b>
              <br />
              Bruto RD$ {confirmado.total_bruto} · tu empresa cubre RD$ {confirmado.subsidio_empresa} · a tu cargo RD${' '}
              {confirmado.monto_colaborador}
            </Aviso>
          )}

          <button
            className="btn btn-ok w-full mt-1.5"
            disabled={!platoSeleccionado || crearPedido.isPending}
            onClick={() => crearPedido.mutate()}
          >
            {crearPedido.isPending ? 'Confirmando…' : 'Confirmar pedido'}
          </button>

          {platoSeleccionado && (
            <div className="text-[11px] text-muted mt-2">
              Cierra a las {fmtHora(platoSeleccionado.cutoff)} del {fmtFecha(fechaActiva!)}.
            </div>
          )}

          <ConsumoCicloMedidor />
        </div>
      </div>
    </div>
  );
}
