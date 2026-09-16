import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Project } from '../entities/project.entity';

@Injectable()
export class ProjectsRepository {
  constructor(
    @InjectRepository(Project) private readonly repository: Repository<Project>,
  ) {}

  private scope(manager?: EntityManager): Repository<Project> {
    return manager ? manager.getRepository(Project) : this.repository;
  }

  async findById(organizationId: string, id: string): Promise<Project | null> {
    return this.repository.findOne({ where: { id, organizationId } });
  }

  async listByOrganization(organizationId: string): Promise<Project[]> {
    return this.repository.find({ where: { organizationId }, order: { createdAt: 'DESC' } });
  }

  async create(
    data: { organizationId: string; name: string; description?: string | null },
    manager?: EntityManager,
  ): Promise<Project> {
    const repository = this.scope(manager);
    const project = repository.create({ ...data, description: data.description ?? null });
    return repository.save(project);
  }

  async update(
    organizationId: string,
    id: string,
    data: { name?: string; description?: string | null },
  ): Promise<void> {
    await this.repository.update({ id, organizationId }, data);
  }

  async remove(organizationId: string, id: string): Promise<void> {
    await this.repository.delete({ id, organizationId });
  }
}
