export const INCIDENT_RESOLVED_EVENT = 'incident.resolved';

export class IncidentResolvedEvent {
  constructor(
    public readonly incidentId: string,
    public readonly organizationId: string,
    public readonly projectId: string,
    public readonly monitorId: string,
    public readonly durationSeconds: number,
    public readonly resolvedBy: string | null,
  ) {}
}
