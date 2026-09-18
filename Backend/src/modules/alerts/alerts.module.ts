import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EncryptionModule } from '@infrastructure/encryption/encryption.module';
import { MailerModule } from '@infrastructure/mailer/mailer.module';
import { QueueModule } from '@infrastructure/queue/queue.module';
import { AlertRule } from './entities/alert-rule.entity';
import { Alert } from './entities/alert.entity';
import { NotificationChannel } from './entities/notification-channel.entity';
import { AlertRulesRepository } from './repositories/alert-rules.repository';
import { AlertsRepository } from './repositories/alerts.repository';
import { NotificationChannelsRepository } from './repositories/notification-channels.repository';
import { AlertRulesService } from './services/alert-rules.service';
import { AlertsService } from './services/alerts.service';
import { NotificationChannelsService } from './services/notification-channels.service';
import { IncidentCreatedListener } from './listeners/incident-created.listener';
import { IncidentResolvedListener } from './listeners/incident-resolved.listener';
import { IncidentAcknowledgedListener } from './listeners/incident-acknowledged.listener';

/**
 * Services, persistence, and the `incident.created` / `incident.resolved` /
 * `incident.acknowledged` listeners — no controller. This is what a
 * non-HTTP process (worker) imports: the notification worker needs
 * `AlertsService` (to re-fire escalations) and `NotificationChannelsService`
 * (to decrypt a channel secret for delivery), and the listeners must run in
 * the same process that emits the incident events (the worker, since
 * `IncidentsService.handleCheckCompleted` runs there). `AlertsHttpModule`
 * adds the controllers for the API role. The pure evaluator in
 * `services/alert-rule-evaluator.ts` is a plain function, not a provider.
 */
@Module({
  imports: [TypeOrmModule.forFeature([AlertRule, Alert, NotificationChannel]), EncryptionModule, MailerModule, QueueModule],
  providers: [
    AlertRulesRepository,
    AlertsRepository,
    NotificationChannelsRepository,
    AlertRulesService,
    AlertsService,
    NotificationChannelsService,
    IncidentCreatedListener,
    IncidentResolvedListener,
    IncidentAcknowledgedListener,
  ],
  exports: [AlertRulesService, AlertsService, NotificationChannelsService],
})
export class AlertsModule {}
