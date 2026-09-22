import { useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../lib/api';
import { Aviso } from '../components/Aviso';
import { LayoutPublico } from '../components/LayoutPublico';
import { CampoPassword } from '../components/CampoPassword';

const ROL_ETIQUETA: Record<string, string> = {
  SUPERADMIN: 'Administrador de plataforma',
  SOPORTE: 'Soporte de plataforma',
  ADMIN_EMPRESA: 'Administrador de empresa',
  RRHH: 'RRHH',
  COLABORADOR: 'Colaborador',
  SUPLIDOR_ADMIN: 'Administrador de suplidor',
  DESPACHO: 'Despacho',
};

export function LoginPage() {
  const { auth, loginPendiente, cargando, login, elegirAmbito } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (auth) return <Navigate to="/" replace />;

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo iniciar sesión.');
    }
  }

  async function seleccionar(membresiaId: number) {
    setError(null);
    try {
      await elegirAmbito(membresiaId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo seleccionar el ámbito.');
    }
  }

  return (
    <LayoutPublico>
      {!loginPendiente ? (
        <>
          <h2 className="font-serif text-[23px] font-semibold tracking-[-0.01em] m-0">
            Entrar
          </h2>

          {error && <Aviso tipo="no">{error}</Aviso>}

          <form onSubmit={enviar} className="flex flex-col gap-3.5">
            <div className="campo">
              <label htmlFor="correo">Correo</label>
              <div className="entrada">
                <input
                  id="correo"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@empresa.com"
                  autoComplete="username"
                  inputMode="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoFocus
                  required
                />
              </div>
            </div>

            <CampoPassword
              id="password"
              etiqueta="Contraseña"
              valor={password}
              onChange={setPassword}
            />

            <button className="btn btn-ok w-full" type="submit" disabled={cargando}>
              {cargando ? 'Entrando…' : 'Entrar'}
            </button>

            <Link to="/olvide-password" className="text-[12.5px] underline text-muted">
              ¿Olvidaste tu contraseña?
            </Link>
          </form>

          {/* Sprint 22: la puerta comercial. Discreta a propósito — compite con
              nada, pero es el único camino que tiene alguien sin cuenta. */}
          <p className="text-[12.5px] text-muted m-0 pt-3 border-t border-rule">
            ¿Tu empresa o tu cocina quiere usar Almuerzo?{' '}
            <Link to="/contacto" className="underline text-verde font-medium">
              Escríbenos
            </Link>
          </p>
        </>
      ) : (
        <>
          <h2 className="font-serif text-[23px] font-semibold tracking-[-0.01em] m-0">
            Elige con qué cuenta entrar
          </h2>
          <p className="text-[13px] text-muted m-0 -mt-2">
            Tu correo tiene acceso a más de un sitio.
          </p>

          {error && <Aviso tipo="no">{error}</Aviso>}

          {/* Sprint 21: antes eran botones con un <br> dentro y el rol en gris
              diminuto. Ahora la entidad manda y el rol va como insignia, que es
              el orden en que la gente decide: primero dónde, después como qué. */}
          <div className="flex flex-col gap-2">
            {loginPendiente.membresias.map((m) => (
              <button
                key={m.membresiaId}
                className="ambito"
                disabled={cargando}
                onClick={() => seleccionar(m.membresiaId)}
              >
                <span className="font-medium text-[14px]">{m.nombre ?? 'Plataforma'}</span>
                <span className="est e-CONFIRMADO flex-none">
                  {ROL_ETIQUETA[m.rol] ?? m.rol}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </LayoutPublico>
  );
}
