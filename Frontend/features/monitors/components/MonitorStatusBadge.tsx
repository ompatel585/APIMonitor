import { memo } from 'react';
import { Badge } from '@/shared/ui/badge';
import { MONITOR_STATUS_PRESENTATION } from '@/features/monitors/constants/monitor-status';
import type { MonitorStatus } from '@/features/monitors/types';

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
