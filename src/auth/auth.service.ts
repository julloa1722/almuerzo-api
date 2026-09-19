import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { Pool } from 'pg';
import { PG_POOL } from '../db/db.module';
import { Ambito } from '../common/tipos';
import { enviarNotificacion } from '../common/notificaciones';
import { urlDelFrontend } from '../common/url-publica';
import { LoginDto, RegistroDto } from './dto';

// Sprint 20: ver src/common/url-publica.ts. Se resuelve al vuelo y con el
// esquema normalizado — antes quedaba congelada al cargar el módulo, así que
// sin FRONTEND_URL en producción los correos de recuperación apuntaban a
// localhost y nadie podía restablecer su contraseña.
const HORAS_VIGENCIA_RECUPERACION = 1;
/** Mensaje único a propósito — no distingue "no existe" de "venció" de "ya
 * se usó", para no filtrar qué correos tienen cuenta ni el estado exacto
 * de un token ajeno. */
const MENSAJE_TOKEN_INVALIDO = 'Ese enlace ya no es válido. Pide uno nuevo.';

interface MembresiaRow {
  id: number;
  ambito_tipo: string;
  ambito_id: number | null;
  rol: string;
  nombre_ambito: string | null;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly jwt: JwtService,
  ) {}

  // `registrar()` se eliminó en el Sprint 20 junto con su ruta — ver el
  // comentario en `AuthController`. El alta de usuarios es por invitación
  // (Sprint 18) o, para el primer administrador de una base nueva,
  // `scripts/crear-admin.js`.

  /**
   * Login sin ámbito: solo confirma identidad y devuelve las membresías
   * disponibles para que el cliente elija con cuál entrar (subsprint 1.3).
   */
  async login(dto: LoginDto) {
    const { rows } = await this.pool.query(
      'SELECT id, password_hash, estado FROM usuario WHERE email = $1',
      [dto.email],
    );
    const usuario = rows[0];
    if (!usuario || usuario.estado !== 'ACTIVO') {
      throw new UnauthorizedException('Credenciales inválidas.');
    }
    const coincide = await bcrypt.compare(dto.password, usuario.password_hash);
    if (!coincide) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    const membresias = await this.membresiasDe(usuario.id);
    const tokenSinAmbito = this.jwt.sign({ sub: usuario.id });

    return {
      accessToken: tokenSinAmbito,
      membresias: membresias.map((m) => ({
        membresiaId: m.id,
        ambitoTipo: m.ambito_tipo,
        ambitoId: m.ambito_id,
        rol: m.rol,
        nombre: m.nombre_ambito,
      })),
    };
  }

  /**
   * Con el token sin ámbito, el usuario elige una de sus membresías y recibe
   * un token nuevo que sí trae el ambito — ese es el que consume
   * TenantContextInterceptor para fijar el GUC de RLS.
   */
  async seleccionarAmbito(usuarioId: number, membresiaId: number) {
    const membresias = await this.membresiasDe(usuarioId);
    const elegida = membresias.find((m) => m.id === membresiaId);
    if (!elegida) {
      throw new UnauthorizedException('Esa membresía no pertenece a este usuario o no existe.');
    }

    const ambito: Ambito = {
      tipo: elegida.ambito_tipo as Ambito['tipo'],
      id: elegida.ambito_id,
      rol: elegida.rol,
    };
    const accessToken = this.jwt.sign({ sub: usuarioId, ambito });

    return { accessToken, ambito };
  }

  /**
   * Sprint 19, subsprint 19.1: la otra mitad del gap que el Sprint 18 dejó
   * fuera a propósito — invitación resuelve "nunca tuve cuenta", esto
   * resuelve "la perdí". Responde igual exista o no el email, para no
   * confirmar por este medio qué correos tienen cuenta.
   */
  async olvidePassword(email: string): Promise<{ mensaje: string }> {
    const mensaje = 'Si ese correo tiene una cuenta, le enviamos instrucciones para recuperar el acceso.';
    if (!email?.trim()) return { mensaje };

    const { rows } = await this.pool.query('SELECT id FROM usuario WHERE email = $1 AND estado = $2', [
      email.trim(),
      'ACTIVO',
    ]);
    if (!rows.length) return { mensaje };

    const token = crypto.randomBytes(32).toString('hex');
    const expiraEn = new Date(Date.now() + HORAS_VIGENCIA_RECUPERACION * 3600000);
    await this.pool.query(
      'INSERT INTO recuperacion_password (usuario_id, token, expira_en) VALUES ($1, $2, $3)',
      [rows[0].id, token, expiraEn],
    );

    const client = await this.pool.connect();
    try {
      const link = `${urlDelFrontend()}/restablecer-password/${token}`;
      await enviarNotificacion(client, {
        tipo: 'RECUPERACION_PASSWORD',
        destinatario: email.trim(),
        asunto: 'Recupera el acceso a tu cuenta',
        cuerpo: `Alguien (esperamos que tú) pidió restablecer la contraseña de esta cuenta. Este enlace vence en ${HORAS_VIGENCIA_RECUPERACION} hora: ${link}\n\nSi no fuiste tú, ignora este correo — tu contraseña actual sigue funcionando.`,
      });
    } finally {
      client.release();
    }

    return { mensaje };
  }

  async restablecerPassword(token: string, password: string): Promise<{ mensaje: string }> {
    if (!password || password.length < 8) {
      throw new BadRequestException('La contraseña debe tener al menos 8 caracteres.');
    }
    const { rows } = await this.pool.query('SELECT * FROM recuperacion_password WHERE token = $1', [token]);
    const rec = rows[0];
    if (!rec || rec.estado !== 'PENDIENTE' || new Date(rec.expira_en) <= new Date()) {
      throw new UnauthorizedException(MENSAJE_TOKEN_INVALIDO);
    }

    const hash = await bcrypt.hash(password, 10);
    await this.pool.query('UPDATE usuario SET password_hash = $1 WHERE id = $2', [hash, rec.usuario_id]);
    await this.pool.query(`UPDATE recuperacion_password SET estado = 'USADA' WHERE id = $1`, [rec.id]);

    return { mensaje: 'Contraseña actualizada. Ya puedes iniciar sesión con la nueva.' };
  }

  private async membresiasDe(usuarioId: number): Promise<MembresiaRow[]> {
    const { rows } = await this.pool.query<MembresiaRow>(
      `SELECT
         m.id, m.ambito_tipo, m.ambito_id, m.rol,
         COALESCE(e.nombre, s.nombre, 'Plataforma') AS nombre_ambito
       FROM membresia m
       LEFT JOIN empresa e ON m.ambito_tipo = 'EMPRESA' AND e.id = m.ambito_id
       LEFT JOIN suplidor s ON m.ambito_tipo = 'SUPLIDOR' AND s.id = m.ambito_id
       WHERE m.usuario_id = $1 AND m.estado = 'ACTIVA'
       ORDER BY m.id`,
      [usuarioId],
    );
    return rows;
  }
}
