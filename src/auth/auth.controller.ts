import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { AuthService } from './auth.service';
import { LoginDto, RegistroDto, SeleccionarAmbitoDto } from './dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('registro')
  registrar(@Body() dto: RegistroDto) {
    return this.auth.registrar(dto);
  }

  // Sprint 9.3: 5 intentos por minuto por IP — el resto de la API no tiene
  // rate limiting, solo el endpoint que de verdad importa para fuerza bruta.
  @Post('login')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post('seleccionar-ambito')
  @UseGuards(JwtAuthGuard)
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

  @Post('restablecer-password/:token')
  restablecerPassword(@Param('token') token: string, @Body() dto: { password: string }) {
    return this.auth.restablecerPassword(token, dto.password);
  }
}
