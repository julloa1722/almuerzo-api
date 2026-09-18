import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NominaController } from './nomina.controller';
import { ProgramasController } from './programas.controller';

@Module({
  imports: [AuthModule],
  controllers: [NominaController, ProgramasController],
})
export class NominaModule {}
