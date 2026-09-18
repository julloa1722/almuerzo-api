import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService): JwtModuleOptions => ({
        secret: config.get<string>('JWT_SECRET'),
        // La versión nueva de @nestjs/jwt tipa expiresIn contra el paquete `ms`
        // (StringValue), más estricto que un string plano. El valor sigue siendo
        // un string de formato válido ('15m', '7d'); se castea porque ConfigService
        // no puede tipar dinámicamente contra ese literal.
        signOptions: {
          expiresIn: config.get<string>('JWT_EXPIRES_IN', '15m') as unknown as number,
        },
      }),
    }),
    // Sprint 9.3: rate limiting en /auth/login — 5 intentos por minuto por
    // IP. Se aplica solo a ese endpoint (ver auth.controller.ts), no global.
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 5 }]),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [JwtModule],
})
export class AuthModule {}
