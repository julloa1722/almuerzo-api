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
  Query,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { Roles, RolesGuard } from '../common/roles.guard';
import { TenantContextInterceptor } from '../common/tenant-context.interceptor';
import { cutoffDe, fechaDe, iso, ventanaSilencioVenceEn, ventanaSilencioVencida } from '../common/calendario.util';
import { frecuenciaNominaDe, postearCargo } from '../common/libro-mayor';
import { enviarNotificacion } from '../common/notificaciones';
import { consumoCicloDe } from './consumo-ciclo';
import { registrarEventoPedido } from './pedido-evento';
import { aplicarAjustePct, calcularSubsidio, generarCodigoRetiro, ProgramaBeneficio } from './elegibilidad.util';
import {
  CrearPedidoDto,
  DisputarPedidoDto,
  EntregarPedidoDto,
  MotivoDisputa,
  NoEntregadoDto,
  ResolverDisputaDto,
} from './dto';

const MOTIVOS_DISPUTA: MotivoDisputa[] = ['NO_LLEGO', 'INCOMPLETO', 'EQUIVOCADO', 'CALIDAD', 'OTRO'];

@Controller('pedidos')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(TenantContextInterceptor)
export class PedidosController {
  // ---------- Colaborador ----------

  @Post()
  @Roles('COLABORADOR')
  async crearPedido(@Req() req: Request, @Body() dto: CrearPedidoDto) {
    const empresaId = req.ambito!.id as number;
    const db = req.dbClient!;

    if (!dto.lineas?.length) throw new BadRequestException('El pedido necesita al menos una línea.');

    const colaborador = await this.colaboradorDe(req);

    // 1. Colaborador activo, sin fecha de salida anterior a la fecha de servicio
    if (colaborador.estado !== 'ACTIVO') throw new ForbiddenException('Tu perfil de colaborador no está activo.');
    if (colaborador.fecha_salida && iso(new Date(colaborador.fecha_salida)) <= dto.fecha) {
      throw new ForbiddenException('Tu fecha de salida ya pasó o coincide con la fecha del pedido.');
    }

    // Programa vigente para esa fecha (también valida asignación y día hábil)
    const { rows: progRows } = await db.query(
      `SELECT pb.id AS programa_id, pb.tipo_subsidio, pb.valor_subsidio, pb.tope_diario_subsidio,
              pb.tope_ciclo_colaborador, pb.permite_excedente, pb.dias_semana, pb.pct_max_salario
       FROM asignacion_programa ap
       JOIN programa_beneficio pb ON pb.id = ap.programa_id
       WHERE ap.colaborador_id = $1 AND pb.estado = 'ACTIVO'
         AND ap.vigente_desde <= $2 AND (ap.vigente_hasta IS NULL OR ap.vigente_hasta >= $2)
       LIMIT 1`,
      [colaborador.id, dto.fecha],
    );
    if (!progRows.length) {
      throw new ForbiddenException('No tienes un programa de beneficio vigente para esa fecha.');
    }
    const programa = progRows[0];

    // 2. Día hábil según el programa (días de la semana permitidos + feriados de la empresa)
    const { rows: feriadoRows } = await db.query('SELECT fecha FROM dia_no_habil WHERE empresa_id = $1', [empresaId]);
    const feriados = new Set(feriadoRows.map((r: { fecha: Date }) => iso(new Date(r.fecha))));
    const fecha = fechaDe(dto.fecha);
    if (!programa.dias_semana.includes(fecha.getDay())) {
      throw new BadRequestException(`El ${dto.fecha} no es un día hábil del programa de beneficio.`);
    }
    if (feriados.has(dto.fecha)) {
      throw new BadRequestException(`El ${dto.fecha} está marcado como feriado.`);
    }

    // 4. Ruta activa: el suplidor sirve el punto de entrega del colaborador
    const { rows: rutaRows } = await db.query(
      `SELECT hora_cutoff, dias_anticipacion FROM ruta_servicio
       WHERE suplidor_id = $1 AND punto_entrega_id = $2 AND estado = 'ACTIVA'`,
      [dto.suplidorId, colaborador.punto_entrega_id],
    );
    if (!rutaRows.length) {
      throw new BadRequestException('Ese suplidor no sirve tu punto de entrega.');
    }

    // 5. Antes del cutoff
    const cutoff = cutoffDe(dto.fecha, rutaRows[0].hora_cutoff, rutaRows[0].dias_anticipacion, feriados);
    if (new Date() >= cutoff) {
      throw new ForbiddenException(`El cutoff de esa fecha venció el ${cutoff.toISOString()}.`);
    }

    // 6. Sin pedido duplicado (mismo colaborador + fecha + suplidor, no cancelado)
    const { rows: dupRows } = await db.query(
      `SELECT id FROM pedido WHERE colaborador_id = $1 AND fecha_servicio = $2 AND suplidor_id = $3 AND estado != 'CANCELADO'`,
      [colaborador.id, dto.fecha, dto.suplidorId],
    );
    if (dupRows.length) throw new ForbiddenException('Ya existe un pedido tuyo para esa fecha y suplidor.');

    // 6b. Ajuste de precio del contrato empresa↔suplidor (bug real corregido
    // en el Sprint 7: existía desde el Sprint 2 y nunca se aplicaba — ver
    // plan-sprints.md, Sprint 4). Negativo = descuento por volumen que el
    // suplidor le dio a esta empresa; el colaborador paga ese % de menos
    // (o de más) sobre el precio publicado. Si llegamos hasta aquí ya
    // sabemos por RLS (migrations/0007) que existe un contrato activo, pero
    // se valida igual de forma explícita en vez de asumirlo en silencio.
    const { rows: contratoRows } = await db.query(
      `SELECT ajuste_pct FROM contrato_suplidor WHERE empresa_id = $1 AND suplidor_id = $2 AND estado = 'ACTIVA'`,
      [empresaId, dto.suplidorId],
    );
    if (!contratoRows.length) {
      throw new BadRequestException('Tu empresa no tiene un contrato activo con ese suplidor.');
    }
    const ajustePct = Number(contratoRows[0].ajuste_pct);

    // 7. Cupo disponible — con SELECT FOR UPDATE, para que dos colaboradores
    // no tomen el mismo último cupo a la vez.
    let bruto = 0;
    const lineasValidadas: { menuDiaId: number; cantidad: number; precio: number; subtotal: number }[] = [];
    for (const linea of dto.lineas) {
      const { rows: menuRows } = await db.query(
        `SELECT id, suplidor_id, fecha, precio, cupo_max, cupo_usado, activo
         FROM menu_dia WHERE id = $1 FOR UPDATE`,
        [linea.menuDiaId],
      );
      if (!menuRows.length) throw new NotFoundException(`El plato ${linea.menuDiaId} no existe.`);
      const md = menuRows[0];
      if (md.suplidor_id !== dto.suplidorId || iso(new Date(md.fecha)) !== dto.fecha) {
        throw new BadRequestException('Uno de los platos no corresponde al suplidor o fecha indicados.');
      }
      if (!md.activo) throw new BadRequestException('Uno de los platos fue retirado del menú de ese día.');
      if (md.cupo_max != null && md.cupo_usado + linea.cantidad > md.cupo_max) {
        throw new ForbiddenException(`Sin cupo suficiente para el plato ${linea.menuDiaId}.`);
      }
      const precioAjustado = aplicarAjustePct(Number(md.precio), ajustePct);
      const subtotal = Math.round(precioAjustado * linea.cantidad * 100) / 100;
      bruto += subtotal;
      lineasValidadas.push({ menuDiaId: linea.menuDiaId, cantidad: linea.cantidad, precio: precioAjustado, subtotal });
    }

    // Subsidio ya usado hoy (por si el colaborador pide de más de un suplidor el mismo día).
    // Excluye CANCELADO y NO_ENTREGADO: un pedido no recibido no debe contar
    // contra el tope — ver plan-sprints.md, Sprint 5.
    const { rows: usadoHoyRows } = await db.query(
      `SELECT COALESCE(SUM(subsidio_empresa),0) AS usado FROM pedido
       WHERE colaborador_id = $1 AND fecha_servicio = $2 AND estado NOT IN ('CANCELADO','NO_ENTREGADO')`,
      [colaborador.id, dto.fecha],
    );
    const subsidioUsadoHoy = Number(usadoHoyRows[0].usado);

    const progCfg: ProgramaBeneficio = {
      tipoSubsidio: programa.tipo_subsidio,
      valorSubsidio: Number(programa.valor_subsidio),
      topeDiarioSubsidio: programa.tope_diario_subsidio != null ? Number(programa.tope_diario_subsidio) : null,
      topeCicloColaborador: programa.tope_ciclo_colaborador != null ? Number(programa.tope_ciclo_colaborador) : null,
      permiteExcedente: programa.permite_excedente,
      pctMaxSalario: Number(programa.pct_max_salario),
    };
    const calculo = calcularSubsidio(progCfg, bruto, subsidioUsadoHoy);

    // 8. permite_excedente
    if (!progCfg.permiteExcedente && calculo.montoColaborador > 0) {
      throw new ForbiddenException(
        `El programa no permite excedente y este pedido dejaría RD$ ${calculo.montoColaborador} a tu cargo.`,
      );
    }

    // 9 y 10. Tope de ciclo y límite de endeudamiento — consumo calculado
    // directo de pedido, sin libro mayor todavía (ver plan-sprints.md, Sprint 4).
    // La consulta de período+consumo vive en consumo-ciclo.ts (Sprint 10,
    // subsprint 10.5) — GET /pedidos/consumo-ciclo la reutiliza sin duplicarla.
    const { rows: empresaRows } = await db.query('SELECT frecuencia_nomina FROM empresa WHERE id = $1', [empresaId]);
    const consumoInfo = await consumoCicloDe(db, {
      colaboradorId: colaborador.id,
      fecha,
      frecuenciaNomina: empresaRows[0].frecuencia_nomina,
      topeCicloColaborador: progCfg.topeCicloColaborador,
      pctMaxSalario: progCfg.pctMaxSalario,
      salarioNetoRef: colaborador.salario_neto_ref != null ? Number(colaborador.salario_neto_ref) : null,
    });
    const consumoProyectado = consumoInfo.consumo + calculo.montoColaborador;

    if (progCfg.topeCicloColaborador != null && consumoProyectado > progCfg.topeCicloColaborador) {
      throw new ForbiddenException(
        `Excede el tope del período: RD$ ${consumoProyectado.toFixed(2)} sobre un tope de RD$ ${progCfg.topeCicloColaborador}.`,
      );
    }
    if (colaborador.salario_neto_ref && consumoInfo.limiteSalario != null) {
      if (consumoProyectado > consumoInfo.limiteSalario) {
        throw new ForbiddenException(
          `Excede el ${progCfg.pctMaxSalario}% de tu salario neto (RD$ ${consumoInfo.limiteSalario.toFixed(2)}).`,
        );
      }
    }

    // Todo válido: insertar pedido + líneas, y descontar cupo.
    // programa_id queda congelado en el pedido (Sprint 5): la política de
    // silencio que le corresponde no debe depender de si la asignación del
    // colaborador cambió después de crear este pedido.
    const { rows: pedidoRows } = await db.query(
      `INSERT INTO pedido (empresa_id, colaborador_id, suplidor_id, fecha_servicio, cutoff_at, total_bruto, subsidio_empresa, monto_colaborador, codigo_retiro, programa_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, estado, codigo_retiro, total_bruto, subsidio_empresa, monto_colaborador, fecha_servicio`,
      [
        empresaId,
        colaborador.id,
        dto.suplidorId,
        dto.fecha,
        cutoff.toISOString(),
        calculo.bruto,
        calculo.subsidio,
        calculo.montoColaborador,
        generarCodigoRetiro(),
        programa.programa_id,
      ],
    );
    const pedido = pedidoRows[0];
    await registrarEventoPedido(db, {
      pedidoId: pedido.id,
      empresaId,
      estadoAnterior: null,
      estadoNuevo: pedido.estado,
      actor: 'COLABORADOR',
    });

    for (const l of lineasValidadas) {
      await db.query(
        `INSERT INTO pedido_linea (pedido_id, empresa_id, menu_dia_id, cantidad, precio_unit, subtotal)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [pedido.id, empresaId, l.menuDiaId, l.cantidad, l.precio, l.subtotal],
      );
      await db.query('UPDATE menu_dia SET cupo_usado = cupo_usado + $1 WHERE id = $2', [l.cantidad, l.menuDiaId]);
    }

    return { ...pedido, lineas: lineasValidadas };
  }

  /**
   * Hueco real, anotado desde el Sprint 5 y nunca resuelto hasta ahora:
   * `GET /catalogo/menu` es de ámbito SUPLIDOR_ADMIN únicamente y no
   * expone `suplidor_id` — un colaborador no tenía ninguna forma vía API
   * de descubrir qué suplidores/platos puede pedir sin conocerlos de
   * antemano, aunque `POST /pedidos` los exige. Este endpoint es esa
   * pieza que faltaba: solo suplidores con ruta activa al punto de entrega
   * del colaborador Y contrato activo con su empresa (las mismas dos
   * condiciones que ya exige `crearPedido` más abajo), con el precio ya
   * ajustado por `ajuste_pct` (lo que de verdad pagaría, Sprint 7) y si
   * todavía se puede pedir (antes del cutoff, con cupo).
   */
  @Get('menu-disponible')
  @Roles('COLABORADOR')
  async menuDisponible(@Req() req: Request, @Query('desde') desdeQ?: string, @Query('hasta') hastaQ?: string) {
    const empresaId = req.ambito!.id as number;
    const colaborador = await this.colaboradorDe(req);
    const desde = desdeQ ?? iso(new Date());
    const hasta = hastaQ ?? iso(new Date(Date.now() + 14 * 86400000));

    const { rows } = await req.dbClient!.query(
      `SELECT s.id AS suplidor_id, s.nombre AS suplidor_nombre, cs.ajuste_pct,
              md.id AS menu_dia_id, md.fecha, md.precio, md.cupo_max, md.cupo_usado,
              pr.nombre AS producto_nombre, pr.descripcion, pr.categoria, pr.etiquetas,
              rs.hora_cutoff, rs.dias_anticipacion
       FROM ruta_servicio rs
       JOIN suplidor s ON s.id = rs.suplidor_id
       JOIN contrato_suplidor cs ON cs.suplidor_id = s.id AND cs.empresa_id = $1 AND cs.estado = 'ACTIVA'
       JOIN menu_dia md ON md.suplidor_id = s.id AND md.fecha BETWEEN $2 AND $3 AND md.activo = true
       JOIN producto pr ON pr.id = md.producto_id
       WHERE rs.punto_entrega_id = $4 AND rs.estado = 'ACTIVA'
       ORDER BY md.fecha, s.nombre, pr.nombre`,
      [empresaId, desde, hasta, colaborador.punto_entrega_id],
    );

    const { rows: feriadoRows } = await req.dbClient!.query('SELECT fecha FROM dia_no_habil WHERE empresa_id = $1', [
      empresaId,
    ]);
    const feriados = new Set(feriadoRows.map((r: { fecha: Date }) => iso(new Date(r.fecha))));

    const porFecha: Record<string, unknown[]> = {};
    for (const row of rows) {
      const fechaStr = iso(new Date(row.fecha));
      const cutoff = cutoffDe(fechaStr, row.hora_cutoff, row.dias_anticipacion, feriados);
      const cupoDisponible = row.cupo_max == null ? null : row.cupo_max - row.cupo_usado;
      const disponible = new Date() < cutoff && (cupoDisponible == null || cupoDisponible > 0);

      if (!porFecha[fechaStr]) porFecha[fechaStr] = [];
      porFecha[fechaStr].push({
        suplidorId: row.suplidor_id,
        suplidorNombre: row.suplidor_nombre,
        menuDiaId: row.menu_dia_id,
        productoNombre: row.producto_nombre,
        descripcion: row.descripcion,
        categoria: row.categoria,
        etiquetas: row.etiquetas,
        precio: aplicarAjustePct(Number(row.precio), Number(row.ajuste_pct)),
        cupoDisponible,
        cutoff: cutoff.toISOString(),
        disponible,
      });
    }

    return { desde, hasta, menu: porFecha };
  }

  /**
   * Sprint 10, subsprint 10.5: el medidor "comprometido este ciclo / tope"
   * del mockup necesita el consumo del período vigente — hasta ahora
   * `crearPedido` lo calculaba pero ningún endpoint de solo lectura lo
   * exponía. Reutiliza consumoCicloDe (consumo-ciclo.ts), la misma función
   * que crearPedido, en vez de duplicar la consulta.
   */
  @Get('consumo-ciclo')
  @Roles('COLABORADOR')
  async consumoCiclo(@Req() req: Request) {
    const empresaId = req.ambito!.id as number;
    const colaborador = await this.colaboradorDe(req);
    const db = req.dbClient!;
    const hoy = new Date();

    const { rows: progRows } = await db.query(
      `SELECT pb.tope_ciclo_colaborador, pb.pct_max_salario
       FROM asignacion_programa ap
       JOIN programa_beneficio pb ON pb.id = ap.programa_id
       WHERE ap.colaborador_id = $1 AND pb.estado = 'ACTIVO'
         AND ap.vigente_desde <= $2 AND (ap.vigente_hasta IS NULL OR ap.vigente_hasta >= $2)
       LIMIT 1`,
      [colaborador.id, iso(hoy)],
    );
    if (!progRows.length) {
      throw new ForbiddenException('No tienes un programa de beneficio vigente hoy.');
    }
    const programa = progRows[0];
    const { rows: empresaRows } = await db.query('SELECT frecuencia_nomina FROM empresa WHERE id = $1', [empresaId]);

    return consumoCicloDe(db, {
      colaboradorId: colaborador.id,
      fecha: hoy,
      frecuenciaNomina: empresaRows[0].frecuencia_nomina,
      topeCicloColaborador: programa.tope_ciclo_colaborador != null ? Number(programa.tope_ciclo_colaborador) : null,
      pctMaxSalario: Number(programa.pct_max_salario),
      salarioNetoRef: colaborador.salario_neto_ref != null ? Number(colaborador.salario_neto_ref) : null,
    });
  }

  @Get('mios')
  @Roles('COLABORADOR')
  async misPedidos(@Req() req: Request) {
    const colaborador = await this.colaboradorDe(req);
    await this.resolverPorSilencio(req);
    const { rows } = await req.dbClient!.query(
      `SELECT p.id, p.fecha_servicio, p.estado, p.codigo_retiro, p.total_bruto, p.subsidio_empresa, p.monto_colaborador,
              p.entregado_en, p.motivo_disputa, s.nombre AS suplidor_nombre, pb.horas_ventana_confirmacion
       FROM pedido p
       JOIN suplidor s ON s.id = p.suplidor_id
       LEFT JOIN programa_beneficio pb ON pb.id = p.programa_id
       WHERE p.colaborador_id = $1
       ORDER BY p.fecha_servicio DESC`,
      [colaborador.id],
    );
    const pedidos = rows.map((p: any) => {
      const puedeConfirmar =
        p.estado === 'ENTREGADO' &&
        p.entregado_en != null &&
        p.horas_ventana_confirmacion != null &&
        !ventanaSilencioVencida(new Date(p.entregado_en), p.horas_ventana_confirmacion);
      const ventanaConfirmacionVenceEn =
        p.entregado_en != null && p.horas_ventana_confirmacion != null
          ? ventanaSilencioVenceEn(new Date(p.entregado_en), p.horas_ventana_confirmacion)
          : null;
      return { ...p, puedeConfirmar, ventanaConfirmacionVenceEn };
    });
    return { pedidos };
  }

  @Patch(':id/cancelar')
  @Roles('COLABORADOR')
  async cancelarPedido(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    const colaborador = await this.colaboradorDe(req);
    const db = req.dbClient!;

    const { rows } = await db.query('SELECT * FROM pedido WHERE id = $1 AND colaborador_id = $2', [id, colaborador.id]);
    if (!rows.length) throw new NotFoundException('Pedido no encontrado.');
    const pedido = rows[0];

    if (pedido.estado !== 'CONFIRMADO') throw new ForbiddenException('Solo se puede cancelar un pedido en estado CONFIRMADO.');
    if (new Date() >= new Date(pedido.cutoff_at)) throw new ForbiddenException('El cutoff de este pedido ya venció.');

    const { rows: lineas } = await db.query('SELECT menu_dia_id, cantidad FROM pedido_linea WHERE pedido_id = $1', [id]);
    for (const l of lineas) {
      await db.query('UPDATE menu_dia SET cupo_usado = cupo_usado - $1 WHERE id = $2', [l.cantidad, l.menu_dia_id]);
    }
    await db.query(`UPDATE pedido SET estado = 'CANCELADO' WHERE id = $1`, [id]);
    await registrarEventoPedido(db, {
      pedidoId: id,
      empresaId: pedido.empresa_id,
      estadoAnterior: pedido.estado,
      estadoNuevo: 'CANCELADO',
      actor: 'COLABORADOR',
    });
    return { id, estado: 'CANCELADO' };
  }

  // ---------- RRHH / Admin empresa ----------

  @Get()
  @Roles('RRHH', 'ADMIN_EMPRESA')
  async listarPedidosEmpresa(@Req() req: Request) {
    await this.resolverPorSilencio(req);
    const { rows } = await req.dbClient!.query(
      `SELECT p.id, p.fecha_servicio, p.estado, c.nombre_completo AS colaborador, s.nombre AS suplidor_nombre,
              p.total_bruto, p.subsidio_empresa, p.monto_colaborador
       FROM pedido p
       JOIN colaborador c ON c.id = p.colaborador_id
       JOIN suplidor s ON s.id = p.suplidor_id
       ORDER BY p.fecha_servicio DESC`,
    );
    return { pedidos: rows };
  }

  @Get('disputas')
  @Roles('RRHH', 'ADMIN_EMPRESA')
  async listarDisputas(@Req() req: Request) {
    await this.resolverPorSilencio(req);
    const { rows } = await req.dbClient!.query(
      `SELECT p.id, p.fecha_servicio, c.nombre_completo AS colaborador, s.nombre AS suplidor_nombre,
              p.total_bruto, p.motivo_disputa, p.nota_disputa, p.disputado_en, p.disputado_por
       FROM pedido p
       JOIN colaborador c ON c.id = p.colaborador_id
       JOIN suplidor s ON s.id = p.suplidor_id
       WHERE p.estado = 'DISPUTA'
       ORDER BY p.disputado_en`,
    );
    return { disputas: rows };
  }

  @Patch(':id/resolver-disputa')
  @Roles('RRHH', 'ADMIN_EMPRESA')
  async resolverDisputa(@Req() req: Request, @Param('id', ParseIntPipe) id: number, @Body() dto: ResolverDisputaDto) {
    const empresaId = req.ambito!.id as number;
    const db = req.dbClient!;
    const { rows } = await db.query(
      `SELECT p.id, p.estado, p.colaborador_id, p.fecha_servicio, p.monto_colaborador, c.email, c.nombre_completo
       FROM pedido p JOIN colaborador c ON c.id = p.colaborador_id
       WHERE p.id = $1`,
      [id],
    );
    if (!rows.length) throw new NotFoundException('Pedido no encontrado.');
    if (rows[0].estado !== 'DISPUTA') {
      throw new ForbiddenException(`Solo se puede resolver un pedido en estado DISPUTA (actual: ${rows[0].estado}).`);
    }

    if (dto.aFavorColaborador) {
      // A favor del colaborador: el pedido no se considera entregado — libera
      // el cupo, igual que una cancelación. El ajuste al libro mayor es
      // trabajo del Sprint 6; aquí solo se deja el estado correcto.
      const { rows: lineas } = await db.query('SELECT menu_dia_id, cantidad FROM pedido_linea WHERE pedido_id = $1', [id]);
      for (const l of lineas) {
        await db.query('UPDATE menu_dia SET cupo_usado = cupo_usado - $1 WHERE id = $2', [l.cantidad, l.menu_dia_id]);
      }
      const { rows: actualizado } = await db.query(
        `UPDATE pedido SET estado = 'NO_ENTREGADO', resolucion_disputa = 'A_FAVOR_COLABORADOR',
           resuelto_en = now(), resuelto_por = $2, nota_resolucion = $3
         WHERE id = $1
         RETURNING id, estado, resolucion_disputa`,
        [id, req.usuarioId, dto.nota ?? null],
      );
      await registrarEventoPedido(db, {
        pedidoId: id,
        empresaId,
        estadoAnterior: 'DISPUTA',
        estadoNuevo: 'NO_ENTREGADO',
        actor: 'RRHH',
      });

      await enviarNotificacion(db, {
        tipo: 'DISPUTA_RESUELTA',
        destinatario: rows[0].email,
        asunto: 'Tu disputa fue resuelta a tu favor',
        cuerpo: `Hola ${rows[0].nombre_completo}, RRHH resolvió tu disputa del pedido #${id} a tu favor. No se te cobrará por ese pedido.`,
        referenciaTipo: 'PEDIDO',
        referenciaId: id,
      });

      return actualizado[0];
    }

    const { rows: actualizado } = await db.query(
      `UPDATE pedido SET estado = 'RECIBIDO', resolucion_disputa = 'A_FAVOR_SUPLIDOR',
         confirmado_en = now(), confirmado_por = 'RRHH',
         resuelto_en = now(), resuelto_por = $2, nota_resolucion = $3
       WHERE id = $1
       RETURNING id, estado, resolucion_disputa`,
      [id, req.usuarioId, dto.nota ?? null],
    );
    await registrarEventoPedido(db, {
      pedidoId: id,
      empresaId,
      estadoAnterior: 'DISPUTA',
      estadoNuevo: 'RECIBIDO',
      actor: 'RRHH',
    });

    await postearCargo(db, {
      empresaId,
      colaboradorId: rows[0].colaborador_id,
      fechaServicio: rows[0].fecha_servicio,
      frecuenciaNomina: await frecuenciaNominaDe(db, empresaId),
      pedidoId: id,
      monto: Number(rows[0].monto_colaborador),
    });

    await enviarNotificacion(db, {
      tipo: 'DISPUTA_RESUELTA',
      destinatario: rows[0].email,
      asunto: 'Tu disputa fue resuelta a favor del suplidor',
      cuerpo: `Hola ${rows[0].nombre_completo}, RRHH revisó tu disputa del pedido #${id} y confirmó la entrega. El cargo se mantiene.`,
      referenciaTipo: 'PEDIDO',
      referenciaId: id,
    });

    return actualizado[0];
  }

  // ---------- Colaborador: confirmar o disputar la entrega ----------

  @Patch(':id/confirmar-recibido')
  @Roles('COLABORADOR')
  async confirmarRecibido(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    const empresaId = req.ambito!.id as number;
    const db = req.dbClient!;
    const colaborador = await this.colaboradorDe(req);
    await this.resolverPorSilencio(req);

    const { rows } = await db.query(
      'SELECT id, estado, fecha_servicio, monto_colaborador FROM pedido WHERE id = $1 AND colaborador_id = $2',
      [id, colaborador.id],
    );
    if (!rows.length) throw new NotFoundException('Pedido no encontrado.');
    if (rows[0].estado !== 'ENTREGADO') {
      throw new ForbiddenException(
        `Solo se puede confirmar un pedido en estado ENTREGADO (actual: ${rows[0].estado}). Si ya pasó la ventana de confirmación, se resolvió automáticamente por política de silencio.`,
      );
    }
    const { rows: actualizado } = await db.query(
      `UPDATE pedido SET estado = 'RECIBIDO', confirmado_en = now(), confirmado_por = 'COLABORADOR'
       WHERE id = $1
       RETURNING id, estado, confirmado_en`,
      [id],
    );
    await registrarEventoPedido(db, {
      pedidoId: id,
      empresaId,
      estadoAnterior: 'ENTREGADO',
      estadoNuevo: 'RECIBIDO',
      actor: 'COLABORADOR',
    });

    await postearCargo(db, {
      empresaId,
      colaboradorId: colaborador.id,
      fechaServicio: rows[0].fecha_servicio,
      frecuenciaNomina: await frecuenciaNominaDe(db, empresaId),
      pedidoId: id,
      monto: Number(rows[0].monto_colaborador),
    });

    return actualizado[0];
  }

  @Patch(':id/disputar')
  @Roles('COLABORADOR')
  async disputarPedido(@Req() req: Request, @Param('id', ParseIntPipe) id: number, @Body() dto: DisputarPedidoDto) {
    if (!MOTIVOS_DISPUTA.includes(dto.motivo)) {
      throw new BadRequestException(`motivo debe ser uno de: ${MOTIVOS_DISPUTA.join(', ')}.`);
    }
    const empresaId = req.ambito!.id as number;
    const colaborador = await this.colaboradorDe(req);
    await this.resolverPorSilencio(req);

    const { rows } = await req.dbClient!.query('SELECT id, estado FROM pedido WHERE id = $1 AND colaborador_id = $2', [
      id,
      colaborador.id,
    ]);
    if (!rows.length) throw new NotFoundException('Pedido no encontrado.');
    if (rows[0].estado !== 'ENTREGADO') {
      throw new ForbiddenException(
        `Solo se puede disputar un pedido en estado ENTREGADO (actual: ${rows[0].estado}). Si ya pasó la ventana de confirmación, se resolvió automáticamente por política de silencio.`,
      );
    }
    const { rows: actualizado } = await req.dbClient!.query(
      `UPDATE pedido SET estado = 'DISPUTA', disputado_en = now(), disputado_por = 'COLABORADOR',
         motivo_disputa = $2, nota_disputa = $3
       WHERE id = $1
       RETURNING id, estado, disputado_en, motivo_disputa`,
      [id, dto.motivo, dto.nota ?? null],
    );
    await registrarEventoPedido(req.dbClient!, {
      pedidoId: id,
      empresaId,
      estadoAnterior: 'ENTREGADO',
      estadoNuevo: 'DISPUTA',
      actor: 'COLABORADOR',
    });
    return actualizado[0];
  }

  // ---------- Suplidor: preparación y entrega ----------

  @Get('preparacion')
  @Roles('SUPLIDOR_ADMIN')
  async listaPreparacion(@Req() req: Request, @Query('fecha') fechaQ?: string) {
    const suplidorId = req.ambito!.id as number;
    const fecha = fechaQ ?? iso(new Date());

    // Sin resolverPorSilencio aquí a propósito: programa_beneficio tiene RLS
    // por empresa_id, invisible en ámbito SUPLIDOR — la resolución perezosa
    // solo puede correr (y solo hace falta) desde los endpoints de ámbito
    // EMPRESA (colaborador/RRHH). El suplidor tampoco tiene ninguna acción
    // sobre un pedido ya ENTREGADO, así que no le afecta.
    const { rows: pedidos } = await req.dbClient!.query(
      `SELECT p.id, p.estado, c.nombre_completo AS colaborador, pe.nombre AS punto_entrega
       FROM pedido p
       JOIN colaborador c ON c.id = p.colaborador_id
       LEFT JOIN punto_entrega pe ON pe.id = c.punto_entrega_id
       WHERE p.suplidor_id = $1 AND p.fecha_servicio = $2
         AND p.estado IN ('CONFIRMADO','EN_PREPARACION','ENTREGADO','NO_ENTREGADO')
       ORDER BY pe.nombre, c.nombre_completo`,
      [suplidorId, fecha],
    );

    // El código de retiro NO se incluye aquí a propósito: si el suplidor
    // pudiera leerlo desde esta lista, teclearlo en /entregar dejaría de
    // probar que habló con el colaborador — ver plan-sprints.md, Sprint 5.
    const { rows: lineas } = await req.dbClient!.query(
      `SELECT pl.pedido_id, pr.nombre AS producto_nombre, pl.cantidad
       FROM pedido_linea pl
       JOIN pedido p ON p.id = pl.pedido_id
       JOIN menu_dia md ON md.id = pl.menu_dia_id
       JOIN producto pr ON pr.id = md.producto_id
       WHERE p.suplidor_id = $1 AND p.fecha_servicio = $2`,
      [suplidorId, fecha],
    );

    const lineasPorPedido = new Map<number, { producto_nombre: string; cantidad: number }[]>();
    const consolidado: Record<string, number> = {};
    for (const l of lineas) {
      if (!lineasPorPedido.has(l.pedido_id)) lineasPorPedido.set(l.pedido_id, []);
      lineasPorPedido.get(l.pedido_id)!.push({ producto_nombre: l.producto_nombre, cantidad: l.cantidad });
      consolidado[l.producto_nombre] = (consolidado[l.producto_nombre] ?? 0) + l.cantidad;
    }

    const porPuntoEntrega: Record<string, unknown[]> = {};
    for (const p of pedidos) {
      const punto = p.punto_entrega ?? 'Sin punto de entrega';
      if (!porPuntoEntrega[punto]) porPuntoEntrega[punto] = [];
      porPuntoEntrega[punto].push({ ...p, lineas: lineasPorPedido.get(p.id) ?? [] });
    }

    return { fecha, consolidado, porPuntoEntrega };
  }

  @Patch(':id/preparar')
  @Roles('SUPLIDOR_ADMIN')
  async prepararPedido(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    const { rows } = await req.dbClient!.query(
      `UPDATE pedido SET estado = 'EN_PREPARACION' WHERE id = $1 AND estado = 'CONFIRMADO'
       RETURNING id, estado, empresa_id`,
      [id],
    );
    if (rows.length) {
      await registrarEventoPedido(req.dbClient!, {
        pedidoId: id,
        empresaId: rows[0].empresa_id,
        estadoAnterior: 'CONFIRMADO',
        estadoNuevo: 'EN_PREPARACION',
        actor: 'SUPLIDOR',
      });
      return rows[0];
    }

    const { rows: existente } = await req.dbClient!.query('SELECT estado FROM pedido WHERE id = $1', [id]);
    if (!existente.length) throw new NotFoundException('Pedido no encontrado.');
    throw new ForbiddenException(
      `Solo se puede pasar a preparación un pedido en estado CONFIRMADO (actual: ${existente[0].estado}).`,
    );
  }

  @Patch(':id/entregar')
  @Roles('SUPLIDOR_ADMIN')
  async entregarPedido(@Req() req: Request, @Param('id', ParseIntPipe) id: number, @Body() dto: EntregarPedidoDto) {
    if (!dto.codigoRetiro?.trim()) throw new BadRequestException('codigoRetiro es obligatorio.');
    const db = req.dbClient!;

    const { rows } = await db.query('SELECT id, estado, codigo_retiro, empresa_id FROM pedido WHERE id = $1', [id]);
    if (!rows.length) throw new NotFoundException('Pedido no encontrado.');
    const pedido = rows[0];
    if (!['CONFIRMADO', 'EN_PREPARACION'].includes(pedido.estado)) {
      throw new ForbiddenException(`Solo se puede entregar un pedido CONFIRMADO o EN_PREPARACION (actual: ${pedido.estado}).`);
    }
    if (pedido.codigo_retiro !== dto.codigoRetiro.trim().toUpperCase()) {
      throw new BadRequestException('El código de retiro no coincide con el de este pedido.');
    }

    const { rows: actualizado } = await db.query(
      `UPDATE pedido SET estado = 'ENTREGADO', entregado_en = now() WHERE id = $1 RETURNING id, estado, entregado_en`,
      [id],
    );
    await registrarEventoPedido(db, {
      pedidoId: id,
      empresaId: pedido.empresa_id,
      estadoAnterior: pedido.estado,
      estadoNuevo: 'ENTREGADO',
      actor: 'SUPLIDOR',
    });

    const { rows: colabRows } = await db.query(
      `SELECT c.email, c.nombre_completo FROM pedido p JOIN colaborador c ON c.id = p.colaborador_id WHERE p.id = $1`,
      [id],
    );
    await enviarNotificacion(db, {
      tipo: 'PEDIDO_ENTREGADO',
      destinatario: colabRows[0]?.email,
      asunto: 'Tu pedido de almuerzo fue entregado',
      cuerpo: `Hola ${colabRows[0]?.nombre_completo ?? ''}, tu pedido #${id} fue marcado como entregado. Confírmalo (o repórtalo) desde la app antes de que venza tu ventana de confirmación.`,
      referenciaTipo: 'PEDIDO',
      referenciaId: id,
    });

    return actualizado[0];
  }

  @Patch(':id/no-entregado')
  @Roles('SUPLIDOR_ADMIN')
  async marcarNoEntregado(@Req() req: Request, @Param('id', ParseIntPipe) id: number, @Body() dto: NoEntregadoDto) {
    const db = req.dbClient!;
    const { rows } = await db.query('SELECT id, estado, empresa_id FROM pedido WHERE id = $1', [id]);
    if (!rows.length) throw new NotFoundException('Pedido no encontrado.');
    if (!['CONFIRMADO', 'EN_PREPARACION'].includes(rows[0].estado)) {
      throw new ForbiddenException(
        `Solo se puede marcar NO_ENTREGADO desde CONFIRMADO o EN_PREPARACION (actual: ${rows[0].estado}).`,
      );
    }

    const { rows: lineas } = await db.query('SELECT menu_dia_id, cantidad FROM pedido_linea WHERE pedido_id = $1', [id]);
    for (const l of lineas) {
      await db.query('UPDATE menu_dia SET cupo_usado = cupo_usado - $1 WHERE id = $2', [l.cantidad, l.menu_dia_id]);
    }

    const { rows: actualizado } = await db.query(
      `UPDATE pedido SET estado = 'NO_ENTREGADO', nota_resolucion = COALESCE($2, nota_resolucion) WHERE id = $1
       RETURNING id, estado`,
      [id, dto.nota ?? null],
    );
    await registrarEventoPedido(db, {
      pedidoId: id,
      empresaId: rows[0].empresa_id,
      estadoAnterior: rows[0].estado,
      estadoNuevo: 'NO_ENTREGADO',
      actor: 'SUPLIDOR',
    });
    return actualizado[0];
  }

  // ---------- Helper ----------

  private async colaboradorDe(req: Request) {
    const { rows } = await req.dbClient!.query('SELECT * FROM colaborador WHERE usuario_id = $1', [req.usuarioId]);
    if (!rows.length) {
      throw new ForbiddenException('Tu usuario no tiene un perfil de colaborador asociado en esta empresa.');
    }
    return rows[0];
  }

  /**
   * Política de silencio (Sprint 5): un solo UPDATE ... FROM ... WHERE, no
   * un loop por pedido — se ejecuta al inicio de cualquier endpoint de
   * ámbito EMPRESA que lea o toque pedidos, acotado por RLS de la misma
   * transacción. Ver "Notas de implementación" en plan-sprints.md, Sprint 5.
   *
   * Los pedidos que resolvieron a RECIBIDO (no los que fueron a DISPUTA)
   * postean su CARGO al libro mayor (Sprint 6) — RETURNING devuelve solo
   * los que de verdad cambiaron, así que el loop de después normalmente
   * está vacío, no es un N+1 real en el caso común.
   */
  private async resolverPorSilencio(req: Request): Promise<void> {
    const db = req.dbClient!;
    const empresaId = req.ambito!.id as number;
    const { rows } = await db.query(
      `UPDATE pedido p
       SET estado = CASE WHEN pb.politica_silencio = 'AUTO_DISPUTA' THEN 'DISPUTA' ELSE 'RECIBIDO' END,
           confirmado_en = CASE WHEN pb.politica_silencio != 'AUTO_DISPUTA' THEN now() ELSE p.confirmado_en END,
           confirmado_por = CASE WHEN pb.politica_silencio != 'AUTO_DISPUTA' THEN 'SILENCIO' ELSE p.confirmado_por END,
           disputado_en = CASE WHEN pb.politica_silencio = 'AUTO_DISPUTA' THEN now() ELSE p.disputado_en END,
           disputado_por = CASE WHEN pb.politica_silencio = 'AUTO_DISPUTA' THEN 'SILENCIO' ELSE p.disputado_por END,
           motivo_disputa = CASE WHEN pb.politica_silencio = 'AUTO_DISPUTA' THEN 'OTRO' ELSE p.motivo_disputa END
       FROM programa_beneficio pb
       WHERE p.programa_id = pb.id
         AND p.estado = 'ENTREGADO'
         AND p.entregado_en IS NOT NULL
         AND p.entregado_en + (pb.horas_ventana_confirmacion || ' hours')::interval <= now()
       RETURNING p.id, p.estado, p.colaborador_id, p.fecha_servicio, p.monto_colaborador`,
    );

    // Sprint 14: un solo UPDATE masivo puede resolver varios pedidos a la
    // vez por silencio — un evento por pedido afectado, todos ENTREGADO en
    // el estado anterior (es la única condición que exige el WHERE de arriba).
    for (const r of rows) {
      await registrarEventoPedido(db, {
        pedidoId: r.id,
        empresaId,
        estadoAnterior: 'ENTREGADO',
        estadoNuevo: r.estado,
        actor: 'SILENCIO',
      });
    }

    const recibidos = rows.filter((r: any) => r.estado === 'RECIBIDO');
    if (!recibidos.length) return;

    const frecuenciaNomina = await frecuenciaNominaDe(db, empresaId);
    for (const r of recibidos) {
      await postearCargo(db, {
        empresaId,
        colaboradorId: r.colaborador_id,
        fechaServicio: r.fecha_servicio,
        frecuenciaNomina,
        pedidoId: r.id,
        monto: Number(r.monto_colaborador),
      });
    }
  }
}
