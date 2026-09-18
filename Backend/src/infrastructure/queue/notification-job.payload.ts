/**
 * Ids and a correlation id only — never a rendered message body, never a
 * channel secret (alerts/CLAUDE.md §7). The notification worker loads the
 * alert and channel it needs from the domain services.
 *
 * Both delivery and escalation jobs share the `notification` queue; `kind`
 * discriminates them for the processor. Escalation is a delayed job enqueued
 * at incident creation (alerts/CLAUDE.md §5) and cancelled on acknowledgement
 * or resolution — cancellation is not guaranteed to succeed, so the processor
 * re-verifies incident state before escalating rather than trusting removal.
 */
export type NotificationDeliveryJobPayload = {
  kind: 'DELIVERY';
  organizationId: string;
  alertId: string;
  channelId: string;
  correlationId: string;
};

export type NotificationEscalationJobPayload = {
  kind: 'ESCALATION';
  incidentId: string;
  ruleId: string;
  organizationId: string;
  correlationId: string;
};

export type NotificationJobPayload = NotificationDeliveryJobPayload | NotificationEscalationJobPayload;
