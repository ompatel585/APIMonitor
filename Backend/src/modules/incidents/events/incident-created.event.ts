import type { IncidentCause } from '../constants/incident-cause';

export const INCIDENT_CREATED_EVENT = 'incident.created';

export class IncidentCreatedEvent {
  constructor(
    public readonly incidentId: string,
    public readonly organizationId: string,
    public readonly projectId: string,
    public readonly monitorId: string,
    public readonly cause: IncidentCause,
  ) {}
}
