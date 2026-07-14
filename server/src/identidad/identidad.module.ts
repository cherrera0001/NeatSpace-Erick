import { Module } from '@nestjs/common';
import {
  AuthController,
  CategoriesController,
  MeController,
  ProfilesController,
} from './identidad.controllers';

@Module({
  controllers: [
    AuthController,
    CategoriesController,
    MeController,
    ProfilesController,
  ],
})
export class IdentidadModule {}
