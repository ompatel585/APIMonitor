import { Injectable } from '@nestjs/common';
import { NotFoundDomainException } from '@common/exceptions/not-found.exception';
import { ProjectsRepository } from '../repositories/projects.repository';
import { Project } from '../entities/project.entity';

@Injectable()
export class ProjectsService {
  constructor(private readonly projectsRepository: ProjectsRepository) {}

  async create(
    organizationId: string,
    data: { name: string; description?: string },
  ): Promise<Project> {
    return this.projectsRepository.create({ organizationId, ...data });
  }

  async list(organizationId: string): Promise<Project[]> {
    return this.projectsRepository.listByOrganization(organizationId);
  }

  async findByIdOrThrow(organizationId: string, id: string): Promise<Project> {
    const project = await this.projectsRepository.findById(organizationId, id);
    if (!project) {
      throw new NotFoundDomainException('Project');
    }
    return project;
  }

  async update(
    organizationId: string,
    id: string,
    data: { name?: string; description?: string },
  ): Promise<Project> {
    await this.findByIdOrThrow(organizationId, id);
    await this.projectsRepository.update(organizationId, id, data);
    return this.findByIdOrThrow(organizationId, id);
  }

  async remove(organizationId: string, id: string): Promise<void> {
    await this.findByIdOrThrow(organizationId, id);
    await this.projectsRepository.remove(organizationId, id);
  }
}
