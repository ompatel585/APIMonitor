import { randomUUID } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type Redis from 'ioredis';
import { REDIS_CACHE_CLIENT } from '@infrastructure/redis/redis.constants';
import { NotificationQueueProducer } from '@infrastructure/queue/notification-queue.producer';
import { AlertRulesRepository } from '../repositories/alert-rules.repository';
import { AlertsRepository } from '../repositories/alerts.repository';
import { NotificationChannelsRepository } from '../repositories/notification-channels.repository';
import { AlertRule } from '../entities/alert-rule.entity';
import { evaluate, type AlertableEvent, type RuleEvaluationState } from './alert-rule-evaluator';
import type { AlertTrigger } from '../constants/alert-trigger';
import { ALERT_TRIGGERED_EVENT, AlertTriggeredEvent } from '../events/alert-triggered.event';

const DEDUP_TTL_SECONDS = 24 * 60 * 60; // covers the expected lifetime of an incident
const DEDUP_KEY_PREFIX = 'alerts:dedup';

function dedupRedisKey(ruleId: string, incidentId: string, channelId: string): string {
  return `${DEDUP_KEY_PREFIX}:${ruleId}:${incidentId}:${channelId}`;
}

function summarize(event: AlertableEvent): string {
  const parts = [`Trigger: ${event.trigger}`];
  if (event.cause) parts.push(`Cause: ${event.cause}`);
  if (event.severity) parts.push(`Severity: ${event.severity}`);
  return parts.join(' | ');
}

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    private readonly alertRulesRepository: AlertRulesRepository,
    private readonly alertsRepository: AlertsRepository,
    private readonly notificationChannelsRepository: NotificationChannelsRepository,
    private readonly notificationQueueProducer: NotificationQueueProducer,
    private readonly eventEmitter: EventEmitter2,
    @Inject(REDIS_CACHE_CLIENT) private readonly redis: Redis,
  ) {}

  /**
   * Entry point for every trigger this module reacts to. Loads matching
   * rules and already-loaded dedup/throttle state, hands them to the pure
   * evaluator, then persists and enqueues only the MATCHED decisions. See
   * alerts/CLAUDE.md §3.
   */
  async handleEvent(event: AlertableEvent): Promise<void> {
    const rules = await this.alertRulesRepository.findMatchingActive(event.organizationId, event.trigger, {
      projectId: event.projectId,
      monitorId: event.monitorId,
    });

    if (rules.length === 0) {
      return;
    }

    const state = await this.loadEvaluationState(event, rules);
    const decisions = evaluate(event, rules, state);
    const matched = decisions.filter((decision) => decision.shouldNotify);

    if (matched.length === 0) {
      return;
    }

    // Group by rule so one Alert decision record covers every channel a rule
    // fired to, and so we mark the rule fired / write one dedup key set once
    // per rule rather than per channel.
    const byRule = new Map<string, { rule: AlertRule; channelIds: string[] }>();
    for (const decision of matched) {
      const existing = byRule.get(decision.rule.id);
      if (existing) {
        existing.channelIds.push(decision.channelId);
      } else {
        byRule.set(decision.rule.id, { rule: decision.rule, channelIds: [decision.channelId] });
      }
    }

    for (const { rule, channelIds } of byRule.values()) {
      await this.fireRule(event, rule, channelIds);
    }
  }

  private async loadEvaluationState(event: AlertableEvent, rules: AlertRule[]): Promise<RuleEvaluationState> {
    const allChannelIds = Array.from(new Set(rules.flatMap((rule) => rule.channelIds)));
    const channels = await this.notificationChannelsRepository.findByIds(event.organizationId, allChannelIds);
    const unverifiedChannelIds = new Set(
      channels.filter((channel) => channel.verificationStatus !== 'VERIFIED' || !channel.isActive).map((c) => c.id),
    );
    // A channelId on a rule that no longer resolves to a row is treated the
    // same as unverified — never silently dropped (alerts/CLAUDE.md §6).
    const foundChannelIds = new Set(channels.map((c) => c.id));
    for (const channelId of allChannelIds) {
      if (!foundChannelIds.has(channelId)) {
        unverifiedChannelIds.add(channelId);
      }
    }

    const throttledRuleIds = new Set<string>();
    const now = Date.now();
    for (const rule of rules) {
      if (rule.lastFiredAt && now - rule.lastFiredAt.getTime() < rule.throttleSeconds * 1000) {
        throttledRuleIds.add(rule.id);
      }
    }

    const alreadyDedupedRuleChannelPairs = new Set<string>();
    if (event.incidentId) {
      const checks = await Promise.all(
        rules.flatMap((rule) =>
          rule.channelIds.map(async (channelId) => {
            const key = dedupRedisKey(rule.id, event.incidentId as string, channelId);
            const exists = await this.redis.exists(key);
            return { key: `${rule.id}:${channelId}`, exists: exists === 1 };
          }),
        ),
      );
      for (const check of checks) {
        if (check.exists) {
          alreadyDedupedRuleChannelPairs.add(check.key);
        }
      }
    }

    return { alreadyDedupedRuleChannelPairs, throttledRuleIds, unverifiedChannelIds };
  }

  private async fireRule(event: AlertableEvent, rule: AlertRule, channelIds: string[]): Promise<void> {
    const correlationId = randomUUID();
    const summary = summarize(event);

    const alert = await this.alertsRepository.create({
      organizationId: event.organizationId,
      alertRuleId: rule.id,
      incidentId: event.incidentId,
      monitorId: event.monitorId,
      trigger: event.trigger,
      summary,
      channelIds,
    });

    await this.alertRulesRepository.markFired(rule.id, new Date());

    if (event.incidentId) {
      await Promise.all(
        channelIds.map((channelId) =>
          this.redis.set(dedupRedisKey(rule.id, event.incidentId as string, channelId), '1', 'EX', DEDUP_TTL_SECONDS),
        ),
      );
    }

    for (const channelId of channelIds) {
      await this.notificationQueueProducer.enqueueDelivery(event.organizationId, alert.id, channelId, correlationId);
    }

    this.eventEmitter.emit(
      ALERT_TRIGGERED_EVENT,
      new AlertTriggeredEvent(alert.id, event.organizationId, event.monitorId, rule.id, event.trigger, channelIds),
    );

    if (rule.escalation && event.trigger === 'INCIDENT_CREATED' && event.incidentId) {
      await this.notificationQueueProducer.scheduleEscalation(
        {
          kind: 'ESCALATION',
          incidentId: event.incidentId,
          ruleId: rule.id,
          organizationId: event.organizationId,
          correlationId,
        },
        rule.escalation.afterMinutesUnacknowledged * 60_000,
      );
    }

    this.logger.log({
      msg: 'alert fired',
      alertId: alert.id,
      ruleId: rule.id,
      organizationId: event.organizationId,
      monitorId: event.monitorId,
      channelCount: channelIds.length,
    });
  }

  /**
   * Cancels a pending escalation for every active rule on this incident's
   * organization that carries an escalation policy. Best-effort — see
   * `NotificationQueueProducer.cancelEscalation` and alerts/CLAUDE.md §5.
   */
  async cancelEscalations(_organizationId: string, incidentId: string, ruleIds: string[]): Promise<void> {
    await Promise.all(ruleIds.map((ruleId) => this.notificationQueueProducer.cancelEscalation(incidentId, ruleId)));
  }

  async findRulesWithEscalation(organizationId: string, trigger: AlertTrigger): Promise<AlertRule[]> {
    const rules = await this.alertRulesRepository.list(organizationId);
    return rules.filter((rule) => rule.isActive && rule.trigger === trigger && rule.escalation !== null);
  }
}
