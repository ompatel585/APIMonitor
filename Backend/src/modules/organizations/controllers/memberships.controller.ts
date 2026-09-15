import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@common/types/authenticated-user.type';
import { ParseUuidPipe } from '@common/pipes/parse-uuid.pipe';
import { MembershipsService } from '../services/memberships.service';
import { UpdateMembershipDto } from '../dto/requests/update-membership.dto';
import { MembershipResponseDto } from '../dto/responses/membership.response.dto';
import { toMembershipResponseDto } from '../mappers/membership.mapper';

@ApiTags('organizations')
@Controller('organizations/:orgId/memberships')
export class MembershipsController {
  constructor(private readonly membershipsService: MembershipsService) {}

  @Get()
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orgId', ParseUuidPipe) orgId: string,
  ): Promise<MembershipResponseDto[]> {
    const memberships = await this.membershipsService.listForActor(orgId, user.id);
    return memberships.map(toMembershipResponseDto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Patch(':userId')
  async updateRole(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orgId', ParseUuidPipe) orgId: string,
    @Param('userId', ParseUuidPipe) userId: string,
    @Body() dto: UpdateMembershipDto,
  ): Promise<void> {
    await this.membershipsService.updateRoleAsActor(orgId, user.id, userId, dto.role);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':userId')
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orgId', ParseUuidPipe) orgId: string,
    @Param('userId', ParseUuidPipe) userId: string,
  ): Promise<void> {
    await this.membershipsService.removeAsActor(orgId, user.id, userId);
  }
}
