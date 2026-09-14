import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { RedisModule } from '@infrastructure/redis/redis.module';
import { HealthController } from './health.controller';
import { DatabaseHealthIndicator } from './indicators/database.health';
import { RedisHealthIndicator } from './indicators/redis.health';

@Module({
  imports: [TerminusModule, RedisModule],
  controllers: [HealthController],
  providers: [DatabaseHealthIndicator, RedisHealthIndicator],
})
export class HealthModule {}
