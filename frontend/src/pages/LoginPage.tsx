import { useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../lib/api';
import { Aviso } from '../components/Aviso';

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
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h2 className="mb-1">Almuerzo</h2>
        <p className="text-muted text-[13.5px] mb-5">Pide tu almuerzo del día en un par de clics.</p>

        <div className="card">
          {error && <Aviso tipo="no">{error}</Aviso>}

          {!loginPendiente ? (
            <form onSubmit={enviar}>
              <div className="campo">
                <label>Correo</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="campo">
                <label>Contraseña</label>
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <button className="btn btn-ok w-full mt-1" type="submit" disabled={cargando}>
                {cargando ? 'Entrando…' : 'Entrar'}
              </button>
              <Link to="/olvide-password" className="text-[12.5px] underline mt-3 inline-block">
                ¿Olvidaste tu contraseña?
              </Link>
            </form>
          ) : (
            <div>
              <h3>Elige con qué cuenta entrar</h3>
              <div className="flex flex-col gap-1.5">
                {loginPendiente.membresias.map((m) => (
                  <button
                    key={m.membresiaId}
                    className="btn btn-sec text-left justify-between flex"
                    disabled={cargando}
                    onClick={() => seleccionar(m.membresiaId)}
                  >
                    <span>
                      {m.nombre ?? 'Plataforma'}
                      <br />
                      <span className="text-[11px] opacity-70">{m.rol}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
