import {
  Body,
  Controller,
  Get,
  Headers,
  NotImplementedException,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IdempotencyKeyGuard } from '../common/idempotency-key.guard';
import { ServiceAuthGuard } from '../common/service-auth.guard';
import { TopupDto, WithdrawDto, RefundDto } from './dto';

// Contexto NeatWallet + webhooks (doc 07 §1). Dinero: RN-1..4, IN-2.

@Controller('wallet')
export class WalletController {
  /** CU-27 · Saldo (proyección) + movimientos. RN-7 anti-IDOR. */
  @Get()
  getWallet(@Query() _q: unknown): never {
    throw new NotImplementedException('CU-27 · getWallet');
  }

  /** CU-21 · Abonar vía MercadoPago. RN-1 (Idempotency-Key); RN-3 (no asienta). */
  @Post('topup')
  @UseGuards(IdempotencyKeyGuard)
  topup(@Body() _b: TopupDto): never {
    throw new NotImplementedException('CU-21 · topup');
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
