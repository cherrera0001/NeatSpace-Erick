import { Module } from '@nestjs/common';
import { OpportunitiesController } from './oportunidades.controllers';

@Module({ controllers: [OpportunitiesController] })
export class OportunidadesModule {}
