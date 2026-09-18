import { useQuery } from '@tanstack/react-query';
import { useApi } from '../lib/useApi';
import type { ConsumoCiclo } from '../types';

function formatoRD(n: number): string {
  return n.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function ConsumoCicloMedidor() {
  const api = useApi();
  const { data } = useQuery({
    queryKey: ['consumo-ciclo'],
    queryFn: () => api<ConsumoCiclo>('/pedidos/consumo-ciclo'),
  });

  if (!data || data.topeEfectivo == null) return null;

  const pct = Math.min(100, data.topeEfectivo ? (data.consumo / data.topeEfectivo) * 100 : 0);
  const color = pct > 90 ? 'bg-granate' : pct > 70 ? 'bg-ambar' : 'bg-verde';

  return (
    <div className="mt-4 pt-3.5 border-t border-rule-2">
      <div className="flex justify-between text-[12.5px]">
        <span>Comprometido este ciclo</span>
        <span className="mono">
          RD$ {formatoRD(data.consumo)} <span className="text-muted">/ {formatoRD(data.topeEfectivo)}</span>
        </span>
      </div>
      <div className="medidor">
        <div className={`h-full ${color} transition-[width]`} style={{ width: `${pct}%` }} />
      </div>
      <div className="text-[11px] text-muted mt-1">
        Período {data.periodoInicio} – {data.periodoFin}
      </div>
    </div>
  );
}
