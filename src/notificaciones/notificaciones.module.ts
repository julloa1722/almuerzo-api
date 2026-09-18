import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NotificacionesController } from './notificaciones.controller';

@Module({
  imports: [AuthModule],
  controllers: [NotificacionesController],
})
export class NotificacionesModule {}
