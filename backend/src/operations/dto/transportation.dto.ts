import { IsArray, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { StepInputDto } from '../../numerical/dto/bisection.dto';

export class TransportationInputDto {
  @IsArray()
  costs!: number[][]; // matriz m x n

  @IsArray()
  @IsNumber({}, { each: true })
  supply!: number[]; // m

  @IsArray()
  @IsNumber({}, { each: true })
  demand!: number[]; // n
}

export class TransportationValidateDto extends TransportationInputDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StepInputDto)
  userSteps!: StepInputDto[];
}
