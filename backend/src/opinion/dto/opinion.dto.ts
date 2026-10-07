import { IsArray, IsInt, IsObject, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class OpinionDto {
  /** { U1: 1-5, U2: 1-5, ... } — se valida contra el cuestionario en el servicio. */
  @IsObject()
  answers!: Record<string, number>;

  @IsInt()
  @Min(0)
  @Max(10)
  recommendation!: number;

  @IsString()
  frequency!: string;

  /** Las 10 respuestas de la escala SUS, de 1 a 5. */
  @IsArray()
  @IsInt({ each: true })
  susAnswers!: number[];

  @IsArray()
  @IsString({ each: true })
  modules!: string[];

  @IsOptional()
  @IsString()
  @MaxLength(1500)
  mostUseful?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1500)
  improvements?: string;
}
