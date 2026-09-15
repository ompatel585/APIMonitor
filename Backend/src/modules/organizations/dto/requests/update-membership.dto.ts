import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { ROLES, type Role } from '../../constants/roles';

export class UpdateMembershipDto {
  @ApiProperty({ enum: Object.values(ROLES) })
  @IsIn(Object.values(ROLES))
  role!: Role;
}
