import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService, type HealthCheckResult } from '@nestjs/terminus';
import { Public } from '@common/decorators/public.decorator';
import { DatabaseHealthIndicator } from './indicators/database.health';
import { RedisHealthIndicator } from './indicators/redis.health';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly databaseHealth: DatabaseHealthIndicator,
    private readonly redisHealth: RedisHealthIndicator,
  ) {}

  @Public()
  @Get('live')
  liveness(): { status: string } {
    return { status: 'ok' };
  }

  @Public()
  @Get('ready')
  @HealthCheck()
  readiness(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.databaseHealth.check('database'),
      () => this.redisHealth.check('redis'),
    ]);
  }
}
