import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@infrastructure/database/base.entity';
import { ALERT_TRIGGERS, type AlertTrigger } from '../constants/alert-trigger';

/**
 * The record of what `alerts` decided for one rule/channel pair on one
 * triggering incident — "whether and whom", per alerts/CLAUDE.md §1. One row
 * per (ruleId, incidentId, channelId) that was not deduped/throttled/
 * suppressed. `notifications` reads this by id via the job payload; it never
 * receives a rendered message body here (alerts/CLAUDE.md §7).
 */
@Entity('alerts')
@Index(['organizationId', 'createdAt'])
@Index(['incidentId'])
export class Alert extends BaseEntity {
  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId!: string;

  @Column({ type: 'uuid', name: 'alert_rule_id' })
  alertRuleId!: string;

  @Column({ type: 'uuid', name: 'incident_id', nullable: true })
  incidentId!: string | null;

  @Column({ type: 'uuid', name: 'monitor_id' })
  monitorId!: string;

  @Column({ type: 'varchar', enum: Object.values(ALERT_TRIGGERS) })
  trigger!: AlertTrigger;

  @Column({ type: 'varchar', name: 'summary' })
  summary!: string;

  @Column({ type: 'jsonb', name: 'channel_ids' })
  channelIds!: string[];
}
