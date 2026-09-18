import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request } from 'express';
import { firstValueFrom, Observable, of } from 'rxjs';
import { Pool } from 'pg';
import { PG_POOL, PG_POOL_PLATAFORMA } from '../db/db.module';

/**
 * Cada request que llega hasta acá ya pasó por JwtAuthGuard, así que req.ambito
 * (si existe) refleja el ámbito que el usuario eligió al hacer login.
 *
 * Este interceptor:
 *   1. Elige el pool correcto: el de ámbito EMPRESA/SUPLIDOR usa el rol
 *      almuerzo_app (respeta RLS); el de ámbito PLATAFORMA usa
 *      almuerzo_platform (BYPASSRLS deliberado — ver migrations/0004).
 *   2. Toma un cliente dedicado de ESE pool (no cualquier conexión —
 *      SET LOCAL solo tiene efecto dentro de la transacción de esa conexión).
 *   3. Abre una transacción y, si corresponde, fija app.empresa_id o
 *      app.suplidor_id según el ambito del token.
 *   4. Dispara el resto del pipeline con ese cliente disponible en req.dbClient.
 *   5. COMMIT si todo salió bien, ROLLBACK si hubo error, y siempre libera
 *      el cliente de vuelta a su pool.
 */
@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    @Inject(PG_POOL_PLATAFORMA) private readonly poolPlataforma: Pool,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const req = context.switchToHttp().getRequest<Request>();
    const esPlataforma = req.ambito?.tipo === 'PLATAFORMA';
    const client = await (esPlataforma ? this.poolPlataforma : this.pool).connect();
    req.dbClient = client;

    await client.query('BEGIN');

    if (req.ambito?.tipo === 'EMPRESA' && req.ambito.id != null) {
      await client.query(`SELECT set_config('app.empresa_id', $1, true)`, [String(req.ambito.id)]);
    } else if (req.ambito?.tipo === 'SUPLIDOR' && req.ambito.id != null) {
      await client.query(`SELECT set_config('app.suplidor_id', $1, true)`, [String(req.ambito.id)]);
    }
    // PLATAFORMA no fija ningún GUC — no hace falta, almuerzo_platform ya
    // tiene BYPASSRLS. Ver el comentario de arriba y migrations/0004.

    try {
      const resultado = await firstValueFrom(next.handle(), { defaultValue: undefined });
      await client.query('COMMIT');
      return of(resultado);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
