import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

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

    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - inicio}ms`);
        },
        error: (err: Error & { status?: number }) => {
          this.logger.warn(`${req.method} ${req.originalUrl} ${err.status ?? 500} ${Date.now() - inicio}ms — ${err.message}`);
        },
      }),
    );
  }
}
