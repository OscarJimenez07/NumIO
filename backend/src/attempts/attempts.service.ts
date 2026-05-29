import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAttemptDto } from './dto/create-attempt.dto';

@Injectable()
export class AttemptsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateAttemptDto) {
    const method = await this.prisma.method.findUnique({ where: { slug: dto.methodSlug } });
    if (!method) throw new NotFoundException(`Método "${dto.methodSlug}" no existe.`);

    return this.prisma.attempt.create({
      data: {
        userId,
        methodId: method.id,
        input: dto.input,
        steps: dto.steps,
        userSteps: dto.userSteps ?? undefined,
        feedback: dto.feedback ?? undefined,
        isCorrect: dto.isCorrect ?? false,
      },
      include: { method: { select: { slug: true, name: true, category: true } } },
    });
  }

  listMine(userId: string) {
    return this.prisma.attempt.findMany({
      where: { userId },
      include: { method: { select: { slug: true, name: true, category: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  listAll() {
    return this.prisma.attempt.findMany({
      include: {
        method: { select: { slug: true, name: true, category: true } },
        user: { select: { id: true, email: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }
}
