import { useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import { apiRequest, ApiError } from './api';

/**
 * Envuelve apiRequest inyectando el token del ámbito activo, y cierra la
 * sesión sola si la API responde 401 (token vencido o inválido) — en vez de
 * dejar a cada pantalla repetir ese chequeo.
 */
export function useApi() {
  const { auth, logout } = useAuth();

  return useCallback(
    async <T>(path: string, opts: { method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'; body?: unknown } = {}) => {
      try {
        return await apiRequest<T>(path, { ...opts, token: auth?.token });
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          logout();
        }
        throw err;
      }
    },
    [auth?.token, logout],
  );
}
