import { Module } from '@nestjs/common';
import { IdentidadModule } from './identidad/identidad.module';
import { OportunidadesModule } from './oportunidades/oportunidades.module';
import { SalaAcuerdoModule } from './sala-acuerdo/sala-acuerdo.module';
import { NeatWalletModule } from './neatwallet/neatwallet.module';
import { ReputacionModule } from './reputacion/reputacion.module';

// Monolito modular (doc 01 §2.2): un módulo por contexto acotado (doc 07 §1).
@Module({
  imports: [
    IdentidadModule,
    OportunidadesModule,
    SalaAcuerdoModule,
    NeatWalletModule,
    ReputacionModule,
  ],
})
export class AppModule {}
