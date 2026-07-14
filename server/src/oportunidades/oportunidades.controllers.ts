import {
  Body,
  Controller,
  Get,
  NotImplementedException,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { OportunidadInputDto } from './dto';

// Contexto Oportunidades + entrada a NeatMatch (doc 07 §1).

@Controller('opportunities')
export class OpportunitiesController {
  /** CU-05 · Publicar oportunidad. IN-5 tipo inmutable; RN-6 geo enmascarada. */
  @Post()
  create(@Body() _body: OportunidadInputDto): never {
    throw new NotImplementedException('CU-05 · createOpportunity');
  }

  /** CU-06 · Feed en vivo (geo aproximada, sin dirección exacta). */
  @Get()
  list(@Query() _q: unknown): never {
    throw new NotImplementedException('CU-06 · listOpportunities');
  }

  /** CU-06 · Detalle de oportunidad. */
  @Get(':id')
  get(@Param('id') _id: string): never {
    throw new NotImplementedException('CU-06 · getOpportunity');
  }

  /** CU-07 · Postular (programado). */
  @Post(':id/applications')
  apply(@Param('id') _id: string): never {
    throw new NotImplementedException('CU-07 · apply');
  }

  /** CU-08 · Revisar postulaciones (cliente). RN-7 anti-IDOR. */
  @Get(':id/applications')
  listApplications(@Param('id') _id: string): never {
    throw new NotImplementedException('CU-08 · listApplications');
  }

  /** CU-09 · Ranking NeatMatch (RBAC, reason codes). RN-7. */
  @Get(':id/matches')
  getMatches(@Param('id') _id: string, @Query('prefs') _prefs?: string): never {
    throw new NotImplementedException('CU-09 · getMatches');
  }

  /** CU-11 · Abrir la Sala de Acuerdo. */
  @Post(':id/agreement')
  openAgreement(@Param('id') _id: string): never {
    throw new NotImplementedException('CU-11 · openAgreement');
  }
}
