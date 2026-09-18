import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@infrastructure/database/base.entity';
import { CHANNEL_TYPES, CHANNEL_VERIFICATION_STATUSES, type ChannelType, type ChannelVerificationStatus } from '../constants/channel-type';

/**
 * `encryptedSecret` holds the webhook HMAC signing secret (WEBHOOK channels
 * only) as an AES-256-GCM blob from `EncryptionService` — never plaintext,
 * never returned in a response DTO (alerts/CLAUDE.md §6). EMAIL channels have
 * no secret.
 */
@Entity('notification_channels')
@Index(['organizationId'])
export class NotificationChannel extends BaseEntity {
  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'varchar', enum: Object.values(CHANNEL_TYPES) })
  type!: ChannelType;

  @Column({ type: 'varchar', name: 'target' })
  target!: string;

  @Column({ type: 'text', name: 'encrypted_secret', nullable: true })
  encryptedSecret!: string | null;

  @Column({
    type: 'varchar',
    name: 'verification_status',
    enum: Object.values(CHANNEL_VERIFICATION_STATUSES),
    default: CHANNEL_VERIFICATION_STATUSES.PENDING,
  })
  verificationStatus!: ChannelVerificationStatus;

  @Column({ type: 'varchar', name: 'verification_token', nullable: true })
  verificationToken!: string | null;

  @Column({ type: 'timestamptz', name: 'verified_at', nullable: true })
  verifiedAt!: Date | null;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive!: boolean;
}
