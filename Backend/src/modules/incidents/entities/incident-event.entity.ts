import { BeforeInsert, Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { uuidV7 } from '@infrastructure/database/uuid-v7.util';
import { INCIDENT_EVENT_TYPES, type IncidentEventType } from '../constants/incident-status';
import { Incident } from './incident.entity';

/**
 * Append-only timeline. Immutable — a correction is a new entry, never an
 * update. Does not extend `BaseEntity` for the same reason `MonitorCheck`
 * doesn't: no `updatedAt` on a row that must never change.
 */
@Entity('incident_events')
@Index(['incidentId', 'createdAt'])
export class IncidentEvent {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'incident_id' })
  incidentId!: string;

  @ManyToOne(() => Incident, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'incident_id' })
  incident!: Incident;

  @Column({ type: 'varchar', enum: Object.values(INCIDENT_EVENT_TYPES) })
  type!: IncidentEventType;

  @Column({ type: 'varchar', length: 500, nullable: true })
  message!: string | null;

  @Column({ type: 'uuid', name: 'actor_id', nullable: true })
  actorId!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @BeforeInsert()
  assignId(): void {
    if (!this.id) {
      this.id = uuidV7();
    }
  }
}
