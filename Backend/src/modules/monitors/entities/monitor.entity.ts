import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '@infrastructure/database/base.entity';
import { Organization } from '@modules/organizations/entities/organization.entity';
import { Project } from '@modules/projects/entities/project.entity';
import {
  DEFAULT_CONSECUTIVE_FAILURE_THRESHOLD,
  DEFAULT_CONSECUTIVE_SUCCESS_THRESHOLD,
  DEFAULT_DEGRADED_THRESHOLD_MS,
  DEFAULT_TIMEOUT_MS,
} from '../constants/monitor-defaults';

export const MONITOR_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'] as const;
export type MonitorMethod = (typeof MONITOR_METHODS)[number];

export const MONITOR_STATUSES = ['PENDING', 'UP', 'DEGRADED', 'DOWN', 'PAUSED'] as const;
export type MonitorStatus = (typeof MONITOR_STATUSES)[number];

@Entity('monitors')
@Index(['organizationId'])
@Index(['projectId'])
export class Monitor extends BaseEntity {
  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId!: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization!: Organization;

  @Column({ type: 'uuid', name: 'project_id' })
  projectId!: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project!: Project;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'varchar' })
  url!: string;

  @Column({ type: 'varchar', enum: MONITOR_METHODS, default: 'GET' })
  method!: MonitorMethod;

  @Column({ type: 'jsonb', nullable: true })
  headers!: Record<string, string> | null;

  @Column({ type: 'text', nullable: true })
  body!: string | null;

  @Column({ type: 'int', name: 'interval_seconds' })
  intervalSeconds!: number;

  @Column({ type: 'int', name: 'timeout_ms', default: DEFAULT_TIMEOUT_MS })
  timeoutMs!: number;

  @Column({ type: 'jsonb', name: 'expected_status_codes', default: () => "'[200]'" })
  expectedStatusCodes!: number[];

  @Column({ type: 'boolean', name: 'follow_redirects', default: true })
  followRedirects!: boolean;

  @Column({ type: 'int', name: 'degraded_threshold_ms', default: DEFAULT_DEGRADED_THRESHOLD_MS })
  degradedThresholdMs!: number;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive!: boolean;

  @Column({
    type: 'int',
    name: 'consecutive_failure_threshold',
    default: DEFAULT_CONSECUTIVE_FAILURE_THRESHOLD,
  })
  consecutiveFailureThreshold!: number;

  @Column({
    type: 'int',
    name: 'consecutive_success_threshold',
    default: DEFAULT_CONSECUTIVE_SUCCESS_THRESHOLD,
  })
  consecutiveSuccessThreshold!: number;

  @Column({ type: 'varchar', enum: MONITOR_STATUSES, default: 'PENDING' })
  status!: MonitorStatus;

  @Column({ type: 'timestamptz', name: 'last_check_at', nullable: true })
  lastCheckAt!: Date | null;

  @Column({ type: 'int', name: 'last_latency_ms', nullable: true })
  lastLatencyMs!: number | null;
}
