import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, type HealthCheckResult } from '@nestjs/terminus';
import { RedisHealthIndicator } from '@health/indicators/redis.health';

/**
 * The liveness/readiness surface required by workers/CLAUDE.md §7. This is
 * the only HTTP controller a worker or scheduler process ever registers —
 * infrastructure, not a domain endpoint. No auth guard applies here because
 * WorkerModule/SchedulerModule never import AuthModule, so there is nothing
 * to bypass.
 */
@Controller('health')
export class WorkerHealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly redisHealth: RedisHealthIndicator,
  ) {}

  @Get('live')
  liveness(): { status: string } {
    return { status: 'ok' };
  }

  @Get('ready')
  @HealthCheck()
  readiness(): Promise<HealthCheckResult> {
    return this.health.check([() => this.redisHealth.check('redis')]);
  }
}
