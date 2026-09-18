import { ApiProperty } from '@nestjs/swagger';
import { CHANNEL_TYPES, CHANNEL_VERIFICATION_STATUSES, type ChannelType, type ChannelVerificationStatus } from '../../constants/channel-type';

/**
 * Never includes the secret field — not even masked (alerts/CLAUDE.md §6).
 * `target` is safe to return: an email address or a webhook URL, neither is
 * a credential.
 */
export class NotificationChannelResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  organizationId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: Object.values(CHANNEL_TYPES) })
  type!: ChannelType;

  @ApiProperty()
  target!: string;

  @ApiProperty({ enum: Object.values(CHANNEL_VERIFICATION_STATUSES) })
  verificationStatus!: ChannelVerificationStatus;

  @ApiProperty({ nullable: true, type: String })
  verifiedAt!: string | null;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  createdAt!: string;
}
