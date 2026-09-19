import {
  Global,
  Inject,
  Injectable,
  Logger,
  Module,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Pool, PoolConfig } from 'pg';

export const PG_POOL = 'PG_POOL';
export const PG_POOL_PLATAFORMA = 'PG_POOL_PLATAFORMA';

// Sprint 20: opciones explícitas en vez de los defaults de pg. Dos razones
// concretas, ambas de correr en Render + Neon en plan gratuito:
//
// - `connectionTimeoutMillis`: sin esto el default es esperar PARA SIEMPRE.
//   Neon autosuspende el compute tras unos minutos sin uso, así que el primer
//   request después de la siesta se quedaba colgado sin error y sin límite —
//   incluido /health, que es justo lo que Render consulta para decidir si el
//   deploy sirvió. 15s da margen para el cold start de Neon y aun así falla
//   con un mensaje en vez de colgarse.
// - `max`: el default son 10 conexiones POR POOL, y aquí hay dos pools en un
//   contenedor de 512 MB. 5 y 5 es de sobra para el volumen de este sistema.
const OPCIONES_POOL: PoolConfig = {
  max: 5,
  connectionTimeoutMillis: 15_000,
  idleTimeoutMillis: 10_000,
  // Un query patológico no puede retener una conexión indefinidamente.
  statement_timeout: 30_000,
};

/**
 * Registra el listener de 'error' del pool.
 *
 * Sin esto el proceso se muere. Cuando un cliente ocioso pierde la conexión,
 * node-postgres hace `pool.emit('error', ...)`, y un EventEmitter que emite
 * 'error' sin ningún listener lanza la excepción — fuera de cualquier request,
 * o sea excepción no capturada y salida del proceso. Con Neon autosuspendiendo
 * el compute y cortando sockets que el pool todavía cree vivos, eso no es
 * teórico: se vería como reinicios espontáneos del servicio sin ningún request
 * asociado, imposibles de explicar leyendo los logs.
 *
 * El cliente roto ya fue purgado del pool antes de emitir, así que basta con
 * dejar constancia: el siguiente query abre una conexión nueva.
 */
function conErrorManejado(pool: Pool, nombre: string): Pool {
  const logger = new Logger(`Pool:${nombre}`);
  pool.on('error', (err) => {
    logger.error(`Conexión ociosa perdida (el pool se recupera solo): ${err.message}`);
  });
  return pool;
}

/**
 * Cierra los dos pools cuando Nest apaga la aplicación.
 *
 * Render manda SIGTERM en cada deploy y cada vez que el servicio del plan
 * gratuito se duerme o despierta. Sin esto, el comportamiento por defecto de
 * Node es morir de inmediato: las conexiones quedan colgando del lado de Neon
 * hasta que expiren, y los requests en vuelo se cortan a la mitad — lo que
 * importa de verdad aquí, porque hay transacciones multi-statement (las 9
 * transiciones de estado de pedido del Sprint 14, el cierre de ciclo del 6).
 *
 * Nest solo llama a esto si `app.enableShutdownHooks()` está activo — ver
 * `src/main.ts`.
 */
@Injectable()
export class CierreDePools implements OnApplicationShutdown {
  private readonly logger = new Logger(CierreDePools.name);

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    @Inject(PG_POOL_PLATAFORMA) private readonly poolPlataforma: Pool,
  ) {}

  async onApplicationShutdown(senal?: string) {
    this.logger.log(`Cerrando pools de base de datos (señal: ${senal ?? 'n/a'})`);
    // `Promise.allSettled` a propósito: si un pool ya está roto, el otro
    // igual tiene que cerrar.
    const resultados = await Promise.allSettled([
      this.pool.end(),
      this.poolPlataforma.end(),
    ]);
    for (const r of resultados) {
      if (r.status === 'rejected') {
        this.logger.error(`Error cerrando un pool: ${r.reason}`);
      }
    }
  }
}

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    CierreDePools,
    {
      provide: PG_POOL,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const connectionString = config.get<string>('DATABASE_URL');
        if (!connectionString) {
          throw new Error('DATABASE_URL no está configurada.');
        }
        return conErrorManejado(new Pool({ connectionString, ...OPCIONES_POOL }), 'app');
      },
    },
    {
      // Rol con BYPASSRLS, para endpoints de back office (ámbito PLATAFORMA)
      // que deliberadamente necesitan ver todas las empresas. Ver migrations/0004.
      provide: PG_POOL_PLATAFORMA,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const connectionString = config.get<string>('PLATFORM_DATABASE_URL');
        if (!connectionString) {
          throw new Error('PLATFORM_DATABASE_URL no está configurada.');
        }
        return conErrorManejado(
          new Pool({ connectionString, ...OPCIONES_POOL }),
          'plataforma',
        );
      },
    },
  ],
  exports: [PG_POOL, PG_POOL_PLATAFORMA],
})
export class DbModule {}
