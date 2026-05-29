import { Module } from '@nestjs/common';
import { OperationsController } from './operations.controller';
import { SimplexService } from './methods/simplex.service';
import { TransportationVogelService } from './methods/transportation-vogel.service';
import { TransportationModiService } from './methods/transportation-modi.service';
import { AssignmentHungarianService } from './methods/assignment-hungarian.service';

@Module({
  controllers: [OperationsController],
  providers: [
    SimplexService,
    TransportationVogelService,
    TransportationModiService,
    AssignmentHungarianService,
  ],
  exports: [SimplexService, TransportationModiService, AssignmentHungarianService],
})
export class OperationsModule {}
