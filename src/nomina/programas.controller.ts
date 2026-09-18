import {
  BadRequestException,
  Body,
  Controller,
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
import { CrearAsignacionDto, CrearProgramaDto, EditarProgramaDto, FinalizarAsignacionDto } from './dto';

const TIPOS_SUBSIDIO = ['MONTO_FIJO', 'PORCENTAJE', 'TOTAL'];

/**
 * Sprint 12, subsprint 12.1: gap documentado desde el Sprint 9 — hasta
 * ahora solo `scripts/seed.js` inserta `programa_beneficio` directo en la
 * base. Sin esto, una empresa nueva dada de alta por el back office no
 * tiene forma de que ninguno de sus colaboradores pueda pedir almuerzo
 * (el motor de elegibilidad del Sprint 4 exige una `asignacion_programa`
 * vigente). Mismo ámbito que el resto de `nomina`: RRHH/ADMIN_EMPRESA,
 * empresa propia vía RLS.
 */
@Controller('programas')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(TenantContextInterceptor)
@Roles('RRHH', 'ADMIN_EMPRESA')
export class ProgramasController {
  @Get()
  async listar(@Req() req: Request) {
    const { rows } = await req.dbClient!.query(
      `SELECT id, tipo, nombre, tipo_subsidio, valor_subsidio, tope_diario_subsidio,
              tope_ciclo_colaborador, permite_excedente, dias_semana, pct_max_salario, estado
       FROM programa_beneficio ORDER BY nombre`,
    );
    return { programas: rows };
  }

  @Post()
  async crear(@Req() req: Request, @Body() dto: CrearProgramaDto) {
    if (!dto.nombre?.trim()) throw new BadRequestException('nombre es obligatorio.');
    if (!TIPOS_SUBSIDIO.includes(dto.tipoSubsidio)) {
      throw new BadRequestException(`tipoSubsidio debe ser uno de: ${TIPOS_SUBSIDIO.join(', ')}.`);
    }
    if (!(Number(dto.valorSubsidio) >= 0)) throw new BadRequestException('valorSubsidio debe ser un número >= 0.');

    const empresaId = req.ambito!.id as number;
    const { rows } = await req.dbClient!.query(
      `INSERT INTO programa_beneficio
         (empresa_id, nombre, tipo_subsidio, valor_subsidio, tope_diario_subsidio,
          tope_ciclo_colaborador, permite_excedente, dias_semana, pct_max_salario)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, tipo, nombre, tipo_subsidio, valor_subsidio, tope_diario_subsidio,
                 tope_ciclo_colaborador, permite_excedente, dias_semana, pct_max_salario, estado`,
      [
        empresaId,
        dto.nombre.trim(),
        dto.tipoSubsidio,
        dto.valorSubsidio,
        dto.topeDiarioSubsidio ?? null,
        dto.topeCicloColaborador ?? null,
        dto.permiteExcedente ?? true,
        dto.diasSemana ?? [1, 2, 3, 4, 5],
        dto.pctMaxSalario ?? 15.0,
      ],
    );
    return rows[0];
  }

  @Patch(':id')
  async editar(@Req() req: Request, @Param('id', ParseIntPipe) id: number, @Body() dto: EditarProgramaDto) {
    if (dto.tipoSubsidio && !TIPOS_SUBSIDIO.includes(dto.tipoSubsidio)) {
      throw new BadRequestException(`tipoSubsidio debe ser uno de: ${TIPOS_SUBSIDIO.join(', ')}.`);
    }
    if (dto.estado && !['ACTIVO', 'INACTIVO'].includes(dto.estado)) {
      throw new BadRequestException("estado debe ser 'ACTIVO' o 'INACTIVO'.");
    }
    const { rows } = await req.dbClient!.query(
      `UPDATE programa_beneficio SET
         nombre = COALESCE($2, nombre),
         tipo_subsidio = COALESCE($3, tipo_subsidio),
         valor_subsidio = COALESCE($4, valor_subsidio),
         tope_diario_subsidio = COALESCE($5, tope_diario_subsidio),
         tope_ciclo_colaborador = COALESCE($6, tope_ciclo_colaborador),
         permite_excedente = COALESCE($7, permite_excedente),
         dias_semana = COALESCE($8, dias_semana),
         pct_max_salario = COALESCE($9, pct_max_salario),
         estado = COALESCE($10, estado)
       WHERE id = $1
       RETURNING id, tipo, nombre, tipo_subsidio, valor_subsidio, tope_diario_subsidio,
                 tope_ciclo_colaborador, permite_excedente, dias_semana, pct_max_salario, estado`,
      [
        id,
        dto.nombre?.trim() ?? null,
        dto.tipoSubsidio ?? null,
        dto.valorSubsidio ?? null,
        dto.topeDiarioSubsidio ?? null,
        dto.topeCicloColaborador ?? null,
        dto.permiteExcedente ?? null,
        dto.diasSemana ?? null,
        dto.pctMaxSalario ?? null,
        dto.estado ?? null,
      ],
    );
    if (!rows.length) throw new NotFoundException('Programa no encontrado.');
    return rows[0];
  }

  // ---------- Asignación a colaboradores ----------

  @Get(':id/asignaciones')
  async listarAsignaciones(@Req() req: Request, @Param('id', ParseIntPipe) programaId: number) {
    const { rows } = await req.dbClient!.query(
      `SELECT a.id, a.colaborador_id, c.nombre_completo AS colaborador, a.vigente_desde, a.vigente_hasta
       FROM asignacion_programa a
       JOIN colaborador c ON c.id = a.colaborador_id
       WHERE a.programa_id = $1
       ORDER BY a.vigente_desde DESC`,
      [programaId],
    );
    return { asignaciones: rows };
  }

  @Post(':id/asignaciones')
  async asignar(@Req() req: Request, @Param('id', ParseIntPipe) programaId: number, @Body() dto: CrearAsignacionDto) {
    if (!dto.colaboradorId) throw new BadRequestException('colaboradorId es obligatorio.');
    if (!dto.vigenteDesde) throw new BadRequestException('vigenteDesde es obligatorio (YYYY-MM-DD).');
    const empresaId = req.ambito!.id as number;

    try {
      const { rows } = await req.dbClient!.query(
        `INSERT INTO asignacion_programa (empresa_id, colaborador_id, programa_id, vigente_desde, vigente_hasta)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, colaborador_id, vigente_desde, vigente_hasta`,
        [empresaId, dto.colaboradorId, programaId, dto.vigenteDesde, dto.vigenteHasta ?? null],
      );
      return rows[0];
    } catch (err) {
      if ((err as { code?: string }).code === '23P01') {
        throw new BadRequestException('Ese colaborador ya tiene un programa vigente que se solapa con esas fechas.');
      }
      throw err;
    }
  }

  @Patch(':programaId/asignaciones/:asignacionId')
  async finalizarAsignacion(
    @Req() req: Request,
    @Param('programaId', ParseIntPipe) programaId: number,
    @Param('asignacionId', ParseIntPipe) asignacionId: number,
    @Body() dto: FinalizarAsignacionDto,
  ) {
    if (!dto.vigenteHasta) throw new BadRequestException('vigenteHasta es obligatorio (YYYY-MM-DD).');
    const { rows } = await req.dbClient!.query(
      `UPDATE asignacion_programa SET vigente_hasta = $3
       WHERE id = $1 AND programa_id = $2
       RETURNING id, colaborador_id, vigente_desde, vigente_hasta`,
      [asignacionId, programaId, dto.vigenteHasta],
    );
    if (!rows.length) throw new NotFoundException('Esa asignación no existe.');
    return rows[0];
  }
}
