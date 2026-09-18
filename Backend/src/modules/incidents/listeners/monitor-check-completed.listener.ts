import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { MONITOR_CHECK_COMPLETED_EVENT, MonitorCheckCompletedEvent } from '@modules/monitor-checks/events/monitor-check-completed.event';
import { IncidentsService } from '../services/incidents.service';

@Injectable()
export class MonitorCheckCompletedListener {
  private readonly logger = new Logger(MonitorCheckCompletedListener.name);

  constructor(private readonly incidentsService: IncidentsService) {}

  @OnEvent(MONITOR_CHECK_COMPLETED_EVENT)
  async handle(event: MonitorCheckCompletedEvent): Promise<void> {
    try {
      await this.incidentsService.handleCheckCompleted(event);
    } catch (error) {
      this.logger.error({
        msg: 'Failed to process monitor.check_completed for incidents',
        monitorId: event.monitorId,
        checkId: event.checkId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
