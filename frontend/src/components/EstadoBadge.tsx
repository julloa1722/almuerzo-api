import type { EstadoPedido } from '../types';

export function EstadoBadge({ estado }: { estado: EstadoPedido }) {
  return <span className={`est e-${estado}`}>{estado}</span>;
}
