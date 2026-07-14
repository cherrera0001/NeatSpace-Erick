import {
  IsDateString,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

// OportunidadInput del OpenAPI. `tipo` es INMUTABLE (IN-5) y la geo del feed es
// aproximada (RN-6).
export class OportunidadInputDto {
  @IsIn(['urgent', 'scheduled'])
  tipo!: string;

  @IsString()
  categoria!: string;

  @IsObject()
  geo!: Record<string, unknown>;

  @IsOptional()
  @IsInt()
  @Min(0)
  precio_ref?: number;

  @IsOptional()
  @IsDateString()
  fecha?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;
}
