import { Controller, Get, HttpStatus, Inject, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Pool } from 'pg';
import { PG_POOL, PG_POOL_PLATAFORMA } from '../db/db.module';

/**
 * Health check que Render consulta para decidir si un deploy sirvió
 * (`healthCheckPath: /health` en render.yaml).
 *
 * Sprint 20, dos cambios sobre la versión original:
 *
 * 1. Prueba los DOS pools, no solo el de la app. El despliegue obliga a
 *    configurar a mano `DATABASE_URL` y `PLATFORM_DATABASE_URL`; con un solo
 *    chequeo, un error de tipeo en la segunda daba un deploy "verde" y el
 *    fallo aparecía mucho después, en el primer request de back office.
 * 2. Nunca lanza. Antes, un `SELECT 1` fallido salía como 500 genérico sin
 *    decir qué falló. Ahora responde 503 con el motivo — que es una respuesta
 *    útil tanto para Render como para quien esté depurando.
 */
@Controller('health')
export class HealthController {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    @Inject(PG_POOL_PLATAFORMA) private readonly poolPlataforma: Pool,
  ) {}

  @Get()
  async check(@Res() res: Response) {
    const inicio = Date.now();
    const [app, plataforma] = await Promise.all([
      this.probar(this.pool),
      this.probar(this.poolPlataforma),
    ]);

    const sano = app.ok && plataforma.ok;
    return res.status(sano ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE).json({
      estado: sano ? 'ok' : 'degradado',
      baseDeDatos: app.ok ? 'conectada' : 'inalcanzable',
      basePlataforma: plataforma.ok ? 'conectada' : 'inalcanzable',
      // Solo aparecen cuando algo falló — en el caso feliz no ensucian.
      ...(app.motivo ? { motivoBaseDeDatos: app.motivo } : {}),
      ...(plataforma.motivo ? { motivoBasePlataforma: plataforma.motivo } : {}),
      latenciaMs: Date.now() - inicio,
    });
  }

  private async probar(pool: Pool): Promise<{ ok: boolean; motivo?: string }> {
    try {
      await pool.query('SELECT 1');
      return { ok: true };
    } catch (err) {
      return { ok: false, motivo: err instanceof Error ? err.message : String(err) };
    }
  }
}
