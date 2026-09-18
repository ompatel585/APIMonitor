import { ApiProperty } from '@nestjs/swagger';
import { INCIDENT_EVENT_TYPES, type IncidentEventType } from '../../constants/incident-status';

export class IncidentEventResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: Object.values(INCIDENT_EVENT_TYPES) })
  type!: IncidentEventType;

  @ApiProperty({ nullable: true, type: String })
  message!: string | null;

  @ApiProperty({ nullable: true, type: String })
  actorId!: string | null;

  @ApiProperty({ type: 'object', nullable: true, additionalProperties: true })
  metadata!: Record<string, unknown> | null;

  @ApiProperty()
  createdAt!: string;
}
