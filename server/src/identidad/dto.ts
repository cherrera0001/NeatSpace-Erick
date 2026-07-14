import { IsEmail, IsString, MinLength } from 'class-validator';

// DTOs derivados de components.schemas del OpenAPI (RegisterInput / LoginInput).

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  nombre!: string;
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}
