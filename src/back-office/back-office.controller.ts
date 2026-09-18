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
  Put,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { Roles, RolesGuard } from '../common/roles.guard';
import { TenantContextInterceptor } from '../common/tenant-context.interceptor';
import {
  importarFilas,
  mapaPuntosDe,
  obtenerContenidoCsv,
  parsearCsvOFallar,
  puntosValidosDe,
  resumenDeFilas,
} from './importar-colaboradores';
import {
  ConvertirLeadDto,
  CrearContratoDto,
  CrearEmpresaDto,
  EditarConfiguracionDto,
  EditarContratoDto,
  ImportarColaboradoresDto,
} from './dto';

/** Ámbito PLATAFORMA, roles SUPERADMIN/SOPORTE — es el equivalente en código
 * del portal-backoffice-onboarding.html: alta de empresas y contratos, algo
 * que ninguna empresa individual gestiona sobre sí misma. */
@Controller('back-office')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(TenantContextInterceptor)
@Roles('SUPERADMIN', 'SOPORTE')
export class BackOfficeController {
  // ---------- Empresas ----------

  @Get('empresas')
  async listarEmpresas(@Req() req: Request) {
    const { rows } = await req.dbClient!.query(
      `SELECT e.id, e.rnc, e.nombre, e.frecuencia_nomina, e.estado,
              (SELECT COUNT(*) FROM colaborador c WHERE c.empresa_id = e.id AND c.estado = 'ACTIVO') AS colaboradores,
              (SELECT COUNT(*) FROM contrato_suplidor cs WHERE cs.empresa_id = e.id AND cs.estado = 'ACTIVA') AS suplidores_activos
       FROM empresa e
       ORDER BY e.nombre`,
    );
    return { empresas: rows };
  }

  @Post('empresas')
  async crearEmpresa(@Req() req: Request, @Body() dto: CrearEmpresaDto) {
    if (!dto.nombre?.trim()) throw new BadRequestException('nombre es obligatorio.');
    if (!/^\d{3}-?\d{5,8}-?\d?$/.test(dto.rnc ?? '')) {
      throw new BadRequestException('rnc no tiene un formato reconocido.');
    }
    const { rows } = await req.dbClient!.query(
      `INSERT INTO empresa (rnc, nombre, frecuencia_nomina)
       VALUES ($1, $2, $3)
       RETURNING id, rnc, nombre, frecuencia_nomina, estado`,
      [dto.rnc, dto.nombre.trim(), dto.frecuenciaNomina ?? 'QUINCENAL'],
    );
    return rows[0];
  }

  // ---------- Suplidores (solo lectura) ----------

  /**
   * Sprint 13, subsprint 13.1: no existía ningún endpoint para listar
   * suplidores desde ningún ámbito. Sin esto, la pantalla de "agregar
   * suplidor" al contrato de una empresa no tiene forma de saber qué
   * suplidores existen. Solo lectura, sin filtros — mismo criterio
   * minimalista que `GET /colaboradores` del Sprint 1.
   */
  @Get('suplidores')
  async listarSuplidores(@Req() req: Request) {
    const { rows } = await req.dbClient!.query(
      `SELECT id, nombre, rnc, estado FROM suplidor ORDER BY nombre`,
    );
    return { suplidores: rows };
  }

  // ---------- Importación de colaboradores ----------
  // Soporta dos formas de envío del mismo CSV:
  //   (a) multipart/form-data con el archivo en el campo "file"
  //   (b) application/json con el contenido del CSV como texto en { csv: "..." }
  // "preview" nunca escribe en la base; "importar" sí, y solo las filas sin errores.

  @Post('empresas/:empresaId/colaboradores/preview')
  @UseInterceptors(FileInterceptor('file'))
  async previsualizarColaboradores(
    @Req() req: Request,
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: ImportarColaboradoresDto,
  ) {
    const csv = obtenerContenidoCsv(file, dto?.csv);
    const puntos = await puntosValidosDe(req.dbClient!, empresaId);
    const filas = parsearCsvOFallar(csv, puntos);
    return resumenDeFilas(filas);
  }

  @Post('empresas/:empresaId/colaboradores/importar')
  @UseInterceptors(FileInterceptor('file'))
  async importarColaboradores(
    @Req() req: Request,
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: ImportarColaboradoresDto,
  ) {
    const csv = obtenerContenidoCsv(file, dto?.csv);
    const puntosMapa = await mapaPuntosDe(req.dbClient!, empresaId);
    const filas = parsearCsvOFallar(csv, new Set(puntosMapa.keys()));
    const importados = await importarFilas(req.dbClient!, empresaId, filas, puntosMapa);
    return { ...resumenDeFilas(filas), importados };
  }

  // ---------- Contratos con suplidores ----------

  @Get('empresas/:empresaId/contratos')
  async listarContratos(@Req() req: Request, @Param('empresaId', ParseIntPipe) empresaId: number) {
    const { rows } = await req.dbClient!.query(
      `SELECT cs.id, cs.suplidor_id, s.nombre AS suplidor_nombre, s.rnc AS suplidor_rnc,
              cs.ajuste_pct, cs.estado
       FROM contrato_suplidor cs
       JOIN suplidor s ON s.id = cs.suplidor_id
       WHERE cs.empresa_id = $1
       ORDER BY s.nombre`,
      [empresaId],
    );
    return { contratos: rows };
  }

  @Post('empresas/:empresaId/contratos')
  async crearContrato(
    @Req() req: Request,
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Body() dto: CrearContratoDto,
  ) {
    const empresa = await req.dbClient!.query('SELECT id FROM empresa WHERE id = $1', [empresaId]);
    if (!empresa.rowCount) throw new NotFoundException('Empresa no encontrada.');

    const { rows } = await req.dbClient!.query(
      `INSERT INTO contrato_suplidor (empresa_id, suplidor_id, ajuste_pct)
       VALUES ($1, $2, $3)
       ON CONFLICT (empresa_id, suplidor_id) DO UPDATE SET estado = 'ACTIVA'
       RETURNING id, suplidor_id, ajuste_pct, estado`,
      [empresaId, dto.suplidorId, dto.ajustePct ?? 0],
    );
    return rows[0];
  }

  @Patch('contratos/:contratoId')
  async editarContrato(
    @Req() req: Request,
    @Param('contratoId', ParseIntPipe) contratoId: number,
    @Body() dto: EditarContratoDto,
  ) {
    const { rows } = await req.dbClient!.query(
      `UPDATE contrato_suplidor
       SET ajuste_pct = COALESCE($2, ajuste_pct),
           estado = COALESCE($3, estado)
       WHERE id = $1
       RETURNING id, suplidor_id, ajuste_pct, estado`,
      [contratoId, dto.ajustePct ?? null, dto.estado ?? null],
    );
    if (!rows.length) throw new NotFoundException('Contrato no encontrado.');
    return rows[0];
  }

  // ---------- Sprint 17: solicitudes de contrato y leads comerciales ----------

  @Get('solicitudes-contrato')
  async listarSolicitudes(@Req() req: Request) {
    const { rows } = await req.dbClient!.query(
      `SELECT cs.id, cs.ajuste_pct, cs.creado_en,
              e.id AS empresa_id, e.nombre AS empresa_nombre,
              s.id AS suplidor_id, s.nombre AS suplidor_nombre
       FROM contrato_suplidor cs
       JOIN empresa e ON e.id = cs.empresa_id
       JOIN suplidor s ON s.id = cs.suplidor_id
       WHERE cs.estado = 'PENDIENTE'
       ORDER BY cs.creado_en`,
    );
    return { solicitudes: rows };
  }

  @Patch('contratos/:contratoId/aprobar')
  async aprobarContrato(@Req() req: Request, @Param('contratoId', ParseIntPipe) contratoId: number) {
    const { rows } = await req.dbClient!.query(
      `UPDATE contrato_suplidor SET estado = 'ACTIVA' WHERE id = $1 AND estado = 'PENDIENTE'
       RETURNING id, empresa_id, suplidor_id, ajuste_pct, estado`,
      [contratoId],
    );
    if (!rows.length) throw new NotFoundException('Esa solicitud no existe o ya se resolvió.');
    return rows[0];
  }

  @Patch('contratos/:contratoId/rechazar')
  async rechazarContrato(@Req() req: Request, @Param('contratoId', ParseIntPipe) contratoId: number) {
    const { rows } = await req.dbClient!.query(
      `UPDATE contrato_suplidor SET estado = 'RECHAZADA' WHERE id = $1 AND estado = 'PENDIENTE'
       RETURNING id, empresa_id, suplidor_id, ajuste_pct, estado`,
      [contratoId],
    );
    if (!rows.length) throw new NotFoundException('Esa solicitud no existe o ya se resolvió.');
    return rows[0];
  }

  // ---------- Leads comerciales ----------

  @Get('leads')
  async listarLeads(@Req() req: Request) {
    const { rows } = await req.dbClient!.query(
      `SELECT l.id, l.nombre_propuesto, l.rnc_propuesto, l.contacto, l.mensaje, l.estado, l.creado_en,
              s.nombre AS suplidor_nombre
       FROM lead_comercial l
       JOIN suplidor s ON s.id = l.suplidor_id
       ORDER BY (l.estado = 'PENDIENTE') DESC, l.creado_en`,
    );
    return { leads: rows };
  }

  @Patch('leads/:leadId/convertido')
  async convertirLead(
    @Req() req: Request,
    @Param('leadId', ParseIntPipe) leadId: number,
    @Body() dto: ConvertirLeadDto,
  ) {
    if (!dto?.empresaId) throw new BadRequestException('empresaId es obligatorio.');
    const { rows } = await req.dbClient!.query(
      `UPDATE lead_comercial SET estado = 'CONVERTIDO', empresa_id = $2
       WHERE id = $1 AND estado = 'PENDIENTE'
       RETURNING id, nombre_propuesto, estado, empresa_id`,
      [leadId, dto.empresaId],
    );
    if (!rows.length) throw new NotFoundException('Ese lead no existe o ya se convirtió.');
    return rows[0];
  }

  // ---------- Sprint 14: configuración de plataforma ----------
  //
  // Solo se usa para la métrica informativa "ingreso propio" del
  // dashboard — no descuenta nada de la liquidación real a suplidores
  // (Sprint 7 sigue pagando el 100%). Ver plan-sprints.md, Sprint 14.

  @Get('configuracion')
  async verConfiguracion(@Req() req: Request) {
    const { rows } = await req.dbClient!.query(
      'SELECT tasa_comision_pct, actualizado_en FROM configuracion_plataforma WHERE id = 1',
    );
    return rows[0];
  }

  @Put('configuracion')
  async editarConfiguracion(@Req() req: Request, @Body() dto: EditarConfiguracionDto) {
    if (!(Number(dto.tasaComisionPct) >= 0 && Number(dto.tasaComisionPct) <= 100)) {
      throw new BadRequestException('tasaComisionPct debe estar entre 0 y 100.');
    }
    const { rows } = await req.dbClient!.query(
      `UPDATE configuracion_plataforma SET tasa_comision_pct = $1, actualizado_en = now()
       WHERE id = 1
       RETURNING tasa_comision_pct, actualizado_en`,
      [dto.tasaComisionPct],
    );
    return rows[0];
  }
}
