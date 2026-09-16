import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { QUEUE_NAMES } from '@infrastructure/queue/queue.constants';
import type { MonitorCheckJobPayload } from '@infrastructure/queue/monitor-check-job.payload';
import { CheckExecutorService } from './check-executor.service';

@Processor(QUEUE_NAMES.MONITOR_CHECK)
export class MonitorCheckProcessor extends WorkerHost {
  private readonly logger = new Logger(MonitorCheckProcessor.name);

  constructor(private readonly checkExecutorService: CheckExecutorService) {
    super();
  }

  async process(job: Job<MonitorCheckJobPayload>): Promise<void> {
    const startedAt = Date.now();
    const { monitorId, organizationId, correlationId } = job.data;

    this.logger.log({
      msg: 'monitor-check started',
      jobId: job.id,
      attempt: job.attemptsMade + 1,
      correlationId,
      organizationId,
      monitorId,
    });

    try {
      await this.checkExecutorService.execute(job.data);
      this.logger.log({
        msg: 'monitor-check finished',
        jobId: job.id,
        correlationId,
        organizationId,
        monitorId,
        durationMs: Date.now() - startedAt,
        outcome: 'completed',
      });
    } catch (error) {
      this.logger.error({
        msg: 'monitor-check failed',
        jobId: job.id,
        correlationId,
        organizationId,
        monitorId,
        durationMs: Date.now() - startedAt,
        outcome: 'failed',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
