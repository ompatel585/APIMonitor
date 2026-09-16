import { Module } from '@nestjs/common';
import { MonitorsModule } from './monitors.module';
import { MonitorsController } from './controllers/monitors.controller';

/**
 * The API-role surface for `monitors`: composes the controller over the
 * domain module. Only `AppModule` imports this — `WorkerModule` and
 * `SchedulerModule` import `MonitorsModule` directly and never see this
 * controller.
 */
@Module({
  imports: [MonitorsModule],
  controllers: [MonitorsController],
})
export class MonitorsHttpModule {}
