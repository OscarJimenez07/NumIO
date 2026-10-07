import { IsString, IsNumber, IsOptional, IsArray, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class BisectionInputDto {
  @IsString()
  fn!: string;

  @IsNumber()
  a!: number;

  @IsNumber()
  b!: number;

  @IsOptional()
  @IsNumber()
  tolerance?: number;

  @IsOptional()
  @IsNumber()
  maxIter?: number;
}

export class StepInputDto {
  @IsNumber()
  iteration!: number;

  // @IsObject() es obligatorio: el ValidationPipe global usa forbidNonWhitelisted,
  // por lo que una propiedad sin decorador sería rechazada con error 400.
  @IsObject()
  state!: Record<string, any>;
}

export class BisectionValidateDto extends BisectionInputDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StepInputDto)
  userSteps!: StepInputDto[];
}
