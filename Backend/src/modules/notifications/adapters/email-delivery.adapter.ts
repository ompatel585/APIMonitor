import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@infrastructure/mailer/mailer.service';
import { alertTriggeredEmail } from '@infrastructure/mailer/templates/alert-triggered.template';
import type { NotificationChannel } from '@modules/alerts/entities/notification-channel.entity';
import type { Alert } from '@modules/alerts/entities/alert.entity';

export type DeliveryResult = { success: boolean; error?: string };

/**
 * Sends the EMAIL channel type. The rendered subject/body never leaves this
 * adapter — it is built from the already-persisted `Alert.summary`, not from
 * anything carried on the job payload (notifications/CLAUDE.md).
 */
@Injectable()
export class EmailDeliveryAdapter {
  private readonly logger = new Logger(EmailDeliveryAdapter.name);

  constructor(private readonly mailerService: MailerService) {}

  async send(alert: Alert, channel: NotificationChannel, monitorName: string): Promise<DeliveryResult> {
    try {
      const email = alertTriggeredEmail({
        monitorName,
        trigger: alert.trigger,
        summary: alert.summary,
      });
      await this.mailerService.send({ to: channel.target, subject: email.subject, text: email.text });
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown email delivery error';
      this.logger.warn({ msg: 'email delivery failed', channelId: channel.id, alertId: alert.id, error: message });
      return { success: false, error: message };
    }
  }
}
