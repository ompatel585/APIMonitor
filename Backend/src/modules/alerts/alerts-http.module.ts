import { Module } from '@nestjs/common';
import { AlertsModule } from './alerts.module';
import { AlertRulesController } from './controllers/alert-rules.controller';
import { NotificationChannelsController } from './controllers/notification-channels.controller';

/**
 * The API-role surface for `alerts`: composes the controllers over the
 * domain module. Only `AppModule` imports this — `WorkerModule` imports
 * `AlertsModule` directly and never sees these controllers.
 */
@Module({
  imports: [AlertsModule],
  controllers: [AlertRulesController, NotificationChannelsController],
})
export class AlertsHttpModule {}
