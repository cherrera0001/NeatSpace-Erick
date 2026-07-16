import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import {
  AuthController,
  CategoriesController,
  MeController,
  ProfilesController,
} from './identidad.controllers';
import { AuthService } from './auth.service';
import { resolveJwtSecret } from '../common/jwt';

@Module({
  imports: [
    JwtModule.register({
      secret: resolveJwtSecret(),
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
