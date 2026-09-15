import { Injectable } from '@nestjs/common';
import { NotFoundDomainException } from '@common/exceptions/not-found.exception';
import { MembershipsRepository } from '../repositories/memberships.repository';
import { Membership } from '../entities/membership.entity';
import type { Role } from '../constants/roles';

@Injectable()
export class MembershipsService {
  constructor(private readonly membershipsRepository: MembershipsRepository) {}

  async listForActor(organizationId: string, actorUserId: string): Promise<Membership[]> {
    await this.assertActorIsMember(organizationId, actorUserId);
    return this.membershipsRepository.listByOrganization(organizationId);
  }

  async findForActor(organizationId: string, userId: string): Promise<Membership | null> {
    return this.membershipsRepository.findByOrganizationAndUser(organizationId, userId);
  }

  async assertActorIsMember(organizationId: string, actorUserId: string): Promise<Membership> {
    const membership = await this.membershipsRepository.findByOrganizationAndUser(
      organizationId,
      actorUserId,
    );
    if (!membership) {
      throw new NotFoundDomainException('Organization');
    }
    return membership;
  }

  async updateRoleAsActor(
    organizationId: string,
    actorUserId: string,
    targetUserId: string,
    role: Role,
  ): Promise<void> {
    await this.assertActorIsMember(organizationId, actorUserId);

    const target = await this.membershipsRepository.findByOrganizationAndUser(
      organizationId,
      targetUserId,
    );
    if (!target) {
      throw new NotFoundDomainException('Membership');
    }

    await this.membershipsRepository.updateRole(organizationId, targetUserId, role);
  }

  async removeAsActor(organizationId: string, actorUserId: string, targetUserId: string): Promise<void> {
    await this.assertActorIsMember(organizationId, actorUserId);

    const target = await this.membershipsRepository.findByOrganizationAndUser(
      organizationId,
      targetUserId,
    );
    if (!target) {
      throw new NotFoundDomainException('Membership');
    }

    await this.membershipsRepository.remove(organizationId, targetUserId);
  }
}
