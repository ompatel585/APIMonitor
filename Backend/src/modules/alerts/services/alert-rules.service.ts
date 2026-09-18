import { Injectable } from '@nestjs/common';
import { NotFoundDomainException } from '@common/exceptions/not-found.exception';
import { AlertRulesRepository } from '../repositories/alert-rules.repository';
import { AlertRule, type AlertRuleConditions, type AlertRuleEscalation } from '../entities/alert-rule.entity';
import type { AlertScope } from '../constants/alert-scope';
import type { AlertTrigger } from '../constants/alert-trigger';

type AlertRuleWriteFields = {
  name: string;
  scope: AlertScope;
  scopeId: string | null;
  trigger: AlertTrigger;
  conditions: AlertRuleConditions;
  channelIds: string[];
  throttleSeconds: number;
  escalation: AlertRuleEscalation | null;
};

@Injectable()
export class AlertRulesService {
  constructor(private readonly alertRulesRepository: AlertRulesRepository) {}

  async create(organizationId: string, data: AlertRuleWriteFields): Promise<AlertRule> {
    return this.alertRulesRepository.create({ organizationId, ...data });
  }

  async findByIdOrThrow(organizationId: string, id: string): Promise<AlertRule> {
    const rule = await this.alertRulesRepository.findByIdOrThrow(organizationId, id);
    if (!rule) {
      throw new NotFoundDomainException('AlertRule');
    }
    return rule;
  }

  async list(organizationId: string): Promise<AlertRule[]> {
    return this.alertRulesRepository.list(organizationId);
  }

  async update(organizationId: string, id: string, data: Partial<AlertRuleWriteFields & { isActive: boolean }>): Promise<AlertRule> {
    await this.findByIdOrThrow(organizationId, id);
    await this.alertRulesRepository.update(organizationId, id, data);
    return this.findByIdOrThrow(organizationId, id);
  }

  async delete(organizationId: string, id: string): Promise<void> {
    await this.findByIdOrThrow(organizationId, id);
    await this.alertRulesRepository.delete(organizationId, id);
  }
}
