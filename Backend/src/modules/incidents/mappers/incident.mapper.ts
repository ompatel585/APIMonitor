import { Incident } from '../entities/incident.entity';
import { IncidentEvent } from '../entities/incident-event.entity';
import { IncidentResponseDto } from '../dto/responses/incident.response.dto';
import { IncidentEventResponseDto } from '../dto/responses/incident-event.response.dto';

export function toIncidentResponseDto(incident: Incident): IncidentResponseDto {
  return {
    id: incident.id,
    organizationId: incident.organizationId,
    projectId: incident.projectId,
    monitorId: incident.monitorId,
    status: incident.status,
    cause: incident.cause,
    severity: incident.severity,
    startedAt: incident.startedAt.toISOString(),
    acknowledgedAt: incident.acknowledgedAt ? incident.acknowledgedAt.toISOString() : null,
    acknowledgedBy: incident.acknowledgedBy,
    resolvedAt: incident.resolvedAt ? incident.resolvedAt.toISOString() : null,
    resolvedBy: incident.resolvedBy,
    durationSeconds: incident.durationSeconds,
    failureCount: incident.failureCount,
    isFlapping: incident.isFlapping,
  };
}

export function toIncidentEventResponseDto(event: IncidentEvent): IncidentEventResponseDto {
  return {
    id: event.id,
    type: event.type,
    message: event.message,
    actorId: event.actorId,
    metadata: event.metadata,
    createdAt: event.createdAt.toISOString(),
  };
}
