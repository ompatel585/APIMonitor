import { Injectable, Logger } from '@nestjs/common';
import { NotFoundDomainException } from '@common/exceptions/not-found.exception';
import { AlertsRepository } from '@modules/alerts/repositories/alerts.repository';
import { NotificationChannelsRepository } from '@modules/alerts/repositories/notification-channels.repository';
import { NotificationChannelsService } from '@modules/alerts/services/notification-channels.service';
import { MonitorsService } from '@modules/monitors/services/monitors.service';
import { CHANNEL_TYPES } from '@modules/alerts/constants/channel-type';
import type { NotificationDeliveryJobPayload } from '@infrastructure/queue/notification-job.payload';
import { DeliveryRecordsRepository } from '../repositories/delivery-records.repository';
import { EmailDeliveryAdapter } from '../adapters/email-delivery.adapter';
import { WebhookDeliveryAdapter } from '../adapters/webhook-delivery.adapter';
import { DELIVERY_STATUSES } from '../constants/delivery-status';
import type { DeliveryRecord } from '../entities/delivery-record.entity';

function encodeDeliveryCursor(createdAt: Date, id: string): string {
  return Buffer.from(JSON.stringify({ createdAt: createdAt.toISOString(), id }), 'utf-8').toString('base64url');
}

function decodeDeliveryCursor(cursor: string | undefined): { createdAt: Date; id: string } | undefined {
  if (!cursor) {
    return undefined;
  }
  try {
    const decoded: unknown = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf-8'));
    if (
      typeof decoded === 'object' &&
      decoded !== null &&
      'createdAt' in decoded &&
      'id' in decoded &&
      typeof (decoded as { createdAt: unknown }).createdAt === 'string' &&
      typeof (decoded as { id: unknown }).id === 'string'
    ) {
      return { createdAt: new Date((decoded as { createdAt: string }).createdAt), id: (decoded as { id: string }).id };
    }
  } catch {
    // fall through to undefined — an invalid cursor is treated as no cursor
  }
  return undefined;
}

export type DeliverOutcome = {
  record: DeliveryRecord;
  /** false when the job should be reported as failed so BullMQ's attempts/backoff drives the retry. */
  shouldRetry: boolean;
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly alertsRepository: AlertsRepository,
    private readonly notificationChannelsRepository: NotificationChannelsRepository,
    private readonly notificationChannelsService: NotificationChannelsService,
    private readonly monitorsService: MonitorsService,
    private readonly deliveryRecordsRepository: DeliveryRecordsRepository,
    private readonly emailDeliveryAdapter: EmailDeliveryAdapter,
    private readonly webhookDeliveryAdapter: WebhookDeliveryAdapter,
  ) {}

  /**
   * Delivers one alert to one channel and writes an append-only
   * `DeliveryRecord` of the outcome. Safe to run twice: a retried job writes
   * another delivery record (the attempt history is the point, per
   * notifications/CLAUDE.md) rather than mutating shared state, so replaying
   * a job never corrupts anything — it only adds another receipt.
   */
  async deliver(payload: NotificationDeliveryJobPayload, attempt: number): Promise<DeliverOutcome> {
    const alert = await this.alertsRepository.findByIdOrThrow(payload.organizationId, payload.alertId);
    if (!alert) {
      // The alert row is gone (e.g. cleaned up) — a poison message, not a
      // retryable failure. Record it as skipped and complete the job.
      const record = await this.deliveryRecordsRepository.create({
        alertId: payload.alertId,
        channelId: payload.channelId,
        status: DELIVERY_STATUSES.SKIPPED,
        attempt,
        failureReason: 'Alert not found',
        correlationId: payload.correlationId,
      });
      return { record, shouldRetry: false };
    }

    const channel = await this.notificationChannelsRepository.findByIdOrThrow(payload.organizationId, payload.channelId);
    if (!channel || !channel.isActive || channel.verificationStatus !== 'VERIFIED') {
      const record = await this.deliveryRecordsRepository.create({
        alertId: payload.alertId,
        channelId: payload.channelId,
        status: DELIVERY_STATUSES.SKIPPED,
        attempt,
        failureReason: !channel ? 'Channel not found' : 'Channel inactive or unverified',
        correlationId: payload.correlationId,
      });
      return { record, shouldRetry: false };
    }

    const monitorName = await this.monitorsService
      .findByIdOrThrow(payload.organizationId, alert.monitorId)
      .then((monitor) => monitor.name)
      .catch((error: unknown) => {
        if (error instanceof NotFoundDomainException) {
          return alert.monitorId;
        }
        throw error;
      });

    const result =
      channel.type === CHANNEL_TYPES.EMAIL
        ? await this.deliverEmail(alert, channel, monitorName)
        : await this.deliverWebhook(alert, channel, monitorName);

    const record = await this.deliveryRecordsRepository.create({
      alertId: payload.alertId,
      channelId: payload.channelId,
      status: result.success ? DELIVERY_STATUSES.SENT : DELIVERY_STATUSES.FAILED,
      attempt,
      // Never a rendered message body — only a short, safe failure reason
      // (notifications/CLAUDE.md).
      failureReason: result.success ? null : truncate(result.error ?? 'Unknown delivery failure'),
      correlationId: payload.correlationId,
    });

    this.logger.log({
      msg: 'notification delivery attempted',
      alertId: payload.alertId,
      channelId: payload.channelId,
      channelType: channel.type,
      attempt,
      outcome: record.status,
      correlationId: payload.correlationId,
    });

    return { record, shouldRetry: result.success ? false : result.shouldRetry };
  }

  private async deliverEmail(
    alert: Parameters<EmailDeliveryAdapter['send']>[0],
    channel: Parameters<EmailDeliveryAdapter['send']>[1],
    monitorName: string,
  ): Promise<{ success: boolean; error?: string; shouldRetry: boolean }> {
    const result = await this.emailDeliveryAdapter.send(alert, channel, monitorName);
    // Email failures (SMTP transport errors) are always transient/retryable.
    return { ...result, shouldRetry: !result.success };
  }

  private async deliverWebhook(
    alert: Parameters<WebhookDeliveryAdapter['send']>[0],
    channel: Parameters<WebhookDeliveryAdapter['send']>[1],
    monitorName: string,
  ): Promise<{ success: boolean; error?: string; shouldRetry: boolean }> {
    const decryptedSecret = this.notificationChannelsService.decryptSecret(channel);
    if (!decryptedSecret) {
      return { success: false, error: 'Webhook channel is missing a signing secret', shouldRetry: false };
    }
    return this.webhookDeliveryAdapter.send(alert, channel, decryptedSecret, monitorName);
  }

  /**
   * Delivery history, tenant-scoped by resolving the filter id through its
   * owning tenant-scoped repository first — `DeliveryRecord` itself carries
   * no `organizationId` (append-only receipt table, see the entity's
   * doc comment), so this is the only point tenancy is enforced. Exactly one
   * of `channelId`/`alertId` is required; the controller validates that.
   */
  async list(
    organizationId: string,
    filter: { channelId?: string; alertId?: string },
    page: { limit: number; cursor?: string },
  ): Promise<{ items: DeliveryRecord[]; nextCursor: string | null }> {
    const decodedCursor = decodeDeliveryCursor(page.cursor);
    const cursorPage = { limit: page.limit, cursor: decodedCursor };

    let items: DeliveryRecord[];
    if (filter.channelId) {
      await this.notificationChannelsService.findByIdOrThrow(organizationId, filter.channelId);
      items = await this.deliveryRecordsRepository.listByChannel(filter.channelId, cursorPage);
    } else {
      const alertId = filter.alertId as string;
      const alert = await this.alertsRepository.findByIdOrThrow(organizationId, alertId);
      if (!alert) {
        throw new NotFoundDomainException('Alert');
      }
      items = await this.deliveryRecordsRepository.listByAlert(alertId, cursorPage);
    }

    const last = items[items.length - 1];
    const nextCursor = items.length === page.limit && last ? encodeDeliveryCursor(last.createdAt, last.id) : null;

    return { items, nextCursor };
  }
}

function truncate(value: string, maxLength = 500): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}
