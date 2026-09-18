import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { INCIDENT_CREATED_EVENT, IncidentCreatedEvent } from '@modules/incidents/events/incident-created.event';
import { AlertsService } from '../services/alerts.service';
import type { AlertableEvent } from '../services/alert-rule-evaluator';

@Injectable()
export class IncidentCreatedListener {
  private readonly logger = new Logger(IncidentCreatedListener.name);

  constructor(private readonly alertsService: AlertsService) {}

  @OnEvent(INCIDENT_CREATED_EVENT)
  async handle(event: IncidentCreatedEvent): Promise<void> {
    try {
      const alertableEvent: AlertableEvent = {
        trigger: 'INCIDENT_CREATED',
        organizationId: event.organizationId,
        projectId: event.projectId,
        monitorId: event.monitorId,
        incidentId: event.incidentId,
        cause: event.cause,
        isFlapping: event.isFlapping,
        isAcknowledged: false,
      };
      await this.alertsService.handleEvent(alertableEvent);
    } catch (error) {
      this.logger.error({
        msg: 'Failed to process incident.created for alerts',
        incidentId: event.incidentId,
        organizationId: event.organizationId,
        monitorId: event.monitorId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
