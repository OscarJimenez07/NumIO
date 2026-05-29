import { IsString, IsNumber, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { StepInputDto } from './bisection.dto';

export class NewtonInputDto {
  @IsString()
  fn!: string;

  @IsNumber()
  x0!: number;

  @IsOptional()
  @IsNumber()
  tolerance?: number;

  @IsOptional()
  @IsNumber()
  maxIter?: number;
}

export class NewtonValidateDto extends NewtonInputDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StepInputDto)
  userSteps!: StepInputDto[];
}
