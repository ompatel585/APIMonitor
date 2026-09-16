import { Module } from '@nestjs/common';
import { ProjectsModule } from './projects.module';
import { ProjectsController } from './controllers/projects.controller';

/**
 * The API-role surface for `projects`: composes the controller over the
 * domain module. Only `AppModule` imports this — `WorkerModule` and
 * `SchedulerModule` import `ProjectsModule` directly and never see this
 * controller.
 */
@Module({
  imports: [ProjectsModule],
  controllers: [ProjectsController],
})
export class ProjectsHttpModule {}
