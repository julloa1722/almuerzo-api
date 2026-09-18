import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CatalogoController } from './catalogo.controller';

@Module({
  imports: [AuthModule],
  controllers: [CatalogoController],
})
export class CatalogoModule {}
