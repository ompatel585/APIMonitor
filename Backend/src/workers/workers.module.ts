import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppConfigModule } from '@config/config.module';
import { AppLoggerModule } from '@infrastructure/logger/logger.module';
import { DatabaseModule } from '@infrastructure/database/database.module';
import { RedisModule } from '@infrastructure/redis/redis.module';
import { HttpModule } from '@infrastructure/http/http.module';
import { QueueModule } from '@infrastructure/queue/queue.module';
import { MonitorsModule } from '@modules/monitors/monitors.module';
import { MonitorChecksModule } from '@modules/monitor-checks/monitor-checks.module';
import { IncidentsModule } from '@modules/incidents/incidents.module';
import { WorkerHealthModule } from './health/worker-health.module';
import { CheckExecutorService } from './monitor-check/check-executor.service';
import { MonitorCheckProcessor } from './monitor-check/monitor-check.processor';

/**
 * Consumes jobs only — never registers a domain HTTP controller or gateway.
 * Imports the same domain modules the API imports, but this process is never
 * bootstrapped with routes wired to them: see src/worker.ts.
 */
@Module({
  imports: [
    AppConfigModule,
    AppLoggerModule,
    EventEmitterModule.forRoot(),
    DatabaseModule,
    RedisModule,
    HttpModule,
    QueueModule,
    MonitorsModule,
    MonitorChecksModule,
    IncidentsModule,
    WorkerHealthModule,
  ],
  providers: [CheckExecutorService, MonitorCheckProcessor],
})
export class WorkerModule {}
