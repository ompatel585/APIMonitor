import { ApiProperty } from '@nestjs/swagger';
import { ROLES, type Role } from '../../constants/roles';

export class MembershipResponseDto {
  @ApiProperty()
  userId!: string;

  @ApiProperty()
  organizationId!: string;

  @ApiProperty({ enum: Object.values(ROLES) })
  role!: Role;

  @ApiProperty()
  createdAt!: string;
}
