import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES, escalationJobId, notificationJobId } from './queue.constants';
import type { NotificationEscalationJobPayload, NotificationJobPayload } from './notification-job.payload';

const DELIVERY_ATTEMPTS = 5;
const DELIVERY_BACKOFF_DELAY_MS = 10_000;
const RETENTION_COUNT = 500;

@Injectable()
export class NotificationQueueProducer {
  constructor(@InjectQueue(QUEUE_NAMES.NOTIFICATION) private readonly queue: Queue<NotificationJobPayload>) {}

  async enqueueDelivery(organizationId: string, alertId: string, channelId: string, correlationId: string): Promise<void> {
    await this.queue.add(
      QUEUE_NAMES.NOTIFICATION,
      { kind: 'DELIVERY', organizationId, alertId, channelId, correlationId },
      {
        jobId: notificationJobId(alertId, channelId),
        attempts: DELIVERY_ATTEMPTS,
        backoff: { type: 'exponential', delay: DELIVERY_BACKOFF_DELAY_MS },
        removeOnComplete: { count: RETENTION_COUNT },
        removeOnFail: { count: RETENTION_COUNT },
      },
    );
  }

  /**
   * Enqueues a delayed re-check of incident state. `delayMs` is the
   * escalation policy's configured minutes-unacknowledged, converted by the
   * caller. Upserting with the same deterministic job id means re-arming an
   * escalation (e.g. a rule change) replaces rather than duplicates it.
   */
  async scheduleEscalation(payload: NotificationEscalationJobPayload, delayMs: number): Promise<void> {
    await this.queue.add(QUEUE_NAMES.NOTIFICATION, payload, {
      jobId: escalationJobId(payload.incidentId, payload.ruleId),
      delay: delayMs,
      attempts: 1,
      removeOnComplete: { count: RETENTION_COUNT },
      removeOnFail: { count: RETENTION_COUNT },
    });
  }

  /**
   * Cancellation is best-effort: the escalation processor re-verifies
   * incident state before acting, so a failed or racing removal here is not a
   * correctness bug (alerts/CLAUDE.md §5).
   */
  async cancelEscalation(incidentId: string, ruleId: string): Promise<void> {
    await this.queue.remove(escalationJobId(incidentId, ruleId));
  }
}
