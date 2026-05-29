import { IsArray, IsEnum, IsNumber, IsObject } from 'class-validator';
import { TestType } from '@prisma/client';

export class TestResultDto {
  @IsEnum(TestType)
  testType!: TestType;

  @IsNumber()
  score!: number;

  @IsObject()
  details!: any;
}

export class SusResponseDto {
  @IsArray()
  @IsNumber({}, { each: true })
  answers!: number[]; // 10 valores 1-5
}
