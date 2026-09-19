import { Controller, Get, HttpStatus, Inject, Logger, Res } from '@nestjs/common';
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
 *    decir qué falló. Ahora responde 503 con una etiqueta de la causa.
 *
 * El detalle completo va SOLO al log del servidor, nunca al cuerpo de la
 * respuesta. Esto se corrigió en la revisión de pre-vuelo: la primera versión
 * devolvía `err.message` tal cual, y el mensaje de error de `pg` incluye el
 * host de la base. Ese host es hoy lo único que protege la base de datos,
 * porque las contraseñas de `almuerzo_app` y `almuerzo_platform` están
 * publicadas en las migraciones (gap consciente, ver plan-sprints.md). Un
 * endpoint público que revelara el host desarmaría esa protección por
 * accidente.
 */
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    @Inject(PG_POOL_PLATAFORMA) private readonly poolPlataforma: Pool,
  ) {}

  @Get()
  async check(@Res() res: Response) {
    const inicio = Date.now();
    const [app, plataforma] = await Promise.all([
      this.probar(this.pool, 'app'),
      this.probar(this.poolPlataforma, 'plataforma'),
    ]);

    const sano = app.ok && plataforma.ok;
    return res.status(sano ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE).json({
      estado: sano ? 'ok' : 'degradado',
      baseDeDatos: app.ok ? 'conectada' : app.causa,
      basePlataforma: plataforma.ok ? 'conectada' : plataforma.causa,
      latenciaMs: Date.now() - inicio,
    });
  }

  private async probar(pool: Pool, nombre: string): Promise<{ ok: boolean; causa?: string }> {
    try {
      await pool.query('SELECT 1');
      return { ok: true };
    } catch (err) {
      // El mensaje entero va al log de Render, donde solo llega quien tiene
      // acceso a la cuenta. Hacia afuera sale una etiqueta estable, suficiente
      // para saber qué revisar sin revelar dónde vive la base.
      this.logger.error(
        `Fallo al consultar la base "${nombre}": ${err instanceof Error ? err.message : String(err)}`,
      );
      return { ok: false, causa: this.clasificar(err) };
    }
  }

  /**
   * Traduce el error a una etiqueta corta y estable. Son las tres cosas que
   * de verdad pueden fallar en este despliegue, y cada una manda a revisar un
   * lugar distinto.
   */
  private clasificar(err: unknown): string {
    const codigo = (err as { code?: string })?.code;
    if (codigo === '28P01' || codigo === '28000') return 'credenciales-invalidas';
    if (codigo === '3D000') return 'base-no-existe';
    if (codigo === 'ETIMEDOUT' || codigo === 'ECONNREFUSED' || codigo === 'ENOTFOUND') {
      return 'inalcanzable';
    }
    const mensaje = err instanceof Error ? err.message : '';
    // El timeout del pool no trae `code`, solo este texto (ver
    // OPCIONES_POOL.connectionTimeoutMillis en src/db/db.module.ts).
    if (/timeout/i.test(mensaje)) return 'timeout';
    return 'error-desconocido';
  }
}
