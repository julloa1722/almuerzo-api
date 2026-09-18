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
import { PoolClient } from 'pg';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { Roles, RolesGuard } from '../common/roles.guard';
import { TenantContextInterceptor } from '../common/tenant-context.interceptor';
import { enviarNotificacion } from '../common/notificaciones';
import { InvitacionesService } from './invitaciones.service';
import { AceptarInvitacionDto, CrearInvitacionDto, InvitarMasivoDto, RolInvitacion } from './dto';

const ROLES_EMPRESA: RolInvitacion[] = ['RRHH', 'ADMIN_EMPRESA', 'COLABORADOR'];
const DIAS_VIGENCIA = 7;
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5176';

/**
 * Sprint 18: cierra el gap real confirmado al construir el Sprint 15 — no
 * existía ningún endpoint que creara una `membresia`, solo
 * `scripts/seed.js`. Sin `@Roles` de clase — cada método declara el suyo,
 * mismo patrón que `PedidosController`, porque quién puede invitar a quién
 * depende del ámbito de quien invita (plataforma invita a cualquiera; RRHH
 * y suplidor solo dentro de su propio ámbito).
 */
@Controller('invitaciones')
export class InvitacionesController {
  constructor(private readonly invitaciones: InvitacionesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @UseInterceptors(TenantContextInterceptor)
  @Roles('SUPERADMIN', 'SOPORTE', 'RRHH', 'ADMIN_EMPRESA', 'SUPLIDOR_ADMIN')
  async crear(@Req() req: Request, @Body() dto: CrearInvitacionDto) {
    if (!dto.email?.trim()) throw new BadRequestException('email es obligatorio.');
    const db = req.dbClient!;
    const esPlataforma = req.ambito!.tipo === 'PLATAFORMA';

    let ambitoTipo: 'PLATAFORMA' | 'EMPRESA' | 'SUPLIDOR';
    let ambitoId: number | null;
    let colaboradorId: number | null = null;

    if (esPlataforma) {
      // Plataforma elige libremente a quién invita.
      if (!dto.ambitoTipo) throw new BadRequestException('ambitoTipo es obligatorio.');
      ambitoTipo = dto.ambitoTipo;
      ambitoId = ambitoTipo === 'PLATAFORMA' ? null : (dto.ambitoId ?? null);
      if (ambitoTipo !== 'PLATAFORMA' && !ambitoId) {
        throw new BadRequestException('ambitoId es obligatorio para EMPRESA o SUPLIDOR.');
      }
      if (ambitoTipo === 'EMPRESA' && !ROLES_EMPRESA.includes(dto.rol)) {
        throw new BadRequestException(`Para EMPRESA, rol debe ser uno de: ${ROLES_EMPRESA.join(', ')}.`);
      }
      if (ambitoTipo === 'SUPLIDOR' && dto.rol !== 'SUPLIDOR_ADMIN') {
        throw new BadRequestException('Para SUPLIDOR, rol debe ser SUPLIDOR_ADMIN.');
      }
      if (ambitoTipo === 'PLATAFORMA' && !['SUPERADMIN', 'SOPORTE'].includes(dto.rol)) {
        throw new BadRequestException('Para PLATAFORMA, rol debe ser SUPERADMIN o SOPORTE.');
      }
    } else if (req.ambito!.tipo === 'EMPRESA') {
      // RRHH/ADMIN_EMPRESA solo invita dentro de su propia empresa — el
      // ámbito se toma del token, no se elige por body.
      ambitoTipo = 'EMPRESA';
      ambitoId = req.ambito!.id;
      if (!ROLES_EMPRESA.includes(dto.rol)) {
        throw new BadRequestException(`Solo puedes invitar a: ${ROLES_EMPRESA.join(', ')}.`);
      }
    } else {
      // SUPLIDOR_ADMIN solo invita dentro de su propio suplidor.
      ambitoTipo = 'SUPLIDOR';
      ambitoId = req.ambito!.id;
      if (dto.rol !== 'SUPLIDOR_ADMIN') {
        throw new BadRequestException('Solo puedes invitar con rol SUPLIDOR_ADMIN.');
      }
    }

    if (dto.rol === 'COLABORADOR') {
      if (!dto.colaboradorId) throw new BadRequestException('colaboradorId es obligatorio para rol COLABORADOR.');
      // RLS de `colaborador` (ámbito EMPRESA) ya garantiza que solo se vea
      // uno de la propia empresa — no hace falta un chequeo manual de más.
      const { rows: colabRows } = await db.query(
        'SELECT id, usuario_id, nombre_completo FROM colaborador WHERE id = $1',
        [dto.colaboradorId],
      );
      if (!colabRows.length) throw new NotFoundException('Ese colaborador no existe en tu empresa.');
      if (colabRows[0].usuario_id) throw new ForbiddenException('Ese colaborador ya tiene una cuenta vinculada.');
      colaboradorId = dto.colaboradorId;
    }

    return this.crearInvitacionInterna(db, {
      email: dto.email.trim(),
      rol: dto.rol,
      ambitoTipo,
      ambitoId,
      colaboradorId,
      creadoPor: req.usuarioId!,
    });
  }

  /**
   * Sprint 19, subsprint 19.7: factorizado de `crear()` para que
   * `POST /invitaciones/masiva` (invitación masiva de colaboradores)
   * reuse exactamente la misma inserción + envío de correo, sin
   * duplicarla.
   */
  private async crearInvitacionInterna(
    db: PoolClient,
    params: {
      email: string;
      rol: RolInvitacion;
      ambitoTipo: 'PLATAFORMA' | 'EMPRESA' | 'SUPLIDOR';
      ambitoId: number | null;
      colaboradorId: number | null;
      creadoPor: number;
    },
  ) {
    const token = this.invitaciones.generarToken();
    const expiraEn = new Date(Date.now() + DIAS_VIGENCIA * 86400000);

    const { rows } = await db.query(
      `INSERT INTO invitacion (email, rol, ambito_tipo, ambito_id, colaborador_id, token, creado_por, expira_en)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, email, rol, ambito_tipo, ambito_id, estado, expira_en`,
      [params.email, params.rol, params.ambitoTipo, params.ambitoId, params.colaboradorId, token, params.creadoPor, expiraEn],
    );

    const link = `${FRONTEND_URL}/invitacion/${token}`;
    await enviarNotificacion(db, {
      tipo: 'INVITACION',
      destinatario: params.email,
      asunto: 'Te invitaron a la plataforma de almuerzo corporativo',
      cuerpo: `Hola, te invitaron con el rol ${params.rol}. Activa tu cuenta aquí: ${link}\n\nEste enlace vence en ${DIAS_VIGENCIA} días.`,
      referenciaTipo: 'INVITACION',
      referenciaId: rows[0].id,
    });

    return { ...rows[0], link };
  }

  /**
   * Sprint 19, subsprint 19.7. Sin body invita a todos los colaboradores
   * activos de la empresa sin `usuario_id` que ya tienen `email`
   * registrado (del CSV o cargado a mano) — el correo ya se capturaba
   * desde el Sprint 2, solo no se exponía. `colaboradorIds` acota a una
   * selección puntual en vez de "todos".
   */
  @Post('masiva')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @UseInterceptors(TenantContextInterceptor)
  @Roles('RRHH', 'ADMIN_EMPRESA')
  async masiva(@Req() req: Request, @Body() dto: InvitarMasivoDto) {
    const db = req.dbClient!;
    const empresaId = req.ambito!.id as number;

    const { rows: candidatos } = await db.query(
      dto.colaboradorIds?.length
        ? `SELECT id, nombre_completo, email FROM colaborador
           WHERE id = ANY($1::bigint[]) AND estado = 'ACTIVO' AND usuario_id IS NULL`
        : `SELECT id, nombre_completo, email FROM colaborador WHERE estado = 'ACTIVO' AND usuario_id IS NULL`,
      dto.colaboradorIds?.length ? [dto.colaboradorIds] : [],
    );

    const { rows: yaInvitadosRows } = await db.query(
      `SELECT colaborador_id FROM invitacion WHERE ambito_tipo = 'EMPRESA' AND ambito_id = $1
       AND rol = 'COLABORADOR' AND estado = 'PENDIENTE'`,
      [empresaId],
    );
    const yaInvitadosSet = new Set(yaInvitadosRows.map((r) => r.colaborador_id));

    const invitados: { colaboradorId: number; email: string }[] = [];
    const omitidosSinEmail: { colaboradorId: number; nombre: string }[] = [];
    const yaInvitados: { colaboradorId: number; nombre: string }[] = [];

    for (const c of candidatos) {
      if (yaInvitadosSet.has(c.id)) {
        yaInvitados.push({ colaboradorId: c.id, nombre: c.nombre_completo });
        continue;
      }
      if (!c.email) {
        omitidosSinEmail.push({ colaboradorId: c.id, nombre: c.nombre_completo });
        continue;
      }
      await this.crearInvitacionInterna(db, {
        email: c.email,
        rol: 'COLABORADOR',
        ambitoTipo: 'EMPRESA',
        ambitoId: empresaId,
        colaboradorId: c.id,
        creadoPor: req.usuarioId!,
      });
      invitados.push({ colaboradorId: c.id, email: c.email });
    }

    return { invitados, omitidosSinEmail, yaInvitados };
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @UseInterceptors(TenantContextInterceptor)
  @Roles('SUPERADMIN', 'SOPORTE', 'RRHH', 'ADMIN_EMPRESA', 'SUPLIDOR_ADMIN')
  async listar(@Req() req: Request) {
    const esPlataforma = req.ambito!.tipo === 'PLATAFORMA';
    const { rows } = await req.dbClient!.query(
      esPlataforma
        ? `SELECT id, email, rol, ambito_tipo, ambito_id, estado, creado_en, expira_en FROM invitacion ORDER BY creado_en DESC`
        : `SELECT id, email, rol, ambito_tipo, ambito_id, estado, creado_en, expira_en FROM invitacion
           WHERE ambito_tipo = $1 AND ambito_id = $2 ORDER BY creado_en DESC`,
      esPlataforma ? [] : [req.ambito!.tipo, req.ambito!.id],
    );
    return { invitaciones: rows };
  }

  @Patch(':id/revocar')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @UseInterceptors(TenantContextInterceptor)
  @Roles('SUPERADMIN', 'SOPORTE', 'RRHH', 'ADMIN_EMPRESA', 'SUPLIDOR_ADMIN')
  async revocar(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    const esPlataforma = req.ambito!.tipo === 'PLATAFORMA';
    const { rows } = await req.dbClient!.query(
      esPlataforma
        ? `UPDATE invitacion SET estado = 'REVOCADA' WHERE id = $1 AND estado = 'PENDIENTE' RETURNING id, estado`
        : `UPDATE invitacion SET estado = 'REVOCADA'
           WHERE id = $1 AND estado = 'PENDIENTE' AND ambito_tipo = $2 AND ambito_id = $3
           RETURNING id, estado`,
      esPlataforma ? [id] : [id, req.ambito!.tipo, req.ambito!.id],
    );
    if (!rows.length) throw new NotFoundException('Esa invitación no existe o ya no está pendiente.');
    return rows[0];
  }

  // ---------- Público, sin JWT ----------

  @Get(':token')
  async verPorToken(@Param('token') token: string) {
    return this.invitaciones.verPorToken(token);
  }

  @Post(':token/aceptar')
  async aceptar(@Param('token') token: string, @Body() dto: AceptarInvitacionDto) {
    return this.invitaciones.aceptar(token, dto.password);
  }
}
