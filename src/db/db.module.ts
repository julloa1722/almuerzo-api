import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Pool } from 'pg';

export const PG_POOL = 'PG_POOL';
export const PG_POOL_PLATAFORMA = 'PG_POOL_PLATAFORMA';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: PG_POOL,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const connectionString = config.get<string>('DATABASE_URL');
        if (!connectionString) {
          throw new Error('DATABASE_URL no está configurada.');
        }
        return new Pool({ connectionString });
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
        return new Pool({ connectionString });
      },
    },
  ],
  exports: [PG_POOL, PG_POOL_PLATAFORMA],
})
export class DbModule {}
