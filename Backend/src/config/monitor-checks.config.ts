import { registerAs } from '@nestjs/config';

export type MonitorChecksConfig = {
  retentionDays: number;
};

export const monitorChecksConfig = registerAs(
  'monitorChecks',
  (): MonitorChecksConfig => ({
    retentionDays: parseInt(process.env.MONITOR_CHECKS_RETENTION_DAYS ?? '90', 10),
  }),
);
