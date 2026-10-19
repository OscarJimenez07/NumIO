import { IsArray, IsEnum, IsNumber, IsObject } from 'class-validator';
import { TestType } from '@prisma/client';

export class TestResultDto {
  @IsEnum(TestType)
  testType!: TestType;

  // { q1: índice de la opción elegida, ... }. El puntaje lo calcula el servidor.
  @IsObject()
  answers!: Record<string, number>;
}

export class SusResponseDto {
  @IsArray()
  @IsNumber({}, { each: true })
  answers!: number[]; // 10 valores 1-5
}
