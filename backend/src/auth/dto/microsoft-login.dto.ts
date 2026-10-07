import { IsString, MinLength } from 'class-validator';

export class MicrosoftLoginDto {
  /** id_token que devuelve Entra ID al navegador tras autenticar a la persona. */
  @IsString()
  @MinLength(20)
  idToken!: string;
}
