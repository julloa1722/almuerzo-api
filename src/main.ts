import 'reflect-metadata';
import 'dotenv/config';
import './common/pg-tipos';
import helmet from 'helmet';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { RequestLoggingInterceptor } from './common/request-logging.interceptor';
import { validarVariablesDeEntorno } from './common/validar-entorno';

async function bootstrap() {
  // Antes de construir el módulo de Nest — falla rápido con un mensaje
  // claro, no a medias en el primer request que necesite la variable.
  validarVariablesDeEntorno();

  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  app.useGlobalInterceptors(new RequestLoggingInterceptor());

  const config = app.get(ConfigService);

  // Sprint 10: el primer cliente real corriendo en un navegador (Vite en
  // localhost:5173 en dev). Hasta ahora nada llamaba a la API desde un
  // origen distinto (todo curl/fetch de Node), así que no hacía falta CORS.
  // Acotado a orígenes conocidos, configurable porque dev y producción son
  // dominios reales distintos — no un wildcard.
  const origenes = config
    .get<string>('CORS_ORIGENES', 'http://localhost:5176')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({ origin: origenes });

  const port = config.get<number>('PORT', 3000);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`almuerzo-api escuchando en http://localhost:${port}`);
}

bootstrap();
