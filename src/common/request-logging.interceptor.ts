import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * Rutas que llevan un secreto de un solo uso en la URL, y el grupo a
 * enmascarar.
 *
 * Sprint 20: sin esto, cada request a estas rutas dejaba el token completo
 * escrito en los logs de Render, en texto plano. Quien pudiera leer los logs
 * —o cualquier servicio al que se reenviaran— podía tomar una invitación
 * ajena o restablecer la contraseña de otro, porque el token ES la
 * credencial. El arreglo de fondo sería moverlos al body; enmascarar aquí
 * resuelve la fuga sin cambiar el contrato de la API ni el frontend.
 */
const RUTAS_CON_SECRETO = [
  /^(\/invitaciones\/)[^/?]+/,
  /^(\/auth\/restablecer-password\/)[^/?]+/,
];

function enmascararSecretos(url: string): string {
  for (const patron of RUTAS_CON_SECRETO) {
    if (patron.test(url)) return url.replace(patron, '$1***');
  }
  return url;
}

/**
 * Logging estructurado básico (Sprint 9.3): método, ruta, status, duración.
 * A stdout, sin servicio externo — Render (y cualquier plataforma de
 * hosting moderna) ya captura stdout por defecto.
 */
@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    const inicio = Date.now();
    const ruta = enmascararSecretos(req.originalUrl);

    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.log(`${req.method} ${ruta} ${res.statusCode} ${Date.now() - inicio}ms`);
        },
        error: (err: Error & { status?: number }) => {
          this.logger.warn(`${req.method} ${ruta} ${err.status ?? 500} ${Date.now() - inicio}ms — ${err.message}`);
        },
      }),
    );
  }
}
