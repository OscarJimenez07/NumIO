import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SimplexService } from './methods/simplex.service';
import { TransportationModiService } from './methods/transportation-modi.service';
import { AssignmentHungarianService } from './methods/assignment-hungarian.service';
import { SimplexInputDto, SimplexValidateDto } from './dto/simplex.dto';
import { TransportationInputDto, TransportationValidateDto } from './dto/transportation.dto';
import { AssignmentInputDto, AssignmentValidateDto } from './dto/assignment.dto';

@ApiTags('operations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('operations')
export class OperationsController {
  constructor(
    private readonly simplex: SimplexService,
    private readonly transport: TransportationModiService,
    private readonly assignment: AssignmentHungarianService,
  ) {}

  @Post('simplex/solve')
  solveSimplex(@Body() dto: SimplexInputDto) { return this.simplex.solve(dto); }
  @Post('simplex/validate')
  validateSimplex(@Body() dto: SimplexValidateDto) {
    const { userSteps, ...input } = dto as any;
    return this.simplex.validate(input, userSteps);
  }

  @Post('transportation/solve')
  solveTrans(@Body() dto: TransportationInputDto) { return this.transport.solve(dto); }
  @Post('transportation/validate')
  validateTrans(@Body() dto: TransportationValidateDto) {
    const { userSteps, ...input } = dto as any;
    return this.transport.validate(input, userSteps);
  }

  @Post('assignment/solve')
  solveAssign(@Body() dto: AssignmentInputDto) { return this.assignment.solve(dto); }
  @Post('assignment/validate')
  validateAssign(@Body() dto: AssignmentValidateDto) {
    const { userSteps, ...input } = dto as any;
    return this.assignment.validate(input, userSteps);
  }
}
