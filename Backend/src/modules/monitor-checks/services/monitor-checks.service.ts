import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TransactionService } from '@infrastructure/database/transaction.service';
import { MonitorsService } from '@modules/monitors/services/monitors.service';
import { evaluate, type CheckOutcome } from '@modules/monitors/services/monitor-status-evaluator';
import { NotFoundDomainException } from '@common/exceptions/not-found.exception';
import type { IncidentCause } from '@modules/incidents/constants/incident-cause';
import { MonitorChecksRepository } from '../repositories/monitor-checks.repository';
import { MonitorCheckCompletedEvent, MONITOR_CHECK_COMPLETED_EVENT } from '../events/monitor-check-completed.event';

const RECENT_RESULTS_WINDOW = 20;

export type RecordCheckInput = {
  organizationId: string;
  monitorId: string;
  succeeded: boolean;
  statusCode: number | null;
  latencyMs: number;
  errorMessage: string | null;
  cause: IncidentCause | null;
  correlationId: string;
};

@Injectable()
export class MonitorChecksService {
  constructor(
    private readonly monitorChecksRepository: MonitorChecksRepository,
    private readonly monitorsService: MonitorsService,
    private readonly transactionService: TransactionService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * The single write path for a completed check. Persists the check row,
   * evaluates the resulting status transition, and applies it — all in one
   * transaction, so a check is never durable without a consistent monitor
   * status alongside it. The domain event is only published after commit.
   */
  async record(input: RecordCheckInput): Promise<void> {
    const outcome = await this.transactionService.runInTransaction(async (manager) => {
      const monitor = await this.monitorsService.findByIdForUpdate(input.organizationId, input.monitorId, manager);
      if (!monitor) {
        throw new NotFoundDomainException('Monitor');
      }

      const check = await this.monitorChecksRepository.create(
        {
          organizationId: input.organizationId,
          monitorId: input.monitorId,
          succeeded: input.succeeded,
          statusCode: input.statusCode,
          latencyMs: input.latencyMs,
          errorMessage: input.errorMessage,
        },
        manager,
      );

      const previousStatus = monitor.status;
      const recentChecks = await this.monitorChecksRepository.listRecent(
        input.organizationId,
        input.monitorId,
        RECENT_RESULTS_WINDOW,
        manager,
      );
      const recentResults: CheckOutcome[] = recentChecks.map((check) => ({
        succeeded: check.succeeded,
        latencyMs: check.latencyMs,
      }));

      const nextStatus = evaluate(previousStatus, recentResults, {
        consecutiveFailureThreshold: monitor.consecutiveFailureThreshold,
        consecutiveSuccessThreshold: monitor.consecutiveSuccessThreshold,
        degradedThresholdMs: monitor.degradedThresholdMs,
      });

      await this.monitorsService.applyCheckResult(
        input.monitorId,
        { status: nextStatus, lastCheckAt: new Date(), lastLatencyMs: input.latencyMs },
        manager,
      );

      return { previousStatus, nextStatus, projectId: monitor.projectId, checkId: check.id };
    });

    this.eventEmitter.emit(
      MONITOR_CHECK_COMPLETED_EVENT,
      new MonitorCheckCompletedEvent(
        input.organizationId,
        outcome.projectId,
        input.monitorId,
        outcome.checkId,
        input.succeeded,
        input.cause,
        outcome.previousStatus,
        outcome.nextStatus,
        input.correlationId,
      ),
    );
  }
}
