import { randomBytes, createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { NotFoundDomainException } from '@common/exceptions/not-found.exception';
import { ValidationDomainException } from '@common/exceptions/validation.exception';
import { InvitationsRepository } from '../repositories/invitations.repository';
import { MembershipsRepository } from '../repositories/memberships.repository';
import { Invitation, INVITATION_STATUSES } from '../entities/invitation.entity';
import type { Role } from '../constants/roles';

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class InvitationsService {
  constructor(
    private readonly invitationsRepository: InvitationsRepository,
    private readonly membershipsRepository: MembershipsRepository,
  ) {}

  async listPending(organizationId: string): Promise<Invitation[]> {
    return this.invitationsRepository.listPendingByOrganization(organizationId);
  }

  async invite(organizationId: string, email: string, role: Role): Promise<string> {
    const token = randomBytes(32).toString('hex');

    await this.invitationsRepository.create({
      organizationId,
      email,
      role,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
    });

    return token;
  }

  async accept(token: string, userId: string): Promise<void> {
    const invitation = await this.invitationsRepository.findByTokenHash(hashToken(token));

    if (!invitation || invitation.status !== INVITATION_STATUSES.PENDING) {
      throw new NotFoundDomainException('Invitation');
    }

    if (invitation.expiresAt.getTime() < Date.now()) {
      throw new ValidationDomainException('Invitation has expired');
    }

    await this.membershipsRepository.create({
      organizationId: invitation.organizationId,
      userId,
      role: invitation.role,
    });

    await this.invitationsRepository.markAccepted(invitation.id);
  }

  async revoke(organizationId: string, invitationId: string): Promise<void> {
    const invitation = await this.invitationsRepository.findByOrganizationAndId(
      organizationId,
      invitationId,
    );
    if (!invitation) {
      throw new NotFoundDomainException('Invitation');
    }
    await this.invitationsRepository.markRevoked(organizationId, invitationId);
  }
}
