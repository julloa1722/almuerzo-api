import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ContactoController } from './contacto.controller';

/**
 * Sprint 22 — solicitudes desde la página pública de contacto.
 *
 * Importa `AuthModule` porque reexporta `JwtModule`, del que depende
 * `JwtAuthGuard` — el guard que protege los dos endpoints de back office.
 * Mismo patrón que `InvitacionesModule`, que también mezcla rutas públicas
 * con rutas autenticadas en un solo controlador.
 */
@Module({
  imports: [AuthModule],
  controllers: [ContactoController],
})
export class ContactoModule {}
