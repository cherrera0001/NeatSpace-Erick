import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotImplementedException,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { RegisterDto, LoginDto } from './dto';
import { DbService } from '../db/db.service';
import { AuthService } from './auth.service';

// Contexto Identidad (doc 07 §1). Rutas 1-a-1 con specs/openapi.yaml.

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** CU-01 · Registrarse (Usuario+NeatProfile+NeatWallet, atómico). */
  @Post('register')
  register(@Body() body: RegisterDto): Promise<{ token: string; usuario: unknown }> {
    return this.auth.register(body);
  }

  /** CU-02 · Iniciar sesión. */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() body: LoginDto): Promise<{ token: string; usuario: unknown }> {
    return this.auth.login(body);
  }
}

@Controller('categories')
export class CategoriesController {
  constructor(private readonly db: DbService) {}

  /** CU-04 · Explorar categorías (slice implementado: lee de la BD, con filtros del contrato). */
  @Get()
  async list(
    @Query('level') level?: string,
    @Query('parent') parent?: string,
  ): Promise<unknown[]> {
    const lvl =
      level && Number.isFinite(Number(level)) ? Number(level) : null;
    const par = parent && parent !== '' ? parent : null;
    const { rows } = await this.db.query(
      `SELECT id, nombre, parent_id, nivel, sensible FROM categoria
        WHERE ($1::int IS NULL OR nivel = $1)
          AND ($2::uuid IS NULL OR parent_id = $2)
        ORDER BY nivel, nombre`,
      [lvl, par],
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
