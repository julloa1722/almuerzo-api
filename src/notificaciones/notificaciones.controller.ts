import { Controller, Get, Query, Req, UseGuards, UseInterceptors } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { Roles, RolesGuard } from '../common/roles.guard';
import { TenantContextInterceptor } from '../common/tenant-context.interceptor';

/**
 * Solo lectura, solo plataforma: es la auditoría de envíos (Sprint 9.2), y
 * expone destinatarios (emails de colaboradores/suplidores) que no le
 * corresponde ver a RRHH de una sola empresa.
 */
@Controller('notificaciones')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(TenantContextInterceptor)
export class NotificacionesController {
  @Get()
  @Roles('SUPERADMIN', 'SOPORTE')
  async listar(
    @Req() req: Request,
    @Query('tipo') tipo?: string,
    @Query('referenciaTipo') referenciaTipo?: string,
    @Query('referenciaId') referenciaId?: string,
  ) {
    const condiciones: string[] = [];
    const params: unknown[] = [];
    if (tipo) {
      params.push(tipo);
      condiciones.push(`tipo = $${params.length}`);
    }
    if (referenciaTipo) {
      params.push(referenciaTipo);
      condiciones.push(`referencia_tipo = $${params.length}`);
    }
    if (referenciaId) {
      params.push(Number(referenciaId));
      condiciones.push(`referencia_id = $${params.length}`);
    }
    const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
    const { rows } = await req.dbClient!.query(
      `SELECT id, tipo, destinatario, asunto, estado, referencia_tipo, referencia_id, detalle_error, creado_en
       FROM notificacion_enviada ${where}
       ORDER BY creado_en DESC
       LIMIT 200`,
      params,
    );
    return { notificaciones: rows };
  }
}
