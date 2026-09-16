import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectsService } from './services/projects.service';
import { ProjectsRepository } from './repositories/projects.repository';
import { Project } from './entities/project.entity';

/**
 * Services and persistence only — no controller. This is what a
 * non-HTTP process (worker, scheduler) imports when it needs
 * `ProjectsService` without exposing `/organizations/:orgId/projects`
 * routes. `ProjectsHttpModule` adds the controller for the API role.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Project])],
  providers: [ProjectsService, ProjectsRepository],
  exports: [ProjectsService],
})
export class ProjectsModule {}
