import type { IncidentCause } from '../constants/incident-cause';

export const INCIDENT_CREATED_EVENT = 'incident.created';

export class IncidentCreatedEvent {
  constructor(
    public readonly incidentId: string,
    public readonly organizationId: string,
    public readonly projectId: string,
    public readonly monitorId: string,
    public readonly cause: IncidentCause,
    /**
     * Carried so `alerts` can apply flap suppression (alerts/CLAUDE.md §4)
     * without importing `incidents`' repository — the event is the only
     * sanctioned integration point. False on the initial open; a later flap
     * detection on the same incident does not re-emit `incident.created`, so
     * `alerts` also re-checks via `IncidentsService` where it already holds
     * an incident id (see AlertsService).
     */
    public readonly isFlapping: boolean,
  ) {}
}
