import { ApiProperty } from '@nestjs/swagger';
import { MONITOR_METHODS, MONITOR_STATUSES, type MonitorMethod, type MonitorStatus } from '../../entities/monitor.entity';

export class MonitorResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  organizationId!: string;

  @ApiProperty()
  projectId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  url!: string;

  @ApiProperty({ enum: MONITOR_METHODS })
  method!: MonitorMethod;

  @ApiProperty({ type: 'object', nullable: true, additionalProperties: { type: 'string' } })
  headers!: Record<string, string> | null;

  @ApiProperty({ nullable: true, type: String })
  body!: string | null;

  @ApiProperty()
  intervalSeconds!: number;

  @ApiProperty()
  timeoutMs!: number;

  @ApiProperty({ type: [Number] })
  expectedStatusCodes!: number[];

  @ApiProperty()
  followRedirects!: boolean;

  @ApiProperty()
  degradedThresholdMs!: number;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  consecutiveFailureThreshold!: number;

  @ApiProperty()
  consecutiveSuccessThreshold!: number;

  @ApiProperty({ enum: MONITOR_STATUSES })
  status!: MonitorStatus;

  @ApiProperty({ nullable: true, type: String })
  lastCheckAt!: string | null;

  @ApiProperty({ nullable: true, type: Number })
  lastLatencyMs!: number | null;

  @ApiProperty()
  createdAt!: string;
}
