import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DbModule } from './db/db.module';
import { HealthController } from './health/health.controller';
import { AuthModule } from './auth/auth.module';
import { IdentidadModule } from './identidad/identidad.module';
import { BackOfficeModule } from './back-office/back-office.module';
import { CatalogoModule } from './catalogo/catalogo.module';
import { PedidosModule } from './pedidos/pedidos.module';
import { NominaModule } from './nomina/nomina.module';
import { LiquidacionesModule } from './liquidaciones/liquidaciones.module';
import { AyudaModule } from './ayuda/ayuda.module';
import { ReportesModule } from './reportes/reportes.module';
import { NotificacionesModule } from './notificaciones/notificaciones.module';
import { InvitacionesModule } from './invitaciones/invitaciones.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DbModule,
    AuthModule,
    IdentidadModule,
    BackOfficeModule,
    CatalogoModule,
    PedidosModule,
    NominaModule,
    LiquidacionesModule,
    AyudaModule,
    ReportesModule,
    NotificacionesModule,
    InvitacionesModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
