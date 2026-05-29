import { IsString, IsNumber, IsInt, Min, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { StepInputDto } from './bisection.dto';

export class IntegrationInputDto {
  @IsString()
  fn!: string;

  @IsNumber()
  a!: number;

  @IsNumber()
  b!: number;

  @IsInt()
  @Min(1)
  n!: number;
}

export class IntegrationValidateDto extends IntegrationInputDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StepInputDto)
  userSteps!: StepInputDto[];
}
