import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  INCIDENT_ACKNOWLEDGED_EVENT,
  IncidentAcknowledgedEvent,
} from '@modules/incidents/events/incident-acknowledged.event';
import { AlertsService } from '../services/alerts.service';
import { ALERT_TRIGGERS } from '../constants/alert-trigger';
import type { AlertableEvent } from '../services/alert-rule-evaluator';

@Injectable()
export class IncidentAcknowledgedListener {
  private readonly logger = new Logger(IncidentAcknowledgedListener.name);

  constructor(private readonly alertsService: AlertsService) {}

  @OnEvent(INCIDENT_ACKNOWLEDGED_EVENT)
  async handle(event: IncidentAcknowledgedEvent): Promise<void> {
    try {
      const alertableEvent: AlertableEvent = {
        trigger: 'INCIDENT_ACKNOWLEDGED',
        organizationId: event.organizationId,
        projectId: event.projectId,
        monitorId: event.monitorId,
        incidentId: event.incidentId,
        isFlapping: false,
        isAcknowledged: true,
      };
      await this.alertsService.handleEvent(alertableEvent);

      const rulesWithEscalation = await this.alertsService.findRulesWithEscalation(
        event.organizationId,
        ALERT_TRIGGERS.INCIDENT_CREATED,
      );
      await this.alertsService.cancelEscalations(
        event.organizationId,
        event.incidentId,
        rulesWithEscalation.map((rule) => rule.id),
      );
    } catch (error) {
      this.logger.error({
        msg: 'Failed to process incident.acknowledged for alerts',
        incidentId: event.incidentId,
        organizationId: event.organizationId,
        monitorId: event.monitorId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
