import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, LessThan, Repository } from 'typeorm';
import { MonitorCheck } from '../entities/monitor-check.entity';

type CreateMonitorCheckData = {
  organizationId: string;
  monitorId: string;
  succeeded: boolean;
  statusCode: number | null;
  latencyMs: number;
  errorMessage: string | null;
};

@Injectable()
export class MonitorChecksRepository {
  constructor(
    @InjectRepository(MonitorCheck) private readonly repository: Repository<MonitorCheck>,
  ) {}

  private scope(manager?: EntityManager): Repository<MonitorCheck> {
    return manager ? manager.getRepository(MonitorCheck) : this.repository;
  }

  async create(data: CreateMonitorCheckData, manager?: EntityManager): Promise<MonitorCheck> {
    const repository = this.scope(manager);
    const check = repository.create(data);
    return repository.save(check);
  }

  /**
   * Oldest first, most-recent last — the ordering `evaluate()` requires.
   */
  async listRecent(
    organizationId: string,
    monitorId: string,
    limit: number,
    manager?: EntityManager,
  ): Promise<MonitorCheck[]> {
    const rows = await this.scope(manager).find({
      where: { organizationId, monitorId },
      order: { checkedAt: 'DESC' },
      take: limit,
    });
    return rows.reverse();
  }

  async deleteOlderThan(cutoff: Date): Promise<number> {
    const result = await this.repository.delete({ checkedAt: LessThan(cutoff) });
    return result.affected ?? 0;
  }
}
