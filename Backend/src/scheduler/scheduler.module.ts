import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppConfigModule } from '@config/config.module';
import { AppLoggerModule } from '@infrastructure/logger/logger.module';
import { DatabaseModule } from '@infrastructure/database/database.module';
import { RedisModule } from '@infrastructure/redis/redis.module';
import { HttpModule } from '@infrastructure/http/http.module';
import { QueueModule } from '@infrastructure/queue/queue.module';
import { MonitorsModule } from '@modules/monitors/monitors.module';
import { MonitorChecksModule } from '@modules/monitor-checks/monitor-checks.module';
import { WorkerHealthModule } from '../workers/health/worker-health.module';
import { SchedulerBootstrapService } from './scheduler-bootstrap.service';

/**
 * Owns repeatable jobs and the retention cron. Never registers a domain HTTP
 * controller or a BullMQ processor — it produces schedule state, it does not
 * consume jobs. Exactly one replica must run this role (root CLAUDE.md,
 * workers/CLAUDE.md §8) — enforced by deployment convention, not code.
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
    ScheduleModule.forRoot(),
    MonitorsModule,
    MonitorChecksModule,
    WorkerHealthModule,
  ],
  providers: [SchedulerBootstrapService],
})
export class SchedulerModule {}
