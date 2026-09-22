import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { Pool } from 'pg';
import { PG_POOL_PLATAFORMA } from '../db/db.module';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { Roles, RolesGuard } from '../common/roles.guard';
import { enviarNotificacion } from '../common/notificaciones';

interface SolicitudDto {
  nombre?: string;
  email?: string;
  telefono?: string;
  tipo?: 'SUPLIDOR' | 'EMPRESA';
  negocio?: string;
  mensaje?: string;
  /** Campo trampa: ver `crear()`. */
  web?: string;
}

const ESTADOS = ['NUEVA', 'ATENDIDA', 'DESCARTADA'] as const;
type Estado = (typeof ESTADOS)[number];

/**
 * Sprint 22 — la puerta comercial.
 *
 * Usa `PG_POOL_PLATAFORMA` directo, no `req.dbClient`: el endpoint público
 * corre sin sesión, así que no hay ningún ámbito que fijar en el GUC de RLS.
 * Mismo patrón que `InvitacionesService` para aceptar una invitación.
 */
@Controller('contacto')
export class ContactoController {
  constructor(@Inject(PG_POOL_PLATAFORMA) private readonly pool: Pool) {}

  // ---------- Público, sin JWT ----------

  /**
   * 5 cada 10 minutos por IP.
   *
   * El throttler cuenta PETICIONES, no envíos exitosos, así que los rechazos
   * por validación también gastan cupo. Por eso no se apretó más: una persona
   * que se equivoca al escribir su correo, lo corrige y reenvía ya lleva dos
   * intentos, y quedarse fuera cinco minutos por eso sería peor que el spam
   * que estamos evitando. Un robot, en cambio, dispara cientos — con cinco
   * ya está frenado.
   */
  @Post()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 600_000 } })
  async crear(@Body() dto: SolicitudDto) {
    // Campo trampa. `web` va oculto en el formulario, así que una persona
    // nunca lo llena y un robot que rellena todo lo que encuentra, sí.
    // Se responde como si hubiera funcionado: que el robot se vaya contento es
    // mejor que enseñarle qué lo delató y que ajuste el siguiente intento.
    if (dto.web) return { recibido: true };

    const nombre = dto.nombre?.trim();
    const email = dto.email?.trim().toLowerCase();
    const tipo = dto.tipo;

    if (!nombre) throw new BadRequestException('Dinos cómo te llamas.');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException('Ese correo no parece válido.');
    }
    if (tipo !== 'SUPLIDOR' && tipo !== 'EMPRESA') {
      throw new BadRequestException('Indica si escribes como suplidor o como empresa.');
    }

    const cliente = await this.pool.connect();
    try {
      const { rows } = await cliente.query(
        `INSERT INTO solicitud_contacto (nombre, email, telefono, tipo, negocio, mensaje)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [
          nombre.slice(0, 160),
          email.slice(0, 200),
          dto.telefono?.trim().slice(0, 40) || null,
          tipo,
          dto.negocio?.trim().slice(0, 160) || null,
          dto.mensaje?.trim().slice(0, 4000) || null,
        ],
      );

      // El aviso es cortesía: la solicitud ya está guardada. Si el correo
      // falla, `enviarNotificacion` lo registra y no lanza — nunca debe tumbar
      // el envío de alguien que quiere ser cliente.
      const destino = process.env.RESEND_FROM_EMAIL;
      if (destino) {
        await enviarNotificacion(cliente, {
          tipo: 'SOLICITUD_CONTACTO',
          destinatario: destino,
          asunto: `Nueva solicitud de ${tipo === 'SUPLIDOR' ? 'un suplidor' : 'una empresa'}`,
          cuerpo:
            `${nombre} (${email}) escribió desde la página de contacto.\n\n` +
            `Tipo: ${tipo}\n` +
            `Negocio: ${dto.negocio?.trim() || '(no indicó)'}\n` +
            `Teléfono: ${dto.telefono?.trim() || '(no indicó)'}\n\n` +
            `${dto.mensaje?.trim() || '(sin mensaje)'}`,
          referenciaTipo: 'SOLICITUD_CONTACTO',
          referenciaId: rows[0].id,
        });
      }

      return { recibido: true };
    } finally {
      cliente.release();
    }
  }

  // ---------- Back office ----------

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN', 'SOPORTE')
  async listar() {
    const { rows } = await this.pool.query(
      `SELECT id, nombre, email, telefono, tipo, negocio, mensaje, estado, creado_en, atendido_en
         FROM solicitud_contacto
        ORDER BY (estado = 'NUEVA') DESC, creado_en DESC
        LIMIT 200`,
    );
    return { solicitudes: rows };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN', 'SOPORTE')
  async cambiarEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: { estado?: Estado },
  ) {
    if (!dto.estado || !ESTADOS.includes(dto.estado)) {
      throw new BadRequestException(`estado debe ser uno de: ${ESTADOS.join(', ')}.`);
    }
    const { rows } = await this.pool.query(
      `UPDATE solicitud_contacto
          SET estado = $2,
              atendido_en = CASE WHEN $2 = 'NUEVA' THEN NULL ELSE now() END
        WHERE id = $1
        RETURNING id, estado, atendido_en`,
      [id, dto.estado],
    );
    if (!rows.length) throw new BadRequestException('Esa solicitud no existe.');
    return rows[0];
  }
}
