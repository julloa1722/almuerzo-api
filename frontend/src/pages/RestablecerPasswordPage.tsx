import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiRequest, ApiError } from '../lib/api';
import { Aviso } from '../components/Aviso';
import { LayoutPublico } from '../components/LayoutPublico';
import { CampoPassword } from '../components/CampoPassword';

/** Sprint 19, subsprint 19.2. Pública, fuera de ProtectedRoute.
 *  Sprint 21: marco público compartido y campos con mostrar/ocultar. */
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
    <LayoutPublico>
      <h2 className="font-serif text-[23px] font-semibold tracking-[-0.01em] m-0">
        Nueva contraseña
      </h2>

      {error && <Aviso tipo="no">{error}</Aviso>}

      {listo ? (
        <>
          <Aviso tipo="si">Contraseña actualizada. Ya puedes iniciar sesión con la nueva.</Aviso>
          <button className="btn btn-ok w-full" onClick={() => navigate('/login', { replace: true })}>
            Ir a iniciar sesión
          </button>
        </>
      ) : (
        <div className="flex flex-col gap-3.5">
          <CampoPassword
            id="pass-nueva"
            etiqueta="Contraseña nueva (mínimo 8 caracteres)"
            valor={password}
            onChange={setPassword}
            autoComplete="new-password"
          />
          <CampoPassword
            id="pass-repetir"
            etiqueta="Repite la contraseña"
            valor={confirmar}
            onChange={setConfirmar}
            autoComplete="new-password"
          />
          <button className="btn btn-ok w-full" disabled={cargando} onClick={restablecer}>
            {cargando ? 'Guardando…' : 'Guardar y continuar'}
          </button>
        </div>
      )}
    </LayoutPublico>
  );
}
