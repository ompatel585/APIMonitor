import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Incident } from './entities/incident.entity';
import { IncidentEvent } from './entities/incident-event.entity';
import { IncidentsRepository } from './repositories/incidents.repository';
import { IncidentEventsRepository } from './repositories/incident-events.repository';
import { IncidentsService } from './services/incidents.service';
import { MonitorCheckCompletedListener } from './listeners/monitor-check-completed.listener';

/**
 * Services, persistence, and the `monitor.check_completed` listener — no
 * controller. This is what a non-HTTP process (worker) imports: the listener
 * must run in the same process that emits the event
 * (`MonitorChecksService.record()`, in the worker). `IncidentsHttpModule`
 * adds the controller for the API role.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Incident, IncidentEvent])],
  providers: [IncidentsRepository, IncidentEventsRepository, IncidentsService, MonitorCheckCompletedListener],
  exports: [IncidentsService],
})
export class IncidentsModule {}
