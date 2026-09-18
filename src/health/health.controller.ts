import { Controller, Get, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../db/db.module';

@Controller('health')
export class HealthController {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  @Get()
  async check() {
    const inicio = Date.now();
    await this.pool.query('SELECT 1');
    return {
      estado: 'ok',
      baseDeDatos: 'conectada',
      latenciaMs: Date.now() - inicio,
    };
  }
}
