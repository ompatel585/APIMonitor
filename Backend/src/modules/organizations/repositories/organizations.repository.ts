import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Organization } from '../entities/organization.entity';

@Injectable()
export class OrganizationsRepository {
  constructor(
    @InjectRepository(Organization) private readonly repository: Repository<Organization>,
  ) {}

  private scope(manager?: EntityManager): Repository<Organization> {
    return manager ? manager.getRepository(Organization) : this.repository;
  }

  async findById(id: string): Promise<Organization | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findBySlug(slug: string): Promise<Organization | null> {
    return this.repository.findOne({ where: { slug } });
  }

  async create(
    data: Pick<Organization, 'name' | 'slug'>,
    manager?: EntityManager,
  ): Promise<Organization> {
    const repository = this.scope(manager);
    const organization = repository.create(data);
    return repository.save(organization);
  }
}
