import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

// PriceOfferInput del OpenAPI. La `justificacion` es OBLIGATORIA (Precio Justo,
// estilo inDrive) — el contrato marca 422 si falta.

export class PriceOfferDto {
  @IsInt()
  @Min(0)
  monto!: number;

  @IsString()
  @IsNotEmpty()
  justificacion!: string;
}
