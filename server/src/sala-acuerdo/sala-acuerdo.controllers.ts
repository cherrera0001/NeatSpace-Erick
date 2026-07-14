import {
  Body,
  Controller,
  Get,
  NotImplementedException,
  Param,
  Post,
} from '@nestjs/common';
import {
  PriceOfferDto,
  AcceptDto,
  AcuerdoVersionDto,
  AmendmentDto,
  MensajeDto,
  DisputaDto,
} from './dto';

// Contexto Sala de Acuerdo + ejecución del servicio (doc 07 §1).

@Controller('agreements')
export class AgreementsController {
  /** CU-11 · Estado, versión vigente, partes, Trust Scores. */
  @Get(':id')
  get(@Param('id') _id: string): never {
    throw new NotImplementedException('CU-11 · getAgreement');
  }

  /** CU-12 · Proponer versión de términos (→ PROPUESTA). */
  @Post(':id/versions')
  proposeVersion(@Param('id') _id: string, @Body() _b: AcuerdoVersionDto): never {
    throw new NotImplementedException('CU-12 · proposeVersion');
  }

  /** CU-13 · Contraoferta con justificación (422 si falta). */
  @Post(':id/price-offers')
  priceOffer(@Param('id') _id: string, @Body() _b: PriceOfferDto): never {
    throw new NotImplementedException('CU-13 · makePriceOffer');
  }

  /** CU-13 · Aceptar una contraoferta. */
  @Post(':id/price-offers/:oid/accept')
  acceptPriceOffer(@Param('id') _id: string, @Param('oid') _oid: string): never {
    throw new NotImplementedException('CU-13 · acceptPriceOffer');
  }

  /** CU-14 · Aceptar (step-up) → retención de escrow. RN-4/RN-6. 409 si versión vieja. */
  @Post(':id/accept')
  accept(@Param('id') _id: string, @Body() _b: AcceptDto): never {
    throw new NotImplementedException('CU-14 · acceptAgreement');
  }

  /** CU-15 · Enmienda durante EN_EJECUCION. */
  @Post(':id/amendments')
  amend(@Param('id') _id: string, @Body() _b: AmendmentDto): never {
    throw new NotImplementedException('CU-15 · amend');
  }

  /** CU-16 · Marcar trabajo entregado (→ ENTREGADO). */
  @Post(':id/deliver')
  deliver(@Param('id') _id: string): never {
    throw new NotImplementedException('CU-16 · deliver');
  }

  /** CU-17 · Confirmar entrega (→ CERRADO + liberación). RN-4. */
  @Post(':id/confirm')
  confirm(@Param('id') _id: string): never {
    throw new NotImplementedException('CU-17 · confirm');
  }

  /** CU-18 · Cancelar según política de estado. */
  @Post(':id/cancel')
  cancel(@Param('id') _id: string): never {
    throw new NotImplementedException('CU-18 · cancelAgreement');
  }

  /** CU-19 · Mensajes de la sala. */
  @Get(':id/messages')
  listMessages(@Param('id') _id: string): never {
    throw new NotImplementedException('CU-19 · listMessages');
  }

  /** CU-19 · Enviar mensaje (NeatAI puede advertir contacto externo, RN-10). */
  @Post(':id/messages')
  sendMessage(@Param('id') _id: string, @Body() _b: MensajeDto): never {
    throw new NotImplementedException('CU-19 · sendMessage');
  }
}

@Controller('services')
export class ServicesExecutionController {
  /** CU-20 · Iniciar ejecución. */
  @Post(':id/start')
  start(@Param('id') _id: string): never {
    throw new NotImplementedException('CU-20 · startService');
  }

  /** CU-20 · Finalizar ejecución (abre ventana de disputa). */
  @Post(':id/finish')
  finish(@Param('id') _id: string): never {
    throw new NotImplementedException('CU-20 · finishService');
  }

  /** CU-32 · Abrir disputa (congela escrow → EN_DISPUTA). */
  @Post(':id/disputes')
  openDispute(@Param('id') _id: string, @Body() _b: DisputaDto): never {
    throw new NotImplementedException('CU-32 · openDispute');
  }
}
