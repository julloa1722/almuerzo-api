import type { ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';

export function AppHeader({ titulo, children }: { titulo: string; children?: ReactNode }) {
  const { auth, logout } = useAuth();

  return (
    <header className="bg-ink text-white border-b-[3px] border-ambar">
      <div className="max-w-[1240px] mx-auto px-5 py-3.5 flex items-center justify-between">
        <div>
          <div className="font-semibold text-[15px]">{titulo}</div>
          <div className="text-xs text-[#9BA6B4]">
            {auth?.email} · {auth?.ambito.rol}
          </div>
        </div>
        <button className="btn btn-sec !text-white !border-ink-3" onClick={logout}>
          Salir
        </button>
      </div>
      {children}
    </header>
  );
}
