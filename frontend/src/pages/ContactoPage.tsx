import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest, ApiError } from '../lib/api';
import { Aviso } from '../components/Aviso';
import { Marca } from '../components/Marca';
import { EscenaPlato } from '../components/EscenaPlato';

/**
 * Sprint 22 — la puerta comercial.
 *
 * Quien llega sin cuenta —el suplidor o la empresa que podríamos firmar— antes
 * solo encontraba un login: dos campos y una puerta cerrada. Aquí entiende qué
 * es la plataforma, qué gana según de qué lado esté, y puede escribir.
 *
 * Los beneficios que se listan son cosas que el sistema HACE, no promesas de
 * folleto. Si alguna deja de ser cierta, hay que cambiarla aquí.
 */

type Tipo = 'SUPLIDOR' | 'EMPRESA';

const BENEFICIOS: { titulo: string; quien: string; puntos: string[] }[] = [
  {
    titulo: 'Para tu empresa',
    quien: 'RRHH y administración',
    puntos: [
      'El descuento va a nómina solo, sin llevar cuentas a mano.',
      'Tú decides cuánto aporta la empresa y cuánto el colaborador.',
      'Reportes de consumo y gasto, por ciclo y por persona.',
    ],
  },
  {
    titulo: 'Para tu cocina',
    quien: 'Suplidores de almuerzo',
    puntos: [
      'Los pedidos del día llegan ordenados, sin llamadas ni WhatsApp.',
      'Publicas el menú una vez y la plantilla semanal lo repite.',
      'Cobras por liquidación, no persiguiendo cliente por cliente.',
    ],
  },
  {
    titulo: 'Para tu gente',
    quien: 'Colaboradores',
    puntos: [
      'Piden el almuerzo desde el teléfono, en dos toques.',
      'Ven cuánto llevan consumido del ciclo antes de pedir.',
      'Si no les entregan, lo disputan y se corrige.',
    ],
  },
];

export function ContactoPage() {
  const [tipo, setTipo] = useState<Tipo>('EMPRESA');
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [negocio, setNegocio] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [web, setWeb] = useState(''); // campo trampa
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      await apiRequest('/contacto', {
        method: 'POST',
        body: { nombre, email, telefono, tipo, negocio, mensaje, web },
      });
      setEnviado(true);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'No se pudo enviar. Inténtalo de nuevo.',
      );
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="min-h-screen bg-paper">
      <div className="max-w-[1000px] mx-auto px-6 py-10 max-lg:px-5 max-lg:py-7">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-9">
          <Marca />
          <Link to="/login" className="text-[13px] underline text-muted">
            Ya tengo cuenta, entrar
          </Link>
        </div>

        <div className="grid lg:grid-cols-[1fr_260px] gap-9 items-start mb-11">
          <div>
            <h1 className="font-serif text-[34px] leading-[1.14] font-semibold tracking-[-0.015em] m-0 mb-3 max-lg:text-[26px]">
              Conectamos empresas, cocinas y colaboradores
            </h1>
            <p className="text-[15.5px] leading-[1.6] text-muted m-0 max-w-[60ch]">
              El almuerzo de tu equipo, resuelto de punta a punta: tu gente pide
              del menú del día desde el teléfono, el suplidor recibe los pedidos
              ordenados, y el descuento llega a la nómina sin que nadie lleve
              una hoja de cálculo.
            </p>
          </div>
          <div className="max-lg:hidden">
            <EscenaPlato />
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-11">
          {BENEFICIOS.map((b) => (
            <div key={b.titulo} className="card flex flex-col gap-2">
              <div>
                <h2 className="font-serif text-[18px] font-semibold m-0">{b.titulo}</h2>
                <p className="text-[11.5px] uppercase tracking-[0.1em] text-muted font-semibold m-0 mt-0.5">
                  {b.quien}
                </p>
              </div>
              <ul className="flex flex-col gap-2 m-0 p-0 list-none">
                {b.puntos.map((p) => (
                  <li key={p} className="flex gap-2 text-[13.5px] leading-[1.5] text-ink-3">
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#2D6A4F"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="flex-none mt-0.5"
                      aria-hidden="true"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="card max-w-[560px] mx-auto">
          <h2 className="font-serif text-[23px] font-semibold m-0 mb-1">
            Escríbenos
          </h2>
          <p className="text-[13.5px] text-muted m-0 mb-4">
            Cuéntanos de tu empresa o de tu cocina y te contactamos.
          </p>

          {enviado ? (
            <Aviso tipo="si">
              Recibimos tu solicitud. Te escribimos al correo que nos dejaste.
            </Aviso>
          ) : (
            <form onSubmit={enviar} className="flex flex-col gap-3.5">
              {error && <Aviso tipo="no">{error}</Aviso>}

              <div className="campo">
                <label htmlFor="ct-tipo">Escribo como</label>
                <div className="flex gap-2" id="ct-tipo">
                  {(['EMPRESA', 'SUPLIDOR'] as Tipo[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTipo(t)}
                      aria-pressed={tipo === t}
                      className={`btn flex-1 ${tipo === t ? 'btn-ok' : 'btn-sec'}`}
                    >
                      {t === 'EMPRESA' ? 'Una empresa' : 'Una cocina / suplidor'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="campo">
                <label htmlFor="ct-nombre">Nombre y apellido</label>
                <div className="entrada">
                  <input id="ct-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required autoComplete="name" />
                </div>
              </div>

              <div className="campo">
                <label htmlFor="ct-email">Correo</label>
                <div className="entrada">
                  <input
                    id="ct-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    inputMode="email"
                    autoCapitalize="none"
                  />
                </div>
              </div>

              <div className="campo">
                <label htmlFor="ct-tel">Teléfono</label>
                <div className="entrada">
                  <input id="ct-tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} autoComplete="tel" inputMode="tel" />
                </div>
              </div>

              <div className="campo">
                <label htmlFor="ct-negocio">
                  {tipo === 'EMPRESA' ? 'Nombre de la empresa' : 'Nombre de la cocina'}
                </label>
                <div className="entrada">
                  <input id="ct-negocio" value={negocio} onChange={(e) => setNegocio(e.target.value)} autoComplete="organization" />
                </div>
              </div>

              <div className="campo">
                <label htmlFor="ct-mensaje">Mensaje</label>
                <textarea
                  id="ct-mensaje"
                  rows={4}
                  value={mensaje}
                  onChange={(e) => setMensaje(e.target.value)}
                  placeholder={
                    tipo === 'EMPRESA'
                      ? '¿Cuántos colaboradores son? ¿Ya tienen un suplidor?'
                      : '¿Qué tipo de comida preparan? ¿Cuántos almuerzos al día?'
                  }
                />
              </div>

              {/* Campo trampa: oculto para las personas, visible para los robots
                  que rellenan todo lo que encuentran. Si llega con contenido, el
                  backend descarta la solicitud sin decir por qué. */}
              <input
                type="text"
                name="web"
                value={web}
                onChange={(e) => setWeb(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="absolute w-px h-px -left-[9999px] opacity-0"
              />

              <button className="btn btn-ok w-full" type="submit" disabled={cargando}>
                {cargando ? 'Enviando…' : 'Enviar'}
              </button>
            </form>
          )}
        </div>

        <footer className="mt-10 pt-4 border-t border-rule text-[11.5px] text-muted text-center">
          © {new Date().getFullYear()} Almuerzo · Beneficios corporativos, República Dominicana
        </footer>
      </div>
    </div>
  );
}
