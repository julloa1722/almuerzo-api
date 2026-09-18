import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BackOfficeController } from './back-office.controller';

@Module({
  imports: [AuthModule], // reexporta JwtModule, que JwtAuthGuard necesita
  controllers: [BackOfficeController],
})
export class BackOfficeModule {}
