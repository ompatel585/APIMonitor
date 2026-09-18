export const INCIDENT_ACKNOWLEDGED_EVENT = 'incident.acknowledged';

export class IncidentAcknowledgedEvent {
  constructor(
    public readonly incidentId: string,
    public readonly organizationId: string,
    public readonly projectId: string,
    public readonly monitorId: string,
    public readonly acknowledgedBy: string,
  ) {}
}
