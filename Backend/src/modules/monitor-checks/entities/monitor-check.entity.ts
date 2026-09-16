import { BeforeInsert, Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { uuidV7 } from '@infrastructure/database/uuid-v7.util';
import { Organization } from '@modules/organizations/entities/organization.entity';
import { Monitor } from '@modules/monitors/entities/monitor.entity';

/**
 * High-volume, append-only, time-series shaped. No `updatedAt`, no soft
 * delete — a check result is immutable once recorded. Does not extend the
 * shared `BaseEntity` because that class hard-codes `updatedAt`, which this
 * table must never have (root CLAUDE.md §7).
 */
@Entity('monitor_checks')
@Index(['organizationId', 'monitorId', 'checkedAt'])
export class MonitorCheck {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId!: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization!: Organization;

  @Column({ type: 'uuid', name: 'monitor_id' })
  monitorId!: string;

  @ManyToOne(() => Monitor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'monitor_id' })
  monitor!: Monitor;

  @Column({ type: 'boolean' })
  succeeded!: boolean;

  @Column({ type: 'int', name: 'status_code', nullable: true })
  statusCode!: number | null;

  @Column({ type: 'int', name: 'latency_ms' })
  latencyMs!: number;

  @Column({ type: 'varchar', length: 500, name: 'error_message', nullable: true })
  errorMessage!: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'checked_at' })
  checkedAt!: Date;

  @BeforeInsert()
  assignId(): void {
    if (!this.id) {
      this.id = uuidV7();
    }
  }
}
