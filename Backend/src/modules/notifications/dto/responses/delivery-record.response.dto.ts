import { ApiProperty } from '@nestjs/swagger';
import { DELIVERY_STATUSES, type DeliveryStatus } from '../../constants/delivery-status';

export class DeliveryRecordResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  alertId!: string;

  @ApiProperty()
  channelId!: string;

  @ApiProperty({ enum: Object.values(DELIVERY_STATUSES) })
  status!: DeliveryStatus;

  @ApiProperty()
  attempt!: number;

  @ApiProperty({ nullable: true, type: String })
  failureReason!: string | null;

  @ApiProperty()
  correlationId!: string;

  @ApiProperty()
  createdAt!: string;
}
