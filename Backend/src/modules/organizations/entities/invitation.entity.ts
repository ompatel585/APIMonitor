import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '@infrastructure/database/base.entity';
import { Organization } from './organization.entity';
import { ROLES, type Role } from '../constants/roles';

export const INVITATION_STATUSES = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  EXPIRED: 'EXPIRED',
  REVOKED: 'REVOKED',
} as const;

export type InvitationStatus = (typeof INVITATION_STATUSES)[keyof typeof INVITATION_STATUSES];

@Entity('invitations')
@Index(['organizationId'])
export class Invitation extends BaseEntity {
  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId!: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization!: Organization;

  @Column({ type: 'varchar' })
  email!: string;

  @Column({ type: 'varchar', enum: Object.values(ROLES) })
  role!: Role;

  @Column({ type: 'varchar', unique: true, name: 'token_hash' })
  tokenHash!: string;

  @Column({ type: 'varchar', enum: Object.values(INVITATION_STATUSES), default: INVITATION_STATUSES.PENDING })
  status!: InvitationStatus;

  @Column({ type: 'timestamptz', name: 'expires_at' })
  expiresAt!: Date;
}
