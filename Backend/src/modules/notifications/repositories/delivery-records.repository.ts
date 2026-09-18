import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeliveryRecord } from '../entities/delivery-record.entity';
import type { DeliveryStatus } from '../constants/delivery-status';

type CreateDeliveryRecordData = {
  alertId: string;
  channelId: string;
  status: DeliveryStatus;
  attempt: number;
  failureReason: string | null;
  correlationId: string;
};

type CursorPage = {
  limit: number;
  cursor?: { createdAt: Date; id: string };
};

@Injectable()
export class DeliveryRecordsRepository {
  constructor(@InjectRepository(DeliveryRecord) private readonly repository: Repository<DeliveryRecord>) {}

  async create(data: CreateDeliveryRecordData): Promise<DeliveryRecord> {
    const record = this.repository.create(data);
    return this.repository.save(record);
  }

  /**
   * Delivery history for a channel, newest first, cursor-paginated. There is
   * no unscoped listing — the controller resolves `channelId` through the
   * tenant-scoped `NotificationChannelsService` first, so an id from another
   * organization never reaches this query.
   */
  async listByChannel(channelId: string, page: CursorPage): Promise<DeliveryRecord[]> {
    return this.listBy('channel_id', channelId, page);
  }

  /**
   * Delivery history for an alert, newest first, cursor-paginated. Same
   * tenant-scoping precondition as `listByChannel` — the controller resolves
   * `alertId` through the tenant-scoped `AlertsService`/`AlertsRepository`
   * first.
   */
  async listByAlert(alertId: string, page: CursorPage): Promise<DeliveryRecord[]> {
    return this.listBy('alert_id', alertId, page);
  }

  private async listBy(column: 'channel_id' | 'alert_id', value: string, page: CursorPage): Promise<DeliveryRecord[]> {
    const qb = this.repository
      .createQueryBuilder('record')
      .where(`record.${column} = :value`, { value })
      .orderBy('record.created_at', 'DESC')
      .addOrderBy('record.id', 'DESC')
      .take(page.limit);

    if (page.cursor) {
      qb.andWhere('(record.created_at, record.id) < (:createdAt, :id)', {
        createdAt: page.cursor.createdAt,
        id: page.cursor.id,
      });
    }

    return qb.getMany();
  }
}
