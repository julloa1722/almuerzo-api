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

  // Sprint 20: deja que Nest reaccione a SIGTERM/SIGINT. Render manda SIGTERM
  // en cada deploy y cada vez que el servicio gratuito duerme o despierta; sin
  // esto Node muere de golpe, cortando requests en vuelo y dejando las
  // conexiones colgando del lado de Neon. Quien cierra los pools es
  // `CierreDePools`, en src/db/db.module.ts.
  app.enableShutdownHooks();

  // Sprint 20: detrás del balanceador de Render, `req.ip` devuelve la IP del
  // proxy y no la del visitante — con lo cual el rate limit de /auth/login (5
  // por minuto, src/auth/auth.module.ts) dejaría de ser por usuario y pasaría a
  // ser GLOBAL: cinco intentos fallidos de cualquiera bloquearían el login de
  // toda la plataforma durante un minuto.
  //
  // Va condicionado a propósito: activar 'trust proxy' sin un proxy delante
  // permite falsificar la IP mandando un X-Forwarded-For a mano, y con eso se
  // evade el rate limit. Por eso solo se activa donde de verdad hay proxy.
  if (config.get<string>('CONFIAR_EN_PROXY') === 'true') {
    app.getHttpAdapter().getInstance().set('trust proxy', 1);
  }

  // Sprint 10: el primer cliente real corriendo en un navegador (Vite en
  // localhost:5176 en dev). Hasta ahora nada llamaba a la API desde un
  // origen distinto (todo curl/fetch de Node), así que no hacía falta CORS.
  // Acotado a orígenes conocidos, configurable porque dev y producción son
  // dominios reales distintos — no un wildcard.
  //
  // Sprint 20: se normaliza el esquema. En el blueprint de Render esta
  // variable se enlaza al servicio del frontend con `fromService`, y Render
  // entrega el hostname pelado (`almuerzo-front.onrender.com`) sin `https://`.
  // El header `Origin` que manda el navegador SIEMPRE trae esquema, así que
  // sin esto la comparación nunca coincide y todo request queda bloqueado por
  // CORS. Como `fromService` no permite concatenar texto, se resuelve acá.
  const origenes = config
    .get<string>('CORS_ORIGENES', 'http://localhost:5176')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
    .map((o) => (/^https?:\/\//i.test(o) ? o : `https://${o}`))
    .map((o) => o.replace(/\/+$/, ''));
  app.enableCors({ origin: origenes });

  const port = Number(config.get('PORT') ?? 3000);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`almuerzo-api escuchando en el puerto ${port}`);
  // eslint-disable-next-line no-console
  console.log(`CORS permitido para: ${origenes.join(', ')}`);
}

bootstrap();
