import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { OpinionService } from './opinion.service';
import { OpinionDto } from './dto/opinion.dto';

@ApiTags('opinion')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('opinion')
export class OpinionController {
  constructor(private readonly opinion: OpinionService) {}

  /** Preguntas, escala y opciones: la página arma el formulario con esto. */
  @Get('cuestionario')
  cuestionario() {
    return this.opinion.cuestionario();
  }

  /** La respuesta del usuario actual, o null si aún no responde. */
  @Get('mia')
  mia(@Req() req: any) {
    return this.opinion.mia(req.user.userId);
  }

  /** Guarda la respuesta; si ya existía, la reemplaza. */
  @Post()
  guardar(@Req() req: any, @Body() dto: OpinionDto) {
    return this.opinion.guardar(req.user.userId, dto);
  }

  /** Resultados agregados y anónimos. */
  @Get('resultados')
  @Roles(Role.TEACHER, Role.ADMIN)
  resultados() {
    return this.opinion.resultados();
  }
}
