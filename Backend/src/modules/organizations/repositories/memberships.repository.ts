import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Membership } from '../entities/membership.entity';
import type { Role } from '../constants/roles';

@Injectable()
export class MembershipsRepository {
  constructor(
    @InjectRepository(Membership) private readonly repository: Repository<Membership>,
  ) {}

  private scope(manager?: EntityManager): Repository<Membership> {
    return manager ? manager.getRepository(Membership) : this.repository;
  }

  async findByOrganizationAndUser(organizationId: string, userId: string): Promise<Membership | null> {
    return this.repository.findOne({ where: { organizationId, userId } });
  }

  async listByOrganization(organizationId: string): Promise<Membership[]> {
    return this.repository.find({ where: { organizationId }, relations: { user: true } });
  }

  async listByUser(userId: string): Promise<Membership[]> {
    return this.repository.find({ where: { userId }, relations: { organization: true } });
  }

  async create(
    data: { organizationId: string; userId: string; role: Role },
    manager?: EntityManager,
  ): Promise<Membership> {
    const repository = this.scope(manager);
    const membership = repository.create(data);
    return repository.save(membership);
  }

  async updateRole(organizationId: string, userId: string, role: Role): Promise<void> {
    await this.repository.update({ organizationId, userId }, { role });
  }

  async remove(organizationId: string, userId: string): Promise<void> {
    await this.repository.delete({ organizationId, userId });
  }
}
