import { Module } from '@nestjs/common';
import { OpinionController } from './opinion.controller';
import { OpinionService } from './opinion.service';

@Module({
  controllers: [OpinionController],
  providers: [OpinionService],
})
export class OpinionModule {}
