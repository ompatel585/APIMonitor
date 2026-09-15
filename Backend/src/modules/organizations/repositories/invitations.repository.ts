import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invitation, INVITATION_STATUSES } from '../entities/invitation.entity';
import type { Role } from '../constants/roles';

@Injectable()
export class InvitationsRepository {
  constructor(
    @InjectRepository(Invitation) private readonly repository: Repository<Invitation>,
  ) {}

  async findByOrganizationAndId(organizationId: string, id: string): Promise<Invitation | null> {
    return this.repository.findOne({ where: { organizationId, id } });
  }

  async findByTokenHash(tokenHash: string): Promise<Invitation | null> {
    return this.repository.findOne({ where: { tokenHash } });
  }

  async listPendingByOrganization(organizationId: string): Promise<Invitation[]> {
    return this.repository.find({
      where: { organizationId, status: INVITATION_STATUSES.PENDING },
    });
  }

  async create(data: {
    organizationId: string;
    email: string;
    role: Role;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<Invitation> {
    const invitation = this.repository.create(data);
    return this.repository.save(invitation);
  }

  async markAccepted(id: string): Promise<void> {
    await this.repository.update({ id }, { status: INVITATION_STATUSES.ACCEPTED });
  }

  async markRevoked(organizationId: string, id: string): Promise<void> {
    await this.repository.update({ organizationId, id }, { status: INVITATION_STATUSES.REVOKED });
  }
}
