import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AttemptsService } from './attempts.service';
import { CreateAttemptDto } from './dto/create-attempt.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('attempts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('attempts')
export class AttemptsController {
  constructor(private readonly attempts: AttemptsService) {}

  @Post()
  create(@Req() req: any, @Body() dto: CreateAttemptDto) {
    return this.attempts.create(req.user.userId, dto);
  }

  @Get('me')
  listMine(@Req() req: any) {
    return this.attempts.listMine(req.user.userId);
  }

  @Get()
  @Roles(Role.TEACHER, Role.ADMIN)
  listAll() {
    return this.attempts.listAll();
  }
}
