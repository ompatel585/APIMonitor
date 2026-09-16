import { Injectable } from '@nestjs/common';
import { NotFoundDomainException } from '@common/exceptions/not-found.exception';
import { ValidationDomainException } from '@common/exceptions/validation.exception';
import { assertUrlAllowed, SsrfViolationError } from '@infrastructure/http/ssrf-guard';
import { ProjectsService } from '@modules/projects/services/projects.service';
import { MonitorsRepository } from '../repositories/monitors.repository';
import { assertTimeoutFitsInterval } from '../validators/timeout-interval.validator';
import { DEFAULT_TIMEOUT_MS } from '../constants/monitor-defaults';
import { Monitor, type MonitorMethod } from '../entities/monitor.entity';

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
  ) {}

  async create(
    organizationId: string,
    data: MonitorWriteFields & { projectId: string; name: string; url: string; intervalSeconds: number },
  ): Promise<Monitor> {
    await this.projectsService.findByIdOrThrow(organizationId, data.projectId);
    await this.assertUrlIsSafe(data.url);
    assertTimeoutFitsInterval(data.timeoutMs ?? DEFAULT_TIMEOUT_MS, data.intervalSeconds);

    return this.monitorsRepository.create({
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
    return this.findByIdOrThrow(organizationId, id);
  }

  async resume(organizationId: string, id: string): Promise<Monitor> {
    await this.findByIdOrThrow(organizationId, id);
    await this.monitorsRepository.update(organizationId, id, { isActive: true });
    await this.monitorsRepository.updateStatusFields(id, {
      status: 'PENDING',
      lastCheckAt: new Date(),
      lastLatencyMs: null,
    });
    return this.findByIdOrThrow(organizationId, id);
  }

  async remove(organizationId: string, id: string): Promise<void> {
    await this.findByIdOrThrow(organizationId, id);
    await this.monitorsRepository.remove(organizationId, id);
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
