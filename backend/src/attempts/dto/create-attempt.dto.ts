import { IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateAttemptDto {
  @IsString()
  methodSlug!: string;

  @IsObject()
  input!: any;

  @IsObject()
  steps!: any;

  @IsOptional()
  @IsObject()
  userSteps?: any;

  @IsOptional()
  @IsObject()
  feedback?: any;

  @IsOptional()
  @IsBoolean()
  isCorrect?: boolean;
}
