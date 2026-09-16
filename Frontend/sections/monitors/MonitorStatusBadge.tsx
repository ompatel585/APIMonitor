import { memo } from 'react';
import { Badge } from '@/components/badge';
import { MONITOR_STATUS_PRESENTATION } from '@/constants/monitor-status';
import type { MonitorStatus } from '@/api/monitors.api';

const TONE_TO_VARIANT = {
  neutral: 'secondary',
  success: 'success',
  warning: 'outline',
  danger: 'destructive',
} as const;

export const MonitorStatusBadge = memo(function MonitorStatusBadge({
  status,
}: {
  status: MonitorStatus;
}): React.JSX.Element {
  const presentation = MONITOR_STATUS_PRESENTATION[status];
  return <Badge variant={TONE_TO_VARIANT[presentation.tone]}>{presentation.label}</Badge>;
});
