import { Controller, Get, Query, Req, UseGuards, UseInterceptors } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { Roles, RolesGuard } from '../common/roles.guard';
import { TenantContextInterceptor } from '../common/tenant-context.interceptor';
import { iso, proximosHabiles } from '../common/calendario.util';

/**
 * Reportes de solo lectura, agregando sobre tablas que ya existen — sin
 * tablas nuevas. Cada query corre en la transacción con el ámbito ya
 * resuelto (TenantContextInterceptor), así que el aislamiento RLS existente
 * se aplica solo: RRHH/ADMIN_EMPRESA nunca ve otra empresa, SUPLIDOR_ADMIN
 * nunca ve otro suplidor. Solo plataforma (bypass) ve todo, y únicamente en
 * los reportes agregados (gasto-empresa, entregas-suplidor, disputas) —
 * consumo-colaborador es a propósito exclusivo de la propia empresa: es
 * información a nivel de persona, no le corresponde a un ámbito cruzado.
 *
 * `consumo-colaborador` y `gasto-empresa` son sobre DINERO — por eso salen
 * de `movimiento` (el libro mayor, Sprint 6: "la fuente de verdad de lo ya
 * asentado"), no de `pedido` directo. Solo cuentan pedidos que llegaron a
 * `RECIBIDO` (tienen un `CARGO` posteado) — un pedido todavía
 * `CONFIRMADO`/`EN_PREPARACION`/`ENTREGADO`/`DISPUTA` no aparece aquí hasta
 * que se resuelva, ni tampoco uno `NO_ENTREGADO` (nunca posteó cargo).
 * `entregas-suplidor` y `disputas` sí siguen sobre `pedido` directo — son
 * conteos de estado/disputa, no de dinero, y esas columnas (`estado`,
 * `motivo_disputa`, `resolucion_disputa`) no existen en `movimiento`.
 */
@Controller('reportes')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(TenantContextInterceptor)
export class ReportesController {
  @Get('consumo-colaborador')
  @Roles('RRHH', 'ADMIN_EMPRESA')
  async consumoColaborador(@Req() req: Request, @Query('desde') desdeQ?: string, @Query('hasta') hastaQ?: string) {
    const { desde, hasta } = this.rango(desdeQ, hastaQ);
    const { rows } = await req.dbClient!.query(
      `WITH cargos AS (
         SELECT m.colaborador_id, m.pedido_id, m.monto AS monto_colaborador, p.total_bruto, p.subsidio_empresa
         FROM movimiento m
         JOIN pedido p ON p.id = m.pedido_id
         WHERE m.tipo = 'CARGO' AND p.fecha_servicio BETWEEN $1 AND $2
       )
       SELECT c.id, c.codigo_nomina, c.nombre_completo,
              COUNT(cg.pedido_id) AS cantidad_pedidos,
              COALESCE(SUM(cg.total_bruto), 0) AS total_bruto,
              COALESCE(SUM(cg.subsidio_empresa), 0) AS subsidio_total,
              COALESCE(SUM(cg.monto_colaborador), 0) AS monto_colaborador_total
       FROM colaborador c
       LEFT JOIN cargos cg ON cg.colaborador_id = c.id
       GROUP BY c.id, c.codigo_nomina, c.nombre_completo
       ORDER BY c.nombre_completo`,
      [desde, hasta],
    );
    return { desde, hasta, colaboradores: rows };
  }

  @Get('gasto-empresa')
  @Roles('RRHH', 'ADMIN_EMPRESA', 'SUPERADMIN', 'SOPORTE')
  async gastoEmpresa(@Req() req: Request, @Query('desde') desdeQ?: string, @Query('hasta') hastaQ?: string) {
    const { desde, hasta } = this.rango(desdeQ, hastaQ);
    const esPlataforma = req.ambito!.tipo === 'PLATAFORMA';

    const { rows } = await req.dbClient!.query(
      `WITH cargos AS (
         SELECT m.empresa_id, m.colaborador_id, m.pedido_id, p.subsidio_empresa
         FROM movimiento m
         JOIN pedido p ON p.id = m.pedido_id
         WHERE m.tipo = 'CARGO' AND p.fecha_servicio BETWEEN $1 AND $2
       )
       SELECT e.id, e.nombre,
              COUNT(DISTINCT cg.colaborador_id) AS colaboradores_activos,
              COUNT(cg.pedido_id) AS cantidad_pedidos,
              COALESCE(SUM(cg.subsidio_empresa), 0) AS subsidio_total
       FROM empresa e
       LEFT JOIN cargos cg ON cg.empresa_id = e.id
       ${esPlataforma ? '' : 'WHERE e.id = $3'}
       GROUP BY e.id, e.nombre
       ORDER BY e.nombre`,
      esPlataforma ? [desde, hasta] : [desde, hasta, req.ambito!.id],
    );
    return { desde, hasta, empresas: rows };
  }

  @Get('entregas-suplidor')
  @Roles('SUPLIDOR_ADMIN', 'SUPERADMIN', 'SOPORTE')
  async entregasSuplidor(@Req() req: Request, @Query('desde') desdeQ?: string, @Query('hasta') hastaQ?: string) {
    const { desde, hasta } = this.rango(desdeQ, hastaQ);
    const esPlataforma = req.ambito!.tipo === 'PLATAFORMA';

    const { rows } = await req.dbClient!.query(
      `SELECT s.id, s.nombre,
              COUNT(*) FILTER (WHERE p.estado = 'RECIBIDO') AS recibidos,
              COUNT(*) FILTER (WHERE p.estado = 'NO_ENTREGADO') AS no_entregados,
              COUNT(*) FILTER (WHERE p.estado = 'DISPUTA') AS en_disputa,
              COUNT(*) FILTER (WHERE p.estado = 'CANCELADO') AS cancelados,
              COUNT(*) AS total
       FROM suplidor s
       LEFT JOIN pedido p ON p.suplidor_id = s.id AND p.fecha_servicio BETWEEN $1 AND $2
       ${esPlataforma ? '' : 'WHERE s.id = $3'}
       GROUP BY s.id, s.nombre
       ORDER BY s.nombre`,
      esPlataforma ? [desde, hasta] : [desde, hasta, req.ambito!.id],
    );

    const suplidores = rows.map((r: Record<string, unknown>) => {
      const total = Number(r.total);
      const enDisputa = Number(r.en_disputa);
      return { ...r, tasaDisputasPct: total > 0 ? Math.round((enDisputa / total) * 10000) / 100 : 0 };
    });
    return { desde, hasta, suplidores };
  }

  @Get('disputas')
  @Roles('RRHH', 'ADMIN_EMPRESA', 'SUPERADMIN', 'SOPORTE')
  async disputas(@Req() req: Request, @Query('desde') desdeQ?: string, @Query('hasta') hastaQ?: string) {
    const { desde, hasta } = this.rango(desdeQ, hastaQ);
    const { rows } = await req.dbClient!.query(
      `SELECT motivo_disputa, resolucion_disputa, COUNT(*) AS cantidad
       FROM pedido
       WHERE disputado_en IS NOT NULL AND fecha_servicio BETWEEN $1 AND $2
       GROUP BY motivo_disputa, resolucion_disputa
       ORDER BY cantidad DESC`,
      [desde, hasta],
    );
    return { desde, hasta, disputas: rows };
  }

  private rango(desdeQ?: string, hastaQ?: string): { desde: string; hasta: string } {
    const hasta = hastaQ ?? iso(new Date());
    const desde = desdeQ ?? iso(new Date(Date.now() - 30 * 86400000));
    return { desde, hasta };
  }

  // ---------- Sprint 14: dashboard de plataforma ----------

  /**
   * `ingresoPropio` es un estimado informativo (gmv × tasaComisionPct) —
   * no descuenta nada de la liquidación real a suplidores (Sprint 7 sigue
   * pagando el 100% del total_bruto ajustado). Ver plan-sprints.md,
   * Sprint 14, decisión 1.
   */
  @Get('dashboard-plataforma')
  @Roles('SUPERADMIN', 'SOPORTE')
  async dashboardPlataforma(@Req() req: Request) {
    const db = req.dbClient!;

    const { rows: gmvRows } = await db.query(
      `SELECT COUNT(*) AS cantidad, COALESCE(SUM(total_bruto), 0) AS gmv, COALESCE(SUM(subsidio_empresa), 0) AS subsidio_total
       FROM pedido WHERE estado = 'RECIBIDO'`,
    );
    const gmvConfirmado = Number(gmvRows[0].gmv);
    const cantidadPedidosRecibidos = Number(gmvRows[0].cantidad);
    const subsidioTotalEmpresas = Number(gmvRows[0].subsidio_total);

    const { rows: cfgRows } = await db.query('SELECT tasa_comision_pct FROM configuracion_plataforma WHERE id = 1');
    const tasaComisionPct = Number(cfgRows[0]?.tasa_comision_pct ?? 0);
    const ingresoPropio = Math.round(gmvConfirmado * tasaComisionPct) / 100;

    const { rows: pedidosPorEstado } = await db.query(
      `SELECT estado, COUNT(*) AS cantidad FROM pedido GROUP BY estado ORDER BY estado`,
    );

    const { rows: suplidores } = await db.query(`SELECT id, nombre FROM suplidor WHERE estado = 'ACTIVO' ORDER BY nombre`);
    const fechas = proximosHabiles(new Date(), 10, new Set());
    const coberturaMenu = [];
    for (const s of suplidores) {
      const { rows: pubRows } = await db.query(
        `SELECT DISTINCT fecha::text AS fecha FROM menu_dia WHERE suplidor_id = $1 AND fecha = ANY($2::date[])`,
        [s.id, fechas],
      );
      coberturaMenu.push({
        suplidorId: s.id,
        suplidorNombre: s.nombre,
        diasPublicados: pubRows.length,
        diasTotal: fechas.length,
      });
    }

    return {
      gmvConfirmado,
      cantidadPedidosRecibidos,
      subsidioTotalEmpresas,
      ingresoPropio,
      tasaComisionPct,
      pedidosPorEstado,
      coberturaMenu,
    };
  }

  @Get('trazabilidad')
  @Roles('SUPERADMIN', 'SOPORTE')
  async trazabilidad(@Req() req: Request, @Query('desde') desdeQ?: string, @Query('hasta') hastaQ?: string) {
    const { desde, hasta } = this.rango(desdeQ, hastaQ);
    const { rows } = await req.dbClient!.query(
      `SELECT pe.id, pe.pedido_id, pe.estado_anterior, pe.estado_nuevo, pe.actor, pe.creado_en,
              e.nombre AS empresa_nombre, p.fecha_servicio
       FROM pedido_evento pe
       JOIN empresa e ON e.id = pe.empresa_id
       JOIN pedido p ON p.id = pe.pedido_id
       WHERE pe.creado_en::date BETWEEN $1 AND $2
       ORDER BY pe.creado_en DESC
       LIMIT 200`,
      [desde, hasta],
    );
    return { eventos: rows };
  }
}
