import {
  Body,
  Controller,
  Get,
  NotImplementedException,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { RegisterDto, LoginDto } from './dto';
import { DbService } from '../db/db.service';

// Contexto Identidad (doc 07 §1). Rutas 1-a-1 con specs/openapi.yaml.

@Controller('auth')
export class AuthController {
  /** CU-01 · Registrarse (Usuario+NeatProfile+NeatWallet, atómico). */
  @Post('register')
  register(@Body() _body: RegisterDto): never {
    throw new NotImplementedException('CU-01 · register');
  }

  /** CU-02 · Iniciar sesión. */
  @Post('login')
  login(@Body() _body: LoginDto): never {
    throw new NotImplementedException('CU-02 · login');
  }
}

@Controller('categories')
export class CategoriesController {
  constructor(private readonly db: DbService) {}

  /** CU-04 · Explorar categorías (slice implementado: lee de la BD). */
  @Get()
  async list(): Promise<unknown[]> {
    const { rows } = await this.db.query(
      'SELECT id, nombre, parent_id, nivel, sensible FROM categoria ORDER BY nivel, nombre',
    );
    return rows;
  }
}

@Controller('me')
export class MeController {
  /** CU-03 · Editar el propio NeatProfile / cobertura. */
  @Patch('profile')
  updateMyProfile(@Body() _body: unknown): never {
    throw new NotImplementedException('CU-03 · updateMyProfile');
  }
}

@Controller('profiles')
export class ProfilesController {
  /** CU-03 · NeatProfile público. RN-7: no exponer datos crudos IDOR. */
  @Get(':id')
  getProfile(@Param('id') _id: string): never {
    throw new NotImplementedException('CU-03 · getProfile');
  }
}
