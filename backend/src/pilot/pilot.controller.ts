import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { PilotService } from './pilot.service';
import { TestResultDto, SusResponseDto } from './dto/test-result.dto';

@ApiTags('pilot')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('pilot')
export class PilotController {
  constructor(private readonly pilot: PilotService) {}

  @Get('cuestionario')
  cuestionario() {
    return this.pilot.cuestionario();
  }

  @Post('test')
  saveTest(@Req() req: any, @Body() dto: TestResultDto) {
    return this.pilot.saveTest(req.user.userId, dto);
  }

  @Post('sus')
  saveSus(@Req() req: any, @Body() dto: SusResponseDto) {
    return this.pilot.saveSus(req.user.userId, dto);
  }

  @Get('results')
  @Roles(Role.TEACHER, Role.ADMIN)
  results() {
    return this.pilot.results();
  }
}
