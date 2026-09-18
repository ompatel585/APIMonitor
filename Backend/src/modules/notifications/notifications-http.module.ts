import { Module } from '@nestjs/common';
import { NotificationsModule } from './notifications.module';
import { DeliveryRecordsController } from './controllers/delivery-records.controller';

/**
 * The API-role surface for `notifications`: composes the read-only delivery
 * records controller over the domain module. Only `AppModule` imports this —
 * `WorkerModule` imports `NotificationsModule` directly and never sees this
 * controller.
 */
@Module({
  imports: [NotificationsModule],
  controllers: [DeliveryRecordsController],
})
export class NotificationsHttpModule {}
