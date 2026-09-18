export const ALERT_SCOPES = {
  ORGANIZATION: 'ORGANIZATION',
  PROJECT: 'PROJECT',
  MONITOR: 'MONITOR',
} as const;

export type AlertScope = (typeof ALERT_SCOPES)[keyof typeof ALERT_SCOPES];

/**
 * Most-specific-first resolution order (alerts/CLAUDE.md §2): a monitor-scoped
 * rule applies before a project-scoped rule, which applies before an
 * organization-scoped rule.
 */
export const ALERT_SCOPE_SPECIFICITY: Record<AlertScope, number> = {
  [ALERT_SCOPES.MONITOR]: 0,
  [ALERT_SCOPES.PROJECT]: 1,
  [ALERT_SCOPES.ORGANIZATION]: 2,
};
