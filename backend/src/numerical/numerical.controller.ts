import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BisectionService } from './methods/bisection.service';
import { NewtonRaphsonService } from './methods/newton-raphson.service';
import { LagrangeService } from './methods/lagrange.service';
import { NewtonDividedService } from './methods/newton-divided.service';
import { TrapezoidalService } from './methods/trapezoidal.service';
import { Simpson13Service } from './methods/simpson13.service';
import { Simpson38Service } from './methods/simpson38.service';
import { BisectionInputDto, BisectionValidateDto } from './dto/bisection.dto';
import { NewtonInputDto, NewtonValidateDto } from './dto/newton.dto';
import { InterpolationInputDto, InterpolationValidateDto } from './dto/interpolation.dto';
import { IntegrationInputDto, IntegrationValidateDto } from './dto/integration.dto';

@ApiTags('numerical')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('numerical')
export class NumericalController {
  constructor(
    private readonly bisection: BisectionService,
    private readonly newton: NewtonRaphsonService,
    private readonly lagrange: LagrangeService,
    private readonly newtonDD: NewtonDividedService,
    private readonly trapezoidal: TrapezoidalService,
    private readonly simpson13: Simpson13Service,
    private readonly simpson38: Simpson38Service,
  ) {}

  // === Raíces ===
  @Post('bisection/solve')
  solveBisection(@Body() dto: BisectionInputDto) { return this.bisection.solve(dto); }
  @Post('bisection/validate')
  validateBisection(@Body() dto: BisectionValidateDto) {
    const { userSteps, ...input } = dto as any;
    return this.bisection.validate(input, userSteps);
  }

  @Post('newton-raphson/solve')
  solveNewton(@Body() dto: NewtonInputDto) { return this.newton.solve(dto); }
  @Post('newton-raphson/validate')
  validateNewton(@Body() dto: NewtonValidateDto) {
    const { userSteps, ...input } = dto as any;
    return this.newton.validate(input, userSteps);
  }

  // === Interpolación ===
  @Post('lagrange/solve')
  solveLagrange(@Body() dto: InterpolationInputDto) { return this.lagrange.solve(dto); }
  @Post('lagrange/validate')
  validateLagrange(@Body() dto: InterpolationValidateDto) {
    const { userSteps, ...input } = dto as any;
    return this.lagrange.validate(input, userSteps);
  }

  @Post('newton-divided/solve')
  solveNewtonDD(@Body() dto: InterpolationInputDto) { return this.newtonDD.solve(dto); }
  @Post('newton-divided/validate')
  validateNewtonDD(@Body() dto: InterpolationValidateDto) {
    const { userSteps, ...input } = dto as any;
    return this.newtonDD.validate(input, userSteps);
  }

  // === Integración ===
  @Post('trapezoidal/solve')
  solveTrap(@Body() dto: IntegrationInputDto) { return this.trapezoidal.solve(dto); }
  @Post('trapezoidal/validate')
  validateTrap(@Body() dto: IntegrationValidateDto) {
    const { userSteps, ...input } = dto as any;
    return this.trapezoidal.validate(input, userSteps);
  }

  @Post('simpson-1-3/solve')
  solveS13(@Body() dto: IntegrationInputDto) { return this.simpson13.solve(dto); }
  @Post('simpson-1-3/validate')
  validateS13(@Body() dto: IntegrationValidateDto) {
    const { userSteps, ...input } = dto as any;
    return this.simpson13.validate(input, userSteps);
  }

  @Post('simpson-3-8/solve')
  solveS38(@Body() dto: IntegrationInputDto) { return this.simpson38.solve(dto); }
  @Post('simpson-3-8/validate')
  validateS38(@Body() dto: IntegrationValidateDto) {
    const { userSteps, ...input } = dto as any;
    return this.simpson38.validate(input, userSteps);
  }
}
