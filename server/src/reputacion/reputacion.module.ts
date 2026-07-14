import { Module } from '@nestjs/common';
import {
  ServicesReviewController,
  ProfilesReputationController,
  InternalReputationController,
} from './reputacion.controllers';

@Module({
  controllers: [
    ServicesReviewController,
    ProfilesReputationController,
    InternalReputationController,
  ],
})
export class ReputacionModule {}
