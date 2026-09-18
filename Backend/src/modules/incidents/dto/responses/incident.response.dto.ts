import { ApiProperty } from '@nestjs/swagger';
import { INCIDENT_CAUSES, type IncidentCause } from '../../constants/incident-cause';
import { INCIDENT_SEVERITIES, INCIDENT_STATUSES, type IncidentSeverity, type IncidentStatus } from '../../constants/incident-status';

export class IncidentResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  organizationId!: string;

  @ApiProperty()
  projectId!: string;

  @ApiProperty()
  monitorId!: string;

  @ApiProperty({ enum: Object.values(INCIDENT_STATUSES) })
  status!: IncidentStatus;

  @ApiProperty({ enum: Object.values(INCIDENT_CAUSES) })
  cause!: IncidentCause;

  @ApiProperty({ enum: Object.values(INCIDENT_SEVERITIES) })
  severity!: IncidentSeverity;

  @ApiProperty()
  startedAt!: string;

  @ApiProperty({ nullable: true, type: String })
  acknowledgedAt!: string | null;

  @ApiProperty({ nullable: true, type: String })
  acknowledgedBy!: string | null;

  @ApiProperty({ nullable: true, type: String })
  resolvedAt!: string | null;

  @ApiProperty({ nullable: true, type: String })
  resolvedBy!: string | null;

  @ApiProperty({ nullable: true, type: Number })
  durationSeconds!: number | null;

  @ApiProperty()
  failureCount!: number;

  @ApiProperty()
  isFlapping!: boolean;
}
