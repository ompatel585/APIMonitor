import { Injectable, Logger } from '@nestjs/common';
import { MonitorCheckQueueProducer } from '@infrastructure/queue/monitor-check-queue.producer';
import { MonitorsRepository } from '../repositories/monitors.repository';

/**
 * Keeps BullMQ's repeatable monitor-check jobs in sync with monitor state.
 * Called by `MonitorsService` on every write that affects whether or how
 * often a monitor should be checked — never called directly by a controller.
 */
@Injectable()
export class MonitorScheduleService {
  private readonly logger = new Logger(MonitorScheduleService.name);

  constructor(
    private readonly queueProducer: MonitorCheckQueueProducer,
    private readonly monitorsRepository: MonitorsRepository,
  ) {}

  async registerJob(monitorId: string, organizationId: string, intervalSeconds: number): Promise<void> {
    await this.queueProducer.register(monitorId, organizationId, intervalSeconds);
  }

  async removeJob(monitorId: string): Promise<void> {
    await this.queueProducer.remove(monitorId);
  }

  /**
   * Rebuilds every active monitor's repeatable job from the database. Run
   * once at scheduler startup so a restart (or a manual Redis flush) never
   * leaves an active monitor unscheduled, and re-registering an
   * already-correct repeatable job is a no-op duplicate-free upsert because
   * job ids are deterministic.
   */
  async reconcileAll(): Promise<void> {
    const activeMonitors = await this.monitorsRepository.listAllActive();
    for (const monitor of activeMonitors) {
      await this.registerJob(monitor.id, monitor.organizationId, monitor.intervalSeconds);
    }

    const registeredIds = await this.queueProducer.listRegisteredMonitorIds();
    const activeIds = new Set(activeMonitors.map((monitor) => monitor.id));
    const staleIds = [...registeredIds].filter((id) => !activeIds.has(id));
    for (const staleId of staleIds) {
      await this.removeJob(staleId);
    }

    this.logger.log(`Reconciled schedule: ${activeMonitors.length} active, ${staleIds.length} stale jobs removed`);
  }
}
