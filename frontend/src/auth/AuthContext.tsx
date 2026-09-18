import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { apiRequest } from '../lib/api';
import type { Ambito, AmbitoResponse, LoginResponse, Membresia } from '../types';

const STORAGE_KEY = 'almuerzo_auth';

interface AuthPersistido {
  token: string;
  ambito: Ambito;
  email: string;
}

interface LoginPendiente {
  tokenSinAmbito: string;
  membresias: Membresia[];
  email: string;
}

interface AuthContextValue {
  auth: AuthPersistido | null;
  loginPendiente: LoginPendiente | null;
  cargando: boolean;
  login: (email: string, password: string) => Promise<void>;
  elegirAmbito: (membresiaId: number) => Promise<void>;
  /** Sprint 18: sesión directa tras aceptar una invitación — mismo shape que /auth/seleccionar-ambito. */
  iniciarSesionDesdeInvitacion: (email: string, resp: AmbitoResponse) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthPersistido | null>(null);
  const [loginPendiente, setLoginPendiente] = useState<LoginPendiente | null>(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    const guardado = localStorage.getItem(STORAGE_KEY);
    if (guardado) {
      try {
        setAuth(JSON.parse(guardado));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  async function persistirAmbito(email: string, resp: AmbitoResponse) {
    const nuevo: AuthPersistido = { token: resp.accessToken, ambito: resp.ambito, email };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nuevo));
    setAuth(nuevo);
    setLoginPendiente(null);
  }

  async function login(email: string, password: string) {
    setCargando(true);
    try {
      const resp = await apiRequest<LoginResponse>('/auth/login', { method: 'POST', body: { email, password } });
      if (resp.membresias.length === 1) {
        // Solo una membresía: se selecciona sola, sin pantalla extra — pero
        // el flujo de abajo (elegirAmbito) es el mismo que usaría alguien
        // con varias, no un atajo que se salte el endpoint real.
        const ambitoResp = await apiRequest<AmbitoResponse>('/auth/seleccionar-ambito', {
          method: 'POST',
          token: resp.accessToken,
          body: { membresiaId: resp.membresias[0].membresiaId },
        });
        await persistirAmbito(email, ambitoResp);
      } else {
        setLoginPendiente({ tokenSinAmbito: resp.accessToken, membresias: resp.membresias, email });
      }
    } finally {
      setCargando(false);
    }
  }

  async function elegirAmbito(membresiaId: number) {
    if (!loginPendiente) return;
    setCargando(true);
    try {
      const ambitoResp = await apiRequest<AmbitoResponse>('/auth/seleccionar-ambito', {
        method: 'POST',
        token: loginPendiente.tokenSinAmbito,
        body: { membresiaId },
      });
      await persistirAmbito(loginPendiente.email, ambitoResp);
    } finally {
      setCargando(false);
    }
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY);
    setAuth(null);
    setLoginPendiente(null);
  }

  return (
    <AuthContext.Provider
      value={{ auth, loginPendiente, cargando, login, elegirAmbito, iniciarSesionDesdeInvitacion: persistirAmbito, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>.');
  return ctx;
}
