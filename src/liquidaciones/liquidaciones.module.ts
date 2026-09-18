import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LiquidacionesController } from './liquidaciones.controller';

@Module({
  imports: [AuthModule],
  controllers: [LiquidacionesController],
})
export class LiquidacionesModule {}
