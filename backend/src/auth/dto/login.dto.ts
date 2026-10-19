import { IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  /**
   * Correo completo (usuario@uts.edu.co) o solo el usuario (la parte antes de
   * la @). El campo conserva el nombre «email» para no romper a los clientes
   * que ya lo usan.
   */
  @IsString()
  @MinLength(1)
  @MaxLength(254)
  email!: string;

  @IsString()
  password!: string;
}
