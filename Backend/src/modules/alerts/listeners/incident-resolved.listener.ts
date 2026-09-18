import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { INCIDENT_RESOLVED_EVENT, IncidentResolvedEvent } from '@modules/incidents/events/incident-resolved.event';
import { AlertsService } from '../services/alerts.service';
import { ALERT_TRIGGERS } from '../constants/alert-trigger';
import type { AlertableEvent } from '../services/alert-rule-evaluator';

@Injectable()
export class IncidentResolvedListener {
  private readonly logger = new Logger(IncidentResolvedListener.name);

  constructor(private readonly alertsService: AlertsService) {}

  @OnEvent(INCIDENT_RESOLVED_EVENT)
  async handle(event: IncidentResolvedEvent): Promise<void> {
    try {
      const alertableEvent: AlertableEvent = {
        trigger: 'INCIDENT_RESOLVED',
        organizationId: event.organizationId,
        projectId: event.projectId,
        monitorId: event.monitorId,
        incidentId: event.incidentId,
        durationSeconds: event.durationSeconds,
        isFlapping: false,
        isAcknowledged: false,
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
        msg: 'Failed to process incident.resolved for alerts',
        incidentId: event.incidentId,
        organizationId: event.organizationId,
        monitorId: event.monitorId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
