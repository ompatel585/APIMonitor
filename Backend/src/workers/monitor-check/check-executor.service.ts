import { Injectable, Logger } from '@nestjs/common';
import { SafeHttpClient } from '@infrastructure/http/safe-http.client';
import { NotFoundDomainException } from '@common/exceptions/not-found.exception';
import { MonitorsService } from '@modules/monitors/services/monitors.service';
import { MonitorChecksService } from '@modules/monitor-checks/services/monitor-checks.service';
import { evaluateFailure, evaluateResponse } from './check-result-evaluator';
import type { MonitorCheckJobPayload } from '@infrastructure/queue/monitor-check-job.payload';

@Injectable()
export class CheckExecutorService {
  private readonly logger = new Logger(CheckExecutorService.name);

  constructor(
    private readonly monitorsService: MonitorsService,
    private readonly monitorChecksService: MonitorChecksService,
    private readonly safeHttpClient: SafeHttpClient,
  ) {}

  /**
   * Executes one scheduled check. A monitor check that *fails* (bad status
   * code, timeout, connection error) is still a successful job — it produced
   * a recorded result. Only an unexpected infrastructure error propagates and
   * fails the job, per workers/CLAUDE.md §6. A monitor deleted after the job
   * was enqueued is a poison message: it completes with a reason instead of
   * retrying to exhaustion.
   */
  async execute(payload: MonitorCheckJobPayload): Promise<void> {
    const monitor = await this.monitorsService
      .findByIdOrThrow(payload.organizationId, payload.monitorId)
      .catch((error: unknown) => {
        if (error instanceof NotFoundDomainException) {
          return null;
        }
        throw error;
      });

    if (!monitor) {
      this.logger.log(`Skipping check for deleted monitor ${payload.monitorId}`);
      return;
    }

    if (!monitor.isActive) {
      this.logger.log(`Skipping check for paused monitor ${monitor.id}`);
      return;
    }

    const startedAt = Date.now();
    let result;

    try {
      const response = await this.safeHttpClient.request(monitor.url, {
        method: monitor.method,
        headers: monitor.headers ?? undefined,
        body: monitor.body ?? undefined,
        timeoutMs: monitor.timeoutMs,
      });
      result = evaluateResponse(response, monitor.expectedStatusCodes);
    } catch (error) {
      result = evaluateFailure(error, Date.now() - startedAt);
    }

    await this.monitorChecksService.record({
      organizationId: payload.organizationId,
      monitorId: payload.monitorId,
      succeeded: result.succeeded,
      statusCode: result.statusCode,
      latencyMs: result.latencyMs,
      errorMessage: result.errorMessage,
      correlationId: payload.correlationId,
    });
  }
}
