export const PERMISSIONS = {
  ORGANIZATION_READ: 'organization:read',
  ORGANIZATION_MANAGE: 'organization:manage',
  MEMBERSHIP_MANAGE: 'membership:manage',
  PROJECT_CREATE: 'project:create',
  PROJECT_READ: 'project:read',
  PROJECT_UPDATE: 'project:update',
  PROJECT_DELETE: 'project:delete',
  MONITOR_CREATE: 'monitor:create',
  MONITOR_READ: 'monitor:read',
  MONITOR_UPDATE: 'monitor:update',
  MONITOR_DELETE: 'monitor:delete',
  INCIDENT_READ: 'incident:read',
  INCIDENT_ACKNOWLEDGE: 'incident:acknowledge',
  INCIDENT_RESOLVE: 'incident:resolve',
  ALERT_RULE_MANAGE: 'alert-rule:manage',
  NOTIFICATION_CHANNEL_MANAGE: 'notification-channel:manage',
  STATUS_PAGE_MANAGE: 'status-page:manage',
  API_KEY_MANAGE: 'api-key:manage',
  BILLING_MANAGE: 'billing:manage',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
