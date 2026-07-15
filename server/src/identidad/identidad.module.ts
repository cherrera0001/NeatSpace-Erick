import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import {
  AuthController,
  CategoriesController,
  MeController,
  ProfilesController,
} from './identidad.controllers';
import { AuthService } from './auth.service';

// El secret NUNCA cae a un literal silencioso en producción: si falta y
// NODE_ENV=production, el arranque falla (fail-fast). En dev/test avisa.
function resolveJwtSecret(): string {
  const s = process.env.JWT_SECRET;
  if (s) return s;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET es obligatorio en producción (sin fallback inseguro).');
  }
  // eslint-disable-next-line no-console
  console.warn('[NeatSpace] JWT_SECRET no definido — usando un secret de desarrollo INSEGURO.');
  return 'dev-only-insecure-secret';
}

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
