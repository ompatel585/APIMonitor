import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Monitor, type MonitorMethod, type MonitorStatus } from '../entities/monitor.entity';

type CreateMonitorData = {
  organizationId: string;
  projectId: string;
  name: string;
  url: string;
  method?: MonitorMethod;
  headers?: Record<string, string> | null;
  body?: string | null;
  intervalSeconds: number;
  timeoutMs?: number;
  expectedStatusCodes?: number[];
  followRedirects?: boolean;
  degradedThresholdMs?: number;
  consecutiveFailureThreshold?: number;
  consecutiveSuccessThreshold?: number;
};

type UpdateMonitorData = Partial<Omit<CreateMonitorData, 'organizationId' | 'projectId'>> & {
  isActive?: boolean;
};

@Injectable()
export class MonitorsRepository {
  constructor(
    @InjectRepository(Monitor) private readonly repository: Repository<Monitor>,
  ) {}

  private scope(manager?: EntityManager): Repository<Monitor> {
    return manager ? manager.getRepository(Monitor) : this.repository;
  }

  async findById(organizationId: string, id: string): Promise<Monitor | null> {
    return this.repository.findOne({ where: { id, organizationId } });
  }

  async listByProject(organizationId: string, projectId: string): Promise<Monitor[]> {
    return this.repository.find({
      where: { organizationId, projectId },
      order: { createdAt: 'DESC' },
    });
  }

  async create(data: CreateMonitorData, manager?: EntityManager): Promise<Monitor> {
    const repository = this.scope(manager);
    const monitor = repository.create(data);
    return repository.save(monitor);
  }

  async update(organizationId: string, id: string, data: UpdateMonitorData): Promise<void> {
    await this.repository.update({ id, organizationId }, data);
  }

  async remove(organizationId: string, id: string): Promise<void> {
    await this.repository.delete({ id, organizationId });
  }

  async updateStatusFields(
    id: string,
    data: { status: MonitorStatus; lastCheckAt: Date; lastLatencyMs: number | null },
  ): Promise<void> {
    await this.repository.update({ id }, data);
  }
}
