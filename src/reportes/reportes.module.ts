import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ReportesController } from './reportes.controller';

@Module({
  imports: [AuthModule],
  controllers: [ReportesController],
})
export class ReportesModule {}
