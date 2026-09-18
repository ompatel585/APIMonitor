import { ALERT_SCOPE_SPECIFICITY } from '../constants/alert-scope';
import { ALERT_DECISION_REASONS, type AlertDecisionReason, type AlertTrigger } from '../constants/alert-trigger';
import type { AlertRule } from '../entities/alert-rule.entity';

const SEVERITY_RANK: Record<'MINOR' | 'MAJOR' | 'CRITICAL', number> = {
  MINOR: 0,
  MAJOR: 1,
  CRITICAL: 2,
};

/**
 * The minimum an evaluator needs to know about the triggering domain event —
 * deliberately narrow so this file never needs to import `incidents` types.
 */
export type AlertableEvent = {
  trigger: AlertTrigger;
  organizationId: string;
  projectId: string;
  monitorId: string;
  incidentId: string | null;
  severity?: 'MINOR' | 'MAJOR' | 'CRITICAL';
  cause?: string;
  durationSeconds?: number;
  isFlapping: boolean;
  isAcknowledged: boolean;
};

/**
 * Dedup/throttle state the calling service has already loaded — this
 * function never touches Redis or a database itself (alerts/CLAUDE.md §3).
 */
export type RuleEvaluationState = {
  /** `{ruleId}:{channelId}` pairs already alerted for this incident (Redis dedup key hits). */
  alreadyDedupedRuleChannelPairs: Set<string>;
  /** ruleIds whose throttle window has not yet elapsed. */
  throttledRuleIds: Set<string>;
  /** channelIds that are configured but not yet verified. */
  unverifiedChannelIds: Set<string>;
};

export type AlertDecision = {
  rule: AlertRule;
  channelId: string;
  reason: AlertDecisionReason;
  /** Only MATCHED decisions should be acted on (persisted + enqueued); the rest explain a suppression for observability. */
  shouldNotify: boolean;
};

function dedupKey(ruleId: string, channelId: string): string {
  return `${ruleId}:${channelId}`;
}

function matchesConditions(event: AlertableEvent, rule: AlertRule): boolean {
  const { conditions } = rule;

  if (conditions.minSeverity && event.severity) {
    if (SEVERITY_RANK[event.severity] < SEVERITY_RANK[conditions.minSeverity]) {
      return false;
    }
  }

  if (conditions.causes && conditions.causes.length > 0) {
    if (!event.cause || !conditions.causes.includes(event.cause)) {
      return false;
    }
  }

  if (conditions.minDurationSeconds !== undefined) {
    if ((event.durationSeconds ?? 0) < conditions.minDurationSeconds) {
      return false;
    }
  }

  return true;
}

/**
 * Rules matching the same scope specificity band both apply (a monitor rule
 * does not suppress an org rule) — specificity only orders evaluation, it
 * never filters. Sorting is stable so ties keep the caller's load order.
 */
function sortBySpecificity(rules: AlertRule[]): AlertRule[] {
  return [...rules].sort((a, b) => ALERT_SCOPE_SPECIFICITY[a.scope] - ALERT_SCOPE_SPECIFICITY[b.scope]);
}

/**
 * Pure decision function — see alerts/CLAUDE.md §3. Takes the triggering
 * event, the already-loaded candidate rules, and already-loaded dedup/
 * throttle state, and returns what should happen for every (rule, channel)
 * pair. No I/O of any kind; the caller (`AlertsService`) does all loading and
 * all enqueueing.
 */
export function evaluate(event: AlertableEvent, rules: AlertRule[], state: RuleEvaluationState): AlertDecision[] {
  const decisions: AlertDecision[] = [];
  const ordered = sortBySpecificity(rules.filter((rule) => rule.isActive && rule.trigger === event.trigger));

  for (const rule of ordered) {
    if (event.isFlapping) {
      for (const channelId of rule.channelIds) {
        decisions.push({ rule, channelId, reason: ALERT_DECISION_REASONS.SUPPRESSED_FLAPPING, shouldNotify: false });
      }
      continue;
    }

    if (event.isAcknowledged && event.trigger !== 'INCIDENT_RESOLVED') {
      for (const channelId of rule.channelIds) {
        decisions.push({
          rule,
          channelId,
          reason: ALERT_DECISION_REASONS.SUPPRESSED_ACKNOWLEDGED,
          shouldNotify: false,
        });
      }
      continue;
    }

    if (!matchesConditions(event, rule)) {
      continue;
    }

    if (state.throttledRuleIds.has(rule.id)) {
      for (const channelId of rule.channelIds) {
        decisions.push({ rule, channelId, reason: ALERT_DECISION_REASONS.THROTTLED, shouldNotify: false });
      }
      continue;
    }

    for (const channelId of rule.channelIds) {
      if (state.unverifiedChannelIds.has(channelId)) {
        decisions.push({ rule, channelId, reason: ALERT_DECISION_REASONS.CHANNEL_UNVERIFIED, shouldNotify: false });
        continue;
      }

      if (state.alreadyDedupedRuleChannelPairs.has(dedupKey(rule.id, channelId))) {
        decisions.push({ rule, channelId, reason: ALERT_DECISION_REASONS.DEDUPED, shouldNotify: false });
        continue;
      }

      decisions.push({ rule, channelId, reason: ALERT_DECISION_REASONS.MATCHED, shouldNotify: true });
    }
  }

  return decisions;
}
