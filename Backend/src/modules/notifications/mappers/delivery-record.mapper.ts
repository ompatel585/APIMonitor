import { DeliveryRecord } from '../entities/delivery-record.entity';
import { DeliveryRecordResponseDto } from '../dto/responses/delivery-record.response.dto';

export function toDeliveryRecordResponseDto(record: DeliveryRecord): DeliveryRecordResponseDto {
  return {
    id: record.id,
    alertId: record.alertId,
    channelId: record.channelId,
    status: record.status,
    attempt: record.attempt,
    failureReason: record.failureReason,
    correlationId: record.correlationId,
    createdAt: record.createdAt.toISOString(),
  };
}
