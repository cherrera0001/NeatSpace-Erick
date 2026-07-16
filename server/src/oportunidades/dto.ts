import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { MONTO_MAX } from '../common/validation';

// Publicar oportunidad (CU-05). `tipo` es INMUTABLE (IN-5); la geo del feed es
// aproximada (RN-6). Para la demo aceptamos categoria_id + zona (+ lat/lng opcionales).
export class OportunidadInputDto {
  @IsIn(['urgent', 'scheduled'])
  tipo!: string;

  @IsUUID()
  categoria_id!: string;

  @IsOptional()
  @IsString()
  zona?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MONTO_MAX)
  precio_ref?: number;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lng?: number;
}
