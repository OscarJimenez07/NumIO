import { IsString, IsNumber, IsOptional, IsArray, ValidateNested } from 'class-validator';
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

  state!: Record<string, any>;
}

export class BisectionValidateDto extends BisectionInputDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StepInputDto)
  userSteps!: StepInputDto[];
}
