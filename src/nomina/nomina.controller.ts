import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { Roles, RolesGuard } from '../common/roles.guard';
import { TenantContextInterceptor } from '../common/tenant-context.interceptor';
import { iso, periodoDe } from '../common/calendario.util';
import { cicloAbiertoOCrear, frecuenciaNominaDe } from '../common/libro-mayor';
import { CAMPOS_DISPONIBLES, generarCsv, PLANTILLA_DEFAULT, validarPlantilla } from './campos-reporte';
import { AjusteMovimientoDto, CerrarCicloDto, ActualizarPlantillaDto } from './dto';

@Controller('nomina')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(TenantContextInterceptor)
@Roles('RRHH', 'ADMIN_EMPRESA')
export class NominaController {
  // ---------- Ciclos ----------

  @Get('ciclos')
  async listarCiclos(@Req() req: Request) {
    const { rows } = await req.dbClient!.query(
      `SELECT id, periodo_inicio, periodo_fin, estado, cerrado_en
       FROM ciclo_nomina ORDER BY periodo_inicio DESC`,
    );
    return { ciclos: rows };
  }

  @Post('ciclos/cerrar')
  async cerrarCiclo(@Req() req: Request, @Body() dto: CerrarCicloDto) {
    const empresaId = req.ambito!.id as number;
    const db = req.dbClient!;

    let periodo: { inicio: string; fin: string };
    if (dto.periodoInicio && dto.periodoFin) {
      periodo = { inicio: dto.periodoInicio, fin: dto.periodoFin };
    } else {
      const frecuencia = await frecuenciaNominaDe(db, empresaId);
      periodo = periodoDe(new Date(), frecuencia);
    }

    const { rows: empresaRows } = await db.query(
      'SELECT permite_cierre_con_pendientes FROM empresa WHERE id = $1',
      [empresaId],
    );
    const permitePendientes = empresaRows[0]?.permite_cierre_con_pendientes ?? false;

    if (!permitePendientes) {
      const { rows: pendientes } = await db.query(
        `SELECT id FROM pedido
         WHERE fecha_servicio BETWEEN $1 AND $2 AND estado IN ('ENTREGADO','DISPUTA')
         LIMIT 1`,
        [periodo.inicio, periodo.fin],
      );
      if (pendientes.length) {
        throw new ForbiddenException(
          `Hay pedidos ENTREGADO o DISPUTA sin resolver entre ${periodo.inicio} y ${periodo.fin}. ` +
            'Resuélvelos antes de cerrar, o activa permite_cierre_con_pendientes para esta empresa.',
        );
      }
    }

    const cicloId = await cicloAbiertoOCrear(db, empresaId, periodo);
    const { rows: actual } = await db.query('SELECT estado FROM ciclo_nomina WHERE id = $1', [cicloId]);
    if (actual[0].estado === 'CERRADO') {
      throw new ForbiddenException('Ese ciclo ya está cerrado.');
    }

    const { rows } = await db.query(
      `UPDATE ciclo_nomina SET estado = 'CERRADO', cerrado_en = now(), cerrado_por = $2
       WHERE id = $1
       RETURNING id, periodo_inicio, periodo_fin, estado, cerrado_en`,
      [cicloId, req.usuarioId],
    );
    return rows[0];
  }

  // ---------- Libro mayor: consulta y correcciones manuales ----------

  /**
   * Sprint 12, subsprint 12.1: no existía forma de listar `movimiento` en
   * crudo — solo el CSV ya agregado por colaborador (`archivo-descuento`).
   * RRHH necesita ver el detalle día a día, no solo el archivo final al
   * cerrar. Sin escritura: `movimiento` sigue append-only.
   */
  /**
   * Sprint 19, subsprint 19.3: RRHH hoy navega directo a sus pestañas de
   * trabajo, sin una vista general al entrar. Solo lectura — no crea el
   * ciclo del período si todavía no existe (a diferencia de
   * `postearCargo`, que sí lo crea perezosamente al postear un cargo real;
   * ver un resumen no debería tener ese efecto secundario).
   */
  @Get('resumen')
  async resumen(@Req() req: Request) {
    const empresaId = req.ambito!.id as number;
    const db = req.dbClient!;

    const { rows: dispRows } = await db.query(`SELECT COUNT(*) AS cantidad FROM pedido WHERE estado = 'DISPUTA'`);
    const disputasPendientes = Number(dispRows[0].cantidad);

    const { rows: colabRows } = await db.query(
      `SELECT
         COUNT(*) AS activos,
         COUNT(*) FILTER (
           WHERE NOT EXISTS (
             SELECT 1 FROM asignacion_programa ap
             WHERE ap.colaborador_id = colaborador.id
               AND ap.vigente_desde <= CURRENT_DATE
               AND (ap.vigente_hasta IS NULL OR ap.vigente_hasta >= CURRENT_DATE)
           )
         ) AS sin_programa
       FROM colaborador WHERE estado = 'ACTIVO'`,
    );

    const frecuencia = await frecuenciaNominaDe(db, empresaId);
    const periodo = periodoDe(new Date(), frecuencia);
    const { rows: cicloRows } = await db.query(
      `SELECT id, periodo_inicio, periodo_fin, estado FROM ciclo_nomina
       WHERE empresa_id = $1 AND periodo_inicio = $2 AND periodo_fin = $3`,
      [empresaId, periodo.inicio, periodo.fin],
    );
    let cicloActual = null;
    if (cicloRows.length) {
      const { rows: movRows } = await db.query(
        `SELECT COUNT(*) AS cantidad,
                COALESCE(SUM(CASE WHEN tipo = 'CARGO' THEN monto ELSE -monto END), 0) AS total
         FROM movimiento WHERE ciclo_nomina_id = $1`,
        [cicloRows[0].id],
      );
      cicloActual = { ...cicloRows[0], movimientos: Number(movRows[0].cantidad), total: movRows[0].total };
    }

    return {
      disputasPendientes,
      colaboradoresActivos: Number(colabRows[0].activos),
      colaboradoresSinPrograma: Number(colabRows[0].sin_programa),
      periodoActual: periodo,
      cicloActual,
    };
  }

  @Get('movimientos')
  async listarMovimientos(@Req() req: Request, @Query('cicloId') cicloIdQ?: string) {
    const cicloId = cicloIdQ ? Number(cicloIdQ) : null;
    const { rows } = await req.dbClient!.query(
      `SELECT m.id, m.creado_en, m.tipo, m.monto, m.motivo, m.pedido_id, m.ciclo_nomina_id,
              c.nombre_completo AS colaborador
       FROM movimiento m
       JOIN colaborador c ON c.id = m.colaborador_id
       WHERE ($1::bigint IS NULL OR m.ciclo_nomina_id = $1)
       ORDER BY m.creado_en DESC
       LIMIT 200`,
      [cicloId],
    );
    return { movimientos: rows };
  }

  @Post('movimientos/ajuste')
  async ajusteManual(@Req() req: Request, @Body() dto: AjusteMovimientoDto) {
    const empresaId = req.ambito!.id as number;
    const db = req.dbClient!;

    if (!['CARGO', 'NOTA_CREDITO'].includes(dto.tipo)) {
      throw new BadRequestException("tipo debe ser 'CARGO' o 'NOTA_CREDITO'.");
    }
    if (!(Number(dto.monto) > 0)) throw new BadRequestException('monto debe ser mayor que 0.');
    if (!dto.motivo?.trim()) throw new BadRequestException('motivo es obligatorio para una corrección manual.');

    const { rows: colabRows } = await db.query('SELECT id FROM colaborador WHERE id = $1', [dto.colaboradorId]);
    if (!colabRows.length) throw new NotFoundException('Colaborador no encontrado en esta empresa.');

    const frecuencia = await frecuenciaNominaDe(db, empresaId);
    const periodoActual = periodoDe(new Date(), frecuencia);
    const cicloId = await cicloAbiertoOCrear(db, empresaId, periodoActual);

    const { rows } = await db.query(
      `INSERT INTO movimiento (empresa_id, colaborador_id, ciclo_nomina_id, tipo, monto, motivo, creado_por)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, tipo, monto, motivo, creado_en, ciclo_nomina_id`,
      [empresaId, dto.colaboradorId, cicloId, dto.tipo, dto.monto, dto.motivo.trim(), req.usuarioId],
    );
    return rows[0];
  }

  // ---------- Plantilla del archivo de descuento ----------

  @Get('plantilla-descuento')
  async verPlantilla(@Req() req: Request) {
    const empresaId = req.ambito!.id as number;
    const { rows } = await req.dbClient!.query(
      'SELECT campos FROM plantilla_reporte_descuento WHERE empresa_id = $1',
      [empresaId],
    );
    return {
      campos: rows[0]?.campos ?? PLANTILLA_DEFAULT,
      catalogoDisponible: CAMPOS_DISPONIBLES,
    };
  }

  @Put('plantilla-descuento')
  async guardarPlantilla(@Req() req: Request, @Body() dto: ActualizarPlantillaDto) {
    const empresaId = req.ambito!.id as number;
    let campos;
    try {
      campos = validarPlantilla(dto.campos);
    } catch (err) {
      throw new BadRequestException((err as Error).message);
    }

    const { rows } = await req.dbClient!.query(
      `INSERT INTO plantilla_reporte_descuento (empresa_id, campos, actualizado_en)
       VALUES ($1, $2::jsonb, now())
       ON CONFLICT (empresa_id) DO UPDATE SET campos = EXCLUDED.campos, actualizado_en = now()
       RETURNING campos`,
      [empresaId, JSON.stringify(campos)],
    );
    return { campos: rows[0].campos };
  }

  // ---------- Archivo de descuento ----------

  @Get('ciclos/:id/archivo-descuento')
  async archivoDescuento(@Req() req: Request, @Res({ passthrough: true }) res: Response, @Param('id', ParseIntPipe) id: number) {
    const empresaId = req.ambito!.id as number;
    const db = req.dbClient!;

    const { rows: cicloRows } = await db.query(
      'SELECT id, periodo_inicio, periodo_fin FROM ciclo_nomina WHERE id = $1',
      [id],
    );
    if (!cicloRows.length) throw new NotFoundException('Ciclo no encontrado.');
    const ciclo = cicloRows[0];

    const { rows: plantillaRows } = await db.query(
      'SELECT campos FROM plantilla_reporte_descuento WHERE empresa_id = $1',
      [empresaId],
    );
    const plantilla = validarPlantilla(plantillaRows[0]?.campos ?? PLANTILLA_DEFAULT);

    const { rows: filas } = await db.query(
      `SELECT c.codigo_nomina, c.cedula, c.nombre_completo, pe.nombre AS punto_entrega,
              COUNT(*) FILTER (WHERE m.tipo = 'CARGO' AND m.pedido_id IS NOT NULL) AS cantidad_pedidos,
              COALESCE(SUM(CASE WHEN m.tipo = 'CARGO' THEN m.monto ELSE -m.monto END), 0) AS monto_total,
              COALESCE(SUM(CASE WHEN m.tipo = 'CARGO' AND m.pedido_id IS NOT NULL THEN p.subsidio_empresa ELSE 0 END), 0) AS subsidio_total_empresa
       FROM movimiento m
       JOIN colaborador c ON c.id = m.colaborador_id
       LEFT JOIN punto_entrega pe ON pe.id = c.punto_entrega_id
       LEFT JOIN pedido p ON p.id = m.pedido_id
       WHERE m.ciclo_nomina_id = $1
       GROUP BY c.id, c.codigo_nomina, c.cedula, c.nombre_completo, pe.nombre
       ORDER BY c.nombre_completo`,
      [id],
    );

    const periodoInicio = iso(new Date(ciclo.periodo_inicio));
    const periodoFin = iso(new Date(ciclo.periodo_fin));
    const filasConPeriodo = filas.map((f: Record<string, unknown>) => ({
      ...f,
      periodo_inicio: periodoInicio,
      periodo_fin: periodoFin,
    }));

    const csv = generarCsv(plantilla, filasConPeriodo);
    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="descuento_${periodoInicio}_${periodoFin}.csv"`,
    });
    return csv;
  }
}
