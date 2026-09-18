import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { Roles, RolesGuard } from '../common/roles.guard';
import { TenantContextInterceptor } from '../common/tenant-context.interceptor';
import { CrearAyudaDto, EditarAyudaDto, RolAyuda } from './dto';

const ROLES_CONOCIDOS: RolAyuda[] = [
  'SUPERADMIN',
  'SOPORTE',
  'ADMIN_EMPRESA',
  'RRHH',
  'COLABORADOR',
  'SUPLIDOR_ADMIN',
  'DESPACHO',
];
const ROLES_AYUDA_VALIDOS: RolAyuda[] = ['TODOS', ...ROLES_CONOCIDOS];

/**
 * Sprint 8 (alcance recortado a backend — ver plan-sprints.md): API de
 * contenido de ayuda, sin RLS por tenant a propósito — es contenido de
 * plataforma, igual para cualquiera que comparta rol, no un dato propio de
 * una empresa o suplidor.
 */
@Controller('ayuda')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(TenantContextInterceptor)
export class AyudaController {
  // @Roles con la lista completa de roles conocidos: no restringe a nadie
  // en particular, pero obliga a RolesGuard a exigir un ámbito seleccionado
  // (y por lo tanto req.ambito.rol garantizado) antes de filtrar por rol.
  @Get()
  @Roles(...ROLES_CONOCIDOS)
  async listar(@Req() req: Request, @Query('pantallaId') pantallaId?: string, @Query('buscar') buscar?: string) {
    const rol = req.ambito!.rol;
    const condiciones = [`(rol_objetivo = $1 OR rol_objetivo = 'TODOS')`];
    const params: unknown[] = [rol];

    if (pantallaId) {
      params.push(pantallaId);
      condiciones.push(`pantalla_id = $${params.length}`);
    }
    if (buscar) {
      params.push(`%${buscar}%`);
      condiciones.push(`(titulo ILIKE $${params.length} OR cuerpo ILIKE $${params.length})`);
    }

    const { rows } = await req.dbClient!.query(
      `SELECT id, titulo, cuerpo, rol_objetivo, pantalla_id, orden, version, actualizado_en
       FROM ayuda_contenido
       WHERE ${condiciones.join(' AND ')}
       ORDER BY pantalla_id, orden`,
      params,
    );
    return { fichas: rows };
  }

  @Post()
  @Roles('SUPERADMIN', 'SOPORTE')
  async crear(@Req() req: Request, @Body() dto: CrearAyudaDto) {
    if (!dto.titulo?.trim() || !dto.cuerpo?.trim() || !dto.pantallaId?.trim()) {
      throw new BadRequestException('titulo, cuerpo y pantallaId son obligatorios.');
    }
    if (!ROLES_AYUDA_VALIDOS.includes(dto.rolObjetivo)) {
      throw new BadRequestException(`rolObjetivo debe ser uno de: ${ROLES_AYUDA_VALIDOS.join(', ')}.`);
    }
    const { rows } = await req.dbClient!.query(
      `INSERT INTO ayuda_contenido (titulo, cuerpo, rol_objetivo, pantalla_id, orden)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, titulo, cuerpo, rol_objetivo, pantalla_id, orden, version, actualizado_en`,
      [dto.titulo.trim(), dto.cuerpo.trim(), dto.rolObjetivo, dto.pantallaId.trim(), dto.orden ?? 0],
    );
    return rows[0];
  }

  @Patch(':id')
  @Roles('SUPERADMIN', 'SOPORTE')
  async editar(@Req() req: Request, @Param('id', ParseIntPipe) id: number, @Body() dto: EditarAyudaDto) {
    if (dto.rolObjetivo && !ROLES_AYUDA_VALIDOS.includes(dto.rolObjetivo)) {
      throw new BadRequestException(`rolObjetivo debe ser uno de: ${ROLES_AYUDA_VALIDOS.join(', ')}.`);
    }
    const { rows } = await req.dbClient!.query(
      `UPDATE ayuda_contenido SET
         titulo = COALESCE($2, titulo),
         cuerpo = COALESCE($3, cuerpo),
         rol_objetivo = COALESCE($4, rol_objetivo),
         pantalla_id = COALESCE($5, pantalla_id),
         orden = COALESCE($6, orden),
         version = version + 1,
         actualizado_en = now()
       WHERE id = $1
       RETURNING id, titulo, cuerpo, rol_objetivo, pantalla_id, orden, version, actualizado_en`,
      [
        id,
        dto.titulo?.trim() ?? null,
        dto.cuerpo?.trim() ?? null,
        dto.rolObjetivo ?? null,
        dto.pantallaId?.trim() ?? null,
        dto.orden ?? null,
      ],
    );
    if (!rows.length) throw new NotFoundException('Ficha de ayuda no encontrada.');
    return rows[0];
  }

  @Delete(':id')
  @Roles('SUPERADMIN', 'SOPORTE')
  async borrar(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    const { rowCount } = await req.dbClient!.query('DELETE FROM ayuda_contenido WHERE id = $1', [id]);
    if (!rowCount) throw new NotFoundException('Ficha de ayuda no encontrada.');
    return { id, eliminado: true };
  }
}
