import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn } from 'class-validator';
import { ROLES, type Role } from '../../constants/roles';

export class InviteMemberDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty({ enum: Object.values(ROLES) })
  @IsIn(Object.values(ROLES))
  role!: Role;
}
