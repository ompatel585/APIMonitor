import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { AlertRule, type AlertRuleConditions, type AlertRuleEscalation } from '../entities/alert-rule.entity';
import type { AlertScope } from '../constants/alert-scope';
import type { AlertTrigger } from '../constants/alert-trigger';

type CreateAlertRuleData = {
  organizationId: string;
  name: string;
  scope: AlertScope;
  scopeId: string | null;
  trigger: AlertTrigger;
  conditions: AlertRuleConditions;
  channelIds: string[];
  throttleSeconds: number;
  escalation: AlertRuleEscalation | null;
};

type UpdateAlertRuleData = Partial<Omit<CreateAlertRuleData, 'organizationId'>> & { isActive?: boolean };

@Injectable()
export class AlertRulesRepository {
  constructor(@InjectRepository(AlertRule) private readonly repository: Repository<AlertRule>) {}

  private scope(manager?: EntityManager): Repository<AlertRule> {
    return manager ? manager.getRepository(AlertRule) : this.repository;
  }

  async create(data: CreateAlertRuleData): Promise<AlertRule> {
    const rule = this.repository.create(data);
    return this.repository.save(rule);
  }

  async findByIdOrThrow(organizationId: string, id: string): Promise<AlertRule | null> {
    return this.repository.findOne({ where: { organizationId, id } });
  }

  async update(organizationId: string, id: string, data: UpdateAlertRuleData): Promise<void> {
    await this.repository.update({ organizationId, id }, data);
  }

  async delete(organizationId: string, id: string): Promise<void> {
    await this.repository.delete({ organizationId, id });
  }

  async list(organizationId: string): Promise<AlertRule[]> {
    return this.repository.find({ where: { organizationId }, order: { createdAt: 'DESC' } });
  }

  /**
   * Loads every active rule that could match an event for this scope chain —
   * ORGANIZATION rules plus the specific PROJECT and MONITOR rules — for the
   * given trigger. Ordering (most-specific-first) is applied by the pure
   * evaluator, not here; this method only narrows by tenant and trigger.
   */
  async findMatchingActive(
    organizationId: string,
    trigger: AlertTrigger,
    scopeIds: { projectId: string; monitorId: string },
    manager?: EntityManager,
  ): Promise<AlertRule[]> {
    return this.scope(manager).find({
      where: [
        { organizationId, trigger, isActive: true, scope: 'ORGANIZATION' },
        { organizationId, trigger, isActive: true, scope: 'PROJECT', scopeId: scopeIds.projectId },
        { organizationId, trigger, isActive: true, scope: 'MONITOR', scopeId: scopeIds.monitorId },
      ],
    });
  }

  async findByIds(organizationId: string, ids: string[]): Promise<AlertRule[]> {
    if (ids.length === 0) {
      return [];
    }
    return this.repository.find({ where: { organizationId, id: In(ids) } });
  }

  async markFired(id: string, firedAt: Date, manager?: EntityManager): Promise<void> {
    await this.scope(manager).update({ id }, { lastFiredAt: firedAt });
  }

  async countActiveReferencingChannel(organizationId: string, channelId: string): Promise<number> {
    return this.repository
      .createQueryBuilder('rule')
      .where('rule.organization_id = :organizationId', { organizationId })
      .andWhere('rule.is_active = true')
      .andWhere(`rule.channel_ids @> :channelId::jsonb`, { channelId: JSON.stringify([channelId]) })
      .getCount();
  }
}
