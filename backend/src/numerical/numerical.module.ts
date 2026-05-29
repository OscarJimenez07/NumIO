import { Module } from '@nestjs/common';
import { NumericalController } from './numerical.controller';
import { BisectionService } from './methods/bisection.service';
import { NewtonRaphsonService } from './methods/newton-raphson.service';
import { LagrangeService } from './methods/lagrange.service';
import { NewtonDividedService } from './methods/newton-divided.service';
import { TrapezoidalService } from './methods/trapezoidal.service';
import { Simpson13Service } from './methods/simpson13.service';
import { Simpson38Service } from './methods/simpson38.service';

@Module({
  controllers: [NumericalController],
  providers: [
    BisectionService,
    NewtonRaphsonService,
    LagrangeService,
    NewtonDividedService,
    TrapezoidalService,
    Simpson13Service,
    Simpson38Service,
  ],
  exports: [
    BisectionService,
    NewtonRaphsonService,
    LagrangeService,
    NewtonDividedService,
    TrapezoidalService,
    Simpson13Service,
    Simpson38Service,
  ],
})
export class NumericalModule {}
