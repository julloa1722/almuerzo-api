import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PedidosController } from './pedidos.controller';

@Module({
  imports: [AuthModule],
  controllers: [PedidosController],
})
export class PedidosModule {}
