import type { AlertTrigger } from '../constants/alert-trigger';

export const ALERT_TRIGGERED_EVENT = 'alert.triggered';

/**
 * Published for observability/websocket relay once an Alert decision record
 * has been persisted. Carries ids and scalars only — never a channel secret,
 * never a rendered message body (alerts/CLAUDE.md §7).
 */
export class AlertTriggeredEvent {
  constructor(
    public readonly alertId: string,
    public readonly organizationId: string,
    public readonly monitorId: string,
    public readonly alertRuleId: string,
    public readonly trigger: AlertTrigger,
    public readonly channelIds: string[],
  ) {}
}
