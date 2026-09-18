import type { MonitorStatus } from '@modules/monitors/entities/monitor.entity';
import type { IncidentCause } from '@modules/incidents/constants/incident-cause';

export const MONITOR_CHECK_COMPLETED_EVENT = 'monitor.check_completed';

export class MonitorCheckCompletedEvent {
  constructor(
    public readonly organizationId: string,
    public readonly projectId: string,
    public readonly monitorId: string,
    public readonly checkId: string,
    public readonly succeeded: boolean,
    public readonly cause: IncidentCause | null,
    public readonly previousStatus: MonitorStatus,
    public readonly nextStatus: MonitorStatus,
    public readonly correlationId: string,
  ) {}
}
