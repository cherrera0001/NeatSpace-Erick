import { IsInt, IsOptional, IsString, Min } from 'class-validator';

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

  @IsOptional()
  @IsString()
  twofa_token?: string;
}
