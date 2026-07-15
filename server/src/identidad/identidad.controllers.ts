import {
  BadRequestException,
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
import { isUUID } from 'class-validator';
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
    // Validar la entrada ANTES de la query (el cast ::uuid/::int en SQL daría 500).
    let lvl: number | null = null;
    if (level !== undefined && level !== '') {
      const n = Number(level);
      // Acotado al dominio real (categoria.nivel es smallint CHECK 1..4). Sin el
      // tope, un entero enorme desbordaría el cast ::int en la query → 500.
      if (!Number.isInteger(n) || n < 1 || n > 4) {
        throw new BadRequestException('level debe ser un entero entre 1 y 4');
      }
      lvl = n;
    }
    let par: string | null = null;
    if (parent !== undefined && parent !== '') {
      if (!isUUID(parent)) {
        throw new BadRequestException('parent debe ser un UUID');
      }
      par = parent;
    }
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
