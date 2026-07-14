import {
  CanActivate,
  ExecutionContext,
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import type { Request } from 'express';

/**
 * RN-1 (doc 06 §4): toda escritura de dinero exige `Idempotency-Key`.
 * Aplicar con @UseGuards(IdempotencyKeyGuard) en topup/withdraw/hold/release/refund.
 * (La deduplicación real por clave vive en la capa de persistencia — tabla
 * `transaccion.idempotency_key UNIQUE`, doc 08 §6.)
 */
@Injectable()
export class IdempotencyKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const key = req.header('Idempotency-Key');
    if (!key) {
      throw new BadRequestException('Falta Idempotency-Key (RN-1).');
    }
    return true;
  }
}
