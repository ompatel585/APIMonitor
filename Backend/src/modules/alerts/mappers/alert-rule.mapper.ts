import { AlertRule } from '../entities/alert-rule.entity';
import { AlertRuleResponseDto } from '../dto/responses/alert-rule.response.dto';

export function toAlertRuleResponseDto(rule: AlertRule): AlertRuleResponseDto {
  return {
    id: rule.id,
    organizationId: rule.organizationId,
    name: rule.name,
    scope: rule.scope,
    scopeId: rule.scopeId,
    trigger: rule.trigger,
    conditions: rule.conditions,
    channelIds: rule.channelIds,
    throttleSeconds: rule.throttleSeconds,
    escalation: rule.escalation,
    isActive: rule.isActive,
    lastFiredAt: rule.lastFiredAt ? rule.lastFiredAt.toISOString() : null,
    createdAt: rule.createdAt.toISOString(),
  };
}
