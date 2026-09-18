import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { IncidentEvent } from '../entities/incident-event.entity';
import type { IncidentEventType } from '../constants/incident-status';

type CreateIncidentEventData = {
  incidentId: string;
  type: IncidentEventType;
  message: string | null;
  actorId: string | null;
  metadata: Record<string, unknown> | null;
};

@Injectable()
export class IncidentEventsRepository {
  constructor(
    @InjectRepository(IncidentEvent) private readonly repository: Repository<IncidentEvent>,
  ) {}

  private scope(manager?: EntityManager): Repository<IncidentEvent> {
    return manager ? manager.getRepository(IncidentEvent) : this.repository;
  }

  async create(data: CreateIncidentEventData, manager?: EntityManager): Promise<IncidentEvent> {
    const repository = this.scope(manager);
    const event = repository.create(data);
    return repository.save(event);
  }

  async findLastByType(incidentId: string, type: IncidentEventType, manager?: EntityManager): Promise<IncidentEvent | null> {
    return this.scope(manager).findOne({
      where: { incidentId, type },
      order: { createdAt: 'DESC' },
    });
  }

  async listByIncident(incidentId: string): Promise<IncidentEvent[]> {
    return this.repository.find({
      where: { incidentId },
      order: { createdAt: 'ASC' },
    });
  }
}
