import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlertsModule } from '@modules/alerts/alerts.module';
import { MonitorsModule } from '@modules/monitors/monitors.module';
import { HttpModule } from '@infrastructure/http/http.module';
import { MailerModule } from '@infrastructure/mailer/mailer.module';
import { DeliveryRecord } from './entities/delivery-record.entity';
import { DeliveryRecordsRepository } from './repositories/delivery-records.repository';
import { NotificationsService } from './services/notifications.service';
import { EmailDeliveryAdapter } from './adapters/email-delivery.adapter';
import { WebhookDeliveryAdapter } from './adapters/webhook-delivery.adapter';

/**
 * Delivery mechanics only — no controller. Depends on `AlertsModule` for
 * `AlertsRepository`/channel lookups and secret decryption, and on
 * `MonitorsModule` for the monitor name shown in a rendered message. This is
 * what the worker imports; `NotificationsHttpModule` adds the read-only
 * controller for the API role. See notifications/CLAUDE.md.
 */
@Module({
  imports: [TypeOrmModule.forFeature([DeliveryRecord]), AlertsModule, MonitorsModule, HttpModule, MailerModule],
  providers: [DeliveryRecordsRepository, NotificationsService, EmailDeliveryAdapter, WebhookDeliveryAdapter],
  exports: [NotificationsService],
})
export class NotificationsModule {}
