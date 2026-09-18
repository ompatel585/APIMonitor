import { BeforeInsert, Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';
import { uuidV7 } from '@infrastructure/database/uuid-v7.util';
import { DELIVERY_STATUSES, type DeliveryStatus } from '../constants/delivery-status';

/**
 * Append-only delivery receipt, one row per attempted delivery (a retried job
 * writes another row, not an update — the history of attempts is the point).
 * No `organizationId` column and no `updatedAt`, matching the precedent set
 * by `IncidentEvent`: this table reaches its tenant only through `alertId` /
 * `channelId`, and a delivery record is immutable once written.
 */
@Entity('delivery_records')
@Index(['channelId', 'createdAt'])
@Index(['alertId'])
export class DeliveryRecord {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'alert_id' })
  alertId!: string;

  @Column({ type: 'uuid', name: 'channel_id' })
  channelId!: string;

  @Column({ type: 'varchar' })
  status!: DeliveryStatus;

  @Column({ type: 'int', name: 'attempt' })
  attempt!: number;

  @Column({ type: 'varchar', length: 500, name: 'failure_reason', nullable: true })
  failureReason!: string | null;

  @Column({ type: 'varchar', name: 'correlation_id' })
  correlationId!: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @BeforeInsert()
  assignId(): void {
    if (!this.id) {
      this.id = uuidV7();
    }
  }
}
