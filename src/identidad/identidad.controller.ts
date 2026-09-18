import { Body, Controller, Get, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { Roles, RolesGuard } from '../common/roles.guard';
import { TenantContextInterceptor } from '../common/tenant-context.interceptor';
import { ImportarColaboradoresDto } from '../back-office/dto';
import {
  importarFilas,
  mapaPuntosDe,
  obtenerContenidoCsv,
  parsearCsvOFallar,
  puntosValidosDe,
  resumenDeFilas,
} from '../back-office/importar-colaboradores';

/**
 * Endpoint deliberadamente simple: lista los colaboradores del ámbito activo.
 * Su único propósito en el Sprint 1 es servir de prueba viviente del aislamiento
 * por RLS — no lleva paginación, filtros ni nada de negocio real todavía.
 */
@Controller('colaboradores')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(TenantContextInterceptor)
export class IdentidadController {
  @Get()
  @Roles('RRHH', 'ADMIN_EMPRESA')
  async listar(@Req() req: Request) {
    const { rows } = await req.dbClient!.query(
      `SELECT id, codigo_nomina, nombre_completo, estado, usuario_id, email
       FROM colaborador
       ORDER BY nombre_completo`,
    );
    return { ambito: req.ambito, colaboradores: rows };
  }

  /**
   * Sprint 16: autoservicio de RRHH — antes solo back office (ámbito
   * PLATAFORMA) podía subir el CSV de colaboradores de una empresa. Mismo
   * motor de validación que `BackOfficeController` (extraído a
   * `importar-colaboradores.ts` en el subsprint 16.1, sin duplicar nada),
   * pero sin `:empresaId` en la URL — se toma de `req.ambito!.id`. RLS de
   * `almuerzo_app` ya garantiza que RRHH no puede escribir colaboradores
   * de otra empresa aunque el código tuviera un bug; no hace falta un
   * chequeo manual adicional, mismo criterio que el resto de este módulo.
   */
  @Post('preview')
  @Roles('RRHH', 'ADMIN_EMPRESA')
  @UseInterceptors(FileInterceptor('file'))
  async previsualizar(
    @Req() req: Request,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: ImportarColaboradoresDto,
  ) {
    const empresaId = req.ambito!.id as number;
    const csv = obtenerContenidoCsv(file, dto?.csv);
    const puntos = await puntosValidosDe(req.dbClient!, empresaId);
    const filas = parsearCsvOFallar(csv, puntos);
    return resumenDeFilas(filas);
  }

  @Post('importar')
  @Roles('RRHH', 'ADMIN_EMPRESA')
  @UseInterceptors(FileInterceptor('file'))
  async importar(
    @Req() req: Request,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: ImportarColaboradoresDto,
  ) {
    const empresaId = req.ambito!.id as number;
    const csv = obtenerContenidoCsv(file, dto?.csv);
    const puntosMapa = await mapaPuntosDe(req.dbClient!, empresaId);
    const filas = parsearCsvOFallar(csv, new Set(puntosMapa.keys()));
    const importados = await importarFilas(req.dbClient!, empresaId, filas, puntosMapa);
    return { ...resumenDeFilas(filas), importados };
  }
}
