import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { InvitacionesController } from './invitaciones.controller';
import { InvitacionesService } from './invitaciones.service';

@Module({
  imports: [AuthModule], // reexporta JwtModule, que JwtAuthGuard y este módulo necesitan
  controllers: [InvitacionesController],
  providers: [InvitacionesService],
})
export class InvitacionesModule {}
