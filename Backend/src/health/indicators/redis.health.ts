import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { CacheService } from '@infrastructure/redis/cache.service';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(private readonly cacheService: CacheService) {
    super();
  }

  async check(key: string): Promise<HealthIndicatorResult> {
    try {
      await this.cacheService.ping();
      return this.getStatus(key, true);
    } catch {
      throw new HealthCheckError('Redis check failed', this.getStatus(key, false));
    }
  }
}
