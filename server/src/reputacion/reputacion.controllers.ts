import {
  Body,
  Controller,
  Get,
  NotImplementedException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ReviewDto } from './dto';
import { ServiceAuthGuard } from '../common/service-auth.guard';

// Contexto Reputación (doc 07 §1). RN-5, RN-8, IN-4, IN-8.

@Controller('services')
export class ServicesReviewController {
  /** CU-29 · Evaluar (double-blind). RN-5: 409 si no pagado. Cuerpo sin 0-100. */
  @Post(':id/reviews')
  createReview(@Param('id') _id: string, @Body() _b: ReviewDto): never {
    throw new NotImplementedException('CU-29 · createReview');
  }
}

@Controller('profiles')
export class ProfilesReputationController {
  /** CU-30 · Trust Score derivado. RN-7/RN-8: sin datos crudos IDOR. */
  @Get(':id/trust-score')
  getTrustScore(@Param('id') _id: string): never {
    throw new NotImplementedException('CU-30 · getTrustScore');
  }

  /** CU-30 · Historial público (derivado del log). */
  @Get(':id/reputation')
  getReputation(@Param('id') _id: string): never {
    throw new NotImplementedException('CU-30 · getReputation');
  }
}

@Controller('internal/reputation')
@UseGuards(ServiceAuthGuard)
export class InternalReputationController {
  /** CU-31 · Recomputa la proyección desde el log (interno). IN-7/IN-8. */
  @Post('recompute/:profileId')
  recompute(@Param('profileId') _profileId: string): never {
    throw new NotImplementedException('CU-31 · recomputeReputation');
  }
}
