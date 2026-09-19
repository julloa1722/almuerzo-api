import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { Pool } from 'pg';
import { PG_POOL_PLATAFORMA } from '../db/db.module';
import { Ambito } from '../common/tipos';

/**
 * Sprint 18, subsprint 18.3: los dos métodos públicos de este servicio
 * (`verPorToken`, `aceptar`) corren sin JWT — nadie que recién recibe una
 * invitación tiene sesión todavía. Por eso usan `PG_POOL_PLATAFORMA`
 * (`BYPASSRLS`) directo en vez de `req.dbClient`: no hay ningún ámbito que
 * fijar, y `aceptar` necesita escribir en `colaborador` (que sí tiene RLS)
 * sin ningún GUC disponible. La autorización de quién puede invitar a quién
 * ya quedó resuelta al CREAR la invitación (`InvitacionesController`,
 * ámbito autenticado) — aceptarla es solo materializarla.
 */
@Injectable()
export class InvitacionesService {
  constructor(
    @Inject(PG_POOL_PLATAFORMA) private readonly poolPlataforma: Pool,
    private readonly jwt: JwtService,
  ) {}

  generarToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  async verPorToken(token: string) {
    const { rows } = await this.poolPlataforma.query(
      // `usuario_existe` le dice al frontend qué pedir: "crea tu contraseña"
      // si es una cuenta nueva, o "escribe tu contraseña actual" si ese correo
      // ya tiene cuenta — porque desde el Sprint 20 `aceptar` la verifica.
      // No filtra nada: hay que tener el token de la invitación para llegar
      // aquí, y quien la creó ya conocía ese correo.
      `SELECT i.email, i.rol, i.ambito_tipo, i.ambito_id, i.estado, i.expira_en,
              COALESCE(e.nombre, s.nombre, 'Plataforma') AS nombre_ambito,
              EXISTS (SELECT 1 FROM usuario u WHERE u.email = i.email) AS usuario_existe
       FROM invitacion i
       LEFT JOIN empresa e ON i.ambito_tipo = 'EMPRESA' AND e.id = i.ambito_id
       LEFT JOIN suplidor s ON i.ambito_tipo = 'SUPLIDOR' AND s.id = i.ambito_id
       WHERE i.token = $1`,
      [token],
    );
    if (!rows.length) throw new NotFoundException('Esa invitación no existe.');
    const inv = rows[0];
    const vigente = inv.estado === 'PENDIENTE' && new Date(inv.expira_en) > new Date();
    return { ...inv, vigente };
  }

  async aceptar(token: string, password: string) {
    if (!password || password.length < 8) {
      throw new BadRequestException('La contraseña debe tener al menos 8 caracteres.');
    }
    const client = await this.poolPlataforma.connect();
    try {
      await client.query('BEGIN');

      const { rows } = await client.query('SELECT * FROM invitacion WHERE token = $1 FOR UPDATE', [token]);
      if (!rows.length) throw new NotFoundException('Esa invitación no existe.');
      const inv = rows[0];
      if (inv.estado !== 'PENDIENTE') throw new BadRequestException('Esa invitación ya no está disponible.');
      if (new Date(inv.expira_en) <= new Date()) throw new BadRequestException('Esa invitación ya venció.');

      let usuarioId: number;
      const { rows: existentes } = await client.query(
        'SELECT id, password_hash FROM usuario WHERE email = $1',
        [inv.email],
      );
      if (existentes.length) {
        // Sprint 20 — agujero de escalada de privilegios, encontrado en la
        // revisión de pre-vuelo antes de exponer esto a internet.
        //
        // Antes bastaba con tener el token para quedarse con la sesión de un
        // usuario YA EXISTENTE, sin probar ninguna contraseña. La cadena
        // completa era:
        //   1. RRHH invita al email del SUPERADMIN a su propia empresa —
        //      nada validaba que ese correo ya fuera de otra persona.
        //   2. `POST /invitaciones` le devuelve el token en claro.
        //   3. Lo acepta con cualquier contraseña: como el usuario existía,
        //      esta rama solo tomaba su `id`.
        //   4. Recibía un accessToken con `sub` = el usuario del SUPERADMIN.
        //   5. `POST /auth/seleccionar-ambito` lista TODAS las membresías de
        //      ese `sub` — incluida PLATAFORMA/SUPERADMIN — y se la firma.
        // Resultado: control total de la plataforma y de todos los tenants.
        //
        // El arreglo es exigir la contraseña real. Un usuario legítimo que
        // ya tiene cuenta y suma un ámbito nuevo la sabe; quien solo robó el
        // token, no.
        const coincide = await bcrypt.compare(password, existentes[0].password_hash);
        if (!coincide) {
          throw new UnauthorizedException(
            'Ese correo ya tiene una cuenta. Escribe tu contraseña actual para aceptar la invitación.',
          );
        }
        usuarioId = existentes[0].id;
      } else {
        const hash = await bcrypt.hash(password, 10);
        const { rows: creado } = await client.query(
          'INSERT INTO usuario (email, password_hash) VALUES ($1, $2) RETURNING id',
          [inv.email, hash],
        );
        usuarioId = creado[0].id;
      }

      // Mismo bug ya documentado y corregido en el Sprint 2 (migración 0004):
      // ambito_id es NULL para PLATAFORMA, y Postgres nunca trata dos NULL
      // como iguales en un índice único — el UNIQUE general
      // (usuario_id, ambito_tipo, ambito_id, rol) no sirve de árbitro ahí,
      // hace falta el índice parcial dedicado.
      if (inv.ambito_tipo === 'PLATAFORMA') {
        await client.query(
          `INSERT INTO membresia (usuario_id, ambito_tipo, ambito_id, rol)
           VALUES ($1, 'PLATAFORMA', NULL, $2)
           ON CONFLICT (usuario_id, rol) WHERE ambito_tipo = 'PLATAFORMA' DO NOTHING`,
          [usuarioId, inv.rol],
        );
      } else {
        await client.query(
          `INSERT INTO membresia (usuario_id, ambito_tipo, ambito_id, rol)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (usuario_id, ambito_tipo, ambito_id, rol) DO NOTHING`,
          [usuarioId, inv.ambito_tipo, inv.ambito_id, inv.rol],
        );
      }

      if (inv.rol === 'COLABORADOR' && inv.colaborador_id) {
        await client.query('UPDATE colaborador SET usuario_id = $1 WHERE id = $2', [usuarioId, inv.colaborador_id]);
      }

      await client.query(`UPDATE invitacion SET estado = 'ACEPTADA', aceptado_en = now() WHERE id = $1`, [inv.id]);

      await client.query('COMMIT');

      const ambito: Ambito = { tipo: inv.ambito_tipo, id: inv.ambito_id, rol: inv.rol };
      const accessToken = this.jwt.sign({ sub: usuarioId, ambito });
      return { accessToken, ambito };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
