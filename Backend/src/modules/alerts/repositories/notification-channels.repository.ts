import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { NotificationChannel } from '../entities/notification-channel.entity';
import type { ChannelType } from '../constants/channel-type';

type CreateChannelData = {
  organizationId: string;
  name: string;
  type: ChannelType;
  target: string;
  encryptedSecret: string | null;
  verificationToken: string | null;
};

@Injectable()
export class NotificationChannelsRepository {
  constructor(@InjectRepository(NotificationChannel) private readonly repository: Repository<NotificationChannel>) {}

  async create(data: CreateChannelData): Promise<NotificationChannel> {
    const channel = this.repository.create(data);
    return this.repository.save(channel);
  }

  async findByIdOrThrow(organizationId: string, id: string): Promise<NotificationChannel | null> {
    return this.repository.findOne({ where: { organizationId, id } });
  }

  async findByIds(organizationId: string, ids: string[]): Promise<NotificationChannel[]> {
    if (ids.length === 0) {
      return [];
    }
    return this.repository.find({ where: { organizationId, id: In(ids) } });
  }

  async list(organizationId: string): Promise<NotificationChannel[]> {
    return this.repository.find({ where: { organizationId }, order: { createdAt: 'DESC' } });
  }

  async verify(id: string, verifiedAt: Date): Promise<void> {
    await this.repository.update({ id }, { verificationStatus: 'VERIFIED', verifiedAt, verificationToken: null });
  }

  async update(organizationId: string, id: string, data: Partial<CreateChannelData & { isActive: boolean }>): Promise<void> {
    await this.repository.update({ organizationId, id }, data);
  }

  async delete(organizationId: string, id: string): Promise<void> {
    await this.repository.delete({ organizationId, id });
  }
}
