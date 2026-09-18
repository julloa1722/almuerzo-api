import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { IdentidadController } from './identidad.controller';

@Module({
  imports: [AuthModule], // reexporta JwtModule, que JwtAuthGuard necesita
  controllers: [IdentidadController],
})
export class IdentidadModule {}
