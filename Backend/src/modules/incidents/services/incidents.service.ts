import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EntityManager, QueryFailedError } from 'typeorm';
import { TransactionService } from '@infrastructure/database/transaction.service';
import { LockService } from '@infrastructure/redis/lock.service';
import { NotFoundDomainException } from '@common/exceptions/not-found.exception';
import { ConflictDomainException } from '@common/exceptions/conflict.exception';
import type { MonitorCheckCompletedEvent } from '@modules/monitor-checks/events/monitor-check-completed.event';
import { IncidentsRepository } from '../repositories/incidents.repository';
import { IncidentEventsRepository } from '../repositories/incident-events.repository';
import { Incident } from '../entities/incident.entity';
import { IncidentEvent } from '../entities/incident-event.entity';
import { INCIDENT_EVENT_TYPES, INCIDENT_SEVERITIES } from '../constants/incident-status';
import type { IncidentCause } from '../constants/incident-cause';
import { INCIDENT_CREATED_EVENT, IncidentCreatedEvent } from '../events/incident-created.event';
import { INCIDENT_RESOLVED_EVENT, IncidentResolvedEvent } from '../events/incident-resolved.event';
import { INCIDENT_ACKNOWLEDGED_EVENT, IncidentAcknowledgedEvent } from '../events/incident-acknowledged.event';

const LOCK_TTL_SECONDS = 10;
const FAILURE_OBSERVED_THROTTLE_MS = 5 * 60_000;
const FLAP_WINDOW_MS = 60 * 60_000;
const FLAP_THRESHOLD = 3;

function lockKey(monitorId: string): string {
  return `monitor:${monitorId}:incident`;
}

function encodeCursor(startedAt: Date, id: string): string {
  return Buffer.from(JSON.stringify({ startedAt: startedAt.toISOString(), id }), 'utf-8').toString('base64url');
}

function decodeCursor(cursor: string | undefined): { startedAt: Date; id: string } | undefined {
  if (!cursor) {
    return undefined;
  }
  try {
    const decoded: unknown = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf-8'));
    if (
      typeof decoded === 'object' &&
      decoded !== null &&
      'startedAt' in decoded &&
      'id' in decoded &&
      typeof (decoded as { startedAt: unknown }).startedAt === 'string' &&
      typeof (decoded as { id: unknown }).id === 'string'
    ) {
      return { startedAt: new Date((decoded as { startedAt: string }).startedAt), id: (decoded as { id: string }).id };
    }
  } catch {
    // fall through to undefined — an invalid cursor is treated as no cursor
  }
  return undefined;
}

function severityFor(cause: IncidentCause): (typeof INCIDENT_SEVERITIES)[keyof typeof INCIDENT_SEVERITIES] {
  return cause === 'CONNECTION_ERROR' || cause === 'TIMEOUT' ? INCIDENT_SEVERITIES.CRITICAL : INCIDENT_SEVERITIES.MAJOR;
}

@Injectable()
export class IncidentsService {
  private readonly logger = new Logger(IncidentsService.name);

  constructor(
    private readonly incidentsRepository: IncidentsRepository,
    private readonly incidentEventsRepository: IncidentEventsRepository,
    private readonly transactionService: TransactionService,
    private readonly lockService: LockService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Reacts to a status transition `monitors` has already confirmed — this
   * module never re-implements the consecutive-threshold logic, it only
   * decides what an OPEN/repeated-failure/recovery transition means for the
   * incident lifecycle. See incidents/CLAUDE.md §4-5.
   */
  async handleCheckCompleted(event: MonitorCheckCompletedEvent): Promise<void> {
    const wentDown = event.nextStatus === 'DOWN';
    const wasDown = event.previousStatus === 'DOWN';

    if (wentDown) {
      await this.openOrUpdate(event);
      return;
    }

    if (wasDown && !wentDown) {
      await this.resolveIfOpen(event);
    }
  }

  private async openOrUpdate(event: MonitorCheckCompletedEvent): Promise<void> {
    const cause = event.cause ?? 'CONNECTION_ERROR';
    const lock = await this.lockService.acquire(lockKey(event.monitorId), LOCK_TTL_SECONDS);

    try {
      const created = await this.tryOpen(event, cause);

      if (created) {
        this.eventEmitter.emit(
          INCIDENT_CREATED_EVENT,
          new IncidentCreatedEvent(
            created.id,
            event.organizationId,
            event.projectId,
            event.monitorId,
            cause,
            created.isFlapping,
          ),
        );
        return;
      }

      // Either an incident was already open, or a concurrent worker won the
      // race and opened it first. Both mean the same thing: this failure is a
      // repeat, recorded in its own transaction — the create attempt's
      // transaction is already rolled back and unusable (Postgres aborts a
      // transaction wholesale on a constraint violation).
      await this.updateExisting(event);
    } finally {
      if (lock) {
        await this.lockService.release(lock);
      }
    }
  }

  /**
   * Returns the newly created incident, or null when one was already open —
   * including the case where a concurrent worker won the unique-index race.
   */
  private async tryOpen(event: MonitorCheckCompletedEvent, cause: IncidentCause): Promise<Incident | null> {
    try {
      return await this.transactionService.runInTransaction(async (manager) => {
        const existing = await this.incidentsRepository.findOpenByMonitorId(event.organizationId, event.monitorId, manager);
        if (existing) {
          return null;
        }

        const now = new Date();
        const incident = await this.incidentsRepository.createOpen(
          {
            organizationId: event.organizationId,
            projectId: event.projectId,
            monitorId: event.monitorId,
            cause,
            severity: severityFor(cause),
            startedAt: now,
            lastFailureAt: now,
          },
          manager,
        );

        await this.incidentEventsRepository.create(
          {
            incidentId: incident.id,
            type: INCIDENT_EVENT_TYPES.OPENED,
            message: `Incident opened: ${cause}`,
            actorId: null,
            metadata: { checkId: event.checkId, cause },
          },
          manager,
        );

        await this.applyFlapDetection(incident, manager);

        return incident;
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        // The partial unique index did its job — another worker opened this
        // incident between our check and our insert. That is the expected
        // outcome of a race, not an error (incidents/CLAUDE.md §1).
        return null;
      }
      throw error;
    }
  }

  private async updateExisting(event: MonitorCheckCompletedEvent): Promise<void> {
    await this.transactionService.runInTransaction(async (manager) => {
      const existing = await this.incidentsRepository.findOpenByMonitorId(event.organizationId, event.monitorId, manager);
      if (!existing) {
        throw new ConflictDomainException('Incident open/create race could not be resolved');
      }
      await this.recordRepeatedFailure(existing, event, manager);
    });
  }

  private async recordRepeatedFailure(
    existing: Incident,
    event: MonitorCheckCompletedEvent,
    manager: EntityManager,
  ): Promise<void> {
    const now = new Date();

    await this.incidentsRepository.updateOnRepeatedFailure(
      existing.id,
      { failureCount: existing.failureCount + 1, lastFailureAt: now },
      manager,
    );

    const lastObserved = await this.incidentEventsRepository.findLastByType(
      existing.id,
      INCIDENT_EVENT_TYPES.FAILURE_OBSERVED,
      manager,
    );

    const shouldThrottle = lastObserved && now.getTime() - lastObserved.createdAt.getTime() < FAILURE_OBSERVED_THROTTLE_MS;
    if (!shouldThrottle) {
      await this.incidentEventsRepository.create(
        {
          incidentId: existing.id,
          type: INCIDENT_EVENT_TYPES.FAILURE_OBSERVED,
          message: 'Monitor is still failing',
          actorId: null,
          metadata: { checkId: event.checkId },
        },
        manager,
      );
    }
  }

  private async applyFlapDetection(incident: Incident, manager: EntityManager): Promise<void> {
    const since = new Date(Date.now() - FLAP_WINDOW_MS);
    const recentCount = await this.incidentsRepository.countOpenedSince(
      incident.organizationId,
      incident.monitorId,
      since,
      manager,
    );

    if (recentCount >= FLAP_THRESHOLD) {
      await this.incidentsRepository.markFlapping(incident.id, manager);
      this.logger.warn(`Monitor ${incident.monitorId} is flapping (${recentCount} incidents in the last hour)`);
    }
  }

  private async resolveIfOpen(event: MonitorCheckCompletedEvent): Promise<void> {
    const outcome = await this.transactionService.runInTransaction(async (manager) => {
      const existing = await this.incidentsRepository.findOpenByMonitorId(event.organizationId, event.monitorId, manager);
      if (!existing) {
        return null;
      }

      const resolvedAt = new Date();
      const durationSeconds = Math.round((resolvedAt.getTime() - existing.startedAt.getTime()) / 1000);

      await this.incidentsRepository.resolve(existing.id, { resolvedAt, resolvedBy: null, durationSeconds }, manager);
      await this.incidentEventsRepository.create(
        {
          incidentId: existing.id,
          type: INCIDENT_EVENT_TYPES.AUTO_RESOLVED,
          message: 'Monitor recovered',
          actorId: null,
          metadata: { checkId: event.checkId },
        },
        manager,
      );

      return { incidentId: existing.id, durationSeconds };
    });

    if (outcome) {
      this.eventEmitter.emit(
        INCIDENT_RESOLVED_EVENT,
        new IncidentResolvedEvent(outcome.incidentId, event.organizationId, event.projectId, event.monitorId, outcome.durationSeconds, null),
      );
    }
  }

  async acknowledge(organizationId: string, id: string, actorId: string): Promise<Incident> {
    const incident = await this.incidentsRepository.findByIdOrThrow(organizationId, id);
    if (!incident) {
      throw new NotFoundDomainException('Incident');
    }
    if (incident.status === 'RESOLVED') {
      throw new ConflictDomainException('Cannot acknowledge a resolved incident');
    }

    await this.transactionService.runInTransaction(async (manager) => {
      await this.incidentsRepository.acknowledge(id, actorId, manager);
      await this.incidentEventsRepository.create(
        {
          incidentId: id,
          type: INCIDENT_EVENT_TYPES.ACKNOWLEDGED,
          message: null,
          actorId,
          metadata: null,
        },
        manager,
      );
    });

    this.eventEmitter.emit(
      INCIDENT_ACKNOWLEDGED_EVENT,
      new IncidentAcknowledgedEvent(id, organizationId, incident.projectId, incident.monitorId, actorId),
    );

    return this.findByIdOrThrow(organizationId, id);
  }

  async resolveManually(organizationId: string, id: string, actorId: string): Promise<Incident> {
    const incident = await this.incidentsRepository.findByIdOrThrow(organizationId, id);
    if (!incident) {
      throw new NotFoundDomainException('Incident');
    }
    if (incident.status === 'RESOLVED') {
      throw new ConflictDomainException('Incident is already resolved');
    }

    await this.transactionService.runInTransaction(async (manager) => {
      const resolvedAt = new Date();
      const durationSeconds = Math.round((resolvedAt.getTime() - incident.startedAt.getTime()) / 1000);

      await this.incidentsRepository.resolve(id, { resolvedAt, resolvedBy: actorId, durationSeconds }, manager);
      await this.incidentEventsRepository.create(
        {
          incidentId: id,
          type: INCIDENT_EVENT_TYPES.RESOLVED,
          message: null,
          actorId,
          metadata: null,
        },
        manager,
      );

      this.eventEmitter.emit(
        INCIDENT_RESOLVED_EVENT,
        new IncidentResolvedEvent(id, organizationId, incident.projectId, incident.monitorId, durationSeconds, actorId),
      );
    });

    return this.findByIdOrThrow(organizationId, id);
  }

  async findByIdOrThrow(organizationId: string, id: string): Promise<Incident> {
    const incident = await this.incidentsRepository.findByIdOrThrow(organizationId, id);
    if (!incident) {
      throw new NotFoundDomainException('Incident');
    }
    return incident;
  }

  async listTimeline(incidentId: string): Promise<IncidentEvent[]> {
    return this.incidentEventsRepository.listByIncident(incidentId);
  }

  async list(
    organizationId: string,
    filters: { projectId?: string; monitorId?: string; status?: Incident['status'] },
    page: { limit: number; cursor?: string },
  ): Promise<{ items: Incident[]; nextCursor: string | null }> {
    const decodedCursor = decodeCursor(page.cursor);
    const items = await this.incidentsRepository.listByOrganization(organizationId, filters, {
      limit: page.limit,
      cursor: decodedCursor,
    });

    const last = items[items.length - 1];
    const nextCursor = items.length === page.limit && last ? encodeCursor(last.startedAt, last.id) : null;

    return { items, nextCursor };
  }

  private isUniqueViolation(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) {
      return false;
    }
    const driverError = error.driverError as { code?: string } | undefined;
    return driverError?.code === '23505';
  }
}
