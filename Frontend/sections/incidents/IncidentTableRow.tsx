import { memo } from 'react';
import Link from 'next/link';
import { TableCell, TableRow } from '@/components/table';
import { Badge } from '@/components/badge';
import { IncidentStatusBadge } from '@/sections/incidents/IncidentStatusBadge';
import { IncidentSeverityBadge } from '@/sections/incidents/IncidentSeverityBadge';
import { INCIDENT_CAUSE_LABELS } from '@/constants/incident-presentation';
import { dayjs } from '@/lib/dayjs';
import type { Incident } from '@/api/incidents.api';

function formatDuration(seconds: number | null): string {
  if (seconds === null) {
    return 'Ongoing';
  }
  if (seconds < 60) {
    return `${seconds}s`;
  }
  if (seconds < 3600) {
    return `${Math.round(seconds / 60)}m`;
  }
  return `${(seconds / 3600).toFixed(1)}h`;
}

export const IncidentTableRow = memo(function IncidentTableRow({
  incident,
}: {
  incident: Incident;
}): React.JSX.Element {
  return (
    <TableRow>
      <TableCell>
        <Link href={`/incidents/${incident.id}`} className="font-medium hover:underline">
          {INCIDENT_CAUSE_LABELS[incident.cause]}
        </Link>
        {incident.isFlapping ? (
          <Badge variant="outline" className="ml-2">
            Flapping
          </Badge>
        ) : null}
      </TableCell>
      <TableCell>
        <IncidentStatusBadge status={incident.status} />
      </TableCell>
      <TableCell>
        <IncidentSeverityBadge severity={incident.severity} />
      </TableCell>
      <TableCell className="text-muted-foreground">{dayjs(incident.startedAt).fromNow()}</TableCell>
      <TableCell className="text-muted-foreground">{formatDuration(incident.durationSeconds)}</TableCell>
      <TableCell className="text-right text-muted-foreground">{incident.failureCount}</TableCell>
    </TableRow>
  );
});
