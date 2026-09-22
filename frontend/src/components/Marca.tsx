/**
 * Símbolo y nombre del producto (Sprint 21).
 *
 * Una campana de servir sobre su bandeja: legible a 20px, de un solo trazo y un
 * solo color, sin dependencias ni imágenes que cargar. Si algún día hay un
 * trabajo de identidad de marca de verdad, se reemplaza este archivo y nada más
 * — nadie más dibuja el logo.
 *
 * El nombre "Almuerzo" es provisional; está anotado como pendiente en
 * plan-sprints.md, Sprint 21.
 */
export function Marca({ tamano = 28, claro = false }: { tamano?: number; claro?: boolean }) {
  const color = claro ? '#FFFFFF' : '#2D6A4F';
  return (
    <div className="flex items-center gap-2.5">
      <svg
        width={tamano}
        height={tamano}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        aria-hidden="true"
        className="flex-none"
      >
        <circle cx="12" cy="4.4" r="1.5" fill={color} />
        <path d="M3.6 16.4a8.4 8.4 0 0 1 16.8 0" />
        <path d="M2 17.4h20" />
      </svg>
      <span
        className="text-[20px] font-bold tracking-[-0.02em]"
        style={{ color: claro ? '#FFFFFF' : undefined }}
      >
        Almuerzo
      </span>
    </div>
  );
}
