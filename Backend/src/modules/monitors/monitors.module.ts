import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectsModule } from '@modules/projects/projects.module';
import { QueueModule } from '@infrastructure/queue/queue.module';
import { MonitorsService } from './services/monitors.service';
import { MonitorScheduleService } from './services/monitor-schedule.service';
import { MonitorsRepository } from './repositories/monitors.repository';
import { Monitor } from './entities/monitor.entity';

/**
 * Services and persistence only — no controller. This is what a
 * non-HTTP process (worker, scheduler) imports when it needs
 * `MonitorsService`/`MonitorScheduleService` without exposing monitor
 * routes. `MonitorsHttpModule` adds the controller for the API role.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Monitor]), ProjectsModule, QueueModule],
  providers: [MonitorsService, MonitorScheduleService, MonitorsRepository],
  exports: [MonitorsService, MonitorScheduleService],
})
export class MonitorsModule {}
