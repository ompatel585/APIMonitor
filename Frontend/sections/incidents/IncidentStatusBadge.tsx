import { memo } from 'react';
import { Badge } from '@/components/badge';
import { INCIDENT_STATUS_PRESENTATION } from '@/constants/incident-presentation';
import type { IncidentStatus } from '@/api/incidents.api';

const TONE_TO_VARIANT = {
  neutral: 'secondary',
  success: 'success',
  warning: 'outline',
  danger: 'destructive',
} as const;

export const IncidentStatusBadge = memo(function IncidentStatusBadge({
  status,
}: {
  status: IncidentStatus;
}): React.JSX.Element {
  const presentation = INCIDENT_STATUS_PRESENTATION[status];
  return <Badge variant={TONE_TO_VARIANT[presentation.tone]}>{presentation.label}</Badge>;
});
