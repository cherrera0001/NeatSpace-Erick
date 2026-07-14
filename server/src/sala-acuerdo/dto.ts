import {
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsIn,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

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

// AcceptInput: version_n + step_up (no repudio, doc 03 §4.1). 409 si versión vieja (en servicio).
export class StepUpDto {
  @IsIn(['pin', 'biometria', 'otro'])
  metodo!: string;

  @IsString()
  @IsNotEmpty()
  token!: string;
}

export class AcceptDto {
  @IsInt()
  version_n!: number;

  @IsObject()
  @ValidateNested()
  @Type(() => StepUpDto)
  step_up!: StepUpDto;
}

// AcuerdoVersionInput / AmendmentInput: los términos se validan en detalle en la capa de servicio.
export class AcuerdoVersionDto {
  @IsObject()
  terminos!: Record<string, unknown>;
}

export class AmendmentDto {
  @IsObject()
  cambio!: Record<string, unknown>;

  @IsOptional()
  @IsString()
  evidencia_url?: string;
}

export class MensajeDto {
  @IsString()
  @IsNotEmpty()
  texto!: string;
}

export class DisputaDto {
  @IsString()
  @IsNotEmpty()
  motivo!: string;

  @IsOptional()
  @IsString()
  evidencia_url?: string;
}
