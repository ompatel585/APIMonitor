import { Module } from '@nestjs/common';
import { IncidentsModule } from './incidents.module';
import { IncidentsController } from './controllers/incidents.controller';

/**
 * The API-role surface for `incidents`: composes the controller over the
 * domain module. Only `AppModule` imports this — `WorkerModule` imports
 * `IncidentsModule` directly and never sees this controller.
 */
@Module({
  imports: [IncidentsModule],
  controllers: [IncidentsController],
})
export class IncidentsHttpModule {}
