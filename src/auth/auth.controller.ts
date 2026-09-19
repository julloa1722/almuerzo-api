import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { AuthService } from './auth.service';
import { LoginDto, SeleccionarAmbitoDto } from './dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // `POST /auth/registro` se ELIMINÓ en el Sprint 20, en la revisión previa a
  // exponer esto a internet. Razones, en orden de peso:
  //
  // 1. Permitía apropiarse de un correo ajeno antes de que llegara su
  //    invitación: cualquiera registraba `victima@empresa.com` con su propia
  //    contraseña, y cuando esa persona intentaba aceptar su invitación se
  //    topaba con una cuenta que no controlaba. Eso además debilitaba el
  //    arreglo de `InvitacionesService.aceptar`, que ahora confía en que la
  //    contraseña de una cuenta existente la conoce su dueño.
  // 2. Era un oráculo de enumeración de correos: respondía 409 "Ya existe una
  //    cuenta con ese correo", así que se podía barrer qué direcciones tienen
  //    cuenta en la plataforma.
  // 3. No servía para nada: creaba un `usuario` suelto, sin ninguna
  //    `membresia`, o sea alguien que puede autenticarse y no ve nada.
  // 4. No lo llamaba nadie — ni el frontend, ni los tests, ni los scripts.
  //
  // El alta legítima de usuarios es por invitación desde el Sprint 18.

  // Sprint 9.3: 5 intentos por minuto por IP — ampliado en el Sprint 20 al
  // resto de endpoints públicos, no solo a login.
  @Post('login')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  // Sprint 20: con throttle. Aunque exige JWT, `membresiaId` es un entero
  // secuencial y el endpoint dice si pertenece o no al usuario — sin límite,
  // se puede barrer el espacio de ids desde una sesión cualquiera.
  @Post('seleccionar-ambito')
  @UseGuards(JwtAuthGuard, ThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  seleccionarAmbito(@Req() req: Request, @Body() dto: SeleccionarAmbitoDto) {
    return this.auth.seleccionarAmbito(req.usuarioId as number, dto.membresiaId);
  }

  // ---------- Sprint 19: recuperación de contraseña ----------

  @Post('olvide-password')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  olvidePassword(@Body() dto: { email: string }) {
    return this.auth.olvidePassword(dto.email);
  }

  // Sprint 20: sin throttle, este era el endpoint más atacable de todos —
  // público, y acierta o falla contra un token que ES la credencial para
  // tomar una cuenta. 10/min deja margen de sobra a quien se equivoca al
  // copiar el enlace, y cierra la fuerza bruta.
  @Post('restablecer-password/:token')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  restablecerPassword(@Param('token') token: string, @Body() dto: { password: string }) {
    return this.auth.restablecerPassword(token, dto.password);
  }
}
