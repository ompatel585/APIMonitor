import { Injectable } from '@nestjs/common';
import { NotFoundDomainException } from '@common/exceptions/not-found.exception';
import { TransactionService } from '@infrastructure/database/transaction.service';
import { OrganizationsRepository } from '../repositories/organizations.repository';
import { MembershipsRepository } from '../repositories/memberships.repository';
import { Organization } from '../entities/organization.entity';
import { ROLES } from '../constants/roles';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly organizationsRepository: OrganizationsRepository,
    private readonly membershipsRepository: MembershipsRepository,
    private readonly transactionService: TransactionService,
  ) {}

  async findByIdForActor(id: string, actorUserId: string): Promise<Organization> {
    const membership = await this.membershipsRepository.findByOrganizationAndUser(id, actorUserId);
    if (!membership) {
      throw new NotFoundDomainException('Organization');
    }

    const organization = await this.organizationsRepository.findById(id);
    if (!organization) {
      throw new NotFoundDomainException('Organization');
    }
    return organization;
  }

  async createWithOwner(name: string, ownerUserId: string): Promise<Organization> {
    return this.transactionService.runInTransaction(async (manager) => {
      const baseSlug = slugify(name);
      const slug = `${baseSlug}-${Date.now().toString(36)}`;

      const organization = await this.organizationsRepository.create({ name, slug }, manager);

      await this.membershipsRepository.create(
        {
          organizationId: organization.id,
          userId: ownerUserId,
          role: ROLES.OWNER,
        },
        manager,
      );

      return organization;
    });
  }
}
