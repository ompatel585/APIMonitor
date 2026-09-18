import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '@infrastructure/database/base.entity';
import { Organization } from '@modules/organizations/entities/organization.entity';
import { Project } from '@modules/projects/entities/project.entity';
import { Monitor } from '@modules/monitors/entities/monitor.entity';
import { INCIDENT_CAUSES, type IncidentCause } from '../constants/incident-cause';
import { INCIDENT_SEVERITIES, INCIDENT_STATUSES, type IncidentSeverity, type IncidentStatus } from '../constants/incident-status';

/**
 * At most one row per monitor may have `resolvedAt IS NULL` — enforced by a
 * partial unique index added by hand in the migration (TypeORM's `@Index`
 * cannot express a WHERE clause). Never rely on an application-level check
 * alone; see incidents/CLAUDE.md §1.
 */
@Entity('incidents')
@Index(['organizationId', 'startedAt'])
@Index(['projectId', 'startedAt'])
export class Incident extends BaseEntity {
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

  @Column({ type: 'uuid', name: 'monitor_id' })
  monitorId!: string;

  @ManyToOne(() => Monitor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'monitor_id' })
  monitor!: Monitor;

  @Column({ type: 'varchar', enum: Object.values(INCIDENT_STATUSES), default: INCIDENT_STATUSES.OPEN })
  status!: IncidentStatus;

  @Column({ type: 'varchar', enum: Object.values(INCIDENT_CAUSES) })
  cause!: IncidentCause;

  @Column({ type: 'varchar', enum: Object.values(INCIDENT_SEVERITIES), default: INCIDENT_SEVERITIES.MAJOR })
  severity!: IncidentSeverity;

  @Column({ type: 'timestamptz', name: 'started_at' })
  startedAt!: Date;

  @Column({ type: 'timestamptz', name: 'acknowledged_at', nullable: true })
  acknowledgedAt!: Date | null;

  @Column({ type: 'uuid', name: 'acknowledged_by', nullable: true })
  acknowledgedBy!: string | null;

  @Column({ type: 'timestamptz', name: 'resolved_at', nullable: true })
  resolvedAt!: Date | null;

  @Column({ type: 'uuid', name: 'resolved_by', nullable: true })
  resolvedBy!: string | null;

  @Column({ type: 'int', name: 'duration_seconds', nullable: true })
  durationSeconds!: number | null;

  @Column({ type: 'int', name: 'failure_count', default: 1 })
  failureCount!: number;

  @Column({ type: 'boolean', name: 'is_flapping', default: false })
  isFlapping!: boolean;

  @Column({ type: 'timestamptz', name: 'last_failure_at' })
  lastFailureAt!: Date;
}
