import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiRequest, ApiError } from '../lib/api';
import { Aviso } from '../components/Aviso';

/** Sprint 19, subsprint 19.2. Pública, fuera de ProtectedRoute. */
export function RestablecerPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);
  const [cargando, setCargando] = useState(false);

  async function restablecer() {
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (password !== confirmar) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setError(null);
    setCargando(true);
    try {
      await apiRequest(`/auth/restablecer-password/${token}`, { method: 'POST', body: { password } });
      setListo(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo restablecer la contraseña.');
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card max-w-[420px] w-full">
        <h2>Nueva contraseña</h2>

        {error && <Aviso tipo="no">{error}</Aviso>}

        {listo ? (
          <div>
            <Aviso tipo="si">Contraseña actualizada. Ya puedes iniciar sesión con la nueva.</Aviso>
            <button className="btn mt-3" onClick={() => navigate('/login', { replace: true })}>
              Ir a iniciar sesión
            </button>
          </div>
        ) : (
          <>
            <div className="campo">
              <label>Contraseña nueva (mínimo 8 caracteres)</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className="campo">
              <label>Repite la contraseña</label>
              <input type="password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} />
            </div>
            <button className="btn" disabled={cargando} onClick={restablecer}>
              {cargando ? 'Guardando…' : 'Guardar y continuar'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
