import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class SolicitarCodigoDto {
  @IsEmail()
  email!: string;
}

export class VerificarCodigoDto {
  @IsEmail()
  email!: string;

  @IsString()
  @Matches(/^\s*\d{6}\s*$/, { message: 'El código tiene 6 dígitos.' })
  codigo!: string;

  /** Solo la primera vez: con él se crea la cuenta. */
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nombre?: string;
}

export class RestablecerContrasenaDto {
  @IsEmail()
  email!: string;

  @IsString()
  @Matches(/^\s*\d{6}\s*$/, { message: 'El código tiene 6 dígitos.' })
  codigo!: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  @MaxLength(72)
  password!: string;
}

export class CambiarContrasenaDto {
  @IsString()
  actual!: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  @MaxLength(72)
  nueva!: string;
}
