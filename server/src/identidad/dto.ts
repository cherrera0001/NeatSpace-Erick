import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

// DTOs derivados de components.schemas del OpenAPI (RegisterInput / LoginInput).
// El rechazo de caracteres de control en `nombre` se hace en AuthService
// (assertNoControlChars) para evitar secuencias de escape frágiles en un regex.

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(200)
  password!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  nombre!: string;
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}
