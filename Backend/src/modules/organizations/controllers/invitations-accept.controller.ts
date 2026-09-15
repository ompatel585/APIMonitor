import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@common/types/authenticated-user.type';
import { InvitationsService } from '../services/invitations.service';
import { AcceptInvitationDto } from '../dto/requests/accept-invitation.dto';

@ApiTags('organizations')
@Controller('invitations')
export class InvitationsAcceptController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('accept')
  async accept(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AcceptInvitationDto,
  ): Promise<void> {
    await this.invitationsService.accept(dto.token, user.id);
  }
}
