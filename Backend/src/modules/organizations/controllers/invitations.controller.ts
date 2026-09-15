import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@common/types/authenticated-user.type';
import { ParseUuidPipe } from '@common/pipes/parse-uuid.pipe';
import { MembershipsService } from '../services/memberships.service';
import { InvitationsService } from '../services/invitations.service';
import { InviteMemberDto } from '../dto/requests/invite-member.dto';

@ApiTags('organizations')
@Controller('organizations/:orgId/invitations')
export class InvitationsController {
  constructor(
    private readonly invitationsService: InvitationsService,
    private readonly membershipsService: MembershipsService,
  ) {}

  @Get()
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orgId', ParseUuidPipe) orgId: string,
  ): Promise<{ email: string; role: string; expiresAt: string }[]> {
    await this.membershipsService.assertActorIsMember(orgId, user.id);
    const invitations = await this.invitationsService.listPending(orgId);
    return invitations.map((invitation) => ({
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt.toISOString(),
    }));
  }

  @Post()
  async invite(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orgId', ParseUuidPipe) orgId: string,
    @Body() dto: InviteMemberDto,
  ): Promise<{ token: string }> {
    await this.membershipsService.assertActorIsMember(orgId, user.id);
    const token = await this.invitationsService.invite(orgId, dto.email, dto.role);
    return { token };
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  async revoke(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orgId', ParseUuidPipe) orgId: string,
    @Param('id', ParseUuidPipe) id: string,
  ): Promise<void> {
    await this.membershipsService.assertActorIsMember(orgId, user.id);
    await this.invitationsService.revoke(orgId, id);
  }
}
