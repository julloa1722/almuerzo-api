import type { PoolClient } from 'pg';

export type AmbitoTipo = 'PLATAFORMA' | 'EMPRESA' | 'SUPLIDOR';

export interface Ambito {
  tipo: AmbitoTipo;
  id: number | null;
  rol: string;
}

export interface JwtPayload {
  sub: number; // usuario_id
  ambito?: Ambito; // ausente en el token "sin ámbito" que emite /auth/login
}

/**
 * Aumenta el Request de Express con lo que el guard de auth y el interceptor
 * de tenant le agregan durante el ciclo de vida de la petición.
 */
declare module 'express' {
  interface Request {
    usuarioId?: number;
    ambito?: Ambito;
    dbClient?: PoolClient;
  }
}
