import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@infrastructure/database/base.entity';
import { ALERT_SCOPES, type AlertScope } from '../constants/alert-scope';
import { ALERT_TRIGGERS, type AlertTrigger } from '../constants/alert-trigger';

export type AlertRuleConditions = {
  /** Minimum incident severity that matches, inclusive (MINOR < MAJOR < CRITICAL). */
  minSeverity?: 'MINOR' | 'MAJOR' | 'CRITICAL';
  /** Restrict to specific incident causes; unset matches every cause. */
  causes?: string[];
  /** Minimum incident duration, in seconds, before this rule matches (e.g. for escalation-style rules). */
  minDurationSeconds?: number;
};

export type AlertRuleEscalation = {
  afterMinutesUnacknowledged: number;
  channelIds: string[];
};

/**
 * `scopeId` is null for ORGANIZATION scope, a `projectId` for PROJECT scope,
 * a `monitorId` for MONITOR scope. Resolution order is most-specific-first —
 * see `constants/alert-scope.ts` and alerts/CLAUDE.md §2.
 */
@Entity('alert_rules')
@Index(['organizationId'])
@Index(['organizationId', 'scope', 'scopeId'])
export class AlertRule extends BaseEntity {
  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'varchar', enum: Object.values(ALERT_SCOPES) })
  scope!: AlertScope;

  @Column({ type: 'uuid', name: 'scope_id', nullable: true })
  scopeId!: string | null;

  @Column({ type: 'varchar', enum: Object.values(ALERT_TRIGGERS) })
  trigger!: AlertTrigger;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  conditions!: AlertRuleConditions;

  @Column({ type: 'jsonb', name: 'channel_ids', default: () => "'[]'" })
  channelIds!: string[];

  @Column({ type: 'int', name: 'throttle_seconds', default: 300 })
  throttleSeconds!: number;

  @Column({ type: 'jsonb', nullable: true })
  escalation!: AlertRuleEscalation | null;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ type: 'timestamptz', name: 'last_fired_at', nullable: true })
  lastFiredAt!: Date | null;
}
