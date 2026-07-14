import { IsInt, IsObject, IsOptional, IsString, Max, Min } from 'class-validator';

// ReviewInput del OpenAPI. El cuerpo trae estrellas + atributos, NUNCA el 0-100
// (se deriva server-side, RN-8).

export class ReviewDto {
  @IsInt()
  @Min(1)
  @Max(5)
  estrellas!: number;

  @IsOptional()
  @IsObject()
  atributos?: Record<string, boolean>;

  @IsOptional()
  @IsString()
  comentario?: string; // pasa por moderación + limpieza de PII antes de visible
}
