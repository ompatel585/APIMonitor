import { NotificationChannel } from '../entities/notification-channel.entity';
import { NotificationChannelResponseDto } from '../dto/responses/notification-channel.response.dto';

export function toNotificationChannelResponseDto(channel: NotificationChannel): NotificationChannelResponseDto {
  return {
    id: channel.id,
    organizationId: channel.organizationId,
    name: channel.name,
    type: channel.type,
    target: channel.target,
    verificationStatus: channel.verificationStatus,
    verifiedAt: channel.verifiedAt ? channel.verifiedAt.toISOString() : null,
    isActive: channel.isActive,
    createdAt: channel.createdAt.toISOString(),
  };
}
