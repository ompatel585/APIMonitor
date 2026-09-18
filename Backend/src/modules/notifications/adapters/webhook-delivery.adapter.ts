import { createHmac } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { SafeHttpClient } from '@infrastructure/http/safe-http.client';
import { SsrfViolationError } from '@infrastructure/http/ssrf-guard';
import type { NotificationChannel } from '@modules/alerts/entities/notification-channel.entity';
import type { Alert } from '@modules/alerts/entities/alert.entity';

const WEBHOOK_TIMEOUT_MS = 10_000;
const SIGNATURE_HEADER = 'X-APIMonitor-Signature';

export type DeliveryResult = {
  success: boolean;
  error?: string;
  /**
   * false when the failure is permanent (e.g. SSRF-blocked target) and
   * should NOT drive a BullMQ retry — an SSRF-blocked webhook is a
   * completed, recorded job, not a job failure (workers/CLAUDE.md §6,
   * applied to notifications). true for a transport/non-2xx failure, which
   * should signal retry so attempts/backoff drives it.
   */
  shouldRetry: boolean;
};

function signBody(body: string, secret: string): string {
  return createHmac('sha256', secret).update(body).digest('hex');
}

/**
 * Sends the WEBHOOK channel type. Signs the payload with the channel's
 * decrypted secret (caller decrypts — this adapter never touches
 * `EncryptionService` directly) and posts through `SafeHttpClient`, which
 * enforces the SSRF/timeout/size/redirect guards required for any outbound
 * request to a customer-supplied URL.
 */
@Injectable()
export class WebhookDeliveryAdapter {
  private readonly logger = new Logger(WebhookDeliveryAdapter.name);

  constructor(private readonly safeHttpClient: SafeHttpClient) {}

  async send(alert: Alert, channel: NotificationChannel, decryptedSecret: string, monitorName: string): Promise<DeliveryResult> {
    const body = JSON.stringify({
      alertId: alert.id,
      monitorId: alert.monitorId,
      monitorName,
      trigger: alert.trigger,
      summary: alert.summary,
      triggeredAt: alert.createdAt.toISOString(),
    });
    const signature = signBody(body, decryptedSecret);

    try {
      const response = await this.safeHttpClient.request(channel.target, {
        method: 'POST',
        headers: { 'content-type': 'application/json', [SIGNATURE_HEADER]: signature },
        body,
        timeoutMs: WEBHOOK_TIMEOUT_MS,
      });

      if (response.statusCode >= 200 && response.statusCode < 300) {
        return { success: true, shouldRetry: false };
      }

      return { success: false, error: `Webhook responded with status ${response.statusCode}`, shouldRetry: true };
    } catch (error) {
      if (error instanceof SsrfViolationError) {
        this.logger.warn({ msg: 'webhook delivery blocked by SSRF guard', channelId: channel.id, alertId: alert.id, error: error.message });
        return { success: false, error: error.message, shouldRetry: false };
      }

      const message = error instanceof Error ? error.message : 'Unknown webhook delivery error';
      this.logger.warn({ msg: 'webhook delivery failed', channelId: channel.id, alertId: alert.id, error: message });
      return { success: false, error: message, shouldRetry: true };
    }
  }
}
