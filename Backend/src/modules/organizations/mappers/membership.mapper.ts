import { Membership } from '../entities/membership.entity';
import { MembershipResponseDto } from '../dto/responses/membership.response.dto';

export function toMembershipResponseDto(membership: Membership): MembershipResponseDto {
  return {
    userId: membership.userId,
    organizationId: membership.organizationId,
    role: membership.role,
    createdAt: membership.createdAt.toISOString(),
  };
}
