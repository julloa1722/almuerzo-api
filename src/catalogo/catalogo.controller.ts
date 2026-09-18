import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
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
import { cutoffDe, iso, proximosHabiles, semanaTipoDe } from '../common/calendario.util';
import {
  CrearLeadDto,
  CrearPlantillaDto,
  CrearProductoDto,
  CrearRutaDto,
  EditarItemMenuDto,
  EditarProductoDto,
  ItemPlantillaDto,
  PublicarMenuDto,
  SolicitarContratoDto,
} from './dto';

interface RutaRow {
  hora_cutoff: string;
  dias_anticipacion: number;
}

@Controller('catalogo')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(TenantContextInterceptor)
@Roles('SUPLIDOR_ADMIN')
export class CatalogoController {
  // ---------- Productos ----------

  @Get('productos')
  async listarProductos(@Req() req: Request) {
    const { rows } = await req.dbClient!.query(
      `SELECT id, sku, nombre, descripcion, categoria, etiquetas, imagen_url, estado
       FROM producto ORDER BY nombre`,
    );
    return { productos: rows };
  }

  @Post('productos')
  async crearProducto(@Req() req: Request, @Body() dto: CrearProductoDto) {
    if (!dto.sku?.trim() || !dto.nombre?.trim()) {
      throw new BadRequestException('sku y nombre son obligatorios.');
    }
    const suplidorId = req.ambito!.id;
    const { rows } = await req.dbClient!.query(
      `INSERT INTO producto (suplidor_id, sku, nombre, descripcion, categoria, etiquetas, imagen_url)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
       RETURNING id, sku, nombre, descripcion, categoria, etiquetas, imagen_url, estado`,
      [
        suplidorId,
        dto.sku.trim(),
        dto.nombre.trim(),
        dto.descripcion ?? null,
        dto.categoria ?? null,
        JSON.stringify(dto.etiquetas ?? []),
        dto.imagenUrl ?? null,
      ],
    );
    return rows[0];
  }

  @Patch('productos/:id')
  async editarProducto(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EditarProductoDto,
  ) {
    const { rows } = await req.dbClient!.query(
      `UPDATE producto SET
         nombre = COALESCE($2, nombre),
         descripcion = COALESCE($3, descripcion),
         categoria = COALESCE($4, categoria),
         etiquetas = COALESCE($5::jsonb, etiquetas),
         imagen_url = COALESCE($6, imagen_url),
         estado = COALESCE($7, estado)
       WHERE id = $1
       RETURNING id, sku, nombre, descripcion, categoria, etiquetas, imagen_url, estado`,
      [
        id,
        dto.nombre ?? null,
        dto.descripcion ?? null,
        dto.categoria ?? null,
        dto.etiquetas ? JSON.stringify(dto.etiquetas) : null,
        dto.imagenUrl ?? null,
        dto.estado ?? null,
      ],
    );
    if (!rows.length) throw new NotFoundException('Producto no encontrado.');
    return rows[0];
  }

  // ---------- Ruta de servicio ----------

  @Get('rutas')
  async listarRutas(@Req() req: Request) {
    const { rows } = await req.dbClient!.query(
      `SELECT r.id, r.punto_entrega_id, p.nombre AS punto_nombre,
              r.hora_cutoff, r.dias_anticipacion, r.hora_entrega_est, r.cupo_max_dia, r.estado
       FROM ruta_servicio r
       JOIN punto_entrega p ON p.id = r.punto_entrega_id
       ORDER BY p.nombre`,
    );
    return { rutas: rows };
  }

  @Post('rutas')
  async crearRuta(@Req() req: Request, @Body() dto: CrearRutaDto) {
    const suplidorId = req.ambito!.id;
    const { rows } = await req.dbClient!.query(
      `INSERT INTO ruta_servicio (suplidor_id, punto_entrega_id, hora_cutoff, dias_anticipacion, hora_entrega_est, cupo_max_dia)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (suplidor_id, punto_entrega_id) DO UPDATE SET
         hora_cutoff = EXCLUDED.hora_cutoff,
         dias_anticipacion = EXCLUDED.dias_anticipacion,
         hora_entrega_est = EXCLUDED.hora_entrega_est,
         cupo_max_dia = EXCLUDED.cupo_max_dia,
         estado = 'ACTIVA'
       RETURNING id, punto_entrega_id, hora_cutoff, dias_anticipacion, hora_entrega_est, cupo_max_dia, estado`,
      [suplidorId, dto.puntoEntregaId, dto.horaCutoff, dto.diasAnticipacion ?? 0, dto.horaEntregaEst, dto.cupoMaxDia ?? null],
    );
    return rows[0];
  }

  // ---------- Plantilla semanal ----------

  @Get('plantillas')
  async listarPlantillas(@Req() req: Request) {
    const { rows: plantillas } = await req.dbClient!.query(
      `SELECT id, nombre, semana_tipo, estado FROM plantilla_menu ORDER BY semana_tipo`,
    );
    for (const p of plantillas) {
      const { rows: items } = await req.dbClient!.query(
        `SELECT pi.id, pi.dia_semana, pi.producto_id, pr.nombre AS producto_nombre, pi.precio, pi.cupo
         FROM plantilla_item pi
         JOIN producto pr ON pr.id = pi.producto_id
         WHERE pi.plantilla_id = $1
         ORDER BY pi.dia_semana`,
        [p.id],
      );
      p.items = items;
    }
    return { plantillas };
  }

  @Post('plantillas')
  async crearPlantilla(@Req() req: Request, @Body() dto: CrearPlantillaDto) {
    const suplidorId = req.ambito!.id;
    const { rows } = await req.dbClient!.query(
      `INSERT INTO plantilla_menu (suplidor_id, nombre, semana_tipo)
       VALUES ($1, $2, $3)
       RETURNING id, nombre, semana_tipo, estado`,
      [suplidorId, dto.nombre, dto.semanaTipo],
    );
    return rows[0];
  }

  @Post('plantillas/:id/items')
  async agregarItemPlantilla(
    @Req() req: Request,
    @Param('id', ParseIntPipe) plantillaId: number,
    @Body() dto: ItemPlantillaDto,
  ) {
    const suplidorId = req.ambito!.id;
    if (dto.diaSemana < 1 || dto.diaSemana > 5) {
      throw new BadRequestException('diaSemana debe ser 1 (lunes) a 5 (viernes).');
    }
    const { rows } = await req.dbClient!.query(
      `INSERT INTO plantilla_item (plantilla_id, suplidor_id, dia_semana, producto_id, precio, cupo)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (plantilla_id, dia_semana, producto_id) DO UPDATE SET
         precio = EXCLUDED.precio, cupo = EXCLUDED.cupo
       RETURNING id, dia_semana, producto_id, precio, cupo`,
      [plantillaId, suplidorId, dto.diaSemana, dto.productoId, dto.precio, dto.cupo ?? null],
    );
    return rows[0];
  }

  /**
   * Sprint 11, subsprint 11.2: `agregarItemPlantilla` agrega o actualiza
   * (`ON CONFLICT ... DO UPDATE`) pero nunca hubo forma de quitar un plato
   * ya agregado a un día — caso de negocio real (agregado por error, o deja
   * de ofrecerse ese día fijo). RLS de plantilla_item (suplidor_id
   * denormalizado) ya garantiza que un suplidor no puede tocar la de otro;
   * el WHERE con plantilla_id es solo para no depender de que el id del
   * item sea globalmente único de forma "accidental".
   */
  @Delete('plantillas/:plantillaId/items/:itemId')
  async quitarItemPlantilla(
    @Req() req: Request,
    @Param('plantillaId', ParseIntPipe) plantillaId: number,
    @Param('itemId', ParseIntPipe) itemId: number,
  ) {
    const { rowCount } = await req.dbClient!.query(
      'DELETE FROM plantilla_item WHERE id = $1 AND plantilla_id = $2',
      [itemId, plantillaId],
    );
    if (!rowCount) throw new NotFoundException('Ese ítem de la plantilla no existe.');
    return { id: itemId, eliminado: true };
  }

  // ---------- Publicación y calendario de menu_dia ----------

  @Post('menu/publicar')
  async publicarMenu(@Req() req: Request, @Body() dto: PublicarMenuDto) {
    const suplidorId = req.ambito!.id as number;
    const dias = dto.dias ?? 10;

    const rutas = await this.rutasActivasDe(req);
    if (!rutas.length) {
      throw new BadRequestException('Configura al menos una ruta de servicio antes de publicar.');
    }
    const feriados = await this.feriadosDe(req, suplidorId);

    const fechas = proximosHabiles(new Date(), dias, feriados);
    let publicados = 0;
    const detalle: Record<string, number> = {};

    for (const fecha of fechas) {
      const cutoff = this.cutoffMinimoDe(fecha, rutas, feriados);
      if (new Date() >= cutoff) continue; // ya congelado, no se toca

      const yaExiste = await req.dbClient!.query('SELECT 1 FROM menu_dia WHERE suplidor_id = $1 AND fecha = $2 LIMIT 1', [
        suplidorId,
        fecha,
      ]);
      if (yaExiste.rowCount) continue; // no reescribe un día ya publicado

      const semT = semanaTipoDe(fecha);
      const diaSemana = new Date(fecha + 'T00:00:00').getDay();

      const { rows: items } = await req.dbClient!.query(
        `SELECT pi.producto_id, pi.precio, pi.cupo
         FROM plantilla_item pi
         JOIN plantilla_menu pm ON pm.id = pi.plantilla_id
         JOIN producto pr ON pr.id = pi.producto_id
         WHERE pm.suplidor_id = $1 AND pm.semana_tipo = $2 AND pi.dia_semana = $3
           AND pm.estado = 'ACTIVA' AND pr.estado = 'ACTIVO'`,
        [suplidorId, semT, diaSemana],
      );

      for (const item of items) {
        await req.dbClient!.query(
          `INSERT INTO menu_dia (suplidor_id, producto_id, fecha, precio, cupo_max)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (suplidor_id, producto_id, fecha) DO NOTHING`,
          [suplidorId, item.producto_id, fecha, item.precio, item.cupo],
        );
      }
      if (items.length) {
        publicados++;
        detalle[fecha] = items.length;
      }
    }

    return { diasPublicados: publicados, detalle };
  }

  @Get('menu')
  async verMenu(@Req() req: Request, @Query('desde') desdeQ?: string, @Query('hasta') hastaQ?: string) {
    const suplidorId = req.ambito!.id as number;
    const rutas = await this.rutasActivasDe(req);
    const feriados = await this.feriadosDe(req, suplidorId);

    const desde = desdeQ ?? iso(new Date());
    const hasta = hastaQ ?? iso(new Date(Date.now() + 14 * 86400000));

    const { rows } = await req.dbClient!.query(
      `SELECT md.id, md.producto_id, pr.nombre AS producto_nombre, md.fecha, md.precio,
              md.cupo_max, md.cupo_usado, md.activo
       FROM menu_dia md
       JOIN producto pr ON pr.id = md.producto_id
       WHERE md.fecha BETWEEN $1 AND $2
       ORDER BY md.fecha, pr.nombre`,
      [desde, hasta],
    );

    const porFecha: Record<string, { estado: string; items: unknown[] }> = {};
    for (const row of rows) {
      const fechaStr = iso(new Date(row.fecha));
      if (!porFecha[fechaStr]) {
        const cutoff = rutas.length ? this.cutoffMinimoDe(fechaStr, rutas, feriados) : null;
        porFecha[fechaStr] = {
          estado: cutoff && new Date() >= cutoff ? 'CONGELADO' : 'PUBLICADO',
          items: [],
        };
      }
      porFecha[fechaStr].items.push(row);
    }
    return { menu: porFecha };
  }

  @Patch('menu/:id')
  async editarItemMenu(@Req() req: Request, @Param('id', ParseIntPipe) id: number, @Body() dto: EditarItemMenuDto) {
    const suplidorId = req.ambito!.id as number;
    const { rows: actuales } = await req.dbClient!.query('SELECT fecha FROM menu_dia WHERE id = $1', [id]);
    if (!actuales.length) throw new NotFoundException('Ese día del menú no existe.');

    const fechaStr = iso(new Date(actuales[0].fecha));
    const rutas = await this.rutasActivasDe(req);
    const feriados = await this.feriadosDe(req, suplidorId);
    if (rutas.length) {
      const cutoff = this.cutoffMinimoDe(fechaStr, rutas, feriados);
      if (new Date() >= cutoff) {
        throw new ForbiddenException('Ese día ya está congelado: su cutoff venció y ya existen pedidos con estos valores.');
      }
    }

    const { rows } = await req.dbClient!.query(
      `UPDATE menu_dia SET
         precio = COALESCE($2, precio),
         cupo_max = COALESCE($3, cupo_max),
         activo = COALESCE($4, activo)
       WHERE id = $1
       RETURNING id, producto_id, fecha, precio, cupo_max, cupo_usado, activo`,
      [id, dto.precio ?? null, dto.cupo ?? null, dto.activo ?? null],
    );
    return rows[0];
  }

  // ---------- Sprint 17: relación comercial suplidor-empresa ----------
  //
  // El suplidor propone, back office decide — nunca al revés. Un
  // suplidor nunca crea una empresa, ni siquiera por esta vía (ver
  // plan-sprints.md, Sprint 17, decisión 3 confirmada).

  @Post('contratos/solicitar')
  async solicitarContrato(@Req() req: Request, @Body() dto: SolicitarContratoDto) {
    if (!dto.rnc?.trim()) throw new BadRequestException('rnc es obligatorio.');
    const suplidorId = req.ambito!.id as number;

    // Bug real encontrado el 6 de agosto de 2026: el RNC se guarda tal cual
    // se escribió al dar de alta la empresa (con o sin guiones) — una
    // comparación de texto exacto rechazaba una empresa real solo porque el
    // suplidor la escribió sin guiones. Se comparan solo dígitos en los dos
    // lados, igual que ya se hace en otras partes del sistema con datos que
    // la gente escribe con formato inconsistente.
    const { rows: empresas } = await req.dbClient!.query(
      `SELECT id, nombre FROM empresa WHERE regexp_replace(rnc, '\\D', '', 'g') = regexp_replace($1, '\\D', '', 'g')`,
      [dto.rnc.trim()],
    );
    if (!empresas.length) {
      throw new NotFoundException('No existe ninguna empresa con ese RNC en la plataforma. Registra un lead en su lugar.');
    }
    const empresaId = empresas[0].id;

    const { rows: existentes } = await req.dbClient!.query(
      `SELECT id, estado FROM contrato_suplidor WHERE empresa_id = $1 AND suplidor_id = $2`,
      [empresaId, suplidorId],
    );
    if (existentes.length && ['ACTIVA', 'PENDIENTE'].includes(existentes[0].estado)) {
      throw new ForbiddenException(
        existentes[0].estado === 'ACTIVA'
          ? 'Ya existe un contrato activo con esta empresa.'
          : 'Ya hay una solicitud pendiente con esta empresa — espera a que back office la resuelva.',
      );
    }

    const { rows } = await req.dbClient!.query(
      `INSERT INTO contrato_suplidor (empresa_id, suplidor_id, ajuste_pct, estado)
       VALUES ($1, $2, $3, 'PENDIENTE')
       ON CONFLICT (empresa_id, suplidor_id) DO UPDATE SET
         ajuste_pct = EXCLUDED.ajuste_pct, estado = 'PENDIENTE'
       RETURNING id, empresa_id, ajuste_pct, estado`,
      [empresaId, suplidorId, dto.ajustePctPropuesto ?? 0],
    );
    return { ...rows[0], empresa_nombre: empresas[0].nombre };
  }

  @Get('contratos')
  async misContratos(@Req() req: Request) {
    const { rows } = await req.dbClient!.query(
      `SELECT cs.id, cs.empresa_id, e.nombre AS empresa_nombre, cs.ajuste_pct, cs.estado
       FROM contrato_suplidor cs
       JOIN empresa e ON e.id = cs.empresa_id
       WHERE cs.suplidor_id = $1
       ORDER BY cs.id DESC`,
      [req.ambito!.id],
    );
    return { contratos: rows };
  }

  @Post('leads')
  async crearLead(@Req() req: Request, @Body() dto: CrearLeadDto) {
    if (!dto.nombrePropuesto?.trim()) throw new BadRequestException('nombrePropuesto es obligatorio.');
    const suplidorId = req.ambito!.id as number;
    const { rows } = await req.dbClient!.query(
      `INSERT INTO lead_comercial (suplidor_id, nombre_propuesto, rnc_propuesto, contacto, mensaje)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, nombre_propuesto, rnc_propuesto, contacto, mensaje, estado, creado_en`,
      [suplidorId, dto.nombrePropuesto.trim(), dto.rncPropuesto ?? null, dto.contacto ?? null, dto.mensaje ?? null],
    );
    return rows[0];
  }

  @Get('leads')
  async misLeads(@Req() req: Request) {
    const { rows } = await req.dbClient!.query(
      `SELECT id, nombre_propuesto, rnc_propuesto, contacto, mensaje, estado, creado_en
       FROM lead_comercial WHERE suplidor_id = $1 ORDER BY creado_en DESC`,
      [req.ambito!.id],
    );
    return { leads: rows };
  }

  // ---------- Sprint 19, subsprint 19.4: resumen del suplidor ----------
  //
  // El suplidor hoy navega directo a sus pestañas de trabajo, sin una
  // vista general al entrar. Cobertura de menú: mismo cálculo que la
  // tarjeta de plataforma del Sprint 14, pero acotado a este suplidor
  // (allá se calcula para todos a la vez).

  @Get('resumen')
  async resumen(@Req() req: Request) {
    const suplidorId = req.ambito!.id as number;
    const db = req.dbClient!;

    const { rows: pedidosHoy } = await db.query(
      `SELECT estado, COUNT(*) AS cantidad FROM pedido
       WHERE suplidor_id = $1 AND fecha_servicio = CURRENT_DATE
       GROUP BY estado`,
      [suplidorId],
    );

    const rutas = await this.rutasActivasDe(req);
    const feriados = await this.feriadosDe(req, suplidorId);
    const fechas = proximosHabiles(new Date(), 10, feriados);
    let diasPublicados = 0;
    if (rutas.length) {
      const { rows } = await db.query(
        `SELECT DISTINCT fecha::text AS fecha FROM menu_dia WHERE suplidor_id = $1 AND fecha = ANY($2::date[])`,
        [suplidorId, fechas],
      );
      diasPublicados = rows.length;
    }

    const { rows: contratoRows } = await db.query(
      `SELECT COUNT(*) AS cantidad FROM contrato_suplidor WHERE suplidor_id = $1 AND estado = 'ACTIVA'`,
      [suplidorId],
    );

    const { rows: liqRows } = await db.query(
      `SELECT id, periodo_inicio, periodo_fin, estado, monto_total FROM lote_pago_suplidor
       WHERE suplidor_id = $1 ORDER BY periodo_fin DESC LIMIT 1`,
      [suplidorId],
    );

    return {
      pedidosHoy,
      coberturaMenu: { diasPublicados, diasTotal: fechas.length },
      contratosActivos: Number(contratoRows[0].cantidad),
      ultimaLiquidacion: liqRows[0] ?? null,
    };
  }

  // ---------- Helpers privados ----------

  private async rutasActivasDe(req: Request): Promise<RutaRow[]> {
    const { rows } = await req.dbClient!.query(
      `SELECT hora_cutoff, dias_anticipacion FROM ruta_servicio WHERE estado = 'ACTIVA'`,
    );
    return rows;
  }

  /** Feriados de TODAS las empresas que este suplidor sirve, vía sus rutas. */
  private async feriadosDe(req: Request, _suplidorId: number): Promise<Set<string>> {
    const { rows } = await req.dbClient!.query(
      `SELECT DISTINCT dnh.fecha
       FROM dia_no_habil dnh
       JOIN punto_entrega pe ON pe.empresa_id = dnh.empresa_id
       JOIN ruta_servicio rs ON rs.punto_entrega_id = pe.id
       WHERE rs.estado = 'ACTIVA'`,
    );
    return new Set(rows.map((r: { fecha: Date }) => iso(new Date(r.fecha))));
  }

  /** El cutoff más temprano entre las rutas activas — conservador: congela
   * en cuanto la primera ruta lo requiera, ver plan-sprints.md Sprint 3. */
  private cutoffMinimoDe(fechaISO: string, rutas: RutaRow[], feriados: Set<string>): Date {
    const cutoffs = rutas.map((r) => cutoffDe(fechaISO, r.hora_cutoff, r.dias_anticipacion, feriados));
    return new Date(Math.min(...cutoffs.map((c) => c.getTime())));
  }
}
