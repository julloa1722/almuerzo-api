import { useEffect, useState } from 'react';

/**
 * El plato del día: la ilustración que preside las pantallas públicas
 * (Sprint 21).
 *
 * Un plato dibujado a línea que rota entre cuatro almuerzos cada 4,2 segundos.
 * El movimiento no decora — informa: quien llega al login entiende qué hace la
 * plataforma antes de escribir su correo, y ve que hay variedad, que es justo
 * la objeción del colaborador que teme comer siempre lo mismo.
 *
 * **Todo viaja en el bundle, sin una sola petición.** Se evaluó alimentarlo del
 * menú real (`GET /pedidos/menu-disponible`) y se descartó por decisión
 * explícita del usuario: ese endpoint exige sesión, abrirlo al público es una
 * decisión de seguridad aparte, y el login no debe cargar nada que no necesite
 * para dejar entrar a alguien.
 */

const PLATOS = [
  'pollo guisado',
  'pescado al horno',
  'res encebollada',
  'el vegetariano',
];

const INTERVALO_MS = 4200;

/** Trazo común de la comida: línea sobre el relleno, para que se lea como dibujo. */
const TRAZO = {
  stroke: '#3A4757',
  strokeWidth: 1.7,
  fill: 'none',
  strokeLinejoin: 'round' as const,
  strokeLinecap: 'round' as const,
};

function Comida({ i }: { i: number }) {
  if (i === 0) {
    return (
      <g>
        <ellipse cx="94" cy="100" rx="27" ry="20" fill="#FBF0DC" />
        <path d="M118 112c6-14 20-19 28-12s5 21-6 25-25-1-22-13z" fill="#F0E4D2" />
        <circle cx="106" cy="130" r="7" fill="#E6EFEA" />
        <circle cx="122" cy="134" r="5.5" fill="#E6EFEA" />
        <g {...TRAZO}>
          <ellipse cx="94" cy="100" rx="27" ry="20" />
          <path d="M118 112c6-14 20-19 28-12s5 21-6 25-25-1-22-13z" />
          <circle cx="106" cy="130" r="7" />
          <circle cx="122" cy="134" r="5.5" />
        </g>
      </g>
    );
  }
  if (i === 1) {
    return (
      <g>
        <path d="M72 112c14-17 44-17 58 0-14 17-44 17-58 0z" fill="#E7EEF5" />
        <path d="M130 112l18-11v22z" fill="#E7EEF5" />
        <ellipse cx="96" cy="140" rx="22" ry="9" fill="#FBF0DC" />
        <g {...TRAZO}>
          <path d="M72 112c14-17 44-17 58 0-14 17-44 17-58 0z" />
          <path d="M130 112l18-11v22z" />
          <path d="M100 103c4 6 4 12 0 18" />
          <ellipse cx="96" cy="140" rx="22" ry="9" />
        </g>
        <circle cx="86" cy="108" r="2.4" fill="#3A4757" />
      </g>
    );
  }
  if (i === 2) {
    return (
      <g>
        <path d="M74 100c10-12 34-14 46-4s6 28-8 32-38 0-42-12c-2-7 0-12 4-16z" fill="#F0E0DC" />
        <path d="M104 134c10 0 18 3 18 7s-8 7-18 7-18-3-18-7 8-7 18-7z" fill="#E6EFEA" />
        <g {...TRAZO}>
          <path d="M74 100c10-12 34-14 46-4s6 28-8 32-38 0-42-12c-2-7 0-12 4-16z" />
          <path d="M86 108c8-3 20-3 28 2M88 120c9-2 20-1 27 3" />
          <path d="M104 134c10 0 18 3 18 7s-8 7-18 7-18-3-18-7 8-7 18-7z" />
        </g>
      </g>
    );
  }
  return (
    <g>
      <circle cx="92" cy="104" r="17" fill="#E6EFEA" />
      <circle cx="126" cy="116" r="13" fill="#F8E9E9" />
      <ellipse cx="100" cy="138" rx="19" ry="8" fill="#FBF0DC" />
      <g {...TRAZO}>
        <circle cx="92" cy="104" r="17" />
        <path d="M92 87v34M79 97l26 14M105 97l-26 14" />
        <circle cx="126" cy="116" r="13" />
        <path d="M126 103v6" />
        <ellipse cx="100" cy="138" rx="19" ry="8" />
      </g>
    </g>
  );
}

export function EscenaPlato() {
  const [actual, setActual] = useState(0);
  const [saliendo, setSaliendo] = useState(false);

  useEffect(() => {
    // Quien pidió menos movimiento en su sistema ve un plato fijo. No pierde
    // información: el nombre y los puntos siguen ahí.
    const quieto = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (quieto.matches) return;

    const t = setInterval(() => {
      setSaliendo(true);
      setTimeout(() => {
        setActual((i) => (i + 1) % PLATOS.length);
        setSaliendo(false);
      }, 380);
    }, INTERVALO_MS);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-5 text-center">
      <div className="relative w-full max-w-[250px] aspect-square max-lg:max-w-[168px]">
        <svg viewBox="0 0 220 220" fill="none" className="w-full h-full overflow-visible">
          {/* El plato y los cubiertos no cambian nunca */}
          <g
            stroke="#3A4757"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          >
            <circle cx="110" cy="110" r="76" />
            <circle cx="110" cy="110" r="60" stroke="#DCD8CE" />
            <path d="M20 44v34c0 6 4 9 8 9s8-3 8-9V44" />
            <path d="M24 44v22M32 44v22" stroke="#DCD8CE" />
            <path d="M28 87v89" />
            <path d="M196 44c-7 8-9 22-6 32 2 7 6 8 6 8" />
            <path d="M196 84v92" />
          </g>

          <g
            style={{
              transition: 'opacity .38s ease, transform .38s ease',
              opacity: saliendo ? 0 : 1,
              transform: saliendo ? 'scale(.94)' : 'none',
              transformOrigin: '110px 120px',
            }}
          >
            <Comida i={actual} />
          </g>
        </svg>
      </div>

      <div className="max-w-[30ch]">
        <p
          className="font-serif text-[19px] leading-[1.3] font-semibold text-ink m-0 mb-1 max-lg:text-[16.5px]"
          style={{ transition: 'opacity .3s ease', opacity: saliendo ? 0 : 1 }}
        >
          Hoy hay {PLATOS[actual]}
        </p>
        <p className="text-[13px] leading-[1.5] text-muted m-0">
          El menú del día de tu suplidor, pedido desde el teléfono y descontado
          de la nómina.
        </p>

        <div className="flex gap-1.5 justify-center mt-3" aria-hidden="true">
          {PLATOS.map((_, i) => (
            <span
              key={i}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: i === actual ? 16 : 6,
                background: i === actual ? '#2D6A4F' : '#DCD8CE',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
