import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AyudaController } from './ayuda.controller';

@Module({
  imports: [AuthModule],
  controllers: [AyudaController],
})
export class AyudaModule {}
