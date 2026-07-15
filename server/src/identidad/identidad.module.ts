import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import {
  AuthController,
  CategoriesController,
  MeController,
  ProfilesController,
} from './identidad.controllers';
import { AuthService } from './auth.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'dev-secret-cambiar-en-produccion',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [
    AuthController,
    CategoriesController,
    MeController,
    ProfilesController,
  ],
  providers: [AuthService],
})
export class IdentidadModule {}
