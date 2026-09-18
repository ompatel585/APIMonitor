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

@Injectable()
export class DeliveryRecordsRepository {
  constructor(@InjectRepository(DeliveryRecord) private readonly repository: Repository<DeliveryRecord>) {}

  async create(data: CreateDeliveryRecordData): Promise<DeliveryRecord> {
    const record = this.repository.create(data);
    return this.repository.save(record);
  }

  /**
   * Delivery history for a channel, newest first. `channelId` is required —
   * there is no unscoped listing — and the controller resolves the channel
   * through the tenant-scoped `NotificationChannelsService` first, so an id
   * from another organization never reaches this query.
   */
  async listByChannel(channelId: string, limit: number): Promise<DeliveryRecord[]> {
    return this.repository.find({
      where: { channelId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async listByAlert(alertId: string): Promise<DeliveryRecord[]> {
    return this.repository.find({ where: { alertId }, order: { createdAt: 'DESC' } });
  }
}
