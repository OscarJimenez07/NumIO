import { IsArray, IsBoolean, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { StepInputDto } from '../../numerical/dto/bisection.dto';

export class AssignmentInputDto {
  @IsArray()
  costs!: number[][]; // matriz cuadrada n x n (o se rellena)

  @IsOptional()
  @IsBoolean()
  maximize?: boolean;
}

export class AssignmentValidateDto extends AssignmentInputDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StepInputDto)
  userSteps!: StepInputDto[];
}
