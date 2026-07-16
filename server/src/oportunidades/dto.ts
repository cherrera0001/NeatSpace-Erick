import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

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
