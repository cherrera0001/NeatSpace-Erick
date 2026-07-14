import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

// DTOs de escritura de dinero (TopupInput / WithdrawInput del OpenAPI).
// El monto es un entero CLP; la comisión JAMÁS viaja en el request (RN-2).

export class TopupDto {
  @IsInt()
  @Min(1)
  monto!: number;

  @IsOptional()
  @IsString()
  medio?: string;
}

export class WithdrawDto {
  @IsInt()
  @Min(1)
  monto!: number;

  @IsString()
  cuenta_bancaria!: string; // debe estar a nombre del titular (anti-testaferro)

  // El 2FA se EXIGE y VERIFICA server-side antes de iniciar el payout (doc 04 §8);
  // marcar el token como requerido en el DTO no basta (daría falsa seguridad).
  @IsOptional()
  @IsString()
  twofa_token?: string;
}

// RefundInput: total | parcial | dividido (doc 04 §5). Reembolso sin comisión (RN-2).
export class RefundDto {
  @IsIn(['total', 'parcial', 'dividido'])
  tipo!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  monto_profesional?: number;
}
