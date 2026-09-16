import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES, monitorCheckJobId } from './queue.constants';
import type { MonitorCheckJobPayload } from './monitor-check-job.payload';

@Injectable()
export class MonitorCheckQueueProducer {
  constructor(
    @InjectQueue(QUEUE_NAMES.MONITOR_CHECK) private readonly queue: Queue<MonitorCheckJobPayload>,
  ) {}

  /**
   * Uses BullMQ's job scheduler API (not the deprecated `add({ repeat })` +
   * `jobId` pairing) because job schedulers carry their id (`key`) back on
   * every read — `getRepeatableJobs()` does not reliably expose the id used
   * at creation in this BullMQ version, which made removal and reconciliation
   * silently no-op. Upserting with the same scheduler id replaces the
   * previous repeat config rather than duplicating — this is what makes an
   * interval change idempotent.
   */
  async register(monitorId: string, organizationId: string, intervalSeconds: number): Promise<void> {
    const schedulerId = monitorCheckJobId(monitorId);

    await this.queue.upsertJobScheduler(
      schedulerId,
      { every: intervalSeconds * 1000 },
      {
        data: {
          monitorId,
          organizationId,
          scheduledAt: new Date().toISOString(),
          correlationId: crypto.randomUUID(),
        },
        opts: {
          removeOnComplete: { count: 100 },
          removeOnFail: { count: 100 },
          attempts: 2,
          backoff: { type: 'exponential', delay: 5000 },
        },
      },
    );
  }

  async remove(monitorId: string): Promise<void> {
    await this.queue.removeJobScheduler(monitorCheckJobId(monitorId));
  }

  async listRegisteredMonitorIds(): Promise<Set<string>> {
    const schedulers = await this.queue.getJobSchedulers();
    const monitorIds = schedulers
      .map((scheduler) => scheduler.key)
      .filter((key) => key.startsWith('monitor:'))
      .map((key) => key.replace('monitor:', ''));
    return new Set(monitorIds);
  }
}
