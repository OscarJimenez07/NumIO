import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  /** Opcional: si no llega, el usuario es la parte del correo antes de la @. */
  @IsOptional()
  @IsString()
  @MinLength(2)
  fullName?: string;
}
