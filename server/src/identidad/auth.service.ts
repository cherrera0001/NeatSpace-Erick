import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { DbService } from '../db/db.service';
import { RegisterDto, LoginDto } from './dto';

// CU-01/CU-02. Registro crea Usuario + NeatProfile + NeatWallet de forma ATÓMICA
// (una transacción). Las contraseñas se guardan hasheadas (bcrypt); nunca en claro.
@Injectable()
export class AuthService {
  constructor(
    private readonly db: DbService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<{ token: string; usuario: unknown }> {
    const hash = await bcrypt.hash(dto.password, 10);
    const usuario = await this.db.tx(async (c) => {
      const dup = await c.query('SELECT 1 FROM usuario WHERE email = $1', [
        dto.email,
      ]);
      if (dup.rowCount) {
        throw new ConflictException('email ya registrado');
      }
      const u = await c.query(
        'INSERT INTO usuario (email, password_hash) VALUES ($1, $2) RETURNING id, email, creado_en',
        [dto.email, hash],
      );
      const usuarioId = u.rows[0].id as string;
      const np = await c.query(
        'INSERT INTO neatprofile (usuario_id, descripcion) VALUES ($1, $2) RETURNING id',
        [usuarioId, dto.nombre],
      );
      // Billetera del usuario (tipo=usuario, XOR de identidad, doc 08 §6)
      await c.query(
        "INSERT INTO neatwallet (tipo, usuario_id) VALUES ('usuario', $1)",
        [usuarioId],
      );
      return { ...u.rows[0], neatprofile_id: np.rows[0].id };
    });
    return { token: await this.sign(usuario.id as string), usuario };
  }

  async login(dto: LoginDto): Promise<{ token: string; usuario: unknown }> {
    const r = await this.db.query(
      'SELECT id, email, password_hash FROM usuario WHERE email = $1',
      [dto.email],
    );
    const row = r.rows[0];
    if (!row || !(await bcrypt.compare(dto.password, row.password_hash))) {
      throw new UnauthorizedException('credenciales inválidas');
    }
    return {
      token: await this.sign(row.id as string),
      usuario: { id: row.id, email: row.email },
    };
  }

  private sign(sub: string): Promise<string> {
    return this.jwt.signAsync({ sub });
  }
}
