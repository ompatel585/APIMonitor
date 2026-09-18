import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, LessThan, MoreThanOrEqual, Repository } from 'typeorm';
import { Incident } from '../entities/incident.entity';
import type { IncidentCause } from '../constants/incident-cause';
import { INCIDENT_STATUSES, type IncidentSeverity, type IncidentStatus } from '../constants/incident-status';

type CreateOpenIncidentData = {
  organizationId: string;
  projectId: string;
  monitorId: string;
  cause: IncidentCause;
  severity: IncidentSeverity;
  startedAt: Date;
  lastFailureAt: Date;
};

type CursorPage = {
  limit: number;
  cursor?: { startedAt: Date; id: string };
};

type ListFilters = {
  projectId?: string;
  monitorId?: string;
  status?: IncidentStatus;
};

@Injectable()
export class IncidentsRepository {
  constructor(
    @InjectRepository(Incident) private readonly repository: Repository<Incident>,
  ) {}

  private scope(manager?: EntityManager): Repository<Incident> {
    return manager ? manager.getRepository(Incident) : this.repository;
  }

  async findOpenByMonitorId(organizationId: string, monitorId: string, manager?: EntityManager): Promise<Incident | null> {
    return this.scope(manager)
      .createQueryBuilder('incident')
      .where('incident.organization_id = :organizationId', { organizationId })
      .andWhere('incident.monitor_id = :monitorId', { monitorId })
      .andWhere('incident.resolved_at IS NULL')
      .getOne();
  }

  async createOpen(data: CreateOpenIncidentData, manager: EntityManager): Promise<Incident> {
    const repository = this.scope(manager);
    const incident = repository.create({
      ...data,
      status: INCIDENT_STATUSES.OPEN,
      failureCount: 1,
    });
    return repository.save(incident);
  }

  async findByIdOrThrow(organizationId: string, id: string, manager?: EntityManager): Promise<Incident | null> {
    return this.scope(manager).findOne({ where: { organizationId, id } });
  }

  async updateOnRepeatedFailure(
    id: string,
    data: { failureCount: number; lastFailureAt: Date },
    manager: EntityManager,
  ): Promise<void> {
    await this.scope(manager).update({ id }, data);
  }

  async acknowledge(id: string, actorId: string, manager?: EntityManager): Promise<void> {
    await this.scope(manager).update(
      { id },
      { status: INCIDENT_STATUSES.ACKNOWLEDGED, acknowledgedAt: new Date(), acknowledgedBy: actorId },
    );
  }

  async resolve(
    id: string,
    data: { resolvedAt: Date; resolvedBy: string | null; durationSeconds: number },
    manager: EntityManager,
  ): Promise<void> {
    await this.scope(manager).update({ id }, { ...data, status: INCIDENT_STATUSES.RESOLVED });
  }

  async markFlapping(id: string, manager: EntityManager): Promise<void> {
    await this.scope(manager).update({ id }, { isFlapping: true });
  }

  async countOpenedSince(organizationId: string, monitorId: string, since: Date, manager: EntityManager): Promise<number> {
    return this.scope(manager).count({
      where: { organizationId, monitorId, startedAt: MoreThanOrEqual(since) },
    });
  }

  async listByOrganization(organizationId: string, filters: ListFilters, page: CursorPage): Promise<Incident[]> {
    const qb = this.repository
      .createQueryBuilder('incident')
      .where('incident.organization_id = :organizationId', { organizationId })
      .orderBy('incident.started_at', 'DESC')
      .addOrderBy('incident.id', 'DESC')
      .take(page.limit);

    if (filters.projectId) {
      qb.andWhere('incident.project_id = :projectId', { projectId: filters.projectId });
    }
    if (filters.monitorId) {
      qb.andWhere('incident.monitor_id = :monitorId', { monitorId: filters.monitorId });
    }
    if (filters.status) {
      qb.andWhere('incident.status = :status', { status: filters.status });
    }
    if (page.cursor) {
      qb.andWhere('(incident.started_at, incident.id) < (:startedAt, :id)', {
        startedAt: page.cursor.startedAt,
        id: page.cursor.id,
      });
    }

    return qb.getMany();
  }

  async deleteOlderThan(cutoff: Date): Promise<number> {
    const result = await this.repository.delete({ startedAt: LessThan(cutoff) });
    return result.affected ?? 0;
  }
}
