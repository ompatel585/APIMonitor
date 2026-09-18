import { memo } from 'react';
import { Badge } from '@/components/badge';
import { INCIDENT_SEVERITY_PRESENTATION } from '@/constants/incident-presentation';
import type { IncidentSeverity } from '@/api/incidents.api';

const TONE_TO_VARIANT = {
  neutral: 'secondary',
  warning: 'outline',
  danger: 'destructive',
} as const;

export const IncidentSeverityBadge = memo(function IncidentSeverityBadge({
  severity,
}: {
  severity: IncidentSeverity;
}): React.JSX.Element {
  const presentation = INCIDENT_SEVERITY_PRESENTATION[severity];
  return <Badge variant={TONE_TO_VARIANT[presentation.tone]}>{presentation.label}</Badge>;
});
