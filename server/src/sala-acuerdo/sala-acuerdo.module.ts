import { Module } from '@nestjs/common';
import {
  AgreementsController,
  ServicesExecutionController,
} from './sala-acuerdo.controllers';

@Module({
  controllers: [AgreementsController, ServicesExecutionController],
})
export class SalaAcuerdoModule {}
