import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import { apiRequest, ApiError } from '../lib/api';
import { Aviso } from '../components/Aviso';
import { LayoutPublico } from '../components/LayoutPublico';
import { CampoPassword } from '../components/CampoPassword';
import type { AmbitoResponse } from '../types';

interface InvitacionInfo {
  email: string;
  rol: string;
  ambito_tipo: string;
  nombre_ambito: string;
  vigente: boolean;
  /**
   * Sprint 20: si ese correo ya tiene cuenta, el backend exige la contraseña
   * ACTUAL en vez de crear una nueva (cierra una escalada de privilegios —
   * ver src/invitaciones/invitaciones.service.ts). La pantalla cambia de
   * "define una contraseña" a "confirma con tu contraseña" para que el
   * usuario no escriba una nueva y choque con un error que no entiende.
   */
  usuario_existe?: boolean;
}

const ROL_ETIQUETA: Record<string, string> = {
  SUPERADMIN: 'Administrador de plataforma',
  SOPORTE: 'Soporte de plataforma',
  ADMIN_EMPRESA: 'Administrador de empresa',
  RRHH: 'RRHH',
  COLABORADOR: 'Colaborador',
  SUPLIDOR_ADMIN: 'Administrador de suplidor',
  DESPACHO: 'Despacho',
};

/**
 * Sprint 18, subsprint 18.5: ruta pública `/invitacion/:token`, fuera de
 * `ProtectedRoute` — quien la visita no tiene sesión todavía.
 */
export function AceptarInvitacionPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { iniciarSesionDesdeInvitacion } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const { data: info, isLoading } = useQuery({
    queryKey: ['invitacion', token],
    queryFn: () => apiRequest<InvitacionInfo>(`/invitaciones/${token}`),
    retry: false,
  });

  const cuentaExistente = info?.usuario_existe === true;

  async function aceptar() {
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    // Con una cuenta ya existente no se define nada: se confirma la que ya
    // tiene, así que pedir que la repita solo estorba.
    if (!cuentaExistente && password !== confirmar) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setError(null);
    setCargando(true);
    try {
      const resp = await apiRequest<AmbitoResponse>(`/invitaciones/${token}/aceptar`, {
        method: 'POST',
        body: { password },
      });
      await iniciarSesionDesdeInvitacion(info!.email, resp);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo aceptar la invitación.');
    } finally {
      setCargando(false);
    }
  }

  if (isLoading) {
    return (
      <LayoutPublico>
        <div className="text-sm text-muted">Cargando…</div>
      </LayoutPublico>
    );
  }

  if (!info || !info.vigente) {
    return (
      <LayoutPublico>
        <h2 className="font-serif text-[23px] font-semibold tracking-[-0.01em] m-0">
          Invitación no disponible
        </h2>
        <p className="text-[13.5px] text-muted m-0">
          Este enlace ya no es válido — puede que ya lo hayas usado, que haya vencido, o que te lo
          hayan revocado. Pide que te envíen uno nuevo.
        </p>
      </LayoutPublico>
    );
  }

  return (
    <LayoutPublico>
      <h2 className="font-serif text-[23px] font-semibold tracking-[-0.01em] m-0">
        {cuentaExistente ? 'Confirma la invitación' : 'Activa tu cuenta'}
      </h2>
      <p className="text-[13.5px] text-muted m-0 -mt-2">
        Te invitaron como <b>{ROL_ETIQUETA[info.rol] ?? info.rol}</b> de <b>{info.nombre_ambito}</b>.{' '}
        {cuentaExistente ? (
          <>
            <span className="mono">{info.email}</span> ya tiene una cuenta, así que escribe tu
            contraseña actual para confirmar que eres tú.
          </>
        ) : (
          <>
            Define una contraseña para <span className="mono">{info.email}</span>.
          </>
        )}
      </p>

      {error && <Aviso tipo="no">{error}</Aviso>}

      <div className="flex flex-col gap-3.5">
        <CampoPassword
          id="inv-pass"
          etiqueta={cuentaExistente ? 'Tu contraseña actual' : 'Contraseña (mínimo 8 caracteres)'}
          valor={password}
          onChange={setPassword}
          autoComplete={cuentaExistente ? 'current-password' : 'new-password'}
        />
        {!cuentaExistente && (
          <CampoPassword
            id="inv-pass-2"
            etiqueta="Repite la contraseña"
            valor={confirmar}
            onChange={setConfirmar}
            autoComplete="new-password"
          />
        )}
        <button className="btn btn-ok w-full" disabled={cargando} onClick={aceptar}>
          {cargando ? 'Activando…' : cuentaExistente ? 'Confirmar y entrar' : 'Activar cuenta y entrar'}
        </button>
      </div>
    </LayoutPublico>
  );
}
