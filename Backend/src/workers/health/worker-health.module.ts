import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { RedisHealthIndicator } from '@health/indicators/redis.health';
import { WorkerHealthController } from './health.controller';

@Module({
  imports: [TerminusModule],
  controllers: [WorkerHealthController],
  providers: [RedisHealthIndicator],
})
export class WorkerHealthModule {}
