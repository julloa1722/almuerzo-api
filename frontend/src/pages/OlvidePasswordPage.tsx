import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest, ApiError } from '../lib/api';
import { Aviso } from '../components/Aviso';

/** Sprint 19, subsprint 19.2. Pública, fuera de ProtectedRoute. */
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
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h2 className="mb-1">Recuperar acceso</h2>
        <p className="text-muted text-[13.5px] mb-5">Te enviamos un enlace para definir una contraseña nueva.</p>

        <div className="card">
          {error && <Aviso tipo="no">{error}</Aviso>}
          {mensaje ? (
            <Aviso tipo="si">{mensaje}</Aviso>
          ) : (
            <form onSubmit={enviar}>
              <div className="campo">
                <label>Correo</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <button className="btn btn-ok w-full mt-1" type="submit" disabled={cargando}>
                {cargando ? 'Enviando…' : 'Enviar enlace'}
              </button>
            </form>
          )}
          <Link to="/login" className="text-[12.5px] underline mt-3 inline-block">
            Volver a iniciar sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
