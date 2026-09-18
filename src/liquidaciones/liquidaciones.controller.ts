import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { Roles, RolesGuard } from '../common/roles.guard';
import { TenantContextInterceptor } from '../common/tenant-context.interceptor';
import { iso, periodoDe } from '../common/calendario.util';
import { enviarNotificacion } from '../common/notificaciones';
import { CalcularLiquidacionDto, MarcarPagadoDto } from './dto';

/**
 * Ámbito mixto, igual que PedidosController: sin @Roles a nivel de clase,
 * cada método declara el suyo. Plataforma (SUPERADMIN/SOPORTE) calcula y
 * paga, vía almuerzo_platform (BYPASSRLS) — necesita agregar pedidos de
 * cualquier empresa por suplidor. Un SUPLIDOR_ADMIN solo puede leer sus
 * propios lotes, acotado por la política RLS de la migración 11.
 */
@Controller('liquidaciones')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(TenantContextInterceptor)
export class LiquidacionesController {
  @Post('calcular')
  @Roles('SUPERADMIN', 'SOPORTE')
  async calcular(@Req() req: Request, @Body() dto: CalcularLiquidacionDto) {
    const db = req.dbClient!;
    if (!dto.suplidorId) throw new BadRequestException('suplidorId es obligatorio.');

    const { rows: supRows } = await db.query(
      'SELECT frecuencia_liquidacion, permite_liquidacion_con_pendientes FROM suplidor WHERE id = $1',
      [dto.suplidorId],
    );
    if (!supRows.length) throw new NotFoundException('Suplidor no encontrado.');
    const suplidor = supRows[0];

    const periodo =
      dto.periodoInicio && dto.periodoFin
        ? { inicio: dto.periodoInicio, fin: dto.periodoFin }
        : periodoDe(new Date(), suplidor.frecuencia_liquidacion);

    const { rows: existente } = await db.query(
      `SELECT id, estado FROM lote_pago_suplidor WHERE suplidor_id = $1 AND periodo_inicio = $2 AND periodo_fin = $3`,
      [dto.suplidorId, periodo.inicio, periodo.fin],
    );
    if (existente.length) {
      throw new ForbiddenException(
        `Ya existe un lote ${existente[0].estado} para ese suplidor y período (id ${existente[0].id}).`,
      );
    }

    if (!suplidor.permite_liquidacion_con_pendientes) {
      const { rows: pendientes } = await db.query(
        `SELECT id FROM pedido
         WHERE suplidor_id = $1 AND fecha_servicio BETWEEN $2 AND $3 AND estado IN ('ENTREGADO','DISPUTA')
         LIMIT 1`,
        [dto.suplidorId, periodo.inicio, periodo.fin],
      );
      if (pendientes.length) {
        throw new ForbiddenException(
          `Hay pedidos ENTREGADO o DISPUTA sin resolver de este suplidor entre ${periodo.inicio} y ${periodo.fin}. ` +
            'Resuélvelos antes de calcular, o activa permite_liquidacion_con_pendientes para este suplidor.',
        );
      }
    }

    const { rows: agregado } = await db.query(
      `SELECT COALESCE(SUM(total_bruto),0) AS monto, COUNT(*) AS cantidad FROM pedido
       WHERE suplidor_id = $1 AND fecha_servicio BETWEEN $2 AND $3 AND estado = 'RECIBIDO'`,
      [dto.suplidorId, periodo.inicio, periodo.fin],
    );

    const { rows } = await db.query(
      `INSERT INTO lote_pago_suplidor (suplidor_id, periodo_inicio, periodo_fin, monto_total, cantidad_pedidos, calculado_por)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, suplidor_id, periodo_inicio, periodo_fin, estado, monto_total, cantidad_pedidos, calculado_en`,
      [dto.suplidorId, periodo.inicio, periodo.fin, agregado[0].monto, agregado[0].cantidad, req.usuarioId],
    );
    return rows[0];
  }

  @Get()
  @Roles('SUPERADMIN', 'SOPORTE', 'SUPLIDOR_ADMIN')
  async listar(@Req() req: Request) {
    const { rows } = await req.dbClient!.query(
      `SELECT lps.id, lps.suplidor_id, s.nombre AS suplidor_nombre, lps.periodo_inicio, lps.periodo_fin,
              lps.estado, lps.monto_total, lps.cantidad_pedidos, lps.calculado_en, lps.pagado_en
       FROM lote_pago_suplidor lps
       JOIN suplidor s ON s.id = lps.suplidor_id
       ORDER BY lps.periodo_inicio DESC`,
    );
    return { lotes: rows };
  }

  @Get(':id')
  @Roles('SUPERADMIN', 'SOPORTE', 'SUPLIDOR_ADMIN')
  async detalle(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    const db = req.dbClient!;
    const { rows } = await db.query('SELECT * FROM lote_pago_suplidor WHERE id = $1', [id]);
    if (!rows.length) throw new NotFoundException('Lote no encontrado.');
    const lote = rows[0];

    // Desglose informativo: los pedidos que explican el monto_total.
    // Segundo bug real, encontrado en la misma verificación: la primera
    // versión hacía JOIN colaborador para mostrar el nombre — pero
    // `colaborador` tiene RLS por empresa_id (Sprint 1), invisible en
    // ámbito SUPLIDOR, así que el JOIN eliminaba TODAS las filas (mismo
    // patrón de bug que contrato_suplidor en el Sprint 5, migración 9). Se
    // reemplaza por `empresa` (sin RLS propia) — además de evitar el bug,
    // es la información correcta: el suplidor necesita saber de qué
    // empresa es cada pedido, no qué colaborador individual lo hizo (PII
    // que no le corresponde ver).
    //
    // En ámbito SUPLIDOR, la RLS de `pedido` (Sprint 5) solo deja ver
    // pedidos de empresas con contrato_suplidor todavía ACTIVO — si un
    // contrato se desactivó después de la entrega, ese pedido puede faltar
    // aquí aunque sí se haya contado en monto_total al calcular. Limitación
    // conocida, documentada en plan-sprints.md.
    //
    // periodo_inicio/fin vuelven de Postgres como objetos Date (columna
    // DATE) — pasarlos tal cual a otra consulta los serializa como
    // timestamp con hora/UTC y desplaza el rango (tercer bug real de esta
    // verificación). Se normalizan a fecha ISO simple con el mismo helper
    // que ya usa el resto del código.
    const { rows: pedidos } = await db.query(
      `SELECT p.id, p.fecha_servicio, p.empresa_id, e.nombre AS empresa_nombre, p.total_bruto
       FROM pedido p
       JOIN empresa e ON e.id = p.empresa_id
       WHERE p.suplidor_id = $1 AND p.fecha_servicio BETWEEN $2::date AND $3::date AND p.estado = 'RECIBIDO'
       ORDER BY p.fecha_servicio`,
      [lote.suplidor_id, iso(new Date(lote.periodo_inicio)), iso(new Date(lote.periodo_fin))],
    );

    return { ...lote, pedidos };
  }

  @Patch(':id/marcar-pagado')
  @Roles('SUPERADMIN', 'SOPORTE')
  async marcarPagado(@Req() req: Request, @Param('id', ParseIntPipe) id: number, @Body() dto: MarcarPagadoDto) {
    if (!dto.referenciaPago?.trim()) throw new BadRequestException('referenciaPago es obligatoria.');
    const db = req.dbClient!;

    const { rows } = await db.query(
      `SELECT lps.id, lps.estado, lps.monto_total, s.email_contacto, s.nombre AS suplidor_nombre
       FROM lote_pago_suplidor lps JOIN suplidor s ON s.id = lps.suplidor_id
       WHERE lps.id = $1`,
      [id],
    );
    if (!rows.length) throw new NotFoundException('Lote no encontrado.');
    if (rows[0].estado === 'PAGADO') throw new ForbiddenException('Ese lote ya está marcado como pagado.');

    const { rows: actualizado } = await db.query(
      `UPDATE lote_pago_suplidor SET estado = 'PAGADO', pagado_en = now(), pagado_por = $2, referencia_pago = $3
       WHERE id = $1
       RETURNING id, estado, pagado_en, referencia_pago`,
      [id, req.usuarioId, dto.referenciaPago.trim()],
    );

    await enviarNotificacion(db, {
      tipo: 'LOTE_PAGADO',
      destinatario: rows[0].email_contacto,
      asunto: 'Se procesó el pago de tu liquidación',
      cuerpo: `Hola ${rows[0].suplidor_nombre}, se marcó como pagada tu liquidación por RD$ ${rows[0].monto_total} (referencia: ${dto.referenciaPago.trim()}).`,
      referenciaTipo: 'LOTE_PAGO_SUPLIDOR',
      referenciaId: id,
    });

    return actualizado[0];
  }
}
