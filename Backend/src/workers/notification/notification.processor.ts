import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { QUEUE_NAMES } from '@infrastructure/queue/queue.constants';
import type { NotificationJobPayload } from '@infrastructure/queue/notification-job.payload';
import { NotFoundDomainException } from '@common/exceptions/not-found.exception';
import { IncidentsService } from '@modules/incidents/services/incidents.service';
import { AlertsService } from '@modules/alerts/services/alerts.service';
import { NotificationsService } from '@modules/notifications/services/notifications.service';

const OPEN_INCIDENT_STATUSES = new Set(['OPEN']);

@Processor(QUEUE_NAMES.NOTIFICATION)
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly alertsService: AlertsService,
    private readonly incidentsService: IncidentsService,
  ) {
    super();
  }

  async process(job: Job<NotificationJobPayload>): Promise<void> {
    const startedAt = Date.now();
    const { correlationId } = job.data;
    const attempt = job.attemptsMade + 1;

    this.logger.log({
      msg: 'notification job started',
      jobId: job.id,
      kind: job.data.kind,
      attempt,
      correlationId,
    });

    try {
      if (job.data.kind === 'DELIVERY') {
        await this.processDelivery(job.data, attempt);
      } else {
        await this.processEscalation(job.data);
      }

      this.logger.log({
        msg: 'notification job finished',
        jobId: job.id,
        kind: job.data.kind,
        correlationId,
        durationMs: Date.now() - startedAt,
        outcome: 'completed',
      });
    } catch (error) {
      this.logger.error({
        msg: 'notification job failed',
        jobId: job.id,
        kind: job.data.kind,
        correlationId,
        durationMs: Date.now() - startedAt,
        outcome: 'failed',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private async processDelivery(
    payload: Extract<NotificationJobPayload, { kind: 'DELIVERY' }>,
    attempt: number,
  ): Promise<void> {
    const outcome = await this.notificationsService.deliver(payload, attempt);
    if (outcome.shouldRetry) {
      // A retryable delivery failure fails the job so BullMQ's
      // attempts/backoff drives the retry (notifications/CLAUDE.md §3). A
      // permanent failure (e.g. SSRF-blocked) is already recorded as a
      // completed job by deliver() returning shouldRetry: false.
      throw new Error(outcome.record.failureReason ?? 'Notification delivery failed');
    }
  }

  /**
   * Delayed re-check for an escalation. Cancellation on acknowledgement/
   * resolution is best-effort (alerts/CLAUDE.md §5), so this always
   * re-verifies incident state before escalating rather than trusting that
   * the job was successfully removed.
   */
  private async processEscalation(payload: Extract<NotificationJobPayload, { kind: 'ESCALATION' }>): Promise<void> {
    const incident = await this.incidentsService.findByIdOrThrow(payload.organizationId, payload.incidentId).catch(
      (error: unknown) => {
        if (error instanceof NotFoundDomainException) {
          return null;
        }
        throw error;
      },
    );

    if (!incident || !OPEN_INCIDENT_STATUSES.has(incident.status)) {
      this.logger.log({
        msg: 'escalation skipped: incident no longer open',
        organizationId: payload.organizationId,
        incidentId: payload.incidentId,
        ruleId: payload.ruleId,
        incidentStatus: incident?.status ?? 'NOT_FOUND',
      });
      return;
    }

    await this.alertsService.fireEscalation(payload.organizationId, payload.ruleId, {
      id: incident.id,
      projectId: incident.projectId,
      monitorId: incident.monitorId,
      cause: incident.cause,
    });
  }
}
