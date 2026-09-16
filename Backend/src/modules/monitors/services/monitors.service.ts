import { Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { NotFoundDomainException } from '@common/exceptions/not-found.exception';
import { ValidationDomainException } from '@common/exceptions/validation.exception';
import { assertUrlAllowed, SsrfViolationError } from '@infrastructure/http/ssrf-guard';
import { ProjectsService } from '@modules/projects/services/projects.service';
import { MonitorsRepository } from '../repositories/monitors.repository';
import { MonitorScheduleService } from './monitor-schedule.service';
import { assertTimeoutFitsInterval } from '../validators/timeout-interval.validator';
import { DEFAULT_TIMEOUT_MS } from '../constants/monitor-defaults';
import { Monitor, type MonitorMethod, type MonitorStatus } from '../entities/monitor.entity';

type MonitorWriteFields = {
  name?: string;
  url?: string;
  method?: MonitorMethod;
  headers?: Record<string, string>;
  body?: string;
  intervalSeconds?: number;
  timeoutMs?: number;
  expectedStatusCodes?: number[];
  followRedirects?: boolean;
  degradedThresholdMs?: number;
  consecutiveFailureThreshold?: number;
  consecutiveSuccessThreshold?: number;
};

@Injectable()
export class MonitorsService {
  constructor(
    private readonly monitorsRepository: MonitorsRepository,
    private readonly projectsService: ProjectsService,
    private readonly monitorScheduleService: MonitorScheduleService,
  ) {}

  async create(
    organizationId: string,
    data: MonitorWriteFields & { projectId: string; name: string; url: string; intervalSeconds: number },
  ): Promise<Monitor> {
    await this.projectsService.findByIdOrThrow(organizationId, data.projectId);
    await this.assertUrlIsSafe(data.url);
    assertTimeoutFitsInterval(data.timeoutMs ?? DEFAULT_TIMEOUT_MS, data.intervalSeconds);

    const monitor = await this.monitorsRepository.create({
      organizationId,
      projectId: data.projectId,
      name: data.name,
      url: data.url,
      method: data.method,
      headers: data.headers ?? null,
      body: data.body ?? null,
      intervalSeconds: data.intervalSeconds,
      timeoutMs: data.timeoutMs,
      expectedStatusCodes: data.expectedStatusCodes,
      followRedirects: data.followRedirects,
      degradedThresholdMs: data.degradedThresholdMs,
      consecutiveFailureThreshold: data.consecutiveFailureThreshold,
      consecutiveSuccessThreshold: data.consecutiveSuccessThreshold,
    });

    await this.monitorScheduleService.registerJob(monitor.id, organizationId, monitor.intervalSeconds);
    return monitor;
  }

  async listByProject(organizationId: string, projectId: string): Promise<Monitor[]> {
    await this.projectsService.findByIdOrThrow(organizationId, projectId);
    return this.monitorsRepository.listByProject(organizationId, projectId);
  }

  async findByIdOrThrow(organizationId: string, id: string): Promise<Monitor> {
    const monitor = await this.monitorsRepository.findById(organizationId, id);
    if (!monitor) {
      throw new NotFoundDomainException('Monitor');
    }
    return monitor;
  }

  async update(organizationId: string, id: string, data: MonitorWriteFields): Promise<Monitor> {
    const existing = await this.findByIdOrThrow(organizationId, id);

    if (data.url) {
      await this.assertUrlIsSafe(data.url);
    }

    const nextTimeoutMs = data.timeoutMs ?? existing.timeoutMs;
    const nextIntervalSeconds = data.intervalSeconds ?? existing.intervalSeconds;
    assertTimeoutFitsInterval(nextTimeoutMs, nextIntervalSeconds);

    await this.monitorsRepository.update(organizationId, id, data);

    if (existing.isActive && data.intervalSeconds && data.intervalSeconds !== existing.intervalSeconds) {
      await this.monitorScheduleService.registerJob(id, organizationId, data.intervalSeconds);
    }

    return this.findByIdOrThrow(organizationId, id);
  }

  async pause(organizationId: string, id: string): Promise<Monitor> {
    await this.findByIdOrThrow(organizationId, id);
    await this.monitorsRepository.update(organizationId, id, { isActive: false });
    await this.monitorsRepository.updateStatusFields(id, {
      status: 'PAUSED',
      lastCheckAt: new Date(),
      lastLatencyMs: null,
    });
    await this.monitorScheduleService.removeJob(id);
    return this.findByIdOrThrow(organizationId, id);
  }

  async resume(organizationId: string, id: string): Promise<Monitor> {
    const monitor = await this.findByIdOrThrow(organizationId, id);
    await this.monitorsRepository.update(organizationId, id, { isActive: true });
    await this.monitorsRepository.updateStatusFields(id, {
      status: 'PENDING',
      lastCheckAt: new Date(),
      lastLatencyMs: null,
    });
    await this.monitorScheduleService.registerJob(id, organizationId, monitor.intervalSeconds);
    return this.findByIdOrThrow(organizationId, id);
  }

  async remove(organizationId: string, id: string): Promise<void> {
    await this.findByIdOrThrow(organizationId, id);
    await this.monitorScheduleService.removeJob(id);
    await this.monitorsRepository.remove(organizationId, id);
  }

  /**
   * Reads the monitor within the caller's transaction, then persists the
   * status transition the caller already computed. The caller (`MonitorChecksService`)
   * owns calling the pure `evaluate()` function — this method only applies
   * the result, so status-transition logic never leaks into two places.
   */
  async findByIdForUpdate(organizationId: string, id: string, manager: EntityManager): Promise<Monitor | null> {
    return this.monitorsRepository.findById(organizationId, id, manager);
  }

  async applyCheckResult(
    id: string,
    data: { status: MonitorStatus; lastCheckAt: Date; lastLatencyMs: number | null },
    manager: EntityManager,
  ): Promise<void> {
    await this.monitorsRepository.updateStatusFields(id, data, manager);
  }

  private async assertUrlIsSafe(url: string): Promise<void> {
    try {
      await assertUrlAllowed(url);
    } catch (error) {
      if (error instanceof SsrfViolationError) {
        throw new ValidationDomainException(error.message);
      }
      throw error;
    }
  }
}
