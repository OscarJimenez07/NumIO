import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TestResultDto, SusResponseDto } from './dto/test-result.dto';
import { puntajeSus } from '../opinion/opinion.cuestionario';
import { calificar, preguntasPublicas } from './test.cuestionario';

@Injectable()
export class PilotService {
  constructor(private readonly prisma: PrismaService) {}

  cuestionario() {
    return preguntasPublicas();
  }

  async saveTest(userId: string, dto: TestResultDto) {
    const { score, correct, total } = calificar(dto.answers ?? {});
    const guardado = await this.prisma.testResult.create({
      data: {
        userId,
        testType: dto.testType,
        score,
        details: { answers: dto.answers, correct, total },
      },
    });
    return { id: guardado.id, testType: guardado.testType, score: round(score), correct, total };
  }

  /**
   * Calcula puntuación SUS estándar:
   *   Para ítems impares (1,3,5,7,9): valor - 1
   *   Para ítems pares  (2,4,6,8,10): 5 - valor
   *   Suma * 2.5 → escala 0-100
   */
  saveSus(userId: string, dto: SusResponseDto) {
    if (!dto.answers || dto.answers.length !== 10) {
      throw new BadRequestException('La encuesta SUS requiere exactamente 10 respuestas (escala 1-5).');
    }
    if (dto.answers.some((v) => v < 1 || v > 5)) {
      throw new BadRequestException('Las respuestas deben estar entre 1 y 5.');
    }
    const score = puntajeSus(dto.answers);
    return this.prisma.susResponse.create({
      data: { userId, answers: dto.answers, score },
    });
  }

  results() {
    return Promise.all([
      this.prisma.testResult.findMany({
        include: { user: { select: { email: true, fullName: true, role: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.susResponse.findMany({
        include: { user: { select: { email: true, fullName: true, role: true } } },
        orderBy: { createdAt: 'desc' },
      }),
    ]).then(([tests, sus]) => ({ tests, sus, summary: this.summarize(tests, sus) }));
  }

  private summarize(tests: any[], sus: any[]) {
    const pre = tests.filter((t) => t.testType === 'PRE');
    const post = tests.filter((t) => t.testType === 'POST');
    const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
    return {
      preCount: pre.length,
      postCount: post.length,
      preAvg: round(avg(pre.map((p) => p.score))),
      postAvg: round(avg(post.map((p) => p.score))),
      improvement: round(avg(post.map((p) => p.score)) - avg(pre.map((p) => p.score))),
      susCount: sus.length,
      susAvg: round(avg(sus.map((s) => s.score))),
    };
  }
}

function round(x: number, d = 2): number {
  const k = Math.pow(10, d);
  return Math.round(x * k) / k;
}
