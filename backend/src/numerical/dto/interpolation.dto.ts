import { IsArray, IsNumber, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { StepInputDto } from './bisection.dto';

export class PointDto {
  @IsNumber()
  x!: number;
  @IsNumber()
  y!: number;
}

export class InterpolationInputDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PointDto)
  points!: PointDto[];

  @IsOptional()
  @IsNumber()
  evalAt?: number;
}

export class InterpolationValidateDto extends InterpolationInputDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StepInputDto)
  userSteps!: StepInputDto[];
}
