import { IsArray, IsEnum, IsNumber, IsOptional, ValidateNested, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { StepInputDto } from '../../numerical/dto/bisection.dto';

export class ConstraintDto {
  @IsArray()
  @IsNumber({}, { each: true })
  coefficients!: number[];

  @IsIn(['<=', '>=', '='])
  operator!: '<=' | '>=' | '=';

  @IsNumber()
  rhs!: number;
}

export enum SimplexObjective {
  MAX = 'max',
  MIN = 'min',
}

export class SimplexInputDto {
  @IsEnum(SimplexObjective)
  objective!: SimplexObjective;

  @IsArray()
  @IsNumber({}, { each: true })
  c!: number[]; // coeficientes de la función objetivo

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConstraintDto)
  constraints!: ConstraintDto[];
}

export class SimplexValidateDto extends SimplexInputDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StepInputDto)
  userSteps!: StepInputDto[];
}
