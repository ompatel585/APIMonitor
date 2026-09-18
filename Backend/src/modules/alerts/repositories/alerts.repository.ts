import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Alert } from '../entities/alert.entity';
import type { AlertTrigger } from '../constants/alert-trigger';

type CreateAlertData = {
  organizationId: string;
  alertRuleId: string;
  incidentId: string | null;
  monitorId: string;
  trigger: AlertTrigger;
  summary: string;
  channelIds: string[];
};

@Injectable()
export class AlertsRepository {
  constructor(@InjectRepository(Alert) private readonly repository: Repository<Alert>) {}

  private scope(manager?: EntityManager): Repository<Alert> {
    return manager ? manager.getRepository(Alert) : this.repository;
  }

  async create(data: CreateAlertData, manager?: EntityManager): Promise<Alert> {
    const repository = this.scope(manager);
    const alert = repository.create(data);
    return repository.save(alert);
  }

  async findByIdOrThrow(organizationId: string, id: string): Promise<Alert | null> {
    return this.repository.findOne({ where: { organizationId, id } });
  }
}
