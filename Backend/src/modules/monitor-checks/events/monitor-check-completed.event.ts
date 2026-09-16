import type { MonitorStatus } from '@modules/monitors/entities/monitor.entity';

export const MONITOR_CHECK_COMPLETED_EVENT = 'monitor.check_completed';

export class MonitorCheckCompletedEvent {
  constructor(
    public readonly organizationId: string,
    public readonly monitorId: string,
    public readonly succeeded: boolean,
    public readonly previousStatus: MonitorStatus,
    public readonly nextStatus: MonitorStatus,
    public readonly correlationId: string,
  ) {}
}
