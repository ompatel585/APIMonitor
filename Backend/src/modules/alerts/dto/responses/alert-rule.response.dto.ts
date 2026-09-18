import { ApiProperty } from '@nestjs/swagger';
import { ALERT_SCOPES, type AlertScope } from '../../constants/alert-scope';
import { ALERT_TRIGGERS, type AlertTrigger } from '../../constants/alert-trigger';
import type { AlertRuleConditions, AlertRuleEscalation } from '../../entities/alert-rule.entity';

export class AlertRuleResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  organizationId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: Object.values(ALERT_SCOPES) })
  scope!: AlertScope;

  @ApiProperty({ nullable: true, type: String })
  scopeId!: string | null;

  @ApiProperty({ enum: Object.values(ALERT_TRIGGERS) })
  trigger!: AlertTrigger;

  @ApiProperty({ type: 'object', additionalProperties: true })
  conditions!: AlertRuleConditions;

  @ApiProperty({ type: [String] })
  channelIds!: string[];

  @ApiProperty()
  throttleSeconds!: number;

  @ApiProperty({ type: 'object', additionalProperties: true, nullable: true })
  escalation!: AlertRuleEscalation | null;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ nullable: true, type: String })
  lastFiredAt!: string | null;

  @ApiProperty()
  createdAt!: string;
}
