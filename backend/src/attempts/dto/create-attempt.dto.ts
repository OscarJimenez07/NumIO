import { Allow, IsBoolean, IsDefined, IsOptional, IsString } from 'class-validator';

export class CreateAttemptDto {
  @IsString()
  methodSlug!: string;

  // Estos campos viajan como arrays de pasos, no como objetos: @IsObject()
  // los rechazaba y ningún intento llegaba a guardarse. Se validan solo por
  // presencia, porque su forma cambia según el método y Prisma los almacena
  // en columnas JSON.
  @IsDefined()
  input!: any;

  @IsDefined()
  steps!: any;

  @IsOptional()
  @Allow()
  userSteps?: any;

  @IsOptional()
  @Allow()
  feedback?: any;

  @IsOptional()
  @IsBoolean()
  isCorrect?: boolean;
}
