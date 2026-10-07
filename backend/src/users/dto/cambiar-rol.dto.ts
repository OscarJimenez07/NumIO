import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Role } from '@prisma/client';

export class CambiarRolDto {
  @IsEnum(Role, { message: 'Rol no válido.' })
  role!: Role;
}

export class RestablecerContrasenaUsuarioDto {
  /** La que escribe el docente; si no llega, se genera una al azar. */
  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  @MaxLength(72)
  password?: string;
}
