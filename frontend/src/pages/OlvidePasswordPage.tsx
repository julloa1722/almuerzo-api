import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest, ApiError } from '../lib/api';
import { Aviso } from '../components/Aviso';
import { LayoutPublico } from '../components/LayoutPublico';

/** Sprint 19, subsprint 19.2. Pública, fuera de ProtectedRoute.
 *  Sprint 21: pasa a usar el marco público compartido. */
export function OlvidePasswordPage() {
  const [email, setEmail] = useState('');
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const resp = await apiRequest<{ mensaje: string }>('/auth/olvide-password', { method: 'POST', body: { email } });
      setMensaje(resp.mensaje);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo procesar la solicitud.');
    } finally {
      setCargando(false);
    }
  }

  return (
    <LayoutPublico>
      <h2 className="font-serif text-[23px] font-semibold tracking-[-0.01em] m-0">
        Recuperar acceso
      </h2>
      <p className="text-muted text-[13px] m-0 -mt-2">
        Te enviamos un enlace para definir una contraseña nueva.
      </p>

      {error && <Aviso tipo="no">{error}</Aviso>}

      {mensaje ? (
        <Aviso tipo="si">{mensaje}</Aviso>
      ) : (
        <form onSubmit={enviar} className="flex flex-col gap-3.5">
          <div className="campo">
            <label htmlFor="correo-rec">Correo</label>
            <div className="entrada">
              <input
                id="correo-rec"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@empresa.com"
                autoComplete="username"
                inputMode="email"
                autoCapitalize="none"
                autoCorrect="off"
                autoFocus
              />
            </div>
          </div>
          <button className="btn btn-ok w-full" type="submit" disabled={cargando}>
            {cargando ? 'Enviando…' : 'Enviar enlace'}
          </button>
        </form>
      )}

      <Link to="/login" className="text-[12.5px] underline text-muted">
        Volver a iniciar sesión
      </Link>
    </LayoutPublico>
  );
}
