import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ParseUuidPipe } from '@common/pipes/parse-uuid.pipe';
import { RequirePermission } from '@modules/auth/decorators/require-permission.decorator';
import { PERMISSIONS } from '@modules/auth/constants/permissions';
import { NotificationChannelsService } from '../services/notification-channels.service';
import { CreateNotificationChannelDto } from '../dto/requests/create-notification-channel.dto';
import { VerifyNotificationChannelDto } from '../dto/requests/verify-notification-channel.dto';
import { NotificationChannelResponseDto } from '../dto/responses/notification-channel.response.dto';
import { toNotificationChannelResponseDto } from '../mappers/notification-channel.mapper';

@ApiTags('notification-channels')
@Controller('organizations/:orgId/notification-channels')
export class NotificationChannelsController {
  constructor(private readonly notificationChannelsService: NotificationChannelsService) {}

  @RequirePermission(PERMISSIONS.NOTIFICATION_CHANNEL_MANAGE)
  @ApiOkResponse({ type: NotificationChannelResponseDto, isArray: true })
  @Get()
  async list(@Param('orgId', ParseUuidPipe) orgId: string): Promise<NotificationChannelResponseDto[]> {
    const channels = await this.notificationChannelsService.list(orgId);
    return channels.map(toNotificationChannelResponseDto);
  }

  @RequirePermission(PERMISSIONS.NOTIFICATION_CHANNEL_MANAGE)
  @ApiOkResponse({ type: NotificationChannelResponseDto })
  @Get(':id')
  async findOne(
    @Param('orgId', ParseUuidPipe) orgId: string,
    @Param('id', ParseUuidPipe) id: string,
  ): Promise<NotificationChannelResponseDto> {
    const channel = await this.notificationChannelsService.findByIdOrThrow(orgId, id);
    return toNotificationChannelResponseDto(channel);
  }

  @RequirePermission(PERMISSIONS.NOTIFICATION_CHANNEL_MANAGE)
  @ApiCreatedResponse({ type: NotificationChannelResponseDto })
  @Post()
  async create(
    @Param('orgId', ParseUuidPipe) orgId: string,
    @Body() body: CreateNotificationChannelDto,
  ): Promise<NotificationChannelResponseDto> {
    const channel = await this.notificationChannelsService.create(orgId, {
      name: body.name,
      type: body.type,
      target: body.target,
    });
    return toNotificationChannelResponseDto(channel);
  }

  @RequirePermission(PERMISSIONS.NOTIFICATION_CHANNEL_MANAGE)
  @ApiOkResponse()
  @Delete(':id')
  async remove(@Param('orgId', ParseUuidPipe) orgId: string, @Param('id', ParseUuidPipe) id: string): Promise<void> {
    await this.notificationChannelsService.delete(orgId, id);
  }

  @RequirePermission(PERMISSIONS.NOTIFICATION_CHANNEL_MANAGE)
  @ApiOkResponse({ type: NotificationChannelResponseDto })
  @Post(':id/actions/verify')
  async verify(
    @Param('orgId', ParseUuidPipe) orgId: string,
    @Param('id', ParseUuidPipe) id: string,
    @Body() body: VerifyNotificationChannelDto,
  ): Promise<NotificationChannelResponseDto> {
    const channel = await this.notificationChannelsService.verify(orgId, id, body.token);
    return toNotificationChannelResponseDto(channel);
  }
}
