import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { NumericalModule } from './numerical/numerical.module';
import { OperationsModule } from './operations/operations.module';
import { AttemptsModule } from './attempts/attempts.module';
import { FeedbackModule } from './feedback/feedback.module';
import { PilotModule } from './pilot/pilot.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    FeedbackModule,
    NumericalModule,
    OperationsModule,
    AttemptsModule,
    PilotModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
