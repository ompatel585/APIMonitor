import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@common/types/authenticated-user.type';
import { MembershipsService } from '@modules/organizations/services/memberships.service';
import { MembershipResponseDto } from '@modules/organizations/dto/responses/membership.response.dto';
import { toMembershipResponseDto } from '@modules/organizations/mappers/membership.mapper';
import { UsersService } from './services/users.service';
import { UpdateUserDto } from './dto/requests/update-user.dto';
import { UserResponseDto } from './dto/responses/user.response.dto';
import { toUserResponseDto } from './mappers/user.mapper';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly membershipsService: MembershipsService,
  ) {}

  @ApiOkResponse({ type: UserResponseDto })
  @Get('me')
  async getMe(@CurrentUser() user: AuthenticatedUser): Promise<UserResponseDto> {
    const found = await this.usersService.findById(user.id);
    return toUserResponseDto(found);
  }

  @ApiOkResponse({ type: UserResponseDto })
  @Patch('me')
  async updateMe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const updated = await this.usersService.updateProfile(user.id, dto);
    return toUserResponseDto(updated);
  }

  @ApiOkResponse({ type: MembershipResponseDto, isArray: true })
  @Get('me/memberships')
  async getMyMemberships(@CurrentUser() user: AuthenticatedUser): Promise<MembershipResponseDto[]> {
    const memberships = await this.membershipsService.listForUser(user.id);
    return memberships.map(toMembershipResponseDto);
  }
}
