import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { AppPage } from './AppPage';
import { SuplidorPage } from './SuplidorPage';
import { RrhhPage } from './RrhhPage';
import { BackOfficePage } from './BackOfficePage';

/**
 * Sprint 11, subsprint 11.1: hasta ahora solo existía la pantalla del
 * colaborador. Cada rol tiene su propia pantalla — nada de una sola vista
 * genérica con "if" por todos lados, mismo AuthContext y cliente de API.
 * Sprint 12 agrega RRHH/ADMIN_EMPRESA, Sprint 13 agrega plataforma.
 */
export function RolRouter() {
  const navigate = useNavigate();
  const { auth, logout } = useAuth();
  const rol = auth?.ambito.rol;

  if (rol === 'COLABORADOR') return <AppPage />;
  if (rol === 'SUPLIDOR_ADMIN') return <SuplidorPage />;
  if (rol === 'RRHH' || rol === 'ADMIN_EMPRESA') return <RrhhPage />;
  if (rol === 'SUPERADMIN' || rol === 'SOPORTE') return <BackOfficePage />;

  function volverALogin() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 text-center">
      <div>
        <h2>Rol sin pantalla todavía</h2>
        <p className="text-muted text-[13.5px] mt-1">
          Tu rol ({rol}) no tiene una app propia en este frontend por ahora — solo colaborador y suplidor.
        </p>
        <button className="btn btn-sec mt-4" onClick={volverALogin}>
          Volver al login
        </button>
      </div>
    </div>
  );
}
