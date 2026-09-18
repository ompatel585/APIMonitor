import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ParseUuidPipe } from '@common/pipes/parse-uuid.pipe';
import { CursorPageDto } from '@common/dto/cursor-page.dto';
import { ValidationDomainException } from '@common/exceptions/validation.exception';
import { RequirePermission } from '@modules/auth/decorators/require-permission.decorator';
import { PERMISSIONS } from '@modules/auth/constants/permissions';
import { NotificationsService } from '../services/notifications.service';
import { ListDeliveryRecordsQueryDto } from '../dto/requests/list-delivery-records.query.dto';
import { DeliveryRecordResponseDto } from '../dto/responses/delivery-record.response.dto';
import { toDeliveryRecordResponseDto } from '../mappers/delivery-record.mapper';

@ApiTags('delivery-records')
@Controller('organizations/:orgId/delivery-records')
export class DeliveryRecordsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @RequirePermission(PERMISSIONS.NOTIFICATION_CHANNEL_MANAGE)
  @ApiOkResponse({ type: CursorPageDto })
  @Get()
  async list(
    @Param('orgId', ParseUuidPipe) orgId: string,
    @Query() query: ListDeliveryRecordsQueryDto,
  ): Promise<CursorPageDto<DeliveryRecordResponseDto>> {
    if (!query.channelId === !query.alertId) {
      throw new ValidationDomainException('Provide exactly one of channelId or alertId');
    }

    const result = await this.notificationsService.list(
      orgId,
      { channelId: query.channelId, alertId: query.alertId },
      { limit: query.limit ?? 20, cursor: query.cursor },
    );

    return {
      items: result.items.map(toDeliveryRecordResponseDto),
      nextCursor: result.nextCursor,
    };
  }
}
