import {
  Body,
  Controller,
  Get,
  Headers,
  NotFoundException,
  NotImplementedException,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { IdempotencyKeyGuard } from '../common/idempotency-key.guard';
import { ServiceAuthGuard } from '../common/service-auth.guard';
import { TopupDto, WithdrawDto, RefundDto } from './dto';
import { DbService } from '../db/db.service';
import { currentUserId, DEMO_CLIENTE } from '../common/jwt';

const SALDO_SQL =
  "SELECT coalesce(sum(CASE direccion WHEN 'credito' THEN monto ELSE -monto END),0)::bigint AS saldo FROM ledger_entry WHERE wallet_id = $1";

// Contexto NeatWallet + webhooks (doc 07 §1). Dinero: RN-1..4, IN-2.

@Controller('wallet')
export class WalletController {
  constructor(private readonly db: DbService) {}

  /** CU-27 · Saldo (proyección desde el ledger) + movimientos. */
  @Get()
  async getWallet(@Req() req: Request): Promise<unknown> {
    const uid = currentUserId(req) ?? DEMO_CLIENTE;
    const w = await this.db.query<{ id: string }>(
      'SELECT id FROM neatwallet WHERE usuario_id = $1',
      [uid],
    );
    if (!w.rows.length) return { saldo: 0, moneda: 'CLP', movimientos: [] };
    const walletId = w.rows[0].id;
    const s = await this.db.query<{ saldo: string }>(SALDO_SQL, [walletId]);
    const mov = await this.db.query(
      `SELECT le.direccion, le.monto, le.concepto, le.creado_en, t.tipo
         FROM ledger_entry le JOIN transaccion t ON t.id = le.transaccion_id
        WHERE le.wallet_id = $1 ORDER BY le.creado_en DESC LIMIT 20`,
      [walletId],
    );
    return { saldo: Number(s.rows[0].saldo), moneda: 'CLP', movimientos: mov.rows };
  }

  /** CU-21 · Abonar (topup). Asiento de partida doble PASARELA → billetera del usuario. */
  @Post('topup')
  @UseGuards(IdempotencyKeyGuard)
  async topup(
    @Body() dto: TopupDto,
    @Req() req: Request,
    @Headers('Idempotency-Key') idem: string,
  ): Promise<unknown> {
    const uid = currentUserId(req) ?? DEMO_CLIENTE;
    // La Idempotency-Key la controla el cliente; se aísla en su propio namespace
    // ('topup:') para que NO pueda colisionar con las claves de escrow generadas por
    // el servidor ('ret-'+id, 'rel-'+id) y bloquear la retención/liberación (DoS).
    const key = 'topup:' + idem;
    const saldo = await this.db.tx(async (c) => {
      const uw = await c.query<{ id: string }>(
        'SELECT id FROM neatwallet WHERE usuario_id = $1',
        [uid],
      );
      if (!uw.rows.length) throw new NotFoundException('billetera no encontrada');
      // Idempotencia real: si la clave ya se procesó, no se re-asienta (devuelve el saldo).
      const dup = await c.query('SELECT 1 FROM transaccion WHERE idempotency_key = $1', [key]);
      if (dup.rows.length) {
        const s = await c.query<{ saldo: string }>(SALDO_SQL, [uw.rows[0].id]);
        return Number(s.rows[0].saldo);
      }
      const pas = await c.query<{ id: string }>(
        "SELECT id FROM neatwallet WHERE rol_sistema = 'pasarela'",
      );
      const tx = await c.query<{ id: string }>(
        'INSERT INTO transaccion (tipo, idempotency_key) VALUES ($1,$2) RETURNING id',
        ['topup', key],
      );
      const txId = tx.rows[0].id;
      await c.query(
        'INSERT INTO ledger_entry (transaccion_id, wallet_id, direccion, monto, concepto) VALUES ($1,$2,$3,$4,$5)',
        [txId, pas.rows[0].id, 'debito', dto.monto, 'Abono MercadoPago'],
      );
      await c.query(
        'INSERT INTO ledger_entry (transaccion_id, wallet_id, direccion, monto, concepto) VALUES ($1,$2,$3,$4,$5)',
        [txId, uw.rows[0].id, 'credito', dto.monto, 'Abono'],
      );
      const s = await c.query<{ saldo: string }>(SALDO_SQL, [uw.rows[0].id]);
      return Number(s.rows[0].saldo);
    });
    return { ok: true, monto: dto.monto, saldo };
  }

  /** CU-25 · Retiro a banco (2FA + KYC). RN-1. */
  @Post('withdraw')
  @UseGuards(IdempotencyKeyGuard)
  withdraw(@Body() _b: WithdrawDto): never {
    throw new NotImplementedException('CU-25 · withdraw');
  }

  /** CU-27 · Detalle auditable de transacción. RN-7 verifica pertenencia. */
  @Get('transactions/:id')
  getTransaction(@Param('id') _id: string): never {
    throw new NotImplementedException('CU-27 · getTransaction');
  }
}

// Endpoints internos de dinero sobre /services (auth servicio-a-servicio, no cliente).
@Controller('services')
@UseGuards(ServiceAuthGuard)
export class ServicesWalletController {
  /** CU-22 · Retención en escrow al ACORDAR (interno). RN-1, IN-2. */
  @Post(':id/hold')
  @UseGuards(IdempotencyKeyGuard)
  hold(@Param('id') _id: string): never {
    throw new NotImplementedException('CU-22 · holdEscrow');
  }

  /** CU-23 · Liberación (comisión 20%). RN-2/RN-4. 409 si no ENTREGADO+confirmado. */
  @Post(':id/release')
  @UseGuards(IdempotencyKeyGuard)
  release(@Param('id') _id: string): never {
    throw new NotImplementedException('CU-23 · releaseEscrow');
  }

  /** CU-24 · Reembolso total/parcial/dividido. RN-2 (sin comisión sobre reembolso), RN-9. */
  @Post(':id/refund')
  @UseGuards(IdempotencyKeyGuard)
  refund(@Param('id') _id: string, @Body() _b: RefundDto): never {
    throw new NotImplementedException('CU-24 · refund');
  }
}

@Controller('webhooks')
export class WebhooksController {
  /** CU-26 · FUENTE DE VERDAD del pago. HMAC + dedup + anti-replay (RN-3). */
  @Post('mercadopago')
  mercadopago(
    @Headers('x-signature') _sig: string,
    @Body() _b: unknown,
  ): never {
    throw new NotImplementedException('CU-26 · mercadopagoWebhook');
  }
}
