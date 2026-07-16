import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { DbService } from '../db/db.service';
import { RegisterDto, LoginDto } from './dto';

// Hash "señuelo" precomputado: se compara contra él cuando el email NO existe,
// para que el login tarde lo mismo exista o no (evita user-enumeration por timing).
const DUMMY_HASH = bcrypt.hashSync('neatspace-dummy-password', 10);

// CU-01/CU-02. Registro crea Usuario + NeatProfile + NeatWallet de forma ATÓMICA
// (una transacción). Las contraseñas se guardan hasheadas (bcrypt); nunca en claro.
@Injectable()
export class AuthService {
  constructor(
    private readonly db: DbService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<{ token: string; usuario: unknown }> {
    assertNoControlChars(dto.nombre); // 0x00-0x1F rompería el INSERT en text (→ 500)
    const hash = await bcrypt.hash(dto.password, 10);
    const usuario = await this.db.tx(async (c) => {
      // Pre-check (camino feliz); la unicidad REAL la garantiza el UNIQUE de la BD.
      const dup = await c.query('SELECT 1 FROM usuario WHERE email = $1', [
        dto.email,
      ]);
      if (dup.rows.length) {
        throw new ConflictException('email ya registrado');
      }
      let u;
      try {
        u = await c.query(
          'INSERT INTO usuario (email, password_hash) VALUES ($1, $2) RETURNING id, email, creado_en',
          [dto.email, hash],
        );
      } catch (e) {
        // Carrera TOCTOU: dos registros concurrentes pasan el SELECT y el 2º
        // INSERT choca con el UNIQUE (23505) → traducir a 409, no 500.
        if (isUniqueViolation(e)) {
          throw new ConflictException('email ya registrado');
        }
        throw e;
      }
      const usuarioId = u.rows[0].id as string;
      const np = await c.query(
        'INSERT INTO neatprofile (usuario_id, nombre) VALUES ($1, $2) RETURNING id, nombre',
        [usuarioId, dto.nombre],
      );
      // Billetera del usuario (tipo=usuario, XOR de identidad, doc 08 §6)
      await c.query(
        "INSERT INTO neatwallet (tipo, usuario_id) VALUES ('usuario', $1)",
        [usuarioId],
      );
      // `usuario` en la respuesta es un NeatProfile (schema del contrato): id de
      // perfil + usuario_id + nombre. El JWT se firma con el id de USUARIO.
      return {
        usuarioId,
        profile: { id: np.rows[0].id, usuario_id: usuarioId, nombre: np.rows[0].nombre },
      };
    });
    return {
      token: await this.sign(usuario.usuarioId),
      usuario: usuario.profile,
    };
  }

  async login(dto: LoginDto): Promise<{ token: string; usuario: unknown }> {
    const r = await this.db.query(
      `SELECT u.id AS usuario_id, u.password_hash, np.id AS neatprofile_id, np.nombre
         FROM usuario u JOIN neatprofile np ON np.usuario_id = u.id
        WHERE u.email = $1`,
      [dto.email],
    );
    const row = r.rows[0];
    // Siempre se ejecuta un bcrypt.compare (contra el hash real o el señuelo) → tiempo
    // constante; no se puede inferir si el email existe por la latencia.
    const hash = (row?.password_hash as string | undefined) ?? DUMMY_HASH;
    const ok = await bcrypt.compare(dto.password, hash);
    if (!row || !ok) {
      throw new UnauthorizedException('credenciales inválidas');
    }
    return {
      token: await this.sign(row.usuario_id as string),
      // NeatProfile (schema del contrato)
      usuario: {
        id: row.neatprofile_id,
        usuario_id: row.usuario_id,
        nombre: row.nombre,
      },
    };
  }

  private sign(sub: string): Promise<string> {
    return this.jwt.signAsync({ sub });
  }
}

/** Rechaza caracteres de control (0x00-0x1F): PostgreSQL no los admite en columnas text. */
function assertNoControlChars(s: string): void {
  for (let i = 0; i < s.length; i++) {
    if (s.charCodeAt(i) < 0x20) {
      throw new BadRequestException(
        'nombre contiene caracteres de control invalidos',
      );
    }
  }
}

/** True si el error es una violación de unicidad (SQLSTATE 23505 en pg; mensaje en PGlite). */
function isUniqueViolation(e: unknown): boolean {
  const code = (e as { code?: string })?.code;
  const msg = String((e as { message?: string })?.message ?? '');
  return code === '23505' || /duplicate key|unique constraint|violates unique/i.test(msg);
}
