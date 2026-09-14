import { Inject, Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import type Redis from 'ioredis';
import { REDIS_CACHE_CLIENT } from '@infrastructure/redis/redis.module';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(@Inject(REDIS_CACHE_CLIENT) private readonly redis: Redis) {
    super();
  }

  async check(key: string): Promise<HealthIndicatorResult> {
    try {
      await this.redis.ping();
      return this.getStatus(key, true);
    } catch {
      throw new HealthCheckError('Redis check failed', this.getStatus(key, false));
    }
  }
}
